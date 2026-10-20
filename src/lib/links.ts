import { Linking } from "react-native";

/**
 * Where the Terms of Use and Privacy Policy live. Both are hosted as static pages in M9.5, so these
 * are empty until then and the links do nothing yet. Fill them in when the pages are live.
 */
export const LEGAL_URLS: { terms: string | null; privacy: string | null } = {
  terms: null,
  privacy: null,
};

/** The published contact address (M9.5). Empty until then, and the Help screen hides the row. */
export const CONTACT_EMAIL: string | null = null;

export function openLegal(page: keyof typeof LEGAL_URLS): void {
  const url = LEGAL_URLS[page];
  if (url) void Linking.openURL(url);
}
