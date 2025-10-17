import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../core/themeStore';
import { useNmeaStore, ConnectionStatus } from '../core/nmeaStore';
import HamburgerMenu from './HamburgerMenu';

interface HeaderBarProps {
  onShowConnectionSettings?: () => void;
  toastMessage?: {
    message: string;
    type: 'error' | 'warning' | 'success';
  } | null;
  navigationSession?: {
    isRecording: boolean;
    startTime?: Date;
  };
  onToggleNavigationSession?: () => void;
  useDynamicLayout?: boolean;
  onToggleLayout?: () => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  onShowConnectionSettings,
  toastMessage,
  navigationSession,
  onToggleNavigationSession,
  useDynamicLayout = true,
  onToggleLayout,
}) => {
  const theme = useTheme();
  const { connectionStatus } = useNmeaStore();
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

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

  const styles = createStyles(theme);

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
    setShowHamburgerMenu(true);
  };

  return (
    <>
      <View style={styles.headerContainer} testID="header-container">
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

        {/* Center: App Title or Toast Message */}
        <View style={styles.centerContent}>
          {toastMessage ? (
            <View style={[styles.toastContainer, getToastStyle(toastMessage.type, theme)]}>
              <Text style={[styles.toastText, getToastTextStyle(toastMessage.type, theme)]}>
                {toastMessage.message}
              </Text>
            </View>
          ) : (
            <Text style={styles.appTitle}>Boat Instruments</Text>
          )}
        </View>

        {/* Layout Toggle Button */}
        {onToggleLayout && (
          <TouchableOpacity
            style={[styles.layoutToggleButton, { backgroundColor: useDynamicLayout ? theme.primary : theme.surface }]}
            onPress={onToggleLayout}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${useDynamicLayout ? 'classic' : 'dynamic'} layout`}
            testID="layout-toggle-button"
          >
            <Text style={[styles.layoutToggleText, { color: useDynamicLayout ? theme.surface : theme.text }]}>
              {useDynamicLayout ? 'DYN' : 'CLA'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Right: Combined Status + Navigation Control */}
        <View style={styles.rightContent}>
          {/* Combined Connection Status + Navigation Session Button */}
          <TouchableOpacity
            style={styles.combinedStatusButton}
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
        onShowConnectionSettings={onShowConnectionSettings}
      />
    </>
  );
};

const getToastStyle = (type: 'error' | 'warning' | 'success', theme: any) => {
  switch (type) {
    case 'error':
      return { backgroundColor: theme.error };
    case 'warning':
      return { backgroundColor: theme.warning };
    case 'success':
      return { backgroundColor: theme.success };
    default:
      return { backgroundColor: theme.error };
  }
};

const getToastTextStyle = (type: 'error' | 'warning' | 'success', theme: any) => {
  switch (type) {
    case 'error':
      return { color: '#FFFFFF' }; // White text on red
    case 'warning':
      return { color: theme.text }; // Dark text on orange
    case 'success':
      return { color: '#FFFFFF' }; // White text on green
    default:
      return { color: '#FFFFFF' };
  }
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    headerContainer: {
      height: 60, // AC 1: 60pt height
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: theme.surface, // AC 5: theme.surface
      borderBottomWidth: 1,
      borderBottomColor: theme.border, // AC 5: theme.border
      // Handle notches/safe areas automatically with React Native
      paddingTop: 0, // Let React Native handle safe area padding
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
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 8,
    },
    appTitle: {
      fontSize: 16, // AC 3: 16pt
      fontWeight: '600', // AC 3: semibold
      color: theme.text, // AC 3: theme.text
      textAlign: 'center',
    },
    toastContainer: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      maxWidth: '100%',
    },
    toastText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8, // Space between session button and LED
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
      color: '#ffffff',
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
      color: 'rgba(255, 255, 255, 1)', // Black icon as specified
      textAlign: 'center',
    },
    // Layout Toggle Button Styles
    layoutToggleButton: {
      width: 36,
      height: 28,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#666',
    },
    layoutToggleText: {
      fontSize: 10,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

export default HeaderBar;