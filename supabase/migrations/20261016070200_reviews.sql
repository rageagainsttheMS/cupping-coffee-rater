-- Reviews, their child tables, saved cafes, reports and blocks.
-- Rating columns use public.rating_value (1 to 5 in half-star steps).

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  visit_date date not null default current_date,
  comment text not null check (char_length(comment) between 10 and 280),
  beans text,
  verified boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, cafe_id, visit_date)
);

create index reviews_cafe_idx on public.reviews (cafe_id);
create index reviews_user_idx on public.reviews (user_id);

create table public.review_drinks (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  drink_id smallint not null references public.drinks (id),
  rating public.rating_value not null,
  milk public.milk_type,
  price_aud numeric(5, 2) check (price_aud >= 0)
);

create index review_drinks_review_idx on public.review_drinks (review_id);
create index review_drinks_drink_idx on public.review_drinks (drink_id);

-- Food, vibe and work. A null rating means "did not try".
create table public.review_ratings (
  review_id uuid not null references public.reviews (id) on delete cascade,
  metric public.metric not null check (metric <> 'coffee'),
  rating public.rating_value,
  primary key (review_id, metric)
);

create table public.review_tags (
  review_id uuid not null references public.reviews (id) on delete cascade,
  metric public.metric not null,
  tag text not null,
  primary key (review_id, metric, tag)
);

-- One photo per review in Phase 1.
create table public.review_photos (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer
);

create table public.saved_cafes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);

create type public.report_reason as enum ('spam', 'offensive', 'fake', 'other');

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (review_id, reporter_id)
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
