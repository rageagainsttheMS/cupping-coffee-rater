import { router } from "expo-router";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { CafeSearchPanel } from "@/features/map/CafeSearchPanel";
import type { SearchResult } from "@/features/map/CafeSearchPanel";
import { useMapFilters } from "@/features/map/MapFiltersContext";
import { useUserLocation } from "@/features/map/useUserLocation";
import { copy } from "@/lib/copy/en";

/** Search cafes we already hold, then centre the map on the one picked. */
export default function SearchScreen() {
  const { requestFocus } = useMapFilters();
  const { position } = useUserLocation();

  const pick = (cafe: SearchResult) => {
    requestFocus({ id: cafe.id, lat: cafe.lat, lng: cafe.lng });
    router.back();
  };

  return (
    <Screen>
      <CafeSearchPanel
        onPick={pick}
        position={position}
        leading={
          <CircleButton
            icon="chevron-left"
            accessibilityLabel={copy.common.back}
            onPress={() => router.back()}
          />
        }
      />
    </Screen>
  );
}
