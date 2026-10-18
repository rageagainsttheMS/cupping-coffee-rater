import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import type { ReactNode } from "react";
import { spacing } from "@/lib/theme/tokens";
import { Screen } from "./Screen";

/** A screen for forms: scrolls, and keeps the field in view when the keyboard opens. */
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xl,
            gap: spacing.lg,
          }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
