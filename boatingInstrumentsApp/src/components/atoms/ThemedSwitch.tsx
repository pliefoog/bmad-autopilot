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

export const ThemedSwitch: React.FC<ThemedSwitchProps> = ({ value, onValueChange, disabled = false }) => {
  const theme = useTheme();

  // For web, use custom switch implementation to ensure proper theming
  if (Platform.OS === 'web') {
    return (
      <Pressable onPress={() => !disabled && onValueChange(!value)} disabled={disabled} style={[styles.webSwitchContainer, { backgroundColor: value ? theme.primary : theme.border, opacity: disabled ? 0.5 : 1 }]}>
        <View style={[styles.webSwitchThumb, { backgroundColor: value ? theme.text : theme.textSecondary, transform: [{ translateX: value ? 20 : 0 }] }]} />
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
