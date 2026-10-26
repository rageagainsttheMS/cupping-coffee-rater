import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { MAX_PHOTOS } from "@/domain/review.schema";
import { useCafeDetail } from "@/features/cafe/useCafeDetail";
import { formatPrice } from "@/features/cafe/format";
import { copy } from "@/lib/copy/en";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { SubmitErrorKind } from "@/features/review-wizard/errors";
import { pickPhotos } from "@/features/review-wizard/photo";
import { stepPrice } from "@/features/review-wizard/price";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { useSubmitReview } from "@/features/review-wizard/useSubmitReview";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

function errorText(kind: SubmitErrorKind, cafeName: string) {
  const e = copy.review.errors;
  switch (kind) {
    case "duplicate_today":
      return { title: e.duplicateToday(cafeName), body: e.duplicateTodayBody, canRetry: false };
    case "rate_limit":
      return { title: e.rateLimit, body: e.rateLimitBody, canRetry: false };
    case "network":
      return { title: e.network, body: e.networkBody, canRetry: true };
    case "photo":
      return { title: e.photo, body: e.photoBody, canRetry: true };
    case "generic":
      return { title: e.generic, body: e.genericBody, canRetry: true };
  }
}

/** Step 6. Price, beans and a photo, all optional, then post. */
export default function DetailsStep() {
  const { colors } = useTheme();
  const { values, drinks, patchDrink, setBeans, addPhotos, removePhoto } = useWizard();
  const detail = useCafeDetail(values.cafe?.id);
  const { submit, isPending, error, clearError } = useSubmitReview();
  const [photoProblem, setPhotoProblem] = useState<"denied" | "failed" | null>(null);
  const cafeName = values.cafe?.name ?? "";
  const strings = copy.review.details;

  const choosePhotos = async (source: "camera" | "library") => {
    setPhotoProblem(null);
    const result = await pickPhotos(source, MAX_PHOTOS - values.photos.length);
    if (result.status === "ok") addPhotos(result.photos);
    if (result.status === "denied" || result.status === "failed") setPhotoProblem(result.status);
  };

  const inputStyle = {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  } as const;

  const shown = error ? errorText(error, cafeName) : null;
  const topBean = detail.data?.beans[0];

  return (
    <WizardScreen
      step="details"
      title={strings.title}
      continueLabel={strings.post}
      busy={isPending}
      onContinue={() => submit(false)}
      secondaryLabel={strings.skipAndPost}
      onSecondary={() => submit(true)}
    >
      <Text muted>{strings.body}</Text>

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{strings.price}</Text>
        {values.drinks.map((drink, index) => {
          const name = drinks.find((d) => d.id === drink.drinkId)?.name ?? "";
          const median =
            detail.data?.drinks.find((d) => d.drink_id === drink.drinkId)?.median_price ?? null;
          return (
            <View
              key={`${drink.drinkId}-${index}`}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{name}</Text>
                {median !== null ? (
                  <Text variant="caption" muted>
                    {strings.priceOthers(formatPrice(median))}
                  </Text>
                ) : null}
              </View>
              <CircleButton
                icon="minus"
                accessibilityLabel={strings.priceDown}
                onPress={() =>
                  patchDrink(index, { priceAud: stepPrice(drink.priceAud, median, -1) })
                }
              />
              <Text variant="heading" style={{ minWidth: 72, textAlign: "center" }}>
                {drink.priceAud === null ? strings.priceNotSet : formatPrice(drink.priceAud)}
              </Text>
              <CircleButton
                icon="plus"
                accessibilityLabel={strings.priceUp}
                onPress={() =>
                  patchDrink(index, { priceAud: stepPrice(drink.priceAud, median, 1) })
                }
              />
            </View>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{strings.beans}</Text>
        <TextInput
          accessibilityLabel={strings.beans}
          placeholder={strings.beansPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={values.beans}
          onChangeText={setBeans}
          maxLength={80}
          autoCorrect={false}
          style={inputStyle}
        />
        {topBean ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setBeans(topBean.beans)}
            style={{ alignSelf: "flex-start", paddingVertical: spacing.xs }}
          >
            <Text variant="label" color={colors.primary}>
              {strings.beansOthers(topBean.beans, topBean.count)}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <Text variant="heading">{strings.photos}</Text>
          <Text variant="caption" muted>
            {strings.photoCount(values.photos.length, MAX_PHOTOS)}
          </Text>
        </View>
        {values.photos.length > 0 ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {values.photos.map((photo, index) => (
              <View key={photo.uri} style={{ flex: 1, aspectRatio: 1 }}>
                <Image
                  source={{ uri: photo.thumbUri ?? photo.uri }}
                  accessibilityLabel={strings.photoPreview(index + 1)}
                  contentFit="cover"
                  style={{ flex: 1, borderRadius: radius.md }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={strings.removePhoto(index + 1)}
                  onPress={() => removePhoto(index)}
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    top: spacing.xs,
                    right: spacing.xs,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.6)",
                  }}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#fff" />
                </Pressable>
              </View>
            ))}
            {Array.from({ length: MAX_PHOTOS - values.photos.length }, (_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1, aspectRatio: 1 }} />
            ))}
          </View>
        ) : null}
        {values.photos.length < MAX_PHOTOS ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={strings.takePhoto}
                variant="secondary"
                onPress={() => void choosePhotos("camera")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={strings.choosePhoto}
                variant="secondary"
                onPress={() => void choosePhotos("library")}
              />
            </View>
          </View>
        ) : (
          <Text variant="caption" muted>
            {strings.photosFull(MAX_PHOTOS)}
          </Text>
        )}
        {photoProblem ? (
          <Text variant="label" color={colors.danger}>
            {photoProblem === "denied" ? strings.cameraDenied : strings.photoFailed}
          </Text>
        ) : null}
      </View>

      {shown ? (
        <View
          accessibilityRole="alert"
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.danger,
            backgroundColor: colors.surface,
          }}
        >
          <Text variant="heading" color={colors.danger}>
            {shown.title}
          </Text>
          <Text>{shown.body}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {shown.canRetry ? (
              <View style={{ flex: 1 }}>
                <Button label={copy.review.errors.retry} onPress={() => submit(false)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button label={copy.review.errors.dismiss} variant="secondary" onPress={clearError} />
            </View>
          </View>
        </View>
      ) : null}
    </WizardScreen>
  );
}
