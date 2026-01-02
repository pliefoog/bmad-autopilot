import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Button, Label } from '../atoms';
import { useTheme } from '../../store/themeStore';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: (value: boolean) => void;
  variant?: 'switch' | 'button';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDarkMode,
  onToggle,
  variant = 'switch',
  size = 'medium',
  showLabel = true,
  style,
  testID,
}) => {
  const theme = useTheme();

  if (variant === 'button') {
    return (
      <Button
        variant={isDarkMode ? 'primary' : 'secondary'}
        size={size}
        onPress={() => onToggle(!isDarkMode)}
        style={style}
        testID={testID}
      >
        {isDarkMode ? '🌙 Dark' : '☀️ Light'}
      </Button>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {showLabel && (
        <Label size={size} testID={testID ? `${testID}-label` : undefined}>
          <Text>Dark Mode</Text>
        </Label>
      )}
      <TouchableOpacity
        onPress={() => onToggle(!isDarkMode)}
        style={[
          styles.toggle,
          {
            backgroundColor: isDarkMode ? theme.text : theme.border,
          },
        ]}
        testID={testID ? `${testID}-switch` : undefined}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: theme.surface,
              transform: [{ translateX: isDarkMode ? 14 : 0 }],
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});

export default ThemeToggle;
