// src/services/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 🔥 Configuración de Firebase para WadaTrip Nuevo
const firebaseConfig = {
  apiKey: "AIzaSyA8rL2T7tKWkDp6Mkx6eeOsqKXVDpmodx0",
  authDomain: "wadatrip-nuevo.firebaseapp.com",
  projectId: "wadatrip-nuevo",
  storageBucket: "wadatrip-nuevo.firebasestorage.app",
  messagingSenderId: "981114942208",
  appId: "1:981114942208:web:e5502a1698dcd0065cf9e5",
  // measurementId: "G-XXXXXXX" // opcional para Analytics
};

// 🚀 Inicializar Firebase app solo una vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔑 Autenticación (AsyncStorage en RN para persistencia)
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Si ya estaba inicializado, obtener el existente
    auth = getAuth(app);
  }
}

export { auth };
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// 📂 Firestore (Base de Datos)
export const db = getFirestore(app);

// 🗄 Storage (Archivos e imágenes)
export const storage = getStorage(app);

// 📊 Analytics (solo si está soportado)
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// 🔔 Notificaciones Push (Expo Notifications)
try {
  if (Platform.OS !== "web" && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.log("⚠️ Notifications handler not set:", e.message);
}

// 👉 Solicitar permisos y obtener token
export const requestForToken = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("⚠️ Notifications permission denied.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Only request Expo push token if we have a projectId available
    const easProjectId =
      (Constants?.expoConfig?.extra && Constants.expoConfig.extra.eas && Constants.expoConfig.extra.eas.projectId) ||
      Constants?.easConfig?.projectId ||
      process?.env?.EXPO_PUBLIC_EAS_PROJECT_ID;

    if (!easProjectId) {
      console.log("ℹ️ Skipping Expo push token in dev (no projectId)");
      return null;
    }

    const resp = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId });
    const token = resp?.data;
    console.log("✅ Notification token (Expo):", token);
    return token;
  } catch (error) {
    console.error("❌ Error getting Expo token:", error);
    return null;
  }
};

// 👉 Listener de notificaciones
export const setupNotificationListeners = () => {
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log("📩 Foreground notification received:", notification);
  });

  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("👆 User interacted with notification:", response);
  });

  return () => {
    Notifications.removeNotificationSubscription(foregroundSubscription);
    Notifications.removeNotificationSubscription(backgroundSubscription);
  };
};

export default app;
