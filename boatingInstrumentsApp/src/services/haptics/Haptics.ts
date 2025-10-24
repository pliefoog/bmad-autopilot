import { Vibration } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';

export type HapticPattern = 'light' | 'medium' | 'long' | 'success' | 'alert';

export const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  long: 100,
  success: [30, 40, 30],
  alert: [200, 100, 200],
};

/**
 * Directly vibrate a named pattern via React Native Vibration API.
 * This is platform-agnostic; platform-specific implementations (expo-haptics) can be added later.
 */
export const vibratePattern = (pattern: HapticPattern | number | number[]) => {
  const payload = typeof pattern === 'string' ? hapticPatterns[pattern] : pattern;
  try {
    Vibration.vibrate(payload as any);
  } catch (e) {
    // In test env or platforms without vibration, fail silently
    // Logging omitted for brevity
  }
};

/**
 * Hook that respects user settings (hapticFeedback) and returns a safe vibrate() function.
 */
export const useHaptics = () => {
  const { themeSettings } = useSettingsStore();

  const vibrate = (pattern: HapticPattern | number | number[]) => {
    if (!themeSettings.hapticFeedback) return;
    vibratePattern(pattern as any);
  };

  return { vibrate };
};

export default {
  hapticPatterns,
  vibratePattern,
  useHaptics,
};
