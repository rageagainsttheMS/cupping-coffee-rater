import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { MetricChip } from "@/components/MetricChip";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { DEFAULT_MAP_CENTRE } from "@/domain/mapDefaults";
import { METRICS } from "@/domain/metrics";
import { CafeCard } from "@/features/map/CafeCard";
import { formatDistance, sortForCards } from "@/features/map/cards";
import { buildClusterIndex, clusterExpansionZoom, getMapItems } from "@/features/map/clusters";
import type { MapItem } from "@/features/map/clusters";
import { moveWhenReady } from "@/features/map/focusMove";
import { distanceMetres, regionAtZoom, regionToBbox, regionToZoom } from "@/features/map/geo";
import { MapPin } from "@/features/map/MapPin";
import { useMapFilters } from "@/features/map/MapFiltersContext";
import { darkMapStyle, lightMapStyle } from "@/features/map/mapStyle";
import type { MapCafe, Region } from "@/features/map/types";
import { useCafesInView } from "@/features/map/useCafesInView";
import { useFillFromGoogle } from "@/features/map/useFillFromGoogle";
import { useUserLocation } from "@/features/map/useUserLocation";
import { copy } from "@/lib/copy/en";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

const CARD_GAP = spacing.md;
const CARD_PEEK = 40;
const CARD_AREA_HEIGHT = 208;
const NO_CAFES: MapCafe[] = [];

