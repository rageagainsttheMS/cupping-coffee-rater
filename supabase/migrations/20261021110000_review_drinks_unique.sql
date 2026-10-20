-- A review lists each drink once. The wizard already refuses a repeat, but the database did not, and
-- the app (keys in lists, editing a review) assumes it. Existing repeats, which only the random seed
-- data had, are collapsed to the first row before the rule is added.
delete from public.review_drinks rd
using (
  select id, row_number() over (partition by review_id, drink_id order by id) as n
  from public.review_drinks
) dup
where rd.id = dup.id and dup.n > 1;

alter table public.review_drinks
  add constraint review_drinks_review_drink_key unique (review_id, drink_id);
