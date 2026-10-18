import { copy } from "@/lib/copy/en";
import { forgotPasswordSchema, newPasswordSchema, signInSchema, signUpSchema } from "../schemas";

const messageFor = (
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) => result.error?.issues.find((i) => i.path[0] === field)?.message;

describe("signUpSchema", () => {
  const valid = {
    displayName: "Ada",
    email: "ada@example.com",
    password: "longenough",
    acceptedTerms: true,
  };

  it("accepts a complete sign-up and trims the name and email", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      displayName: "  Ada  ",
      email: " ada@example.com ",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ displayName: "Ada", email: "ada@example.com" });
  });

  it("needs a name of 1 to 40 characters", () => {
    expect(
      messageFor(signUpSchema.safeParse({ ...valid, displayName: "   " }), "displayName"),
    ).toBe(copy.auth.errors.nameRequired);
    expect(
      messageFor(signUpSchema.safeParse({ ...valid, displayName: "x".repeat(41) }), "displayName"),
    ).toBe(copy.auth.errors.nameTooLong);
    expect(signUpSchema.safeParse({ ...valid, displayName: "x".repeat(40) }).success).toBe(true);
  });

  it("needs a valid email", () => {
    expect(messageFor(signUpSchema.safeParse({ ...valid, email: "nope" }), "email")).toBe(
      copy.auth.errors.emailInvalid,
    );
  });

  it("needs a password of at least 8 characters", () => {
    expect(messageFor(signUpSchema.safeParse({ ...valid, password: "short" }), "password")).toBe(
      copy.auth.errors.passwordTooShort,
    );
    expect(signUpSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(true);
  });

  it("needs the terms to be agreed", () => {
    expect(
      messageFor(signUpSchema.safeParse({ ...valid, acceptedTerms: false }), "acceptedTerms"),
    ).toBe(copy.auth.errors.termsRequired);
  });
});

describe("signInSchema", () => {
  it("needs an email and any non-empty password", () => {
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("needs a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "ada@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("needs 8 characters and a matching confirmation", () => {
    expect(
      newPasswordSchema.safeParse({ password: "longenough", confirm: "longenough" }).success,
    ).toBe(true);
    expect(
      messageFor(newPasswordSchema.safeParse({ password: "short", confirm: "short" }), "password"),
    ).toBe(copy.auth.errors.passwordTooShort);
    expect(
      messageFor(
        newPasswordSchema.safeParse({ password: "longenough", confirm: "different1" }),
        "confirm",
      ),
    ).toBe(copy.auth.errors.passwordsDifferent);
  });
});
