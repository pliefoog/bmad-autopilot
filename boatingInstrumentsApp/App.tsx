import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
  Button
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNmeaStore } from './src/store/nmeaStore';
import { useThemeStore, useTheme } from './src/store/themeStore';
import { useWidgetStore } from './src/store/widgetStore';
import { DynamicDashboard } from './src/widgets/DynamicDashboard';
import { WidgetSelector } from './src/widgets/WidgetSelector';
import { AutopilotControlScreen } from './src/widgets/AutopilotControlScreen';
import { AlarmBanner } from './src/widgets/AlarmBanner';
import HeaderBar from './src/components/HeaderBar';
import { LoadingProvider } from './src/services/loading/LoadingContext';
import LoadingOverlay from './src/components/molecules/LoadingOverlay';
import ToastMessage, { ToastMessageData } from './src/components/ToastMessage';
import { ConnectionConfigDialog } from './src/widgets/ConnectionConfigDialog';
import { 
  getConnectionDefaults, 
  loadConnectionSettings, 
  connectNmea, 
  disconnectNmea, 
  shouldEnableConnectButton, 
  getCurrentConnectionConfig, 
  initializeConnection,
  type ConnectionConfig 
} from './src/services/connectionDefaults';
import { NotificationIntegrationService } from './src/services/integration/NotificationIntegrationService';
import { OnboardingScreen } from './src/components/onboarding/OnboardingScreen';
import { useOnboarding } from './src/hooks/useOnboarding';
import { UndoRedoControls } from './src/components/undo/UndoRedoControls';
import { useUndoRedo } from './src/hooks/useUndoRedo';
import { ThemeChangeCommand } from './src/services/undo/Commands';
import { useKeyboardNavigation, useKeyboardShortcut } from './src/hooks/useKeyboardNavigation';
import { AutopilotFooter } from './src/components/organisms/AutopilotFooter';
import { UnitsConfigDialog } from './src/components/dialogs/UnitsConfigDialog';
import { useLegacyUnitBridge } from './src/presentation/legacyBridge';

// Developer services (only loaded in development)
let playbackService: any = null;
let stressTestService: any = null;

if (__DEV__ || process.env.NODE_ENV === 'development') {
  try {
    playbackService = require('./src/services/playbackService').playbackService;
    stressTestService = require('./src/services/stressTestService').stressTestService;
  } catch (e) {
    console.warn('Developer services not available:', e);
  }
}

// Constants for layout calculations
const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 88; // Autopilot button (70) + bottom nav (18)
const ALARM_BANNER_HEIGHT = 50;

// Storage keys
const SELECTED_WIDGETS_KEY = 'selected-widgets';
const THEME_PREFERENCE_KEY = 'theme-preference';

