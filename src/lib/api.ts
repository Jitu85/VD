const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export interface PublicModule {
  code: string;
  title: string;
  description: string;
  status: 'published' | 'coming_soon';
  routeSlug: string;
  sortOrder: number;
}

export interface SessionUser {
  publicId: string;
  role: 'student' | 'administrator';
  email: string;
  displayName: string;
}

export interface AdminStudent {
  publicId: string;
  name: string;
  age: number;
  grade: string;
  school: string;
  email: string;
  status: 'pending' | 'active' | 'disabled';
  createdAt: string;
}

export interface AdminModule {
  code: string;
  title: string;
  description: string;
  status: 'draft' | 'coming_soon' | 'published' | 'archived';
  routeSlug: string;
  sortOrder: number;
  updatedAt: string;
}

export interface AdminDashboardData {
  summary: { registeredStudents: number; verifiedAccounts: number; schools: number; activeModules: number };
  students: AdminStudent[];
  nextCursor: string | null;
  modules: AdminModule[];
  guestLoginEnabled: boolean;
  usage: { activeUsers: number; answeredQuestions: number };
}

export interface StudentRegistrationInput {
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

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseUser(value: unknown): SessionUser | null {
  if (
    !isRecord(value)
    || typeof value.publicId !== 'string'
    || (value.role !== 'student' && value.role !== 'administrator')
    || typeof value.email !== 'string'
    || typeof value.displayName !== 'string'
  ) return null;
  return {
    publicId: value.publicId,
    role: value.role,
    email: value.email,
    displayName: value.displayName,
  };
}

async function requestJson<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; parse: (value: unknown) => T | null },
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const payload: unknown = response.status === 204 ? {} : await response.json().catch(() => null);
    if (!response.ok) {
      const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
      return {
        ok: false,
        code: typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
        message: typeof error?.message === 'string' ? error.message : 'The service could not complete this request.',
      };
    }
    const parsed = options.parse(payload);
    return parsed === null
      ? { ok: false, code: 'INVALID_RESPONSE', message: 'The service returned an invalid response.' }
      : { ok: true, data: parsed };
  } catch {
    return { ok: false, code: 'SERVICE_UNAVAILABLE', message: 'The service is unavailable. Please try again.' };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchPublicSettings(): Promise<{ guestLoginEnabled: boolean } | null> {
  const result = await requestJson('/settings/public', {
    parse: (response) => isRecord(response)
      && isRecord(response.data)
      && typeof response.data.guestLoginEnabled === 'boolean'
      ? { guestLoginEnabled: response.data.guestLoginEnabled }
      : null,
  });
  return result.ok ? result.data : null;
}

export async function fetchPublicModules(): Promise<PublicModule[] | null> {
  const result = await requestJson('/modules', {
    parse: (response) => {
      if (!isRecord(response) || !Array.isArray(response.data)) return null;
      const modules: PublicModule[] = [];
      for (const item of response.data) {
        if (
          !isRecord(item)
          || typeof item.code !== 'string'
          || !/^[A-Z][A-Z0-9]{0,5}$/.test(item.code)
          || typeof item.title !== 'string'
          || typeof item.description !== 'string'
          || (item.status !== 'published' && item.status !== 'coming_soon')
          || typeof item.routeSlug !== 'string'
          || typeof item.sortOrder !== 'number'
          || !Number.isInteger(item.sortOrder)
          || item.sortOrder < 0
        ) return null;
        modules.push({
          code: item.code,
          title: item.title,
          description: item.description,
          status: item.status,
          routeSlug: item.routeSlug,
          sortOrder: item.sortOrder,
        });
      }
      return modules;
    },
  });
  return result.ok ? result.data : null;
}

function parseUserResponse(response: unknown): { user: SessionUser } | null {
  if (!isRecord(response) || !isRecord(response.data)) return null;
  const user = parseUser(response.data.user);
  return user ? { user } : null;
}

export function startStudentRegistration(input: StudentRegistrationInput): Promise<ApiResult<{ status: string }>> {
  return requestJson('/auth/register/start', {
    method: 'POST',
    body: input,
    parse: (response) => isRecord(response)
      && isRecord(response.data)
      && response.data.status === 'verification_required'
      ? { status: response.data.status }
      : null,
  });
}

export function verifyStudentRegistration(email: string, code: string): Promise<ApiResult<{ user: SessionUser }>> {
  return requestJson('/auth/register/verify', {
    method: 'POST',
    body: { email, code },
    parse: parseUserResponse,
  });
}

export function login(
  email: string,
  password: string,
  audience: SessionUser['role'],
): Promise<ApiResult<{ user: SessionUser }>> {
  return requestJson('/auth/login', {
    method: 'POST',
    body: { email, password, audience },
    parse: parseUserResponse,
  });
}

export function fetchSession(): Promise<ApiResult<{ user: SessionUser }>> {
  return requestJson('/auth/me', { parse: parseUserResponse });
}

function parseAdminModule(value: unknown): AdminModule | null {
  if (
    !isRecord(value)
    || typeof value.code !== 'string'
    || typeof value.title !== 'string'
    || typeof value.description !== 'string'
    || !['draft', 'coming_soon', 'published', 'archived'].includes(String(value.status))
    || typeof value.routeSlug !== 'string'
    || typeof value.sortOrder !== 'number'
    || typeof value.updatedAt !== 'string'
  ) return null;
  return value as unknown as AdminModule;
}

function parseAdminDashboard(response: unknown): AdminDashboardData | null {
  if (!isRecord(response) || !isRecord(response.data)) return null;
  const data = response.data;
  if (
    !isRecord(data.summary)
    || !Array.isArray(data.students)
    || !Array.isArray(data.modules)
    || (data.nextCursor !== null && typeof data.nextCursor !== 'string')
    || typeof data.guestLoginEnabled !== 'boolean'
    || !isRecord(data.usage)
  ) return null;
  const summaryKeys = ['registeredStudents', 'verifiedAccounts', 'schools', 'activeModules'];
  if (summaryKeys.some((key) => typeof (data.summary as Record<string, unknown>)[key] !== 'number')) return null;
  if (typeof data.usage.activeUsers !== 'number' || typeof data.usage.answeredQuestions !== 'number') return null;
  const students: AdminStudent[] = [];
  for (const item of data.students) {
    if (
      !isRecord(item)
      || typeof item.publicId !== 'string'
      || typeof item.name !== 'string'
      || typeof item.age !== 'number'
      || typeof item.grade !== 'string'
      || typeof item.school !== 'string'
      || typeof item.email !== 'string'
      || !['pending', 'active', 'disabled'].includes(String(item.status))
      || typeof item.createdAt !== 'string'
    ) return null;
    students.push(item as unknown as AdminStudent);
  }
  const modules: AdminModule[] = [];
  for (const item of data.modules) {
    const module = parseAdminModule(item);
    if (!module) return null;
    modules.push(module);
  }
  return {
    summary: data.summary as unknown as AdminDashboardData['summary'],
    students,
    nextCursor: data.nextCursor,
    modules,
    guestLoginEnabled: data.guestLoginEnabled,
    usage: data.usage as unknown as AdminDashboardData['usage'],
  };
}

export function fetchAdminDashboard(input: {
  query?: string;
  status?: 'all' | 'pending' | 'active' | 'disabled';
  cursor?: string;
  limit?: number;
} = {}): Promise<ApiResult<AdminDashboardData>> {
  const parameters = new URLSearchParams();
  if (input.query) parameters.set('q', input.query);
  if (input.status && input.status !== 'all') parameters.set('status', input.status);
  if (input.cursor) parameters.set('cursor', input.cursor);
  parameters.set('limit', String(input.limit ?? 25));
  return requestJson(`/admin/dashboard?${parameters}`, { parse: parseAdminDashboard });
}

export function updateGuestLogin(enabled: boolean): Promise<ApiResult<{ guestLoginEnabled: boolean }>> {
  return requestJson('/admin/settings/guest-login', {
    method: 'PATCH',
    body: { enabled },
    parse: (response) => isRecord(response)
      && isRecord(response.data)
      && typeof response.data.guestLoginEnabled === 'boolean'
      ? { guestLoginEnabled: response.data.guestLoginEnabled }
      : null,
  });
}

function parseModuleResponse(response: unknown): { module: AdminModule } | null {
  if (!isRecord(response) || !isRecord(response.data)) return null;
  const module = parseAdminModule(response.data.module);
  return module ? { module } : null;
}

export function createAdminModule(input: Omit<AdminModule, 'updatedAt'>): Promise<ApiResult<{ module: AdminModule }>> {
  return requestJson('/admin/modules', { method: 'POST', body: input, parse: parseModuleResponse });
}

export function updateAdminModule(
  code: string,
  input: Omit<AdminModule, 'code' | 'updatedAt'>,
): Promise<ApiResult<{ module: AdminModule }>> {
  return requestJson(`/admin/modules/${encodeURIComponent(code)}`, {
    method: 'PATCH', body: input, parse: parseModuleResponse,
  });
}

export function archiveAdminModule(code: string): Promise<ApiResult<{ module: AdminModule }>> {
  return requestJson(`/admin/modules/${encodeURIComponent(code)}`, {
    method: 'DELETE', parse: parseModuleResponse,
  });
}

export function logout(): Promise<ApiResult<true>> {
  return requestJson('/auth/logout', {
    method: 'POST',
    parse: () => true,
  });
}