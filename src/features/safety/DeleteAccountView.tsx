import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";

type Props = {
  busy: boolean;
  onBack: () => void;
  onDelete: () => void;
};

/** What is deleted, and a field where the person types DELETE before the button works. */
export function DeleteAccountView({ busy, onBack, onDelete }: Props) {
  const text = copy.safety.deleteAccount;
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === text.confirmWord;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={onBack} />
          <Text variant="title" accessibilityRole="header">
            {text.title}
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text>{text.intro}</Text>
          <View style={{ gap: spacing.xs }}>
            {text.items.map((item) => (
              <Text key={item}>{`•  ${item}`}</Text>
            ))}
          </View>
          <Text>{text.outro}</Text>
        </View>

        <TextField
          label={text.confirmLabel}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
        />

        <Button
          label={text.action}
          variant="danger"
          disabled={!confirmed}
          busy={busy}
          onPress={onDelete}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
