import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { SignedImage } from "@/features/cafe/Photos";
import { DrinkChips, RatingTiles } from "@/features/cafe/ReviewParts";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { isOverdue, shortAge } from "./moderation";
import { Header, Message, Pill } from "./ModerationParts";
import type { BannedUser, QueueItem, QueueTab } from "./types";

const TABS: QueueTab[] = ["open", "hidden", "banned"];

type Props = {
  tab: QueueTab;
  onChangeTab: (tab: QueueTab) => void;
  /** Null until the count has loaded. */
  openCount: number | null;
  /** The Open or Hidden list. Undefined while loading, and on the Banned tab. */
  items: QueueItem[] | undefined;
  /** The Banned list. Undefined while loading, and on the other tabs. */
  banned: BannedUser[] | undefined;
  failed: boolean;
  now: Date;
  onBack: () => void;
  onRetry: () => void;
  onOpenReview: (item: QueueItem) => void;
  onUnban: (user: BannedUser) => void;
};

/** The report queue: open reports oldest first, hidden reviews, and banned people. */
export function QueueView(props: Props) {
  const { colors } = useTheme();
  const text = copy.moderation.queue;
  const rows = props.tab === "banned" ? props.banned : props.items;

  let body;
  if (!rows) {
    body = props.failed ? (
      <Message text={text.loadError}>
        <Button label={text.retry} onPress={props.onRetry} />
      </Message>
    ) : (
      <View style={{ paddingTop: spacing.xxl }}>
        <ActivityIndicator accessibilityLabel={copy.common.loading} color={colors.primary} />
      </View>
    );
  } else if (rows.length === 0) {
    body = <Message title={text.empty[props.tab].title} text={text.empty[props.tab].body} />;
  } else if (props.tab === "banned") {
    body = (
      <FlatList
        data={props.banned}
        keyExtractor={(user) => user.user_id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}
        renderItem={({ item }) => (
          <BannedRow user={item} now={props.now} onUnban={() => props.onUnban(item)} />
        )}
      />
    );
  } else {
    body = (
      <FlatList
        data={props.items}
        keyExtractor={(item) => item.review_id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}
        renderItem={({ item }) => (
          <QueueCard
            item={item}
            tab={props.tab}
            now={props.now}
            onOpen={() => props.onOpenReview(item)}
          />
        )}
      />
    );
  }

  const summary =
    props.tab === "open"
      ? props.openCount === null
        ? null
        : text.summary.open(props.openCount)
      : text.summary[props.tab];

  return (
    <View style={{ flex: 1 }}>
      <Header title={text.title} onBack={props.onBack} />
      {summary ? (
        <Text muted style={{ paddingHorizontal: spacing.lg }}>
          {summary}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={text.chipsLabel}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}
      >
        {TABS.map((option) => {
          const selected = option === props.tab;
          const label = option === "open" ? text.chips.open(props.openCount) : text.chips[option];
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => props.onChangeTab(option)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.text : colors.border,
              }}
            >
              <Text variant="label" color={selected ? colors.background : colors.text}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {body}
    </View>
  );
}

function QueueCard({
  item,
  tab,
  now,
  onOpen,
}: {
  item: QueueItem;
  tab: QueueTab;
  now: Date;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const text = copy.moderation.queue;
  const photo = item.photos[0];

  // Open: how long the oldest report has waited, red past 24 hours. Hidden: how long ago it was hidden.
  let ageLabel: string | null = null;
  let agePill = null;
  if (tab === "open" && item.oldest_report_at) {
    const age = shortAge(item.oldest_report_at, now);
    const overdue = isOverdue(item.oldest_report_at, now);
    ageLabel = text.ageLabel(age, overdue);
    agePill = <Pill icon="clock-outline" label={age} tone={overdue ? "danger" : "plain"} />;
  } else if (item.hidden_at) {
    const age = shortAge(item.hidden_at, now);
    ageLabel = text.hiddenAge(age);
    agePill = <Pill icon="eye-off-outline" label={age} />;
  }
  const reasons = item.reasons.map((reason) => copy.safety.reasons[reason]).join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text.openReview(item.author_name, item.cafe_name)}
      accessibilityHint={[ageLabel, text.reports(item.report_count), reasons]
        .filter(Boolean)
        .join(". ")}
      onPress={onOpen}
      style={({ pressed }) => ({
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {item.cafe_name}
          </Text>
          <Text muted numberOfLines={1}>
            {text.byAuthor(item.suburb, item.author_name)}
          </Text>
        </View>
        {agePill}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {item.report_count > 0 ? (
          <Pill icon="flag-outline" label={text.reports(item.report_count)} tone="danger" />
        ) : (
          <Pill label={text.noReports} />
        )}
        {reasons ? <Pill label={reasons} /> : null}
      </View>

      <RatingTiles review={item} />

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <DrinkChips drinks={item.drinks} />
          <Text numberOfLines={3}>{item.comment}</Text>
        </View>
        {photo ? (
          <SignedImage
            path={photo.thumb_path ?? photo.path}
            style={{ width: 64, height: 64, borderRadius: radius.md }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function BannedRow({ user, now, onUnban }: { user: BannedUser; now: Date; onUnban: () => void }) {
  const { colors } = useTheme();
  const text = copy.moderation.queue;
  const age = user.banned_at ? shortAge(user.banned_at, now) : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {user.display_name}
        </Text>
        <Text variant="caption" muted>
          {text.bannedLine(user.hidden_count, age)}
        </Text>
        {user.note ? (
          <Text variant="caption" muted numberOfLines={2}>
            {`“${user.note}”`}
          </Text>
        ) : null}
      </View>
      <Button
        label={text.unban}
        variant="secondary"
        accessibilityLabel={text.unbanLabel(user.display_name)}
        onPress={onUnban}
        style={{ minHeight: 44, paddingHorizontal: spacing.lg }}
      />
    </View>
  );
}
