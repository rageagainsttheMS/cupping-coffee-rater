import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { usePlacesSearch } from "@/lib/places";
import { supabase } from "@/lib/supabase";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { formatDistance } from "./cards";
import { distanceMetres } from "./geo";
import type { Point } from "./types";

export type SearchResult = {
  id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

const MIN_STORED_LENGTH = 2;
const MIN_GOOGLE_LENGTH = 3;

type Props = {
  onPick: (cafe: SearchResult) => void;
  /** The person's position, if known: results are nearest first and show a distance. */
  position: Point | null;
  /** Shown before the search box, e.g. a back button. */
  leading?: ReactNode;
};

/**
 * Search cafes we already hold, with a row to search Google when the cafe is not there yet. Used by
 * the map's search screen and by step 1 of the review wizard.
 */
export function CafeSearchPanel({ onPick, position, leading }: Props) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const google = usePlacesSearch();
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), 250);
  const strings = copy.search;

  const results = useQuery({
    queryKey: ["search-cafes", query, position?.lat, position?.lng],
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
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        {leading}
        <TextInput
          autoFocus
          accessibilityLabel={strings.placeholder}
          placeholder={strings.placeholder}
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
              {strings.hint}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick(item)}
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
                <Text variant="heading">{strings.noResults}</Text>
                <Text muted>{strings.noResultsBody}</Text>
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
                  {google.isPending ? strings.googleSearching : strings.googleRow(query)}
                </Text>
                {google.isPending ? <ActivityIndicator color={colors.primary} /> : null}
              </Pressable>
            ) : null}
            {google.isError ? (
              <Text variant="label" color={colors.danger}>
                {strings.error}
              </Text>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
