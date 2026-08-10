// App.js
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ActivityIndicator, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants from 'expo-constants';
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import "./src/i18n";
import i18n from "./src/i18n";
import { resolveAppLanguage } from "./src/services/language";

import { auth, requestForToken, setupNotificationListeners } from "./src/services/firebase";
import { clearStoredAppSession, getCurrentAppUser, hydrateStoredAppSession, saveGatewaySession, subscribeAppSession } from "./src/services/appSession";
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { exchangeFirebaseToken, registerExpoPushToken } from "./src/lib/api";
// Dev override de API_BASE_URL por IP LAN (útil cuando 10.0.2.2 no funciona)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // Removed global.API_BASE_URL override; use env/extra/defaults
}

// Screens
import ItineraryScreen from "./src/screens/ItineraryScreen";
import FlightsScreen from "./src/screens/FlightsScreen";
import MyAlertsScreen from "./src/screens/MyAlertsScreen";
import ToursScreen from "./src/screens/ToursScreen";
import TourDetailScreen from "./src/screens/TourDetailScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import CommunityMapScreen from "./src/screens/CommunityMapScreen";
import CommunityInsightsScreen from "./src/screens/CommunityInsightsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ReserveBookingScreen from "./src/screens/ReserveBookingScreen";
import BookingSuccessScreen from "./src/screens/BookingSuccessScreen";
import BookingDetailScreen from "./src/screens/BookingDetailScreen";
import ProviderSignupScreen from "./src/screens/ProviderSignupScreen";
import CreateListingScreen from "./src/screens/CreateListingScreen";
import AuthScreen from "./src/screens/AuthScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import WadaAgent from "./src/components/WadaAgent";
import { brand } from "./src/theme/brand";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const HeaderBackground = () => {
  if (LinearGradient) {
    return (
      <LinearGradient
        colors={brand.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: brand.colors.heroStart }]} />;
};

// Evita pasar undefined a Navigator
const ensureScreen = (Comp, name) => {
  const isFunction = typeof Comp === "function";
  const isReactType = Comp && typeof Comp === "object" && (Comp.$$typeof || Comp.render);
  if (!isFunction && !isReactType) {
    console.error(`Screen invalid: ${name}`, { type: typeof Comp, value: Comp });
    return () => <View />;
  }
  return Comp;
};

const stackHeaderOptions = (title, extra = {}) => ({
  headerShown: true,
  title,
  headerBackTitleVisible: false,
  headerTintColor: "#ffffff",
  headerBackground: () => <HeaderBackground />,
  headerTitleStyle: { color: "#ffffff", fontWeight: "700" },
  ...extra,
});

