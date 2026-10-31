import { copy } from "@/lib/copy/en";

const HOUR_MS = 60 * 60 * 1000;

/** The 24-hour target for acting on a report. */
export const REPORT_TARGET_HOURS = 24;

/** The longest note a moderator can leave on an action. Matches the database check. */
export const MODERATION_NOTE_MAX = 500;

/** "now", "6 h", "3 d": how long ago, short enough for a chip. Under two days it counts hours. */
export function shortAge(isoTimestamp: string, now: Date): string {
  const hours = Math.max(
    0,
    Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / HOUR_MS),
  );
  if (hours === 0) return copy.moderation.age.now;
  if (hours < 48) return copy.moderation.age.hours(hours);
  return copy.moderation.age.days(Math.floor(hours / 24));
}

/** True once a report has waited longer than the 24-hour target. */
export function isOverdue(isoTimestamp: string, now: Date): boolean {
  return now.getTime() - new Date(isoTimestamp).getTime() > REPORT_TARGET_HOURS * HOUR_MS;
}
