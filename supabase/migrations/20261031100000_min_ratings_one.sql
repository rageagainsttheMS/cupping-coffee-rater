-- A metric now shows a score from its first rating (was 3). The Bayesian shrinkage toward the city
-- average (k = 5) keeps a lone rating from reading as an extreme score.
create or replace function public.scoring_constants()
returns table (k numeric, half_life_days numeric, min_count integer)
language sql
immutable
as $$
  select 5::numeric, 365::numeric, 1;
$$;