export default function MapScreen() {
  const { colors, scheme } = useTheme();
  const { metric, setMetric, focusRequest, clearFocus } = useMapFilters();
  const user = useUserLocation();
  const { width } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<MapCafe>>(null);

  const [movedRegion, setRegion] = useState<Region | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The map opens on the person, or on the default centre when location is off.
  const initialRegion = useMemo(
    () => regionAtZoom(user.position ?? DEFAULT_MAP_CENTRE, user.position ? 15 : 14),
    // Only the first answer matters. Later positions are for the recentre button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.ready],
  );
  // Until the map has reported a move, the region is where it opened.
  const region = movedRegion ?? (user.ready ? initialRegion : null);

  const queryRegion = useDebouncedValue(region, 300);
  const cafesQuery = useCafesInView(queryRegion, metric);
  const cafes = cafesQuery.data ?? NO_CAFES;
  const { searching } = useFillFromGoogle(
    queryRegion,
    cafesQuery.data?.length,
    cafesQuery.isFetching,
  );

  const index = useMemo(() => buildClusterIndex(cafes), [cafes]);
  const items = useMemo(
    () => (region ? getMapItems(index, regionToBbox(region), regionToZoom(region)) : []),
    [index, region],
  );

  // The cards show the cafes inside the visible area, best first.
  const cards = useMemo(() => {
    if (!region) return NO_CAFES;
    const [west, south, east, north] = regionToBbox(region);
    const inView = cafes.filter(
      (c) => c.lng >= west && c.lng <= east && c.lat >= south && c.lat <= north,
    );
    return sortForCards(inView, user.position);
  }, [cafes, region, user.position]);

  // A cafe picked on the search screen wins until the person picks something else.
  const focusId = focusRequest?.id ?? null;
  const focusLoaded = focusId !== null && cards.some((c) => c.id === focusId);
  const activeId = focusLoaded
    ? focusId
    : cards.some((c) => c.id === selectedId)
      ? selectedId
      : (cards[0]?.id ?? null);

  const cardWidth = width - spacing.lg - CARD_PEEK;
  const interval = cardWidth + CARD_GAP;

  const scrollToCard = useCallback(
    (id: string) => {
      const at = cards.findIndex((c) => c.id === id);
      if (at >= 0) listRef.current?.scrollToOffset({ offset: at * interval, animated: true });
    },
    [cards, interval],
  );

  const selectFromPin = (id: string) => {
    clearFocus();
    setSelectedId(id);
    scrollToCard(id);
  };

  const onCardsScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(e.nativeEvent.contentOffset.x / interval);
    const cafe = cards[Math.min(Math.max(at, 0), cards.length - 1)];
    if (cafe) {
      clearFocus();
      setSelectedId(cafe.id);
    }
  };

  const zoomIntoCluster = (cluster: Extract<MapItem, { kind: "cluster" }>) => {
    const zoom = Math.min(clusterExpansionZoom(index, cluster.id), 18);
    mapRef.current?.animateToRegion(regionAtZoom(cluster, zoom), 300);
  };

  const recentre = async () => {
    const point = await user.locate();
    if (point) mapRef.current?.animateToRegion(regionAtZoom(point, 15), 400);
  };

  // A cafe chosen on the search screen: move the map there, and show its card once it has loaded.
  // This runs when the map is back in front, not when the request is made: the map sits underneath
  // the search screen, and moving a map that is hidden does nothing.
  useFocusEffect(
    useCallback(() => {
      if (!focusRequest) return;
      return moveWhenReady(() =>
        mapRef.current?.animateToRegion(regionAtZoom(focusRequest, 16), 400),
      );
    }, [focusRequest]),
  );

  useEffect(() => {
    if (focusId && focusLoaded) scrollToCard(focusId);
  }, [focusId, focusLoaded, scrollToCard]);

  const distanceTo = (cafe: MapCafe) =>
    user.position ? formatDistance(distanceMetres(user.position, cafe)) : "";

  return (
    <Screen noBottomInset>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text variant="title">{copy.screens.map}</Text>
          <CircleButton
            icon="magnify"
            accessibilityLabel={copy.map.search}
            onPress={() => router.push("/search")}
          />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {METRICS.map((m) => (
            <MetricChip
              key={m}
              metric={m}
              fill
              selected={m === metric}
              onPress={() => setMetric(m)}
            />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {user.ready ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            customMapStyle={scheme === "dark" ? darkMapStyle : lightMapStyle}
            initialRegion={initialRegion}
            onRegionChangeComplete={setRegion}
            showsUserLocation={user.granted}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            mapPadding={{ top: 0, right: 0, bottom: CARD_AREA_HEIGHT, left: 0 }}
          >
            {items.map((item) => {
              const id = item.kind === "cluster" ? `c${item.id}` : item.cafe.id;
              const selected = item.kind === "cafe" && item.cafe.id === activeId;
              return (
                <MapPin
                  // A new key makes the marker draw again, which it does when what it shows changes.
                  key={`${id}-${metric}-${selected ? "s" : ""}-${item.kind === "cluster" ? `${item.count}-${item.best}` : (item.cafe.score ?? "n")}`}
                  item={item}
                  metric={metric}
                  selected={selected}
                  onPressCafe={selectFromPin}
                  onPressCluster={zoomIntoCluster}
                />
              );
            })}
          </MapView>
        ) : null}

        {searching ? (
          <View
            style={{
              position: "absolute",
              top: spacing.md,
              alignSelf: "center",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption" muted>
              {copy.map.findingCafes}
            </Text>
          </View>
        ) : null}

        <View
          style={{ position: "absolute", right: spacing.lg, bottom: CARD_AREA_HEIGHT + spacing.md }}
        >
          <CircleButton
            icon="crosshairs-gps"
            accessibilityLabel={copy.map.recentre}
            onPress={() => void recentre()}
          />
        </View>

        <View
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: CARD_AREA_HEIGHT }}
        >
          {cards.length > 0 ? (
            <FlatList
              ref={listRef}
              horizontal
              data={cards}
              keyExtractor={(cafe) => cafe.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={interval}
              decelerationRate="fast"
              snapToAlignment="start"
              onMomentumScrollEnd={onCardsScrollEnd}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                gap: CARD_GAP,
                paddingBottom: spacing.md,
              }}
              renderItem={({ item: cafe }) => (
                <CafeCard
                  cafe={cafe}
                  selected={cafe.id === activeId}
                  width={cardWidth}
                  distance={distanceTo(cafe)}
                  onPress={() => router.push({ pathname: "/cafe/[id]", params: { id: cafe.id } })}
                />
              )}
            />
          ) : cafesQuery.isError ? (
            <View
              style={{
                marginHorizontal: spacing.lg,
                marginBottom: spacing.md,
                padding: spacing.lg,
                gap: spacing.sm,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="heading">{copy.map.loadError}</Text>
              <Text muted>{copy.map.loadErrorBody}</Text>
              <Button
                variant="secondary"
                label={copy.map.retry}
                onPress={() => void cafesQuery.refetch()}
              />
            </View>
          ) : (
            <View
              style={{
                marginHorizontal: spacing.lg,
                marginBottom: spacing.md,
                padding: spacing.lg,
                gap: spacing.xs,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="heading">{copy.map.noCafes}</Text>
              <Text muted>{copy.map.noCafesBody}</Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
