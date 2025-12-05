/**
 * PlatformToggle Component
 * Story 13.2.2 - Task 2: Platform-native toggle/switch rendering
 * Epic 8 - Phase 1: TV Support Extension
 * 
 * Features:
 * - iOS: Native Switch component
 * - Android: Material Design toggle
 * - Web: Custom styled toggle with hover states
 * - TV: Enlarged toggle with focus border (2x scale)
 * - Accessible label integration
 * - Disabled state (opacity 0.5)
 * - Theme integration
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { settingsTokens, getPlatformTokens } from '../../../theme/settingsTokens';
import { useHapticFeedback } from '../../../hooks';
import { isTV } from '../../../utils/platformDetection';

/**
 * PlatformToggle Props
 */
export interface PlatformToggleProps {
  /** Current toggle state */
  value: boolean;
  
  /** Change handler */
  onValueChange: (value: boolean) => void;
  
  /** Accessible label text */
  label: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Custom active color (defaults to theme.primary) */
  color?: string;
  
  /** TV focus state (for TV navigation) */
  focused?: boolean;
  
  /** Test ID for testing */
  testID?: string;
}

/**
 * Custom Web Toggle Component
 * Used when Platform.OS === 'web'
 */
const WebToggle: React.FC<{
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
  color: string;
  trackColor: string;
  testID: string;
}> = ({ value, onValueChange, disabled, color, trackColor, testID }) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  const [isHovered, setIsHovered] = React.useState(false);
  
  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);
  
  const trackBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColor, color],
  });
  
  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // Track width 44, thumb width 20
  });
  
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      // @ts-ignore - Web-only props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          webStyles.track,
          {
            backgroundColor: trackBackgroundColor,
            opacity: disabled ? 0.5 : 1,
            transform: isHovered && !disabled ? [{ scale: 1.05 }] : [{ scale: 1 }],
          },
        ]}
      >
        <Animated.View
          style={[
            webStyles.thumb,
            {
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const webStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
});

/**
 * Platform-native toggle/switch component
 * 
 * @example
 * <PlatformToggle
 *   value={enabled}
 *   onValueChange={setEnabled}
 *   label="Enable Autopilot"
 *   color={theme.primary}
 * />
 */
export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  value,
  onValueChange,
  label,
  disabled = false,
  color,
  focused = false,
  testID = 'platform-toggle',
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, tvMode, focused),
    [theme, platformTokens, tvMode, focused]
  );
  const haptics = useHapticFeedback();
  
  const activeColor = color || theme.primary;
  const trackColor = theme.appBackground;
  
  /**
   * Handle toggle change with haptic feedback
   */
  const handleValueChange = React.useCallback((newValue: boolean) => {
    haptics.triggerMedium(); // Medium impact for toggle action
    onValueChange(newValue);
  }, [onValueChange, haptics]);
  
  // Use native Switch for iOS and Android
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
        <Text style={styles.label}>{label}</Text>
        <Switch
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
          trackColor={{
            false: trackColor,
            true: activeColor,
          }}
          // iOS-specific: thumb color
          thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
          // Android-specific: thumb tint
          ios_backgroundColor={trackColor}
          testID={`${testID}-switch`}
        />
      </View>
    );
  }
  
  // Use custom toggle for web
  return (
    <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <WebToggle
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        color={activeColor}
        trackColor={trackColor}
        testID={`${testID}-switch`}
      />
    </View>
  );
};

/**
 * Create themed styles
 */
const createStyles = (
  theme: ReturnType<typeof useTheme>,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  tvMode: boolean,
  focused: boolean
) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: settingsTokens.spacing.sm,
    minHeight: tvMode ? platformTokens.touchTarget : settingsTokens.touchTargets.phone,
    // TV focus border
    ...(tvMode && focused && {
      borderWidth: 4,
      borderColor: theme.interactive,
      borderRadius: 8,
      paddingHorizontal: 12,
    }),
  },
  
  label: {
    flex: 1,
    fontSize: platformTokens.typography.body.fontSize,
    fontWeight: platformTokens.typography.body.fontWeight,
    fontFamily: platformTokens.typography.fontFamily,
    color: theme.text,
    marginRight: settingsTokens.spacing.md,
  },
  
  disabled: {
    opacity: 0.5,
  },
});
