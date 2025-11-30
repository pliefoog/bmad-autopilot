import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../store/themeStore';
import * as Brightness from 'expo-brightness';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import Switch from '../components/atoms/Switch';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';

// Theme-specific logging that can be toggled via showThemeLogging()
const log = (...args: any[]) => {
  const isEnabled = typeof window !== 'undefined' && (window as any).isThemeLoggingEnabled?.();
  if (isEnabled) {
    const originalConsole = (window as any).__originalConsole;
    if (originalConsole) {
      originalConsole.log('[ThemeWidget]', ...args);
    }
  }
};

interface ThemeWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * ThemeWidget - Barebone theme widget without UnifiedWidgetGrid
 */
const ThemeWidgetComponent: React.FC<ThemeWidgetProps> = ({ id, title, width, height }) => {
  // Subscribe to theme colors AND mode/brightness
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const brightness = useThemeStore((state) => state.brightness);
  const nativeBrightnessControl = useThemeStore((state) => state.nativeBrightnessControl);
  // Get unadjusted colors for brightness bar fill
  const unadjustedColors = useThemeStore((state) => state.colors);
  
  const renderCount = React.useRef(0);
  renderCount.current++;
  log('ThemeWidget render #' + renderCount.current + ' - mode:', mode, 'brightness:', brightness);

  // Use stable reference from getState() to avoid re-renders
  const handleDayPress = React.useCallback(() => {
    useThemeStore.getState().setMode('day');
  }, []);

  const handleNightPress = React.useCallback(() => {
    useThemeStore.getState().setMode('night');
  }, []);

  const handleRedPress = React.useCallback(() => {
    useThemeStore.getState().setMode('red-night');
  }, []);

  const handleAutoPress = React.useCallback(() => {
    useThemeStore.getState().setMode('auto');
  }, []);

  const increaseBrightness = React.useCallback(() => {
    const current = useThemeStore.getState().brightness;
    const newBrightness = Math.min(1, current + 0.1);
    useThemeStore.getState().setBrightness(newBrightness);
    if (!useThemeStore.getState().nativeBrightnessControl && Platform.OS !== 'web') {
      Brightness.setBrightnessAsync(newBrightness);
    }
  }, []);

  const decreaseBrightness = React.useCallback(() => {
    const current = useThemeStore.getState().brightness;
    const newBrightness = Math.max(0.1, current - 0.1);
    useThemeStore.getState().setBrightness(newBrightness);
    if (!useThemeStore.getState().nativeBrightnessControl && Platform.OS !== 'web') {
      Brightness.setBrightnessAsync(newBrightness);
    }
  }, []);

  const toggleNativeControl = React.useCallback(() => {
    useThemeStore.getState().toggleNativeBrightnessControl();
  }, []);

  const setBrightnessToMax = React.useCallback(() => {
    useThemeStore.getState().setBrightness(1.0);
    if (!useThemeStore.getState().nativeBrightnessControl && Platform.OS !== 'web') {
      Brightness.setBrightnessAsync(1.0);
    }
  }, []);

  // Double-click detection for brightness bar
  const lastTapRef = React.useRef<number>(0);
  const handleBrightnessBarPress = React.useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // ms
    
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Double click detected
      setBrightnessToMax();
      lastTapRef.current = 0; // Reset to avoid triple-click
    } else {
      lastTapRef.current = now;
    }
  }, [setBrightnessToMax]);

  // Calculate responsive header sizes based on widget dimensions
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Header component for UnifiedWidgetGrid
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
          color={unadjustedColors.primary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    themeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0,
      borderRadius: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
    },
    brightnessSection: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    },
    brightnessLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    brightnessControls: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    brightnessButton: {
      width: 40,
      height: 40,
      borderWidth: 2,
      borderColor: unadjustedColors.border,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brightnessBar: {
      flex: 1,
      height: 15,
      borderRadius: 5,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      borderWidth: 0,
      borderColor: theme.border,
    },
    brightnessFill: {
      height: '100%',
      backgroundColor: unadjustedColors.primary,
    },
    nativeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: theme.border,
      width: '100%',
      height: '100%',
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
      columnSpans={Platform.OS !== 'web' ? [1,1,1,1,2,2] : [1,1,1,1,2,1,1]}
    >
      {/* Row 0-1: Theme Buttons (2×2 primary grid) */}
      <TouchableOpacity
        style={[
          styles.themeButton,
          {
            backgroundColor: mode === 'day' ? theme.text : 'transparent',
            borderLeftWidth: 1,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderLeftColor: mode === 'day' ? theme.text : theme.border,
            borderTopColor: mode === 'day' ? theme.text : theme.border,
            borderBottomColor: mode === 'day' ? theme.text : theme.border,
            borderRightColor: mode === 'day' ? theme.text : theme.border,
          }
        ]}
        onPress={handleDayPress}
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
            borderLeftWidth: 1,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRightWidth: 0,
            borderLeftColor: mode === 'night' ? theme.text : theme.border,
            borderTopColor: mode === 'night' ? theme.text : theme.border,
            borderBottomColor: mode === 'night' ? theme.text : theme.border,
          }
        ]}
        onPress={handleNightPress}
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
            borderLeftWidth: 1,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderLeftColor: mode === 'red-night' ? theme.text : theme.border,
            borderTopColor: mode === 'red-night' ? theme.text : theme.border,
            borderBottomColor: mode === 'red-night' ? theme.text : theme.border,
            borderRightColor: mode === 'red-night' ? theme.text : theme.border,
          }
        ]}
        onPress={handleRedPress}
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
            borderLeftWidth: 1,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderRightWidth: 0,
            borderLeftColor: mode === 'auto' ? theme.text : theme.border,
            borderTopColor: mode === 'auto' ? theme.text : theme.border,
            borderBottomColor: mode === 'auto' ? theme.text : theme.border,
          }
        ]}
        onPress={handleAutoPress}
      >
        <Ionicons 
          name="time" 
          size={32} 
          color={mode === 'auto' ? theme.surface : theme.text} 
        />
      </TouchableOpacity>

      {/* Row 2: Brightness Controls (spans 2 columns in secondary) */}
      <Pressable 
        style={styles.brightnessSection}
        onPress={handleBrightnessBarPress}
      >
        <View style={styles.brightnessControls}>
          <TouchableOpacity
            style={styles.brightnessButton}
            onPress={decreaseBrightness}
            disabled={brightness <= 0.1}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={brightness <= 0.1 ? unadjustedColors.textSecondary : unadjustedColors.text} 
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
              size={20} 
              color={brightness >= 1.0 ? unadjustedColors.textSecondary : unadjustedColors.text} 
            />
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Row 3: Native Control Toggle (spans 2 columns, non-web only) */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.nativeToggle}
          onPress={toggleNativeControl}
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
            onValueChange={toggleNativeControl}
            trackColor={{ false: theme.border, true: theme.text }}
          />
        </TouchableOpacity>
      )}
      
      {/* Row 4: Empty space on web for consistent 4-row layout */}
      {Platform.OS === 'web' && <View />}
      {Platform.OS === 'web' && <View />}
    </UnifiedWidgetGrid>
  );
};

export const ThemeWidget = React.memo(ThemeWidgetComponent);

ThemeWidget.displayName = 'ThemeWidget';

export default ThemeWidget;
