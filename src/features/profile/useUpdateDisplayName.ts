import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Profile } from "@/features/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

/** Saves a new display name and updates the cached profile, so the header changes at once. */
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!userId) throw new Error("not_signed_in");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", userId);
      if (error) throw error;
      return displayName;
    },
    onSuccess: (displayName) => {
      queryClient.setQueryData<Profile>(["profile", userId], (old) =>
        old ? { ...old, display_name: displayName } : old,
      );
    },
  });
}
