import React, { useState, useEffect, useRef, useCallback, StrictMode } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { log } from '../utils/logging/logger';
import '../utils/memoryProfiler'; // Register profiler functions
import '../utils/memoryDiagnostics'; // Register diagnostic functions
import { useTheme } from '../store/themeStore';
import { useNmeaStore, initializeNmeaStore } from '../store/nmeaStore';
import { useWidgetStore } from '../store/widgetStore';
import { useAlarmStore } from '../store/alarmStore';
import { useOnboarding } from '../hooks/useOnboarding';
import { useToast } from '../hooks/useToast';
import { useAutoHideHeader } from '../hooks/useAutoHideHeader';
import ResponsiveDashboard from '../components/organisms/ResponsiveDashboard';
import { DashboardLayoutProvider, useDashboardLayout } from '../contexts/DashboardLayoutContext';
import HeaderBar, { HEADER_HEIGHT } from '../components/HeaderBar';

import { ToastContainer } from '../components/toast';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { ConnectionConfigDialog } from '../components/dialogs/ConnectionConfigDialog';
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';

import { OnboardingScreen } from '../components/onboarding/OnboardingScreen';
import { UnitsConfigDialog } from '../components/dialogs/UnitsConfigDialog';
import { FactoryResetDialog } from '../components/dialogs/FactoryResetDialog';
import { LayoutSettingsDialog } from '../components/dialogs/LayoutSettingsDialog';
import { DisplayThemeDialog } from '../components/dialogs/DisplayThemeDialog';
import { initializeWidgetSystem } from '../services/initializeWidgetSystem';
import { AlarmHistoryDialog } from '../components/dialogs/AlarmHistoryDialog';
import { SensorConfigDialog } from '../components/dialogs/SensorConfigDialog';
import TestSwitchDialog from '../components/dialogs/TestSwitchDialog';
import { MemoryMonitor } from '../components/MemoryMonitor';
import {
  getConnectionDefaults,
  connectNmea,
  disconnectNmea,
  shouldEnableConnectButton,
  getCurrentConnectionConfig,
  initializeConnection,
} from '../services/connectionDefaults';
import { useUIStore } from '../store/uiStore';

const STORAGE_KEY = 'nmea-connection-config';

/**
 * DashboardContent - Measures layout and provides dimensions via context
 * Must be inside DashboardLayoutProvider to access updateLayout callback
 * Uses absolute positioning to constrain dashboard and adjusts measured height
 * to match the actual available space above bottom safe area
 */
const DashboardContent: React.FC = () => {
  const { updateLayout } = useDashboardLayout();
  const insets = useSafeAreaInsets();
  const isHeaderVisible = useUIStore((state) => state.isHeaderVisible);
  
  // Calculate header height based on visibility
  const headerHeight = isHeaderVisible ? HEADER_HEIGHT : 0;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      // The measured height is AFTER SafeAreaView has already applied top padding
      // We only need to subtract the bottom inset for the home indicator area
      const adjustedHeight = height - insets.bottom;

      updateLayout({
        nativeEvent: {
          layout: { width, height: adjustedHeight },
        },
      } as LayoutChangeEvent);
    },
    [insets.bottom, updateLayout],
  );

  const showHeader = useUIStore((state) => state.showHeader);
  const isHeaderVisible = useUIStore((state) => state.isHeaderVisible);

  return (
    <View style={styles.contentArea} onLayout={handleLayout}>
      {/* Invisible tap zone at top - shows header when tapped */}
      {!isHeaderVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80, // Tap zone height
            zIndex: 100,
          }}
          onPress={showHeader}
          activeOpacity={1} // No visual feedback
          accessibilityLabel="Show menu"
          accessibilityHint="Tap to show the header menu"
        />
      )}
      
      {/* Dashboard fills remaining space - header pushes it down naturally when visible */}
      <View
        style={{
          flex: 1,
        }}
      >
        <ResponsiveDashboard headerHeight={headerHeight} />
      </View>
    </View>
  );
};

