import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { useNmeaStore, ConnectionStatus } from '../store/nmeaStore';
import { HamburgerMenu } from './organisms/HamburgerMenu';
import { Ionicons } from '@expo/vector-icons';

interface HeaderBarProps {
  onShowConnectionSettings?: () => void;
  onShowUnitsDialog?: () => void;
  onShowFactoryResetDialog?: () => void;
  onShowLayoutSettings?: () => void;
  onShowDisplayThemeSettings?: () => void;
  onShowAlarmConfiguration?: () => void;
  onShowAlarmHistory?: () => void;
  navigationSession?: {
    isRecording: boolean;
    startTime?: Date;
  };
  onToggleNavigationSession?: () => void;
  onShowAutopilotControl?: () => void;
  // Developer tools props (development only)
  onStartPlayback?: () => void;
  onStopPlayback?: () => void;
  onStartStressTest?: () => void;
  onStopStressTest?: () => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  onShowConnectionSettings,
  onShowUnitsDialog,
  onShowFactoryResetDialog,
  onShowLayoutSettings,
  onShowDisplayThemeSettings,
  onShowAlarmConfiguration,
  onShowAlarmHistory,
  navigationSession,
  onToggleNavigationSession,
  onShowAutopilotControl,
  onStartPlayback,
  onStopPlayback,
  onStartStressTest,
  onStopStressTest,
}) => {
  const theme = useTheme();
  const { connectionStatus } = useNmeaStore();
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const insets = useSafeAreaInsets();

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'disconnected':
        return theme.error; // Red
      case 'connecting':
        return theme.warning; // Orange
      case 'connected':
        return theme.success; // Green (connected with active data)
      case 'no-data':
        return theme.warning; // Orange (connected but no data flowing)
      default:
        return theme.error;
    }
  };

  const getAccessibilityLabel = (status: ConnectionStatus): string => {
    switch (status) {
      case 'disconnected':
        return 'Connection status: disconnected';
      case 'connecting':
        return 'Connection status: connecting';
      case 'connected':
        return 'Connection status: active with data';
      case 'no-data':
        return 'Connection status: connected, no data';
      default:
        return 'Connection status: unknown';
    }
  };

  const getCombinedAccessibilityLabel = (status: ConnectionStatus, session?: { isRecording: boolean }): string => {
    const connectionLabel = getAccessibilityLabel(status);
    
    if (status === 'connected') {
      const recordingLabel = session?.isRecording 
        ? 'Recording navigation session - tap to stop' 
        : 'Ready to record - tap to start navigation session';
      return `${connectionLabel}. ${recordingLabel}`;
    }
    
    return `${connectionLabel}. Long press to open connection settings`;
  };

  const getNavigationIcon = (status: ConnectionStatus, session?: { isRecording: boolean }): string | null => {
    // Only show navigation control when connected with data
    if (status !== 'connected') return null;
    
    // Black circle for ready to record, black square for recording
    return session?.isRecording ? '■' : '●';
  };

  const styles = createStyles(theme, insets);

  const handleConnectionLEDPress = () => {
    if (onShowConnectionSettings) {
      onShowConnectionSettings();
    }
  };

  const handleCombinedButtonPress = () => {
    // If connected, handle navigation session toggle
    if (connectionStatus === 'connected' && onToggleNavigationSession) {
      onToggleNavigationSession();
    }
    // Otherwise, no action on tap (long press opens settings)
  };

  const handleHamburgerPress = () => {
    console.log('[HeaderBar] Hamburger menu button pressed');
    setShowHamburgerMenu(true);
  };

  return (
    <>
      <View 
        style={[
          styles.headerContainer, 
          { 
            paddingTop: insets.top + 8, // Safe area + 8pt padding
            paddingBottom: 8, // 8pt bottom padding
          }
        ]} 
        testID="header-container"
      >
        {/* Left: Hamburger Menu Icon */}
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={handleHamburgerPress}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          testID="hamburger-menu-button"
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>

        {/* Center: App Title */}
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={styles.appTitle}>Boat Instruments</Text>
        </View>

        {/* Right: Autopilot + Connection Status */}
        <View style={styles.rightContent}>
          {/* Discrete Autopilot Button */}
          {onShowAutopilotControl && (
            <TouchableOpacity
              style={styles.autopilotButton}
              onPress={onShowAutopilotControl}
              accessibilityRole="button"
              accessibilityLabel="Open autopilot controls"
              testID="autopilot-button"
            >
              <Ionicons name="boat-outline" size={20} color={theme.iconPrimary} />
            </TouchableOpacity>
          )}
          
          {/* Combined Connection Status + Navigation Session Button */}
          <TouchableOpacity
            style={[styles.combinedStatusButton, { marginLeft: 8 }]}
            onPress={handleCombinedButtonPress}
            onLongPress={handleConnectionLEDPress}
            accessibilityRole="button"
            accessibilityLabel={getCombinedAccessibilityLabel(connectionStatus, navigationSession)}
            testID="combined-status-button"
          >
            {/* Connection Status Background */}
            <View
              style={[
                styles.statusBackground,
                {
                  backgroundColor: getStatusColor(connectionStatus),
                  opacity: connectionStatus === 'connecting' ? 0.5 : 1,
                },
              ]}
            >
              {/* Navigation Icon (only when connected) */}
              {getNavigationIcon(connectionStatus, navigationSession) && (
                <View style={styles.navigationIcon}>
                  <Text style={styles.navigationIconText}>
                    {getNavigationIcon(connectionStatus, navigationSession)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hamburger Menu Modal */}
      <HamburgerMenu
        visible={showHamburgerMenu}
        onClose={() => setShowHamburgerMenu(false)}
        onShowUnitsDialog={onShowUnitsDialog}
        onShowFactoryResetDialog={onShowFactoryResetDialog}
        onShowConnectionSettings={onShowConnectionSettings}
        onShowLayoutSettings={onShowLayoutSettings}
        onShowDisplayThemeSettings={onShowDisplayThemeSettings}
        onShowAlarmConfiguration={onShowAlarmConfiguration}
        onShowAlarmHistory={onShowAlarmHistory}
      />
    </>
  );
};

const createStyles = (theme: any, insets: { top: number; bottom: number; left: number; right: number }) =>
  StyleSheet.create({
    headerContainer: {
      // Remove fixed height - use padding to create space
      // This ensures content is centered within the visible area, not the entire container
      paddingVertical: 8, // 8pt top + 8pt bottom = 16pt total padding
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: theme.surface, // AC 5: theme.surface
      borderBottomWidth: 1,
      borderBottomColor: theme.border, // AC 5: theme.border
      // paddingTop will be overridden by inline style with safe area inset
    },
    hamburgerButton: {
      width: 44, // AC 2: 44×44pt touchable area
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hamburgerIcon: {
      fontSize: 24, // AC 2: 24×24pt visual size
      color: theme.text,
      fontWeight: 'normal',
    },
    centerContent: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: insets.top + 8, // Match the container's top padding
      height: 44, // Match button heights for proper vertical alignment
      alignItems: 'center',
      justifyContent: 'center',
    },
    appTitle: {
      fontSize: 16, // AC 3: 16pt
      fontWeight: '600', // AC 3: semibold
      color: theme.text, // AC 3: theme.text
      textAlign: 'center',
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    autopilotButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionButton: {
      width: 44, // Minimum touch target
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionIcon: {
      width: 12, // Same size as connection LED
      height: 12,
      borderRadius: 6, // Circular record button
    },
    connectionLEDButton: {
      width: 44, // Minimum touch target
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    connectionLED: {
      width: 12, // AC 4: 12pt diameter
      height: 12,
      borderRadius: 6,
    },
    // Combined Status Button Styles
    combinedStatusButton: {
      width: 44, // Minimum touch target
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusBackground: {
      width: 20, // Larger than original LED
      height: 20,
      borderRadius: 10, // Circular
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    statusIcon: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusIconText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    navigationIcon: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      width: 12,
      height: 12,
      top: 4,
      left: 4,
    },
    navigationIconText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
  });

export default HeaderBar;