# Theme Migration Guide - Eliminate Hardcoded Colors

## Overview
This guide documents the migration from hardcoded colors to centralized theme system for marine-compliant dynamic theming.

## Theme Properties Available

### Core Colors
- `theme.primary` - Main brand color (blue/red based on mode)
- `theme.secondary` - Secondary brand color
- `theme.accent` - Accent/highlight color
- `theme.success` - Success state (green/cyan/red)
- `theme.warning` - Warning state (amber)
- `theme.error` - Error state (red)

### Text Colors
- `theme.text` - Primary text
- `theme.textSecondary` - Secondary/muted text
- `theme.textTertiary` - Tertiary/disabled text

### Backgrounds
- `theme.appBackground` - Main dashboard background
- `theme.background` - Widget header background
- `theme.surface` - Widget content background
- `theme.surfaceHighlight` - Highlighted surface (hover/selected)
- `theme.surfaceDim` - Dimmed surface (inactive)

### Borders & Shadows
- `theme.border` - Standard border
- `theme.borderLight` - Lighter border variant
- `theme.borderDark` - Darker border variant
- `theme.shadow` - Standard shadow
- `theme.shadowDark` - Darker shadow

### Overlays
- `theme.overlay` - Modal/dialog overlay (rgba)
- `theme.overlayDark` - Darker overlay variant (rgba)

### Icons
- `theme.iconPrimary` - Primary icon color
- `theme.iconSecondary` - Secondary icon color
- `theme.iconAccent` - Accent icon color
- `theme.iconDisabled` - Disabled icon color

### Interactive States
- `theme.interactive` - Interactive elements
- `theme.interactiveHover` - Hover state
- `theme.interactiveActive` - Active/pressed state
- `theme.interactiveDisabled` - Disabled state

## Migration Patterns

### Pattern 1: Simple Color Replacement

**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  text: {
    color: '#fff',
  },
});
```

**After:**
```typescript
import { useTheme } from '../store/themeStore';

const Component = () => {
  const theme = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    text: {
      color: theme.text,
    },
  });
  
  return <View style={styles.container}>...</View>;
};
```

### Pattern 2: Factory Function (Dynamic Updates)

**Before:**
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
});
```

**After:**
```typescript
import { useMemo } from 'react';
import { useTheme } from '../store/themeStore';

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  button: {
    backgroundColor: theme.interactive,
    borderColor: theme.interactiveActive,
  },
});

const Component = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return <View style={styles.button}>...</View>;
};
```

### Pattern 3: Inline Icon Colors

**Before:**
```typescript
<UniversalIcon name="warning" size={24} color="#DC2626" />
```

**After:**
```typescript
const theme = useTheme();
<UniversalIcon name="warning" size={24} color={theme.error} />
```

### Pattern 4: RGBA Overlays

**Before:**
```typescript
backgroundColor: 'rgba(0, 0, 0, 0.6)',
```

**After:**
```typescript
backgroundColor: theme.overlayDark,
```

### Pattern 5: Shadow Colors

**Before:**
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.3,
shadowRadius: 4,
```

**After:**
```typescript
shadowColor: theme.shadow,
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 1, // Opacity baked into theme.shadow
shadowRadius: 4,
```

## Common Color Mappings

### Grays/Blacks
- `#000`, `#000000`, `black` → `theme.appBackground` or `theme.surface`
- `#1a1a1a`, `#2a2a2a`, `#333` → `theme.surface` or `theme.surfaceDim`
- `#6b7280`, `#9ca3af` → `theme.textSecondary` or `theme.textTertiary`

### Whites
- `#fff`, `#ffffff`, `white` → `theme.text` (day) or `theme.surface` (backgrounds)
- `#f8fafc`, `#f9fafb` → `theme.surfaceDim` or `theme.surfaceHighlight`

### Blues
- `#3b82f6`, `#007AFF` → `theme.interactive`
- `#38BDF8`, `#06B6D4` → `theme.primary` or `theme.accent`

### Reds
- `#DC2626`, `#dc2626` → `theme.error`
- `#991B1B`, `#7F1D1D` → `theme.borderDark` (red-night)

### Ambers/Yellows
- `#F59E0B`, `#f59e0b` → `theme.warning`

### Greens
- `#059669`, `#10B981` → `theme.success`

## Component Checklist

- [ ] Import `useTheme` from `../store/themeStore`
- [ ] Replace hardcoded colors with theme properties
- [ ] Convert to factory function if styles need dynamic updates
- [ ] Update icon colors to use theme properties
- [ ] Test in all 3 theme modes (day/night/red-night)
- [ ] Verify no hardcoded colors remain (grep check)

## Testing

Run grep to find remaining hardcoded colors:
```bash
grep -r "#[0-9A-Fa-f]\{6\}" src/widgets/ src/components/
grep -r "rgba?(" src/widgets/ src/components/
```

## Marine Compliance Notes

- **Day mode:** Full color spectrum allowed
- **Night mode:** Reduced brightness, avoid pure greens (use cyan)
- **Red-night mode:** ONLY red/black colors (620-750nm wavelengths)
  - All blues → red
  - All greens → red or cyan
  - All whites → light red (#FCA5A5)
  - Backgrounds → pure black or very dark red

## Priority Order

1. **High Priority:** Autopilot, Dashboard, Critical Widgets
2. **Medium Priority:** Settings, Dialogs, Help Screens
3. **Low Priority:** Error Boundaries, Debug Components
