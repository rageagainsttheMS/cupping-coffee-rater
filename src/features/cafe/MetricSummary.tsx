import { useState } from "react";
import { Pressable, View } from "react-native";
import { TagChip } from "@/components/TagChip";
import { Text } from "@/components/Text";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Card } from "./Section";
import { TAG_PREVIEW_COUNT, tagsForMetric } from "./format";
import type { CafeTag } from "./types";

type Props = { metric: Metric; reviewCount: number; tags: readonly CafeTag[] };

/** "Work · 12 reviews" with the metric's most reported tags and a "Show all". */
export function MetricSummary({ metric, reviewCount, tags }: Props) {
  const { metrics } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const all = tagsForMetric(tags, metric);
  const shown = expanded ? all : all.slice(0, TAG_PREVIEW_COUNT);

  return (
    <Card>
      <Text variant="heading" color={metrics[metric].onTint}>
        {copy.cafe.reviewCount(copy.metrics[metric].label, reviewCount)}
      </Text>
      {all.length === 0 ? (
        <Text muted>{copy.cafe.noTags}</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {shown.map((tag) => (
            <TagChip key={tag.tag_id} label={tag.label} count={tag.count} metric={metric} />
          ))}
        </View>
      )}
      {all.length > TAG_PREVIEW_COUNT ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((open) => !open)}
          style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }}
        >
          <Text variant="label" color={metrics[metric].onTint}>
            {expanded ? copy.cafe.showFewer : copy.cafe.showAll}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
