import { router } from "expo-router";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { BlockedUsersView } from "@/features/safety/BlockedUsersView";
import { useBlockedUsers, useUnblockUser } from "@/features/safety/useSafety";
import { copy } from "@/lib/copy/en";

export default function BlockedUsersScreen() {
  const blocked = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <Screen>
      <BlockedUsersView
        users={blocked.data}
        failed={blocked.isError}
        onBack={() => router.back()}
        onRetry={() => void blocked.refetch()}
        onUnblock={(user) =>
          unblock.mutate(user.id, {
            onError: () => Alert.alert(copy.safety.blockedUsers.unblockFailed),
          })
        }
      />
    </Screen>
  );
}
