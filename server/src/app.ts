import { randomUUID } from 'node:crypto';
import { parseCookie } from 'cookie';
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import helmet from 'helmet';
import { z, ZodError } from 'zod';
import type { AuthService } from './auth-service.js';
import type { AdminModuleInput, AdminStore, ModuleMutationResult, PlatformStore } from './contracts.js';
import type { SessionUser } from './auth-contracts.js';
import { ApiError } from './errors.js';

interface CreateAppOptions {
  store: PlatformStore;
  corsOrigins: string[];
  environment?: 'development' | 'test' | 'production';
  authService?: AuthService;
  adminStore?: AdminStore;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120).regex(/^[\p{L} .'-]+$/u),
  age: z.number().int().min(4).max(18),
  grade: z.string().trim().min(1).max(30),
  school: z.string().trim().min(2).max(200),
  email: z.email().max(254),
  password: z.string().min(10).max(128),
  phone: z.string().regex(/^\+[1-9][0-9 ()-]{7,18}$/),
  country: z.string().trim().min(2).max(100),
  guardianConsent: z.literal(true),
});
const verificationSchema = z.object({ email: z.email().max(254), code: z.string().regex(/^\d{6}$/) });
const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  audience: z.enum(['student', 'administrator']),
});
const adminDashboardQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'pending', 'active', 'disabled']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(512).optional(),
});
const adminModuleStatusSchema = z.enum(['draft', 'coming_soon', 'published', 'archived']);
const adminModuleSchema = z.object({
  code: z.string().trim().regex(/^[A-Z][A-Z0-9]{0,5}$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
  status: adminModuleStatusSchema,
  routeSlug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/).max(120),
  sortOrder: z.number().int().min(0).max(32767),
});
const guestSettingSchema = z.object({ enabled: z.boolean() });
const moduleCodeSchema = z.string().regex(/^[A-Z][A-Z0-9]{0,5}$/);

function encodeAdminCursor(cursor: { createdAt: Date; id: string } | null): string | null {
  return cursor
    ? Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })).toString('base64url')
    : null;
}

function decodeAdminCursor(value: string | undefined): { createdAt: Date; id: string } | undefined {
  if (!value) return undefined;
  try {
    const parsed = z.object({ createdAt: z.iso.datetime(), id: z.string().regex(/^\d+$/) })
      .parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new ApiError(400, 'INVALID_CURSOR', 'The pagination cursor is invalid.');
  }
}

function moduleMutationError(result: ModuleMutationResult): ApiError | null {
  if (result.status === 'duplicate') return new ApiError(409, 'MODULE_CONFLICT', 'The module code or route is already in use.');
  if (result.status === 'not_found') return new ApiError(404, 'MODULE_NOT_FOUND', 'The module was not found.');
  if (result.status === 'protected') return new ApiError(409, 'MODULE_PROTECTED', 'Module A cannot be archived.');
  return null;
}

