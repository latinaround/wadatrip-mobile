import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

const KEY = 'wadatrip.language';
const SUPPORTED = ['en', 'es', 'fr', 'zh'];
const FALLBACK = 'en';

export const normalizeLanguage = (lang) => {
  const base = String(lang || '').toLowerCase().split('-')[0];
  return SUPPORTED.includes(base) ? base : FALLBACK;
};

export const getDeviceLanguage = () => {
  try {
    const locales = getLocales();
    const raw = locales?.[0]?.languageCode || locales?.[0]?.languageTag || '';
    return normalizeLanguage(raw);
  } catch {
    return FALLBACK;
  }
};

export const getSavedLanguage = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeLanguage(raw);
  } catch {
    return null;
  }
};

export const setSavedLanguage = async (lang) => {
  try {
    await AsyncStorage.setItem(KEY, normalizeLanguage(lang));
  } catch {}
};

export const clearSavedLanguage = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
};

export const resolveAppLanguage = async () => {
  const saved = await getSavedLanguage();
  if (saved) return saved;
  return getDeviceLanguage();
};
