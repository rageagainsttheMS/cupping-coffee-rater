-- Profile creation at sign-up.
-- Email sign-up sends the display name and the terms agreement as user metadata, so the agreement is
-- recorded even when email confirmation means there is no session yet. Social sign-ins send the
-- person's name as full_name (or name) and nothing about terms, so those users are asked once in the app.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(
    coalesce(
      nullif(trim(v_meta ->> 'display_name'), ''),
      nullif(trim(v_meta ->> 'full_name'), ''),
      nullif(trim(v_meta ->> 'name'), ''),
      'Coffee lover'
    ),
    40
  );
begin
  insert into public.profiles (id, display_name, accepted_terms_at)
  values (
    new.id,
    v_name,
    case when v_meta ->> 'accepted_terms' = 'true' then now() end
  );
  return new;
end;
$$;
