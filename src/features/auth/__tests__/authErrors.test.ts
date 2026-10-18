import { copy } from "@/lib/copy/en";
import { authErrorMessage } from "../authErrors";

describe("authErrorMessage", () => {
  it.each([
    ["invalid_credentials", copy.auth.errors.invalidCredentials],
    ["user_already_exists", copy.auth.errors.emailTaken],
    ["email_exists", copy.auth.errors.emailTaken],
    ["email_not_confirmed", copy.auth.errors.emailNotConfirmed],
    ["weak_password", copy.auth.errors.weakPassword],
    ["over_request_rate_limit", copy.auth.errors.rateLimited],
    ["over_email_send_rate_limit", copy.auth.errors.rateLimited],
  ])("maps the %s code to plain language", (code, expected) => {
    expect(authErrorMessage({ code, message: "raw server message", status: 400 })).toBe(expected);
  });

  it("never shows the raw server message", () => {
    const message = authErrorMessage({
      code: "something_new",
      message: "AuthApiError: db exploded",
      status: 500,
    });
    expect(message).toBe(copy.auth.errors.generic);
    expect(message).not.toContain("db exploded");
  });

  it("recognises a network failure", () => {
    expect(
      authErrorMessage({
        name: "AuthRetryableFetchError",
        message: "Network request failed",
        status: 0,
      }),
    ).toBe(copy.auth.errors.network);
    expect(authErrorMessage(new TypeError("Network request failed"))).toBe(
      copy.auth.errors.network,
    );
  });

  it("copes with anything", () => {
    expect(authErrorMessage(null)).toBe(copy.auth.errors.generic);
    expect(authErrorMessage("oops")).toBe(copy.auth.errors.generic);
    expect(authErrorMessage(undefined)).toBe(copy.auth.errors.generic);
  });
});
