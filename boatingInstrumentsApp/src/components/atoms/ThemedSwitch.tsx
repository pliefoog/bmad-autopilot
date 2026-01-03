/**
 * ThemedSwitch - Cross-platform themed Switch component
 * Ensures consistent appearance across iOS, Android, and Web
 * Web uses custom implementation due to browser's native switch limitations
 */

import React from 'react';
import { Switch, Platform, StyleSheet, View, Pressable, Animated } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const ThemedSwitch: React.FC<ThemedSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const theme = useTheme();

  // Memoize styles unconditionally (hooks must be called before any conditionals)
  const containerStyle = React.useMemo(
    () => ({ backgroundColor: value ? theme.primary : theme.border }),
    [value, theme.primary, theme.border],
  );
  const thumbStyle = React.useMemo(
    () => ({
      backgroundColor: value ? theme.text : theme.textSecondary,
      transform: [{ translateX: value ? 20 : 0 }],
    }),
    [value, theme.text, theme.textSecondary],
  );

  // For web, use custom switch implementation to ensure proper theming
  if (Platform.OS === 'web') {
    return (
      <Pressable
        onPress={() => !disabled && onValueChange(!value)}
        disabled={disabled}
        style={[styles.webSwitchContainer, containerStyle, disabled && styles.disabled]}
      >
        <View style={[styles.webSwitchThumb, thumbStyle]} />
      </Pressable>
    );
  }

  // Native platforms (iOS, Android)
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: theme.border, true: theme.primary }}
      thumbColor={value ? theme.text : theme.textSecondary}
      ios_backgroundColor={theme.border}
    />
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  webSwitchContainer: {
    width: 51,
    height: 31,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  webSwitchThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
