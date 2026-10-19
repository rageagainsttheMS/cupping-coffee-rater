import { Stack } from "expo-router";
import { ReviewWizardProvider } from "@/features/review-wizard/ReviewWizardProvider";

// The wizard. Every step replaces the one before it, so this stack only ever holds one screen and
// `router.back()` closes the whole modal. Back between steps is handled by each step's back button.
export default function ReviewLayout() {
  return (
    <ReviewWizardProvider>
      <Stack screenOptions={{ headerShown: false, animation: "fade", gestureEnabled: false }} />
    </ReviewWizardProvider>
  );
}
