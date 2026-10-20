import { TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { COMMENT_MAX, COMMENT_MIN } from "@/domain/limits";
import { METRICS } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { canContinue, commentLength } from "@/features/review-wizard/steps";
import { useSaveEdit } from "@/features/review-wizard/useSaveEdit";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

/** Step 5. A few words, 10 to 280 characters, under pills showing what was rated. */
export default function CommentStep() {
  const { colors, metrics } = useTheme();
  const { values, drinks, setComment, goNext, editing } = useWizard();
  const saveEdit = useSaveEdit();
  const length = commentLength(values.comment);
  const firstDrink = drinks.find((d) => d.id === values.drinks[0]?.drinkId)?.name ?? "";

  // Pills: each drink's rating, then Food, Vibe and Work if they were rated.
  const pills = [
    ...values.drinks.flatMap((d) => {
      const name = drinks.find((x) => x.id === d.drinkId)?.name;
      return name && d.rating !== null
        ? [
            {
              key: `drink-${d.drinkId}`,
              metric: "coffee" as const,
              text: `${name} ${d.rating.toFixed(1)}`,
            },
          ]
        : [];
    }),
    ...METRICS.filter((m) => m !== "coffee").flatMap((m) => {
      const rating = values[m as "food" | "vibe" | "work"];
      return rating === null
        ? []
        : [{ key: m, metric: m, text: `${copy.metrics[m].label} ${rating.toFixed(1)}` }];
    }),
  ];

  return (
    <WizardScreen
      step="comment"
      title={copy.review.comment.title}
      canContinue={canContinue("comment", values, 0)}
      continueLabel={editing ? copy.review.edit.saveChanges : undefined}
      busy={editing ? saveEdit.isPending : undefined}
      onContinue={() => (editing ? saveEdit.save() : goNext("comment"))}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {pills.map((pill) => (
          <View
            key={pill.key}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radius.pill,
              backgroundColor: metrics[pill.metric].tint,
            }}
          >
            <Text variant="label" color={metrics[pill.metric].onTint}>
              {pill.text}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.xs }}>
        <TextInput
          multiline
          autoFocus
          maxLength={COMMENT_MAX}
          accessibilityLabel={copy.review.comment.title}
          placeholder={copy.review.comment.placeholder(firstDrink, values.work !== null)}
          placeholderTextColor={colors.textMuted}
          value={values.comment}
          onChangeText={setComment}
          textAlignVertical="top"
          style={{
            minHeight: 140,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 22,
          }}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            variant="caption"
            color={length > 0 && length < COMMENT_MIN ? colors.danger : colors.textMuted}
          >
            {length > 0 && length < COMMENT_MIN ? copy.review.comment.tooShort(COMMENT_MIN) : " "}
          </Text>
          <Text variant="caption" muted>
            {copy.review.comment.counter(length, COMMENT_MAX)}
          </Text>
        </View>
      </View>
    </WizardScreen>
  );
}
