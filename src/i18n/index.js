import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
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
if (!['en', 'es', 'fr'].includes(deviceLanguage)) {
  deviceLanguage = 'en';
}

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
