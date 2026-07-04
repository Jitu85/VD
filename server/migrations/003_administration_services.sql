create index app_users_students_status_created_idx
  on virtual_classroom.app_users (status, created_at desc, id desc)
  where role = 'student';

create index auth_sessions_created_user_idx
  on virtual_classroom.auth_sessions (created_at desc, user_id);

create index question_progress_answered_at_idx
  on virtual_classroom.question_progress (answered_at desc);

create index content_modules_sort_order_code_idx
  on virtual_classroom.content_modules (sort_order, code);