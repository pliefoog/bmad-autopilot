import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../utils/logger'; // Import first to suppress all logging
import '../utils/memoryProfiler'; // Register profiler functions
import '../utils/memoryDiagnostics'; // Register diagnostic functions
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { useWidgetStore } from '../store/widgetStore';
import { useAlarmStore } from '../store/alarmStore';
import { useOnboarding } from '../hooks/useOnboarding';
import { useToast } from '../hooks/useToast';

// Master toggle for App.tsx logging
const ENABLE_APP_LOGGING = false;
const log = (...args: any[]) => ENABLE_APP_LOGGING && console.log(...args);
import { DynamicDashboard } from '../widgets/DynamicDashboard';
import HeaderBar from '../components/HeaderBar';
import { ToastContainer } from '../components/toast';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { ConnectionConfigDialog } from '../components/dialogs/ConnectionConfigDialog';
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';

import { OnboardingScreen } from '../components/onboarding/OnboardingScreen';
import { UnitsConfigDialog } from '../components/dialogs/UnitsConfigDialog';
import { FactoryResetDialog } from '../components/dialogs/FactoryResetDialog';
import { LayoutSettingsDialog } from '../components/dialogs/LayoutSettingsDialog';
import { DisplayThemeDialog } from '../components/dialogs/DisplayThemeDialog';
import { AlarmConfigDialog } from '../components/dialogs/AlarmConfigDialog';
import { AlarmHistoryDialog } from '../components/dialogs/AlarmHistoryDialog';
import TestSwitchDialog from '../components/dialogs/TestSwitchDialog';
import { MemoryMonitor } from '../components/MemoryMonitor';
import { 
  getConnectionDefaults, 
  connectNmea, 
  disconnectNmea, 
  shouldEnableConnectButton, 
  getCurrentConnectionConfig, 
  initializeConnection
} from '../services/connectionDefaults';

const STORAGE_KEY = 'nmea-connection-config';

