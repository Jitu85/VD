import 'dotenv/config';
import { createApp } from './app.js';
import { AuthService } from './auth-service.js';
import { readConfig } from './config.js';
import { createDatabasePool } from './database.js';
import { ConsoleEmailSender, SmtpEmailSender } from './email.js';
import { PostgresPlatformStore } from './postgres-store.js';

const config = readConfig();
const pool = createDatabasePool(config);
const store = new PostgresPlatformStore(pool);
const emailSender = config.email.mode === 'smtp'
  ? new SmtpEmailSender(config.email, config.email.from)
  : new ConsoleEmailSender();
const authService = new AuthService(
  store,
  emailSender,
  config.authOtpPepper,
  config.otpTtlMinutes,
  config.sessionTtlDays,
);
const app = createApp({
  store,
  corsOrigins: config.corsOrigins,
  environment: config.nodeEnvironment,
  authService,
  adminStore: store,
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Virtual Classroom API listening on port ${config.port}`);
});

async function shutDown(signal: string) {
  console.log(`Received ${signal}; closing the API.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutDown('SIGINT'));
process.on('SIGTERM', () => void shutDown('SIGTERM'));
