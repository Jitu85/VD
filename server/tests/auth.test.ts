import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { AuthService } from '../src/auth-service.js';
import type {
  AuthStore,
  EmailSender,
  LoginCredential,
  RegistrationRecord,
  RegistrationStartResult,
  SessionUser,
  VerificationResult,
} from '../src/auth-contracts.js';
import { createApp } from '../src/app.js';
import type {
  AdminDashboardData,
  AdminDashboardQuery,
  AdminModule,
  AdminModuleInput,
  AdminStore,
  ModuleMutationResult,
  PlatformStore,
  PublicModule,
  PublicSettings,
} from '../src/contracts.js';

class AuthMemoryStore implements PlatformStore, AuthStore, AdminStore {
  registration: RegistrationRecord | null = null;
  credential: LoginCredential | null = null;
  sessions = new Map<string, SessionUser>();
  guestLoginEnabled = true;
  lastActor: string | null = null;
  modules: AdminModule[] = [{
    code: 'A', title: 'English Grammar', description: 'Grammar lessons', status: 'published',
    routeSlug: 'grammar', sortOrder: 10, updatedAt: new Date('2026-07-04T00:00:00Z'),
  }];

  async ping(): Promise<void> {}
  async getPublicSettings(): Promise<PublicSettings> { return { guestLoginEnabled: true }; }
  async listPublicModules(): Promise<PublicModule[]> { return []; }

  async startRegistration(record: RegistrationRecord): Promise<RegistrationStartResult> {
    if (this.credential?.status === 'active') return 'duplicate';
    this.registration = record;
    return 'created';
  }

  async verifyRegistration(
    email: string,
    codeHash: string,
    hashesMatch: (actual: string, expected: string) => boolean,
  ): Promise<VerificationResult> {
    const record = this.registration;
    if (!record || record.email !== email) return { status: 'not_found' };
    if (record.codeExpiresAt.getTime() <= Date.now()) return { status: 'expired' };
    if (!hashesMatch(record.codeHash, codeHash)) return { status: 'invalid' };
    const user: SessionUser = {
      userId: '1',
      publicId: '11111111-1111-4111-8111-111111111111',
      role: 'student',
      email: record.email,
      displayName: record.fullName,
    };
    this.credential = { ...user, passwordHash: record.passwordHash, status: 'active' };
    this.registration = null;
    return { status: 'verified', user };
  }

  async findLoginCredential(email: string): Promise<LoginCredential | null> {
    return this.credential?.email === email ? this.credential : null;
  }

  async createSession(userId: string, tokenHash: string): Promise<void> {
    const credential = this.credential;
    if (!credential || credential.userId !== userId) throw new Error('Unknown user');
    this.sessions.set(tokenHash, {
      userId: credential.userId,
      publicId: credential.publicId,
      role: credential.role,
      email: credential.email,
      displayName: credential.displayName,
    });
  }

