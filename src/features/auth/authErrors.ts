import { copy } from "@/lib/copy/en";

const errors = copy.auth.errors;

const BY_CODE: Record<string, string> = {
  invalid_credentials: errors.invalidCredentials,
  user_already_exists: errors.emailTaken,
  email_exists: errors.emailTaken,
  email_not_confirmed: errors.emailNotConfirmed,
  weak_password: errors.weakPassword,
  over_request_rate_limit: errors.rateLimited,
  over_email_send_rate_limit: errors.rateLimited,
  user_banned: errors.banned,
};

/** True when Supabase Auth refused because a moderator banned the account. */
export function isBannedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "user_banned"
  );
}

function isNetworkFailure(error: { name?: unknown; message?: unknown; status?: unknown }): boolean {
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    (typeof error.message === "string" &&
      /network request failed|failed to fetch/i.test(error.message))
  );
}

/**
 * Plain-language text for an error from Supabase Auth. The raw server message is never shown,
 * only a message from the copy file.
 */
export function authErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return errors.generic;
  const e = error as { code?: unknown; name?: unknown; message?: unknown; status?: unknown };
  if (typeof e.code === "string" && e.code in BY_CODE) return BY_CODE[e.code];
  if (isNetworkFailure(e)) return errors.network;
  return errors.generic;
}
