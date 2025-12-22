-- Users
create table if not exists public.users_v1 (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  is_master_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tenants (super admin owns/manage multiple clubs within a tenant)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  branding_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clubs (belong to a tenant)
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles at tenant scope
do $$ begin
  create type tenant_role as enum ('SUPER_ADMIN');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_tenant_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_v1(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role tenant_role not null,
  unique(user_id, tenant_id, role)
);

-- User roles at club scope
do $$ begin
  create type club_role as enum ('ADMIN');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_club_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_v1(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  role club_role not null,
  unique(user_id, club_id, role)
);

-- Updated timestamps triggers (optional)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'users_v1_set_updated_at') then
    create trigger users_v1_set_updated_at before update on public.users_v1
    for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tenants_set_updated_at') then
    create trigger tenants_set_updated_at before update on public.tenants
    for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'clubs_set_updated_at') then
    create trigger clubs_set_updated_at before update on public.clubs
    for each row execute function set_updated_at();
  end if;
end$$;

