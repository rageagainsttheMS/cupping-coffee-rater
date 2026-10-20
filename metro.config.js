const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname, {
  // Reports render errors caught by Expo Router's per-route ErrorBoundary exports.
  autoWrapExpoRouterErrorBoundary: true,
});

module.exports = config;