  async findSession(tokenHash: string): Promise<SessionUser | null> {
    return this.sessions.get(tokenHash) ?? null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async getAdminDashboard(_query: AdminDashboardQuery): Promise<AdminDashboardData> {
    return {
      summary: { registeredStudents: 1, verifiedAccounts: 1, schools: 1, activeModules: this.modules.filter((item) => item.status !== 'archived').length },
      students: [{
        publicId: '11111111-1111-4111-8111-111111111111', name: 'Aarav Sharma', age: 13,
        grade: '8', school: 'Kendriya Vidyalaya', email: 'aarav@example.test', status: 'active',
        createdAt: new Date('2026-07-04T00:00:00Z'),
      }],
      nextCursor: null,
      modules: this.modules,
      guestLoginEnabled: this.guestLoginEnabled,
      usage: { activeUsers: 1, answeredQuestions: 0 },
    };
  }

  async setGuestLogin(actorUserId: string, enabled: boolean): Promise<void> {
    this.lastActor = actorUserId;
    this.guestLoginEnabled = enabled;
  }

  async createAdminModule(actorUserId: string, input: AdminModuleInput): Promise<ModuleMutationResult> {
    this.lastActor = actorUserId;
    if (this.modules.some((item) => item.code === input.code || item.routeSlug === input.routeSlug)) return { status: 'duplicate' };
    const module = { ...input, updatedAt: new Date() };
    this.modules.push(module);
    return { status: 'ok', module };
  }

  async updateAdminModule(actorUserId: string, code: string, input: Omit<AdminModuleInput, 'code'>): Promise<ModuleMutationResult> {
    this.lastActor = actorUserId;
    if (code === 'A' && input.status === 'archived') return { status: 'protected' };
    const index = this.modules.findIndex((item) => item.code === code);
    if (index < 0) return { status: 'not_found' };
    const module = { code, ...input, updatedAt: new Date() };
    this.modules[index] = module;
    return { status: 'ok', module };
  }

  async archiveAdminModule(actorUserId: string, code: string): Promise<ModuleMutationResult> {
    this.lastActor = actorUserId;
    if (code === 'A') return { status: 'protected' };
    const module = this.modules.find((item) => item.code === code);
    if (!module) return { status: 'not_found' };
    module.status = 'archived';
    module.updatedAt = new Date();
    return { status: 'ok', module };
  }
}

class CapturingEmailSender implements EmailSender {
  lastMessage: { to: string; code: string; expiresInMinutes: number } | null = null;
  async sendVerificationCode(message: { to: string; code: string; expiresInMinutes: number }): Promise<void> {
    this.lastMessage = message;
  }
}

async function withAuthServer(
  callback: (baseUrl: string, store: AuthMemoryStore, email: CapturingEmailSender) => Promise<void>,
): Promise<void> {
  const store = new AuthMemoryStore();
  const email = new CapturingEmailSender();
  const authService = new AuthService(store, email, 'test-pepper-that-is-at-least-32-characters-long');
  const app = createApp({
    store,
    authService,
    adminStore: store,
    corsOrigins: ['http://127.0.0.1:4173'],
    environment: 'test',
  });
  const server: Server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}`, store, email);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const registration = {
  fullName: 'Aarav Sharma',
  age: 13,
  grade: '8',
  school: 'Kendriya Vidyalaya',
  email: 'AARAV@example.test',
  password: 'LongPassword123!',
  phone: '+91 98765 43210',
  country: 'India',
  guardianConsent: true,
};

test('registration, OTP verification, session lookup, and logout form one secure lifecycle', async () => {
  await withAuthServer(async (baseUrl, _store, emailSender) => {
    const start = await fetch(`${baseUrl}/api/v1/auth/register/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4173' },
      body: JSON.stringify(registration),
    });
    assert.equal(start.status, 202);
    assert.equal(start.headers.get('cache-control'), 'no-store');
    assert.equal(emailSender.lastMessage?.to, 'aarav@example.test');
    assert.match(emailSender.lastMessage?.code ?? '', /^\d{6}$/);

    const incorrectCode = emailSender.lastMessage?.code === '999999' ? '000000' : '999999';
    const incorrect = await fetch(`${baseUrl}/api/v1/auth/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4173' },
      body: JSON.stringify({ email: registration.email, code: incorrectCode }),
    });
    assert.equal(incorrect.status, 400);
    assert.equal((await incorrect.json() as { error: { code: string } }).error.code, 'OTP_INVALID');

    const verified = await fetch(`${baseUrl}/api/v1/auth/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4173' },
      body: JSON.stringify({ email: registration.email, code: emailSender.lastMessage?.code }),
    });
    assert.equal(verified.status, 200);
    const cookie = verified.headers.get('set-cookie');
    assert.match(cookie ?? '', /^vc_session=/);
    assert.match(cookie ?? '', /HttpOnly/i);
    assert.match(cookie ?? '', /SameSite=Lax/i);
    const cookiePair = cookie?.split(';')[0] ?? '';

    const me = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: cookiePair } });
    assert.equal(me.status, 200);
    assert.deepEqual(await me.json(), { data: { user: {
      publicId: '11111111-1111-4111-8111-111111111111',
      role: 'student',
      email: 'aarav@example.test',
      displayName: 'Aarav Sharma',
    } } });

    const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie') ?? '', /Expires=Thu, 01 Jan 1970/i);

    const afterLogout = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: cookiePair } });
    assert.equal(afterLogout.status, 401);
  });
});

