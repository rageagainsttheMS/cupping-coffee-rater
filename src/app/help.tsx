import Constants from "expo-constants";
import { router } from "expo-router";
import { Linking, ScrollView, View } from "react-native";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { SettingsGroup, SettingsRow } from "@/features/profile/SettingsList";
import { copy } from "@/lib/copy/en";
import { CONTACT_EMAIL, LEGAL_URLS, openLegal } from "@/lib/links";
import { spacing } from "@/lib/theme/tokens";

export default function HelpScreen() {
  const text = copy.profile.helpScreen;
  const version = Constants.expoConfig?.version ?? "";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <CircleButton
            icon="arrow-left"
            accessibilityLabel={copy.common.back}
            onPress={router.back}
          />
          <Text variant="title" accessibilityRole="header">
            {text.title}
          </Text>
        </View>

        {/* Rows whose address isn't published yet are left out until M9.5 fills them in. */}
        <SettingsGroup>
          {CONTACT_EMAIL ? (
            <SettingsRow
              icon="email-outline"
              label={text.contact}
              onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            />
          ) : null}
          {LEGAL_URLS.terms ? (
            <SettingsRow
              icon="file-document-outline"
              label={text.terms}
              onPress={() => openLegal("terms")}
            />
          ) : null}
          {LEGAL_URLS.privacy ? (
            <SettingsRow
              icon="shield-lock-outline"
              label={text.privacy}
              onPress={() => openLegal("privacy")}
            />
          ) : null}
        </SettingsGroup>

        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">{text.googleTitle}</Text>
          <Text muted>{text.googleBody}</Text>
        </View>

        {version ? <Text muted>{text.version(version)}</Text> : null}
      </ScrollView>
    </Screen>
  );
}
