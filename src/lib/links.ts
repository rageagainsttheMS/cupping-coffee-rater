import { Linking } from "react-native";

/**
 * Where the Terms of Use and Privacy Policy live: static pages on GitHub Pages, published from the
 * public `cupping-legal` repository. The source is `docs-site/` in this repository (see decisions.md).
 */
const LEGAL_SITE = "https://rageagainstthems.github.io/cupping-legal";
export const LEGAL_URLS: { terms: string | null; privacy: string | null } = {
  terms: `${LEGAL_SITE}/terms.html`,
  privacy: `${LEGAL_SITE}/privacy.html`,
};

/** The page that explains how to delete an account, which Google Play asks for as a web address. */
export const ACCOUNT_DELETION_URL = `${LEGAL_SITE}/delete-account.html`;

/** The published contact address, shown on the legal pages and as Contact us on the Help screen. */
export const CONTACT_EMAIL: string | null = "williamawrigley@gmail.com";

export function openLegal(page: keyof typeof LEGAL_URLS): void {
  const url = LEGAL_URLS[page];
  if (url) void Linking.openURL(url);
}
