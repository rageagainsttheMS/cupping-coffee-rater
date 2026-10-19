import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { useCafeDetail } from "@/features/cafe/useCafeDetail";
import { formatPrice } from "@/features/cafe/format";
import { copy } from "@/lib/copy/en";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { SubmitErrorKind } from "@/features/review-wizard/errors";
import { pickPhoto } from "@/features/review-wizard/photo";
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
  const { values, drinks, patchDrink, setBeans, setPhoto } = useWizard();
  const detail = useCafeDetail(values.cafe?.id);
  const { submit, isPending, error, clearError } = useSubmitReview();
  const [photoProblem, setPhotoProblem] = useState<"denied" | "failed" | null>(null);
  const cafeName = values.cafe?.name ?? "";
  const strings = copy.review.details;

  const choosePhoto = async (source: "camera" | "library") => {
    setPhotoProblem(null);
    const result = await pickPhoto(source);
    if (result.status === "ok") setPhoto(result.photo);
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
        <Text variant="heading">{strings.photo}</Text>
        {values.photo ? (
          <View style={{ gap: spacing.sm }}>
            <Image
              source={{ uri: values.photo.uri }}
              accessibilityLabel={strings.photoPreview}
              contentFit="cover"
              style={{ height: 200, borderRadius: radius.lg }}
            />
            <Button
              label={strings.removePhoto}
              variant="secondary"
              onPress={() => setPhoto(null)}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={strings.takePhoto}
                variant="secondary"
                onPress={() => void choosePhoto("camera")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={strings.choosePhoto}
                variant="secondary"
                onPress={() => void choosePhoto("library")}
              />
            </View>
          </View>
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
