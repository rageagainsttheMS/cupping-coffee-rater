import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Dots } from "@/components/Dots";
import { LinkText } from "@/components/LinkText";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { METRICS } from "@/domain/metrics";
import { useOnboarding } from "@/features/auth/OnboardingProvider";
import { MapIllustration } from "@/features/onboarding/MapIllustration";
import { MetricInfoCard } from "@/features/onboarding/MetricInfoCard";
import { SampleOrderCard } from "@/features/onboarding/SampleOrderCard";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";

const PAGES = 3;

/** The pitch: three pages, then create an account. Skipping never goes past sign-up. */
export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const { markOnboardingSeen } = useOnboarding();
  const text = copy.onboarding;

  const goTo = (index: number) => {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  // The pitch counts as seen once the person leaves it, whichever way.
  const leaveTo = (href: "/sign-up" | "/sign-in") => {
    markOnboardingSeen();
    router.replace(href);
  };

  const pageStyle = { width, flex: 1, paddingHorizontal: spacing.xl, gap: spacing.lg };
  const header = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <CircleButton
        icon="chevron-left"
        accessibilityLabel={copy.common.back}
        onPress={() => goTo(Math.max(0, page - 1))}
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => leaveTo("/sign-up")}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text variant="label" muted>
          {copy.common.skip}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}
      >
        <View style={pageStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <AppLogo size={32} />
            <Text variant="heading">{copy.common.appName}</Text>
          </View>
          <MapIllustration />
          <Text variant="display">{text.welcome.title}</Text>
          <Text muted>{text.welcome.body}</Text>
          <View style={{ flex: 1 }} />
          <Dots count={PAGES} active={0} />
          <Button variant="dark" label={text.welcome.getStarted} onPress={() => goTo(1)} />
          <View style={{ alignItems: "center", paddingBottom: spacing.sm }}>
            <LinkText onPress={() => leaveTo("/sign-in")}>{text.welcome.haveAccount}</LinkText>
          </View>
        </View>

        <View style={pageStyle}>
          {header}
          <Text variant="display">{text.scores.title}</Text>
          <Text muted>{text.scores.body}</Text>
          <View style={{ gap: spacing.md }}>
            {METRICS.map((metric) => (
              <MetricInfoCard key={metric} metric={metric} detail={text.scores[metric]} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Dots count={PAGES} active={1} />
          <Button variant="dark" label={copy.common.next} onPress={() => goTo(2)} />
        </View>

        <View style={pageStyle}>
          {header}
          <Text variant="display">{text.drink.title}</Text>
          <Text muted>{text.drink.body}</Text>
          <SampleOrderCard />
          <Text variant="label" muted style={{ textAlign: "center" }}>
            {text.drink.footnote}
          </Text>
          <View style={{ flex: 1 }} />
          <Dots count={PAGES} active={2} />
          <Button label={text.drink.createAccount} onPress={() => leaveTo("/sign-up")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
