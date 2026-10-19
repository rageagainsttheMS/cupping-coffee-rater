import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Linking, Platform, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { CafeView } from "@/features/cafe/CafeView";
import { directionsUrl } from "@/features/cafe/format";
import { useCafeDetail } from "@/features/cafe/useCafeDetail";
import { useCafeReviews } from "@/features/cafe/useCafeReviews";
import { useCafePhotos } from "@/features/cafe/usePhotos";
import { useSaveCafe } from "@/features/cafe/useSaveCafe";
import { formatDistance } from "@/features/map/cards";
import { distanceMetres } from "@/features/map/geo";
import { useMapFilters } from "@/features/map/MapFiltersContext";
import { useUserLocation } from "@/features/map/useUserLocation";
import { copy } from "@/lib/copy/en";
import { usePlaceDetails } from "@/lib/places";
import { spacing } from "@/lib/theme/tokens";

export default function CafeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { metric } = useMapFilters();
  const user = useUserLocation();
  const detail = useCafeDetail(id);
  const google = usePlaceDetails(id);
  const photos = useCafePhotos(id);
  const save = useSaveCafe(id, () => Alert.alert(copy.cafe.saveFailed));

  if (detail.isLoading) {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <ActivityIndicator accessibilityLabel={copy.common.loading} />
      </Screen>
    );
  }

  const cafe = detail.data;
  if (!cafe) {
    return (
      <Screen style={{ justifyContent: "center", padding: spacing.xl, gap: spacing.md }}>
        <Text variant="title">{detail.isError ? copy.cafe.loadError : copy.cafe.notFound}</Text>
        {detail.isError ? <Text muted>{copy.cafe.loadErrorBody}</Text> : null}
        <View style={{ gap: spacing.sm }}>
          {detail.isError ? (
            <Button label={copy.cafe.retry} onPress={() => void detail.refetch()} />
          ) : null}
          <Button label={copy.cafe.back} variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const distance = user.position ? formatDistance(distanceMetres(user.position, cafe.cafe)) : "";

  return (
    <Screen>
      <CafeView
        detail={cafe}
        google={google.data}
        photos={photos.data ?? []}
        distance={distance}
        initialMetric={metric}
        useReviews={useCafeReviews}
        onBack={() => router.back()}
        onToggleSave={() => save.mutate(!cafe.saved)}
        onDirections={() =>
          void Linking.openURL(directionsUrl(cafe.cafe, google.data?.maps_uri, Platform.OS))
        }
        onRate={() => router.push({ pathname: "/review", params: { cafeId: cafe.cafe.id } })}
      />
    </Screen>
  );
}
