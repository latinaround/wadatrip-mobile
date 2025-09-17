import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, googleProvider } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

const mapAuthError = (code) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Invalid credentials';
    case 'auth/user-not-found':
      return 'User not found';
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/weak-password':
      return 'Weak password';
    default:
      return 'Authentication error';
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      console.error(e);
      setError(mapAuthError(e?.code));
    } finally { setLoading(false); }
  };

  const onRegister = async () => {
    setLoading(true); setError('');
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      console.error(e);
      setError(mapAuthError(e?.code));
    } finally { setLoading(false); }
  };

  const onGoogle = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Google Sign-In', 'Native Google login requires additional setup.');
      return;
    }
    setLoading(true); setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      setError(mapAuthError(e?.code));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroHeader}>
        {LinearGradient ? (
          <LinearGradient colors={["#2a9d8f", "#3a86ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>WadaTrip</Text>
        </View>
        <Text style={styles.brandSubtitle}>Welcome back</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.button, styles.primary]} onPress={onLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading…' : 'Login'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onRegister} disabled={loading}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.google]} onPress={onGoogle} disabled={loading}>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  heroHeader: { paddingTop: 48, paddingBottom: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a9d8f' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36 },
  brandTitle: { color: '#fff', fontWeight: '800', fontSize: 22 },
  brandSubtitle: { color: '#e9f5ff', marginTop: 4 },
  panel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef', padding: 16, width: '88%', maxWidth: 420, alignSelf: 'center', marginTop: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primary: { backgroundColor: '#2a9d8f' },
  secondary: { backgroundColor: '#457b9d' },
  google: { backgroundColor: '#d9534f' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b02a37', marginBottom: 6, fontWeight: '600' },
});
