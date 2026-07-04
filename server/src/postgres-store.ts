import type pg from 'pg';
import type {
  AuthStore,
  LoginCredential,
  RegistrationRecord,
  RegistrationStartResult,
  SessionUser,
  VerificationResult,
} from './auth-contracts.js';
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
} from './contracts.js';

interface ModuleRow {
  code: string;
  title: string;
  description: string;
  status: PublicModule['status'];
  route_slug: string;
  sort_order: number;
}

interface SettingRow {
  value: { enabled?: unknown };
}

export class PostgresPlatformStore implements PlatformStore, AuthStore, AdminStore {
  constructor(private readonly pool: pg.Pool) {}

  async ping(): Promise<void> {
    await this.pool.query('select 1');
  }

  async getPublicSettings(): Promise<PublicSettings> {
    const result = await this.pool.query<SettingRow>(
      `select value
       from virtual_classroom.platform_settings
       where key = $1`,
      ['guest_login'],
    );
    const enabled = result.rows[0]?.value?.enabled;
    return { guestLoginEnabled: typeof enabled === 'boolean' ? enabled : false };
  }

  async listPublicModules(): Promise<PublicModule[]> {
    const result = await this.pool.query<ModuleRow>(
      `select code, title, description, status, route_slug, sort_order
       from virtual_classroom.content_modules
       where status in ('published', 'coming_soon')
       order by sort_order asc, code asc`,
    );
    return result.rows.map((row) => ({
      code: row.code,
      title: row.title,
      description: row.description,
      status: row.status,
      routeSlug: row.route_slug,
      sortOrder: row.sort_order,
    }));
  }

  async startRegistration(record: RegistrationRecord): Promise<RegistrationStartResult> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const existing = await client.query<{ id: string; status: string }>(
        `select id, status from virtual_classroom.app_users where lower(email) = lower($1) for update`,
        [record.email],
      );
      if (existing.rows[0]?.status === 'active' || existing.rows[0]?.status === 'disabled') {
        await client.query('rollback');
        return 'duplicate';
      }

      let userId = existing.rows[0]?.id;
      let result: RegistrationStartResult = 'pending_updated';
      if (userId) {
        await client.query(
          `update virtual_classroom.app_users
           set password_hash = $2, display_name = $3, updated_at = now()
           where id = $1`,
          [userId, record.passwordHash, record.fullName],
        );
      } else {
        const inserted = await client.query<{ id: string }>(
          `insert into virtual_classroom.app_users
             (role, email, password_hash, status, display_name)
           values ('student', $1, $2, 'pending', $3)
           returning id`,
          [record.email, record.passwordHash, record.fullName],
        );
        userId = inserted.rows[0].id;
        result = 'created';
      }

