/** What an auth deep link (`coffeerater://reset-password?code=…`) carries. */
export type AuthLink = {
  kind: "recovery" | "callback" | "unknown";
  /** PKCE code to exchange for a session. */
  code?: string;
  /** Tokens, when the link carries them in the fragment instead of a code. */
  accessToken?: string;
  refreshToken?: string;
  error?: string;
};

const LINK = /^coffeerater:\/{2,3}([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i;

function params(...parts: (string | undefined)[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split("&")) {
      const [rawKey, rawValue = ""] = pair.split("=");
      try {
        found[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, " "));
      } catch {
        // A malformed escape: skip this parameter.
      }
    }
  }
  return found;
}

/** Reads a deep link. Anything that is not an auth link comes back as `unknown`. */
export function parseAuthLink(url: string): AuthLink {
  const match = LINK.exec(url);
  if (!match) return { kind: "unknown" };

  const path = match[1].replace(/^\/+|\/+$/g, "");
  const kind =
    path === "reset-password" ? "recovery" : path === "auth-callback" ? "callback" : null;
  if (!kind) return { kind: "unknown" };

  const p = params(match[2], match[3]);
  const link: AuthLink = { kind };
  if (p.code) link.code = p.code;
  if (p.access_token && p.refresh_token) {
    link.accessToken = p.access_token;
    link.refreshToken = p.refresh_token;
  }
  const error = p.error_description ?? p.error;
  if (error) link.error = error;
  return link;
}
