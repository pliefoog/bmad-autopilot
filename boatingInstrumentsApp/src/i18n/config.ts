/**
 * i18n Configuration
 *
 * Internationalization setup for BMad Autopilot app
 * Supports multiple languages with fallback to English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';

const LANGUAGE_KEY = '@bmad:language';

/**
 * Language detector plugin for React Native
 */
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // Try to get saved language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device language
      const deviceLanguage = Platform.select({
        ios: 'en', // iOS would use NativeModules.SettingsManager.settings.AppleLocale
        android: 'en', // Android would use NativeModules.I18nManager.localeIdentifier
        default: 'en',
      });

      callback(deviceLanguage);
    } catch (error) {
      console.error('[i18n] Language detection failed:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('[i18n] Failed to cache language:', error);
    }
  },
};

/**
 * Initialize i18next
 */
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
    },
    fallbackLng: 'en',
    debug: __DEV__,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Important for React Native
    },
  });

export default i18n;

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Change language programmatically
 */
export async function changeLanguage(languageCode: LanguageCode): Promise<void> {
  try {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
  } catch (error) {
    console.error('[i18n] Failed to change language:', error);
    throw error;
  }
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return language ? language.nativeName : code;
}