      const school = await client.query<{ id: string }>(
        `insert into virtual_classroom.schools (name, country)
         values ($1, $2)
         on conflict (lower(name), lower(country))
         do update set name = excluded.name
         returning id`,
        [record.school, record.country],
      );
      await client.query(
        `insert into virtual_classroom.student_profiles
           (user_id, full_name, age, grade, school_id, phone_e164, country, guardian_consent_at, consent_version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (user_id) do update set
           full_name=excluded.full_name, age=excluded.age, grade=excluded.grade,
           school_id=excluded.school_id, phone_e164=excluded.phone_e164, country=excluded.country,
           guardian_consent_at=excluded.guardian_consent_at, consent_version=excluded.consent_version`,
        [userId, record.fullName, record.age, record.grade, school.rows[0].id, record.phoneE164,
          record.country, record.guardianConsentAt, record.consentVersion],
      );
      await client.query(
        `update virtual_classroom.email_verification_challenges
         set consumed_at = now()
         where user_id = $1 and purpose = 'registration' and consumed_at is null`,
        [userId],
      );
      await client.query(
        `insert into virtual_classroom.email_verification_challenges
           (user_id, purpose, code_hash, expires_at)
         values ($1, 'registration', $2, $3)`,
        [userId, record.codeHash, record.codeExpiresAt],
      );
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyRegistration(
    email: string,
    codeHash: string,
    hashesMatch: (actual: string, expected: string) => boolean,
  ): Promise<VerificationResult> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await client.query<{
        challenge_id: string; user_id: string; public_id: string; role: 'student';
        email: string; display_name: string; code_hash: string; expires_at: Date;
        attempt_count: number; max_attempts: number;
      }>(
        `select c.id as challenge_id, u.id as user_id, u.public_id, u.role, u.email,
                coalesce(p.full_name, u.display_name, 'Student') as display_name,
                c.code_hash, c.expires_at, c.attempt_count, c.max_attempts
         from virtual_classroom.app_users u
         join virtual_classroom.email_verification_challenges c on c.user_id = u.id
         left join virtual_classroom.student_profiles p on p.user_id = u.id
         where lower(u.email)=lower($1) and u.status='pending'
           and c.purpose='registration' and c.consumed_at is null
         order by c.created_at desc limit 1 for update of c`,
        [email],
      );
      const row = result.rows[0];
      if (!row) { await client.query('rollback'); return { status: 'not_found' }; }
      if (row.attempt_count >= row.max_attempts) { await client.query('rollback'); return { status: 'locked' }; }
      if (row.expires_at.getTime() <= Date.now()) { await client.query('rollback'); return { status: 'expired' }; }
      await client.query(
        `update virtual_classroom.email_verification_challenges set attempt_count=attempt_count+1 where id=$1`,
        [row.challenge_id],
      );
      if (!hashesMatch(row.code_hash, codeHash)) { await client.query('commit'); return { status: 'invalid' }; }
      await client.query(
        `update virtual_classroom.email_verification_challenges set consumed_at=now() where id=$1`,
        [row.challenge_id],
      );
      await client.query(
        `update virtual_classroom.app_users set status='active', email_verified_at=now() where id=$1`,
        [row.user_id],
      );
      await client.query('commit');
      return { status: 'verified', user: {
        userId: row.user_id, publicId: row.public_id, role: row.role,
        email: row.email, displayName: row.display_name,
      } };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findLoginCredential(email: string): Promise<LoginCredential | null> {
    const result = await this.pool.query<LoginCredential & { display_name: string; password_hash: string; public_id: string; user_id: string }>(
      `select u.id as user_id, u.public_id, u.role, u.email,
              coalesce(p.full_name,u.display_name,'User') as display_name,
              u.password_hash, u.status
       from virtual_classroom.app_users u
       left join virtual_classroom.student_profiles p on p.user_id=u.id
       where lower(u.email)=lower($1)`,
      [email],
    );
    const row = result.rows[0];
    return row ? {
      userId: row.user_id, publicId: row.public_id, role: row.role, email: row.email,
      displayName: row.display_name, passwordHash: row.password_hash, status: row.status,
    } : null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date, userAgent: string | null): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into virtual_classroom.auth_sessions (user_id,token_hash,expires_at,user_agent)
         values ($1,$2,$3,$4)`,
        [userId, tokenHash, expiresAt, userAgent?.slice(0, 500) ?? null],
      );
      await client.query(
        `update virtual_classroom.app_users set last_login_at=now() where id=$1`,
        [userId],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findSession(tokenHash: string): Promise<SessionUser | null> {
    const result = await this.pool.query<SessionUser & { user_id: string; public_id: string; display_name: string }>(
      `select u.id as user_id,u.public_id,u.role,u.email,
              coalesce(p.full_name,u.display_name,'User') as display_name
       from virtual_classroom.auth_sessions s
       join virtual_classroom.app_users u on u.id=s.user_id
       left join virtual_classroom.student_profiles p on p.user_id=u.id
       where s.token_hash=$1 and s.revoked_at is null and s.expires_at>now() and u.status='active'`,
      [tokenHash],
    );
    const row = result.rows[0];
    return row ? {
      userId: row.user_id, publicId: row.public_id, role: row.role,
      email: row.email, displayName: row.display_name,
    } : null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.pool.query(
      `update virtual_classroom.auth_sessions set revoked_at=now()
       where token_hash=$1 and revoked_at is null`,
      [tokenHash],
    );
  }

  async getAdminDashboard(query: AdminDashboardQuery): Promise<AdminDashboardData> {
    const cursorDate = query.cursor?.createdAt ?? null;
    const cursorId = query.cursor?.id ?? null;
    const [summaryResult, studentResult, moduleResult, settingResult, usageResult] = await Promise.all([
      this.pool.query<{
        registered_students: number; verified_accounts: number; schools: number; active_modules: number;
      }>(
        `select
           (select count(*)::int from virtual_classroom.app_users where role='student') as registered_students,
           (select count(*)::int from virtual_classroom.app_users where role='student' and status='active') as verified_accounts,
           (select count(*)::int from virtual_classroom.schools) as schools,
           (select count(*)::int from virtual_classroom.content_modules where status<>'archived') as active_modules`,
      ),
      this.pool.query<{
        id: string; public_id: string; full_name: string; age: number; grade: string;
        school_name: string; email: string; status: 'pending' | 'active' | 'disabled'; created_at: Date;
      }>(
        `select u.id, u.public_id, p.full_name, p.age, p.grade, s.name as school_name,
                u.email, u.status, u.created_at
         from virtual_classroom.app_users u
         join virtual_classroom.student_profiles p on p.user_id=u.id
         join virtual_classroom.schools s on s.id=p.school_id
         where u.role='student'
           and ($1::text='all' or u.status=$1)
           and ($2::text='' or lower(concat_ws(' ',p.full_name,u.email,s.name)) like '%' || lower($2) || '%')
           and ($3::timestamptz is null or (u.created_at,u.id) < ($3::timestamptz,$4::bigint))
         order by u.created_at desc,u.id desc
         limit $5`,
        [query.status, query.query, cursorDate, cursorId, query.limit + 1],
      ),
      this.pool.query<{
        code: string; title: string; description: string; status: AdminModule['status'];
        route_slug: string; sort_order: number; updated_at: Date;
      }>(
        `select code,title,description,status,route_slug,sort_order,updated_at
         from virtual_classroom.content_modules
         order by sort_order,code`,
      ),
      this.pool.query<SettingRow>(
        `select value from virtual_classroom.platform_settings where key='guest_login'`,
      ),
      this.pool.query<{ active_users: number; answered_questions: number }>(
        `select
           (select count(distinct user_id)::int from virtual_classroom.auth_sessions
            where created_at >= now()-interval '30 days') as active_users,
           (select count(*)::int from virtual_classroom.question_progress
            where answered_at >= now()-interval '30 days') as answered_questions`,
      ),
    ]);

    const hasMore = studentResult.rows.length > query.limit;
    const studentRows = hasMore ? studentResult.rows.slice(0, query.limit) : studentResult.rows;
    const lastStudent = studentRows.at(-1);
    const summary = summaryResult.rows[0];
    const usage = usageResult.rows[0];
    const enabled = settingResult.rows[0]?.value?.enabled;
    return {
      summary: {
        registeredStudents: summary.registered_students,
        verifiedAccounts: summary.verified_accounts,
        schools: summary.schools,
        activeModules: summary.active_modules,
      },
      students: studentRows.map((row) => ({
        publicId: row.public_id,
        name: row.full_name,
        age: row.age,
        grade: row.grade,
        school: row.school_name,
        email: row.email,
        status: row.status,
        createdAt: row.created_at,
      })),
      nextCursor: hasMore && lastStudent ? { createdAt: lastStudent.created_at, id: lastStudent.id } : null,
      modules: moduleResult.rows.map((row) => this.mapAdminModule(row)),
      guestLoginEnabled: typeof enabled === 'boolean' ? enabled : false,
      usage: {
        activeUsers: usage.active_users,
        answeredQuestions: usage.answered_questions,
      },
    };
  }

  async setGuestLogin(actorUserId: string, enabled: boolean): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const previous = await client.query<SettingRow>(
        `select value from virtual_classroom.platform_settings where key='guest_login' for update`,
      );
      await client.query(
        `insert into virtual_classroom.platform_settings (key,value,updated_by)
         values ('guest_login',jsonb_build_object('enabled',$2::boolean),$1)
         on conflict (key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`,
        [actorUserId, enabled],
      );
      await client.query(
        `insert into virtual_classroom.audit_events
           (actor_user_id,action,entity_type,entity_id,metadata)
         values ($1,'settings.guest_login.update','platform_setting','guest_login',$2)`,
        [actorUserId, {
          previousEnabled: previous.rows[0]?.value?.enabled ?? null,
          enabled,
        }],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async createAdminModule(actorUserId: string, input: AdminModuleInput): Promise<ModuleMutationResult> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const inserted = await client.query<{
        code: string; title: string; description: string; status: AdminModule['status'];
        route_slug: string; sort_order: number; updated_at: Date;
      }>(
        `insert into virtual_classroom.content_modules
           (code,title,description,status,route_slug,sort_order)
         values ($1,$2,$3,$4,$5,$6)
         returning code,title,description,status,route_slug,sort_order,updated_at`,
        [input.code, input.title, input.description, input.status, input.routeSlug, input.sortOrder],
      );
      await client.query(
        `insert into virtual_classroom.audit_events
           (actor_user_id,action,entity_type,entity_id,metadata)
         values ($1,'content_module.create','content_module',$2,$3)`,
        [actorUserId, input.code, input],
      );
      await client.query('commit');
      return { status: 'ok', module: this.mapAdminModule(inserted.rows[0]) };
    } catch (error) {
      await client.query('rollback');
      if (this.isUniqueViolation(error)) return { status: 'duplicate' };
      throw error;
    } finally {
      client.release();
    }
  }

  async updateAdminModule(
    actorUserId: string,
    code: string,
    input: Omit<AdminModuleInput, 'code'>,
  ): Promise<ModuleMutationResult> {
    if (code === 'A' && input.status === 'archived') return { status: 'protected' };
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const updated = await client.query<{
        code: string; title: string; description: string; status: AdminModule['status'];
        route_slug: string; sort_order: number; updated_at: Date;
      }>(
        `update virtual_classroom.content_modules
         set title=$2,description=$3,status=$4,route_slug=$5,sort_order=$6
         where code=$1
         returning code,title,description,status,route_slug,sort_order,updated_at`,
        [code, input.title, input.description, input.status, input.routeSlug, input.sortOrder],
      );
      if (!updated.rows[0]) {
        await client.query('rollback');
        return { status: 'not_found' };
      }
      await client.query(
        `insert into virtual_classroom.audit_events
           (actor_user_id,action,entity_type,entity_id,metadata)
         values ($1,'content_module.update','content_module',$2,$3)`,
        [actorUserId, code, input],
      );
      await client.query('commit');
      return { status: 'ok', module: this.mapAdminModule(updated.rows[0]) };
    } catch (error) {
      await client.query('rollback');
      if (this.isUniqueViolation(error)) return { status: 'duplicate' };
      throw error;
    } finally {
      client.release();
    }
  }

  async archiveAdminModule(actorUserId: string, code: string): Promise<ModuleMutationResult> {
    if (code === 'A') return { status: 'protected' };
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const archived = await client.query<{
        code: string; title: string; description: string; status: AdminModule['status'];
        route_slug: string; sort_order: number; updated_at: Date;
      }>(
        `update virtual_classroom.content_modules set status='archived'
         where code=$1
         returning code,title,description,status,route_slug,sort_order,updated_at`,
        [code],
      );
      if (!archived.rows[0]) {
        await client.query('rollback');
        return { status: 'not_found' };
      }
      await client.query(
        `insert into virtual_classroom.audit_events
           (actor_user_id,action,entity_type,entity_id,metadata)
         values ($1,'content_module.archive','content_module',$2,'{}'::jsonb)`,
        [actorUserId, code],
      );
      await client.query('commit');
      return { status: 'ok', module: this.mapAdminModule(archived.rows[0]) };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapAdminModule(row: {
    code: string; title: string; description: string; status: AdminModule['status'];
    route_slug: string; sort_order: number; updated_at: Date;
  }): AdminModule {
    return {
      code: row.code,
      title: row.title,
      description: row.description,
      status: row.status,
      routeSlug: row.route_slug,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
