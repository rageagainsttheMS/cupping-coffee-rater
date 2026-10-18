export type GoogleErrorKind = "cancelled" | "in_progress" | "play_services" | "other";

type StatusCodes = {
  cancelled: string | undefined;
  inProgress: string | undefined;
  playServices: string | undefined;
};

/**
 * What went wrong in a Google sign-in. The codes are native constants that differ by platform, so
 * the caller passes in the library's `statusCodes`.
 */
export function classifyGoogleError(error: unknown, codes: StatusCodes): GoogleErrorKind {
  if (typeof error !== "object" || error === null) return "other";
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return "other";
  if (code === codes.cancelled) return "cancelled";
  if (code === codes.inProgress) return "in_progress";
  if (code === codes.playServices) return "play_services";
  return "other";
}
