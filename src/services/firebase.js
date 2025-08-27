// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 🔥 Configuración de Firebase para WadaTrip Nuevo
const firebaseConfig = {
  apiKey: "AIzaSyA8rL2T7tKWkDp6Mkx6eeOsqKXVDpmodx0",
  authDomain: "wadatrip-nuevo.firebaseapp.com",
  projectId: "wadatrip-nuevo",
  storageBucket: "wadatrip-nuevo.firebasestorage.app",
  messagingSenderId: "981114942208",
  appId: "1:981114942208:web:e5502a1698dcd0065cf9e5",
  // measurementId: "G-XXXXXXX" // 👈 activa Analytics en Firebase Console si quieres usarlo
};

// 🚀 Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 🔑 Autenticación
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// 📂 Firestore (Base de Datos)
export const db = getFirestore(app);

// 🗄 Storage (Archivos e imágenes)
export const storage = getStorage(app);

// 📊 Analytics (solo si está disponible en la plataforma)
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// 🔔 Push Notifications (Expo Notifications)
// En web, expo-notifications no está plenamente soportado; evita configurar handler para prevenir errores.
try {
  if (Platform.OS !== 'web' && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  // No-op: en plataformas sin soporte, ignorar
}

// 👉 Función para solicitar permisos y obtener el token de notificación
export const requestForToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Please enable notifications to receive alerts.');
    console.log('⚠️ Notifications permission denied.');
    return null;
  }

  // Configuración del canal de notificación para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  try {
    // Usa el EAS projectId (UUID) para obtener el token de Expo Push
    const easProjectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const args = easProjectId ? { projectId: easProjectId } : undefined;
    const resp = await Notifications.getExpoPushTokenAsync(args);
    const token = resp?.data;
    console.log('✅ Notification token (Expo):', token);
    return token;
  } catch (error) {
    console.error('❌ Error getting Expo token:', error);
    return null;
  }
};

// 👉 Listener para recibir notificaciones (reemplaza a onMessageListener)
// Esta función ahora configura un listener en lugar de devolver una promesa.
// Deberá ser ajustada en App.js
export const setupNotificationListeners = () => {
  // Se ejecuta cuando se recibe una notificación mientras la app está en primer plano
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Foreground notification received:', notification);
  });

  // Se ejecuta cuando un usuario toca una notificación
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 User interacted with notification:', response);
    // Aquí puedes agregar lógica para navegar a una pantalla específica
  });

  return () => {
    Notifications.removeNotificationSubscription(foregroundSubscription);
    Notifications.removeNotificationSubscription(backgroundSubscription);
  };
};

export default app;
