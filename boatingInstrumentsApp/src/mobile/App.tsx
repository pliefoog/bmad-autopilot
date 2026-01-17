import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNmeaStore } from '../store/nmeaStore';
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
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';

import { OnboardingScreen } from '../components/onboarding/OnboardingScreen';
import { initializeWidgetSystem } from '../services/initializeWidgetSystem';

// Lazy load dialogs for better initial bundle size (~100KB reduction)
const ConnectionConfigDialog = React.lazy(() => import('../components/dialogs/ConnectionConfigDialog').then(m => ({ default: m.ConnectionConfigDialog })));
const UnitsConfigDialog = React.lazy(() => import('../components/dialogs/UnitsConfigDialog').then(m => ({ default: m.UnitsConfigDialog })));
const FactoryResetDialog = React.lazy(() => import('../components/dialogs/FactoryResetDialog').then(m => ({ default: m.FactoryResetDialog })));
const LayoutSettingsDialog = React.lazy(() => import('../components/dialogs/LayoutSettingsDialog').then(m => ({ default: m.LayoutSettingsDialog })));
const DisplayThemeDialog = React.lazy(() => import('../components/dialogs/DisplayThemeDialog').then(m => ({ default: m.DisplayThemeDialog })));
const AlarmHistoryDialog = React.lazy(() => import('../components/dialogs/AlarmHistoryDialog').then(m => ({ default: m.AlarmHistoryDialog })));
const SensorConfigDialog = React.lazy(() => import('../components/dialogs/SensorConfigDialog').then(m => ({ default: m.SensorConfigDialog })));
import { MemoryMonitor } from '../components/MemoryMonitor';
import {
  getConnectionDefaults,
  loadConnectionSettings,
  connectNmea,
  disconnectNmea,
  shouldEnableConnectButton,
  getCurrentConnectionConfig,
  initializeConnection,
} from '../services/connectionDefaults';
import { useUIStore } from '../store/uiStore';

const STORAGE_KEY = 'nmea-connection-config';

/**
 * DialogLoadingFallback - Loading indicator for lazy-loaded dialogs
 * Shows minimal spinner while dialog code is loading
 */
const DialogLoadingFallback: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <View style={{ backgroundColor: '#1a1f2e', padding: 20, borderRadius: 8 }}>
      <Text style={{ color: '#fff', fontSize: 14 }}>Loading...</Text>
    </View>
  </View>
);

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
      <View style={{ flex: 1 }}>
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
    showAlarmConfigDialog;
  
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
  // NOTE: NMEA Store v4 auto-initializes (Zustand pattern) - no manual init needed

  // Load saved connection settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      const savedConfig = await loadConnectionSettings();
      setIp(savedConfig.ip);
      setPort(savedConfig.port.toString());
      setProtocol(savedConfig.protocol);
    };
    loadSavedSettings();
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
          log.app('[App] Initialization complete - available commands listed in logs');
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
            log.app('[App] Profiler stopped', () => ({
              stats: typeof stats === 'object' ? Object.keys(stats) : String(stats),
            }));
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
          log.app('[App] Could not clear web storage', () => ({
            error: e instanceof Error ? e.message : String(e),
          }));
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
      log.app('[App] Error during factory reset', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
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
  // Use getState() for stable function references (don't cause re-renders)
  // Only subscribe to data that actually needs to trigger re-renders
  const dashboard = useWidgetStore((state) => state.dashboard);

  // Initialize widget system ONCE on app mount (before connection)
  useEffect(() => {
    initializeWidgetSystem();
  }, []); // Empty deps = run once on mount

  // Instance monitoring is now fully event-driven via WidgetRegistrationService
  // No manual start/stop needed - initialized once on mount in initializeWidgetSystem()

  // Widget expiration is now handled internally by WidgetRegistrationService
  // No need for external cleanup interval - service manages its own timer
  // Timer frequency: staleness threshold / 4 (e.g., 75s for 5min threshold)
  // Expiration logic uses same criteria as widget creation (prevents race conditions)

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
        // Widget lifecycle is fully event-driven via WidgetRegistrationService
        // Widgets appear/disappear automatically based on sensor data availability
        // No explicit initialization needed - widgets update via direct store updates

        // Status LED shows connection state - no toast needed
      } catch (error) {
        log.app('[App] Failed to initialize services', () => ({
          error: error instanceof Error ? error.message : String(error),
        }));
        // Status LED shows connection state - no toast needed
      }
    };

    const timer = setTimeout(() => {
      initializeServices();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // NOTE: Sensor config persistence is now handled in SensorDataRegistry.update()
  // When a sensor is created, it automatically checks AsyncStorage and loads
  // persisted config if available, or applies schema defaults if not.
  // This eliminates the race condition and two-phase initialization pattern.

  // Connection handlers
  const handleConnectionConnect = async (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => {
    log.app('[App] Connection config received', () => ({ ...config }));
    
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol as 'tcp' | 'udp');

    log.app('[App] Connecting with protocol', () => ({ protocol: config.protocol }));

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
      await disconnectNmea();
      // Status LED shows connection state - no toast needed
    } catch (error) {
      log.app('[App] Failed to disconnect', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
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

          <React.Suspense fallback={<DialogLoadingFallback />}>
            {showConnectionDialog && (
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
            )}

            {showUnitsDialog && (
              <UnitsConfigDialog visible={showUnitsDialog} onClose={() => setShowUnitsDialog(false)} />
            )}

            {showFactoryResetDialog && (
              <FactoryResetDialog
                visible={showFactoryResetDialog}
                onConfirm={handleFactoryResetConfirm}
                onCancel={() => setShowFactoryResetDialog(false)}
              />
            )}

            {showLayoutSettingsDialog && (
              <LayoutSettingsDialog
                visible={showLayoutSettingsDialog}
                onClose={() => setShowLayoutSettingsDialog(false)}
              />
            )}

            {showDisplayThemeDialog && (
              <DisplayThemeDialog
                visible={showDisplayThemeDialog}
                onClose={() => setShowDisplayThemeDialog(false)}
              />
            )}

            {showAlarmHistoryDialog && (
              <AlarmHistoryDialog
                visible={showAlarmHistoryDialog}
                onClose={() => setShowAlarmHistoryDialog(false)}
              />
            )}

            {showAlarmConfigDialog && (
              <SensorConfigDialog
                visible={showAlarmConfigDialog}
                onClose={() => {
                  log.alarm('App: Closing SensorConfigDialog');
                  setShowAlarmConfigDialog(false);
                }}
                sensorType={alarmConfigSensor}
              />
            )}
          </React.Suspense>

          {/* Memory Monitor - DISABLED: Causing infinite render loop */}
          {/* <MemoryMonitor position="bottom-right" updateInterval={1000} /> */}
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

// StrictMode disabled due to incompatibility with react-native-gesture-handler
// GestureDetector triggers findNodeHandle warnings that cannot be resolved
// All StrictMode bugs have been fixed during development
export default App;
