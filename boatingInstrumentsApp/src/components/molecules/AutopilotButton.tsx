import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { AutopilotStatus, AutopilotMode } from '../../types/autopilot.types';

interface AutopilotButtonProps {
  status: AutopilotStatus;
  mode: AutopilotMode;
  targetHeading?: number;
  actualHeading?: number;
  onPress: () => void;
  onLongPress: () => void;
  style?: ViewStyle;
}

export const AutopilotButton: React.FC<AutopilotButtonProps> = ({
  status,
  mode,
  targetHeading,
  actualHeading,
  onPress,
  onLongPress,
  style,
}) => {
  const theme = useTheme();

  // Determine button state and colors based on autopilot status
  const getButtonState = () => {
    switch (status) {
      case 'engaged':
      case 'turning':
      case 'tracking':
        return {
          backgroundColor: theme.primary, // Blue/Green for engaged
          textColor: theme.surface,
          text: `AUTOPILOT ENGAGED${targetHeading ? ` • HDG ${Math.round(targetHeading)}°` : ''}`,
          isActive: true,
        };
      case 'standby':
        return {
          backgroundColor: theme.warning, // Orange/Yellow for standby
          textColor: theme.surface,
          text: 'AUTOPILOT STANDBY',
          isActive: false,
        };
      case 'error':
        return {
          backgroundColor: theme.error, // Red for error
          textColor: theme.surface,
          text: 'AUTOPILOT ERROR',
          isActive: false,
        };
      case 'calibrating':
        return {
          backgroundColor: theme.secondary, // Blue for calibrating
          textColor: theme.surface,
          text: 'AUTOPILOT CALIBRATING',
          isActive: false,
        };
      case 'off':
      default:
        return {
          backgroundColor: theme.background, // Gray for off
          textColor: theme.text,
          text: 'AUTOPILOT OFF',
          isActive: false,
        };
    }
  };

  const buttonState = getButtonState();

  // Handle button press
  const handlePress = useCallback(() => {
    // TODO: Add haptic feedback when available
    onPress();
  }, [onPress]);

  // Handle long press for emergency disengage
  const handleLongPress = useCallback(() => {
    // TODO: Add haptic feedback when available
    onLongPress();
  }, [onLongPress]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: buttonState.backgroundColor,
          borderColor: buttonState.isActive ? theme.primary : theme.border,
        },
        style,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={2000} // 2 second long press for safety
      activeOpacity={0.8}
      testID="autopilot-button"
      accessibilityLabel={buttonState.text}
      accessibilityHint="Single tap to open autopilot controls. Long press for emergency disengage."
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: buttonState.textColor,
            fontSize: buttonState.isActive ? 16 : 14,
            fontWeight: buttonState.isActive ? 'bold' : '600',
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {buttonState.text}
      </Text>
      
      {/* Mode indicator for engaged state */}
      {buttonState.isActive && mode !== 'standby' && (
        <Text
          style={[
            styles.modeText,
            { color: buttonState.textColor }
          ]}
          numberOfLines={1}
        >
          {mode.toUpperCase()} MODE
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72, // Fixed height for consistency
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // High contrast shadow for visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
});

export default AutopilotButton;