const App = () => {
  // Selective subscriptions to prevent re-renders on unrelated state changes
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const lastError = useNmeaStore((state) => state.lastError);
  const activeAlarms = useAlarmStore((state) => state.activeAlarms);
  const theme = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets(); // For bottom spacer only
  const defaults = getConnectionDefaults();
  const [ip, setIp] = useState(defaults.ip);
  const [port, setPort] = useState(defaults.port.toString());
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'websocket'>(defaults.protocol);
  const [showAutopilotControl, setShowAutopilotControl] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showUnitsDialog, setShowUnitsDialog] = useState(false);
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [showLayoutSettingsDialog, setShowLayoutSettingsDialog] = useState(false);
  const [showDisplayThemeDialog, setShowDisplayThemeDialog] = useState(false);
  const [showAlarmHistoryDialog, setShowAlarmHistoryDialog] = useState(false);
  const [showAlarmConfigDialog, setShowAlarmConfigDialog] = useState(false);
  const [alarmConfigSensor, setAlarmConfigSensor] = useState<
    'depth' | 'temperature' | 'engine' | 'battery' | undefined
  >(undefined);
  const [showTestSwitchDialog, setShowTestSwitchDialog] = useState(false);

  // Navigation session state
  const [navigationSession, setNavigationSession] = useState<{
    isRecording: boolean;
    startTime?: Date;
  }>({ isRecording: false });
  
  // Track if any dialog is open (prevents auto-hide)
  const isAnyDialogOpen = 
    showAutopilotControl ||
    showConnectionDialog ||
    showUnitsDialog ||
    showFactoryResetDialog ||
    showLayoutSettingsDialog ||
    showDisplayThemeDialog ||
    showAlarmHistoryDialog ||
    showAlarmConfigDialog ||
    showTestSwitchDialog;
  
  // Enable auto-hide header with smart timing
  useAutoHideHeader(isAnyDialogOpen);

  // Onboarding system integration
  const {
    isOnboardingVisible,
    isLoading: onboardingLoading,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  // NOTE: History pruning removed - now handled automatically by TimeSeriesBuffer

  // Initialize NMEA Store v3 with ReEnrichmentCoordinator
  useEffect(() => {
    initializeNmeaStore();
    log.app('NMEA Store v3 initialized');
  }, []);

  // Memory profiling: Start on mount (Chrome/Edge only)
  useEffect(() => {
    // Access via window to ensure they're registered
    const profiler = (window as any).memoryProfiler || (window as any).__memoryProfiler;

    if (profiler && profiler.isAvailable && profiler.isAvailable()) {
      profiler.start(1000); // Take snapshot every second

      // Use logger.always to bypass suppression for this message
      const showMessage = () => {
        const msg = [
          '',
          '═══════════════════════════════════════════════════',
          '🔇 LOGGING SUPPRESSED - Memory profiling active',
          '═══════════════════════════════════════════════════',
          '',
          '📊 DIAGNOSTIC COMMANDS:',
          '  getCleanMemoryStats()    - Memory usage & growth rate',
          '  getCleanDiagnostics()    - Store/DOM diagnostics',
          '',
          '🔊 LOGGING CONTROL:',
          '  enableLogging()          - Enable all console output',
          '  showReactErrors()        - Show React errors only',
          '  disableLogging()         - Disable all output',
          '',
          '═══════════════════════════════════════════════════',
        ].join('\n');

        // Use original console before suppression
        const _console = (window as any).__originalConsole || console;
        if (_console && _console.log) {
        }
      };

      // Delay to ensure logger has initialized
      setTimeout(showMessage, 100);
    }

    return () => {
      if (profiler && profiler.stop) {
        const stats = profiler.stop();
        if (stats) {
          const _console = (window as any).__originalConsole || console;
          if (_console && _console.log) {
          }
        }
      }
    };
  }, []);

  // Factory reset handler
  const handleFactoryResetConfirm = async () => {
    setShowFactoryResetDialog(false);
    log.app('[App] User confirmed factory reset');

    try {
      // Import the widget store and perform complete factory reset
      const { useWidgetStore } = await import('../store/widgetStore');
      const { resetAppToDefaults } = useWidgetStore.getState();

      await resetAppToDefaults();

      log.app('[App] Factory reset complete - forcing complete app restart');

      // For web: Force a complete page reload to restart the app
      if (Platform.OS === 'web') {
        // Clear any remaining web storage before reload
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Could not clear web storage:', e);
        }

        // Force immediate reload from server, not cache
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location) {
            window.location.reload();
          }
        }, 100);
      } else {
        // For mobile: The app should restart automatically when AsyncStorage is cleared
        log.app('[App] Factory reset complete - app should restart automatically');
      }
    } catch (error) {
      console.error('[App] Error during factory reset:', error);
      // Even if there's an error, try to restart the app
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const handleToggleNavigationSession = () => {
    setNavigationSession((prev) => {
      if (prev.isRecording) {
        // Stop recording session
        const duration = prev.startTime
          ? Math.round((Date.now() - prev.startTime.getTime()) / 1000 / 60)
          : 0;
        toast.showNavigationUpdate(`Navigation session ended (duration: ${duration} minutes)`);
        return { isRecording: false };
      } else {
        // Start recording session
        toast.showNavigationUpdate('Navigation session started');
        return {
          isRecording: true,
          startTime: new Date(),
        };
      }
    });
  };

  // Connection errors no longer show toasts - status LED provides feedback
  // Removed: lastError toast handler (marine WiFi connectivity is intermittent)

  // Dynamic widget lifecycle management - ONLY create widgets when NMEA data is present
  // Selective subscription: only re-render when sensors actually change
  const nmeaSensors = useNmeaStore((state) => state.nmeaData?.sensors);
  const nmeaTimestamp = useNmeaStore((state) => state.nmeaData?.timestamp);
  const nmeaMessageCount = useNmeaStore((state) => state.nmeaData?.messageCount);

  // Use getState() for stable function references (don't cause re-renders)
  // Only subscribe to data that actually needs to trigger re-renders
  const dashboard = useWidgetStore((state) => state.dashboard);
  const enableWidgetAutoRemoval = useWidgetStore((state) => state.enableWidgetAutoRemoval);
  const widgetExpirationTimeout = useWidgetStore((state) => state.widgetExpirationTimeout);

  // Initialize widget system ONCE on app mount (before connection)
  useEffect(() => {
    initializeWidgetSystem();
  }, []); // Empty deps = run once on mount

  // Instance monitoring is now fully event-driven via WidgetRegistrationService
  // No manual start/stop needed - initialized once on mount in initializeWidgetSystem()

  // Dynamic widget lifecycle management - periodic cleanup of expired widgets
  useEffect(() => {
    log.app('[App] 🧹 Setting up dynamic widget lifecycle management');

    // Don't start cleanup if auto-removal is disabled
    if (!enableWidgetAutoRemoval) {
      log.app('[App] Widget auto-removal disabled - skipping cleanup timer');
      return;
    }

    // Run initial cleanup using getState() for stable reference
    useWidgetStore.getState().cleanupExpiredWidgetsWithConfig();

    // Set up periodic cleanup - more frequent for responsive widget removal
    const cleanupInterval = setInterval(() => {
      log.app('[App] 🧹 Running periodic widget expiration cleanup');
      useWidgetStore.getState().cleanupExpiredWidgetsWithConfig();
    }, 15000); // Check every 15 seconds for more responsive widget removal

    return () => clearInterval(cleanupInterval);
  }, [enableWidgetAutoRemoval, widgetExpirationTimeout]); // Only data dependencies, functions via getState()

  // Widget lifecycle is fully event-driven via WidgetRegistrationService
  // No manual widget creation or validation needed - widgets appear/disappear automatically
  // based on sensor data availability through the event-driven system

  // Helper functions now use global toast system
  const showSuccessToast = (message: string) => {
    toast.showSuccess(message);
  };

  const showErrorToast = (message: string) => {
    toast.showError(message);
  };

  // Initialize connection and dynamic widget lifecycle system
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize connection
        await initializeConnection();
        const currentConfig = getCurrentConnectionConfig();
        if (currentConfig) {
          setIp(currentConfig.ip);
          setPort(currentConfig.port.toString());
          setProtocol(currentConfig.protocol);
        }

        // Note: Widget lifecycle management is now fully event-driven via WidgetRegistrationService
        // No explicit initialization needed - widgets update via onWidgetDetected/onWidgetUpdated events

        // Status LED shows connection state - no toast needed
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
        // Status LED shows connection state - no toast needed
      }
    };

    const timer = setTimeout(() => {
      initializeServices();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Sync sensor configurations from persistent storage to volatile cache on app startup
  useEffect(() => {
    const syncPersistentConfigs = async () => {
      try {
        // Dynamic import to avoid circular dependencies
        const { syncConfigsToNmeaStore } = await import('../store/sensorConfigStore');

        // Sync all stored configurations to nmeaStore cache
        const updateSensorThresholds = useNmeaStore.getState().updateSensorThresholds;
        syncConfigsToNmeaStore(updateSensorThresholds);
      } catch (error) {
        console.error('[App] Failed to sync sensor configurations:', error);
      }
    };

    syncPersistentConfigs();
  }, []);

  // Connection handlers
  const handleConnectionConnect = async (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => {
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol as 'tcp' | 'udp');

    try {
      const success = await connectNmea({
        ip: config.ip,
        port: config.port,
        protocol: config.protocol as 'tcp' | 'udp' | 'websocket',
      });

      if (success) {
        // Status LED shows connection state - no toast needed
      }
    } catch (error) {
      // Connection failures are normal in boat WiFi - status LED shows state
    }
  };

  const isConnectButtonEnabled = (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => {
    return shouldEnableConnectButton(config);
  };

  const handleConnectionDisconnect = async () => {
    try {
      disconnectNmea();
      // Status LED shows connection state - no toast needed
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Status LED shows connection state - no toast needed
    }
  };

  // Show onboarding if it's the first run
  if (isOnboardingVisible && !onboardingLoading) {
    return (
      <OnboardingScreen visible={true} onComplete={completeOnboarding} onSkip={skipOnboarding} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardLayoutProvider>
        <View style={[styles.appContent, { backgroundColor: theme.appBackground }]}>
          {/* Header */}
          <HeaderBar
            onShowConnectionSettings={() => setShowConnectionDialog(true)}
            onShowUnitsDialog={() => setShowUnitsDialog(true)}
            onShowFactoryResetDialog={() => setShowFactoryResetDialog(true)}
            onShowLayoutSettings={() => setShowLayoutSettingsDialog(true)}
            onShowDisplayThemeSettings={() => setShowDisplayThemeDialog(true)}
            onShowAlarmHistory={() => setShowAlarmHistoryDialog(true)}
            onShowAlarmConfiguration={() => {
              log.alarm('App: onShowAlarmConfiguration called from HamburgerMenu');
              log.alarm('App: Setting showAlarmConfigDialog to true');
              setShowAlarmConfigDialog(true);
            }}
            navigationSession={navigationSession}
            onToggleNavigationSession={handleToggleNavigationSession}
            onShowAutopilotControl={() => setShowAutopilotControl(true)}
          />

          {/* Alarm Banner - Top Priority Display */}
          <AlarmBanner alarms={activeAlarms} />

          {/* Global Toast Container */}
          <ToastContainer position="top" maxToasts={3} stackDirection="vertical" />

          {/* Main Dashboard - Dynamic Widget Loading */}
          <DashboardContent />

          {/* Modals */}
          <AutopilotControlScreen
            visible={showAutopilotControl}
            onClose={() => setShowAutopilotControl(false)}
          />

          <ConnectionConfigDialog
            visible={showConnectionDialog}
            onClose={() => setShowConnectionDialog(false)}
            onConnect={handleConnectionConnect}
            onDisconnect={handleConnectionDisconnect}
            currentConfig={{
              ip,
              port: parseInt(port, 10),
              protocol: protocol as 'tcp' | 'udp' | 'websocket',
            }}
            shouldEnableConnectButton={isConnectButtonEnabled}
          />

          <UnitsConfigDialog visible={showUnitsDialog} onClose={() => setShowUnitsDialog(false)} />

          <FactoryResetDialog
            visible={showFactoryResetDialog}
            onConfirm={handleFactoryResetConfirm}
            onCancel={() => setShowFactoryResetDialog(false)}
          />

          <LayoutSettingsDialog
            visible={showLayoutSettingsDialog}
            onClose={() => setShowLayoutSettingsDialog(false)}
          />

          <DisplayThemeDialog
            visible={showDisplayThemeDialog}
            onClose={() => setShowDisplayThemeDialog(false)}
          />

          <AlarmHistoryDialog
            visible={showAlarmHistoryDialog}
            onClose={() => setShowAlarmHistoryDialog(false)}
          />

          <SensorConfigDialog
            visible={showAlarmConfigDialog}
            onClose={() => {
              log.alarm('App: Closing SensorConfigDialog');
              setShowAlarmConfigDialog(false);
            }}
            sensorType={alarmConfigSensor}
          />

          <TestSwitchDialog
            visible={showTestSwitchDialog}
            onClose={() => setShowTestSwitchDialog(false)}
          />

          {/* Memory Monitor - DISABLED: Causing infinite render loop */}
          {/* <MemoryMonitor position="bottom-right" updateInterval={1000} /> */}

          {/* Temporary Test Button - Floating */}
          <TouchableOpacity
            onPress={() => setShowTestSwitchDialog(true)}
            style={{
              position: 'absolute',
              bottom: 120,
              right: 20,
              backgroundColor: theme.interactive,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              zIndex: 9999,
            }}
          >
            <Text style={{ color: theme.onColor, fontWeight: '600' }}>TEST SWITCH</Text>
          </TouchableOpacity>
        </View>
      </DashboardLayoutProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  appContent: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
});

// Wrap in StrictMode for development to catch side effects and unsafe patterns
export default __DEV__
  ? () => (
      <StrictMode>
        <App />
      </StrictMode>
    )
  : App;
