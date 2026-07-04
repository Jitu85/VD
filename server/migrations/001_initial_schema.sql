create schema if not exists virtual_classroom;

create or replace function virtual_classroom.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table virtual_classroom.app_users (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid(),
  role text not null check (role in ('student', 'administrator')),
  email text not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_public_id_unique unique (public_id)
);
create unique index app_users_email_lower_unique_idx
  on virtual_classroom.app_users (lower(email));
create index app_users_status_created_at_idx
  on virtual_classroom.app_users (status, created_at desc);

create table virtual_classroom.schools (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 200),
  country text not null check (char_length(trim(country)) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_public_id_unique unique (public_id)
);
create unique index schools_name_country_lower_unique_idx
  on virtual_classroom.schools (lower(name), lower(country));

create table virtual_classroom.student_profiles (
  user_id bigint primary key references virtual_classroom.app_users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  age smallint not null check (age between 4 and 18),
  grade text not null check (char_length(trim(grade)) between 1 and 30),
  school_id bigint not null references virtual_classroom.schools(id) on delete restrict,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  country text not null check (char_length(trim(country)) between 2 and 100),
  guardian_consent_at timestamptz not null,
  consent_version smallint not null default 1 check (consent_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index student_profiles_school_id_idx
  on virtual_classroom.student_profiles (school_id);
create index student_profiles_full_name_lower_idx
  on virtual_classroom.student_profiles (lower(full_name));

create table virtual_classroom.email_verification_challenges (
  id bigint generated always as identity primary key,
  user_id bigint not null references virtual_classroom.app_users(id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'password_reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count smallint not null default 0 check (attempt_count >= 0),
  max_attempts smallint not null default 5 check (max_attempts between 1 and 20),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index email_challenges_user_purpose_expires_idx
  on virtual_classroom.email_verification_challenges (user_id, purpose, expires_at desc)
  where consumed_at is null;

create table virtual_classroom.auth_sessions (
  id bigint generated always as identity primary key,
  user_id bigint not null references virtual_classroom.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index auth_sessions_user_id_expires_idx
  on virtual_classroom.auth_sessions (user_id, expires_at desc);
create index auth_sessions_active_expires_idx
  on virtual_classroom.auth_sessions (expires_at)
  where revoked_at is null;

create table virtual_classroom.content_modules (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z][A-Z0-9]{0,5}$'),
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null default '',
  status text not null check (status in ('draft', 'coming_soon', 'published', 'archived')),
  route_slug text not null check (route_slug ~ '^[a-z0-9][a-z0-9-]*$'),
  sort_order smallint not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_modules_code_unique unique (code),
  constraint content_modules_route_slug_unique unique (route_slug)
);
create index content_modules_status_sort_order_idx
  on virtual_classroom.content_modules (status, sort_order);

create table virtual_classroom.platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  updated_by bigint references virtual_classroom.app_users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index platform_settings_updated_by_idx
  on virtual_classroom.platform_settings (updated_by)
  where updated_by is not null;

create table virtual_classroom.chapter_progress (
  user_id bigint not null references virtual_classroom.app_users(id) on delete cascade,
  volume smallint not null check (volume between 1 and 3),
  chapter smallint not null check (chapter > 0),
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, volume, chapter)
);
create index chapter_progress_user_completed_idx
  on virtual_classroom.chapter_progress (user_id, completed_at)
  where completed_at is not null;

create table virtual_classroom.question_progress (
  user_id bigint not null references virtual_classroom.app_users(id) on delete cascade,
  volume smallint not null check (volume between 1 and 3),
  chapter smallint not null check (chapter > 0),
  exercise smallint not null check (exercise > 0),
  question smallint not null check (question > 0),
  attempt_count smallint not null default 1 check (attempt_count > 0),
  last_result text check (last_result in ('correct', 'review')),
  answered_at timestamptz not null default now(),
  primary key (user_id, volume, chapter, exercise, question)
);
create index question_progress_user_answered_at_idx
  on virtual_classroom.question_progress (user_id, answered_at desc);

create table virtual_classroom.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id bigint references virtual_classroom.app_users(id) on delete set null,
  action text not null check (char_length(trim(action)) between 2 and 100),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_events_actor_created_at_idx
  on virtual_classroom.audit_events (actor_user_id, created_at desc);
create index audit_events_entity_created_at_idx
  on virtual_classroom.audit_events (entity_type, entity_id, created_at desc);

create trigger app_users_set_updated_at
before update on virtual_classroom.app_users
for each row execute function virtual_classroom.set_updated_at();

create trigger schools_set_updated_at
before update on virtual_classroom.schools
for each row execute function virtual_classroom.set_updated_at();

create trigger student_profiles_set_updated_at
before update on virtual_classroom.student_profiles
for each row execute function virtual_classroom.set_updated_at();

create trigger content_modules_set_updated_at
before update on virtual_classroom.content_modules
for each row execute function virtual_classroom.set_updated_at();

insert into virtual_classroom.content_modules
  (code, title, description, status, route_slug, sort_order)
values
  ('A', 'English Grammar & Composition', 'Thirty-three chapters with interactive grammar and composition practice.', 'published', 'grammar', 10),
  ('B', 'Learning Module B', 'New lessons are being prepared.', 'coming_soon', 'module-b', 20),
  ('C', 'Learning Module C', 'New lessons are being prepared.', 'coming_soon', 'module-c', 30)
on conflict (code) do nothing;

insert into virtual_classroom.platform_settings (key, value)
values ('guest_login', '{"enabled": true}'::jsonb)
on conflict (key) do nothing;
