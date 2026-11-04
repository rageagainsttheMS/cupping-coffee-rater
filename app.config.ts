import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Cupping",
  slug: "coffee-rater",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "coffeerater",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.williamw.cupping",
    usesAppleSignIn: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
      // Only HTTPS and expo-crypto hashing, both exempt, so EAS doesn't ask on every build.
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.williamw.cupping",
    adaptiveIcon: {
      backgroundColor: "#F2E3CF",
      foregroundImage: "./assets/images/adaptive-foreground.png",
      backgroundImage: "./assets/images/adaptive-background.png",
      monochromeImage: "./assets/images/adaptive-monochrome.png",
    },
    // Only what the app uses. CAMERA is needed for requestCameraPermissionsAsync to be able to say yes.
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA"],
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
      "android.permission.RECORD_AUDIO",
      // No ads, and the Play Console declaration says the app doesn't use the advertising ID.
      "com.google.android.gms.permission.AD_ID",
    ],
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
        // The cream of the light theme, so the splash hands over to the app without a flash.
        backgroundColor: "#FBF6EE",
        image: "./assets/images/splash-icon.png",
        imageWidth: 240,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Cupping - Coffee Rater uses your location to show cafes near you and to mark your reviews as verified visits.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Cupping - Coffee Rater uses your photos so you can add one to a review.",
        cameraPermission:
          "Cupping - Coffee Rater uses your camera so you can add a photo to a review.",
        // The app never records audio, so don't ask for the microphone permission.
        microphonePermission: false,
      },
    ],
    "expo-image",
    "expo-status-bar",
    "expo-web-browser",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-build-properties",
      {
        // R8 stripped a class WorkManager (pulled in by react-native-maps) needs, so release builds
        // crashed on launch. Turn this back on only with keep rules and a release build that opens.
        android: {
          enableMinifyInReleaseBuilds: false,
          // Test builds only run on a phone, so build arm64 alone. Faster, and a smaller APK. Production
          // keeps every architecture. (EAS sets EAS_BUILD_PROFILE; local builds use the default.)
          ...(process.env.EAS_BUILD_PROFILE === "development" ||
          process.env.EAS_BUILD_PROFILE === "preview"
            ? { buildArchs: ["arm64-v8a"] }
            : {}),
        },
      },
    ],
    // Crash reporting. Source maps upload during EAS builds when SENTRY_AUTH_TOKEN is set.
    ["@sentry/react-native/expo", { organization: "williamw", project: "cupping" }],
    // Google sign-in. The plugin only adds the iOS URL scheme (Android needs nothing from it) and
    // throws without one, so it is included once GOOGLE_IOS_URL_SCHEME is set for iOS builds.
    ...(process.env.GOOGLE_IOS_URL_SCHEME
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],
  // Over-the-air updates (`eas update --channel preview`). A build only takes updates with the same
  // runtime version, so bump `version` whenever a change needs a new native build.
  runtimeVersion: { policy: "appVersion" },
  updates: { url: "https://u.expo.dev/01bbdff4-b2da-4d90-b81e-fcbc7136527a" },
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
