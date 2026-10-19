/** Raised when the photo cannot be read or uploaded, so it is not mistaken for a network failure. */
export class PhotoUploadError extends Error {
  constructor(message = "photo_upload_failed") {
    super(message);
    this.name = "PhotoUploadError";
  }
}

export type SubmitErrorKind = "duplicate_today" | "rate_limit" | "network" | "photo" | "generic";

/**
 * Sorts a failed post into what the person should be told. Anything with no database error code
 * never reached the server, which is a connection problem: the draft is kept and they can retry.
 */
export function classifySubmitError(error: unknown): SubmitErrorKind {
  if (error instanceof PhotoUploadError) return "photo";
  if (typeof error !== "object" || error === null) return "generic";
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message : "";

  if (code === "23505") return "duplicate_today";
  if (text.includes("rate_limit_exceeded")) return "rate_limit";
  if (error instanceof TypeError || /network|fetch|timed? ?out|offline/i.test(text)) {
    return "network";
  }
  if (code === undefined || code === "") return "network";
  return "generic";
}
