/**
 * Glove Mode Settings Component
 * Story 4.4 AC15: Toggle glove mode for marine environments
 * 
 * Provides a settings toggle for glove mode which:
 * - Increases touch targets by 12px
 * - Extends gesture timeouts and tolerances
 * - Adjusts long-press duration for gloves
 * - Increases tap slop for finger movement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Switch from '../atoms/Switch';
import { useTheme } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { marineTouchService } from '../../services/marine/MarineTouchService';

export const GloveModeSettings: React.FC = () => {
  const theme = useTheme();
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const updateThemeSettings = useSettingsStore((state) => state.updateThemeSettings);

  const handleToggle = (value: boolean) => {
    updateThemeSettings({ gloveMode: value });
    marineTouchService.setGloveMode(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Glove Mode</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Enhanced touch targets and gesture tolerances for wearing gloves at sea
          </Text>
        </View>
        <Switch
          value={gloveMode}
          onValueChange={handleToggle}
          trackColor={{ false: theme.border, true: theme.interactive }}
          ios_backgroundColor={theme.border}
        />
      </View>
      
      {gloveMode && (
        <View style={[styles.activeIndicator, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
          <Text style={[styles.activeText, { color: theme.success }]}>
            ✓ Glove mode active • Touch targets increased • Gesture timeouts extended
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  activeIndicator: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
