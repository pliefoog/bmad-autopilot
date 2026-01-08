import type { SensorType } from '../types/SensorData';

/**
 * ============================================================================
 * THEME WIDGET - System Theme Control (Non-Sensor Widget)
 * ============================================================================
 *
 * **PURPOSE:**
 * Provides theme mode selection and brightness control. Unlike sensor widgets,
 * this is a utility widget with interactive controls, not metric displays.
 *
 * **ARCHITECTURE:**
 * Uses TemplatedWidget with custom JSX children (not MetricCells). Demonstrates
 * that TemplatedWidget can render ANY React elements, not just sensor metrics.
 *
 * **HUMAN:**
 * This widget lets you switch between day/night/red-night/auto modes and
 * adjust brightness. Works on all platforms with platform-specific controls.
 *
 * **AI AGENT:**
 * Non-sensor widget pattern:
 * - No sensor subscriptions (sensorInstance={undefined})
 * - No sensorType prop
 * - Custom JSX children instead of MetricCells
 * - Platform-specific conditional rendering (web vs native)
 * - Theme store interaction (not nmeaStore)
 *
 * Refactored from 358 lines (UnifiedWidgetGrid) to ~200 lines (TemplatedWidget).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../store/themeStore';
import * as Brightness from 'expo-brightness';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { PlatformToggle } from '../components/dialogs/inputs/PlatformToggle';

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
  instanceNumber?: number;
}

/**
 * Theme Button Component
 *
 * **AI AGENT:**
 * Extracted component for theme mode buttons. Shows selected state with
 * inverted colors (background vs foreground swap).
 * Icon size scales with cell height (40% of height, clamped 20-48px)
 */
