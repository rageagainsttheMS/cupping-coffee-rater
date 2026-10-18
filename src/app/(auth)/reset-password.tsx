import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { Button } from "@/components/Button";
import { FormScreen } from "@/components/FormScreen";
import { FormTextField } from "@/components/FormTextField";
import { Text } from "@/components/Text";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authErrors";
import { newPasswordSchema } from "@/features/auth/schemas";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** Reached from the link in a password reset email, which signs the person in for this one step. */
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { finishPasswordRecovery } = useAuth();
  const text = copy.auth.reset;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const submit = handleSubmit(async ({ password }) => {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setFormError(authErrorMessage(error));
    // They are already signed in, so finishing recovery sends them on into the app.
    else finishPasswordRecovery();
  });

  return (
    <FormScreen>
      <Text variant="display">{text.title}</Text>
      <View style={{ gap: spacing.lg }}>
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
        <FormTextField
          control={control}
          name="confirm"
          label={text.confirm}
          placeholder={text.confirmPlaceholder}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          textContentType="newPassword"
        />
      </View>
      {formError ? (
        <Text variant="label" color={colors.danger} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}
      <Button label={text.submit} busy={isSubmitting} onPress={() => void submit()} />
    </FormScreen>
  );
}
