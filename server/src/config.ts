import { z } from 'zod';

const booleanFromEnvironment = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: booleanFromEnvironment,
  DATABASE_SSL_REJECT_UNAUTHORIZED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  AUTH_OTP_PEPPER: z.string().min(32, 'AUTH_OTP_PEPPER must contain at least 32 characters'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
  EMAIL_MODE: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanFromEnvironment,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  CORS_ORIGINS: z.string().default(
    'http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173',
  ),
});

export interface ApiConfig {
  nodeEnvironment: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  databaseSslRejectUnauthorized: boolean;
  databasePoolMax: number;
  corsOrigins: string[];
  authOtpPepper: string;
  sessionTtlDays: number;
  otpTtlMinutes: number;
  email: { mode: 'console' } | {
    mode: 'smtp';
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = environmentSchema.parse(environment);
  if (parsed.NODE_ENV === 'production' && parsed.EMAIL_MODE !== 'smtp') {
    throw new Error('Production requires EMAIL_MODE=smtp.');
  }
  if (parsed.EMAIL_MODE === 'smtp' && (!parsed.SMTP_HOST || !parsed.SMTP_USER || !parsed.SMTP_PASSWORD || !parsed.SMTP_FROM)) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM are required in SMTP mode.');
  }
  return {
    nodeEnvironment: parsed.NODE_ENV,
    port: parsed.API_PORT,
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL,
    databaseSslRejectUnauthorized: parsed.DATABASE_SSL_REJECT_UNAUTHORIZED,
    databasePoolMax: parsed.DATABASE_POOL_MAX,
    corsOrigins: parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    authOtpPepper: parsed.AUTH_OTP_PEPPER,
    sessionTtlDays: parsed.SESSION_TTL_DAYS,
    otpTtlMinutes: parsed.OTP_TTL_MINUTES,
    email: parsed.EMAIL_MODE === 'smtp'
      ? {
          mode: 'smtp',
          host: parsed.SMTP_HOST!,
          port: parsed.SMTP_PORT,
          secure: parsed.SMTP_SECURE,
          user: parsed.SMTP_USER!,
          password: parsed.SMTP_PASSWORD!,
          from: parsed.SMTP_FROM!,
        }
      : { mode: 'console' },
  };
}
