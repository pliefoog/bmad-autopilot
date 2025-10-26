import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { useWidgetStore } from '../store/widgetStore';
import { useOnboarding } from '../hooks/useOnboarding';
import { useToast } from '../hooks/useToast';
import { DynamicDashboard } from '../widgets/DynamicDashboard';
import HeaderBar from '../components/HeaderBar';
import { ToastContainer } from '../components/toast';
import { ConnectionConfigDialog } from '../widgets/ConnectionConfigDialog';
import { AutopilotControlScreen } from '../widgets/AutopilotControlScreen';
import { AutopilotFooter } from '../components/organisms/AutopilotFooter';
import { OnboardingScreen } from '../components/onboarding/OnboardingScreen';
import { UnitsConfigDialog } from '../components/dialogs/UnitsConfigDialog';
import { FactoryResetDialog } from '../components/dialogs/FactoryResetDialog';
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
  const { connectionStatus, lastError } = useNmeaStore();
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

  // Factory reset handler
  const handleFactoryResetConfirm = async () => {
    setShowFactoryResetDialog(false);
    console.log('[App] User confirmed factory reset');
    
    try {
      // Import the widget store and perform complete factory reset
      const { useWidgetStore } = await import('../store/widgetStore');
      const { resetAppToDefaults } = useWidgetStore.getState();
      
      await resetAppToDefaults();
      
      console.log('[App] Factory reset complete - forcing complete app restart');
      
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
        console.log('[App] Factory reset complete - app should restart automatically');
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
  const { nmeaData } = useNmeaStore();
  const { 
    createInstanceWidget, 
    dashboards, 
    currentDashboard, 
    removeWidget, 
    addWidget, 
    cleanupExpiredWidgetsWithConfig,
    enableWidgetAutoRemoval,
    widgetExpirationTimeout 
  } = useWidgetStore();
  
  // Dynamic widget lifecycle management - periodic cleanup of expired widgets
  useEffect(() => {
    console.log('[App] 🧹 Setting up dynamic widget lifecycle management');
    console.log(`[App] Widget auto-removal: ${enableWidgetAutoRemoval ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[App] Widget expiration timeout: ${widgetExpirationTimeout}ms (${widgetExpirationTimeout / 1000}s)`);
    
    // Run initial cleanup
    cleanupExpiredWidgetsWithConfig();
    
    // Set up periodic cleanup - more frequent for responsive widget removal
    const cleanupInterval = setInterval(() => {
      console.log('[App] 🧹 Running periodic widget expiration cleanup');
      cleanupExpiredWidgetsWithConfig();
    }, 15000); // Check every 15 seconds for more responsive widget removal
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredWidgetsWithConfig, enableWidgetAutoRemoval, widgetExpirationTimeout]);

  // FULLY DYNAMIC WIDGET SYSTEM - widgets created/removed based on live NMEA data only
  useEffect(() => {
    if (!nmeaData || !nmeaData.sensors) {
      console.log('[App] No NMEA data available - no widgets to create/update');
      return;
    }

    console.log('[App] 🔄 DYNAMIC WIDGET LIFECYCLE - Processing NMEA sensors:', {
      timestamp: nmeaData.timestamp,
      messageCount: nmeaData.messageCount,
      availableSensors: Object.keys(nmeaData.sensors),
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
      const sensorData = nmeaData.sensors[sensorType];
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
            addWidget(sensorType, { x: 0, y: 0 }); // Let layout system handle positioning
          }
        }
      }
    });

    // **2. MULTI-INSTANCE SENSORS** (engine, battery, tank, temperature)
    
    // Engine widgets
    if (nmeaData.sensors.engine) {
      Object.keys(nmeaData.sensors.engine).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const engineData = nmeaData.sensors.engine[instance];
        if (engineData?.rpm !== undefined) {
          const widgetId = `engine-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating engine widget: ${widgetId}`);
            createInstanceWidget(instanceStr, 'engine', `Engine ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Battery widgets
    if (nmeaData.sensors.battery) {
      Object.keys(nmeaData.sensors.battery).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const batteryData = nmeaData.sensors.battery[instance];
        if (batteryData?.voltage !== undefined) {
          const widgetId = `battery-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating battery widget: ${widgetId}`);
            createInstanceWidget(instanceStr, 'battery', `Battery ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Tank widgets
    if (nmeaData.sensors.tank) {
      Object.keys(nmeaData.sensors.tank).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const tankData = nmeaData.sensors.tank[instance];
        if (tankData?.level !== undefined && tankData?.type) {
          const widgetId = `tank-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating tank widget: ${widgetId} (${tankData.type})`);
            createInstanceWidget(instanceStr, 'tank', `${tankData.type.toUpperCase()} Tank ${instance + 1}`, { x: 0, y: 0 });
          }
        }
      });
    }

    // Temperature widgets (instance-based IDs for consistency with other multi-instance widgets)
    if (nmeaData.sensors.temperature) {
      Object.keys(nmeaData.sensors.temperature).forEach(instanceStr => {
        const instance = parseInt(instanceStr);
        const tempData = nmeaData.sensors.temperature[instance];
        if (tempData?.value !== undefined) {
          const widgetId = `temp-${instance}`;
          const existingWidget = dashboard.widgets.find(w => w.id === widgetId);
          if (!existingWidget) {
            console.log(`[App] ➕ Creating temperature widget: ${widgetId} (location: ${tempData.location})`);
            addWidget(widgetId, { x: 0, y: 0 });
          }
        }
      });
    }

    console.log('[App] ✅ Dynamic widget processing complete');
  }, [nmeaData, connectionStatus, dashboards, currentDashboard, createInstanceWidget, addWidget]);

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
        console.log('[App] ✅ NMEA sensor processor initialized with widget lifecycle management');
        
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
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}>
      {/* Header */}
      <HeaderBar
        onShowConnectionSettings={() => setShowConnectionDialog(true)}
        onShowUnitsDialog={() => setShowUnitsDialog(true)}
        onShowFactoryResetDialog={() => setShowFactoryResetDialog(true)}
        navigationSession={navigationSession}
        onToggleNavigationSession={handleToggleNavigationSession}
      />

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

      {/* Autopilot Footer */}
      <AutopilotFooter
        onOpenAutopilotControl={() => setShowAutopilotControl(true)}
      />
      
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  contentArea: {
    flex: 1,
    marginBottom: 88, // Account for autopilot footer
  },
});

export default App;
