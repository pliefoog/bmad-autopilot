# Styling Guidelines

## Theme System Architecture

### Display Modes for Marine Environment

Marine displays require three distinct visual modes:

1. **Day Mode** - High contrast for bright sunlight
2. **Night Mode** - Reduced brightness to preserve night vision
3. **Red Night Mode** - Red-only display for maximum night vision preservation

### Theme Provider Implementation

**Theme Provider (`src/theme/ThemeProvider.tsx`)**

```typescript
import React, { createContext, useContext, useState } from 'react';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export type DisplayMode = 'day' | 'night' | 'red-night';

interface ThemeContextValue {
  mode: DisplayMode;
  colors: typeof colors.day;
  typography: typeof typography;
  spacing: typeof spacing;
  setMode: (mode: DisplayMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<DisplayMode>('day');

  const value = {
    mode,
    colors: colors[mode],
    typography,
    spacing,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

## Color System

### Marine-Optimized Color Palettes

**Color Definitions (`src/theme/colors.ts`)**

```typescript
export const colors = {
  day: {
    // Primary colors - high contrast for sunlight
    primary: '#0284C7',        // Bright blue for primary actions
    secondary: '#0EA5E9',      // Lighter blue for secondary elements
    accent: '#06B6D4',         // Cyan accent for highlights
    
    // Status colors
    success: '#10B981',        // Green for normal operations
    warning: '#F59E0B',        // Amber for cautions
    error: '#EF4444',          // Red for alarms/errors
    
    // Background hierarchy
    backgroundDark: '#0A1929',    // Deepest background (main canvas)
    backgroundMedium: '#1E293B',  // Widget backgrounds
    backgroundLight: '#334155',   // Elevated surfaces
    
    // Borders and dividers
    borderGray: '#64748B',
    borderLight: '#94A3B8',
    
    // Text hierarchy
    textPrimary: '#FFFFFF',       // Main text content
    textSecondary: '#CBD5E1',     // Secondary labels
    textTertiary: '#94A3B8',      // Subtle text/placeholders
    textInverse: '#000000',       // Text on light backgrounds
    
    // Transparent overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
  },
  
  night: {
    // Reduced brightness (60% of day values) to preserve night vision
    primary: '#0369A1',
    secondary: '#0C4A6E',
    accent: '#0891B2',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    backgroundDark: '#020617',
    backgroundMedium: '#0F172A',
    backgroundLight: '#1E293B',
    borderGray: '#475569',
    borderLight: '#64748B',
    textPrimary: '#CBD5E1',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#1E293B',
    overlay: 'rgba(0, 0, 0, 0.8)',
    modalBackdrop: 'rgba(0, 0, 0, 0.9)',
  },
  
  'red-night': {
    // Red monochrome for maximum night vision preservation
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#991B1B',
    success: '#DC2626',     // All status colors use red variants
    warning: '#EF4444',
    error: '#F87171',
    backgroundDark: '#1A0000',
    backgroundMedium: '#2A0000',
    backgroundLight: '#400000',
    borderGray: '#600000',
    borderLight: '#800000',
    textPrimary: '#FCA5A5',
    textSecondary: '#F87171',
    textTertiary: '#EF4444',
    textInverse: '#1A0000',
    overlay: 'rgba(26, 0, 0, 0.8)',
    modalBackdrop: 'rgba(26, 0, 0, 0.9)',
  },
} as const;
```

## Typography System

### Marine-Readable Typography

**Typography Definitions (`src/theme/typography.ts`)**

```typescript
import { TextStyle } from 'react-native';

