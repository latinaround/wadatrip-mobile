import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Importar componentes de React Native Paper
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';

// Necesario para que el flujo de autenticación web de Google funcione en Expo
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- Configuración de Autenticación de Google ---
  // Leer Client IDs desde app.json (expo.extra.auth)
  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra) || {};
  const authExtra = extra.auth || {};
  const webClientId = authExtra.webClientId || '981114942208-lr5aqqov1ifftioc462ut45sadvvjusd.apps.googleusercontent.com';
  const androidClientId = authExtra.androidClientId || '981114942208-8hsf2u8833vlpuia4l9jmeus9sdd650p.apps.googleusercontent.com';
  const iosClientId = authExtra.iosClientId || webClientId;

  // Usamos `useIdTokenAuthRequest` para obtener el id_token que necesita Firebase.
  const redirectUri = makeRedirectUri({ useProxy: true, scheme: 'wadatrip' });
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: webClientId,
      iosClientId,
      androidClientId,
      // Facilita el flujo en Expo Go
      expoClientId: webClientId,
      // Forzar redirect por proxy para evitar puertos locales variables
      redirectUri,
    },
    {
      // Usar el proxy de Expo para simplificar redirecciones en dev (web y nativo)
      useProxy: true,
    }
  );

  // Log del redirect URI real que usa Expo/Google Auth (útil para configurar Google Cloud)
  useEffect(() => {
    if (request?.redirectUri) {
      console.log('Google Auth redirect URI (Expo):', request.redirectUri);
    }
  }, [request]);

  // --- Lógica para Manejar Respuestas de Autenticación ---

  // Efecto para procesar la respuesta de Google
  useEffect(() => {
    if (loading) return; // Evitar procesar si ya hay una operación en curso

    if (response?.type === 'success') {
      const idToken = response?.params?.id_token ?? response?.authentication?.idToken;
      handleGoogleSignIn(idToken);
    } else if (response?.type === 'error') {
      console.error("Error en el flujo de Google Auth Session:", response.error);
      Alert.alert('Error', 'No se pudo completar el inicio de sesión con Google.');
    }
  }, [response]);

  // Handler para Google con fallback en web
  const onGooglePress = async () => {
    try {
      if (Platform.OS === 'web') {
        const res = await promptAsync({ useProxy: true, redirectUri });
        if (!res || res.type !== 'success') return;
      } else {
        await promptAsync({ useProxy: true, redirectUri });
      }
    } catch (e) {
      // Fallback web: popup nativo de Firebase
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (popupErr) {
        console.error('Fallback popup error:', popupErr);
        Alert.alert('Error', 'No se pudo iniciar sesión con Google.');
      }
    }
  };

  // Función para autenticación con Email y Contraseña
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // No es necesaria una alerta de éxito, el listener en App.js se encargará de la navegación.
    } catch (error) {
      Alert.alert('Error de Autenticación', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para procesar el token de Google con Firebase
  const handleGoogleSignIn = async (idToken) => {
    if (!idToken) return;
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error("Error de Firebase con credencial de Google:", error);
      Alert.alert('Error', 'No se pudo verificar la sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  // Función para autenticación con Apple
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const appleAuthCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleAuthCredential;
      if (identityToken) {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({ idToken: identityToken });
        await signInWithCredential(auth, credential);
      } else {
        throw new Error('No se recibió el identityToken de Apple.');
      }
    } catch (error) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error("Error de autenticación con Apple:", error);
        Alert.alert('Error', 'Ocurrió un problema al iniciar sesión con Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Renderizado de la Interfaz de Usuario ---
  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
      </Text>

      <TextInput
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        mode="outlined"
        disabled={loading}
      />

      <TextInput
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        mode="outlined"
        disabled={loading}
      />

      <Button
        mode="contained"
        onPress={handleEmailAuth}
        disabled={loading}
        loading={loading && !response} // Muestra el spinner solo para el login por email
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        {isLogin ? 'Ingresar' : 'Registrarse'}
      </Button>

      <Button
        mode="contained"
        onPress={onGooglePress}
        disabled={!request || loading}
        style={[styles.button, styles.googleButton]}
        icon="google"
        labelStyle={styles.buttonLabel}
      >
        Continuar con Google
      </Button>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={5}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
          disabled={loading}
        />
      )}

      <Button
        mode="text"
        onPress={() => setIsLogin(!isLogin)}
        disabled={loading}
        style={styles.linkButton}
      >
        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </Button>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#4285F4', // Color oficial de Google
  },
  appleButton: {
    width: '100%',
    height: 52, // Altura similar a los otros botones
    marginTop: 16,
  },
  linkButton: {
    marginTop: 16,
  },
});
