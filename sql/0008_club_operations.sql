-- Staff Management
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role varchar(50) not null,
  status varchar(50) not null default 'Active',
  employee_id text,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Credit Requests
create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  amount decimal(10,2) not null,
  status varchar(50) not null default 'Pending',
  visible_to_player boolean not null default false,
  credit_limit decimal(10,2) not null default 0,
  notes text,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Financial Transactions
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null,
  player_id text not null,
  player_name text not null,
  amount decimal(10,2) not null,
  status varchar(50) not null default 'Pending',
  notes text,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VIP Products
create table if not exists public.vip_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  points integer not null,
  description text,
  image_url text,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Club Settings
create table if not exists public.club_settings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  key text not null,
  value text,
  json_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(club_id, key)
);

-- Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action varchar(50) not null,
  entity_type text not null,
  entity_id uuid,
  user_id uuid,
  user_email text,
  description text,
  metadata jsonb,
  club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_staff_club_id on public.staff(club_id);
create index if not exists idx_credit_requests_club_id on public.credit_requests(club_id);
create index if not exists idx_credit_requests_status on public.credit_requests(status);
create index if not exists idx_financial_transactions_club_id on public.financial_transactions(club_id);
create index if not exists idx_financial_transactions_status on public.financial_transactions(status);
create index if not exists idx_vip_products_club_id on public.vip_products(club_id);
create index if not exists idx_club_settings_club_id on public.club_settings(club_id);
create index if not exists idx_audit_logs_club_id on public.audit_logs(club_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

