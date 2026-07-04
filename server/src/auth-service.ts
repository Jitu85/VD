import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import type {
  AuthStore,
  EmailSender,
  RegistrationRecord,
  SessionUser,
  UserRole,
} from './auth-contracts.js';
import { ApiError } from './errors.js';

const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$k2gYFLVho8yYHuvrC4Jjgg$zq6DwTCGXmM9ZmLjo2ozS6oY3r2Y1f3Xl0bAkx9JkF8';

export interface RegistrationInput {
  fullName: string;
  age: number;
  grade: string;
  school: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  guardianConsent: true;
}

export interface AuthResult {
  sessionToken: string;
  expiresAt: Date;
  user: Omit<SessionUser, 'userId'>;
}

function hashesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export class AuthService {
  constructor(
    private readonly store: AuthStore,
    private readonly emailSender: EmailSender,
    private readonly otpPepper: string,
    private readonly otpTtlMinutes = 10,
    private readonly sessionTtlDays = 7,
  ) {}

  private hashCode(email: string, code: string): string {
    return createHmac('sha256', this.otpPepper)
      .update(`registration:${email.trim().toLowerCase()}:${code}`)
      .digest('hex');
  }

  private createCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  async startRegistration(input: RegistrationInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const code = this.createCode();
    const record: RegistrationRecord = {
      fullName: input.fullName.trim(),
      age: input.age,
      grade: input.grade.trim(),
      school: input.school.trim(),
      email,
      passwordHash,
      phoneE164: input.phone.replace(/[ ()-]/g, ''),
      country: input.country.trim(),
      guardianConsentAt: new Date(),
      consentVersion: 1,
      codeHash: this.hashCode(email, code),
      codeExpiresAt: new Date(Date.now() + this.otpTtlMinutes * 60_000),
    };
    const result = await this.store.startRegistration(record);
    if (result === 'duplicate') throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'An account already exists for this email address.');
    await this.emailSender.sendVerificationCode({ to: email, code, expiresInMinutes: this.otpTtlMinutes });
  }

  async verifyRegistration(emailValue: string, code: string, userAgent: string | null): Promise<AuthResult> {
    const email = emailValue.trim().toLowerCase();
    const result = await this.store.verifyRegistration(email, this.hashCode(email, code), hashesMatch);
    if (result.status !== 'verified') {
      const messages = {
        invalid: 'Incorrect Code, please try again.',
        expired: 'This code has expired. Request a new code.',
        locked: 'Too many incorrect attempts. Request a new code.',
        not_found: 'No pending verification was found.',
      };
      throw new ApiError(400, `OTP_${result.status.toUpperCase()}`, messages[result.status]);
    }
    return this.issueSession(result.user, userAgent);
  }

  async login(emailValue: string, password: string, expectedRole: UserRole, userAgent: string | null): Promise<AuthResult> {
    const credential = await this.store.findLoginCredential(emailValue.trim().toLowerCase());
    const passwordHash = credential?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const validPassword = await argon2.verify(passwordHash, password).catch(() => false);
    if (!credential || !validPassword || credential.status !== 'active' || credential.role !== expectedRole) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
    }
    return this.issueSession(credential, userAgent);
  }

  async authenticate(sessionToken: string | undefined): Promise<Omit<SessionUser, 'userId'> | null> {
    const user = await this.authenticateSession(sessionToken);
    if (!user) return null;
    const { userId: _userId, ...publicUser } = user;
    return publicUser;
  }

  async authenticateSession(sessionToken: string | undefined): Promise<SessionUser | null> {
    if (!sessionToken) return null;
    return this.store.findSession(this.hashSessionToken(sessionToken));
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) await this.store.revokeSession(this.hashSessionToken(sessionToken));
  }

  private async issueSession(user: SessionUser, userAgent: string | null): Promise<AuthResult> {
    const sessionToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionTtlDays * 86_400_000);
    await this.store.createSession(user.userId, this.hashSessionToken(sessionToken), expiresAt, userAgent);
    const { userId: _userId, ...publicUser } = user;
    return { sessionToken, expiresAt, user: publicUser };
  }

  private hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
