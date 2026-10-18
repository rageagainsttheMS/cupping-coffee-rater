import { Redirect } from "expo-router";

// Auth and onboarding redirects arrive in M4. Until then the app opens on the map.
export default function Index() {
  return <Redirect href="/map" />;
}
