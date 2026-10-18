import { Tabs } from "expo-router/js-tabs";
import { AppTabBar } from "@/components/AppTabBar";
import { copy } from "@/lib/copy/en";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="map" options={{ title: copy.tabs.map }} />
      <Tabs.Screen name="saved" options={{ title: copy.tabs.saved }} />
      <Tabs.Screen name="rate" options={{ title: copy.tabs.rate }} />
      <Tabs.Screen name="profile" options={{ title: copy.tabs.profile }} />
    </Tabs>
  );
}
