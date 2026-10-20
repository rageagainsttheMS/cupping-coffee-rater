import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useWizard } from "./ReviewWizardProvider";
import { EDIT_STEPS, editStepNumber } from "./edit";
import { stepNumber, TOTAL_STEPS } from "./steps";
import type { WizardStep } from "./types";

type Props = {
  step: WizardStep;
  title: string;
  children: ReactNode;
  continueLabel?: string;
  canContinue?: boolean;
  onContinue?: () => void;
  busy?: boolean;
  /** A second, quieter button under Continue, e.g. "Skip and post". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Replaces the default back behaviour, e.g. returning to the Posted screen. */
  onBack?: () => void;
  /** Hides the footer button for steps that advance by tapping a choice. */
  hideFooter?: boolean;
  /** Content that fills the screen and scrolls itself, such as a list. */
  fill?: boolean;
};

/**
 * The frame every step shares: back and close, "Step N of 6", a progress bar, the step's content
 * and a Continue button. The Android back key does what the back button does.
 */
export function WizardScreen({
  step,
  title,
  children,
  continueLabel = copy.review.continue,
  canContinue = true,
  onContinue,
  busy,
  secondaryLabel,
  onSecondary,
  onBack,
  hideFooter,
  fill,
}: Props) {
  const { colors, metrics } = useTheme();
  const wizard = useWizard();
  const number = wizard.editing ? editStepNumber(step) : stepNumber(step);
  const total = wizard.editing ? EDIT_STEPS.length : TOTAL_STEPS;
  const { goBack } = wizard;
  const back = useCallback(() => (onBack ? onBack() : goBack(step)), [onBack, goBack, step]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        back();
        return true;
      });
      return () => subscription.remove();
    }, [back]),
  );

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={back} />
          <Text variant="label" muted>
            {copy.review.stepOf(number, total)}
          </Text>
          <CircleButton
            icon="close"
            accessibilityLabel={copy.common.close}
            onPress={wizard.close}
          />
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={copy.review.progress(number, total)}
          accessibilityValue={{ min: 0, max: total, now: number }}
          style={{
            height: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${(number / total) * 100}%`,
              height: "100%",
              borderRadius: radius.pill,
              backgroundColor: metrics.coffee.strong,
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {fill ? (
          <View style={{ flex: 1 }}>
            <Text
              variant="title"
              style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
            >
              {title}
            </Text>
            {children}
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
              gap: spacing.lg,
            }}
          >
            <Text variant="title">{title}</Text>
            {children}
          </ScrollView>
        )}

        {hideFooter ? null : (
          <View style={{ gap: spacing.sm, padding: spacing.lg }}>
            <Button
              label={continueLabel}
              disabled={!canContinue}
              busy={busy}
              onPress={onContinue}
            />
            {secondaryLabel ? (
              <Button
                label={secondaryLabel}
                variant="secondary"
                disabled={busy}
                onPress={onSecondary}
              />
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
