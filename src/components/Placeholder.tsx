import { View } from "react-native";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { Screen } from "./Screen";
import { Text } from "./Text";

type Props = {
  title: string;
  /** Which milestone replaces this screen. */
  milestone: string;
  /** Skip the bottom inset on tab screens, where the tab bar handles it. */
  inTabs?: boolean;
  children?: ReactNode;
};

/** Stand-in screen used until the real one is built. */
export function Placeholder({ title, milestone, inTabs, children }: Props) {
  return (
    <Screen noBottomInset={inTabs}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <Text variant="title">{title}</Text>
        <Text muted>{copy.placeholder.builtIn(milestone)}</Text>
        {children}
      </View>
    </Screen>
  );
}
