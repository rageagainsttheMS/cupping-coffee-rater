import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { DISPLAY_NAME_MAX } from "@/features/auth/schemas";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/ThemeProvider";
import type { LocationStatus } from "./locationStatus";
import { SettingsGroup, SettingsRow } from "./SettingsList";

type Props = {
  displayName: string;
  email: string;
  /** Null until the first load finishes. */
  reviewCount: number | null;
  cafeCount: number | null;
  savedCount: number | null;
  locationStatus: LocationStatus | null;
  appearance: ThemePreference;
  /** Resolves to true when the name was saved. */
  onSaveName: (name: string) => Promise<boolean>;
  onOpenMyReviews: () => void;
  onOpenSaved: () => void;
  onOpenLocation: () => void;
  onOpenAppearance: () => void;
  onOpenAccount: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  /** Given only to moderators: shows the Moderation group. */
  onOpenModeration?: () => void;
  /** Reviews with open reports. Null until loaded. */
  moderationOpenCount?: number | null;
};

/** The Profile tab: who you are, your activity, settings, and sign out. */
export function ProfileView(props: Props) {
  const { colors, metrics } = useTheme();
  const text = copy.profile;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, gap: spacing.xl }}>
      <Text variant="display" accessibilityRole="header">
        {copy.screens.profile}
      </Text>

      <HeaderCard
        displayName={props.displayName}
        email={props.email}
        onSaveName={props.onSaveName}
      />

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Stat label={text.stats.reviews} value={props.reviewCount} />
        <Stat label={text.stats.cafes} value={props.cafeCount} />
        <Stat label={text.stats.saved} value={props.savedCount} />
      </View>

      <SettingsGroup title={text.activity}>
        <SettingsRow
          icon="star-outline"
          label={text.myReviewsRow}
          value={props.reviewCount === null ? undefined : String(props.reviewCount)}
          onPress={props.onOpenMyReviews}
        />
        <SettingsRow
          icon="heart-outline"
          label={text.savedCafesRow}
          value={props.savedCount === null ? undefined : String(props.savedCount)}
          onPress={props.onOpenSaved}
        />
      </SettingsGroup>

      {props.onOpenModeration ? (
        <SettingsGroup title={copy.moderation.group}>
          <SettingsRow
            icon="shield-check-outline"
            label={copy.moderation.row}
            badge={
              props.moderationOpenCount
                ? copy.moderation.openBadge(props.moderationOpenCount)
                : undefined
            }
            onPress={props.onOpenModeration}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={text.settings}>
        <SettingsRow
          icon="map-marker-outline"
          label={text.location}
          value={props.locationStatus ? text.locationStatus[props.locationStatus] : undefined}
          onPress={props.onOpenLocation}
        />
        <SettingsRow
          icon="theme-light-dark"
          label={text.appearance}
          value={text.appearanceOptions[props.appearance]}
          onPress={props.onOpenAppearance}
        />
        <SettingsRow icon="key-outline" label={text.account} onPress={props.onOpenAccount} />
        <SettingsRow icon="help-circle-outline" label={text.help} onPress={props.onOpenHelp} />
      </SettingsGroup>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.signOut}
        onPress={props.onSignOut}
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <MaterialCommunityIcons name="logout" size={20} color={metrics.vibe.onTint} />
        <Text variant="bodyStrong" color={metrics.vibe.onTint}>
          {text.signOut}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  const { metrics } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={value === null ? label : `${value} ${label}`}
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: metrics.coffee.tint,
      }}
    >
      <Text variant="title">{value === null ? copy.score.empty : value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

type HeaderProps = Pick<Props, "displayName" | "email" | "onSaveName">;

/** The avatar initial, name and email, with an Edit link that turns the name into a text field. */
function HeaderCard({ displayName, email, onSaveName }: HeaderProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const trimmed = draft.trim();

  const save = async () => {
    if (!trimmed) return;
    if (trimmed === displayName) return setEditing(false);
    setSaving(true);
    const saved = await onSaveName(trimmed);
    setSaving(false);
    if (saved) setEditing(false);
  };

  return (
    <View
      style={{
        gap: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <View
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
        >
          <Text variant="title" color={colors.onPrimary}>
            {displayName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {displayName}
          </Text>
          <Text muted numberOfLines={1}>
            {email}
          </Text>
        </View>
        {editing ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.profile.edit}
            onPress={() => {
              setDraft(displayName);
              setEditing(true);
            }}
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
          >
            <Text variant="label" color={colors.primary}>
              {copy.profile.edit}
            </Text>
          </Pressable>
        )}
      </View>
      {editing ? (
        <View style={{ gap: spacing.md }}>
          <TextField
            label={copy.profile.nameLabel}
            value={draft}
            onChangeText={setDraft}
            maxLength={DISPLAY_NAME_MAX}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label={copy.profile.cancel}
                variant="secondary"
                onPress={() => setEditing(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={copy.profile.save}
                busy={saving}
                disabled={!trimmed}
                onPress={() => void save()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
