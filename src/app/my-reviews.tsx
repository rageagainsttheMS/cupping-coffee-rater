import { router } from "expo-router";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { MyReviewsView } from "@/features/profile/MyReviewsView";
import type { MyReview } from "@/features/profile/types";
import { useDeleteReview, useMyReviews } from "@/features/profile/useMyReviews";
import { copy } from "@/lib/copy/en";

export default function MyReviewsScreen() {
  const reviews = useMyReviews();
  const deleteReview = useDeleteReview();
  const text = copy.profile.myReviews;

  const confirmDelete = (review: MyReview) =>
    Alert.alert(text.deleteTitle, text.deleteBody(review.cafe_name), [
      { text: copy.profile.cancel, style: "cancel" },
      {
        text: text.delete,
        style: "destructive",
        onPress: () =>
          deleteReview.mutate(review, { onError: () => Alert.alert(text.deleteFailed) }),
      },
    ]);

  return (
    <Screen>
      <MyReviewsView
        reviews={reviews.data}
        failed={reviews.isError}
        now={new Date()}
        onBack={() => router.back()}
        onRetry={() => void reviews.refetch()}
        onOpenCafe={(review) =>
          router.push({ pathname: "/cafe/[id]", params: { id: review.cafe_id } })
        }
        onOpenMenu={(review) =>
          Alert.alert(review.cafe_name, undefined, [
            {
              text: text.edit,
              onPress: () =>
                router.push({ pathname: "/review", params: { editId: review.review_id } }),
            },
            { text: text.delete, style: "destructive", onPress: () => confirmDelete(review) },
            { text: copy.profile.cancel, style: "cancel" },
          ])
        }
        onRateCafe={() => router.push("/review")}
      />
    </Screen>
  );
}
