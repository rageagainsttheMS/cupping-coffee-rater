import { useState } from "react";
import { View } from "react-native";
import { MetricChip } from "@/components/MetricChip";
import { Placeholder } from "@/components/Placeholder";
import { ScoreTile } from "@/components/ScoreTile";
import { TagChip } from "@/components/TagChip";
import { TAGS } from "@/domain/tags";
import { copy } from "@/lib/copy/en";
import { METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { spacing } from "@/lib/theme/tokens";

export default function MapScreen() {
  const [metric, setMetric] = useState<Metric>("coffee");

  // The chips and tiles below are a theme preview. M5 replaces this screen with the map.
  return (
    <Placeholder title={copy.screens.map} milestone="M5" inTabs>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {METRICS.map((m) => (
          <MetricChip key={m} metric={m} selected={m === metric} onPress={() => setMetric(m)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <ScoreTile metric="coffee" score={4.6} count={42} selected={metric === "coffee"} />
        <ScoreTile metric="food" score={3.9} count={12} selected={metric === "food"} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <ScoreTile metric="vibe" score={4.2} count={18} selected={metric === "vibe"} />
        <ScoreTile metric="work" score={null} count={2} selected={metric === "work"} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <TagChip metric="work" label={TAGS.work[0]} count={11} />
        <TagChip metric="vibe" label={TAGS.vibe[2]} />
      </View>
    </Placeholder>
  );
}
