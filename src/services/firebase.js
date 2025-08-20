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

// Configura cómo se deben manejar las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 👉 Función para solicitar permisos y obtener el token de notificación
export const requestForToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Debes habilitar las notificaciones para recibir alertas.');
    console.log('⚠️ Permiso de notificaciones denegado.');
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
    // Obtiene el token usando el projectId de tu configuración de Firebase
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: firebaseConfig.projectId })).data;
    console.log('✅ Token de notificación (Expo):', token);
    return token;
  } catch (error) {
    console.error('❌ Error al obtener el token de Expo:', error);
    return null;
  }
};

// 👉 Listener para recibir notificaciones (reemplaza a onMessageListener)
// Esta función ahora configura un listener en lugar de devolver una promesa.
// Deberá ser ajustada en App.js
export const setupNotificationListeners = () => {
  // Se ejecuta cuando se recibe una notificación mientras la app está en primer plano
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Notificación recibida en primer plano:', notification);
  });

  // Se ejecuta cuando un usuario toca una notificación
  const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Usuario interactuó con la notificación:', response);
    // Aquí puedes agregar lógica para navegar a una pantalla específica
  });

  return () => {
    Notifications.removeNotificationSubscription(foregroundSubscription);
    Notifications.removeNotificationSubscription(backgroundSubscription);
  };
};

export default app;
