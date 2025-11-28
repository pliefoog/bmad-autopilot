import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore, ThemeMode } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import * as Brightness from 'expo-brightness';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import Switch from '../components/atoms/Switch';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface ThemeSwitcherProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * ThemeSwitcherWidget - Theme control widget using UnifiedWidgetGrid with column spans
 * 
 * Layout:
 * - Primary Grid (2×2): Four theme buttons (Day, Night, Red, Auto) - each spans 1 column
 * - Separator after row 1
 * - Secondary Grid: Full-width controls
 *   - Brightness slider (spans 2 columns)
 *   - Native control toggle (spans 2 columns, non-web only)
 * 
 * Uses UnifiedWidgetGrid with columnSpans prop to create mixed layout:
 * - columnSpans: [1,1,1,1,2,2] on native (4 buttons + brightness + native toggle)
 * - columnSpans: [1,1,1,1,2] on web (4 buttons + brightness only)
 * 
 * Features: Day/Night/Red-Night/Auto themes, brightness control, native screen control
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
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
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Calculate responsive header sizes based on widget dimensions
  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Header component for UnifiedWidgetGrid v2
  const headerComponent = (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <UniversalIcon 
          name="color-palette-outline" 
          size={headerIconSize} 
          color={theme.primary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
      </View>
      
      {pinned && (
        <TouchableOpacity
          onLongPress={handleLongPressOnPin}
          style={{ padding: 4, minWidth: 24, alignItems: 'center' }}
          testID={`pin-button-${id}`}
        >
          <UniversalIcon name="pin" size={headerIconSize} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const styles = StyleSheet.create({
    themeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 0,
      width: '100%',
      height: '100%', // Fill available row height
      paddingVertical: 4,
      paddingHorizontal: 8,
      margin: 0,
    },
    brightnessSection: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      width: '100%',
      height: '100%', // Fill available row height
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
      width: 28,
      height: 28,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brightnessBar: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: theme.border,
    },
    brightnessFill: {
      height: '100%',
      backgroundColor: theme.primary,
    },
    nativeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: theme.border,
      width: '100%',
      height: '100%', // Fill available row height
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
  });

  return (
    <UnifiedWidgetGrid
      theme={theme}
      header={headerComponent}
      widgetWidth={width || 400}
      widgetHeight={height || 300}
      columns={2}
      primaryRows={2}
      secondaryRows={2}
      onPress={handlePress}
      testID={`theme-switcher-${id}`}
      columnSpans={Platform.OS !== 'web' ? [1,1,1,1,2,2] : [1,1,1,1,2,1,1]}
    >
        {/* Row 0-1: Theme Buttons (2×2 grid) */}
        <TouchableOpacity
          style={[
            styles.themeButton,
            {
              backgroundColor: mode === 'day' ? theme.text : 'transparent',
              borderColor: mode === 'day' ? theme.text : theme.border,
            }
          ]}
          onPress={() => setMode('day')}
        >
          <Ionicons 
            name="sunny" 
            size={32} 
            color={mode === 'day' ? theme.surface : theme.text} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.themeButton,
            {
              backgroundColor: mode === 'night' ? theme.text : 'transparent',
              borderColor: mode === 'night' ? theme.text : theme.border,
            }
          ]}
          onPress={() => setMode('night')}
        >
          <Ionicons 
            name="moon" 
            size={32} 
            color={mode === 'night' ? theme.surface : theme.text} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.themeButton,
            {
              backgroundColor: mode === 'red-night' ? theme.text : 'transparent',
              borderColor: mode === 'red-night' ? theme.text : theme.border,
            }
          ]}
          onPress={() => setMode('red-night')}
        >
          <Ionicons 
            name="eye" 
            size={32} 
            color={mode === 'red-night' ? theme.surface : theme.text} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.themeButton,
            {
              backgroundColor: mode === 'auto' ? theme.text : 'transparent',
              borderColor: mode === 'auto' ? theme.text : theme.border,
            }
          ]}
          onPress={() => setMode('auto')}
        >
          <Ionicons 
            name="time" 
            size={32} 
            color={mode === 'auto' ? theme.surface : theme.text} 
          />
        </TouchableOpacity>

        {/* Row 2: Brightness Controls (spans 2 columns) */}
        <View style={styles.brightnessSection}>
          <Text style={styles.brightnessLabel}>
            {Math.round(brightness * 100)}%
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
        </View>

        {/* Row 3: Native Control Toggle (spans 2 columns, non-web only) */}
        {Platform.OS !== 'web' && (
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
                Native
              </Text>
            </View>
            <Switch
              value={nativeBrightnessControl}
              onValueChange={toggleNativeBrightnessControl}
              trackColor={{ false: theme.border, true: theme.text }}
            />
          </TouchableOpacity>
        )}
        
        {/* Row 4: Empty space on web for consistent 4-row layout */}
        {Platform.OS === 'web' && (
          <>
            <View />
            <View />
          </>
        )}
      </UnifiedWidgetGrid>
  );
});

export default ThemeSwitcher;