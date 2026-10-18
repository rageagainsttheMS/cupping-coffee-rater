import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { FormScreen } from "@/components/FormScreen";
import { FormTextField } from "@/components/FormTextField";
import { Text } from "@/components/Text";
import { authErrorMessage } from "@/features/auth/authErrors";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const text = copy.auth.forgot;
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/sign-in"));

  const submit = handleSubmit(async ({ email }) => {
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("reset-password"),
    });
    if (error) setFormError(authErrorMessage(error));
    // The same message whether or not an account exists, so this cannot be used to find accounts.
    else setSentTo(email);
  });

  return (
    <FormScreen>
      <View style={{ flexDirection: "row" }}>
        <CircleButton icon="chevron-left" accessibilityLabel={copy.common.back} onPress={goBack} />
      </View>
      {sentTo ? (
        <>
          <Text variant="display">{text.sentTitle}</Text>
          <Text muted>{text.sentBody(sentTo)}</Text>
          <View style={{ flex: 1 }} />
          <Button variant="secondary" label={text.backToSignIn} onPress={goBack} />
        </>
      ) : (
        <>
          <Text variant="display">{text.title}</Text>
          <Text muted>{text.body}</Text>
          <FormTextField
            control={control}
            name="email"
            label={copy.auth.signIn.email}
            placeholder={copy.auth.signIn.emailPlaceholder}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {formError ? (
            <Text variant="label" color={colors.danger} accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          <Button label={text.submit} busy={isSubmitting} onPress={() => void submit()} />
        </>
      )}
    </FormScreen>
  );
}
