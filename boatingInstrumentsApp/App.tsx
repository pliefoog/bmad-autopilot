import React, { useState, useEffect, useCallback } from 'react';
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
import { useNmeaStore } from './src/core/nmeaStore';
import { useThemeStore, useTheme } from './src/core/themeStore';
import { useWidgetStore } from './src/stores/widgetStore';
import { PaginatedDashboard } from './src/components/PaginatedDashboard';
import { DynamicDashboard } from './src/widgets/DynamicDashboard';
import { WidgetSelector } from './src/widgets/WidgetSelector';
import { AutopilotControlScreen } from './src/widgets/AutopilotControlScreen';
import { AlarmBanner } from './src/widgets/AlarmBanner';
import HeaderBar from './src/components/HeaderBar';
import ToastMessage, { ToastMessageData } from './src/components/ToastMessage';
import { ConnectionConfigDialog } from './src/widgets/ConnectionConfigDialog';
import { PlaybackFilePicker } from './src/widgets/PlaybackFilePicker';
import { getConnectionDefaults } from './src/services/connectionDefaults';
import { globalConnectionService } from './src/services/globalConnectionService';

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
  const [showPlaybackPicker, setShowPlaybackPicker] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageData | null>(null);
  const [useDynamicLayout, setUseDynamicLayout] = useState(true); // Toggle for new layout system

  // Navigation session state
  const [navigationSession, setNavigationSession] = useState<{
    isRecording: boolean;
    startTime?: Date;
    sessionId?: string;
  }>({
    isRecording: false
  });

  // Load persisted data
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
    
    // Initialize global connection service with auto-connect
    const initializeConnection = async () => {
      console.log('[App] Starting auto-connection initialization...');
      
      try {
        await globalConnectionService.initialize();
        console.log('[App] Global connection service initialized successfully');
        
        // Update local state with current connection options
        const currentOptions = globalConnectionService.getCurrentOptions();
        if (currentOptions) {
          console.log('[App] Using connection options:', currentOptions);
          setIp(currentOptions.ip);
          setPort(currentOptions.port.toString());
          setProtocol(currentOptions.protocol);
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
      console.log('[App] Timer fired, calling initializeConnection...');
      initializeConnection();
    }, 1000);

    return () => {
      console.log('[App] Cleaning up connection initialization timer');
      clearTimeout(timer);
    };
  }, [showSuccessToast, showErrorToast]);

  // Theme cycling
  const cycleTheme = useCallback(() => {
    const modes: ('day' | 'night' | 'red-night' | 'auto')[] = ['day', 'night', 'red-night', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    
    // Persist theme preference
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextMode);

    setToastMessage({
      message: `Theme: ${nextMode.toUpperCase()}`,
      type: 'success',
      duration: 2000,
    });
  }, [themeMode, setThemeMode]);

  // Widget management
  const handleWidgetSelectionChange = useCallback((newSelection: string[]) => {
    setSelectedWidgets(newSelection);
    setShowWidgetSelector(false);
  }, []);

  const handleWidgetRemove = useCallback((widgetId: string) => {
    setSelectedWidgets(prev => prev.filter(id => id !== widgetId));
    setToastMessage({
      message: `${widgetId.toUpperCase()} widget removed`,
      type: 'success',
      duration: 3000,
    });
  }, []);

  // Connection handling
  const handleConnectionConnect = useCallback(async (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    setIp(config.ip);
    setPort(config.port.toString());
    setProtocol(config.protocol);
    
    try {
      // Use the new unified connect method
      const success = await globalConnectionService.connect({
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
  const shouldEnableConnectButton = useCallback((config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => {
    return globalConnectionService.shouldEnableConnectButton(config);
  }, []);

  const handleConnectionDisconnect = useCallback(async () => {
    try {
      // Disconnect using global service
      globalConnectionService.disconnect();
      
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
        navigationSession={navigationSession}
        onToggleNavigationSession={handleNavigationSessionToggle}
        toastMessage={toastMessage}
        useDynamicLayout={useDynamicLayout}
        onToggleLayout={() => setUseDynamicLayout(!useDynamicLayout)}
      />

      {/* Alarm Banner */}
      {alarms && alarms.length > 0 && (
        <AlarmBanner alarms={alarms} />
      )}

      {/* Main Dashboard - Takes remaining space */}
      <View style={styles.dashboardArea}>
        {useDynamicLayout ? (
          <DynamicDashboard />
        ) : (
          <PaginatedDashboard
            selectedWidgets={selectedWidgets}
            onWidgetRemove={handleWidgetRemove}
            headerHeight={HEADER_HEIGHT + (alarms?.length > 0 ? ALARM_BANNER_HEIGHT : 0)}
            footerHeight={FOOTER_HEIGHT}
          />
        )}
      </View>

      {/* Footer - Fixed at bottom */}
      <View style={styles.footerArea}>
        {/* Autopilot Control Access */}
        {selectedWidgets.includes('autopilot') && (
          <TouchableOpacity
            style={[styles.autopilotAccess, { backgroundColor: theme.primary }]}
            onPress={() => setShowAutopilotControl(true)}
          >
            <Text style={[styles.autopilotAccessText, { color: theme.surface }]}>
              AUTOPILOT CONTROL
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowWidgetSelector(true)}
          >
            <Text style={[styles.navButtonIcon, { color: theme.primary }]}>+</Text>
            <Text style={[styles.navButtonText, { color: theme.textSecondary }]}>ADD</Text>
          </TouchableOpacity>

          <View style={[styles.navDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity 
            style={styles.navButton}
            onPress={cycleTheme}
          >
            <Text style={styles.navButtonIcon}>{getThemeIcon()}</Text>
            <Text style={[styles.navButtonText, { color: theme.textSecondary }]}>
              {getThemeLabel()}
            </Text>
          </TouchableOpacity>

          <View style={[styles.navDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowConnectionDialog(true)}
          >
            <Text style={[styles.navButtonIcon, { color: theme.primary }]}>🔗</Text>
            <Text style={[styles.navButtonText, { color: theme.textSecondary }]}>CONN</Text>
          </TouchableOpacity>

          <View style={[styles.navDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowPlaybackPicker(true)}
          >
            <Text style={[styles.navButtonIcon, { color: theme.primary }]}>▶</Text>
            <Text style={[styles.navButtonText, { color: theme.textSecondary }]}>DEMO</Text>
          </TouchableOpacity>
        </View>
      </View>

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
        shouldEnableConnectButton={shouldEnableConnectButton}
      />

      {/* Playback File Picker - TODO: Create modal wrapper */}
      {showPlaybackPicker && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 20,
          right: 20,
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 10,
          elevation: 5,
          zIndex: 1000
        }}>
          <PlaybackFilePicker
            onPick={(filename: string) => {
              console.log('Playback file selected:', filename);
              setShowPlaybackPicker(false);
            }}
          />
          <Button 
            title="Cancel" 
            onPress={() => setShowPlaybackPicker(false)}
          />
        </View>
      )}

      {/* Toast Messages */}
      <ToastMessage
        toast={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardArea: {
    flex: 1, // Takes all remaining space between header and footer
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