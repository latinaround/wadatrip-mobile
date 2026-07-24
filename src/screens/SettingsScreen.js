import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { auth } from '../services/firebase';
import { getCurrentAppUser, clearStoredAppSession } from '../services/appSession';
import { signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { clearSavedLanguage, getDeviceLanguage, getSavedLanguage, normalizeLanguage, setSavedLanguage } from '../services/language';
import BrandHeader from '../components/brand/BrandHeader';
import BrandCard from '../components/brand/BrandCard';
import BrandButton from '../components/brand/BrandButton';
import { brand } from '../theme/brand';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
];

export default function SettingsScreen() {
  const { i18n } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedLang, setSavedLangState] = useState(null);
  const [deviceLang, setDeviceLang] = useState('en');
  const currentLang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const currentUser = auth.currentUser || getCurrentAppUser();
  const currentEmail = currentUser?.email || null;
  const languageSource = savedLang ? 'Saved preference' : 'Device default';

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await getSavedLanguage();
      const detected = getDeviceLanguage();
      if (!active) return;
      setSavedLangState(saved);
      setDeviceLang(detected);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await clearStoredAppSession();
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not sign out');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeader title="Settings" subtitle="Language, account and app behavior." />

      <Text style={styles.sectionTitle}>App language</Text>
      <BrandCard style={[styles.card, styles.languageCard]}>
        <View style={styles.languageSummary}>
          <View style={[styles.statusPill, styles.statusActive]}>
            <Text style={styles.statusPillText}>Current: {currentLang.toUpperCase()}</Text>
          </View>
          <Text style={styles.helperText}>Using: {languageSource}</Text>
          <Text style={styles.helperText}>Device language: {deviceLang.toUpperCase()}</Text>
          {savedLang ? <Text style={styles.helperText}>Saved preference: {savedLang.toUpperCase()}</Text> : null}
        </View>

        <BrandButton
          title={`Use device language (${deviceLang.toUpperCase()})`}
          variant="secondary"
          style={styles.deviceButton}
          onPress={async () => {
            await clearSavedLanguage();
            setSavedLangState(null);
            await i18n.changeLanguage(deviceLang);
          }}
        />

        <View style={styles.langRow}>
          {LANGS.map((lang) => (
            <BrandButton
              key={lang.code}
              title={lang.label}
              variant={currentLang === lang.code ? 'primary' : 'secondary'}
              style={[styles.langChip, currentLang !== lang.code && styles.langChipMuted]}
              onPress={async () => {
                await setSavedLanguage(lang.code);
                setSavedLangState(lang.code);
                await i18n.changeLanguage(lang.code);
              }}
            />
          ))}
        </View>
      </BrandCard>

      <Text style={styles.sectionTitle}>Account</Text>
      <BrandCard style={[styles.card, styles.accountCard]}>
        <Text style={styles.helperText}>
          {currentEmail ? `Logged in as: ${currentEmail}` : 'No active session'}
        </Text>
        <BrandButton title={loggingOut ? 'Signing out...' : 'Sign out'} onPress={onLogout} disabled={loggingOut || !currentEmail} style={styles.logout} />
      </BrandCard>

      <Text style={styles.sectionTitle}>About</Text>
      <BrandCard style={[styles.card, styles.aboutCard]}>
        <Text style={styles.helperText}>WadaTrip Mobile</Text>
        <Text style={styles.helperText}>Large apps usually follow this order: saved preference, then device language, then fallback.</Text>
        <Text style={styles.helperText}>WadaTrip now follows that same pattern.</Text>
      </BrandCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fbf4ee' },
  content: { paddingBottom: 40 },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 16,
    color: brand.colors.deep,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    fontFamily: brand.typography.display,
  },
  card: { marginHorizontal: 16 },
  languageCard: { backgroundColor: brand.colors.surfaceMint, borderColor: brand.colors.borderMint },
  accountCard: { backgroundColor: brand.colors.surfaceWarm, borderColor: brand.colors.borderWarm },
  aboutCard: { backgroundColor: '#fffdfb', borderColor: '#ece4da' },
  languageSummary: { marginBottom: 14 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  statusActive: { backgroundColor: '#d7faf1' },
  statusPillText: { color: brand.colors.deep, fontFamily: brand.typography.heading, fontSize: 12, letterSpacing: 0.4 },
  deviceButton: { marginBottom: 12, backgroundColor: '#dd8a63' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: { minWidth: '47%' },
  langChipMuted: { opacity: 0.82 },
  helperText: { color: brand.colors.textMuted, marginBottom: 8, lineHeight: 20, fontFamily: brand.typography.body },
  logout: { marginTop: 8, backgroundColor: brand.colors.accent },
});
