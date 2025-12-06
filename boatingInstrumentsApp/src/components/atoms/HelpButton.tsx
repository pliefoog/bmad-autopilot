/**
 * HelpButton Component
 * Story 4.4 AC12: Contextual help button with tooltip overlay
 * 
 * Provides inline help throughout the app with accessibility support
 * and marine-appropriate styling for challenging viewing conditions.
 */

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';

export interface HelpButtonProps {
  /**
   * Unique identifier for the help button (for analytics/tracking)
   */
  helpId: string;
  
  /**
   * Callback when help is triggered
   * Parent component should handle tooltip display
   */
  onPress: () => void;
  
  /**
   * Optional custom size (default: 24)
   */
  size?: number;
  
  /**
   * Optional custom color (defaults to theme.textSecondary)
   */
  color?: string;
  
  /**
   * Optional style override for positioning
   */
  style?: ViewStyle;
  
  /**
   * Test ID for automated testing
   */
  testID?: string;
  
  /**
   * Accessibility label (default: "Help")
   */
  accessibilityLabel?: string;
  
  /**
   * Accessibility hint describing what help content will show
   */
  accessibilityHint?: string;
}

/**
 * HelpButton - Icon button that triggers contextual help display
 * 
 * Usage:
 * ```tsx
 * <HelpButton
 *   helpId="connection-setup"
 *   onPress={() => setShowHelp(true)}
 *   accessibilityHint="Learn about WiFi bridge connection setup"
 * />
 * ```
 */
export const HelpButton: React.FC<HelpButtonProps> = ({
  helpId,
  onPress,
  size = 24,
  color,
  style,
  testID = 'help-button',
  accessibilityLabel = 'Help',
  accessibilityHint = 'Show contextual help information',
}) => {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  
  const iconColor = color || theme.textSecondary;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.helpButton,
        {
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={`${testID}-${helpId}`}
    >
      <Ionicons 
        name="help-circle-outline" 
        size={size} 
        color={iconColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  helpButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
