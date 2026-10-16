import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Coffee Rater",
  slug: "coffee-rater",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "coffeerater",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: "com.williamw.cupping",
    config: { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY },
  },
  android: {
    package: "com.williamw.cupping",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-location",
    "expo-image-picker",
    "expo-image",
    "expo-secure-store",
  ],
  owner: "williamwrigleys-team",
  extra: {
    eas: { projectId: "01bbdff4-b2da-4d90-b81e-fcbc7136527a" },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