function errorPayload(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

export function createApp({
  store,
  corsOrigins,
  environment = 'development',
  authService,
  adminStore,
}: CreateAppOptions): express.Express {
  const app = express();
  const allowedOrigins = new Set(corsOrigins);

  app.disable('x-powered-by');
  app.use(helmet());


  const requestIdentity: RequestHandler = (_request, response, next) => {
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    next();
  };
  app.use(requestIdentity);
  app.use(express.json({ limit: '64kb' }));

  app.use((request, response, next) => {
    const origin = request.header('Origin');
    if (origin && !allowedOrigins.has(origin)) {
      response.status(403).json(errorPayload(
        'ORIGIN_NOT_ALLOWED',
        'This web origin is not allowed to access the API.',
        response.locals.requestId,
      ));
      return;
    }
    next();
  });
  app.use(cors({ origin: corsOrigins, credentials: true, maxAge: 600 }));

  app.get('/api/v1/health', async (_request, response) => {
    try {
      await store.ping();
      response.setHeader('Cache-Control', 'no-store');
      response.json({ data: { status: 'ok' } });
    } catch {
      response.status(503).json(errorPayload(
        'DATABASE_UNAVAILABLE',
        'The service is temporarily unavailable.',
        response.locals.requestId,
      ));
    }
  });

  app.get('/api/v1/settings/public', async (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.json({ data: await store.getPublicSettings() });
  });

  app.get('/api/v1/modules', async (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.json({ data: await store.listPublicModules() });
  });

  if (authService) {
    const secureCookie = environment === 'production';
    const sessionCookieName = secureCookie ? '__Host-vc_session' : 'vc_session';
    const sessionToken = (request: express.Request) => parseCookie(request.headers.cookie ?? '')[sessionCookieName];
    const setSessionCookie = (response: express.Response, token: string, expiresAt: Date) => {
      response.cookie(sessionCookieName, token, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      });
    };
    const authBuckets = new Map<string, RateLimitBucket>();
    const authRateLimit: RequestHandler = (request, response, next) => {
      const now = Date.now();
      const key = request.ip || request.socket.remoteAddress || 'unknown';
      const current = authBuckets.get(key);
      const bucket = !current || current.resetAt <= now
        ? { count: 1, resetAt: now + 15 * 60_000 }
        : { count: current.count + 1, resetAt: current.resetAt };
      authBuckets.set(key, bucket);
      response.setHeader('RateLimit-Limit', '30');
      response.setHeader('RateLimit-Remaining', String(Math.max(0, 30 - bucket.count)));
      response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
      if (bucket.count > 30) {
        response.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
        response.status(429).json(errorPayload(
          'RATE_LIMITED',
          'Too many authentication attempts. Please try again later.',
          response.locals.requestId,
        ));
        return;
      }
      next();
    };

    app.post('/api/v1/auth/register/start', authRateLimit, async (request, response) => {
      const input = registrationSchema.parse(request.body);
      await authService.startRegistration(input);
      response.setHeader('Cache-Control', 'no-store');
      response.status(202).json({ data: { status: 'verification_required' } });
    });

    app.post('/api/v1/auth/register/verify', authRateLimit, async (request, response) => {
      const input = verificationSchema.parse(request.body);
      const result = await authService.verifyRegistration(input.email, input.code, request.header('User-Agent') ?? null);
      setSessionCookie(response, result.sessionToken, result.expiresAt);
      response.setHeader('Cache-Control', 'no-store');
      response.json({ data: { user: result.user } });
    });

    app.post('/api/v1/auth/login', authRateLimit, async (request, response) => {
      const input = loginSchema.parse(request.body);
      const result = await authService.login(input.email, input.password, input.audience, request.header('User-Agent') ?? null);
      setSessionCookie(response, result.sessionToken, result.expiresAt);
      response.setHeader('Cache-Control', 'no-store');
      response.json({ data: { user: result.user } });
    });

    app.get('/api/v1/auth/me', async (request, response) => {
      const user = await authService.authenticate(sessionToken(request));
      if (!user) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue.');
      response.setHeader('Cache-Control', 'no-store');
      response.json({ data: { user } });
    });

    app.post('/api/v1/auth/logout', async (request, response) => {
      await authService.logout(sessionToken(request));
      response.clearCookie(sessionCookieName, {
        httpOnly: true, secure: secureCookie, sameSite: 'lax', path: '/',
      });
      response.status(204).end();
    });

    if (adminStore) {
      const requireAdministrator: RequestHandler = async (request, response, next) => {
        const user = await authService.authenticateSession(sessionToken(request));
        if (!user) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue.');
        if (user.role !== 'administrator') throw new ApiError(403, 'ADMINISTRATOR_REQUIRED', 'Administrator access is required.');
        response.locals.authUser = user;
        next();
      };
      const actor = (response: express.Response) => response.locals.authUser as SessionUser;

      app.get('/api/v1/admin/dashboard', requireAdministrator, async (request, response) => {
        const input = adminDashboardQuerySchema.parse(request.query);
        const data = await adminStore.getAdminDashboard({
          query: input.q,
          status: input.status,
          limit: input.limit,
          cursor: decodeAdminCursor(input.cursor),
        });
        response.setHeader('Cache-Control', 'no-store');
        response.json({ data: { ...data, nextCursor: encodeAdminCursor(data.nextCursor) } });
      });

      app.patch('/api/v1/admin/settings/guest-login', requireAdministrator, async (request, response) => {
        const input = guestSettingSchema.parse(request.body);
        await adminStore.setGuestLogin(actor(response).userId, input.enabled);
        response.setHeader('Cache-Control', 'no-store');
        response.json({ data: { guestLoginEnabled: input.enabled } });
      });

      app.post('/api/v1/admin/modules', requireAdministrator, async (request, response) => {
        const input: AdminModuleInput = adminModuleSchema.parse(request.body);
        const result = await adminStore.createAdminModule(actor(response).userId, input);
        const error = moduleMutationError(result);
        if (error) throw error;
        response.setHeader('Cache-Control', 'no-store');
        response.status(201).json({ data: { module: result.status === 'ok' ? result.module : null } });
      });

      app.patch('/api/v1/admin/modules/:code', requireAdministrator, async (request, response) => {
        const code = moduleCodeSchema.parse(request.params.code);
        const input = adminModuleSchema.omit({ code: true }).parse(request.body);
        const result = await adminStore.updateAdminModule(actor(response).userId, code, input);
        const error = moduleMutationError(result);
        if (error) throw error;
        response.setHeader('Cache-Control', 'no-store');
        response.json({ data: { module: result.status === 'ok' ? result.module : null } });
      });

      app.delete('/api/v1/admin/modules/:code', requireAdministrator, async (request, response) => {
        const code = moduleCodeSchema.parse(request.params.code);
        const result = await adminStore.archiveAdminModule(actor(response).userId, code);
        const error = moduleMutationError(result);
        if (error) throw error;
        response.setHeader('Cache-Control', 'no-store');
        response.json({ data: { module: result.status === 'ok' ? result.module : null } });
      });
    }
  }

  app.use((_request, response) => {
    response.status(404).json(errorPayload(
      'NOT_FOUND',
      'The requested API endpoint does not exist.',
      response.locals.requestId,
    ));
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    const requestId = response.locals.requestId ?? 'unavailable';
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      response.status(400).json(errorPayload('MALFORMED_JSON', 'The request body is not valid JSON.', requestId));
      return;
    }
    if (error instanceof ZodError) {
      response.status(400).json(errorPayload('VALIDATION_ERROR', 'The request is invalid.', requestId));
      return;
    }
    if (error instanceof ApiError) {
      response.status(error.statusCode).json(errorPayload(error.code, error.message, requestId));
      return;
    }
    if (environment !== 'test') console.error('Unhandled API error', { requestId, error });
    response.status(500).json(errorPayload('INTERNAL_ERROR', 'An unexpected error occurred.', requestId));
  };
  app.use(errorHandler);

  return app;
}
