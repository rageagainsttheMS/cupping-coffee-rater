# Coffee Rater — Getting Started

The first steps to go from two design docs to a running Phase 1 project. It follows the
Technical Solution Design (SDD): Expo + TypeScript app, Supabase backend, Google Maps
Platform, GitHub + EAS. It assumes Windows, one Android phone and no Mac.

Work through the sections in order. Each ends with a **Done when** check.

---

## 0. Decisions to lock in first

These are expensive to change later, so pick them before creating anything.

| Decision       | Recommendation                                                          | Why it matters now                                                       |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| App identifier | `com.<yourname>.coffeerater` for both Android package and iOS bundle ID | API key restrictions, store listings and signing keys are all tied to it |

App identifier is com.williamw.cupping

| Repo name | `cupping-coffee-rater` | Matches the SDD layout |
| Expo SDK | Newest stable at project start (SDK 56 at time of writing) | Upgrading early is cheap, mid-project is not |

Will use SDK 56

| Package manager | npm (simplest with Expo and EAS) | CI cache and lockfile |
| Supabase region | Sydney (`ap-southeast-2`) | Users are in Melbourne; can't move a project's region later |

Will use NPM

Supabase region will be sydney

The app name can stay "Coffee Rater" as a placeholder. Only the identifier above is hard to change.

---

## 1. Accounts

Create the free accounts now. Leave the paid ones until the stage that needs them.

### Needed now (free)

| Account             | Used for                                | Setup notes                                                                             |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| **GitHub**          | Repo, Actions, Issues                   | Turn on 2FA                                                                             |
| **Expo** (expo.dev) | EAS Build, Submit, Updates              | Free tier: 15 Android + 15 iOS builds a month                                           |
| **Supabase**        | Database, Auth, Storage, Edge Functions | Free tier for the build phase. Free projects pause after a week of inactivity           |
| **Google Cloud**    | Maps SDK keys, Places API (New)         | New accounts get US$300 trial credit. **Set a budget alert on day one** (see section 5) |
| **Sentry**          | Crash reporting                         | Free tier; you can wire it up later, before the closed beta                             |

STEP COMPLETED

### Needed later (paid)

| Account                 | Cost                | When                                                                                                                                                                |
| ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Pro            | ~US$25/month        | Before the closed beta                                                                                                                                              |
| Google Play Console     | US$25 once          | Before the Android closed beta. New personal accounts need a closed test with **12+ testers for 14 days** before going public, so don't leave it to the last minute |
| Apple Developer Program | US$99/year          | Before the first TestFlight build (target: end of the map milestone)                                                                                                |
| Expo EAS Starter        | US$19/month + usage | Only if the free build queue gets painful                                                                                                                           |

**Done when:** you can sign in to GitHub, Expo, Supabase and Google Cloud.

---

## 2. Tools on the development machine

Install with `winget` from PowerShell where possible.

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.cli
winget install Microsoft.VisualStudioCode
winget install Google.AndroidStudio
winget install Docker.DockerDesktop
winget install DenoLand.Deno        # optional, for Edge Function editor support
```

Then:

1. **Android Studio**: open it once and finish the setup wizard. In SDK Manager, install the latest
   Android SDK Platform, Platform-Tools and an emulator image. Set environment variables:
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` to `PATH`
   - `JAVA_HOME` = Android Studio's bundled JDK (`C:\Program Files\Android\Android Studio\jbr`)
2. **Docker Desktop**: enable the WSL 2 backend and make sure Docker is running before you use
   Supabase locally.
3. **EAS CLI**: `npm install -g eas-cli`
4. **Supabase CLI**: install it per project as a dev dependency (section 4). You run it with
   `npx supabase`. A global npm install isn't supported.
5. **GitHub CLI**: `gh auth login`
6. **VS Code extensions**: ESLint, Prettier, Expo Tools, Deno, PostgreSQL, GitHub Pull Requests.
7. **Postgres client** (optional): Supabase Studio at `http://localhost:54323` is enough to start.
   TablePlus or DBeaver are alternatives.

Check everything is on the path:

```powershell
node -v; npm -v; git --version; gh --version; adb --version; docker --version; eas --version
```

**Done when:** every command above prints a version.

---

## 3. Android phone

