-- Core tables: profiles, cafes, drinks (seeded) plus shared enums and the rating domain.

create type public.metric as enum ('coffee', 'food', 'vibe', 'work');
create type public.drink_group as enum ('espresso', 'brewed', 'iced', 'other');
create type public.milk_type as enum ('full_cream', 'skim', 'oat', 'soy', 'almond', 'lactose_free');

-- A rating is 1 to 5 in half-star steps. Null passes (used for "did not try").
create domain public.rating_value as numeric
  check (value between 1 and 5 and value * 2 = floor(value * 2));

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Coffee lover',
  avatar_url text,
  created_at timestamptz not null default now(),
  accepted_terms_at timestamptz
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Coffee lover')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  location extensions.geography (point, 4326) not null,
  name text not null,
  suburb text,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index cafes_location_idx on public.cafes using gist (location);

create table public.drinks (
  id smallint primary key generated always as identity,
  slug text not null unique,
  name text not null,
  drink_group public.drink_group not null,
  counts_toward_coffee boolean not null default true,
  sort_order smallint not null
);

insert into public.drinks (slug, name, drink_group, counts_toward_coffee, sort_order) values
  ('espresso', 'Espresso', 'espresso', true, 1),
  ('ristretto', 'Ristretto', 'espresso', true, 2),
  ('long_black', 'Long black', 'espresso', true, 3),
  ('americano', 'Americano', 'espresso', true, 4),
  ('piccolo', 'Piccolo', 'espresso', true, 5),
  ('macchiato', 'Macchiato', 'espresso', true, 6),
  ('cortado', 'Cortado', 'espresso', true, 7),
  ('magic', 'Magic', 'espresso', true, 8),
  ('flat_white', 'Flat white', 'espresso', true, 9),
  ('latte', 'Latte', 'espresso', true, 10),
  ('cappuccino', 'Cappuccino', 'espresso', true, 11),
  ('mocha', 'Mocha', 'espresso', true, 12),
  ('batch_brew', 'Batch brew', 'brewed', true, 13),
  ('pour_over', 'Pour over', 'brewed', true, 14),
  ('cold_brew', 'Cold brew', 'brewed', true, 15),
  ('iced_latte', 'Iced latte', 'iced', true, 16),
  ('iced_long_black', 'Iced long black', 'iced', true, 17),
  ('espresso_tonic', 'Espresso tonic', 'iced', true, 18),
  ('chai', 'Chai', 'other', false, 19),
  ('matcha', 'Matcha', 'other', false, 20),
  ('hot_chocolate', 'Hot chocolate', 'other', false, 21);
