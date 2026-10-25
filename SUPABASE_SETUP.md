# Supabase application setup

The app now uses Supabase Auth for sign-up/sign-in and queries Supabase for profiles, printers, print jobs, alerts, and application settings. Dashboard analytics are calculated from database print-job rows. There is no local-storage/demo-data fallback.

## Configure credentials

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the existing project `.env` file (or use `.env.local` for local development), then restart Vite. These browser-exposed variables must contain only the Supabase publishable/anon key. Never place a secret or `service_role` key in this frontend project.

## Apply migrations

Apply the migrations, in timestamp order, to the same Supabase project:

1. `supabase/migrations/20261011000000_create_profiles.sql`
2. `supabase/migrations/20261011000001_persist_app_data.sql`
3. `supabase/migrations/20261025000000_enable_print_job_events_admin_rls.sql`

They create the profile trigger and application tables, configure RLS, and provide a protected RPC for deleting Auth users. The app expects the `profiles`, `printers`, `print_jobs`, `alerts`, and `app_settings` schema defined in these migrations. Existing demo records are not automatically migrated or seeded; new registrations create profile records, and other app data must be entered into Supabase.

Captured Windows print metadata is read from the existing `public.print_job_events` table. The additional migration enables RLS and permits SELECT only to authenticated users whose trusted `auth.users.app_metadata.role` is `admin`; print metadata inserts from the server-side collector continue to use its server-only service-role credential.

Accounts saved by the previous browser-local registration flow are not imported. Clear the old `ihap-registered-accounts` browser storage entry after confirming you no longer need its account details; the old implementation stored passwords in browser storage.

## Admin role

Admin access is read only from trusted `auth.users.app_metadata.role`, not signup/user metadata. A trusted administrator must provision the admin user's app metadata and matching `profiles.role = 'admin'` using Supabase's Dashboard or a privileged server-side process. Example SQL for an already-created account:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Sign out and back in after changing app metadata so the user's JWT contains the new trusted claim. Never grant admin through `raw_user_meta_data` or client-side form input.

## Require email confirmation

Email-format validation in the browser cannot establish that a user can access an inbox. To prevent accounts using unverified addresses from signing in, enable **Confirm email** for the Email provider in the Supabase Dashboard under **Authentication → Providers → Email**. Keep this setting enabled in every Supabase environment. With confirmation enabled, Supabase sends a verification link and does not establish a sign-in session until the user follows it.

Also set the project's **Site URL** and add the app's deployed URL (and local development URL, if needed) to **Authentication → URL Configuration → Redirect URLs**. The registration screen tells users to check their inbox; if registration signs the user in immediately instead, verify that **Confirm email** is enabled in the Supabase project.

## Scope and limitations

The print page currently records a selected file's metadata; it does not upload the document to Supabase Storage or send a physical printer command. Verify admin and regular-user access with separate accounts after applying migrations; never use a service-role key in the browser.
