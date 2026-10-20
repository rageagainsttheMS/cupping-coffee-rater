# Moderation process

How reports, hidden reviews, blocks and bans work in Phase 1. Both app stores require a way to remove
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

## Daily check during beta

1. Open Supabase Studio, then Table Editor, then `review_reports`. Filter `resolved_at is null`, newest first.
2. For each report, read the review: `select * from public.reviews where id = '<review_id>'`, and the
   reason and details on the report.
3. Decide:
   - **Fine:** set the report's `resolved_at = now()`. Nothing else changes.
   - **Breaks the Terms (spam, abuse, fake, offensive):** hide the review (below), then set
     `resolved_at = now()` on every report for that review.
   - **Repeat or serious offender:** hide their reviews and ban the account (below).
4. Several reports on the same review or person are a signal to act sooner.

## Hiding a review

```sql
update public.reviews set hidden_at = now() where id = '<review_id>';
```

This takes effect at once, everywhere:

- it leaves `cafe_reviews` and the cafe page;
- it stops counting in `cafe_scores` and the map's pins (scores are views over visible reviews);
- its photo, tags, beans and price stop appearing;
- the author no longer sees it in My reviews either.

To undo, set `hidden_at = null`. Hiding keeps the data, which is useful if a report is disputed.
Deleting the row is permanent; prefer hiding.

## Hiding everything a person wrote

```sql
update public.reviews set hidden_at = now() where user_id = '<user_id>' and hidden_at is null;
```

## Banning an account

In Supabase Studio, then Authentication, then Users, find the user and choose **Ban user** (or run
`auth.admin.updateUserById(id, { ban_duration: '876000h' })` with the service role). A banned account
cannot sign in or refresh its session. Then hide their reviews as above. To remove the account and its
data completely, use **Delete user** in the same place, but first delete their photos in Storage under
`review-photos/<user_id>/`, because deleting the user row does not delete files. The in-app Delete account
does both steps.

## Records

When you hide or ban, note the date, the review or user id and the reason in a private log (a
spreadsheet is enough). If a store or a person asks what happened, you can show that every report was
looked at and when.

## Not built in Phase 1

- Email or push alert when a report arrives (a database webhook or `pg_net` trigger could do it).
- A moderation screen inside the app. Supabase Studio is the admin view.
- Appeals. People can write to the contact address in the Terms and Privacy Policy.

## Related

- Account deletion: `supabase/functions/delete-account`, and `decisions.md` ("Account deletion").
- Tests: `supabase/tests/13_trust_and_safety.test.sql` covers one report per review, reporters not being
  able to read reports, blocks, hidden reviews leaving the list and the scores, and a deleted account
  leaving nothing behind.
