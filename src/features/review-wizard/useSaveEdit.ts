import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert } from "react-native";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { SAVED_CAFES_KEY } from "@/features/cafe/useSaveCafe";
import { CAFES_IN_VIEW_KEY } from "@/features/map/useCafesInView";
import { MY_REVIEWS_KEY } from "@/features/profile/useMyReviews";
import { copy } from "@/lib/copy/en";
import { hasChanges } from "./edit";
import { classifySubmitError } from "./errors";
import { editReview } from "./postReview";
import { useWizard } from "./ReviewWizardProvider";

/** Everything an edit changes: the person's list, the map's pins, and the cafe page. */
const KEYS_TO_REFRESH = [
  MY_REVIEWS_KEY,
  CAFES_IN_VIEW_KEY,
  CAFE_DETAIL_KEY,
  CAFE_REVIEWS_KEY,
  SAVED_CAFES_KEY,
];

/**
 * Saves the edit and returns to My reviews. If nothing changed it just closes, so a review is not
 * marked Edited for no reason.
 */
export function useSaveEdit() {
  const wizard = useWizard();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => editReview({ values: wizard.values, tags: wizard.tags }),
    onSuccess: () => {
      for (const key of KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
      router.back();
    },
    onError: (failure) =>
      Alert.alert(
        classifySubmitError(failure) === "network"
          ? copy.review.edit.networkFailed
          : copy.review.edit.saveFailed,
      ),
  });

  return {
    save: () => {
      if (wizard.editInitial && !hasChanges(wizard.editInitial, wizard.values)) {
        router.back();
        return;
      }
      mutation.mutate();
    },
    isPending: mutation.isPending,
  };
}