const App = () => {
  // Selective subscriptions to prevent re-renders on unrelated state changes
  const connectionStatus = useNmeaStore(state => state.connectionStatus);
  const lastError = useNmeaStore(state => state.lastError);
  const activeAlarms = useAlarmStore(state => state.activeAlarms);
  const theme = useTheme();
  const toast = useToast();
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
  const [showAlarmConfigDialog, setShowAlarmConfigDialog] = useState(false);
  const [showAlarmHistoryDialog, setShowAlarmHistoryDialog] = useState(false);
  const [showTestSwitchDialog, setShowTestSwitchDialog] = useState(false);
  
  // Navigation session state
  const [navigationSession, setNavigationSession] = useState<{
    isRecording: boolean;
    startTime?: Date;
  }>({ isRecording: false });
  
  // Onboarding system integration
  const { 
    isOnboardingVisible, 
    isLoading: onboardingLoading, 
    completeOnboarding, 
    skipOnboarding 
  } = useOnboarding();

  // NOTE: History pruning removed - now handled automatically by TimeSeriesBuffer

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
          _console.log(msg);
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
            _console.log(profiler.formatStats(stats));
          }
        }
      }
    };
  }, []);

  // Factory reset handler
  const handleFactoryResetConfirm = async () => {
    setShowFactoryResetDialog(false);
    log('[App] User confirmed factory reset');
    
    try {
      // Import the widget store and perform complete factory reset
      const { useWidgetStore } = await import('../store/widgetStore');
      const { resetAppToDefaults } = useWidgetStore.getState();
      
      await resetAppToDefaults();
      
      log('[App] Factory reset complete - forcing complete app restart');
      
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
        log('[App] Factory reset complete - app should restart automatically');
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
    setNavigationSession(prev => {
      if (prev.isRecording) {
        // Stop recording session
        const duration = prev.startTime ? Math.round((Date.now() - prev.startTime.getTime()) / 1000 / 60) : 0;
        toast.showNavigationUpdate(`Navigation session ended (duration: ${duration} minutes)`);
        return { isRecording: false };
      } else {
        // Start recording session
        toast.showNavigationUpdate('Navigation session started');
        return { 
          isRecording: true,
          startTime: new Date()
        };
      }
    });
  };

  // Show toast for errors (with duplicate prevention and debouncing)
  const lastShownError = useRef<string | undefined>(undefined);
  const errorToastTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any pending error toast
    if (errorToastTimeout.current) {
      clearTimeout(errorToastTimeout.current);
      errorToastTimeout.current = null;
    }
    
    if (lastError && lastError !== lastShownError.current) {
      // Debounce error toasts to prevent rapid firing
      errorToastTimeout.current = setTimeout(() => {
        toast.showError(lastError, { source: 'nmea_system' });
        lastShownError.current = lastError;
        errorToastTimeout.current = null;
      }, 250); // 250ms debounce
    } else if (!lastError) {
      // Clear the reference when error is cleared
      lastShownError.current = undefined;
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (errorToastTimeout.current) {
        clearTimeout(errorToastTimeout.current);
      }
    };
  }, [lastError]);

  // Dynamic widget lifecycle management - ONLY create widgets when NMEA data is present
  // Selective subscription: only re-render when sensors actually change
  const nmeaSensors = useNmeaStore(state => state.nmeaData?.sensors);
  const nmeaTimestamp = useNmeaStore(state => state.nmeaData?.timestamp);
  const nmeaMessageCount = useNmeaStore(state => state.nmeaData?.messageCount);
  
  // Use getState() for stable function references (don't cause re-renders)
  // Only subscribe to data that actually needs to trigger re-renders
  const dashboards = useWidgetStore(state => state.dashboards);
  const currentDashboard = useWidgetStore(state => state.currentDashboard);
  const enableWidgetAutoRemoval = useWidgetStore(state => state.enableWidgetAutoRemoval);
  const widgetExpirationTimeout = useWidgetStore(state => state.widgetExpirationTimeout);
  
  // Start instance monitoring when connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      log('[App] 🔍 Starting instance monitoring for auto-detection');
      useWidgetStore.getState().startInstanceMonitoring();
    }
  }, [connectionStatus]);

  // Dynamic widget lifecycle management - periodic cleanup of expired widgets
  useEffect(() => {
    log('[App] 🧹 Setting up dynamic widget lifecycle management');
    console.log(`[App] Widget auto-removal: ${enableWidgetAutoRemoval ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[App] Widget expiration timeout: ${widgetExpirationTimeout}ms (${widgetExpirationTimeout / 1000}s)`);
    
    // Run initial cleanup using getState() for stable reference
    useWidgetStore.getState().cleanupExpiredWidgetsWithConfig();
    
    // Set up periodic cleanup - more frequent for responsive widget removal
    const cleanupInterval = setInterval(() => {
      log('[App] 🧹 Running periodic widget expiration cleanup');
      useWidgetStore.getState().cleanupExpiredWidgetsWithConfig();
    }, 15000); // Check every 15 seconds for more responsive widget removal
    
    return () => clearInterval(cleanupInterval);
  }, [enableWidgetAutoRemoval, widgetExpirationTimeout]); // Only data dependencies, functions via getState()

  // FULLY DYNAMIC WIDGET SYSTEM - widgets created/removed based on live NMEA data only
  useEffect(() => {
    if (!nmeaSensors) {
      log('[App] No NMEA data available - no widgets to create/update');
      return;
    }

    log('[App] 🔄 DYNAMIC WIDGET LIFECYCLE - Processing NMEA sensors:', {
      timestamp: nmeaTimestamp,
      messageCount: nmeaMessageCount,
      availableSensors: Object.keys(nmeaSensors),
      connectionStatus
    });

    const dashboard = dashboards.find(d => d.id === currentDashboard);
    if (!dashboard) {
      console.warn('[App] No current dashboard found');
      return;
    }

    // **1. SINGLE-INSTANCE SENSORS** (depth, gps, speed, wind, compass)
    const singleInstanceSensors = ['depth', 'gps', 'speed', 'wind', 'compass'];
    singleInstanceSensors.forEach(sensorType => {
      const sensorData = nmeaSensors[sensorType];
      if (sensorData && Object.keys(sensorData).length > 0) {
        // Check if we have valid data for this sensor type
        const firstInstance = Object.values(sensorData)[0] as any;
        let hasValidData = false;

        switch (sensorType) {
          case 'depth':
            hasValidData = firstInstance?.depth !== undefined;
            break;
          case 'gps':
            hasValidData = firstInstance?.position?.latitude !== undefined && firstInstance?.position?.longitude !== undefined;
            break;
          case 'speed':
            hasValidData = firstInstance?.throughWater !== undefined || firstInstance?.overGround !== undefined;
            break;
          case 'wind':
            hasValidData = firstInstance?.speed !== undefined && firstInstance?.angle !== undefined;
            break;
          case 'compass':
            hasValidData = firstInstance?.heading !== undefined;
            break;
        }

        if (hasValidData) {
          const existingWidget = dashboard.widgets.find(w => w.id === sensorType);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating ${sensorType} widget (single-instance)`);
            useWidgetStore.getState().addWidget(sensorType, { x: 0, y: 0 }); // Let layout system handle positioning
          }
        }
      }
    });

    // **2. MULTI-INSTANCE SENSORS** (engine, battery, tank, temperature)
    
    // Engine widgets
    if (nmeaSensors.engine) {
      Object.keys(nmeaSensors.engine).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const engineData = nmeaSensors.engine[instance];
        if (engineData?.rpm !== undefined) {
          const widgetId = `engine-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating engine widget: ${widgetId}`);
            useWidgetStore.getState().createInstanceWidget(instanceStr, 'engine', `Engine ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Battery widgets
    if (nmeaSensors.battery) {
      Object.keys(nmeaSensors.battery).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const batteryData = nmeaSensors.battery[instance];
        if (batteryData?.voltage !== undefined) {
          const widgetId = `battery-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating battery widget: ${widgetId}`);
            useWidgetStore.getState().createInstanceWidget(instanceStr, 'battery', `Battery ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Tank widgets
    if (nmeaSensors.tank) {
      Object.keys(nmeaSensors.tank).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const tankData = nmeaSensors.tank[instance];
        if (tankData?.level !== undefined && tankData?.type) {
          const widgetId = `tank-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating tank widget: ${widgetId} (${tankData.type})`);
            useWidgetStore.getState().createInstanceWidget(instanceStr, 'tank', `${tankData.type.toUpperCase()} Tank ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Temperature widgets (instance-based IDs for consistency with other multi-instance widgets)
    if (nmeaSensors.temperature) {
      Object.keys(nmeaSensors.temperature).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const tempData = nmeaSensors.temperature[instance];
        if (tempData?.value !== undefined) {
          const widgetId = `temp-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating temperature widget: ${widgetId} (location: ${tempData.location})`);
            useWidgetStore.getState().addWidget(widgetId, { x: 0, y: 0 });
          }
        }
      });
    }

    log('[App] ✅ Dynamic widget processing complete');
  }, [nmeaSensors, nmeaTimestamp, connectionStatus, dashboards, currentDashboard]); // Functions via getState()

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
        
        // Initialize NMEA sensor processor with widget store for timestamp updates
        const { nmeaSensorProcessor } = await import('../services/nmea/data/NmeaSensorProcessor');
        nmeaSensorProcessor.initializeWidgetStore();
        log('[App] ✅ NMEA sensor processor initialized with widget lifecycle management');
        
        toast.showConnectionSuccess('Auto-connecting to NMEA Bridge...');
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
        toast.showConnectionError('Failed to initialize application services');
      }
    };

    const timer = setTimeout(() => {
      initializeServices();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Connection handlers
  const handleConnectionConnect = async (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol as 'tcp' | 'udp');
    
    try {
      const success = await connectNmea({
        ip: config.ip,
        port: config.port,
        protocol: config.protocol as 'tcp' | 'udp' | 'websocket'
      });
      
      if (success) {
        toast.showConnectionSuccess(`Connected to ${config.ip}:${config.port} (${config.protocol.toUpperCase()})`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.showConnectionError('Failed to establish connection');
    }
  };

  const isConnectButtonEnabled = (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    return shouldEnableConnectButton(config);
  };

  const handleConnectionDisconnect = async () => {
    try {
      disconnectNmea();
      toast.showConnectionSuccess('Disconnected from NMEA source');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.showConnectionError('Failed to disconnect');
    }
  };

  // Show onboarding if it's the first run
  if (isOnboardingVisible && !onboardingLoading) {
    return (
      <OnboardingScreen
        visible={true}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.appBackground }]} edges={['bottom']}>
      {/* Header */}
      <HeaderBar
        onShowConnectionSettings={() => setShowConnectionDialog(true)}
        onShowUnitsDialog={() => setShowUnitsDialog(true)}
        onShowFactoryResetDialog={() => setShowFactoryResetDialog(true)}
        onShowLayoutSettings={() => setShowLayoutSettingsDialog(true)}
        onShowDisplayThemeSettings={() => setShowDisplayThemeDialog(true)}
        onShowAlarmConfiguration={() => setShowAlarmConfigDialog(true)}
        onShowAlarmHistory={() => setShowAlarmHistoryDialog(true)}
        navigationSession={navigationSession}
        onToggleNavigationSession={handleToggleNavigationSession}
        onShowAutopilotControl={() => setShowAutopilotControl(true)}
      />

      {/* Alarm Banner - Top Priority Display */}
      <AlarmBanner alarms={activeAlarms} />

      {/* Global Toast Container */}
      <ToastContainer 
        position="top"
        maxToasts={3}
        stackDirection="vertical"
      />

      {/* Main Dashboard - Dynamic Widget Loading */}
      <View style={styles.contentArea}>
        <DynamicDashboard />
      </View>
      
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
          protocol: protocol as 'tcp' | 'udp' | 'websocket'
        }}
        shouldEnableConnectButton={isConnectButtonEnabled}
      />

      <UnitsConfigDialog
        visible={showUnitsDialog}
        onClose={() => setShowUnitsDialog(false)}
      />

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

      <AlarmConfigDialog
        visible={showAlarmConfigDialog}
        onClose={() => setShowAlarmConfigDialog(false)}
      />

      <AlarmHistoryDialog
        visible={showAlarmHistoryDialog}
        onClose={() => setShowAlarmHistoryDialog(false)}
      />

      <TestSwitchDialog
        visible={showTestSwitchDialog}
        onClose={() => setShowTestSwitchDialog(false)}
      />

      {/* Memory Monitor - Real-time memory usage display */}
      <MemoryMonitor position="bottom-right" updateInterval={1000} />

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
        <Text style={{ color: theme.onColor, fontWeight: '600' }}>
          TEST SWITCH
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  contentArea: {
    flex: 1,
  },
});

export default App;
