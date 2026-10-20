-- The caller's own reviews with the cafe, drinks, ratings and photo, for the Profile tab's My reviews.
-- Runs as the caller, so row-level security applies (hidden reviews are not returned).
create function public.my_reviews()
returns table (
  review_id uuid,
  cafe_id uuid,
  cafe_name text,
  suburb text,
  visit_date date,
  created_at timestamptz,
  comment text,
  beans text,
  verified boolean,
  drinks jsonb,
  ratings jsonb,
  photo_path text,
  photo_width integer,
  photo_height integer
)
language sql
stable
set search_path = public, extensions
as $$
  select r.id, c.id, c.name, c.suburb, r.visit_date, r.created_at, r.comment, r.beans, r.verified,
         coalesce((
           select jsonb_agg(
                    jsonb_build_object('drink_id', d.id, 'name', d.name, 'rating', rd.rating,
                                       'milk', rd.milk, 'price_aud', rd.price_aud)
                    order by rd.rating desc, d.name)
           from public.review_drinks rd
           join public.drinks d on d.id = rd.drink_id
           where rd.review_id = r.id
         ), '[]'::jsonb),
         coalesce((
           select jsonb_object_agg(rr.metric::text, rr.rating)
           from public.review_ratings rr
           where rr.review_id = r.id and rr.rating is not null
         ), '{}'::jsonb),
         ph.storage_path, ph.width, ph.height
  from public.reviews r
  join public.cafes c on c.id = r.cafe_id
  left join public.review_photos ph on ph.review_id = r.id
  where r.user_id = (select auth.uid())
  order by r.created_at desc, r.id desc;
$$;

revoke execute on function public.my_reviews() from public, anon;
grant execute on function public.my_reviews() to authenticated;
