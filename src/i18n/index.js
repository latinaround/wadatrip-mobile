import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  zh: { translation: zh },
};

// Detect device language safely
let deviceLanguage = 'en'; // default fallback

try {
  const locales = getLocales();
  if (locales && locales.length > 0) {
    deviceLanguage = locales[0].languageCode; // obtiene "en", "es", "fr"
  }
} catch (e) {
  console.warn('Localization not available, using default "en"');
}

// Ensure only supported languages are used
if (!['en', 'es', 'fr', 'zh'].includes(deviceLanguage)) {
  deviceLanguage = 'en';
}

// Optional override via env/extra to force a default language during testing
try {
  const extra = (global?.expo?.ExpoModules?.ExponentConstants?.appOwnership ? {} : (require('expo-constants')?.default?.expoConfig?.extra)) || {};
  const envLang = (typeof process !== 'undefined' ? process?.env?.EXPO_PUBLIC_DEFAULT_LANG : undefined);
  const forced = String(extra?.DEFAULT_LANG || envLang || '').toLowerCase();
  if (forced && ['en','es','fr','zh'].includes(forced)) deviceLanguage = forced;
} catch {}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3', // For React Native compatibility
  });

export default i18n;
