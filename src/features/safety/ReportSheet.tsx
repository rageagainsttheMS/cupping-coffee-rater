import { useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { REPORT_DETAILS_MAX, REPORT_REASONS } from "./reports";
import type { ReportReason } from "./reports";

type Props = {
  visible: boolean;
  busy: boolean;
  onSubmit: (reason: ReportReason, details: string) => void;
  onCancel: () => void;
};

/** A bottom sheet for reporting a review: pick a reason, add details if you like, send. */
export function ReportSheet({ visible, busy, onSubmit, onCancel }: Props) {
  const { colors } = useTheme();
  const text = copy.safety;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  // Each time it opens it starts clean.
  const close = () => {
    setReason(null);
    setDetails("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      {/* A modal is its own window, which Android does not resize for the keyboard, so pad on both. */}
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior="padding">
        <Pressable
          accessibilityLabel={text.cancel}
          onPress={close}
          style={{ ...fill, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
        <View
          style={{
            maxHeight: "85%",
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            backgroundColor: colors.background,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          >
            <View style={{ gap: spacing.xs }}>
              <Text variant="title" accessibilityRole="header">
                {text.reportTitle}
              </Text>
              <Text muted>{text.reportBody}</Text>
            </View>

            <View accessibilityRole="radiogroup" accessibilityLabel={text.reasonsLabel}>
              {REPORT_REASONS.map((option) => {
                const selected = option === reason;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={text.reasons[option]}
                    onPress={() => setReason(option)}
                    style={{
                      minHeight: 52,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors.primary,
                          }}
                        />
                      ) : null}
                    </View>
                    <Text variant="bodyStrong">{text.reasons[option]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text variant="label" muted>
                {text.detailsLabel}
              </Text>
              <TextInput
                multiline
                maxLength={REPORT_DETAILS_MAX}
                accessibilityLabel={text.detailsLabel}
                placeholder={text.detailsPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
                style={{
                  minHeight: 88,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontFamily: fonts.body,
                  fontSize: 16,
                }}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Button
                label={text.submit}
                disabled={reason === null}
                busy={busy}
                onPress={() => reason && onSubmit(reason, details)}
              />
              <Button label={text.cancel} variant="secondary" disabled={busy} onPress={close} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
