import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

const mapAuthError = (error) => {
  const code = error?.code ?? 'auth/unknown';
  const normalized = code.toLowerCase();
  const lookup = {
    'auth/invalid-credential': 'Invalid credentials',
    'auth/wrong-password': 'Invalid credentials',
    'auth/user-not-found': 'User not found',
    'auth/email-already-in-use': 'Email already in use',
    'auth/weak-password': 'Weak password',
    'auth/operation-not-allowed': 'Sign-in method disabled in Firebase console',
    'auth/invalid-api-key': 'Firebase API key rejected',
  };
  const fallback = error?.message || 'Authentication error';
  const friendly = lookup[normalized] || fallback;
  return friendly.includes(code) ? friendly : `${friendly} (${code})`;
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
      setError(mapAuthError(e));
    } finally { setLoading(false); }
  };

  const onRegister = async () => {
    setLoading(true); setError('');
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      console.error(e);
      setError(mapAuthError(e));
    } finally { setLoading(false); }
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset password', 'Enter your email first.');
      return;
    }
    setLoading(true); setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset email sent', 'Check your inbox to reset your password.');
    } catch (e) {
      console.error(e);
      setError(mapAuthError(e));
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
        <TouchableOpacity style={[styles.button, styles.link]} onPress={onForgotPassword} disabled={loading}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  heroHeader: { paddingTop: 48, paddingBottom: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a9d8f' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandTitle: { color: '#fff', fontWeight: '800', fontSize: 22 },
  brandSubtitle: { color: '#e9f5ff', marginTop: 4 },
  panel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef', padding: 16, width: '88%', maxWidth: 420, alignSelf: 'center', marginTop: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1d3557', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  primary: { backgroundColor: '#2a9d8f' },
  secondary: { backgroundColor: '#457b9d' },
  link: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkText: { color: '#2a9d8f', fontWeight: '700' },
  error: { color: '#b02a37', marginBottom: 6, fontWeight: '600' },
});
