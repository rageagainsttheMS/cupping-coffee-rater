import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useCafeDetail } from "@/features/cafe/useCafeDetail";
import { formatDistance } from "@/features/map/cards";
import { CafeSearchPanel } from "@/features/map/CafeSearchPanel";
import type { SearchResult } from "@/features/map/CafeSearchPanel";
import { useUserLocation } from "@/features/map/useUserLocation";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { STEP_ROUTES } from "@/features/review-wizard/steps";
import { useNearbyCafes } from "@/features/review-wizard/useWizardData";
import type { NearbyCafe } from "@/features/review-wizard/useWizardData";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

/** Within this distance the nearest cafe is probably where the person is sitting. */
const HERE_METRES = 100;

/** Step 1. Picks the cafe, or skips ahead when the wizard was opened from a cafe page. */
export default function CafeStep() {
  const wizard = useWizard();
  const { cafeId } = useLocalSearchParams<{ cafeId?: string }>();

  // A draft was restored: go back to where the person was before showing anything.
  const { resumeStep, clearResume } = wizard;
  useEffect(() => {
    if (!resumeStep) return;
    clearResume();
    if (resumeStep !== "cafe") router.replace(STEP_ROUTES[resumeStep]);
  }, [resumeStep, clearResume]);
  if (resumeStep && resumeStep !== "cafe") return null;

  if (cafeId) return <CafeFromPage cafeId={cafeId} />;
  return <ChooseCafe />;
}

/** Opened from a cafe page: load that cafe and move on to the drink. */
function CafeFromPage({ cafeId }: { cafeId: string }) {
  const wizard = useWizard();
  const { colors } = useTheme();
  const detail = useCafeDetail(cafeId);
  const { setCafe, goNext } = wizard;
  const cafe = detail.data?.cafe;

  useEffect(() => {
    if (!cafe) return;
    setCafe(
      { id: cafe.id, name: cafe.name, suburb: cafe.suburb, lat: cafe.lat, lng: cafe.lng },
      true,
    );
    goNext("cafe");
  }, [cafe, setCafe, goNext]);

  const failed = detail.isError || (detail.isSuccess && !detail.data);
  return (
    <Screen
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      {failed ? (
        <>
          <Text variant="heading">{copy.review.cafe.loadError}</Text>
          <Button label={copy.review.errors.retry} onPress={() => void detail.refetch()} />
          <Button label={copy.common.close} variant="secondary" onPress={wizard.close} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text muted>{copy.review.cafe.loadingCafe}</Text>
        </>
      )}
    </Screen>
  );
}

function ChooseCafe() {
  const wizard = useWizard();
  const { colors } = useTheme();
  const user = useUserLocation();
  const nearby = useNearbyCafes(user.position);
  const [wantsSearch, setWantsSearch] = useState(false);
  const { values, setCafe, goNext } = wizard;

  // Pre-select the nearest cafe, unless one is already chosen (a restored draft, or a tap).
  const nearest = nearby.data?.[0];
  useEffect(() => {
    if (nearest && !values.cafe) {
      setCafe({
        id: nearest.id,
        name: nearest.name,
        suburb: nearest.suburb,
        lat: nearest.lat,
        lng: nearest.lng,
      });
    }
  }, [nearest, values.cafe, setCafe]);

  // Without location there is nothing to list, so search comes first.
  const searching = wantsSearch || (user.ready && !user.position);

  const pickSearched = (cafe: SearchResult) => {
    setCafe({ id: cafe.id, name: cafe.name, suburb: cafe.suburb, lat: cafe.lat, lng: cafe.lng });
    setWantsSearch(false);
    goNext("cafe");
  };

  if (searching) {
    return (
      <WizardScreen step="cafe" title={copy.review.cafe.title} fill hideFooter>
        {user.ready && !user.position ? (
          <Text muted style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
            {copy.review.cafe.needsLocation}
          </Text>
        ) : null}
        <CafeSearchPanel
          onPick={pickSearched}
          position={user.position}
          leading={
            user.position ? (
              <CircleButton
                icon="chevron-left"
                accessibilityLabel={copy.common.back}
                onPress={() => setWantsSearch(false)}
              />
            ) : undefined
          }
        />
      </WizardScreen>
    );
  }

  const rows = nearby.data ?? [];
  const caption = (cafe: NearbyCafe, index: number) => {
    const distance = formatDistance(cafe.distance_m);
    if (index === 0) {
      return cafe.distance_m <= HERE_METRES
        ? copy.review.cafe.hereNow(distance)
        : copy.review.cafe.nearest(distance);
    }
    return copy.map.suburbAndDistance(cafe.suburb ?? "", distance);
  };

  return (
    <WizardScreen
      step="cafe"
      title={copy.review.cafe.title}
      canContinue={values.cafe !== null}
      onContinue={() => goNext("cafe")}
    >
      {nearby.isLoading || !user.ready ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <ActivityIndicator color={colors.primary} />
          <Text muted>{copy.review.cafe.findingNearby}</Text>
        </View>
      ) : rows.length === 0 ? (
        <Text muted>{copy.review.cafe.noNearby}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {rows.map((cafe, index) => {
            const selected = values.cafe?.id === cafe.id;
            return (
              <Pressable
                key={cafe.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() =>
                  setCafe({
                    id: cafe.id,
                    name: cafe.name,
                    suburb: cafe.suburb,
                    lat: cafe.lat,
                    lng: cafe.lng,
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {cafe.name}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {caption(cafe, index)}
                  </Text>
                </View>
                {selected ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={colors.primary}
                    accessibilityLabel={copy.review.cafe.selected}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
      <Button
        label={copy.review.cafe.searchOther}
        variant="secondary"
        onPress={() => setWantsSearch(true)}
      />
    </WizardScreen>
  );
}
