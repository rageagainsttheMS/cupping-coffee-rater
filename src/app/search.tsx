import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { formatDistance } from "@/features/map/cards";
import { distanceMetres } from "@/features/map/geo";
import { useMapFilters } from "@/features/map/MapFiltersContext";
import { useUserLocation } from "@/features/map/useUserLocation";
import { copy } from "@/lib/copy/en";
import { usePlacesSearch } from "@/lib/places";
import { supabase } from "@/lib/supabase";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type SearchResult = {
  id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

const MIN_STORED_LENGTH = 2;
const MIN_GOOGLE_LENGTH = 3;

/** Search cafes we already hold, with a row to search Google when the cafe is not there yet. */
export default function SearchScreen() {
  const { colors } = useTheme();
  const { requestFocus } = useMapFilters();
  const { position } = useUserLocation();
  const queryClient = useQueryClient();
  const google = usePlacesSearch();
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), 250);
  const text_ = copy.search;

  const searchKey = ["search-cafes", query, position?.lat, position?.lng];
  const results = useQuery({
    queryKey: searchKey,
    enabled: query.length >= MIN_STORED_LENGTH,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.rpc("search_cafes", {
        p_q: query,
        p_lat: position?.lat,
        p_lng: position?.lng,
      });
      if (error) throw error;
      return data as unknown as SearchResult[];
    },
  });

  const pick = (cafe: SearchResult) => {
    requestFocus({ id: cafe.id, lat: cafe.lat, lng: cafe.lng });
    router.back();
  };

  const searchGoogle = () =>
    google.mutate(
      { query, lat: position?.lat, lng: position?.lng },
      // The function stores what it finds, so searching our own cafes again now includes them.
      { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["search-cafes"] }) },
    );

  const typed = text.trim().length;
  const showGoogleRow = query.length >= MIN_GOOGLE_LENGTH && typed >= MIN_GOOGLE_LENGTH;
  const rows = results.data ?? [];
  const emptyResults =
    query.length >= MIN_STORED_LENGTH &&
    results.isSuccess &&
    rows.length === 0 &&
    !google.isPending;

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <CircleButton
          icon="chevron-left"
          accessibilityLabel={copy.common.back}
          onPress={() => router.back()}
        />
        <TextInput
          autoFocus
          accessibilityLabel={text_.placeholder}
          placeholder={text_.placeholder}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          returnKeyType="search"
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 44,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
          }}
        />
      </View>

      <FlatList
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(cafe) => cafe.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        ListHeaderComponent={
          typed < MIN_STORED_LENGTH ? (
            <Text muted style={{ paddingVertical: spacing.md }}>
              {text_.hint}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => pick(item)}
            style={{
              minHeight: 56,
              justifyContent: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {copy.map.suburbAndDistance(
                item.suburb ?? "",
                position ? formatDistance(distanceMetres(position, item)) : "",
              )}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
            {emptyResults ? (
              <View style={{ gap: spacing.xs }}>
                <Text variant="heading">{text_.noResults}</Text>
                <Text muted>{text_.noResultsBody}</Text>
              </View>
            ) : null}
            {showGoogleRow ? (
              <Pressable
                accessibilityRole="button"
                disabled={google.isPending}
                onPress={searchGoogle}
                style={{
                  minHeight: 56,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Text variant="bodyStrong" color={colors.primary} style={{ flex: 1 }}>
                  {google.isPending ? text_.googleSearching : text_.googleRow(query)}
                </Text>
                {google.isPending ? <ActivityIndicator color={colors.primary} /> : null}
              </Pressable>
            ) : null}
            {google.isError ? (
              <Text variant="label" color={colors.danger}>
                {text_.error}
              </Text>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}