export const typography = {
  // Primary data displays (large NMEA values)
  primaryDataValue: {
    fontSize: 48,
    fontWeight: '700' as TextStyle['fontWeight'],
    fontFamily: 'monospace', // Consistent character width
    letterSpacing: -1,
  },
  
  // Secondary data displays
  secondaryDataValue: {
    fontSize: 32,
    fontWeight: '600' as TextStyle['fontWeight'],
    fontFamily: 'monospace',
  },
  
  // Widget titles
  widgetTitle: {
    fontSize: 12,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 1,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  
  // Units and labels
  unitLabel: {
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  
  // Body text
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  
  // Captions and small text
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  
  // Button text
  button: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    textAlign: 'center' as TextStyle['textAlign'],
  },
  
  // Headers
  h1: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 40,
  },
  
  h2: {
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 32,
  },
  
  h3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
} as const;
```

## Spacing System

### Consistent Spacing Scale

**Spacing Definitions (`src/theme/spacing.ts`)**

```typescript
export const spacing = {
  // Base spacing unit (8px)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Component-specific spacing
  widget: {
    padding: 12,
    margin: 8,
    borderRadius: 8,
  },
  
  screen: {
    horizontal: 16,
    vertical: 24,
  },
  
  touchTarget: 44, // Minimum touch target size (iOS guidelines)
} as const;
```

## Component Styling Patterns

### Styled Component Template

```typescript
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const ExampleWidget: React.FC<ExampleWidgetProps> = ({ 
  value, 
  unit, 
  isStale, 
  hasAlarm 
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundMedium,
          borderColor: hasAlarm ? colors.error : colors.borderGray,
          padding: spacing.widget.padding,
          margin: spacing.widget.margin,
          borderRadius: spacing.widget.borderRadius,
        },
      ]}
    >
      <Text style={[styles.title, typography.widgetTitle, { color: colors.textSecondary }]}>
        DEPTH
      </Text>
      
      <View style={styles.valueContainer}>
        <Text
          style={[
            typography.primaryDataValue,
            { color: isStale ? colors.textTertiary : colors.textPrimary },
          ]}
        >
          {value?.toFixed(1) ?? '--'}
        </Text>
        <Text style={[typography.unitLabel, { color: colors.textSecondary }]}>
          {unit}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 160,
    minHeight: 160,
    borderWidth: 2,
    justifyContent: 'space-between',
  },
  title: {
    textAlign: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
});
```

### Dynamic Styling Patterns

**Theme-Responsive Styling:**

```typescript
// ✅ Good - Dynamic theme application
const dynamicStyles = (colors: ThemeColors, mode: DisplayMode) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundDark,
    borderColor: colors.borderGray,
  },
  
  // Conditional styling based on mode
  alarmBorder: {
    borderColor: mode === 'red-night' ? colors.primary : colors.error,
    borderWidth: mode === 'red-night' ? 4 : 2, // Thicker border in red-night
  },
});

// ❌ Avoid - Hardcoded colors
const staticStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B', // Theme won't update this
  },
});
```

## Animation Guidelines

### Performance-Optimized Animations

```typescript
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const AnimatedWidget: React.FC = ({ isVisible }) => {
  const scale = useSharedValue(isVisible ? 1 : 0);
  const opacity = useSharedValue(isVisible ? 1 : 0);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  // Smooth entrance animation
  useEffect(() => {
    scale.value = withSpring(isVisible ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
    
    opacity.value = withTiming(isVisible ? 1 : 0, {
      duration: 200,
    });
  }, [isVisible]);
  
  return (
    <Animated.View style={[styles.widget, animatedStyle]}>
      {/* Widget content */}
    </Animated.View>
  );
};
```

## Accessibility Guidelines

### Marine Environment Accessibility

```typescript
export const AccessibleWidget: React.FC = ({ value, unit, title }) => {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}: ${value} ${unit}`}
      accessibilityHint="Double tap to configure this widget"
    >
      <Text style={[typography.widgetTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
      <Text 
        style={[typography.primaryDataValue, { color: colors.textPrimary }]}
        accessibilityLiveRegion="polite" // Announces value changes
      >
        {value} {unit}
      </Text>
    </View>
  );
};
```

## Styling Best Practices

### Do's and Don'ts

**✅ Do:**
- Use theme context for all colors and typography
- Apply consistent spacing from the spacing scale
- Use StyleSheet.create for static styles
- Implement proper accessibility labels
- Test all three display modes (day/night/red-night)

**❌ Don't:**
- Hardcode colors or fonts in components
- Use magic numbers for spacing
- Create styles inline (performance impact)
- Ignore accessibility requirements
- Use platform-specific styling without justification

### Performance Considerations

1. **StyleSheet Optimization:** Use StyleSheet.create to cache styles
2. **Theme Subscriptions:** Only subscribe to specific theme properties needed
3. **Animation Performance:** Use native driver animations when possible
4. **Layout Minimization:** Avoid unnecessary nesting and complex layouts