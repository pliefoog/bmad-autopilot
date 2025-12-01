import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useThemeStore } from '../store/themeStore';

/**
 * Hook for handling menu action execution
 * Maps action identifiers to actual function calls
 */
export const useMenuActions = () => {
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  const executeAction = useCallback((actionId: string) => {
    switch (actionId) {
      // Vessel Configuration Actions
      case 'openConnectionSettings':
        // This will be handled by parent component
        console.log('Opening connection settings');
        break;
      
      case 'openNetworkSetup':
        Alert.alert('Network Setup', 'Network configuration coming soon');
        break;
      
      case 'openDeviceConfig':
        Alert.alert('Device Configuration', 'Device settings coming soon');
        break;

      // Display Settings Actions
      case 'cycleTheme':
        const modes: ('day' | 'night' | 'red-night' | 'auto')[] = ['day', 'night', 'red-night', 'auto'];
        const currentIndex = modes.indexOf(themeMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setThemeMode(nextMode);
        break;
      
      case 'adjustBrightness':
        Alert.alert('Brightness', 'Brightness control coming soon');
        break;
      
      case 'openLayoutPrefs':
        Alert.alert('Layout Preferences', 'Layout settings coming soon');
        break;

      // Widget Management Actions (auto-discovery only)
      case 'openWidgetSelector':
        // REMOVED: Manual widget addition
        Alert.alert('Auto-Discovery', 'Widgets automatically appear when NMEA data is detected');
        break;
      
      case 'openWidgetConfig':
        Alert.alert('Widget Configuration', 'Widget settings coming soon');
        break;
      
      case 'openLayoutEditor':
        Alert.alert('Dashboard Layout', 'Layout editor coming soon');
        break;

      // System Information Actions
      case 'showAppVersion':
        Alert.alert('App Version', 'BMad Autopilot v1.0.0');
        break;
      
      case 'showConnectionStatus':
        Alert.alert('Connection Status', 'Connection diagnostics coming soon');
        break;
      
      case 'runDiagnostics':
        Alert.alert('System Diagnostics', 'Diagnostics coming soon');
        break;

      // User Preferences Actions
      case 'toggleUnits':
        Alert.alert('Units', 'Unit preferences - handled by custom action');
        break;
      
      case 'selectLanguage':
        Alert.alert('Language', 'Language selection coming soon');
        break;
      
      case 'openNotificationSettings':
        Alert.alert('Notifications', 'Notification settings coming soon');
        break;

      // Development Tools Actions (only available in development)
      case 'startSimulator':
        if (__DEV__) {
          console.log('Starting NMEA simulator');
          // This will be handled by parent component
        }
        break;
      
      case 'stopSimulator':
        if (__DEV__) {
          console.log('Stopping NMEA simulator');
          // This will be handled by parent component
        }
        break;
      
      case 'loadRecording':
        if (__DEV__) {
          Alert.alert('Load Recording', 'Recording selection coming soon');
        }
        break;
      
      case 'testConnection':
        if (__DEV__) {
          Alert.alert('Connection Test', 'Connection testing coming soon');
        }
        break;
      
      case 'openNmeaViewer':
        if (__DEV__) {
          Alert.alert('NMEA Data Viewer', 'Data viewer coming soon');
        }
        break;
      
      case 'showParsingLogs':
        if (__DEV__) {
          Alert.alert('Parsing Logs', 'Log viewer coming soon');
        }
        break;
      
      case 'showConnectionLogs':
        if (__DEV__) {
          Alert.alert('Connection Logs', 'Connection diagnostics coming soon');
        }
        break;
      
      case 'enableWidgetTestMode':
        if (__DEV__) {
          Alert.alert('Widget Test Mode', 'Test mode coming soon');
        }
        break;
      
      case 'openThemePreview':
        if (__DEV__) {
          Alert.alert('Theme Preview', 'Theme preview coming soon');
        }
        break;
      
      case 'enableLayoutDebug':
        if (__DEV__) {
          Alert.alert('Layout Debug', 'Layout debugging coming soon');
        }
        break;
      
      case 'openPerformanceMonitor':
        if (__DEV__) {
          Alert.alert('Performance Monitor', 'Performance monitoring coming soon');
        }
        break;
      
      case 'openErrorLogging':
        if (__DEV__) {
          Alert.alert('Error Logging', 'Error logging coming soon');
        }
        break;
      
      case 'openFeatureFlags':
        if (__DEV__) {
          Alert.alert('Feature Flags', 'Feature flag management coming soon');
        }
        break;

      default:
        console.warn(`Unknown menu action: ${actionId}`);
    }
  }, [themeMode, setThemeMode]);

  return { executeAction };
};