export default function App() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      // Logs de diagnóstico para detectar navegadores indefinidos
      // eslint-disable-next-line no-console
      console.log('[DBG] Stack object:', typeof Stack, 'Navigator:', typeof Stack?.Navigator, 'Screen:', typeof Stack?.Screen);
      // eslint-disable-next-line no-console
      console.log('[DBG] Tab object:', typeof Tab, 'Navigator:', typeof Tab?.Navigator, 'Screen:', typeof Tab?.Screen);
    } catch {}
  }
  const [loading, setLoading] = useState(true);
  const [languageReady, setLanguageReady] = useState(false);
  const [bootError, setBootError] = useState("");
  const [user, setUser] = useState(null);

  const extra = (Constants && Constants.expoConfig && Constants.expoConfig.extra) || {};
  const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true" || extra.BYPASS_AUTH === true;
  const showBypassBanner = process.env.EXPO_PUBLIC_SHOW_BYPASS_BANNER === "true" || extra.SHOW_BYPASS_BANNER === true;
  const minimalNav = process.env.EXPO_PUBLIC_MINIMAL_NAV === "true" || extra.MINIMAL_NAV === true;
  const disablePaper = process.env.EXPO_PUBLIC_DISABLE_PAPER === "true" || extra.DISABLE_PAPER === true;
  const useSimpleFlights =
    (typeof process !== "undefined" &&
      process.env &&
      Object.prototype.hasOwnProperty.call(process.env, "EXPO_PUBLIC_SIMPLE_FLIGHTS"))
      ? process.env.EXPO_PUBLIC_SIMPLE_FLIGHTS === "true"
      : false;

  // Habilita solo los tabs necesarios mientras aíslas problemas
  const TABS = {
    Flights: true,
    Itinerary: true,
    MyAlerts: true,
    ToursDeals: false,
    Community: true,
  };

  // Sesión Firebase
  useEffect(() => {
    if (bypassAuth) {
      setUser({ uid: "dev-bypass", email: "dev@local" });
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
          try {
            const firebaseIdToken = await u.getIdToken();
            const gatewaySession = await exchangeFirebaseToken(firebaseIdToken);
            await saveGatewaySession({
              token: gatewaySession?.token,
              user: { ...gatewaySession?.user, uid: u.uid, authSource: 'firebase' },
            }, 'firebase');
            const expoToken = await requestForToken();
            if (expoToken) await registerExpoPushToken(expoToken, Platform.OS);
            setUser(u);
          } catch (error) {
            console.error('[AUTH] Could not establish gateway session:', error);
            setBootError('Could not connect your account. Please try again.');
            setUser(null);
          }
          setLoading(false);
          return;
        }
        const session = await hydrateStoredAppSession();
        if (session?.kind === 'guide_code') {
          setUser(session.user);
        } else {
          await clearStoredAppSession();
          setUser(null);
        }
        setLoading(false);      });
      return unsubscribe;
    } catch (e) {
      console.error("[BOOT] Auth init failed:", e);
      setBootError("Auth init failed");
      setLoading(false);
      return undefined;
    }
  }, [bypassAuth]);

  // Watchdog: avoid a dead startup if Firebase Auth is slow on a device/emulator.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      console.error("[BOOT] Timeout waiting for auth state");
      setUser(null);
      setLoading(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Mantener actualizado el token de Firebase para llamadas al backend
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      try {
        if (u && typeof u.getIdToken === 'function') {
          const firebaseIdToken = await u.getIdToken(true);
          const gatewaySession = await exchangeFirebaseToken(firebaseIdToken);
          await saveGatewaySession({
            token: gatewaySession?.token,
            user: { ...gatewaySession?.user, uid: u.uid, authSource: 'firebase' },
          }, 'firebase');
        } else if (!getCurrentAppUser()) {
          try { global.AUTH_TOKEN = undefined; } catch {}
        }
      } catch {}
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAppSession((session) => {
      if (!auth.currentUser) {
        setUser(session?.user || null);
      }
    });
    return unsubscribe;
  }, []);

  // Notificaciones push
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        // Do not block first launch with permission prompts.
        // Request the push token later from an alerts/settings action.
        const unsubscribe = setupNotificationListeners();
        return unsubscribe;
      } catch {}
    }
  }, []);

  // Resolve language before rendering app UI:
  // saved preference > device language > fallback
  useEffect(() => {
    (async () => {
      try {
        const resolved = await resolveAppLanguage();
        if (resolved && i18n.language !== resolved) {
          await i18n.changeLanguage(resolved);
        }
      } catch {}
      setLanguageReady(true);
    })();
  }, []);

  // Placeholder para aislar Flights
  const SimpleFlights = () => (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>Flights Placeholder</Text>
    </View>
  );
  const FlightsComp = useSimpleFlights ? SimpleFlights : ensureScreen(FlightsScreen, "FlightsScreen");

  const SafePaperProvider = ({ children }) => {
    if (!disablePaper && typeof PaperProvider === "function") {
      return <PaperProvider>{children}</PaperProvider>;
    }
    return <>{children}</>;
  };

  if (loading || !languageReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00bfa6" />
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 6 }}>Startup error</Text>
        <Text style={{ color: "#6c757d", textAlign: "center", paddingHorizontal: 24 }}>{bootError}</Text>
        <Text style={{ color: "#6c757d", textAlign: "center", paddingHorizontal: 24, marginTop: 6 }}>
          If this persists, reinstall or contact support.
        </Text>
      </View>
    );
  }

  // Modo mínimo para aislar errores base
  if (minimalNav) {
    const Simple = () => (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18 }}>WadaTrip Minimal Nav OK</Text>
      </View>
    );
    return (
      <SafePaperProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Simple" component={Simple} options={{ title: "Simple" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafePaperProvider>
    );
  }

  return (
    <SafePaperProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar backgroundColor={brand.colors.heroStart} barStyle="light-content" />
        {(!Stack?.Navigator || !Tab?.Navigator) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <View style={{ height: 12 }} />
            <Text>Navigator not ready</Text>
            <Text style={{ marginTop: 8, fontSize: 12, color: '#6c757d' }}>Check React Navigation versions/alignment</Text>
          </View>
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animationEnabled: true,
              headerBackTitleVisible: false,
              headerTitleAlign: "center",
              headerTintColor: "#ffffff",
              headerTitleStyle: { fontWeight: "700", color: "#ffffff" },
              headerShadowVisible: false,
              headerBackground: () => <HeaderBackground />,
            }}
          >
            {!user ? (
              <Stack.Screen name="Login" component={ensureScreen(AuthScreen, "AuthScreen")} options={{ headerShown: false }} />
            ) : (
              <>
                <Stack.Screen name="Home" component={ensureScreen(HomeScreen, "HomeScreen")} options={{ headerShown: false }} />
                <Stack.Screen name="Flights" component={FlightsComp} options={stackHeaderOptions('Flights')} />
                <Stack.Screen name="Itinerary" component={ensureScreen(ItineraryScreen, "ItineraryScreen")} options={stackHeaderOptions('Itinerary')} />
                <Stack.Screen name="MyAlerts" component={ensureScreen(MyAlertsScreen, "MyAlertsScreen")} options={stackHeaderOptions('My Alerts')} />
                <Stack.Screen name="Community" component={ensureScreen(CommunityScreen, "CommunityScreen")} options={stackHeaderOptions('Community')} />
                <Stack.Screen name="CommunityMap" component={ensureScreen(CommunityMapScreen, "CommunityMapScreen")} options={stackHeaderOptions('Community map')} />
                <Stack.Screen name="CommunityInsights" component={ensureScreen(CommunityInsightsScreen, "CommunityInsightsScreen")} options={stackHeaderOptions('Community insights')} />
                <Stack.Screen name="ToursDeals" component={ensureScreen(ToursScreen, "ToursScreen")} options={stackHeaderOptions('Explore')} />
                <Stack.Screen name="TourDetail" component={ensureScreen(TourDetailScreen, "TourDetailScreen")} options={stackHeaderOptions('Tour details')} />
                <Stack.Screen name="Reserve" component={ensureScreen(ReserveBookingScreen, "ReserveBookingScreen")} options={stackHeaderOptions('Reserve Tour')} />
                <Stack.Screen name="BookingSuccess" component={ensureScreen(BookingSuccessScreen, "BookingSuccessScreen")} options={stackHeaderOptions('Confirmed', { headerLeft: () => null, gestureEnabled: false })} />
                <Stack.Screen name="BookingDetail" component={ensureScreen(BookingDetailScreen, "BookingDetailScreen")} options={stackHeaderOptions('Booking detail')} />
                <Stack.Screen name="ProviderSignup" component={ensureScreen(ProviderSignupScreen, "ProviderSignupScreen")} options={stackHeaderOptions('Become a tour guide / operator')} />
                <Stack.Screen name="CreateListing" component={ensureScreen(CreateListingScreen, "CreateListingScreen")} options={stackHeaderOptions('Create tour')} />
                <Stack.Screen name="Profile" component={ensureScreen(ProfileScreen, "ProfileScreen")} options={stackHeaderOptions('Profile')} />
                <Stack.Screen name="Settings" component={ensureScreen(SettingsScreen, "SettingsScreen")} options={stackHeaderOptions('Settings')} />
              </>
            )}
          </Stack.Navigator>
        )}

        {/* WadaAgent overlay (actívalo si lo necesitas) */}
        {Platform.OS !== "web" ? (
          <WadaAgent
            onGenerateItinerary={() => {
              try {
                if (navigationRef.isReady()) navigationRef.navigate("ToursDeals", { openPlanner: true });
              } catch {}
            }}
          />
        ) : null}
      </NavigationContainer>

      {/* Banner si bypass de auth (opcional) */}
      {bypassAuth && showBypassBanner && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: "#fde047" }} />
      )}
    </SafePaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
