-- Add password hash column to users table
alter table if exists public.users_v1
  add column if not exists password_hash text;

-- Index for faster lookups (optional, but recommended)
create index if not exists users_v1_email_idx on public.users_v1 (email);

