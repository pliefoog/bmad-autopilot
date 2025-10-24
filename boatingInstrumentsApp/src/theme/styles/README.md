# Theme Stylesheet System

This directory contains the centralized styling system for all marine instrument widgets in the BMad Autopilot application. The theme stylesheet provides consistent, theme-aware styles that automatically adapt to Day, Night, and Red-Night display modes.

## Overview

The stylesheet system eliminates the need for individual widgets to define their own styling patterns. Instead, widgets use pre-defined, theme-aware styles that ensure consistency across the entire dashboard.

### Key Benefits

- **Consistency**: Single source of truth for all widget styles
- **Theme Support**: Automatic Day/Night/Red-Night mode switching
- **Performance**: Memoized style creation prevents unnecessary re-renders
- **Maintainability**: Update styles in one place, affects all widgets
- **Developer Experience**: Faster widget development with pre-built components

## Files

- `theme.stylesheet.ts` - Main stylesheet with all themed styles
- `README.md` - This documentation file
- `widgetStyles.ts` - Legacy styles (being phased out)

## Usage

### Basic Pattern

```typescript
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { createThemedStyles } from '../styles/theme.stylesheet';

export const MyWidget: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createThemedStyles(theme), [theme]);

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.widgetHeader}>
        <Text style={styles.title}>My Widget</Text>
      </View>
      <View style={styles.widgetBody}>
        <Text style={styles.mnemonic}>SPEED</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.valueMonospace}>12.4</Text>
          <Text style={styles.unit}>kn</Text>
        </View>
        <Text style={styles.secondary}>Steady</Text>
      </View>
    </View>
  );
};
```

### Performance Optimization

Always use `useMemo` to prevent unnecessary style recreation:

```typescript
// ❌ Bad - Creates new styles on every render
const styles = createThemedStyles(theme);

// ✅ Good - Memoized, only recreates when theme changes
const styles = useMemo(() => createThemedStyles(theme), [theme]);
```

## Style Categories

### 1. Container Styles

Base layout components for widget structure:

- `widgetContainer` - Main widget wrapper with surface styling
- `widgetHeader` - Header section with background and borders
- `widgetBody` - Main content area with padding
- `widgetFooter` - Optional footer section

```typescript
<View style={styles.widgetContainer}>
  <View style={styles.widgetHeader}>
    <Text style={styles.title}>DEPTH</Text>
  </View>
  <View style={styles.widgetBody}>
    {/* Widget content */}
  </View>
</View>
```

### 2. Typography Styles

Text styling for different content types:

- `title` - Widget titles (16pt semibold)
- `mnemonic` - Metric labels (12pt uppercase bold)
- `valueMonospace` - Large data values (36pt monospace)
- `valueMedium` - Medium data values (24pt monospace)
- `valueSmall` - Small data values (18pt monospace)
- `unit` - Unit labels (16pt regular)
- `unitSmall` - Small unit labels (12pt regular)
- `secondary` - Secondary information (12pt regular)
- `caption` - Small captions (10pt regular)

```typescript
<Text style={styles.mnemonic}>DEPTH</Text>
<View style={styles.valueContainer}>
  <Text style={styles.valueMonospace}>12.4</Text>
  <Text style={styles.unit}>m</Text>
</View>
<Text style={styles.secondary}>Deepening</Text>
```

### 3. Layout Styles

Pre-configured layouts for different metric arrangements:

- `grid1x1` - Single centered metric
- `grid1x2` - Two metrics vertically stacked
- `grid2x1` - Two metrics side by side
- `grid2x2` - Four metrics in 2×2 grid
- `grid2x3` - Six metrics in 2×3 grid
- `grid3x2` - Six metrics in 3×2 grid

```typescript
// Single metric layout
<View style={styles.grid1x1}>
  <Text style={styles.valueMonospace}>12.4</Text>
</View>

// 2×2 grid layout
<View style={styles.grid2x2}>
  <View style={styles.gridRow}>
    <View style={styles.gridCell}>
      <Text style={styles.valueSmall}>2400</Text>
      <Text style={styles.unitSmall}>rpm</Text>
    </View>
    <View style={styles.gridCell}>
      <Text style={styles.valueSmall}>85</Text>
      <Text style={styles.unitSmall}>°C</Text>
    </View>
  </View>
  <View style={styles.gridRow}>
    <View style={styles.gridCell}>
      <Text style={styles.valueSmall}>12</Text>
      <Text style={styles.unitSmall}>psi</Text>
    </View>
    <View style={styles.gridCell}>
      <Text style={styles.valueSmall}>1247</Text>
      <Text style={styles.unitSmall}>h</Text>
    </View>
  </View>
</View>
```

### 4. Button Styles

Interactive button components:

- `buttonPrimary` - Primary actions (accent background)
- `buttonSecondary` - Secondary actions (bordered)
- `buttonDanger` - Destructive actions (error color)
- `buttonDisabled` - Disabled state
- `buttonTextPrimary`, `buttonTextSecondary`, `buttonTextDanger` - Button text styles

```typescript
<TouchableOpacity style={styles.buttonPrimary}>
  <Text style={styles.buttonTextPrimary}>Set Course</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.buttonSecondary}>
  <Text style={styles.buttonTextSecondary}>Cancel</Text>
</TouchableOpacity>
```

### 5. State Indicator Styles

Color styles for different data states:

