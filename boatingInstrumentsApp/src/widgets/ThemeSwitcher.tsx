import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore, ThemeMode } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import * as Brightness from 'expo-brightness';
import { UniversalIcon } from '../components/atoms/UniversalIcon';

interface ThemeSwitcherProps {
  id: string;
  title: string;
}

/**
 * ThemeSwitcherWidget - Theme and brightness control widget per ui-architecture.md v2.3
 * Primary Grid (1×1): Current theme mode
 * Secondary Grid: Theme selection buttons, brightness controls, native toggle
 * Features: Day/Night/Red-Night/Auto themes, brightness control, native screen control
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // Theme store selectors
  const { 
    mode, 
    brightness, 
    nativeBrightnessControl,
    setMode, 
    setBrightness, 
    toggleNativeBrightnessControl 
  } = useThemeStore();

  // Theme options configuration
  const themes: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: 'day', icon: 'sunny', label: 'Day' },
    { mode: 'night', icon: 'moon', label: 'Night' },
    { mode: 'red-night', icon: 'eye', label: 'Red' },
    { mode: 'auto', icon: 'time', label: 'Auto' },
  ];

  const currentTheme = themes.find(t => t.mode === mode) || themes[0];

  // Brightness control handlers
  const increaseBrightness = useCallback(() => {
    const newBrightness = Math.min(1, brightness + 0.1);
    setBrightness(newBrightness);
    if (!nativeBrightnessControl && Platform.OS !== 'web') {
      Brightness.setBrightnessAsync(newBrightness);
    }
  }, [brightness, nativeBrightnessControl, setBrightness]);

  const decreaseBrightness = useCallback(() => {
    const newBrightness = Math.max(0, brightness - 0.1);
    setBrightness(newBrightness);
    if (!nativeBrightnessControl && Platform.OS !== 'web') {
      Brightness.setBrightnessAsync(newBrightness);
    }
  }, [brightness, nativeBrightnessControl, setBrightness]);

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    controlButton: {
      padding: 4,
      minWidth: 24,
      alignItems: 'center',
    },
    caret: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    pinIcon: {
      fontSize: 12,
      color: theme.primary,
    },
    primaryGrid: {
      alignItems: 'center',
    },
    secondaryGrid: {
      marginTop: 12,
      gap: 12,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.success,
    },
    themeModes: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    themeButton: {
      flex: 1,
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderRadius: 6,
    },
    brightnessSection: {
      alignItems: 'center',
      gap: 8,
    },
    brightnessLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    brightnessControls: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 8,
    },
    brightnessButton: {
      width: 32,
      height: 32,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brightnessBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    brightnessFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.text,
    },
    nativeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    nativeToggleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    nativeToggleText: {
      fontSize: 12,
      marginLeft: 8,
      color: theme.textSecondary,
    },
    toggle: {
      width: 36,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      padding: 2,
      backgroundColor: nativeBrightnessControl ? theme.text : theme.border,
    },
    toggleThumb: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.surface,
      transform: [{ translateX: nativeBrightnessControl ? 14 : 0 }],
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UniversalIcon 
            name="color-palette-outline" 
            size={16} 
            color={theme.primary}
          />
          <Text style={[styles.title, { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', color: theme.textSecondary }]}>{title}</Text>
        </View>
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePress}
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`caret-button-${id}`}
            >
              <Text style={styles.caret}>
                {expanded ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Primary Grid (1×1): Current theme mode */}
      <View style={styles.primaryGrid}>
        <PrimaryMetricCell
          mnemonic="THEME"
          value={currentTheme.label}
          unit=""
          state="normal"
        />
      </View>

      {/* Secondary Grid: Theme controls and brightness */}
      {expanded && (
        <View style={styles.secondaryGrid}>
          {/* Secondary Grid (1×2): Current brightness */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryMetricCell
              mnemonic="BRIGHT"
              value={Math.round(brightness * 100).toString()}
              unit="%"
            />
            <SecondaryMetricCell
              mnemonic="NATIVE"
              value={nativeBrightnessControl ? 'ON' : 'OFF'}
              unit=""
            />
          </View>

          {/* Theme selector buttons */}
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

          {/* Brightness controls */}
          <View style={styles.brightnessSection}>
            <Text style={styles.brightnessLabel}>
              Brightness: {Math.round(brightness * 100)}%
            </Text>
            <View style={styles.brightnessControls}>
              <TouchableOpacity
                style={styles.brightnessButton}
                onPress={decreaseBrightness}
                disabled={brightness <= 0.1}
              >
                <Ionicons 
                  name="remove" 
                  size={16} 
                  color={brightness <= 0.1 ? theme.textSecondary : theme.text} 
                />
              </TouchableOpacity>
              
              <View style={styles.brightnessBar}>
                <View 
                  style={[
                    styles.brightnessFill, 
                    { width: `${brightness * 100}%` }
                  ]} 
                />
              </View>
              
              <TouchableOpacity
                style={styles.brightnessButton}
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
              style={styles.nativeToggle}
              onPress={toggleNativeBrightnessControl}
            >
              <View style={styles.nativeToggleContent}>
                <Ionicons 
                  name={nativeBrightnessControl ? "phone-portrait" : "phone-portrait-outline"} 
                  size={16} 
                  color={theme.text} 
                />
                <Text style={styles.nativeToggleText}>
                  Native Screen Control
                </Text>
              </View>
              <View style={styles.toggle}>
                <View style={styles.toggleThumb} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default ThemeSwitcher;