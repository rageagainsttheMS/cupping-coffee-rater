import { View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";

type Props = {
  cafeName: string | null;
  onContinue: () => void;
  onStartAgain: () => void;
};

/** Shown first when a review was left unfinished in the last day. */
export function ResumePrompt({ cafeName, onContinue, onStartAgain }: Props) {
  const strings = copy.review.resume;
  return (
    <Screen style={{ justifyContent: "center", padding: spacing.xl, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">{cafeName ? strings.title(cafeName) : strings.titleNoCafe}</Text>
        <Text muted>{strings.body}</Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button label={strings.continue} onPress={onContinue} />
        <Button label={strings.startAgain} variant="secondary" onPress={onStartAgain} />
      </View>
    </Screen>
  );
}