const ThemeButton: React.FC<{
  mode: 'day' | 'night' | 'red-night' | 'auto';
  currentMode: string;
  icon: 'sunny' | 'moon' | 'eye' | 'time';
  onPress: () => void;
  theme: any;
  borderStyle: {
    borderLeftWidth: number;
    borderTopWidth: number;
    borderBottomWidth: number;
    borderRightWidth: number;
  };
  cellHeight?: number; // Injected by TemplatedWidget
}> = ({ mode, currentMode, icon, onPress, theme, borderStyle, cellHeight = 80 }) => {
  const isActive = mode === currentMode;
  // Calculate icon size: 40% of cell height, clamped between 20-48px
  const iconSize = Math.max(20, Math.min(48, cellHeight * 0.4));

  return (
    <TouchableOpacity
      style={[
        styles.themeButton,
        {
          backgroundColor: isActive ? theme.text : 'transparent',
          borderLeftColor: isActive ? theme.text : theme.border,
          borderTopColor: isActive ? theme.text : theme.border,
          borderBottomColor: isActive ? theme.text : theme.border,
          borderRightColor: isActive ? theme.text : theme.border,
          ...borderStyle,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={iconSize} color={isActive ? theme.surface : theme.text} />
    </TouchableOpacity>
  );
};

/**
 * Brightness Control Component
 *
 * **AI AGENT:**
 * Brightness slider with +/- buttons. Double-tap brightness bar to max.
 * Icon sizes scale with cell height.
 */
const BrightnessControl: React.FC<{
  brightness: number;
  nativeBrightnessControl: boolean;
  increaseBrightness: () => void;
  decreaseBrightness: () => void;
  setBrightnessToMax: () => void;
  theme: any;
  unadjustedColors: any;
  cellHeight?: number; // Injected by TemplatedWidget
}> = ({
  brightness,
  nativeBrightnessControl,
  increaseBrightness,
  decreaseBrightness,
  setBrightnessToMax,
  theme,
  unadjustedColors,
  cellHeight = 80,
}) => {
  const lastTapRef = React.useRef<number>(0);
  // Calculate icon size: 25% of cell height, clamped between 16-28px
  const iconSize = Math.max(16, Math.min(28, cellHeight * 0.25));
  // Button size scales with icon
  const buttonSize = iconSize * 2;
  // Border width scales with button size (5% of button size, min 1, max 3)
  const borderWidth = Math.max(1, Math.min(3, buttonSize * 0.05));

  const handleBrightnessBarPress = React.useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      setBrightnessToMax();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [setBrightnessToMax]);

  return (
    <Pressable style={styles.brightnessSection} onPress={handleBrightnessBarPress}>
      <View style={styles.brightnessControls}>
        <TouchableOpacity
          style={[
            styles.brightnessButton, 
            { 
              width: buttonSize, 
              height: buttonSize, 
              borderRadius: buttonSize / 2,
              borderWidth,
            }
          ]}
          onPress={decreaseBrightness}
          disabled={brightness <= 0.1}
        >
          <Ionicons
            name="remove"
            size={iconSize}
            color={brightness <= 0.1 ? unadjustedColors.textSecondary : unadjustedColors.text}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.brightnessBar,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.brightnessFill,
              {
                width: `${brightness * 100}%`,
                backgroundColor: unadjustedColors.primary,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.brightnessButton, 
            { 
              width: buttonSize, 
              height: buttonSize, 
              borderRadius: buttonSize / 2,
              borderWidth,
            }
          ]}
          onPress={increaseBrightness}
          disabled={brightness >= 1.0}
        >
          <Ionicons
            name="add"
            size={iconSize}
            color={brightness >= 1.0 ? unadjustedColors.textSecondary : unadjustedColors.text}
          />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

/**
 * Native Control Toggle Component (Mobile Only)
 *
 * **AI AGENT:**
 * Platform-specific component. Only renders on iOS/Android, not web.
 * Toggles between app-controlled vs OS-controlled brightness.
 * Icon size scales with cell height.
 */
const NativeControlToggle: React.FC<{
  nativeBrightnessControl: boolean;
  toggleNativeControl: () => void;
  theme: any;
  cellHeight?: number; // Injected by TemplatedWidget
}> = ({ nativeBrightnessControl, toggleNativeControl, theme, cellHeight = 80 }) => {
  if (Platform.OS === 'web') {
    return <View />;
  }

  // Calculate icon size: 20% of cell height, clamped between 12-20px
  const iconSize = Math.max(12, Math.min(20, cellHeight * 0.2));
  // Text size scales proportionally
  const fontSize = Math.max(10, Math.min(14, cellHeight * 0.15));
  // Toggle scale: native iOS Switch is 31px tall, scale to fit ~40% of cell height
  const toggleScale = Math.max(0.6, Math.min(1.0, (cellHeight * 0.4) / 31));

  return (
    <TouchableOpacity style={styles.nativeToggle} onPress={toggleNativeControl}>
      <View style={styles.nativeToggleContent}>
        <Ionicons
          name={nativeBrightnessControl ? 'phone-portrait' : 'phone-portrait-outline'}
          size={iconSize}
          color={theme.text}
        />
        <Text style={[styles.nativeToggleText, { color: theme.textSecondary, fontSize }]}>Native</Text>
      </View>
      <PlatformToggle 
        value={nativeBrightnessControl} 
        onValueChange={toggleNativeControl}
        scale={toggleScale}
      />
    </TouchableOpacity>
  );
};

/**
 * ThemeWidget Renderer
 *
 * **RENDERING ALGORITHM:**
 * 1. Subscribe to theme store (mode, brightness, colors)
 * 2. Create stable callbacks for theme actions
 * 3. Build JSX children array:
 *    - 4 ThemeButton components (primary grid 2×2)
 *    - 1 BrightnessControl (secondary row 1, full-width)
 *    - 1 NativeControlToggle (secondary row 2, full-width on mobile)
 * 4. Pass to TemplatedWidget with 2Rx2C-SEP-2Rx2C-WIDE template
 */
const ThemeWidgetComponent: React.FC<ThemeWidgetProps> = ({ id, instanceNumber = 0 }) => {
  // Subscribe to theme colors AND mode/brightness
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const brightness = useThemeStore((state) => state.brightness);
  const nativeBrightnessControl = useThemeStore((state) => state.nativeBrightnessControl);
  const unadjustedColors = useThemeStore((state) => state.colors);

  // Track cellHeight from TemplatedWidget injection
  const cellHeightRef = React.useRef<number>(80); // Default fallback

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

  // Helper component to capture cellHeight from TemplatedWidget
  const ThemeButtonWithHeight = ({ cellHeight, ...props }: any) => {
    cellHeightRef.current = cellHeight || 80;
    return <ThemeButton {...props} cellHeight={cellHeight} />;
  };

  const BrightnessControlWithHeight = ({ cellHeight, ...props }: any) => {
    cellHeightRef.current = cellHeight || 80;
    return <BrightnessControl {...props} cellHeight={cellHeight} />;
  };

  const NativeControlToggleWithHeight = ({ cellHeight, ...props }: any) => {
    cellHeightRef.current = cellHeight || 80;
    return <NativeControlToggle {...props} cellHeight={cellHeight} />;
  };

  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C-WIDE"
      sensorInstance={null}
      sensorType={'battery' as SensorType}
      widgetId="theme"
    >
      {
        [
          <ThemeButtonWithHeight
            key="day"
            mode="day"
            currentMode={mode}
            icon="sunny"
            onPress={handleDayPress}
            theme={theme}
            borderStyle={{
              borderLeftWidth: 1,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderRightWidth: 1,
            }}
          />,
          <ThemeButtonWithHeight
            key="night"
            mode="night"
            currentMode={mode}
            icon="moon"
            onPress={handleNightPress}
            theme={theme}
            borderStyle={{
              borderLeftWidth: 1,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderRightWidth: 0,
            }}
          />,
          <ThemeButtonWithHeight
            key="red"
            mode="red-night"
            currentMode={mode}
            icon="eye"
            onPress={handleRedPress}
            theme={theme}
            borderStyle={{
              borderLeftWidth: 1,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderRightWidth: 1,
            }}
          />,
          <ThemeButtonWithHeight
            key="auto"
            mode="auto"
            currentMode={mode}
            icon="time"
            onPress={handleAutoPress}
            theme={theme}
            borderStyle={{
              borderLeftWidth: 1,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderRightWidth: 0,
            }}
          />,
          BrightnessControl ? (
            <BrightnessControlWithHeight
              key="brightness"
              brightness={brightness}
              nativeBrightnessControl={nativeBrightnessControl}
              increaseBrightness={increaseBrightness}
              decreaseBrightness={decreaseBrightness}
              setBrightnessToMax={setBrightnessToMax}
              theme={theme}
              unadjustedColors={unadjustedColors}
            />
          ) : (
            <View key="brightness-placeholder" />
          ),
          NativeControlToggle ? (
            <NativeControlToggleWithHeight
              key="native-toggle"
              nativeBrightnessControl={nativeBrightnessControl}
              toggleNativeControl={toggleNativeControl}
              theme={theme}
            />
          ) : (
            <View key="native-toggle-placeholder" />
          ),
        ] as React.ReactElement[]
      }
    </TemplatedWidget>
  );
};

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
  brightnessControls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  brightnessButton: {
    // Width, height, borderRadius, and borderWidth now set dynamically in component
    alignItems: 'center',
    justifyContent: 'center',
  },
  brightnessBar: {
    flex: 1,
    height: 15,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0,
  },
  brightnessFill: {
    height: '100%',
  },
  nativeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 0,
    width: '100%',
    height: '100%',
  },
  nativeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nativeToggleText: {
    // Font size now set dynamically in component
    marginLeft: 8,
  },
});

export const ThemeWidget = React.memo(ThemeWidgetComponent);

ThemeWidget.displayName = 'ThemeWidget';

export default ThemeWidget;
