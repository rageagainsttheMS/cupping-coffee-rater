import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { FormScreen } from "@/components/FormScreen";
import { FormTextField } from "@/components/FormTextField";
import { LinkText } from "@/components/LinkText";
import { TermsCheckbox } from "@/components/TermsCheckbox";
import { Text } from "@/components/Text";
import { authErrorMessage } from "@/features/auth/authErrors";
import { signUpSchema } from "@/features/auth/schemas";
import { SocialSignIn } from "@/features/auth/SocialSignIn";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function SignUpScreen() {
  const { colors } = useTheme();
  const text = copy.auth.signUp;
  const [formError, setFormError] = useState<string | null>(null);
  /** Set when the account was created but the person has to confirm their email first. */
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "", acceptedTerms: false },
  });

  const goToSignIn = () => router.replace("/sign-in");

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // The database trigger turns these into the profile, including when the terms were agreed.
        data: { display_name: values.displayName, accepted_terms: true },
        emailRedirectTo: Linking.createURL("auth-callback"),
      },
    });
    if (error) setFormError(authErrorMessage(error));
    // With email confirmation on there is no session yet. Without it, the session listener moves on.
    else if (!data.session) setConfirmEmail(values.email);
  });

  if (confirmEmail) {
    return (
      <FormScreen>
        <Text variant="display">{text.checkEmailTitle}</Text>
        <Text muted>{text.checkEmailBody(confirmEmail)}</Text>
        <View style={{ flex: 1 }} />
        <Button variant="secondary" label={text.backToSignIn} onPress={goToSignIn} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <View style={{ flexDirection: "row" }}>
        <CircleButton
          icon="chevron-left"
          accessibilityLabel={copy.common.back}
          onPress={() => (router.canGoBack() ? router.back() : goToSignIn())}
        />
      </View>
      <Text variant="display">{text.title}</Text>
      <Text muted>{text.subtitle}</Text>
      <SocialSignIn onError={setFormError} />

      <View style={{ gap: spacing.lg }}>
        <FormTextField
          control={control}
          name="displayName"
          label={text.displayName}
          placeholder={text.displayNamePlaceholder}
          autoComplete="name"
          maxLength={60}
          textContentType="nickname"
        />
        <FormTextField
          control={control}
          name="email"
          label={text.email}
          placeholder={text.emailPlaceholder}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <FormTextField
          control={control}
          name="password"
          label={text.password}
          placeholder={text.passwordPlaceholder}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          textContentType="newPassword"
        />
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field, fieldState }) => (
            <View style={{ gap: spacing.xs }}>
              <TermsCheckbox
                checked={field.value}
                onChange={field.onChange}
                invalid={!!fieldState.error}
              />
              {fieldState.error ? (
                <Text variant="caption" color={colors.danger}>
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />
      </View>

      {formError ? (
        <Text variant="label" color={colors.danger} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}
      <Button label={text.submit} busy={isSubmitting} onPress={() => void submit()} />

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
        <Text muted>{text.haveAccount}</Text>
        <LinkText onPress={goToSignIn}>{text.signInLink}</LinkText>
      </View>
    </FormScreen>
  );
}
