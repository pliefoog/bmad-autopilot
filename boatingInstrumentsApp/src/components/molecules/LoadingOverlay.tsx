import React from 'react';
import { View, StyleSheet, Text, AccessibilityRole } from 'react-native';
import LoadingSpinner from '../atoms/LoadingSpinner';
import { useLoading } from '../../services/loading/LoadingContext';
import { useTheme as useThemeProvider } from '../../theme/ThemeProvider';
import { useTheme as useThemeStore } from '../../store/themeStore';

const LoadingOverlay: React.FC<{ testID?: string }> = ({ testID }) => {
  const { anyLoading } = useLoading();
  let theme;
  try {
    theme = useThemeProvider();
  } catch (e) {
    // Fall back to core theme store when ThemeProvider is not present
    theme = useThemeStore();
  }

  if (!anyLoading) return null;

  const surfaceColor = 'colors' in theme ? theme.colors.surface : (theme as any).surface;
  const textColor = 'colors' in theme ? theme.colors.text : (theme as any).text;

  return (
    <View
      testID={testID || 'global-loading-overlay'}
      accessibilityRole={'alert' as AccessibilityRole}
      accessibilityLabel="Loading"
      style={[StyleSheet.absoluteFillObject, styles.backdrop]}
    >
      <View style={[styles.container, { backgroundColor: surfaceColor }]}>
        <LoadingSpinner size="large" testID="global-spinner" />
        <Text style={[styles.text, { color: textColor }]}>Loading…</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    elevation: 2000,
  },
  container: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default LoadingOverlay;
