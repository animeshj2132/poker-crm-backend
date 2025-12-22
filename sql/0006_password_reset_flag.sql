-- Add password reset requirement flag
alter table if exists public.users_v1
  add column if not exists must_reset_password boolean not null default false;

