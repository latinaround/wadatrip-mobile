import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Alert, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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

// Components
import WadaAgent from "./src/components/WadaAgent";

const Stack = createStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 🔥 Escucha cambios de sesión en Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00bfa6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuario logueado → Home (+ otras pantallas)
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Itinerary" component={ItineraryScreen} />
            <Stack.Screen name="Tours" component={ToursScreen} />
            <Stack.Screen name="Flights" component={FlightsScreen} />
            <Stack.Screen name="Community" component={CommunityScreen} />
          </>
        ) : (
          // Usuario no logueado → Auth + Registro
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* Solo aparece cuando hay sesión activa */}
      {user && <WadaAgent />}
    </NavigationContainer>
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
