import { router } from "expo-router";
import { Alert, Linking } from "react-native";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIsModerator, useModerationOpenCount } from "@/features/moderation/useModeration";
import { ProfileView } from "@/features/profile/ProfileView";
import { reviewStats } from "@/features/profile/myReviews";
import { useLocationStatus } from "@/features/profile/useLocationStatus";
import { useMyReviews } from "@/features/profile/useMyReviews";
import { useUpdateDisplayName } from "@/features/profile/useUpdateDisplayName";
import { useSavedCafes } from "@/features/saved/useSavedCafes";
import { copy } from "@/lib/copy/en";
import { useThemePreference } from "@/lib/theme/ThemeProvider";

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const reviews = useMyReviews();
  const saved = useSavedCafes();
  const locationStatus = useLocationStatus();
  const updateName = useUpdateDisplayName();
  const { preference } = useThemePreference();
  const isModerator = useIsModerator().data === true;
  const openCount = useModerationOpenCount(isModerator);
  const stats = reviews.data ? reviewStats(reviews.data) : null;

  return (
    <Screen noBottomInset>
      <ProfileView
        displayName={profile?.display_name ?? ""}
        email={session?.user.email ?? ""}
        reviewCount={stats?.reviews ?? null}
        cafeCount={stats?.cafes ?? null}
        savedCount={saved.data?.length ?? null}
        locationStatus={locationStatus}
        appearance={preference}
        onSaveName={async (name) => {
          try {
            await updateName.mutateAsync(name);
            return true;
          } catch {
            Alert.alert(copy.profile.nameSaveFailed);
            return false;
          }
        }}
        onOpenMyReviews={() => router.push("/my-reviews")}
        onOpenSaved={() => router.navigate("/saved")}
        onOpenLocation={() => void Linking.openSettings()}
        onOpenAppearance={() => router.push("/appearance")}
        onOpenAccount={() => router.push("/account")}
        onOpenHelp={() => router.push("/help")}
        onSignOut={() => void signOut()}
        onOpenModeration={isModerator ? () => router.push("/moderation") : undefined}
        moderationOpenCount={openCount.data ?? null}
      />
    </Screen>
  );
}
