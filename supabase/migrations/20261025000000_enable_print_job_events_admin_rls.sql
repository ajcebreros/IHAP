alter table public.print_job_events enable row level security;

revoke all on table public.print_job_events from anon, authenticated;
grant select on table public.print_job_events to authenticated;

do $$
declare
  existing_policy text;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'print_job_events'
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.print_job_events', existing_policy);
  end loop;
end;
$$;

create policy "Admins can view captured print events"
  on public.print_job_events
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
