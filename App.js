// App.js
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ActivityIndicator, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants from 'expo-constants';
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import "./src/i18n";

import { auth, requestForToken, setupNotificationListeners } from "./src/services/firebase";
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
// Dev override de API_BASE_URL por IP LAN (útil cuando 10.0.2.2 no funciona)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // Removed global.API_BASE_URL override; use env/extra/defaults
}

// Screens
import ItineraryScreen from "./src/screens/ItineraryScreen";
import FlightsScreen from "./src/screens/FlightsScreen";
import MyAlertsScreen from "./src/screens/MyAlertsScreen";
import ToursScreen from "./src/screens/ToursScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ReserveBookingScreen from "./src/screens/ReserveBookingScreen";
import ProviderSignupScreen from "./src/screens/ProviderSignupScreen";
import CreateListingScreen from "./src/screens/CreateListingScreen";
import LoginScreen from "./src/screens/LoginScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const HeaderBackground = () => {
  if (LinearGradient) {
    return (
      <LinearGradient
        colors={["#2a9d8f", "#3a86ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#2a9d8f" }]} />;
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

export default function App() {
  try {
    // Logs de diagnóstico para detectar navegadores indefinidos
    // eslint-disable-next-line no-console
    console.log('[DBG] Stack object:', typeof Stack, 'Navigator:', typeof Stack?.Navigator, 'Screen:', typeof Stack?.Screen);
    // eslint-disable-next-line no-console
    console.log('[DBG] Tab object:', typeof Tab, 'Navigator:', typeof Tab?.Navigator, 'Screen:', typeof Tab?.Screen);
  } catch {}
  const [loading, setLoading] = useState(true);
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

  const [WadaAgentComp, setWadaAgentComp] = useState(null);
  const enableAgent = (() => {
    try {
      const extra = (Constants && Constants.expoConfig && Constants.expoConfig.extra) || {};
      const flag = (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ENABLE_WADA_AGENT === 'true') || extra.ENABLE_WADA_AGENT === true;
      const mode = String(extra.API_MODE || (typeof process !== 'undefined' ? (process.env && process.env.EXPO_PUBLIC_API_MODE) : '') || 'live').toLowerCase();
      return !!flag && mode === 'live';
    } catch { return false; }
  })();

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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setLoading(false);
      try {
        if (u && typeof u.getIdToken === 'function') {
          const token = await u.getIdToken();
          try { global.AUTH_TOKEN = token; } catch {}
        } else {
          try { global.AUTH_TOKEN = undefined; } catch {}
        }
      } catch {}
    });
    return unsubscribe;
  }, [bypassAuth]);

  // Mantener actualizado el token de Firebase para llamadas al backend
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      try {
        if (u && typeof u.getIdToken === 'function') {
          const token = await u.getIdToken(true);
          try { global.AUTH_TOKEN = token; } catch {}
        } else {
          try { global.AUTH_TOKEN = undefined; } catch {}
        }
      } catch {}
    });
    return unsub;
  }, []);

  // Notificaciones push
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        requestForToken();
        const unsubscribe = setupNotificationListeners();
        return unsubscribe;
      } catch {}
    }
  }, []);

  // Lazy load WadaAgent solo en nativo
  useEffect(() => {
    if (Platform.OS !== "web") {
      import("./src/components/WadaAgent")
        .then((m) => setWadaAgentComp(() => m.default))
        .catch(() => setWadaAgentComp(null));
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00bfa6" />
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
        <StatusBar backgroundColor="#2a9d8f" barStyle="light-content" />
        {(!Stack?.Navigator || !Tab?.Navigator) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <View style={{ height: 12 }} />
            <Text>Navigator not ready</Text>
            <Text style={{ marginTop: 8, fontSize: 12, color: '#6c757d' }}>Check React Navigation versions/alignment</Text>
          </View>
        ) : user ? (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              headerBackTitleVisible: false,
              headerTitleAlign: "center",
              headerTintColor: "#ffffff",
              headerTitleStyle: { fontWeight: "700", color: "#ffffff" },
              headerShadowVisible: false,
              // Si quieres reactivar el gradiente:
              // headerBackground: () => <HeaderBackground />,
            }}
          >
            <Stack.Screen name="Home" component={ensureScreen(HomeScreen, "HomeScreen")} options={{ headerShown: false }} />
            <Stack.Screen name="Flights" component={FlightsComp} options={{ headerShown: true, title: 'Flights', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="Itinerary" component={ensureScreen(ItineraryScreen, "ItineraryScreen")} options={{ headerShown: true, title: 'Itinerary', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="MyAlerts" component={ensureScreen(MyAlertsScreen, "MyAlertsScreen")} options={{ headerShown: true, title: 'My Alerts', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="Community" component={ensureScreen(CommunityScreen, "CommunityScreen")} options={{ headerShown: true, title: 'Community', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="ToursDeals" component={ensureScreen(ToursScreen, "ToursScreen")} options={{ headerShown: true, title: 'Tours', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="Reserve" component={ensureScreen(ReserveBookingScreen, "ReserveBookingScreen")} options={{ headerShown: true, title: 'Reserve Tour', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="ProviderSignup" component={ensureScreen(ProviderSignupScreen, "ProviderSignupScreen")} options={{ headerShown: true, title: 'Become a guide / operator', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
            <Stack.Screen name="CreateListing" component={ensureScreen(CreateListingScreen, "CreateListingScreen")} options={{ headerShown: true, title: 'Create tour', headerBackTitleVisible: false, headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#2a9d8f' }, headerTitleStyle: { color: '#ffffff', fontWeight: '700' } }} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Login"
              component={ensureScreen(LoginScreen, "LoginScreen")}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        )}

        {/* WadaAgent overlay (actívalo si lo necesitas) */}
{enableAgent && WadaAgentComp ? (
          <WadaAgentComp
            onGenerateItinerary={() => {
              try {
                if (navigationRef.isReady()) navigationRef.navigate("Itinerary");
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