const App = () => {
  const { connectionStatus, nmeaData, alarms, lastError } = useNmeaStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const { initializeWidgetStatesOnAppStart } = useWidgetStore();
  const theme = useTheme();
  
  // AC13: Undo/Redo integration
  const { executeCommand } = useUndoRedo();
  
  // AC14: Keyboard navigation integration
  useKeyboardNavigation();

  // TEMPORARY: Bridge legacy unit settings to new presentation system
  // TODO: Remove when Phase 3 (new settings UI) is complete
  useLegacyUnitBridge();

  // Onboarding state (Story 4.4 AC11)
  const { 
    isOnboardingVisible, 
    isLoading: isOnboardingLoading, 
    completeOnboarding, 
    skipOnboarding 
  } = useOnboarding();

  // Connection settings
  const defaults = getConnectionDefaults();
  const [ip, setIp] = useState(defaults.ip);
  const [port, setPort] = useState(defaults.port.toString());
  const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'websocket'>(defaults.protocol);

  // Widget and UI state
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([
    'depth', 'speed', 'wind', 'gps', 'compass', 'engine', 'battery', 'tanks', 'autopilot'
  ]);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [showAutopilotControl, setShowAutopilotControl] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showUnitsDialog, setShowUnitsDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageData | null>(null);

  // Navigation session state
  const [navigationSession, setNavigationSession] = useState<{
    isRecording: boolean;
    startTime?: Date;
    sessionId?: string;
  }>({
    isRecording: false
  });

  // Load persisted data and initialize notification system
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Load selected widgets
        const savedWidgets = await AsyncStorage.getItem(SELECTED_WIDGETS_KEY);
        if (savedWidgets) {
          setSelectedWidgets(JSON.parse(savedWidgets));
        }

        // Load theme preference
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme) {
          setThemeMode(savedTheme as 'day' | 'night' | 'red-night' | 'auto');
        }

        // Story 2.15: Initialize widget states on app start
        initializeWidgetStatesOnAppStart();

        // Story 4.3: Initialize notification system
        try {
          const notificationIntegration = NotificationIntegrationService.getInstance();
          await notificationIntegration.initialize();
          console.log('[App] Notification system initialized successfully');
        } catch (error) {
          console.error('[App] Failed to initialize notification system:', error);
        }
      } catch (error) {
        console.error('Failed to load persisted data:', error);
      }
    };

    loadPersistedData();
  }, [initializeWidgetStatesOnAppStart]); // Remove setThemeMode dependency to prevent loop

  // Save selected widgets when changed
  useEffect(() => {
    const saveWidgets = async () => {
      try {
        await AsyncStorage.setItem(SELECTED_WIDGETS_KEY, JSON.stringify(selectedWidgets));
      } catch (error) {
        console.error('Failed to save selected widgets:', error);
      }
    };

    saveWidgets();
  }, [selectedWidgets]);

  // Show toast for errors
  useEffect(() => {
    if (lastError) {
      setToastMessage({
        message: lastError,
        type: 'error',
        duration: 5000,
      });
    }
  }, [lastError]);

  // Auto-detect navigation session start
  useEffect(() => {
    if (!navigationSession.isRecording && nmeaData) {
      const shouldAutoStart = 
        (nmeaData.sog && nmeaData.sog > 2.0) ||
        (nmeaData.engine?.rpm && nmeaData.engine.rpm > 800) ||
        (nmeaData.speed && nmeaData.speed > 2.0);

      if (shouldAutoStart) {
        const sessionId = `nav_${Date.now()}`;
        setNavigationSession({
          isRecording: true,
          startTime: new Date(),
          sessionId
        });

        setToastMessage({
          message: `Navigation session started: ${sessionId}`,
          type: 'success',
          duration: 3000,
        });
      }
    }
  }, [nmeaData, navigationSession.isRecording]);

  // Helper functions for toast messages
  const showSuccessToast = useCallback((message: string) => {
    setToastMessage({
      message,
      type: 'success',
      duration: 3000,
    });
  }, []);

  const showErrorToast = useCallback((message: string) => {
    setToastMessage({
      message,
      type: 'error',
      duration: 5000,
    });
  }, []);

  // Auto-connection initialization
  useEffect(() => {
    console.log('[App] useEffect for connection initialization triggered');
    console.log('[App] isOnboardingVisible:', isOnboardingVisible, 'isOnboardingLoading:', isOnboardingLoading);
    
    // Skip connection initialization if onboarding is visible or still loading
    if (isOnboardingVisible || isOnboardingLoading) {
      console.log('[App] Onboarding is visible or loading, skipping auto-connection');
      return;
    }
    
    // Initialize connection service with auto-connect
    const initializeConnectionService = async () => {
      console.log('[App] Starting auto-connection initialization...');
      
      try {
        await initializeConnection();
        console.log('[App] Connection service initialized successfully');
        
        // Update local state with current connection options
        const currentConfig = getCurrentConnectionConfig();
        if (currentConfig) {
          console.log('[App] Using connection config:', currentConfig);
          setIp(currentConfig.ip);
          setPort(currentConfig.port.toString());
          setProtocol(currentConfig.protocol);
        }

        // Show success toast to indicate auto-connection attempt
        showSuccessToast('Auto-connecting to NMEA Bridge...');
        
      } catch (error) {
        console.error('[App] Failed to initialize connection:', error);
        showErrorToast('Failed to auto-connect to NMEA Bridge');
      }
    };

    console.log('[App] Setting up initialization timer...');
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      console.log('[App] Timer fired, calling initializeConnectionService...');
      initializeConnectionService();
    }, 1000);

    return () => {
      console.log('[App] Cleaning up connection initialization timer');
      clearTimeout(timer);
    };
  }, [isOnboardingVisible, isOnboardingLoading, showSuccessToast, showErrorToast]);

  // Theme cycling (AC13: Using Command pattern for undo/redo)
  const cycleTheme = useCallback(() => {
    const modes: ('day' | 'night' | 'red-night' | 'auto')[] = ['day', 'night', 'red-night', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    // Execute as command for undo/redo support
    executeCommand(new ThemeChangeCommand(nextMode));
    
    // Persist theme preference
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextMode);

    setToastMessage({
      message: `Theme: ${nextMode.toUpperCase()}`,
      type: 'success',
      duration: 2000,
    });
  }, [themeMode, executeCommand]);

  // Widget management
  const handleWidgetSelectionChange = useCallback((newSelection: string[]) => {
    setSelectedWidgets(newSelection);
    setShowWidgetSelector(false);
  }, []);

  // AC14: Global keyboard shortcuts - memoized to prevent re-registration
  const keyboardShortcuts = useMemo(() => [
    {
      key: 't',
      action: cycleTheme,
      description: 'Cycle theme (Day → Night → Red Night → Auto)',
    },
    {
      key: 's',
      action: () => setShowConnectionDialog(true),
      description: 'Open connection settings',
    },
    {
      key: 'w',
      action: () => setShowWidgetSelector(true),
      description: 'Open widget selector',
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals
        setShowConnectionDialog(false);
        setShowWidgetSelector(false);
        setShowAutopilotControl(false);
      },
      description: 'Close modals',
    },
  ], [cycleTheme]);

  // AC14: Register keyboard shortcuts (after all callbacks are defined)
  useKeyboardShortcut(keyboardShortcuts);

  // Handle onboarding completion - open connection dialog as final step
  const handleOnboardingComplete = useCallback(() => {
    completeOnboarding();
    // Show connection dialog as the final step of onboarding
    setTimeout(() => {
      setShowConnectionDialog(true);
    }, 500); // Small delay for smooth transition
  }, [completeOnboarding]);

  // Handle onboarding skip - still trigger connection initialization
  const handleOnboardingSkip = useCallback(() => {
    skipOnboarding();
    // Allow normal auto-connection after skipping
  }, [skipOnboarding]);
  const handleConnectionConnect = useCallback(async (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol);
    
    try {
      // Use the new connection utility
      const success = await connectNmea({
        ip: config.ip,
        port: config.port,
        protocol: config.protocol
      });
      
      if (success) {
        setToastMessage({
          message: `Connected to ${config.ip}:${config.port} (${config.protocol.toUpperCase()})`,
          type: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setToastMessage({
        message: 'Failed to establish connection',
        type: 'error',
        duration: 3000,
      });
    }
  }, []);

  // Check if connect button should be enabled (config different from current)
  const isConnectButtonEnabled = useCallback((config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    return shouldEnableConnectButton(config);
  }, []);

  const handleConnectionDisconnect = useCallback(async () => {
    try {
      // Disconnect using utility function
      disconnectNmea();
      
      setToastMessage({
        message: 'Disconnected from NMEA source',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setToastMessage({
        message: 'Failed to disconnect',
        type: 'error',
        duration: 3000,
      });
    }
  }, []);

  // Navigation session control
  const handleNavigationSessionToggle = useCallback(() => {
    if (navigationSession.isRecording) {
      // Stop recording
      setNavigationSession({ isRecording: false });
      setToastMessage({
        message: 'Navigation session stopped',
        type: 'success',
        duration: 3000,
      });
    } else {
      // Start recording
      const sessionId = `nav_${Date.now()}`;
      setNavigationSession({
        isRecording: true,
        startTime: new Date(),
        sessionId
      });
      setToastMessage({
        message: `Navigation session started: ${sessionId}`,
        type: 'success',
        duration: 3000,
      });
    }
  }, [navigationSession.isRecording]);

  // Developer tool handlers (only available in development)
  const handleStartPlayback = useCallback(() => {
    if (playbackService) {
      try {
        playbackService.startPlayback('demo.nmea');
        setToastMessage({
          message: 'NMEA playback started',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to start playback',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStopPlayback = useCallback(() => {
    if (playbackService) {
      try {
        playbackService.stopPlayback();
        setToastMessage({
          message: 'NMEA playback stopped',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to stop playback',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStartStressTest = useCallback(() => {
    if (stressTestService) {
      try {
        stressTestService.start(500); // 500ms interval
        setToastMessage({
          message: 'Stress test started',
          type: 'warning',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to start stress test',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  const handleStopStressTest = useCallback(() => {
    if (stressTestService) {
      try {
        stressTestService.stop();
        setToastMessage({
          message: 'Stress test stopped',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        setToastMessage({
          message: 'Failed to stop stress test',
          type: 'error',
          duration: 3000,
        });
      }
    }
  }, []);

  // Theme helpers
  const getThemeIcon = () => {
    switch (themeMode) {
      case 'day': return '☀️';
      case 'night': return '🌙';
      case 'red-night': return '🔴';
      case 'auto': return '🔄';
      default: return '🔄';
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'day': return 'DAY';
      case 'night': return 'NIGHT';
      case 'red-night': return 'RED';
      case 'auto': return 'AUTO';
      default: return 'AUTO';
    }
  };

  return (
    <LoadingProvider>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.surface }}>
        <StatusBar 
          backgroundColor={theme.surface} 
          barStyle={themeMode === 'night' || themeMode === 'red-night' ? 'light-content' : 'dark-content'} 
        />
      </SafeAreaView>
      
      {/* Header */}
      <HeaderBar
        onShowConnectionSettings={() => setShowConnectionDialog(true)}
        onShowUnitsDialog={() => setShowUnitsDialog(true)}
        navigationSession={navigationSession}
        onToggleNavigationSession={handleNavigationSessionToggle}
        toastMessage={toastMessage}
        onStartPlayback={handleStartPlayback}
        onStopPlayback={handleStopPlayback}
        onStartStressTest={handleStartStressTest}
        onStopStressTest={handleStopStressTest}
      />

      {/* Alarm Banner */}
      {alarms && alarms.length > 0 && (
        <AlarmBanner alarms={alarms} />
      )}

      {/* Main Dashboard - Takes remaining space */}
      <View style={styles.dashboardArea}>
        <DynamicDashboard />
      </View>

      {/* Fixed Autopilot Footer */}
      <AutopilotFooter
        onOpenAutopilotControl={() => setShowAutopilotControl(true)}
      />

      {/* Modals */}
      <WidgetSelector
        selected={selectedWidgets}
        onChange={handleWidgetSelectionChange}
        visible={showWidgetSelector}
        onClose={() => setShowWidgetSelector(false)}
      />

      <AutopilotControlScreen
        visible={showAutopilotControl}
        onClose={() => setShowAutopilotControl(false)}
      />

      {/* Connection Configuration Dialog */}
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

      {/* Units Configuration Dialog */}
      <UnitsConfigDialog
        visible={showUnitsDialog}
        onClose={() => setShowUnitsDialog(false)}
      />

      {/* Toast Messages */}
        <ToastMessage
          toast={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
        <LoadingOverlay />

      {/* Onboarding Screen (Story 4.4 AC11) */}
      <OnboardingScreen
        visible={isOnboardingVisible}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
      </View>
    </LoadingProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardArea: {
    flex: 1, // Takes all remaining space between header and footer
    marginBottom: 88, // Account for fixed autopilot footer height
  },
  footerArea: {
    // Footer sticks to bottom
  },
  autopilotAccess: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  autopilotAccessText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  navDivider: {
    width: 1,
    marginHorizontal: 4,
  },
});

export default App;