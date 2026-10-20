export const REPORT_REASONS = ["spam", "offensive", "fake", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_DETAILS_MAX = 500;

export type ReportErrorKind = "already_reported" | "network" | "generic";

/**
 * Sorts a failed report into what the person should be told. A second report of the same review
 * breaks the table's uniqueness rule (code 23505), which is not an error from their point of view.
 */
export function classifyReportError(error: unknown): ReportErrorKind {
  if (typeof error !== "object" || error === null) return "generic";
  const { code } = error as { code?: unknown };
  if (code === "23505") return "already_reported";
  if (code === undefined || code === "") return "network";
  return "generic";
}
