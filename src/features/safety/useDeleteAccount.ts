import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";

/**
 * Deletes the account through the `delete-account` function (photos, then the user and everything
 * that hangs off it), then signs out on this phone and clears what it stored (drafts, settings).
 * Signing out sends the person back to the welcome screen, so there is nothing to navigate to.
 */
export function useDeleteAccount() {
  const { signOut } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: copy.safety.deleteAccount.confirmWord },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      // The user is already gone, so the server may refuse the sign-out call. The session is
      // dropped on this phone either way.
      await signOut().catch(() => {});
      await AsyncStorage.clear().catch(() => {});
    },
    onError: () => Alert.alert(copy.safety.deleteAccount.failed),
  });
}
