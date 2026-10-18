import { Redirect } from "expo-router";

// The tab bar's "+ Rate" button opens the review modal directly. This only runs on a deep link.
export default function RateScreen() {
  return <Redirect href="/review" />;
}