test('login validates password and requested role without revealing which check failed', async () => {
  await withAuthServer(async (baseUrl, _store, emailSender) => {
    await fetch(`${baseUrl}/api/v1/auth/register/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registration),
    });
    await fetch(`${baseUrl}/api/v1/auth/register/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registration.email, code: emailSender.lastMessage?.code }),
    });

    for (const body of [
      { email: registration.email, password: 'wrong-password', audience: 'student' },
      { email: registration.email, password: registration.password, audience: 'administrator' },
      { email: 'missing@example.test', password: registration.password, audience: 'student' },
    ]) {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      assert.equal(response.status, 401);
      const payload = await response.json() as { error: { code: string; message: string } };
      assert.equal(payload.error.code, 'INVALID_CREDENTIALS');
      assert.equal(payload.error.message, 'The email or password is incorrect.');
    }

    const success = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registration.email, password: registration.password, audience: 'student' }),
    });
    assert.equal(success.status, 200);
  });
});

test('authentication endpoints throttle repeated attempts', async () => {
  await withAuthServer(async (baseUrl) => {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      response = await fetch(`${baseUrl}/api/v1/auth/register/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    }
    assert.equal(response?.status, 429);
    assert.equal((await response?.json() as { error: { code: string } }).error.code, 'RATE_LIMITED');
    assert.ok(response?.headers.get('retry-after'));
  });
});
test('administrator APIs enforce role, persist mutations, and return stable contracts', async () => {
  await withAuthServer(async (baseUrl, store, emailSender) => {
    await fetch(`${baseUrl}/api/v1/auth/register/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registration),
    });
    const studentVerification = await fetch(`${baseUrl}/api/v1/auth/register/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registration.email, code: emailSender.lastMessage?.code }),
    });
    const studentCookie = studentVerification.headers.get('set-cookie')?.split(';')[0] ?? '';
    const forbidden = await fetch(`${baseUrl}/api/v1/admin/dashboard`, { headers: { Cookie: studentCookie } });
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json() as { error: { code: string } }).error.code, 'ADMINISTRATOR_REQUIRED');

    assert.ok(store.credential);
    store.credential.role = 'administrator';
    const adminLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registration.email, password: registration.password, audience: 'administrator' }),
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0] ?? '';

    const dashboard = await fetch(`${baseUrl}/api/v1/admin/dashboard?limit=25`, { headers: { Cookie: adminCookie } });
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.headers.get('cache-control'), 'no-store');
    const dashboardBody = await dashboard.json() as { data: AdminDashboardData };
    assert.equal(dashboardBody.data.students[0].name, 'Aarav Sharma');
    assert.equal(dashboardBody.data.modules[0].code, 'A');

    const setting = await fetch(`${baseUrl}/api/v1/admin/settings/guest-login`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(setting.status, 200);
    assert.equal(store.guestLoginEnabled, false);
    assert.equal(store.lastActor, '1');

    const moduleInput = {
      code: 'D', title: 'Creative Writing', description: 'Writing practice', status: 'draft',
      routeSlug: 'creative-writing', sortOrder: 40,
    };
    const created = await fetch(`${baseUrl}/api/v1/admin/modules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify(moduleInput),
    });
    assert.equal(created.status, 201);

    const updated = await fetch(`${baseUrl}/api/v1/admin/modules/D`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ ...moduleInput, code: undefined, status: 'published' }),
    });
    assert.equal(updated.status, 200);

    const protectedUpdate = await fetch(`${baseUrl}/api/v1/admin/modules/A`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        title: 'English Grammar', description: 'Grammar lessons', status: 'archived',
        routeSlug: 'grammar', sortOrder: 10,
      }),
    });
    assert.equal(protectedUpdate.status, 409);

    const protectedModule = await fetch(`${baseUrl}/api/v1/admin/modules/A`, {
      method: 'DELETE', headers: { Cookie: adminCookie },
    });
    assert.equal(protectedModule.status, 409);
    assert.equal((await protectedModule.json() as { error: { code: string } }).error.code, 'MODULE_PROTECTED');

    const archived = await fetch(`${baseUrl}/api/v1/admin/modules/D`, {
      method: 'DELETE', headers: { Cookie: adminCookie },
    });
    assert.equal(archived.status, 200);
    assert.equal(store.modules.find((item) => item.code === 'D')?.status, 'archived');

    const invalidCursor = await fetch(`${baseUrl}/api/v1/admin/dashboard?cursor=not-valid`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(invalidCursor.status, 400);
    assert.equal((await invalidCursor.json() as { error: { code: string } }).error.code, 'INVALID_CURSOR');
  });
});