1. Turn on **Developer options**: Settings → About phone → tap _Build number_ 7 times.
2. Turn on **USB debugging** in Developer options.
3. Plug in the phone, accept the prompt, then run `adb devices`. The phone should be listed as `device`.
4. Install **Expo Go** from the Play Store for the first few weeks. Move to a development build
   (section 7) once Google Maps keys or other native config are needed.

**Done when:** `adb devices` lists the phone.

---

## 4. Repository and project setup

### 4.1 Create the Expo app

From `C:\Development\CoffeeRater`:

```powershell
npx create-expo-app@latest . --template default
npm run reset-project   # removes the example screens, if the template provides it
```

The default template comes with TypeScript and Expo Router. Turn on strict mode in `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } }
}
```

### 4.2 Create the folder layout from the SDD

```
app/                  Expo Router screens: (tabs)/map, saved, rate, profile; cafe/[id]
src/
  components/         ScoreTile, MetricTabs, StarInput
  features/           map, cafe, review-wizard, auth, saved
  domain/             pure TS rules + Zod schemas (no React imports)
  lib/                supabase client, query hooks, theme tokens
supabase/
  migrations/
  functions/          places-search, places-details, delete-account
  tests/              pgTAP tests
  seed.sql
.github/workflows/
```

Rename `app.json` to `app.config.ts` so you can read keys from environment variables.

### 4.3 Install dependencies

Use `npx expo install` for anything with native code, so versions match the SDK:

```powershell
# Native / Expo-managed
npx expo install react-native-maps expo-location expo-image-picker expo-image-manipulator expo-image `
  @react-native-async-storage/async-storage @gorhom/bottom-sheet react-native-reanimated `
  react-native-gesture-handler expo-dev-client expo-secure-store react-native-url-polyfill

# Plain JS
npm install @supabase/supabase-js @tanstack/react-query react-hook-form zod @hookform/resolvers supercluster

# Dev tooling
npm install -D supabase jest jest-expo @testing-library/react-native @types/jest @types/supercluster prettier
npx expo lint   # first run sets up ESLint with Expo's config
```

Add scripts to `package.json`:

```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "lint": "expo lint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "db:start": "supabase start",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db",
  "db:types": "supabase gen types typescript --local > src/lib/database.types.ts"
},
"jest": { "preset": "jest-expo" }
```

### 4.4 Environment variables

Create `.env.local` (never commit it) and make sure `.gitignore` covers `.env*.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://<your-LAN-IP>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from `npx supabase status`>
GOOGLE_MAPS_ANDROID_KEY=<section 5>
GOOGLE_MAPS_IOS_KEY=<section 5>
```

Use your PC's LAN IP, not `localhost`, so the phone can reach local Supabase. Only the anon
(publishable) key ever goes in the app. **The service role key and the Places API key never do.**

### 4.5 Push to GitHub

```powershell
git init -b main
git add .
git commit -m "Scaffold Expo app"
gh repo create coffee-rater --private --source . --push
```

Then on GitHub:

- **Branch protection on `main`**: require a PR, require status checks (after CI exists, section 6),
  no direct pushes, squash merges only.
- **Settings → Code security**: turn on Dependabot alerts and security updates, secret scanning and
  push protection.
- Add `.github/dependabot.yml` for `npm` and `github-actions`, weekly.
- **Issues**: one issue per Phase 1 feature (see section 8).

**Done when:** `npx expo start` opens the app on the phone through Expo Go, and the repo is on GitHub.

---

## 5. Google Cloud and Maps Platform

1. Create a project called `coffee-rater`.
2. **Billing → Budgets & alerts**: set a monthly budget (for example US$20) with alerts at 50%, 90%
   and 100%. Do this before you enable any API.
3. Enable these APIs: **Maps SDK for Android**, **Maps SDK for iOS**, **Places API (New)**.
4. Create **three separate API keys**:

| Key               | Restriction                                                                              | Where it lives                                        |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Android Maps key  | Android apps: your package name + SHA-1 fingerprints (debug keystore and EAS upload key) | EAS env var, read in `app.config.ts`                  |
| iOS Maps key      | iOS apps: your bundle ID                                                                 | EAS env var, read in `app.config.ts`                  |
| Places server key | API restriction: Places API (New) only                                                   | `npx supabase secrets set GOOGLE_PLACES_KEY=...` only |

