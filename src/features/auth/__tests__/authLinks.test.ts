import { parseAuthLink } from "../authLinks";

describe("parseAuthLink", () => {
  it("reads the code from a password reset link", () => {
    expect(parseAuthLink("coffeerater://reset-password?code=abc123")).toEqual({
      kind: "recovery",
      code: "abc123",
    });
  });

  it("reads the code from an email confirmation link", () => {
    expect(parseAuthLink("coffeerater://auth-callback?code=xyz")).toEqual({
      kind: "callback",
      code: "xyz",
    });
  });

  it("works with a path after the host and with the dev client scheme", () => {
    expect(parseAuthLink("coffeerater:///reset-password?code=abc")).toMatchObject({
      kind: "recovery",
    });
    expect(parseAuthLink("exp+coffee-rater://expo-development-client/?url=x")).toEqual({
      kind: "unknown",
    });
  });

  it("reads tokens sent in the link fragment", () => {
    expect(
      parseAuthLink("coffeerater://reset-password#access_token=at&refresh_token=rt&type=recovery"),
    ).toEqual({ kind: "recovery", accessToken: "at", refreshToken: "rt" });
  });

  it("reports an error from the link", () => {
    expect(
      parseAuthLink(
        "coffeerater://auth-callback?error=access_denied&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({ kind: "callback", error: "Email link is invalid or has expired" });
  });

  it("ignores links that are not auth links", () => {
    expect(parseAuthLink("coffeerater://cafe/123")).toEqual({ kind: "unknown" });
    expect(parseAuthLink("https://example.com/reset-password?code=abc")).toEqual({
      kind: "unknown",
    });
    expect(parseAuthLink("")).toEqual({ kind: "unknown" });
  });

  it("returns a link without a code or tokens as an auth link with nothing to use", () => {
    expect(parseAuthLink("coffeerater://reset-password")).toEqual({ kind: "recovery" });
  });
});
