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
import { View, Text, Switch, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';
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

  /** Accessible label text (optional - for accessibility only, not displayed) */
  label?: string;

  /** Disabled state */
  disabled?: boolean;

  /** TV focus state (for TV navigation) */
  focused?: boolean;

  /** Test ID for testing */
  testID?: string;

  /** Scale factor for responsive sizing (default: 1.0 = native iOS size 51×31) */
  scale?: number;
}

/**
 * Custom Web Toggle Component
 * Used when Platform.OS === 'web'
 * Baseline dimensions match native iOS Switch (51×31 points)
 */
const WebToggle: React.FC<{
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
  color: string;
  trackColor: string;
  thumbColor: string;
  testID: string;
  gloveMode: boolean;
  scale: number; // Scale factor (1.0 = native iOS size)
}> = ({ value, onValueChange, disabled, color, trackColor, thumbColor, testID, gloveMode, scale }) => {
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

  // Native iOS Switch dimensions: 51×31 points (track), 27 points (thumb)
  // Glove mode adds 18% to touch targets (marine usage)
  const BASE_TRACK_WIDTH = 51;
  const BASE_TRACK_HEIGHT = 31;
  const BASE_THUMB_SIZE = 27;
  const BASE_THUMB_TRAVEL = 20; // Distance thumb travels

  // Apply glove mode scaling (1.18x) and custom scale factor
  const gloveFactor = gloveMode ? 1.18 : 1.0;
  const finalScale = scale * gloveFactor;

  const trackWidth = BASE_TRACK_WIDTH * finalScale;
  const trackHeight = BASE_TRACK_HEIGHT * finalScale;
  const thumbSize = BASE_THUMB_SIZE * finalScale;
  const thumbTravel = BASE_THUMB_TRAVEL * finalScale;
  const thumbPadding = 2 * finalScale;

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbPadding, thumbTravel],
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
          {
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackHeight / 2,
            justifyContent: 'center',
          },
          {
            backgroundColor: trackBackgroundColor,
            transform: isHovered && !disabled ? [{ scale: 1.05 }] : [{ scale: 1 }],
          },
        ]}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbTranslateX }],
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Platform-native toggle/switch component
 *
 * @example
 * <PlatformToggle
 *   value={enabled}
 *   onValueChange={setEnabled}
 *   label="Enable Autopilot"
 * />
 */
export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  value,
  onValueChange,
  label,
  disabled = false,
  focused = false,
  testID = 'platform-toggle',
  scale = 1.0, // Default to native iOS size
}) => {
  const theme = useTheme();
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, tvMode, focused),
    [theme, platformTokens, tvMode, focused],
  );
  const haptics = useHapticFeedback();

  // Use dedicated toggle theme colors for full control
  const labelColor = disabled ? theme.textSecondary : theme.text;
  const thumbColor = disabled ? theme.toggle.thumbDisabled : theme.toggle.thumb;
  const trackColorOff = disabled ? theme.toggle.trackOffDisabled : theme.toggle.trackOff;
  const trackColorOn = disabled ? theme.toggle.trackOnDisabled : theme.toggle.trackOn;

  /**
   * Handle toggle change with haptic feedback
   */
  const handleValueChange = React.useCallback(
    (newValue: boolean) => {
      haptics.triggerMedium(); // Medium impact for toggle action
      onValueChange(newValue);
    },
    [onValueChange, haptics],
  );

  // Use native Switch for iOS and Android
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={styles.container} testID={testID}>
        {label && label.trim() !== '' ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
        <View style={{ transform: [{ scale }] }}>
          <Switch
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled}
            trackColor={{
              false: trackColorOff,
              true: trackColorOn,
            }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
            testID={`${testID}-switch`}
          />
        </View>
      </View>
    );
  }

  // Use custom toggle for web
  return (
    <View style={styles.container} testID={testID}>
      {label && label.trim() !== '' ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <WebToggle
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        color={trackColorOn}
        trackColor={trackColorOff}
        thumbColor={thumbColor}
        gloveMode={gloveMode}
        scale={scale}
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
  focused: boolean,
) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      // TV focus border
      ...(tvMode &&
        focused && {
          borderWidth: 4,
          borderColor: theme.interactive,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: settingsTokens.spacing.sm,
        }),
    },

    label: {
      flex: 1,
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: platformTokens.typography.body.fontWeight,
      fontFamily: platformTokens.typography.fontFamily,
      marginRight: settingsTokens.spacing.md,
    },
  });
