import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { DeleteAccountView } from "@/features/safety/DeleteAccountView";
import { useDeleteAccount } from "@/features/safety/useDeleteAccount";

export default function DeleteAccountScreen() {
  const remove = useDeleteAccount();
  return (
    <Screen>
      <DeleteAccountView
        busy={remove.isPending}
        onBack={() => router.back()}
        onDelete={() => remove.mutate()}
      />
    </Screen>
  );
}
