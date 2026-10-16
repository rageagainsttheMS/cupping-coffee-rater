# Coffee Rater — Phase 1 Build Plan

This plan takes the project from the end of [GETTING_STARTED.md](GETTING_STARTED.md) to a
feature-complete Phase 1 app that is ready for its first production build with EAS Build.

**Inputs:** _Cupping App — Product Design Ideas_ (product doc), _Cupping App — Technical Solution
Design_ (SDD) and GETTING_STARTED.md.

**Starting point.** Everything in GETTING_STARTED.md is done:

- Expo app scaffolded (strict TypeScript, Expo Router, SDD folder layout, `app.config.ts`).
- Dependencies from §4.3 installed and npm scripts in place.
- Repo on GitHub with branch protection, Dependabot, secret scanning, and CI (`app` + `database` jobs) as required checks.
- Local Supabase running with the PostGIS migration applied; hosted Supabase project (Sydney) linked.
- Three restricted Google keys, the Places key stored only in Supabase secrets, budget alert and quotas set.
- EAS linked, `eas.json` with `development` / `preview` / `production` profiles, dev build on the phone showing a Google map.
- Phase 1 GitHub Issues created.

**Finish line.** All eight Phase 1 features from the roadmap work end to end against the hosted
Supabase project, and `eas build --profile production --platform android` (and `--platform ios`
once the Apple Developer account exists) succeeds.

| Phase 1 roadmap item          | Built in |
| ----------------------------- | -------- |
| Map with 4 metric filters     | M5       |
| Cafe page and scores          | M6       |
| Review flow with drinks       | M7       |
| Sign in and onboarding        | M4       |
| Favourites (Saved tab)        | M8       |
| Google rating fallback        | M3, M6   |
| Verified visit badge          | M2, M7   |
| Report, block, delete account | M9       |

**Out of scope for Phase 1:** list view of nearby cafes, Work mode, leaderboards, busy hours,
chai and matcha in the UI, advanced moderation tools, owner tools. Don't build them, even partly.

---

## How to work through this plan

- **One milestone at a time, in order.** Later milestones depend on the schema and functions from M2 and M3.
- **One branch and PR per task** (`feat/m5-map-pins`, etc.), linked to its GitHub Issue, squash-merged once CI is green.
- **TDD on rules.** For every task marked 🧪, write the failing test first (pgTAP in `supabase/tests/`, Jest in `src/**/__tests__/`), then the code, then refactor.
- **Regenerate types** (`npm run db:types`) in the same PR as any migration, and commit `src/lib/database.types.ts`.
- **Check on the phone** before merging any screen work: `npx expo start --dev-client`.
- Rebuild the dev client (`eas build --profile development --platform android` or `npx expo run:android`) whenever a task adds a package with native code or changes `app.config.ts` plugins. Those tasks are marked 🔧.

Each milestone ends with a **Done when** check.

---

## M0 — Settle the open questions

These are open in both design docs. Each blocks a specific milestone, so decide them now and record
the answers in a `docs/decisions.md` file (one short entry per decision).

