create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  college text,
  department text,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar text not null default '',
  total_sheets integer not null default 0 check (total_sheets >= 0),
  monthly_sheets integer not null default 0 check (monthly_sheets >= 0),
  office_sheets integer not null default 0 check (office_sheets >= 0),
  personal_sheets integer not null default 0 check (personal_sheets >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  printing_allowed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (name, college, department) on table public.profiles to authenticated;

create policy "Users can view their own profile and admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Users can update their own basic profile fields"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) and role = 'user')
  with check (id = (select auth.uid()) and role = 'user');

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, college, department, avatar)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), 'User'),
    nullif(new.raw_user_meta_data ->> 'college', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    upper(left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), 'User'), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
