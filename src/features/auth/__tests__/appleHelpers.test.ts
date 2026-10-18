import { formatAppleName, isAppleCancel } from "../appleHelpers";

describe("formatAppleName", () => {
  it("joins the given, middle and family names", () => {
    expect(
      formatAppleName({ givenName: "Grace", middleName: "Brewster", familyName: "Hopper" }),
    ).toBe("Grace Brewster Hopper");
    expect(formatAppleName({ givenName: "Grace", familyName: "Hopper" })).toBe("Grace Hopper");
  });

  it("skips names Apple left out or left blank", () => {
    expect(formatAppleName({ givenName: "Grace", middleName: null, familyName: "  " })).toBe(
      "Grace",
    );
    expect(formatAppleName({ givenName: null, middleName: null, familyName: "Hopper" })).toBe(
      "Hopper",
    );
  });

  it("trims the names", () => {
    expect(formatAppleName({ givenName: "  Grace ", familyName: " Hopper  " })).toBe(
      "Grace Hopper",
    );
  });

  it("is null when Apple sent no name, as on every sign-in after the first", () => {
    expect(formatAppleName(null)).toBeNull();
    expect(formatAppleName(undefined)).toBeNull();
    expect(formatAppleName({ givenName: null, middleName: null, familyName: null })).toBeNull();
    expect(formatAppleName({ givenName: " ", familyName: "" })).toBeNull();
  });

  it("is cut to the display name limit of 40 characters", () => {
    const name = formatAppleName({ givenName: "A".repeat(30), familyName: "B".repeat(30) });
    expect(name).toHaveLength(40);
  });
});

describe("isAppleCancel", () => {
  it("recognises the person closing the Apple sheet", () => {
    expect(isAppleCancel({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
  });

  it("does not treat other errors as a cancel", () => {
    expect(isAppleCancel({ code: "ERR_REQUEST_FAILED" })).toBe(false);
    expect(isAppleCancel(new Error("nope"))).toBe(false);
    expect(isAppleCancel(null)).toBe(false);
    expect(isAppleCancel("ERR_REQUEST_CANCELED")).toBe(false);
  });
});
