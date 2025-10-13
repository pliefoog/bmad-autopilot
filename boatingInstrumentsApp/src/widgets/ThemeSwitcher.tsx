import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useThemeStore, useTheme, ThemeMode } from '../core/themeStore';

export const ThemeSwitcher: React.FC = () => {
  const { mode, brightness, setMode, setBrightness } = useThemeStore();
  const theme = useTheme();

  const themes: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: 'day', icon: 'sunny', label: 'Day' },
    { mode: 'night', icon: 'moon', label: 'Night' },
    { mode: 'red-night', icon: 'eye', label: 'Red Night' },
    { mode: 'auto', icon: 'time', label: 'Auto' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>DISPLAY MODE</Text>
      
      {/* Theme Mode Selection */}
      <View style={styles.themeModes}>
        {themes.map((themeOption) => (
          <TouchableOpacity
            key={themeOption.mode}
            style={[
              styles.themeButton,
              {
                backgroundColor: mode === themeOption.mode ? theme.accent : 'transparent',
                borderColor: theme.border,
              }
            ]}
            onPress={() => setMode(themeOption.mode)}
          >
            <Ionicons 
              name={themeOption.icon} 
              size={20} 
              color={mode === themeOption.mode ? theme.surface : theme.text} 
            />
            <Text 
              style={[
                styles.themeLabel,
                { 
                  color: mode === themeOption.mode ? theme.surface : theme.textSecondary,
                  fontSize: 10
                }
              ]}
            >
              {themeOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Brightness Control */}
      <View style={styles.brightnessSection}>
        <Text style={[styles.brightnessLabel, { color: theme.textSecondary }]}>
          Brightness: {Math.round(brightness * 100)}%
        </Text>
        <View style={styles.brightnessControls}>
          <TouchableOpacity
            style={[styles.brightnessButton, { borderColor: theme.border }]}
            onPress={() => setBrightness(brightness - 0.1)}
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
                  backgroundColor: theme.accent 
                }
              ]} 
            />
          </View>
          
          <TouchableOpacity
            style={[styles.brightnessButton, { borderColor: theme.border }]}
            onPress={() => setBrightness(brightness + 0.1)}
            disabled={brightness >= 1.0}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={brightness >= 1.0 ? theme.textSecondary : theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  themeModes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  themeLabel: {
    marginTop: 4,
    fontWeight: '600',
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
});