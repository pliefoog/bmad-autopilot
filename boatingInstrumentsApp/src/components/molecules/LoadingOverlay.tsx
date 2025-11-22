import React, { useMemo } from 'react';
import { View, StyleSheet, Text, AccessibilityRole } from 'react-native';
import LoadingSpinner from '../atoms/LoadingSpinner';
import { useLoading } from '../../services/loading/LoadingContext';
import { useTheme, ThemeColors } from '../../store/themeStore';

const LoadingOverlay: React.FC<{ testID?: string }> = ({ testID }) => {
  const { anyLoading } = useLoading();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!anyLoading) return null;

  return (
    <View
      testID={testID || 'global-loading-overlay'}
      accessibilityRole={'alert' as AccessibilityRole}
      accessibilityLabel="Loading"
      style={[StyleSheet.absoluteFillObject, styles.backdrop]}
    >
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <LoadingSpinner size="large" testID="global-spinner" />
        <Text style={[styles.text, { color: theme.text }]}>Loading…</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  backdrop: {
    backgroundColor: theme.overlayDark,
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
