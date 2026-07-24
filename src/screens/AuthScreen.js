import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { requestAuthCode, verifyAuthCode } from '../lib/api';
import { saveGuideCodeSession } from '../services/appSession';
import { ensureUserProfile } from '../services/userProfile';
import BrandLogo from '../components/brand/BrandLogo';
import { brand } from '../theme/brand';

let AppleAuthentication = null;
try { AppleAuthentication = require('expo-apple-authentication'); } catch (e) { AppleAuthentication = null; }

WebBrowser.maybeCompleteAuthSession();

const mapAuthError = (error) => {
  const code = error?.code ?? 'auth/unknown';
  const lookup = {
    'auth/invalid-credential': 'Invalid credentials.',
    'auth/wrong-password': 'Invalid credentials.',
    'auth/user-not-found': 'User not found.',
    'auth/email-already-in-use': 'This email is already in use.',
    'auth/weak-password': 'Password is too weak.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed': 'Sign-in method is disabled in Firebase.',
  };
  return lookup[String(code).toLowerCase()] || error?.message || 'Authentication error.';
};

const mapBackendError = (error) => {
  const body = String(error?.body || '').trim();
  if (body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) return String(parsed.message);
    } catch {}
    return body;
  }
  const message = String(error?.message || '').trim();
  return message || 'Could not complete guide sign-in.';
};

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState('traveler');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guideName, setGuideName] = useState('');
  const [guideCode, setGuideCode] = useState('');
  const [guideCodeSent, setGuideCodeSent] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [error, setError] = useState('');
  const authLockRef = useRef(false);
  const googleConfiguredRef = useRef(false);

  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra) || {};
  const authExtra = extra.auth || {};
  const webClientId = authExtra.webClientId || '981114942208-lr5aqqov1ifftioc462ut45sadvvjusd.apps.googleusercontent.com';
  const iosClientId = authExtra.iosClientId || webClientId;
  const isExpoGo = Constants?.appOwnership === 'expo';

  useEffect(() => {
    (async () => {
      try {
        const available = AppleAuthentication && typeof AppleAuthentication.isAvailableAsync === 'function'
          ? await AppleAuthentication.isAvailableAsync()
          : false;
        setAppleAvailable(available);
      } catch {
        setAppleAvailable(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo || googleConfiguredRef.current) return;
    GoogleSignin.configure({
      webClientId,
      iosClientId: iosClientId || undefined,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
    googleConfiguredRef.current = true;
  }, [iosClientId, isExpoGo, webClientId]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      await ensureUserProfile(auth.currentUser);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGuideCodeRequest = async () => {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestAuthCode({
        email: email.trim(),
        role: 'guide',
        name: guideName.trim() || undefined,
      });
      setGuideCodeSent(true);
    } catch (e) {
      setError(mapBackendError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGuideCodeVerify = async () => {
    if (!email.trim() || !guideCode.trim()) {
      setError('Enter your email and 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await verifyAuthCode({
        email: email.trim(),
        code: guideCode.trim(),
        role: 'guide',
        name: guideName.trim() || undefined,
      });
      await saveGuideCodeSession({
        token: payload?.token,
        user: {
          uid: payload?.user?.id || payload?.user?.uid || email.trim().toLowerCase(),
          email: payload?.user?.email || email.trim(),
          displayName: payload?.user?.name || payload?.user?.displayName || guideName.trim(),
          photoURL: payload?.user?.photoURL || '',
          role: payload?.user?.role || 'guide',
          authSource: 'guide_code',
        },
      });
    } catch (e) {
      setError(mapBackendError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Password reset', 'Check your inbox for reset instructions.');
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken) => {
    if (!idToken) {
      setError('Google did not return a valid token.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      await ensureUserProfile(auth.currentUser);
    } catch (e) {
      console.error('Firebase error with Google credential:', e);
      setError('Google session could not be verified.');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (authInProgress || authLockRef.current) return;
    setError('');

    if (Platform.OS === 'web') {
      try {
        setAuthInProgress(true);
        authLockRef.current = true;
        await signInWithPopup(auth, new GoogleAuthProvider());
        await ensureUserProfile(auth.currentUser);
      } catch (e) {
        console.error('Google popup error:', e);
        setError('Google sign-in could not be completed.');
      } finally {
        setAuthInProgress(false);
        authLockRef.current = false;
      }
      return;
    }

    if (isExpoGo) {
      setError('Google sign-in needs a native dev build. Use email/password in Expo Go.');
      return;
    }

    try {
      setAuthInProgress(true);
      authLockRef.current = true;
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      if (result?.type === 'cancelled') {
        return;
      }

      const idToken = result?.data?.idToken;
      await handleGoogleToken(idToken);
    } catch (e) {
      console.error('Google Sign-In error:', e);
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services is not available on this device.');
      } else if (e?.code === statusCodes.IN_PROGRESS) {
        setError('Google sign-in is already in progress.');
      } else {
        setError('Google sign-in could not be completed.');
      }
    } finally {
      setAuthInProgress(false);
      authLockRef.current = false;
    }
  };

  const handleAppleSignIn = async () => {
    if (!AppleAuthentication || authInProgress || authLockRef.current) return;
    setLoading(true);
    setError('');
    authLockRef.current = true;
    try {
      const appleAuthCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleAuthCredential?.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: appleAuthCredential.identityToken });
      await signInWithCredential(auth, credential);
      await ensureUserProfile(auth.currentUser);
    } catch (e) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign-in error:', e);
        setError('Apple sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
      authLockRef.current = false;
    }
  };

  const isGuideMode = authMode === 'guide';
  const googleDisabled = loading || authInProgress || isGuideMode;
  const primaryLabel = loading ? 'Working...' : isLogin ? 'Continue with email' : 'Create account';
  const guidePrimaryLabel = loading
    ? 'Working...'
    : guideCodeSent
      ? 'Continue as guide'
      : 'Send code to continue';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={brand.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <BrandLogo size="lg" light showTagline />
            <Text style={styles.heroTitle}>Book better tours. Meet verified tour guides.</Text>
            <Text style={styles.heroSubtitle}>
              {isGuideMode
                ? 'Use your email and 6-digit code to get back into hosting and publishing tours.'
                : 'Start with Google or Apple. Email stays available as fallback.'}
            </Text>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <Pressable style={[styles.modeChip, !isGuideMode && styles.modeChipActive]} onPress={() => { setAuthMode('traveler'); setError(''); setGuideCode(''); setGuideCodeSent(false); }} disabled={loading}>
                <Text style={[styles.modeChipText, !isGuideMode && styles.modeChipTextActive]}>Traveler</Text>
              </Pressable>
              <Pressable style={[styles.modeChip, isGuideMode && styles.modeChipActive]} onPress={() => { setAuthMode('guide'); setError(''); setPassword(''); }} disabled={loading}>
                <Text style={[styles.modeChipText, isGuideMode && styles.modeChipTextActive]}>Guide</Text>
              </Pressable>
            </View>

            <Text style={styles.cardTitle}>{isGuideMode ? 'Sign in as guide' : (isLogin ? 'Welcome back' : 'Create your traveler account')}</Text>
            <Text style={styles.cardSubtitle}>
              {isGuideMode
                ? 'Enter your email, receive a 6-digit code, and continue to your guide tools.'
                : (isLogin ? 'Access your trips, bookings and saved tours.' : 'Create your account to book and manage tours.')}
            </Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {!isGuideMode ? (
              <>
                <Pressable style={[styles.socialButton, styles.googleButton, googleDisabled && styles.buttonDisabled]} onPress={handleGooglePress} disabled={googleDisabled}>
                  <Text style={styles.socialButtonText}>
                    {authInProgress ? 'Opening Google...' : 'Continue with Google'}
                  </Text>
                </Pressable>

                {Platform.OS === 'ios' && appleAvailable && AppleAuthentication ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  />
                ) : null}

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or use email</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@email.com"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              editable={!loading}
            />

            {isGuideMode ? (
              <>
                <Text style={styles.label}>Full name (optional)</Text>
                <TextInput
                  value={guideName}
                  onChangeText={setGuideName}
                  placeholder="Your guide name"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  editable={!loading}
                />

                {guideCodeSent ? (
                  <>
                    <Text style={styles.label}>Code</Text>
                    <TextInput
                      value={guideCode}
                      onChangeText={setGuideCode}
                      keyboardType="number-pad"
                      placeholder="6-digit code"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      editable={!loading}
                    />
                    <Text style={styles.linkMuted}>We sent a 6-digit code to your email.</Text>
                  </>
                ) : null}

                <Pressable
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={guideCodeSent ? handleGuideCodeVerify : handleGuideCodeRequest}
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>{guidePrimaryLabel}</Text>
                </Pressable>

                {guideCodeSent ? (
                  <Pressable onPress={() => { setGuideCodeSent(false); setGuideCode(''); setError(''); }} disabled={loading}>
                    <Text style={styles.link}>Use a different email</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  editable={!loading}
                />

                <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleEmailAuth} disabled={loading}>
                  <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
                </Pressable>

                <Pressable onPress={handleForgotPassword} disabled={loading}>
                  <Text style={styles.link}>{'Forgot password?'}</Text>
                </Pressable>

                <Pressable onPress={() => { setError(''); setIsLogin((prev) => !prev); }} disabled={loading}>
                  <Text style={styles.link}>
                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf4ee',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  hero: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 18,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: -0.9,
    fontFamily: brand.typography.display,
  },
  heroSubtitle: {
    color: '#dbeafe',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: brand.typography.body,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#dceff4',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  modeChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  modeChipActive: {
    backgroundColor: '#dff7f3',
    borderColor: brand.colors.primary,
  },
  modeChipText: {
    color: '#475569',
    fontFamily: brand.typography.heading,
  },
  modeChipTextActive: {
    color: brand.colors.heroStart,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: '#0f172a',
    letterSpacing: -0.5,
    fontFamily: brand.typography.display,
  },
  cardSubtitle: {
    marginTop: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    fontFamily: brand.typography.body,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 12,
    fontFamily: brand.typography.heading,
  },
  socialButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#2765e7',
  },
  socialButtonText: {
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: -0.2,
    fontFamily: brand.typography.heading,
  },
  appleButton: {
    width: '100%',
    height: 54,
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: brand.typography.heading,
  },
  label: {
    color: '#0f172a',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.2,
    fontFamily: brand.typography.heading,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontFamily: brand.typography.body,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.colors.heroStart,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: -0.2,
    fontFamily: brand.typography.heading,
  },
  link: {
    color: brand.colors.heroStart,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: brand.typography.heading,
  },
  linkMuted: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: brand.typography.body,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});

