# Future build

Everything in `BUILD_PLAN.md` that is not built or not done yet, collected in one place (14 Nov 2026).

## Release and operations

- [ ] **Supabase Pro plan.** Free projects pause after a week with no activity. Confirm it in the dashboard. (11.4, 12.5) **(check)**
- [ ] **In-app `AppLogo`** is still a placeholder: the coffee-cup glyph on an espresso square. (12.2)
- [ ] **Coordinate refresh gap.** A place Google can no longer find keeps its old coordinates past 30 days. Watch the `not_found` count in the `refresh-cafes` logs and decide what to do with those cafes. (11.2)

## Legal and privacy

- [ ] **Add Sentry to the Privacy Policy.** It covers crash reports, an anonymous device ID, and a rough location from the IP address. `docs-site/privacy.html` doesn't mention Sentry yet. (10.2, 12.5)
- [ ] **Turn on "Prevent Storing of IP Addresses"** in the Sentry project settings, or say in the policy that Sentry stores them. (10.2)
- [ ] **Have the Privacy Policy and Terms reviewed properly** (solicitor or a carefully edited template), including the report, block and 24-hour moderation promises in the Terms. (M12, 12.5)
- [ ] **Mention the emails the app sends** in the Privacy Policy. (Extra: Email)

## CI/CD

- [ ] **`.github/workflows/deploy-db.yml`.** On a push to `main` that touches `supabase/**`, run `supabase db push` and `supabase functions deploy`. (11.3)
- [ ] **`.github/workflows/release.yml`.** On a `v*` tag, run the EAS production build, with `--auto-submit` once that's set up. (11.3)
- [ ] **Add the Edge Function tests** to the CI `database` job. (11.3)
## Email

None of this is covered by a milestone yet. (Extra: Email)

- [ ] **Decide whether email confirmation is required** on the hosted project.
- [ ] **Custom SMTP.** Supabase's built-in email is for testing only. Options include Resend, Postmark and Amazon SES.
- [ ] **Sender domain** with SPF, DKIM and DMARC, so mail doesn't land in spam.
- [ ] **Edit the "Confirm signup" and "Reset password" templates** to use the app's name. Check that the links open the app, and say they must be opened on the same phone.
- [ ] **Review the Auth rate limits.** Add a captcha if sign-up spam appears.
- [ ] **Test sign-up and password reset on a real phone** with real inboxes, at least Gmail and Apple Mail.

## Features not built

- [ ] **Moderation alerts.** Email or notify a moderator when a report arrives, through a database webhook or `pg_net`, so the 24-hour target doesn't depend on remembering to check. (9.2, Extra: Moderation)
- [ ] **Telling people about moderation.** Tell authors when a review is removed and which rule it broke, offer a way to appeal, and optionally tell reporters their report was acted on. (Extra: Moderation)
- [ ] **Managing moderators in the app.** Today the role is set by hand in SQL. (Extra: Moderation)
- [ ] **Notifications.** Not in the design, and nothing sends them yet. (8.2)
- [ ] **Google rating on map pins or cards.** Left out on purpose until the cost is estimated. That means the cost per option, ways to cut calls, re-reading the terms, and whether it earns its cost. Record the outcome in `decisions.md`. (5.4, Extra: Google rating)

- [ ] **"What's new" release notes popup.** Show a short sheet once after an update, listing what changed. Needs a design in Product Design Ideas first. Ideas:
  - **Key the notes by a release id, not the app version.** Over-the-air updates (`eas update`) don't change `version`, because `runtimeVersion` follows the app version. A rising number (`releaseId: 7`) works for both store builds and OTA updates.
  - **Where the notes live:**
    - **In the app bundle (recommended to start).** A list in the code, with the text in the copy file like all other text. It works offline, ships with the release it describes, and an OTA update can carry new notes.
    - **In a Supabase table** (`release_notes`: id, title, body, platform, min version, published at). Notes can be fixed or added without a release, and it could show "a new version is available" to people on old builds. But it's one more query on launch and needs a way to edit the rows.
  - **When to show it:** on launch, compare the newest release id with `lastSeenReleaseId` in AsyncStorage. Show the sheet if it's newer, then save it. On a fresh install, save the current id during onboarding so new users don't see notes for features they never had. Only releases flagged as worth a popup show it; small fixes update silently.
  - **How it looks:** reuse the bottom sheet (`@gorhom/bottom-sheet`) with a title, 2 to 4 short bullets and a "Got it" button. Never show it over the review wizard or onboarding; wait until the map is showing.
  - **History:** a "What's new" row on the Help and feedback screen lists past notes.
  - **Tests:** Jest for the "should it show" rule (fresh install, upgrade, skipped releases, unflagged release).

## Phase 2 (deferred by design)

- [ ] **Full list view** of cafes. (5.5)
- [ ] **Chai and matcha (and hot chocolate) in the review wizard.** The database already has all three in `drinks`, with `counts_toward_coffee = false`, so they're kept out of the Coffee score. The wizard hides them because `wizardDrinks()` in `src/domain/reference.ts` only offers drinks that count toward Coffee. To decide first: how they're rated (a separate score or tile, or rating only with no cafe score), whether they get their own quick tags and milk options, and how they show in "What to order" on the cafe page. Then update the design doc, `wizardDrinks()`, the scoring views and their pgTAP tests. (Out of scope for Phase 1, M7.3)
- [ ] **A second language.** Copy keys are kept flat so `i18next` can be added if it's ever needed. (1.5)

- [ ] **Admin analytics, phase 2.** The admin page shows reviews, total users and sign-up dates. Still to do: record activity (last active, platform, app version) with a daily `user_activity` row, then show active users and the platform split. Sentry release health currently shows no session data, so it can't stand in for this. (14 Nov 2026 discussion)
