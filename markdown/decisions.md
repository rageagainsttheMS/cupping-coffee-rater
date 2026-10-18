# Coffee Rater — Decisions

One short entry per decision. Source: BUILD_PLAN.md, M0. Status is **Decided** unless marked **Provisional**.

## Scoring

### Prior weight toward the city average (`k`)

**Decided: `k = 5` ratings.** Lives in `scoring_constants()`, so it is a one-line change to tune.

### Recency half-life

**Decided: 12 months (365 days).** 6 months punishes cafes too fast while ratings are sparse. Also in `scoring_constants()`.

### Displayed vs ranked score

**Decided: one score for both.** The Bayesian, recency-weighted score is displayed and used to rank, so pins and order never disagree. Counts shown are raw counts. Scores are null below 3 ratings (shown as "New").

### Verified-visit radius

**Decided: 100 m.** Stored as the constant `verified_radius_m()` so outdoor testing (M10) can change it. Record any change here.

## Google Maps Platform

### Google rating fallback: field and cache duration

**Decided (conservative), checked 2026-10-18 against the current Service Specific Terms (last modified 14 Oct 2026).** Use `rating` and `userRatingCount` from Place Details. Section 14.3 (Places API, Legacy and New) gives a caching exception only for lat/lng (up to 30 consecutive calendar days), and section A.3 plus the Place IDs page exempt place IDs. There is no exception for ratings, rating counts or opening hours, and the Places policies page says not to "pre-fetch, cache, or store Places API content beyond the allowed exceptions". The general no-caching rule itself sits in the Maps Platform Terms of Service (§3.2.3(b)), which I have not read.

So:

- `place_details_cache` must **not** persist `rating`, `userRatingCount` or opening hours in the database. `places-details` fetches them live per request.
- The app may hold them only in short-lived in-memory TanStack Query cache (minutes, not days).
- **Chosen: Google rating and hours appear on the cafe page only**, fetched live through `places-details`. Map pins and cards for unrated cafes show "Rate first" with no Google rating (M5.4 dropped), and the Saved tab has no "Open now" filter or open status (M8.1). The cafe page shows "Open till 4pm" and the greyed Google rating with attribution (M6.1, M6.2) from the live call.
- Attribution: show the Google logo/"Google" wherever Google data appears. Maps Platform requires results from Places on a Google Map to carry attribution.

Also in the current terms: §14.2 says Places content must not be used with a non-Google map (fine: the app uses Google Maps), and §A.2 requires attribution per the Documentation. Re-check the terms before the production build (M12), since they change (about every few months).

### Storing cafe coordinates

**Decided, checked 2026-10-18 (Service Specific Terms §14.3).** Store `google_place_id` permanently (exempt from caching limits). Coordinates may be cached for **at most 30 consecutive calendar days, after which they must be deleted**, so `cafes.location` needs a refresh job that re-fetches lat/lng for rows with `refreshed_at` older than 30 days (use a 25-day threshold for margin). Place IDs older than 12 months should be refreshed with an ID-only Place Details request (free).

Open question: cafe `name` and `suburb` are also Places content, with no stated exception. Treat them like coordinates: refresh on the same 30-day cycle. Review before M3 whether to store them at all.

## Product

### Minimum-star filter on the map

**Decided: leave out of Phase 1.** It isn't in the chosen Phase 1 screens. Low-scoring pins fade instead. Revisit after beta.

### Single or combined metric tabs

**Decided: single-select.** Matches the chosen map screen. Combined tabs ("show the lower score") are Phase 2.

### Comment required?

**Decided: required, 10–280 characters.** The product doc says required and the mockup says "At least 10 characters", but one caption says "Short and optional". Required matches the trust intent.

### Price and milk: per drink or per review

**Decided: per drink**, on `review_drinks`. The SDD puts price on `reviews`, but the cafe page and onboarding show a median price per drink, which a review-level price can't support when a visit has two drinks.

### Account deletion

**Decided: delete, not anonymise.** Deleting an account removes its reviews, photos, saved cafes, blocks and reports. Simpler and clearly compliant. Scores recompute automatically because they are views.

## Design

### Fonts

**Decided:** a serif for headings and cafe names (Fraunces) and a sans for body (Manrope), both via `@expo-google-fonts`. Swap Manrope for Inter if it renders poorly on the phone.

## Maintainability

### Tags and drinks

**Decided: database reference data, referenced by ID.** Quick tags move from `src/domain/tags.ts` to a `tags` table with an `active` flag, and `review_tags` stores `tag_id` instead of label text. Renaming a tag keeps its history and counts, and retiring one hides it from the wizard without losing old reviews. The app reads the lists through a cached query (M1.5). The four metrics stay a closed set in code and the schema.

### User-facing text

**Decided: one typed copy file, `src/lib/copy/en.ts`.** All screen text, accessibility labels, placeholders and error messages live there, with functions for text that takes values. An ESLint rule blocks hardcoded text in `src/app` and `src/components`. No i18n library in Phase 1 (English only); the structure allows adding one later.
