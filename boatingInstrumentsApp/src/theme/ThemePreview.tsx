import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { PlatformStyles } from '../utils/animationUtils';
import { ThemedView, ThemedText, MarineValueDisplay } from './ThemedComponents';

interface ThemePreviewProps {
  onThemeToggle?: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ onThemeToggle }) => {
  const { colors, mode, toggleTheme, spacing, borderRadius, shadows } = useTheme();

  return (
    <ThemedView card style={styles.container}>
      <ThemedText variant="heading" style={styles.title}>
        Theme System Demo
      </ThemedText>
      
      <ThemedText variant="secondary" style={styles.subtitle}>
        Current mode: {mode}
      </ThemedText>

      <View style={styles.section}>
        <ThemedText variant="subheading" style={styles.sectionTitle}>
          Marine Value Displays
        </ThemedText>
        
        <View style={styles.valueGrid}>
          <MarineValueDisplay
            label="Depth"
            value="12.5"
            unit="m"
            status="normal"
            size="medium"
          />
          <MarineValueDisplay
            label="Speed"
            value="8.2"
            unit="kts"
            status="success"
            size="medium"
          />
          <MarineValueDisplay
            label="Engine Temp"
            value="85"
            unit="°C"
            status="warning"
            size="medium"
          />
          <MarineValueDisplay
            label="Fuel"
            value="Low"
            unit=""
            status="error"
            size="medium"
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText variant="subheading" style={styles.sectionTitle}>
          Color Palette
        </ThemedText>
        
        <View style={styles.colorGrid}>
          <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]}>
            <Text style={styles.colorLabel}>Primary</Text>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: colors.secondary }]}>
            <Text style={styles.colorLabel}>Secondary</Text>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: colors.success }]}>
            <Text style={styles.colorLabel}>Success</Text>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: colors.warning }]}>
            <Text style={styles.colorLabel}>Warning</Text>
          </View>
          <View style={[styles.colorSwatch, { backgroundColor: colors.error }]}>
            <Text style={styles.colorLabel}>Error</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.themeButton,
          { 
            backgroundColor: colors.primary,
            borderRadius,
            ...(shadows && {
              ...PlatformStyles.boxShadow(colors.shadow, { x: 0, y: 2 }, 4, 0.2),
              elevation: 4,
            })
          }
        ]}
        onPress={onThemeToggle || toggleTheme}
      >
        <Text style={styles.themeButtonText}>
          Toggle Theme ({mode})
        </Text>
      </TouchableOpacity>

      <View style={styles.status}>
        <ThemedText variant="secondary">
          Theme features: Spacing • Colors • Typography • Shadows{shadows ? ' ✓' : ' ✗'}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 60,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    ...PlatformStyles.textShadow('rgba(0,0,0,0.5)', { x: 0, y: 1 }, 2),
  },
  themeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    marginTop: 16,
    alignItems: 'center',
  },
});