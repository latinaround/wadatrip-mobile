import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Alert, Platform, TouchableOpacity, Text, StatusBar } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { Provider as PaperProvider } from 'react-native-paper';
import { createStackNavigator } from "@react-navigation/stack";
import "./src/i18n"; // Inicializar traducciones

// Firebase
import { auth, requestForToken, setupNotificationListeners } from "./src/services/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import ItineraryScreen from "./src/screens/ItineraryScreen";
import AuthScreen from "./src/screens/AuthScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ToursScreen from "./src/screens/ToursScreen";
import FlightsScreen from "./src/screens/FlightsScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import MyAlertsScreen from "./src/screens/MyAlertsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CommunityInsightsScreen from "./src/screens/CommunityInsightsScreen";
import CommunityMapScreen from "./src/screens/CommunityMapScreen";
import ApiTestScreen from "./src/screens/ApiTestScreen";
import PaymentScreen from "./src/screens/PaymentScreen";

// Components (lazy-load WadaAgent on native only)

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
  const [WadaAgentComp, setWadaAgentComp] = useState(null);

  // 🔥 Escucha cambios de sesión en Firebase
  useEffect(() => {
    if (bypassAuth) {
      setUser({ uid: 'dev-bypass', email: 'dev@local' });
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return unsubscribe;
  }, [bypassAuth]);

  // 🔔 Configurar notificaciones push
  useEffect(() => {
    // Pedir token y configurar listeners solo en Android/iOS
    if (Platform.OS !== "web") {
      requestForToken();

      // Configurar listeners para manejar notificaciones recibidas e interacciones
      const unsubscribe = setupNotificationListeners();

      // Limpiar los listeners cuando el componente se desmonte
      return unsubscribe;
    }
  }, []);

  // Lazy load WadaAgent only on native to avoid web icon deps
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('./src/components/WadaAgent')
        .then((m) => setWadaAgentComp(() => m.default))
        .catch(() => setWadaAgentComp(null));
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00bfa6" />
      </View>
    );
  }

  return (
    <PaperProvider>
    <NavigationContainer ref={navigationRef}>
      <StatusBar backgroundColor="#2a9d8f" barStyle="light-content" />
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerTitleAlign: 'center',
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700', color: '#ffffff' },
          headerShadowVisible: false,
          headerBackground: () => (
            <LinearGradient
              colors={["#2a9d8f", "#3a86ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ),
        }}
      >
        {user ? (
          // Usuario logueado → Home (+ otras pantallas)
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Itinerary" component={ItineraryScreen} options={{ title: 'Itinerary' }} />
            <Stack.Screen name="Tours" component={ToursScreen} options={{ title: 'Tours' }} />
            <Stack.Screen name="Flights" component={FlightsScreen} options={{ title: 'Flights' }} />
            <Stack.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
            <Stack.Screen name="CommunityInsights" component={CommunityInsightsScreen} options={{ title: 'Insights' }} />
            <Stack.Screen name="CommunityMap" component={CommunityMapScreen} options={{ title: 'Map' }} />
            <Stack.Screen name="MyAlerts" component={MyAlertsScreen} options={{ title: 'My Alerts' }} />
            {false && <Stack.Screen name="TopTours" component={() => null} />}
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            {false && <Stack.Screen name="Payment" component={() => null} />}
            {/* Dev-only screen for quick API checks on web */}
            {Platform.OS === 'web' && (
              <Stack.Screen name="ApiTest" component={ApiTestScreen} options={{ title: 'API Test' }} />
            )}
          </>
        ) : (
          // Usuario no logueado → Auth + Registro
          <>
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
            {/* Dev-only screen also available when logged out (web) */}
            {Platform.OS === 'web' && (
              <Stack.Screen name="ApiTest" component={ApiTestScreen} options={{ title: 'API Test' }} />
            )}
          </>
        )}
      </Stack.Navigator>

      {/* Global WadaAgent overlay when logged in (native only) */}
      {user && WadaAgentComp ? <WadaAgentComp /> : null}
    </NavigationContainer>
    {/* Floating Dev button (web only) */}
    {Platform.OS === 'web' && (
      <View
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (navigationRef.isReady()) navigationRef.navigate('ApiTest');
          }}
          style={{
            backgroundColor: '#1d3557',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <ActivityIndicator color="#fff" animating={false} />
          <View style={{ position: 'absolute', left: 12, right: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Dev</Text>
          </View>
        </TouchableOpacity>
      </View>
    )}
    {/* Auth bypass banner */}
    {bypassAuth && (
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: '#fde047' }}>
        <Text style={{ textAlign: 'center', fontWeight: '800', color: '#1f2937' }}>Auth bypass active (dev)</Text>
      </View>
    )}
    </PaperProvider>
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
