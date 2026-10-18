import { z } from "zod";
import { copy } from "@/lib/copy/en";

const errors = copy.auth.errors;

const email = z.string().trim().pipe(z.email(errors.emailInvalid));
const newPassword = z.string().min(8, errors.passwordTooShort);

export const DISPLAY_NAME_MAX = 40;

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, errors.nameRequired)
    .max(DISPLAY_NAME_MAX, errors.nameTooLong),
  email,
  password: newPassword,
  acceptedTerms: z.boolean().refine((agreed) => agreed, errors.termsRequired),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, errors.passwordRequired),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: errors.passwordsDifferent,
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
