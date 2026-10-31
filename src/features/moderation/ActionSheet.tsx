import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { MODERATION_NOTE_MAX } from "./moderation";
import { useDangerTint } from "./ModerationParts";
import type { ModerationAction } from "./types";

type Props = {
  /** The action to confirm, or null when the sheet is closed. */
  action: ModerationAction | null;
  /** The review's author: named in the ban and unban text. */
  authorName: string;
  /** How many reviews the author has, for the ban text. */
  reviewCount: number;
  busy: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
};

/** Confirms a moderation action and takes an optional note for the log. */
export function ActionSheet({ action, authorName, reviewCount, busy, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const dangerTint = useDangerTint();
  const sheet = copy.moderation.sheet;
  const [note, setNote] = useState("");
  const text = action ? sheet[action] : null;
  const destructive = action === "ban";

  // Each time it opens it starts clean.
  const close = () => {
    setNote("");
    onCancel();
  };
  const confirm = () => {
    onConfirm(note);
    setNote("");
  };

  return (
    <Modal
      visible={action !== null}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityLabel={sheet.cancel}
          onPress={close}
          style={{ ...fill, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
        {text ? (
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                {destructive ? (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: dangerTint,
                    }}
                  >
                    <MaterialCommunityIcons name="cancel" size={24} color={colors.danger} />
                  </View>
                ) : null}
                <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                  {text.title(authorName)}
                </Text>
              </View>
              <Text>{text.body(authorName, reviewCount)}</Text>

              <View style={{ gap: spacing.xs }}>
                <Text variant="label">
                  {sheet.noteLabel}{" "}
                  <Text variant="label" muted>
                    {sheet.optional}
                  </Text>
                </Text>
                <TextInput
                  multiline
                  maxLength={MODERATION_NOTE_MAX}
                  accessibilityLabel={sheet.noteLabel}
                  value={note}
                  onChangeText={setNote}
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
                <Text variant="caption" muted style={{ textAlign: "right" }}>
                  {sheet.count(note.length, MODERATION_NOTE_MAX)}
                </Text>
              </View>

              <View style={{ gap: spacing.sm }}>
                <Button
                  label={text.confirm}
                  variant={destructive ? "danger" : "primary"}
                  busy={busy}
                  onPress={confirm}
                />
                <Button label={sheet.cancel} variant="secondary" disabled={busy} onPress={close} />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
