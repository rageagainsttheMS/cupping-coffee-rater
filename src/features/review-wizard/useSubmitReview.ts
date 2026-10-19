import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { SAVED_CAFES_KEY } from "@/features/cafe/useSaveCafe";
import { CAFES_IN_VIEW_KEY } from "@/features/map/useCafesInView";
import { classifySubmitError, type SubmitErrorKind } from "./errors";
import { InvalidReviewError, postReview } from "./postReview";
import { useWizard } from "./ReviewWizardProvider";

/** Everything a posted review changes: the map's pins, the cafe page, its reviews and photos. */
const KEYS_TO_REFRESH = [
  CAFES_IN_VIEW_KEY,
  CAFE_DETAIL_KEY,
  CAFE_REVIEWS_KEY,
  "cafe-photos",
  SAVED_CAFES_KEY,
  "usual-drinks",
];

/**
 * Posts the review from the wizard. On success the draft is dropped and the Posted screen opens.
 * On failure the draft stays, and `error` says why in terms the screen can show.
 */
export function useSubmitReview() {
  const wizard = useWizard();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<SubmitErrorKind | null>(null);

  const mutation = useMutation({
    mutationFn: (withoutDetails: boolean) => {
      const userId = session?.user.id;
      if (!userId) throw new InvalidReviewError();
      return postReview({ values: wizard.values, tags: wizard.tags, userId, withoutDetails });
    },
    onSuccess: async (result) => {
      await wizard.discardDraft();
      for (const key of KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
      if (wizard.values.cafe) {
        wizard.setPosted({
          cafe: wizard.values.cafe,
          verified: result.verified,
          before: result.before,
          after: result.after,
        });
      }
      router.replace("/review/posted");
    },
    onError: (failure) => setError(classifySubmitError(failure)),
  });

  return {
    submit: (withoutDetails = false) => {
      setError(null);
      mutation.mutate(withoutDetails);
    },
    isPending: mutation.isPending,
    error,
    clearError: () => setError(null),
  };
}
