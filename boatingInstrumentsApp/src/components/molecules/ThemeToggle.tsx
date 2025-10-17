import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Switch, Label } from '../atoms';

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
        <Label
          size={size}
          testID={testID ? `${testID}-label` : undefined}
        >
          Dark Mode
        </Label>
      )}
      <Switch
        value={isDarkMode}
        onValueChange={onToggle}
        size={size}
        testID={testID ? `${testID}-switch` : undefined}
      />
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
});

export default ThemeToggle;