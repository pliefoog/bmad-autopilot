/**
 * PlatformRadioButton Component
 * 
 * Purpose:
 * Cross-platform radio button component with theme integration and accessibility support.
 * 
 * Features:
 * - Theme-aware styling (uses theme colors)
 * - Platform-optimized touch targets (18% larger in glove mode)
 * - Haptic feedback on selection
 * - Accessible (label, role, state)
 * - Hover states on web
 * - Focus states for keyboard navigation
 * 
 * Usage:
 * ```tsx
 * <PlatformRadioButton
 *   label="TCP"
 *   selected={protocol === 'tcp'}
 *   onPress={() => setProtocol('tcp')}
 * />
 * ```
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useHapticFeedback } from '../../../hooks';
import { getPlatformTokens } from '../../../theme/settingsTokens';

/**
 * PlatformRadioButton Props
 */
export interface PlatformRadioButtonProps {
  /** Display label text */
  label: string;

  /** Whether this option is selected */
  selected: boolean;

  /** Callback when radio button is pressed */
  onPress: () => void;

  /** Disabled state */
  disabled?: boolean;

  /** Test ID for testing */
  testID?: string;
}

/**
 * PlatformRadioButton Component
 * 
 * Renders a radio button with label using platform-appropriate styling.
 * Auto-sizes touch targets based on glove mode setting.
 */
export const PlatformRadioButton: React.FC<PlatformRadioButtonProps> = ({
  label,
  selected,
  onPress,
  disabled = false,
  testID,
}) => {
  const theme = useTheme();
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const haptics = useHapticFeedback();
  const platformTokens = getPlatformTokens();
  const [isHovered, setIsHovered] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    haptics.triggerLight();
    onPress();
  };

  // Radio button sizing (glove mode adds 18% for marine usage)
  const gloveFactor = gloveMode ? 1.18 : 1.0;
  const radioSize = 20 * gloveFactor;
  const innerSize = 10 * gloveFactor;
  const touchTarget = Math.max(44, radioSize * 1.5); // Minimum 44pt touch target

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: touchTarget,
      paddingVertical: 8,
    },
    touchable: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: touchTarget,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: platformTokens.borderRadius.card,
      opacity: disabled ? 0.5 : 1,
      ...(Platform.OS === 'web' && isHovered && !disabled
        ? { backgroundColor: theme.surface }
        : {}),
    },
    radioOuter: {
      width: radioSize,
      height: radioSize,
      borderRadius: radioSize / 2,
      borderWidth: 2,
      borderColor: selected ? theme.interactive : theme.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    radioInner: {
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: theme.interactive,
    },
    label: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '400',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
  });

  const touchableProps = Platform.OS === 'web'
    ? {
        // @ts-ignore - web-only props
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  return (
    <TouchableOpacity
      style={styles.touchable}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      {...touchableProps}
    >
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};
