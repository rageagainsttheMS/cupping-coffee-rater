import { View } from "react-native";
import { ScoreTile } from "@/components/ScoreTile";
import { METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { spacing } from "@/lib/theme/tokens";
import { googleFallbackRating } from "./format";
import type { CafeScores } from "./types";

type Props = {
  scores: CafeScores;
  selected: Metric;
  onSelect: (metric: Metric) => void;
  /** The live Google rating, used on the Coffee tile only while it has no community score. */
  googleRating: number | null | undefined;
};

/** The four score tiles. Tapping one selects it, which filters everything below. */
export function CafeScoreRow({ scores, selected, onSelect, googleRating }: Props) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {METRICS.map((metric) => {
        const { score, count } = scores[metric];
        return (
          <ScoreTile
            key={metric}
            metric={metric}
            score={score}
            count={count}
            selected={metric === selected}
            googleRating={googleFallbackRating(metric, score, count, {
              rating: googleRating ?? null,
            })}
            onPress={() => onSelect(metric)}
          />
        );
      })}
    </View>
  );
}