- `stateNormal` - Normal data (theme.text)
- `stateWarning` - Warning conditions (theme.warning)
- `stateError` - Error/alarm conditions (theme.error)
- `stateSuccess` - Success conditions (theme.success)
- `stateNoData` - No data available (theme.textSecondary)

```typescript
const getValueStyle = (value: number | undefined) => {
  if (value === undefined) return styles.stateNoData;
  if (value > 100) return styles.stateError;
  if (value > 90) return styles.stateWarning;
  return styles.stateNormal;
};

<Text style={[styles.valueMonospace, getValueStyle(temperature)]}>
  {temperature !== undefined ? temperature.toFixed(1) : '---'}
</Text>
```

## Helper Functions

### getStateColor()

Returns the appropriate color for a given state:

```typescript
import { getStateColor } from '../styles/theme.stylesheet';

const color = getStateColor('warning', theme);
// Returns theme.warning color
```

## Theme Colors Reference

Available theme colors (accessed via `useTheme()`):

### Day Theme
- `primary`: #0284C7 (Sky blue)
- `secondary`: #0891B2 (Cyan)
- `background`: #F8FAFC (Light gray)
- `surface`: #FFFFFF (White)
- `text`: #0F172A (Dark slate)
- `textSecondary`: #475569 (Medium slate)
- `accent`: #059669 (Emerald)
- `warning`: #D97706 (Amber)
- `error`: #DC2626 (Red)
- `success`: #059669 (Green)
- `border`: #CBD5E1 (Light slate)
- `shadow`: #00000020 (Subtle shadow)

### Night Theme
Colors optimized for low-light conditions with reduced brightness.

### Red-Night Theme
Red-tinted colors for night vision preservation.

## Typography Scale

Consistent font sizing across the application:

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| `title` | 16pt | 600 | Widget titles |
| `mnemonic` | 12pt | 700 | Metric labels |
| `valueMonospace` | 36pt | 800 | Primary values |
| `valueMedium` | 24pt | 700 | Secondary values |
| `valueSmall` | 18pt | 600 | Grid values |
| `unit` | 16pt | 600 | Unit labels |
| `unitSmall` | 12pt | 500 | Small units |
| `secondary` | 12pt | 500 | Status text |
| `caption` | 10pt | 400 | Small captions |

## Best Practices

### 1. Always Use Memoization

```typescript
const styles = useMemo(() => createThemedStyles(theme), [theme]);
```

### 2. Prefer Semantic Style Names

```typescript
// ✅ Good - Semantic meaning
<Text style={styles.mnemonic}>DEPTH</Text>

// ❌ Bad - Implementation detail
<Text style={{ fontSize: 12, fontWeight: '700' }}>DEPTH</Text>
```

### 3. Use State Colors for Data

```typescript
// ✅ Good - State-aware coloring
<Text style={[styles.valueMonospace, styles.stateWarning]}>95</Text>

// ❌ Bad - Hardcoded color
<Text style={[styles.valueMonospace, { color: '#D97706' }]}>95</Text>
```

### 4. Combine Styles Appropriately

```typescript
// Multiple styles can be combined
<Text style={[styles.valueMonospace, styles.stateError]}>
  OVER-REV!
</Text>
```

### 5. Use Grid Layouts for Multi-Metric Widgets

```typescript
// Consistent spacing and alignment
<View style={styles.grid2x2}>
  <View style={styles.gridRow}>
    <View style={styles.gridCell}>
      {/* Metric 1 */}
    </View>
    <View style={styles.gridCell}>
      {/* Metric 2 */}
    </View>
  </View>
</View>
```

## Migration from Legacy Styles

If migrating from `widgetStyles.ts`:

### Old Pattern
```typescript
import { createWidgetStyles } from '../styles/widgetStyles';

const widgetStyles = createWidgetStyles(theme);
<Text style={widgetStyles.metricValue}>12.4</Text>
```

### New Pattern
```typescript
import { createThemedStyles } from '../styles/theme.stylesheet';

const styles = useMemo(() => createThemedStyles(theme), [theme]);
<Text style={styles.valueMonospace}>12.4</Text>
```

## Adding New Styles

To add new styles to the system:

1. Add the style to the appropriate category in `theme.stylesheet.ts`
2. Include comprehensive JSDoc documentation
3. Add usage examples to this README
4. Update the example widget to demonstrate the new style
5. Test across all three theme modes

### Example Addition

```typescript
/**
 * New style for special indicators.
 */
newIndicatorStyle: {
  fontSize: 14,
  fontWeight: '600',
  color: theme.accent,
  backgroundColor: theme.background,
  padding: 4,
  borderRadius: 4,
} as ViewStyle,
```

## Testing

Verify styles work correctly in all theme modes:

1. **Day Mode**: High contrast, bright colors
2. **Night Mode**: Dark background, reduced brightness
3. **Red-Night Mode**: Red-tinted for night vision

Test all style categories:
- Container layouts
- Typography scaling
- Grid arrangements
- Button interactions
- State color changes

## Performance Notes

The stylesheet system is optimized for performance:

- **Memoization**: Styles only recreate when theme changes
- **StyleSheet.create()**: Uses React Native's optimized stylesheet system
- **Type Safety**: Full TypeScript support prevents runtime errors
- **Theme Caching**: Theme objects are cached in Zustand store

Memory usage is minimal as styles are shared across all widget instances of the same type.