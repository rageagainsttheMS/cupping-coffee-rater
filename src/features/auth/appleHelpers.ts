import { DISPLAY_NAME_MAX } from "./schemas";

type AppleFullName = {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
};

/**
 * The person's name as Apple reports it, for the profile's display name. Apple only sends it the
 * first time someone signs in, so `null` is normal after that.
 */
export function formatAppleName(fullName: AppleFullName | null | undefined): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.middleName, fullName.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(" ").slice(0, DISPLAY_NAME_MAX) : null;
}

/** True when the person closed the Apple sheet. That is not an error worth showing. */
export function isAppleCancel(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ERR_REQUEST_CANCELED"
  );
}
