import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/Button";
import { FormScreen } from "@/components/FormScreen";
import { FormTextField } from "@/components/FormTextField";
import { LinkText } from "@/components/LinkText";
import { Text } from "@/components/Text";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authErrors";
import { signInSchema } from "@/features/auth/schemas";
import { SocialSignIn } from "@/features/auth/SocialSignIn";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function SignInScreen() {
  const { colors } = useTheme();
  const { linkError, setLinkError } = useAuth();
  const text = copy.auth.signIn;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    setLinkError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    // On success the session listener moves the app on, so there is nothing more to do here.
    if (error) setFormError(authErrorMessage(error));
  });

  const message = formError ?? linkError;

  return (
    <FormScreen>
      <AppLogo />
      <Text variant="display">{text.title}</Text>
      <Text muted>{text.subtitle}</Text>
      <SocialSignIn onError={setFormError} />

      <View style={{ gap: spacing.lg }}>
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
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
        />
        <View style={{ alignItems: "flex-end" }}>
          <LinkText variant="label" onPress={() => router.push("/forgot-password")}>
            {text.forgot}
          </LinkText>
        </View>
      </View>

      {message ? (
        <Text variant="label" color={colors.danger} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <Button label={text.submit} busy={isSubmitting} onPress={() => void submit()} />

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
        <Text muted>{text.newHere}</Text>
        <LinkText onPress={() => router.replace("/sign-up")}>{text.createLink}</LinkText>
      </View>
    </FormScreen>
  );
}
