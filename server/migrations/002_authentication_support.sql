alter table virtual_classroom.app_users
  add column display_name text;

alter table virtual_classroom.app_users
  add constraint app_users_display_name_length
  check (display_name is null or char_length(trim(display_name)) between 2 and 120);

create index app_users_role_status_idx
  on virtual_classroom.app_users (role, status);
