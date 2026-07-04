export type UserRole = 'student' | 'administrator';

export interface RegistrationRecord {
  fullName: string;
  age: number;
  grade: string;
  school: string;
  email: string;
  passwordHash: string;
  phoneE164: string;
  country: string;
  guardianConsentAt: Date;
  consentVersion: number;
  codeHash: string;
  codeExpiresAt: Date;
}

export interface LoginCredential {
  userId: string;
  publicId: string;
  role: UserRole;
  email: string;
  displayName: string;
  passwordHash: string;
  status: 'pending' | 'active' | 'disabled';
}

export interface SessionUser {
  userId: string;
  publicId: string;
  role: UserRole;
  email: string;
  displayName: string;
}

export type RegistrationStartResult = 'created' | 'pending_updated' | 'duplicate';
export type VerificationResult =
  | { status: 'verified'; user: SessionUser }
  | { status: 'invalid' | 'expired' | 'locked' | 'not_found' };

export interface AuthStore {
  startRegistration(record: RegistrationRecord): Promise<RegistrationStartResult>;
  verifyRegistration(
    email: string,
    codeHash: string,
    hashesMatch: (actual: string, expected: string) => boolean,
  ): Promise<VerificationResult>;
  findLoginCredential(email: string): Promise<LoginCredential | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date, userAgent: string | null): Promise<void>;
  findSession(tokenHash: string): Promise<SessionUser | null>;
  revokeSession(tokenHash: string): Promise<void>;
}

export interface EmailSender {
  sendVerificationCode(message: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}
