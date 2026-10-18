-- Optional extra data for the M10 performance check: about 500 more invented cafes across inner
-- Melbourne, and a few thousand reviews so scores and the map query have real work to do.
-- Run it after a normal `npm run db:reset` (it needs the 10 users from seed.sql):
--   docker exec -i supabase_db_Cupping psql -U postgres -d postgres < supabase/seed-perf.sql
-- Not loaded by `db reset`. Never run against the hosted project.

select setseed(0.77);

insert into public.cafes (id, google_place_id, name, suburb, location)
select ('30000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'perf_place_' || g,
       'Perf Cafe ' || g,
       (array['Fitzroy', 'Carlton', 'Melbourne', 'Collingwood', 'Richmond', 'Brunswick', 'Northcote'])[1 + g % 7],
       st_setsrid(st_makepoint(144.90 + random() * 0.15, -37.90 + random() * 0.15), 4326)::geography
from generate_series(1, 500) g
on conflict (google_place_id) do nothing;

-- About 4,000 attempted reviews on the new cafes, spread over 18 months.
insert into public.reviews (user_id, cafe_id, visit_date, comment, verified, created_at)
select ('00000000-0000-4000-8000-' || lpad((1 + floor(random() * 10))::int::text, 12, '0'))::uuid,
       ('30000000-0000-4000-8000-' || lpad((1 + floor(random() * 500))::int::text, 12, '0'))::uuid,
       d.day,
       'Performance test review number ' || d.g || '.',
       random() < 0.3,
       d.day + time '09:00'
from (select g, current_date - floor(random() * 540)::int as day from generate_series(1, 4000) g) d
on conflict (user_id, cafe_id, visit_date) do nothing;

insert into public.review_drinks (review_id, drink_id, rating, milk, price_aud)
select r.id,
       1 + floor(random() * 18)::int,
       least(5, greatest(1, round((3.9 + (random() + random() + random() - 1.5)) * 2) / 2)),
       case when random() < 0.7 then (enum_range(null::public.milk_type))[1 + floor(random() * 6)::int] end,
       round((4 + random() * 2.5)::numeric, 1)
from public.reviews r
where r.comment like 'Performance test review%';

insert into public.review_ratings (review_id, metric, rating)
select r.id, m.metric,
       least(5, greatest(1, round((3.8 + (random() + random() + random() - 1.5)) * 2) / 2))
from public.reviews r
cross join (values ('food'::public.metric), ('vibe'), ('work')) as m (metric)
where r.comment like 'Performance test review%' and random() < 0.5;
