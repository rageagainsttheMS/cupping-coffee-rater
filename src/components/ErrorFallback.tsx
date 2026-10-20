import { View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";

type Props = {
  /** Clears the error so the app tries to draw again. */
  onRetry: () => void;
};

/** Shown in place of the app when something crashes while it is drawing. */
export function ErrorFallback({ onRetry }: Props) {
  const text = copy.errorBoundary;
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg }}>
        <Text variant="title">{text.title}</Text>
        <Text muted>{text.body}</Text>
        <Button label={text.retry} onPress={onRetry} />
      </View>
    </Screen>
  );
}
