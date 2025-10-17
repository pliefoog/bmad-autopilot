import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore, ThemeMode } from '../core/themeStore';
import { WidgetCard } from './WidgetCard';
import { WidgetShell } from '../components/WidgetShell';
import * as Brightness from 'expo-brightness';

export const ThemeSwitcher: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  
  const theme = useTheme();
  const { 
    mode, 
    brightness, 
    nativeBrightnessControl,
    setMode, 
    setBrightness, 
    toggleNativeBrightnessControl 
  } = useThemeStore();

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  const increaseBrightness = () => {
    const newBrightness = Math.min(1, brightness + 0.1);
    setBrightness(newBrightness);
    if (!nativeBrightnessControl) {
      Brightness.setBrightnessAsync(newBrightness);
    }
  };

  const decreaseBrightness = () => {
    const newBrightness = Math.max(0, brightness - 0.1);
    setBrightness(newBrightness);
    if (!nativeBrightnessControl) {
      Brightness.setBrightnessAsync(newBrightness);
    }
  };

  const themes: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: 'day', icon: 'sunny', label: 'Day' },
    { mode: 'night', icon: 'moon', label: 'Night' },
    { mode: 'red-night', icon: 'eye', label: 'Red' },
    { mode: 'auto', icon: 'time', label: 'Auto' },
  ];

  return (
    <WidgetShell
      expanded={expanded}
      onToggle={handleToggleExpanded}
    >
      <WidgetCard
        title="THEME"
        icon="contrast"
        state="normal"
        expanded={expanded}
      >
        {/* Primary View: Theme selector buttons only - no metric cell needed */}
        <View style={styles.themeModes}>
          {themes.map((themeOption) => (
            <TouchableOpacity
              key={themeOption.mode}
              style={[
                styles.themeButton,
                {
                  backgroundColor: mode === themeOption.mode ? theme.text : 'transparent',
                  borderColor: mode === themeOption.mode ? theme.text : theme.border,
                }
              ]}
              onPress={() => setMode(themeOption.mode)}
            >
              <Ionicons 
                name={themeOption.icon as any} 
                size={24} 
                color={mode === themeOption.mode ? theme.surface : theme.text} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary View: Brightness controls (only when expanded) */}
        {expanded && (
          <View style={styles.brightnessSection}>
            <Text style={[styles.brightnessLabel, { color: theme.textSecondary }]}>
              Brightness: {Math.round(brightness * 100)}%
            </Text>
            <View style={styles.brightnessControls}>
              <TouchableOpacity
                style={[styles.brightnessButton, { borderColor: theme.border }]}
                onPress={decreaseBrightness}
                disabled={brightness <= 0.1}
              >
                <Ionicons 
                  name="remove" 
                  size={16} 
                  color={brightness <= 0.1 ? theme.textSecondary : theme.text} 
                />
              </TouchableOpacity>
              
              <View style={[styles.brightnessBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.brightnessFill, 
                    { 
                      width: `${brightness * 100}%`, 
                      backgroundColor: theme.text 
                    }
                  ]} 
                />
              </View>
              
              <TouchableOpacity
                style={[styles.brightnessButton, { borderColor: theme.border }]}
                onPress={increaseBrightness}
                disabled={brightness >= 1.0}
              >
                <Ionicons 
                  name="add" 
                  size={16} 
                  color={brightness >= 1.0 ? theme.textSecondary : theme.text} 
                />
              </TouchableOpacity>
            </View>

            {/* Native Brightness Control Toggle */}
            <TouchableOpacity
              style={[styles.nativeToggle, { borderColor: theme.border }]}
              onPress={toggleNativeBrightnessControl}
            >
              <View style={styles.nativeToggleContent}>
                <Ionicons 
                  name={nativeBrightnessControl ? "phone-portrait" : "phone-portrait-outline"} 
                  size={16} 
                  color={theme.text} 
                />
                <Text style={[styles.nativeToggleText, { color: theme.textSecondary }]}>
                  Native Screen Control
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: nativeBrightnessControl ? theme.text : theme.border }
              ]}>
                <View style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: theme.surface,
                    transform: [{ translateX: nativeBrightnessControl ? 14 : 0 }]
                  }
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </WidgetCard>
    </WidgetShell>
  );
};

const styles = StyleSheet.create({
  themeModes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  brightnessSection: {
    alignItems: 'center',
  },
  brightnessLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  brightnessControls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  brightnessButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brightnessBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  brightnessFill: {
    height: '100%',
    borderRadius: 3,
  },
  nativeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  nativeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nativeToggleText: {
    fontSize: 12,
    marginLeft: 8,
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});