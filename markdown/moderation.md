# Moderation process

How reports, hidden reviews, blocks and bans work. Both app stores require a way to remove
objectionable user content and a process for acting on reports. This is that process.

**Target: act on every report within 24 hours.** The app tells people we look at reports within a day,
and the Terms of Use say so too.

## What people can do in the app

- **Report a review.** The "⋮" button on someone else's review, then Report review, then a reason
  (Spam, Offensive, Fake, Other) and optional details (up to 500 characters). One report per person per
  review. It is stored in `review_reports`. Reporters cannot read reports back, not even their own.
- **Block a person.** The same menu, then Block. It writes `user_blocks`. Their reviews and photos
  disappear for the blocker at once (row-level security). Blocked people can still see the blocker's
  reviews. Profile, then Account and password, then Blocked users, lists them with Unblock.
- **Delete their own review** from Profile, then My reviews. **Delete their account** from Profile, then
  Account and password.

## Moderators

A moderator is an account whose `app_metadata.role` is `moderator`. People cannot set their own
`app_metadata`; only the service role can. Moderators see a **Moderation** group on Profile with a
**Report queue** row and the number of reviews waiting.

**Making someone a moderator.** In Supabase Studio, then SQL Editor:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "moderator"}'
where email = '<their email>';
```

**Removing the role:**

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = '<their email>';
```

Both take effect at once: every moderation call reads the role from `auth.users`, not from the
person's token. A moderator who is banned stops being a moderator. Moderators cannot ban themselves
or another moderator.

## Daily check

1. Profile, then Report queue. The **Open** list shows one card per reported review, oldest report
   first. The age chip turns red once a report has waited more than 24 hours.
2. Open a card. The Report screen shows the whole review, the author (when they joined, how many
   reviews they have and how many are already hidden) and every report with its reason and details.
   Reporters are shown as Reporter 1, 2, 3, never by name.
3. Decide:
   - **Fine:** Dismiss. The review stays up and its reports are closed.
   - **Breaks the Terms (spam, abuse, fake, offensive):** Hide review. It disappears everywhere and its
     reports are closed.
   - **Repeat or serious offender:** Hide and ban. The person cannot sign in, and all their reviews
     are hidden.
4. Every action asks for an optional note. Write one for anything other than a plain dismiss; it is
   what you will read if the decision is ever questioned.
5. Several reports on the same review or person are a signal to act sooner.

**Undoing.** The **Hidden** list shows hidden reviews, most recent first; open one and choose Restore
review. The **Banned** list shows banned people with Unban. Unbanning lets them sign in again and
brings back the reviews the ban hid. Reviews that were hidden on their own before the ban stay hidden.

## What hiding does

Hiding sets `reviews.hidden_at`. This takes effect at once, everywhere:

- it leaves `cafe_reviews` and the cafe page;
- it stops counting in `cafe_scores` and the map's pins (scores are views over visible reviews);
- its photos, tags, beans and price stop appearing;
- the author no longer sees it in My reviews either.

Hiding keeps the data, which is useful if a report is disputed. Deleting the row is permanent; prefer
hiding.

## What banning does

The `moderate-user` Edge Function checks that the caller is a moderator, sets the auth ban
(`ban_duration: '876000h'`, effectively permanent), then calls `apply_ban`, which hides the person's
visible reviews, closes the reports on them and writes the log. Unbanning reverses both steps
(`lift_ban`). A banned account cannot sign in or refresh its session, and sees "This account is
suspended" on the sign-in screen with the contact address. A token issued before the ban still works
for up to an hour, so the database also refuses posts, edits and reports from a banned account.

## Records

Every action is written to `public.moderation_actions`: who did it, what, to which review or person,
when, the note, and the reviews a ban hid. Read it in Supabase Studio, Table Editor. If a store or a
person asks what happened, it shows every decision and when it was made. Rows stay when a moderator's
or author's account is deleted; the id on the row becomes empty.

## Without the app (fallback)

If the app is unavailable, Supabase Studio still works. Act on reports there, but note that these steps
skip the log:

- Read `review_reports`, filtered by `resolved_at is null`.
- Hide a review: `update public.reviews set hidden_at = now() where id = '<review_id>';`
- Close its reports: `update public.review_reports set resolved_at = now() where review_id = '<review_id>';`
- Ban: Authentication, then Users, then **Ban user**. Then hide their reviews:
  `update public.reviews set hidden_at = now() where user_id = '<user_id>' and hidden_at is null;`
  A ban made this way appears in the app's Banned list without a date or note, and unbanning it from the
  app restores nothing, because no ban was logged.

To remove an account and its data completely, use **Delete user** in Authentication, but first delete
their photos in Storage under `review-photos/<user_id>/`, because deleting the user row does not delete
files. The in-app Delete account does both steps.

## Not built yet

- Email or push alert when a report arrives (a database webhook or `pg_net` trigger could do it).
- Telling an author that their review was removed, and an appeal flow. People can write to the contact
  address in the Terms and Privacy Policy, which the suspended message also shows.
- Making someone a moderator from inside the app.

## Related

- Database: `supabase/migrations/20261031110000_moderation.sql`. Ban and unban:
  `supabase/functions/moderate-user`. Screens: `src/app/moderation/` and `src/features/moderation/`.
- Account deletion: `supabase/functions/delete-account`, and `decisions.md` ("Account deletion").
- Tests: `supabase/tests/13_trust_and_safety.test.sql` covers reports, blocks, hidden reviews and
  account deletion. `supabase/tests/18_moderation.test.sql` covers the moderator check, the queue,
  dismiss, hide and restore, the log, bans and unbans, and banned accounts not being able to post.
