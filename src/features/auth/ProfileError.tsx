import { View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useAuth } from "./AuthProvider";

/** Shown when someone is signed in but their profile could not be loaded. */
export function ProfileError() {
  const { retryProfile, signOut } = useAuth();
  const text = copy.auth.profileError;
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg }}>
        <Text variant="title">{text.title}</Text>
        <Text muted>{text.body}</Text>
        <Button label={text.retry} onPress={retryProfile} />
        <Button variant="secondary" label={text.signOut} onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
