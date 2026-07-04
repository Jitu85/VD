export type ModuleStatus = 'published' | 'coming_soon';
export type AdminModuleStatus = 'draft' | 'coming_soon' | 'published' | 'archived';

export interface PublicModule {
  code: string;
  title: string;
  description: string;
  status: ModuleStatus;
  routeSlug: string;
  sortOrder: number;
}

export interface PublicSettings {
  guestLoginEnabled: boolean;
}

export interface AdminSummary {
  registeredStudents: number;
  verifiedAccounts: number;
  schools: number;
  activeModules: number;
}

export interface AdminStudent {
  publicId: string;
  name: string;
  age: number;
  grade: string;
  school: string;
  email: string;
  status: 'pending' | 'active' | 'disabled';
  createdAt: Date;
}

export interface AdminModule {
  code: string;
  title: string;
  description: string;
  status: AdminModuleStatus;
  routeSlug: string;
  sortOrder: number;
  updatedAt: Date;
}

export interface AdminUsage {
  activeUsers: number;
  answeredQuestions: number;
}

export interface AdminDashboardQuery {
  query: string;
  status: 'all' | 'pending' | 'active' | 'disabled';
  limit: number;
  cursor?: { createdAt: Date; id: string };
}

export interface AdminDashboardData {
  summary: AdminSummary;
  students: AdminStudent[];
  nextCursor: { createdAt: Date; id: string } | null;
  modules: AdminModule[];
  guestLoginEnabled: boolean;
  usage: AdminUsage;
}

export interface AdminModuleInput {
  code: string;
  title: string;
  description: string;
  status: AdminModuleStatus;
  routeSlug: string;
  sortOrder: number;
}

export type ModuleMutationResult =
  | { status: 'ok'; module: AdminModule }
  | { status: 'duplicate' | 'not_found' | 'protected' };

export interface PlatformStore {
  ping(): Promise<void>;
  getPublicSettings(): Promise<PublicSettings>;
  listPublicModules(): Promise<PublicModule[]>;
}

export interface AdminStore {
  getAdminDashboard(query: AdminDashboardQuery): Promise<AdminDashboardData>;
  setGuestLogin(actorUserId: string, enabled: boolean): Promise<void>;
  createAdminModule(actorUserId: string, input: AdminModuleInput): Promise<ModuleMutationResult>;
  updateAdminModule(actorUserId: string, code: string, input: Omit<AdminModuleInput, 'code'>): Promise<ModuleMutationResult>;
  archiveAdminModule(actorUserId: string, code: string): Promise<ModuleMutationResult>;
}