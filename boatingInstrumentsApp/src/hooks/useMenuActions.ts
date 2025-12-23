import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useThemeStore } from '../store/themeStore';

/**
 * Hook for handling menu action execution
 * Maps action identifiers to actual function calls
 */
export const useMenuActions = () => {
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  const executeAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        // Connection Actions
        case 'openConnectionSettings':
          // Handled by custom handler in HamburgerMenu
          break;

        // Display & Theme Actions
        case 'openDisplayThemeSettings':
          // Handled by custom handler in HamburgerMenu
          break;

        // Units & Formats Actions
        case 'openUnitsConfig':
          // Handled by custom handler in HamburgerMenu
          break;

        // Widgets & Layout Actions
        case 'openLayoutSettings':
          // Handled by custom handler in HamburgerMenu
          break;

        // Alarms Actions
        case 'openAlarmConfiguration':
          // Handled by custom handler in HamburgerMenu
          break;

        case 'openAlarmHistory':
          // Handled by custom handler in HamburgerMenu
          break;

        // About & System Actions
        case 'showAbout':
          // Get version from package.json or use placeholder
          const version = '1.0.0'; // TODO: Import from package.json
          const buildNumber = '100'; // TODO: Get from build config
          Alert.alert(
            'About BMad Autopilot',
            `Version: ${version}\nBuild: ${buildNumber}\n\nA comprehensive marine instrument display for NMEA 2000 networks.\n\n© 2025 BMad Autopilot Team`,
            [{ text: 'OK' }],
          );
          break;

        case 'openHelp':
          Alert.alert('Help & FAQ', 'Opening help documentation...', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Local FAQ',
              onPress: () => {
                // TODO: Navigate to local FAQ screen
                Alert.alert('Local FAQ', 'FAQ screen coming soon');
              },
            },
            {
              text: 'Online Portal',
              onPress: () => {
                // TODO: Add actual documentation URL
                const url = 'https://bmad-autopilot.com/docs';
                Linking.canOpenURL(url).then((supported) => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Cannot open URL');
                  }
                });
              },
            },
          ]);
          break;

        case 'openTermsConditions':
          Alert.alert('Terms & Conditions', 'Opening terms & conditions...', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Online',
              onPress: () => {
                // TODO: Add actual T&C URL
                const url = 'https://bmad-autopilot.com/terms';
                Linking.canOpenURL(url).then((supported) => {
                  if (supported) {
                    Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Cannot open URL');
                  }
                });
              },
            },
          ]);
          break;

        case 'performFactoryReset':
          // Handled by custom handler in HamburgerMenu
          break;

        // Development Tools Actions
        case 'openFeatureFlags':
          // Handled by custom handler in HamburgerMenu
          break;

        default:
          console.warn(`Unknown menu action: ${actionId}`);
      }
    },
    [themeMode, setThemeMode],
  );

  return { executeAction };
};
