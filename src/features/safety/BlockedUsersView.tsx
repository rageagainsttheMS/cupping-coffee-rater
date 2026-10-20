import { ActivityIndicator, FlatList, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { BlockedUser } from "./useSafety";

type Props = {
  /** Undefined while the first load is running. */
  users: BlockedUser[] | undefined;
  failed: boolean;
  onBack: () => void;
  onRetry: () => void;
  onUnblock: (user: BlockedUser) => void;
};

/** The people the signed-in person has blocked, each with an Unblock button. */
export function BlockedUsersView({ users, failed, onBack, onRetry, onUnblock }: Props) {
  const { colors } = useTheme();
  const text = copy.safety.blockedUsers;

  let body;
  if (!users) {
    body = failed ? (
      <Message text={text.loadError}>
        <Button label={text.retry} onPress={onRetry} />
      </Message>
    ) : (
      <View style={{ paddingTop: spacing.xxl }}>
        <ActivityIndicator accessibilityLabel={copy.common.loading} color={colors.primary} />
      </View>
    );
  } else if (users.length === 0) {
    body = <Message title={text.emptyTitle} text={text.emptyBody} />;
  } else {
    body = (
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => {
          const name = item.name ?? text.unknownName;
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                {name}
              </Text>
              <Button
                label={text.unblock}
                variant="secondary"
                accessibilityLabel={text.unblockLabel(name)}
                onPress={() => onUnblock(item)}
                style={{ minHeight: 44, paddingHorizontal: spacing.lg }}
              />
            </View>
          );
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.lg,
        }}
      >
        <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={onBack} />
        <Text variant="title" accessibilityRole="header">
          {text.title}
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