| Question                                         | Blocks             | Recommended starting answer                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prior weight toward the city average (`k`)       | M2 scoring         | `k = 5` ratings. Easy to tune later because it lives in one SQL function                                                                                                                                           |
| Recency half-life                                | M2 scoring         | 12 months. 6 months punishes cafes too fast while ratings are sparse                                                                                                                                               |
| Which score is displayed vs ranked               | M2, M5             | Display and rank the same Bayesian, recency-weighted score, so pins and order never disagree. Counts shown are raw counts                                                                                          |
| Verified-visit radius                            | M2 `submit_review` | 100 m, stored as a constant so outdoor testing (M10) can change it                                                                                                                                                 |
| Google rating fallback: field and cache duration | M3                 | `rating` and `userRatingCount` from Place Details; cache for at most the period the current Maps Platform terms allow. **Re-read the terms before M3**                                                             |
| Can cafe coordinates be stored?                  | M2 `cafes` table   | SDD plan: place ID permanently, coordinates with `refreshed_at` and a refresh job (M11). Confirm against current terms                                                                                             |
| Minimum-star filter on the map                   | M5                 | Leave out of Phase 1 (it isn't in the chosen Phase 1 screens). Low-scoring pins fade instead. Revisit after beta                                                                                                   |
| Single or combined metric tabs                   | M5                 | Single-select in Phase 1, matching the chosen map screen. Combining tabs ("show the lower score") is Phase 2                                                                                                       |
| Comment required?                                | M7                 | The product doc says required (10–280 chars) and the mockup shows "At least 10 characters", but its caption says "Short and optional". Recommend **required, 10–280**, matching the trust intent                   |
| Price and milk per drink or per review           | M2 schema          | **Per drink** (on `review_drinks`). The SDD puts price on `reviews`, but the cafe page and onboarding show a median price _per drink_, which a single review-level price can't support when a visit has two drinks |
| Fonts                                            | M1                 | A serif for headings and cafe names (e.g. Fraunces) and a sans for body (e.g. Manrope or Inter), both via `@expo-google-fonts`                                                                                     |

**Done when:** `docs/decisions.md` is committed with an answer for every row.

---

## M1 — App foundations

### 1.1 Theme tokens and fonts 🔧

- `src/lib/theme/tokens.ts`: colour tokens for light (cream background, espresso text) and dark themes.
- Metric palette, used everywhere (chips, pins, tiles, review badges): Coffee espresso brown, Food sage green, Vibe terracotta, Work slate blue. Each needs a strong (selected/pin) shade, a tint (tile background) and a text-on colour, for both themes.
- Score-band shades per metric (e.g. `< 3.5`, `3.5–4.2`, `≥ 4.3`) for pin colouring, plus a neutral grey for "Rate first" and "New".
- Spacing, radius and type-scale tokens.
- Load fonts with `expo-font` + `@expo-google-fonts/*`. Hold the splash screen (`expo-splash-screen`) until fonts are loaded.
- `useTheme()` hook driven by `useColorScheme()`, with a user override saved in AsyncStorage (wired to Profile in M8).

### 1.2 Domain constants and shared schemas 🧪

In `src/domain/` (no React imports):

- `metrics.ts`: `Metric = 'coffee' | 'food' | 'vibe' | 'work'`, labels, icons (cup, fork and knife, sparkle, laptop), review prompts.
- `tags.ts`: quick tags per metric from the product doc's rating-model table (Coffee: Strong, Smooth, Bitter, Too hot, Great milk; Food: Brunch, Pastries, Vegan options, Good value; Vibe: Quiet, Lively, Cozy, Bright, Friendly staff, Slow service; Work: Wifi, Power outlets, Laptop-friendly, No laptops at lunch, Big tables).
- `drinks.ts`: drink groups and milk options (full cream, skim, oat, soy, almond, lactose-free). The authoritative drink list lives in the database (M2); this file holds only display order and groups.
- `rating.ts` 🧪: `isValidRating(x)` (1–5 in 0.5 steps), `formatScore(score, count)` → `"4.2 (18)"` or `"New"` when `count < 3`, `scoreBand(score)`.
- `review.schema.ts` 🧪: Zod schema for a review submission (cafe ID, one or more drinks each with a rating and optional milk and price, optional food/vibe/work ratings, tags, comment 10–280 chars, optional beans, optional photo path, optional location). This is the schema the wizard and `submit_review` payload share.
- Jest tests for TDD rule 6 (3.5 accepted; 3.3 and 0 rejected) and the "New under 3 ratings" display rule.

### 1.3 Providers and the Supabase client

- `src/lib/supabase.ts`: `createClient` with AsyncStorage session persistence, `autoRefreshToken`, `detectSessionInUrl: false`, and `react-native-url-polyfill/auto`. Pause/resume token refresh on `AppState` changes.
- `src/lib/query.ts`: TanStack Query client (sensible `staleTime`, retry off for mutations). Wire `focusManager` to `AppState` and `onlineManager` to network state.
- Root `app/_layout.tsx`: `GestureHandlerRootView`, `BottomSheetModalProvider`, `QueryClientProvider`, theme provider, auth provider (stub until M4).

### 1.4 Navigation shell

- Route groups: `app/(onboarding)/…`, `app/(auth)/…`, `app/(tabs)/{map,saved,rate,profile}.tsx`, `app/cafe/[id].tsx`, `app/review/…` (modal stack, M7).
- Custom tab bar matching the mockups: Map · Saved · **+ Rate** (raised centre button) · Profile. "+ Rate" opens the review wizard modal instead of navigating to a tab screen.
- Placeholder screens for each route.
- Shared components in `src/components/`: `MetricChip`, `ScoreTile`, `StarInput` (stub), `TagChip`, `Button`, `TextField`, `Screen` (safe area + background).

**Done when:** the app opens on the phone with themed tabs and fonts in light and dark mode, and `npm test` passes the domain tests.

---

## M2 — Database schema, rules and scoring (TDD)

Every migration in this milestone starts with a failing pgTAP test. Use `npx supabase migration new
<name>`, then `npm run db:reset && npm run db:test`.

### 2.1 Core tables 🧪

Migration `core_tables`:

- `profiles` (`id` = `auth.users.id`, `display_name`, `avatar_url`, `created_at`, `accepted_terms_at`). Trigger on `auth.users` insert creates the profile from `raw_user_meta_data.display_name`.
- `cafes` (`id`, `google_place_id` unique, `location geography(Point,4326)`, `name`, `suburb`, `refreshed_at`, `created_at`). GiST index on `location`.
- `drinks` (`id`, `slug`, `name`, `drink_group` enum `espresso | brewed | iced | other`, `counts_toward_coffee bool`, `sort_order`). Seed all drinks from the product doc in the migration, including chai, matcha and hot chocolate with `counts_toward_coffee = false` (stored, hidden from the Phase 1 UI).

Tests: unique place ID; the drink seed exists; chai/matcha are flagged out.

### 2.2 Review tables and constraints 🧪

Migration `reviews`:

- `reviews` (`id uuid` (client-generated allowed), `user_id`, `cafe_id`, `visit_date date default current_date`, `comment`, `beans`, `verified bool default false`, `hidden_at`, `created_at`). **Unique (`user_id`, `cafe_id`, `visit_date`)**. Comment length check 10–280.
- `review_drinks` (`review_id`, `drink_id`, `rating`, `milk`, `price_aud numeric(5,2)`).
- `review_ratings` (`review_id`, `metric` enum `food | vibe | work`, `rating` nullable). Null = "Didn't try".
- `review_tags` (`review_id`, `metric`, `tag`).
- `review_photos` (`review_id`, `storage_path`, `width`, `height`). One per review in Phase 1 (unique on `review_id`).
- Rating check on every rating column: `rating between 1 and 5 and rating * 2 = floor(rating * 2)`.

Tests: TDD rule 6 (3.5 ok; 3.3 and 0 fail) and rule 7 (second same-day review by the same user at the same cafe fails).

### 2.3 Saved cafes, reports and blocks 🧪

Migration `social_safety`:

- `saved_cafes` (`user_id`, `cafe_id`, `saved_at`), primary key on both.
- `review_reports` (`id`, `review_id`, `reporter_id`, `reason` enum `spam | offensive | fake | other`, `details`, `created_at`, `resolved_at`). Unique (`review_id`, `reporter_id`).
- `user_blocks` (`blocker_id`, `blocked_id`, `created_at`), primary key on both, check `blocker_id <> blocked_id`.

### 2.4 Row-level security 🧪

Migration `rls`. Enable RLS on every table, then:

- `profiles`: anyone signed in can read; users update only their own row.
- `cafes`, `drinks`: signed-in read only. Writes only via `security definer` functions / service role.
- `reviews` and child tables: signed-in users read reviews where `hidden_at is null` **and** the author isn't someone they've blocked. **No direct insert**: inserts go through `submit_review`. Users may delete their own review.
- `saved_cafes`, `user_blocks`: users read/write only their own rows.
- `review_reports`: users insert their own; no one reads except the service role.

Tests: "user A cannot edit or delete user B's review"; "user A cannot read user B's saved cafes"; "a blocked user's reviews are not visible to the blocker"; "anonymous users read nothing".

### 2.5 Scoring 🧪

Migration `scoring`. Keep the whole formula in SQL so the app never computes a score.

- `scoring_constants()` immutable function returning `k`, the half-life and the minimum count (3), using the M0 decisions.
- `metric_ratings` view: one row per (cafe, metric, rating, created_at), unioning coffee ratings from `review_drinks` (only drinks with `counts_toward_coffee`) and food/vibe/work from non-null `review_ratings`. Exclude hidden reviews.
- `city_averages` view: mean rating per metric across all cafes.
- `cafe_scores` view, per cafe and metric:
  - `w = 0.5 ^ (age_days / half_life)`
  - `score = (k · city_avg + Σ w·r) / (k + Σ w)`
  - `rating_count` = raw count; `score` is null when `rating_count < 3`.
- `cafe_drink_scores` view: same formula per (cafe, drink), plus `median_price` (`percentile_cont(0.5)`) and `price_reports`.
- `cafe_top_beans` view: most-reported beans per cafe with counts.
- `cafe_tag_counts` view: tag counts per cafe and metric.

Tests (TDD rules 1–5 and 9):

1. 2 Coffee ratings → null score; 3 → a score.
2. One 5.0 does not outrank forty 4.5s.
3. A 12-month-old review weighs less than one from this week.
4. A null Food rating leaves the Food average and count unchanged.
5. Chai and matcha ratings are stored but excluded from Coffee.
6. Median price ignores a single outlier.

Start as plain views. Only add a materialised view if M10 measurements show it's needed.

### 2.6 Map and cafe queries 🧪

Migration `query_functions`:

- `cafes_in_view(min_lng, min_lat, max_lng, max_lat, metric)` → id, place ID, name, suburb, lat, lng, the chosen metric's score and count, all four scores and counts (for the swipeable card), the cafe's best drink and score ("Best here: Magic 4.8"), and `has_ratings`. Use `ST_MakeEnvelope` + `&&`. Cap at ~500 rows.
- `cafe_detail(cafe_id)` → one JSON object: cafe fields, four metric scores, drink scores (sorted, with median prices), top beans, tag counts, whether the caller has saved it.
- `cafe_reviews(cafe_id, metric default null, drink_id default null, sort 'recent', page_size, cursor)` → paged reviews with author display name, drinks, ratings, tags, photo path, verified flag. Respects blocks and `hidden_at`.
- `nearby_cafes(lat, lng, limit)` → nearest cafes with distance, for wizard step 1.
- `search_cafes(q, lat, lng)` → name/suburb `ilike` match on stored cafes, nearest first.
- `my_saved_cafes()` → saved cafes with four scores and the caller's last drink rating there ("Your last rating: Long black 4.0").

### 2.7 `submit_review` 🧪

Migration `submit_review`. `security definer`, `search_path` pinned, callable by `authenticated` only.

- Input: review UUID, cafe ID, drinks (JSON array), food/vibe/work ratings, tags, comment, beans, photo path, `lat`/`lng` (nullable).
- Validates the same rules as the Zod schema (defence in depth).
- Inserts the review and child rows in one transaction; the unique constraint enforces one per day.
- Sets `verified = true` when `ST_DWithin(cafe.location, point, radius)` with the M0 radius.
- Rate limit: reject when the user has posted more than N reviews (e.g. 10) in the past 24 hours.
- Returns the before/after scores for each rated metric, so the "Posted" screen can show "4.6 · now 42 ratings" and "New → 4.8 · your rating unlocked it".

Tests: TDD rule 8 (80 m → verified, 150 m → not; no location → not), rate limit, rejected invalid payloads, a photo path outside the user's own folder is rejected.

### 2.8 Storage 🧪

Migration `storage`:

- Bucket `review-photos`: not public, 5 MB limit, `image/jpeg` and `image/webp` only.
- Policies: authenticated users can upload/delete only under `<auth.uid()>/…`; signed-in users can read all objects (served via signed URLs or a public CDN path decision; signed URLs recommended).

### 2.9 Seed data

`supabase/seed.sql`: ~40 invented cafes around Fitzroy, Carlton and the CBD (fake place IDs), 10 users, ~300 reviews spread over 18 months covering every metric, multiple drinks per visit, prices, beans, tags, a few hidden reviews and one block. Add a second, optional `supabase/seed-perf.sql` generating ~500 cafes for the M10 performance check.

**Done when:** `npm run db:reset && npm run db:test` passes all rules 1–9 plus RLS tests, CI's `database` job is green, and `database.types.ts` is regenerated.

---

## M3 — Edge Functions: Google Places proxy

Both functions live in `supabase/functions/`, require a signed-in user's JWT, read
`GOOGLE_PLACES_KEY` from secrets, and never return the key or raw Google errors. Put shared code in
`supabase/functions/_shared/` (CORS, auth check, Places client, Zod schemas).

### 3.1 `places-search` 🧪

- Input: bounding box or centre + radius, optional text query.
- Before calling Google, count stored cafes in the area. If there are enough (e.g. ≥ 10), return early. This is the main cost control.
- Otherwise call Places API (New) Nearby Search (`includedTypes: ["cafe", "coffee_shop"]`) or Text Search for a query, with a **field mask** limited to `places.id,places.displayName,places.location,places.addressComponents`.
- Upsert into `cafes` with the service role (place ID, name, location, suburb from address components, `refreshed_at = now()`).
- Record each searched area in a `places_search_log` table (geohash/tile + timestamp) so the same area isn't searched again for N days.
- Return new cafes as "Rate first" rows.

### 3.2 `places-details` 🧪

- Input: cafe ID.
- Read from a `place_details_cache` table (`cafe_id`, `payload jsonb`, `expires_at`). If fresh, return it.
- Otherwise call Place Details with a field mask of `regularOpeningHours,currentOpeningHours,rating,userRatingCount,googleMapsUri` (plus `location,displayName` to refresh the stored cafe row) and cache it with the M0 TTL.
- Return opening hours, open-now, Google rating and count, Maps URI, and an attribution flag.

### 3.3 Tests and local run

- Jest or Deno tests with mocked `fetch`: the field mask is sent; cache hit skips Google; the early-return path skips Google; errors become a generic 502; the response never contains the key.
- Run locally with `npx supabase functions serve --env-file supabase/.env.local` and call from the app.
- Add `src/lib/places.ts` with typed `supabase.functions.invoke` wrappers and TanStack Query hooks.

**Done when:** from the dev build, panning to an empty area adds grey cafes from Google, and opening one shows its hours and Google rating, with each area/place costing at most one Places call per cache period.

---

## M4 — Sign in and onboarding

Order from the product doc: pitch first, sign-up second, location last. No guest mode.

### 4.1 Auth state and routing

- `src/features/auth/AuthProvider.tsx`: subscribes to `onAuthStateChange`, exposes `session`, `profile`, `signOut`.
- Root layout redirects:
  - no session and onboarding not seen → `(onboarding)/welcome`
  - no session → `(auth)/sign-in`
  - session but location step not done → `(onboarding)/location`
  - otherwise → `(tabs)/map`
- Store `onboardingSeen` and `locationStepDone` in AsyncStorage.

### 4.2 Onboarding screens

From the mockups: **Welcome** (pitch, four score pins on a map illustration, "Get started" / "I already have an account") → **Four scores** (one line per metric) → **Drink by drink** (sample "What to order" card) → Create account. Skip on screens 2 and 3 goes to Create account, never past it. A pager with dot indicator; static illustrations, not a live map.

### 4.3 Email sign-up and sign-in

- **Create account:** display name, email, password (≥ 8), and a required "I agree to the Terms of Use and Privacy Policy" checkbox (links from M9). `signUp` with `display_name` in user metadata; store `accepted_terms_at`.
- **Sign in:** email + password, "Forgot password?" → `resetPasswordForEmail` with a deep link (`coffeerater://reset-password`) → a set-new-password screen.
- Turn on email confirmation in the hosted project and handle the confirm deep link.
- Validate with React Hook Form + Zod; show Supabase errors in plain language.

### 4.4 Google sign-in 🔧

- Install `@react-native-google-signin/google-signin` and add its config plugin.
- Google Cloud: create OAuth clients (Web, Android with debug **and** EAS SHA-1s, iOS). Add the Web client ID and secret to Supabase Auth → Google.
- Sign in natively, then `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- First-time social users get a profile from their Google name; show the terms checkbox once if `accepted_terms_at` is null.

### 4.5 Sign in with Apple 🔧

- Required on iOS because Google sign-in is offered. Install `expo-apple-authentication`, set `ios.usesAppleSignIn: true`.
- Show the Apple button only on iOS (`AppleAuthentication.isAvailableAsync()`). Sign in with `signInWithIdToken({ provider: 'apple', token, nonce })`.
- Needs the Apple Developer account for the Services ID and key. If it isn't bought yet, build the code path now and configure the provider in M12.

### 4.6 Location step 🔧

- **Allow location** → `expo-location` foreground permission. Add `NSLocationWhenInUseUsageDescription` in `app.config.ts`.
- **Enter a suburb instead** → pick from a static list of launch suburbs with centroids in `src/domain/suburbs.ts` (CBD, Carlton, Fitzroy, plus neighbours). Save as the default map centre.
- "You can change this any time in settings" links to Profile (M8).

**Done when:** a new user can install, see onboarding once, create an account by email or Google, choose location or a suburb, and land on the map; signing out and in again skips onboarding.

---

## M5 — Map home

### 5.1 Map and data loading

- `react-native-maps` with `PROVIDER_GOOGLE`, a light custom map style matching the cream theme (and a dark style), user-location dot, and a "recentre" button.
- Initial region: the user's location, else the saved suburb.
- On `onRegionChangeComplete` (debounced ~300 ms): query `cafes_in_view` for the region and selected metric via TanStack Query (`keepPreviousData` so pins don't flash).
- If the result has few cafes, call `places-search` once for that area (M3 keeps the cost down).

### 5.2 Metric tabs

- Header "Near you" with a search button and four colour-coded tabs: Coffee (default), Food, Vibe, Work.
- Selected metric in React context (`src/features/map/MapFiltersContext.tsx`). Changing it re-labels every pin with that metric's score and colours it with that metric's band shades.

### 5.3 Pins and clustering 🧪

- Clustering with `supercluster` in `src/features/map/clusters.ts`, using `map`/`reduce` to carry the **best score** in each cluster. Jest-test the reducer (count and best score are correct; unrated cafes don't count towards best).
- Marker views:
  - rated cafe: circle with the score in the metric colour, shade by band;
  - cafe with fewer than 3 ratings for this metric: band-neutral "New" pin;
  - cafe with no community ratings: small grey dot labelled "Rate first";
  - cluster: count + best score;
  - low-scoring cafes (below the band threshold) fade (reduced opacity), they don't disappear.
- Keep marker views simple and set `tracksViewChanges={false}` after first render, so hundreds of markers stay smooth.
- Tapping a cluster zooms in; tapping a pin selects it.

### 5.4 Google rating fallback on pins

For grey "Rate first" cafes, the pin and card may show the Google rating greyed out, but only if
it's already in `place_details_cache`. Don't call Places from the map. Show "Google" attribution
next to any Google rating.

### 5.5 Swipeable cafe card

- `@gorhom/bottom-sheet` or a horizontal `FlatList` pager at the bottom showing cafes in view, ordered by the selected metric's score (nearest first for ties). Selecting a pin scrolls to its card; swiping a card highlights its pin.
- Card: photo (latest community photo or placeholder), name, suburb · distance · open status (if cached), "Best here: Magic 4.8", and four `ScoreTile`s.
- Tap → `cafe/[id]`.
- This replaces CafeRadar's list button. A full list view is Phase 2.

### 5.6 Search

- Search button opens a search screen: `search_cafes` over stored cafes as you type (debounced), then a "Search Google for '…'" row that calls `places-search` with the text query.
- Selecting a result centres the map on it and opens its card.

**Done when:** on the phone, the map opens around you, tab changes re-label pins, clusters show counts and best scores, empty areas fill with grey "Rate first" dots, and the card opens the cafe page.

---

## M6 — Cafe page

`app/cafe/[id].tsx`, data from `cafe_detail` + `places-details` + paged `cafe_reviews`.

### 6.1 Layout (top to bottom, per the mockup)

1. **Header:** back button, save (heart) button, photo grid of community photos (most recent first; placeholder when none).
2. **Name, suburb, distance, open status** ("Open till 4pm" from cached hours).
3. **Score row:** four `ScoreTile`s (score + label, "New" under 3 ratings). Tapping a tile selects it and filters the section below to that metric.
4. **Metric summary card** for the selected metric: "Work · 12 reviews", top tag chips with counts ("Wifi · 11", "Power outlets · 9"), and "Show all".
5. **What to order:** top drinks by score with count and median price ("Magic · 14 people · about $5.80 · 4.8"). Drinks with fewer than 3 ratings are listed without a score.
6. **Beans:** most-reported beans with count ("reported by 6 people").
7. **Vibe:** top vibe tags as chips with counts.
8. **Reviews:** cards with reviewer name, drink, the selected metric's rating badge, other ratings as small icons, comment, optional photo, price and a "Verified visit" badge. Filter by metric (from the tiles) or drink; sort by recent. Infinite scroll via `useInfiniteQuery`.
9. **Sticky footer:** "Directions" (opens Google Maps / Apple Maps via the cached `googleMapsUri` or `geo:` / `maps:` URL) and **"Rate this cafe"** (opens the wizard with this cafe pre-selected).

### 6.2 Google rating fallback

When a metric has no community score yet, show the Google rating **greyed out** with "Google" attribution in place of "New" on the Coffee tile, until the cafe has 3 community ratings. Never mix it into community scores.

### 6.3 Photos

- Render with `expo-image` and signed URLs (cache them in Query for less than their expiry).
- Tapping a photo opens a full-screen viewer.

### 6.4 Save

Optimistic toggle on `saved_cafes`, invalidating the Saved query.

### 6.5 Component tests 🧪

React Native Testing Library: tiles show "New" under 3 ratings; tapping a tile filters reviews; the Google fallback appears only when the community score is null; empty review state.

**Done when:** every section renders from seed data, the Google fallback shows for unrated real cafes with attribution, Directions opens a maps app, and save toggles.

---

## M7 — Review wizard

A full-screen modal stack (`app/review/`) with a progress bar, "Step N of 6", back, and close (X).
Goal: under 30 seconds with the cup still on the table.

### 7.1 Wizard state and drafts 🧪

- One React Hook Form instance over the shared Zod schema, held in a `ReviewWizardProvider`.
- Generate the review UUID at the start (`expo-crypto` `randomUUID()`).
- **Draft persistence:** on every step change and on `AppState` going to background, save the form state to AsyncStorage (`review-draft:v1`). On opening the wizard with an existing draft less than 24 hours old, offer "Continue your review of Corner Roast?" / "Start again". Clear the draft after a successful post.
- Jest tests: save/restore round-trip; stale drafts are discarded; the schema rejects a draft with no coffee rating.

### 7.2 Step 1 — Cafe

- Pre-select the nearest cafe from `nearby_cafes` using the current location ("You're here · 20 m"); list the next few nearest.
- "Search for a different cafe" uses the M5 search.
- Skipped when the wizard is opened from a cafe page.

### 7.3 Step 2 — Drink

- Grid of drink chips: the cafe's most-rated drinks first, then the user's usual drinks, then the rest under "More…". Chai, matcha and hot chocolate are hidden in Phase 1.
- Optional milk chips.
- "+ Another drink" (after step 3) loops back here for a second drink in the same visit, so steps 2–3 repeat per drink.

### 7.4 Step 3 — Coffee rating

- Header pill: "Flat white · oat · Corner Roast". Title: "How was your flat white?"
- `StarInput` 🧪: five large stars, half steps by tapping the left half of a star or dragging; big numeric readout ("4.5"); accessible as an adjustable control. Jest-test the touch-position → rating maths.
- After a rating, the Coffee quick tags appear.

### 7.5 Step 4 — Food, Vibe, Work

- Each starts on "Didn't try". Tapping expands it into a `StarInput` in that metric's colour plus its quick tags. "Skip" moves on.

### 7.6 Step 5 — Comment

- Shows the chosen ratings as pills. Multiline input, 10–280 characters, counter. The placeholder adapts to the drink and to whether Work was rated ("How was the flat white? Strength, milk, temperature… and how was it to work from?").

### 7.7 Step 6 — Details (optional) 🔧

- **Price:** AUD stepper in $0.10 steps, pre-filled with the cafe's median for that drink ("Others paid about $5.50").
- **Beans:** text input with suggestions from `cafe_top_beans` ("Others said: [Roaster] · 6").
- **Photo:** camera or gallery via `expo-image-picker` (add camera/photo-library permission strings to `app.config.ts`), resized with `expo-image-manipulator` to ~1600 px long edge, JPEG ~0.7.
- "Post review" and "Skip and post".

### 7.8 Posting

1. If location permission is granted, get a fresh position (`Accuracy.Balanced`, short timeout; post without it if it fails).
2. If there's a photo, upload to `review-photos/<user_id>/<review_id>.jpg`.
3. Call `submit_review` with the payload.
4. Handle errors in plain language: the same-day duplicate ("You've already rated Corner Roast today"), rate limit, network failure (keep the draft and offer retry). If the RPC fails after the upload, delete the orphaned photo.
5. Invalidate the map, cafe and saved queries.

### 7.9 Posted screen

"Thanks, your review is live", per-metric before → after scores from `submit_review` ("Work: New → 4.8 · your rating unlocked it"), "Verified visit badge added" when verified, one follow-up prompt (e.g. "Add work details?" if Work was skipped, which reopens step 4 and updates the review), and "See Corner Roast" / "Back to the map".

> The follow-up edit needs an `update_review_ratings(review_id, …)` function (own review, same day only). Add it with a pgTAP test in this milestone.

### 7.10 Component tests 🧪

Coffee is required to continue; "Didn't try" sends null; the comment counter blocks under 10 characters; "+ Another drink" produces two drinks in the payload; the wizard restores a draft.

**Done when:** a review with two drinks, a photo and Work tags posts from the phone in under 30 seconds, shows a verified badge when posted at a seed cafe's location, moves the scores on the map, and a review abandoned mid-way is restored after force-closing the app.

---

## M8 — Saved and Profile

### 8.1 Saved tab

- Title "Saved", filter chips: **All · N**, **Best coffee** (Coffee ≥ 4.3), **Good for work** (Work ≥ 4.3), **Open now** (only for cafes with cached hours).
- Rows: photo, name, suburb · distance · open status, four coloured score dots, heart to unsave (with undo snackbar). For cafes the user has reviewed, show "Your last rating: Long black 4.0".
- Empty state that points to the map.

### 8.2 Profile tab

- Header: display name (editable), avatar initial, member since, review count.
- **My reviews:** list of the user's reviews; delete own review.
- **Settings:** location permission status with a link to system settings, default suburb, theme (System / Light / Dark).
- **Safety:** Blocked users (list, unblock) — M9.
- **About:** Terms of Use, Privacy Policy, Contact us (email link), Google attribution notice, app version.
- **Sign out** and **Delete account** — M9.

**Done when:** saving from the map card or cafe page shows up in Saved with working filters, and every Profile row works (M9 rows may be stubs until M9).

---

## M9 — Trust, safety and store compliance

Both stores require these for user-generated content. All are Phase 1.

### 9.1 Report review 🧪

- "…" menu on every review card → "Report review" → reason sheet (Spam, Offensive, Fake, Other + optional details) → insert into `review_reports`.
- pgTAP: a user can report a review once; reporters can't read reports.

### 9.2 Moderation process

- Document the process in `docs/moderation.md`: check `review_reports` in Supabase Studio daily during beta; hide a review by setting `hidden_at` (removes it from views, scores and lists immediately); delete content or ban users with the Auth admin view if needed. Target: act on reports within 24 hours.
- Optional: a database webhook or `pg_net` trigger that emails you when a report is filed.
- pgTAP: a hidden review disappears from `cafe_reviews` and from `cafe_scores`.

### 9.3 Block user 🧪

- "…" menu on a review → "Block [name]" with confirmation. Inserts into `user_blocks`; their reviews disappear for you immediately (RLS from M2.4).
- Profile → Blocked users lists them with "Unblock".

### 9.4 Delete account 🧪

- Profile → Delete account → explain what is deleted → type "DELETE" to confirm.
- Edge Function `delete-account` (JWT required; uses the service role):
  1. delete the user's objects under `review-photos/<user_id>/`;
  2. delete their reviews (cascades to child rows), saved cafes, blocks and reports they filed;
  3. delete the profile and `auth.admin.deleteUser(id)`.
- Then sign out locally and clear AsyncStorage (drafts, settings).
- Decision recorded in `docs/decisions.md`: **delete** (not anonymise) reviews. It's simpler and clearly compliant; scores recompute automatically because they're views.
- Test the function with a seeded user: nothing remains in any table or the bucket.

### 9.5 Legal pages and contact

- Write a Privacy Policy, Terms of Use (forbidding objectionable content and stating that reports are acted on), and an **account deletion page** explaining how to delete in-app and by email (Google Play requires a web URL for this).
- Host them as static pages (e.g. GitHub Pages from a `docs-site/` folder or a separate public repo).
- Link them from Create account, Profile, and later the store listings. Publish a contact email.

**Done when:** you can report and block from a review card, a hidden review vanishes from the app and scores, and deleting an account removes all its data and photos.

---

## M10 — Hardening

### 10.1 States and errors

Every screen has loading (skeletons), empty and error states with retry. Offline: show a banner; the wizard keeps the draft. Wrap the app in an error boundary that reports to Sentry.

### 10.2 Sentry 🔧

`npx expo install @sentry/react-native`, add the config plugin, set `SENTRY_AUTH_TOKEN` as an EAS secret for source map upload, init with the DSN from an `EXPO_PUBLIC_` variable, and tag the environment (`development` / `preview` / `production`). Don't send PII.

### 10.3 Accessibility

Labels on icon buttons, pins and score tiles ("Coffee 4.6 from 42 ratings"); `StarInput` exposed as an adjustable control; touch targets ≥ 44 pt; text scaling up to 1.3× without clipping; check contrast of metric colours on tints in both themes.

### 10.4 Performance check

- Load `seed-perf.sql` (~500 cafes) and test on a mid-range Android phone: map pans stay smooth, `cafes_in_view` returns in < 200 ms (check `explain analyze`).
- If pins stutter: reduce marker complexity, tighten clustering radius, or cap results. Only add a materialised view for scores if the query is measurably slow, and record the measurement.

### 10.5 Field tests

- Verified-visit radius outdoors at several CBD cafes. Adjust the radius constant if 100 m fails, and record it in `docs/decisions.md`.
- Walk the main journeys end to end in light and dark mode: onboarding → sign-up → map → cafe → review → saved → profile → delete account.

### 10.6 Test coverage

Run `npx jest --coverage` and aim for ≥ 90% on `src/domain/` and the wizard's draft logic. No target for screens.

**Done when:** the manual journey checklist passes on the phone with no crashes in Sentry, and the performance check is recorded.

---

## M11 — Hosted environment and delivery pipeline

### 11.1 Deploy the backend

- `npx supabase db push` to the hosted project (all M2–M9 migrations).
- `npx supabase functions deploy places-search places-details delete-account`.
- Set function secrets (`GOOGLE_PLACES_KEY`) and confirm the hosted Auth settings: email confirmation on, redirect URLs (`coffeerater://*`), Google and Apple providers, password minimum 8, rate limits.
- Storage bucket and policies present (created by migration).
- **Do not run `seed.sql` against the hosted project.**

### 11.2 Real launch cafes

- Write `scripts/seed-launch-cafes.ts` that calls `places-search` over a grid covering Melbourne CBD, Carlton and Fitzroy, so the map isn't empty on day one. Run it once, watching the Places usage in Google Cloud.
- Add a scheduled refresh (Supabase cron + `places-details` or a small `refresh-cafes` function) that refreshes `cafes` rows older than the terms allow, per the M0 decision.

### 11.3 CI/CD additions

From GETTING_STARTED §8 "Add later":

- `.github/workflows/deploy-db.yml`: on push to `main` when `supabase/**` changes, run `supabase db push` and `supabase functions deploy` with `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and the project ref as Actions secrets.
- `.github/workflows/release.yml`: on tag `v*`, `eas build --platform all --profile production --non-interactive` with `EXPO_TOKEN` (add `--auto-submit` once store listings exist).
- Add the Edge Function tests to the `database` CI job.

### 11.4 Upgrade plan

Move the hosted project to **Supabase Pro** before any beta users (free projects pause after a week of inactivity). Keep the spend cap on.

**Done when:** a dev build pointed at the hosted project (via EAS `preview` environment variables) shows real launch-suburb cafes and a full review round-trip works against production data.

---

## M12 — Release prep and first EAS production build

### 12.1 App config

In `app.config.ts`:

- `name`, `slug`, `scheme: "coffeerater"`, `version: "0.1.0"`, `runtimeVersion: { policy: "appVersion" }`.
- `android.package` / `ios.bundleIdentifier` (the identifier from GETTING_STARTED §0).
- Build numbers: set `"appVersionSource": "remote"` in `eas.json` `cli` and `"autoIncrement": true` on the production profile.
- `ios.infoPlist`: `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and `ITSAppUsesNonExemptEncryption: false`.
- `android.permissions`: only what's needed (`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA`); block unneeded ones with `android.blockedPermissions`.
- `ios.usesAppleSignIn: true`; all config plugins (expo-router, expo-location, expo-image-picker, expo-font, expo-splash-screen, google-signin, apple-authentication, Sentry).
- `userInterfaceStyle: "automatic"`.

### 12.2 Assets

- App icon (1024 × 1024), Android adaptive icon (foreground + background colour), splash screen in the cream theme with the cup mark, all in `assets/`.
- Keep the placeholder name "Coffee Rater" unless the name has been chosen and checked for trademarks and store availability.

### 12.3 EAS environments

For the `production` environment (`eas env:create … --environment production`):

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` → **hosted** project.
- `GOOGLE_MAPS_ANDROID_KEY`, `GOOGLE_MAPS_IOS_KEY` (secret).
- `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (secret).
- Google sign-in client IDs.

Check `eas.json`: `production` builds an Android **app bundle** and an iOS store build with `"environment": "production"`; `preview` builds an internal APK against the hosted project.

### 12.4 Signing keys and key restrictions

- Run `eas credentials` for Android to generate the upload keystore. Add its **SHA-1** to (a) the Android Maps key restriction and (b) the Android OAuth client for Google sign-in. Without this, the production build shows a blank map and Google sign-in fails.
- After the first Play upload, also add the **Play App Signing** SHA-1 from the Play Console.
- iOS: needs the Apple Developer Program (US$99/year). EAS creates the certificates and provisioning profile on the first iOS build. Configure the Apple sign-in Services ID and key in Supabase at the same time.

### 12.5 Pre-build checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:test` all green on `main`
- [ ] `npx expo-doctor` reports no issues
- [ ] `npx expo install --check` reports no version mismatches
- [ ] No `localhost`/LAN URLs, service-role key or Places key anywhere in the app bundle (`git grep` for them)
- [ ] Hosted Supabase has every migration and function; Pro plan on
- [ ] Privacy Policy, Terms and account-deletion URLs are live
- [ ] Google attribution shown wherever Google data appears (Google rating, cafe names from Places)
- [ ] A `preview` APK against the hosted project passes the M10 journey checklist on the phone

### 12.6 First production build

```powershell
git tag v0.1.0; git push origin v0.1.0        # triggers release.yml, or run directly:
eas build --profile production --platform android
eas build --profile production --platform ios   # once the Apple Developer account exists
```

Install the Android build through a Play Console **internal testing** track (or the `preview`
APK for side-loading) and do a final smoke test: sign up, map loads with your key, post a review
with a photo, delete the test account.

**Done when:** EAS reports a successful production Android build (and iOS, if the Apple account is
active), and the smoke test passes on the phone. The app is then ready for the Play closed test
with the seed reviewers (12+ testers for 14 days) and the first TestFlight build.

---

## Phase 1 completion checklist

- [ ] M0 decisions recorded
- [ ] M1 theme, navigation shell, domain rules tested
- [ ] M2 schema, RLS, scoring, `submit_review`, storage; TDD rules 1–9 green
- [ ] M3 `places-search` and `places-details` deployed with caching and field masks
- [ ] M4 onboarding, email/Google/Apple sign-in, location step
- [ ] M5 map with metric tabs, clustered score pins, "Rate first" dots, swipeable card, search
- [ ] M6 cafe page with scores, what to order, beans, price, reviews, Google fallback
- [ ] M7 six-step review wizard with drafts, photos, verified badge, posted screen
- [ ] M8 Saved tab and Profile
- [ ] M9 report, block, delete account, legal pages, moderation process
- [ ] M10 states, Sentry, accessibility, performance and outdoor tests
- [ ] M11 hosted backend, launch cafes, deploy and release workflows
- [ ] M12 app config, assets, credentials, first EAS production build
