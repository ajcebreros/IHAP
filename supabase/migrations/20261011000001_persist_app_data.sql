alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), 'User');
  insert into public.profiles (id, email, name, college, department, avatar)
  values (
    new.id,
    new.email,
    profile_name,
    nullif(new.raw_user_meta_data ->> 'college', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    upper(left(profile_name, 2))
  );
  return new;
end;
$$;

create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default '',
  department text not null default '',
  online boolean not null default false,
  paper_remaining integer not null default 0 check (paper_remaining >= 0),
  max_capacity integer not null default 100 check (max_capacity > 0),
  queue integer not null default 0 check (queue >= 0),
  pages_today integer not null default 0 check (pages_today >= 0),
  daily_avg integer not null default 0 check (daily_avg >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  user_name text not null default '',
  department text not null default '',
  document text not null,
  document_type text not null default 'Document',
  pages integer not null check (pages > 0),
  copies integer not null check (copies > 0),
  paper_used integer not null check (paper_used >= 0),
  purpose text not null check (purpose in ('Office', 'Personal', 'Unclassified')),
  confidence integer not null default 0 check (confidence between 0 and 100),
  printer text not null,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  paper_size text not null default 'A4',
  paper_type text not null default 'Standard',
  reasons text[] not null default '{}',
  is_duplex boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists print_jobs_user_created_at_idx
  on public.print_jobs (user_id, created_at desc);
create index if not exists print_jobs_created_at_idx
  on public.print_jobs (created_at desc);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'low', 'critical', 'empty')),
  title text not null,
  message text not null,
  printer text,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  paper_cost_per_sheet numeric(10, 2) not null default 0.40,
  max_printer_capacity integer not null default 100,
  low_paper_threshold integer not null default 20,
  critical_paper_threshold integer not null default 5,
  classification_enabled boolean not null default true,
  confidence_threshold integer not null default 75 check (confidence_threshold between 0 and 100),
  require_confirmation boolean not null default true,
  low_paper_alerts boolean not null default true,
  critical_paper_alerts boolean not null default true,
  high_consumption_alerts boolean not null default true,
  email_notifications boolean not null default false,
  in_app_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;
alter table public.alerts enable row level security;
alter table public.app_settings enable row level security;

grant select on public.printers, public.alerts, public.app_settings to authenticated;
grant insert, update, delete on public.printers to authenticated;
grant select, insert on public.print_jobs to authenticated;
grant update on public.alerts to authenticated;
grant update on public.app_settings to authenticated;

create policy "Authenticated users can view printers"
  on public.printers for select to authenticated
  using (true);
create policy "Admins can manage printers"
  on public.printers for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can view their print jobs and admins can view all"
  on public.print_jobs for select to authenticated
  using (
    user_id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
create policy "Users can create their own print jobs and admins can record manual jobs"
  on public.print_jobs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Authenticated users can view alerts"
  on public.alerts for select to authenticated
  using (true);
create policy "Admins can update alerts"
  on public.alerts for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Authenticated users can view app settings"
  on public.app_settings for select to authenticated
  using (true);
create policy "Admins can update app settings"
  on public.app_settings for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.delete_user_account(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Only admins may delete user accounts';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'Admins cannot delete their own account';
  end if;

  delete from auth.users where id = target_user_id;
  if not found then
    raise exception 'User account was not found';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon;
grant execute on function public.delete_user_account(uuid) to authenticated;
