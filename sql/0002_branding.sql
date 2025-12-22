-- Tenant branding additions
alter table if exists public.tenants
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists theme jsonb,
  add column if not exists custom_domain text,
  add column if not exists white_label boolean not null default true;

-- Optional: index for custom domain routing
create index if not exists tenants_custom_domain_idx on public.tenants (custom_domain);

-- Enforce uniqueness of custom domain (nullable unique)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'tenants_custom_domain_unique'
  ) then
    create unique index tenants_custom_domain_unique on public.tenants (custom_domain) where custom_domain is not null;
  end if;
end$$;

