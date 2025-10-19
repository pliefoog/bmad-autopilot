import React from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ProgressBarProps extends AccessibilityProps {
  progress: number; // 0 - 100
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 6, style, testID, accessibilityLabel }) => {
  const theme = useTheme();
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: safeProgress, min: 0, max: 100 }}
      accessibilityLabel={accessibilityLabel || 'Progress'}
      style={[styles.container, { height }, style]}
      testID={testID}
    >
      <View testID={testID ? `${testID}-fill` : 'progress-fill'} style={[styles.fill, { width: `${safeProgress}%`, backgroundColor: theme.colors.accent }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;
