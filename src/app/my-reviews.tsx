import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { MenuSheet } from "@/components/MenuSheet";
import { Screen } from "@/components/Screen";
import { MyReviewsView } from "@/features/profile/MyReviewsView";
import type { MyReview } from "@/features/profile/types";
import { useDeleteReview, useMyReviews } from "@/features/profile/useMyReviews";
import { copy } from "@/lib/copy/en";

export default function MyReviewsScreen() {
  const reviews = useMyReviews();
  const deleteReview = useDeleteReview();
  const [menuFor, setMenuFor] = useState<MyReview | null>(null);
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
        onOpenMenu={setMenuFor}
        onRateCafe={() => router.push("/review")}
      />
      <MenuSheet
        visible={menuFor !== null}
        title={menuFor?.cafe_name ?? ""}
        subtitle={text.menuSubtitle}
        items={
          menuFor
            ? [
                {
                  label: text.edit,
                  icon: "pencil-outline",
                  onPress: () =>
                    router.push({ pathname: "/review", params: { editId: menuFor.review_id } }),
                },
                {
                  label: text.delete,
                  icon: "trash-can-outline",
                  destructive: true,
                  onPress: () => confirmDelete(menuFor),
                },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
      />
    </Screen>
  );
}
