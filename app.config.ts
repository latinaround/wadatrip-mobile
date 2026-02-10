import "dotenv/config";

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:3000";
const apiFallbackUrl = process.env.EXPO_PUBLIC_API_FALLBACK_URL || "https://alerts.dev.wadatrip.com";
const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";
const showBypassBanner = process.env.EXPO_PUBLIC_SHOW_BYPASS_BANNER === "true";
const minimalNav = process.env.EXPO_PUBLIC_MINIMAL_NAV === "true";
const disablePaper = process.env.EXPO_PUBLIC_DISABLE_PAPER === "true";

export default ({ config }: { config: Record<string, any> }) => ({
  ...config,
  name: "WadaTrip Mobile",
  slug: "wadatrip-mobile",
  version: "1.0.3",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.wadatrip.mobile",
    usesAppleSignIn: true,
    infoPlist: {
      NSUserTrackingUsageDescription: "WadaTrip usa esta informacion para mejorar tu experiencia de viaje.",
      UIBackgroundModes: ["remote-notification"],
      NSLocationWhenInUseUsageDescription: "We use your location to tag community posts and show them on the map.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    versionCode: 3,
    package: "com.kiaradiaz0249.wadatripweb",
    permissions: [
      "INTERNET",
      "NOTIFICATIONS",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  scheme: "wadatrip",
  plugins: [
    "expo-apple-authentication",
    "expo-font",
    "expo-localization",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ff6600",
      },
    ],
  ],
  extra: {
    auth: {
      webClientId: "981114942208-d39vpc1hmisismpl48b24iiilqql7fkf.apps.googleusercontent.com",
      androidClientId: "981114942208-70ds765g081l3o55va1rrupo83s36pqf.apps.googleusercontent.com",
      iosClientId: "",
    },
    firebase: {
      apiKey: "AIzaSyDLET2NxvDDnw5AqP9Ton1WVo1tSt0U8XA",
      authDomain: "wadatrip-nuevo.firebaseapp.com",
      projectId: "wadatrip-nuevo",
      storageBucket: "wadatrip-nuevo.firebasestorage.app",
      messagingSenderId: "981114942208",
      appId: "1:981114942208:android:2f3d99c98c0785995cf9e5",
    },
    stripe: {
      publishableKey,
    },
    eas: {
      projectId: "b79e31bd-c5f5-41fa-86a5-c456870090d3",
    },
    API_BASE_URL: apiBaseUrl,
    API_FALLBACK_URL: apiFallbackUrl,
    HTTP_TIMEOUT_MS: 10000,
    BYPASS_AUTH: bypassAuth,
    SHOW_BYPASS_BANNER: showBypassBanner,
    MINIMAL_NAV: minimalNav,
    DISABLE_PAPER: disablePaper,
  },
});
