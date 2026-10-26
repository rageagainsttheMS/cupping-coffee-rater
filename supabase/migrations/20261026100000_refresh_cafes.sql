-- Scheduled refresh of cafe coordinates (BUILD_PLAN 11.2).
-- Google allows coordinates to be cached for 30 days, so the refresh-cafes Edge Function re-fetches
-- any cafe whose refreshed_at is older than 25 days. Place IDs are checked once a year.

-- When the Place ID was last confirmed with Google. Separate from refreshed_at, which is for coordinates.
alter table public.cafes add column place_id_checked_at timestamptz not null default now();

create index cafes_refreshed_at_idx on public.cafes (refreshed_at);
create index cafes_place_id_checked_at_idx on public.cafes (place_id_checked_at);

-- Records an ID-only Place Details check. Google may hand back a new ID for the same place.
create function public.mark_place_id_checked(p_cafe_id uuid, p_place_id text)
returns void
language sql
set search_path = public
as $$
  update public.cafes
  set google_place_id = p_place_id,
      place_id_checked_at = now()
  where id = p_cafe_id;
$$;

revoke execute on function public.mark_place_id_checked(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_place_id_checked(uuid, text) to service_role;

-- Once a day, ask the function to do a capped batch. It needs two Vault secrets, created by hand on
-- each project (see BUILD_PLAN 11.2): `project_url` (https://<ref>.supabase.co) and `cron_secret`
-- (the same value as the function secret CRON_SECRET). Without them the job does nothing.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'refresh-cafes',
  '17 3 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/refresh-cafes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret');
  $job$
);