5. **Quotas**: in APIs & Services → Places API (New) → Quotas, set a low per-day cap on each search
   and details method. Raise it only when you need to.

To get the SHA-1 fingerprints, run `eas credentials` (for EAS-built apps) and
`keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android`
(for local builds).

**Before building the `cafes` table**, re-read the current Google Maps Platform terms on what can
be stored. The SDD plan is: store place ID permanently, plus coordinates with `refreshed_at` and a refresh job.

**Done when:** three restricted keys exist and a budget alert is set.

---

## 6. Supabase

### 6.1 Local stack

```powershell
npx supabase init          # creates supabase/config.toml
npx supabase start         # needs Docker running; prints local URL and keys
```

Studio is at `http://localhost:54323`.

### 6.2 First migration

```powershell
npx supabase migration new init_extensions
```

```sql
-- supabase/migrations/<timestamp>_init_extensions.sql
create extension if not exists postgis with schema extensions;
```

pgTAP tests turn on the `pgtap` extension themselves (`begin; create extension if not exists pgtap; ...`).

Next migrations, each with its pgTAP tests written **first** (see section 9):

1. `profiles`, `cafes` (PostGIS point + `google_place_id` unique), `drinks` (seeded)
2. `reviews` (unique on user + cafe + visit date), `review_drinks`, `review_ratings`, `review_tags`, `review_photos`
3. `saved_cafes`
4. Row-level security on every table
5. Rating check constraint: `rating between 1 and 5 and rating * 2 = floor(rating * 2)`
6. Scoring view, `cafes_in_view` function, `submit_review` function
7. Storage bucket `review-photos` with size limit and per-user path policy

Put invented Fitzroy/Carlton cafes, users and reviews in `supabase/seed.sql`. Then:

```powershell
npx supabase db reset      # reapplies migrations and seed
npx supabase test db       # runs supabase/tests/*.sql
npm run db:types           # regenerates TypeScript types
```

### 6.3 Hosted project

1. Create a project in the Supabase dashboard (Sydney region; save the DB password in a password manager).
2. Link it and push migrations:
   ```powershell
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. **Auth → Providers**: turn on Email now. Add Google and Apple when you build sign-in (Apple needs
   the Apple Developer account).
4. Keep the spend cap on.

**Done when:** `npx supabase test db` passes locally and the hosted project has the migrations.

---

## 7. EAS and development builds

```powershell
eas login
eas init                   # links the project to your Expo account
eas build:configure        # creates eas.json
```

In `eas.json`, keep the three standard profiles: `development` (dev client, internal), `preview`
(internal APK) and `production`.

Add secrets as EAS environment variables (not in the repo):

```powershell
eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment development --environment preview --environment production --visibility secret
```

Read them in `app.config.ts`:

```ts
export default {
  expo: {
    name: "Coffee Rater",
    slug: "coffee-rater",
    scheme: "coffeerater",
    android: {
      package: "com.<yourname>.coffeerater",
      config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } },
    },
    ios: {
      bundleIdentifier: "com.<yourname>.coffeerater",
      config: { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY },
    },
    plugins: ["expo-router", "expo-location", "expo-image-picker"],
  },
};
```

Build a development client once Maps needs your own key:

```powershell
eas build --profile development --platform android   # cloud build; install the APK on the phone
# or locally:
npx expo run:android
```

Then `npx expo start --dev-client` for day-to-day work.

**Done when:** the dev build is on the phone and shows a Google map.

---

## 8. CI with GitHub Actions

`.github/workflows/ci.yml`, run on every pull request:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm test -- --ci

  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase db start
      - run: supabase test db
```

The SDD runs the database job only when `supabase/` changes. If you add a `paths` filter, don't mark
that job as a required check, or PRs without database changes will wait on it forever. Running it
every time is simpler while the repo is small.

Add later, once the hosted project is in use:

- **Merge to `main`**: `supabase db push` using `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and
  the project ref as GitHub Actions secrets.
- **Version tag (`v*`)**: `eas build --platform all --profile production --auto-submit` using an
  `EXPO_TOKEN` secret.

Once CI is green, add `app` and `database` as required status checks in branch protection.

**Done when:** a test PR shows both jobs passing.