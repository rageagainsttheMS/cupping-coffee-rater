import { ActivityIndicator, FlatList, View } from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import type { Point } from "@/features/map/types";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { distanceTo } from "./filters";
import { SavedRow } from "./SavedRow";
import type { SavedCafe } from "./types";

type Props = {
  /** Undefined while the first load is running. */
  cafes: SavedCafe[] | undefined;
  failed: boolean;
  position: Point | null;
  onRetry: () => void;
  onOpen: (cafe: SavedCafe) => void;
  /** `index` is the cafe's place in the full list, so an undo can put it back there. */
  onUnsave: (cafe: SavedCafe, index: number) => void;
  onFindCafes: () => void;
};

/** The Saved tab's content: title and the list or its empty, loading and error states. */
export function SavedView({
  cafes,
  failed,
  position,
  onRetry,
  onOpen,
  onUnsave,
  onFindCafes,
}: Props) {
  const { colors } = useTheme();

  let body;
  if (!cafes) {
    body = failed ? (
      <Message text={copy.saved.loadError}>
        <Button label={copy.saved.retry} onPress={onRetry} />
      </Message>
    ) : (
      <View style={{ paddingTop: spacing.xxl }}>
        <ActivityIndicator accessibilityLabel={copy.common.loading} color={colors.primary} />
      </View>
    );
  } else if (cafes.length === 0) {
    body = (
      <Message title={copy.saved.emptyTitle} text={copy.saved.emptyBody}>
        <Button label={copy.saved.emptyAction} onPress={onFindCafes} />
      </Message>
    );
  } else {
    body = (
      <FlatList
        data={cafes}
        keyExtractor={(cafe) => cafe.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 96,
          gap: spacing.md,
        }}
        renderItem={({ item }) => (
          <SavedRow
            cafe={item}
            distance={distanceTo(item, position)}
            onPress={() => onOpen(item)}
            onUnsave={() =>
              onUnsave(
                item,
                cafes.findIndex((c) => c.id === item.id),
              )
            }
          />
        )}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <Text variant="display" accessibilityRole="header">
          {copy.screens.saved}
        </Text>
      </View>
      {body}
    </View>
  );
}

function Message({
  title,
  text,
  children,
}: {
  title?: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ padding: spacing.xl, gap: spacing.md, alignItems: "center" }}>
      {title ? (
        <Text variant="heading" style={{ textAlign: "center" }}>
          {title}
        </Text>
      ) : null}
      <Text muted style={{ textAlign: "center" }}>
        {text}
      </Text>
      {children}
    </View>
  );
}
