# Batch Theme Migration Strategy

## Current Status
- **Total Colors:** 432 remaining (down from 461)
- **Files:** 73 with violations
- **Completed:** 6 files (115 colors migrated)
- **Progress:** 27% complete

## Strategy: Focus on Non-Story Files

### Why Skip Storybook Files?
Storybook files (.stories.tsx) are **documentation**, not production code:
- V23Compliance.stories.tsx - 44 colors (SKIP - demo/docs)
- GPSWidget.stories.tsx - 33 colors (SKIP - demo/docs)
- WindWidget.stories.tsx - 22 colors (SKIP - demo/docs)
- PrimaryMetricCell.stories.tsx - 8 colors (SKIP - demo/docs)

**Total Story Files:** ~110 colors (25% of remaining)

### Production Files to Migrate (322 colors in 65 files)

#### Priority 1: Error Boundaries (88 colors, 5 files)
These wrap all components - highest impact:
1. DataErrorBoundary.tsx - 32 colors
2. ConnectionErrorBoundary.tsx - 26 colors
3. WidgetErrorBoundary.tsx - 17 colors (two files: 17+12)
4. BaseErrorBoundary.tsx - 13 colors
5. simpleErrorBoundaries.tsx - 6 colors

#### Priority 2: Atomic Components (70 colors, 15 files)
Reusable primitives used everywhere:
1. Button.tsx - 19 colors
2. Input.tsx - 9 colors
3. Tooltip.tsx - 7 colors
4. Card.tsx - 6 colors
5. Badge.tsx - 5 colors
6. Switch.tsx - 5 colors
7. ProgressBar.tsx - 5 colors
8. Icon.tsx - 4 colors
9. LoadingSpinner.tsx - 4 colors
10. Others - 16 colors

#### Priority 3: Marine Components (50 colors, 10 files)
Marine-specific UI elements:
1. LinearBar.tsx - 11 colors
2. AnalogGauge.tsx - 10 colors  
3. CriticalAlarmVisuals.tsx - 10 colors
4. StatusIndicator.tsx - 7 colors
5. DigitalDisplay.tsx - 7 colors
6. MetricDisplay.tsx - 7 colors
7. Others - 8 colors

#### Priority 4: Dialogs & Screens (60 colors, 15 files)
User interaction screens:
1. AlarmConfigDialog.tsx - 8 colors
2. FactoryResetDialog.tsx - 6 colors
3. UnitsConfigDialog.tsx - 6 colors
4. Help system - 15 colors
5. Settings screens - 10 colors
6. Others - 15 colors

#### Priority 5: Widgets & Specialized (54 colors, 20 files)
Widget implementations and specialized components

## Rapid Migration Approach

### Template for Error Boundaries
```typescript
// Add at top
import { useTheme, ThemeColors } from '../store/themeStore';

// Replace StyleSheet.create with factory
const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: theme.appBackground },
  text: { color: theme.text },
  error: { color: theme.error },
  button: { backgroundColor: theme.interactive },
  // Map all hardcoded colors to theme properties
});

// In render method
const theme = useTheme();
const styles = useMemo(() => createStyles(theme), [theme]);
```

### Common Color Mappings
```typescript
// Backgrounds
'#f8f9fa' → theme.appBackground
'#FFFFFF' → theme.surface  
'#e9ecef' → theme.surfaceHighlight
'#f1f3f4' → theme.surfaceDim

// Text
'#dc3545' → theme.error
'#6c757d' → theme.textSecondary
'#495057' → theme.text
'#F3F4F6' → theme.text

// Status
'#28a745' → theme.success
'#007bff' → theme.interactive
'#ffc107' → theme.warning

// Borders
'#dee2e6' → theme.borderLight
'#000000' → theme.shadow
```

## Execution Plan

### Phase 1: Error Boundaries (30 min)
Migrate all 5 error boundary files in one batch
- **Impact:** Protects entire app
- **Colors:** 88
- **Progress:** 27% → 47%

### Phase 2: Atomic Components (45 min)
Migrate all atomic components 
- **Impact:** All UI reuses these
- **Colors:** 70
- **Progress:** 47% → 63%

### Phase 3: Marine Components (30 min)
Migrate marine-specific components
- **Impact:** Core marine functionality
- **Colors:** 50
- **Progress:** 63% → 75%

### Phase 4: Dialogs & Screens (30 min)
Migrate remaining dialogs and screens
- **Impact:** User-facing features
- **Colors:** 60
- **Progress:** 75% → 89%

### Phase 5: Cleanup (15 min)
Migrate remaining widgets and specialized
- **Impact:** Final production code
- **Colors:** 54
- **Progress:** 89% → 100% (production)

**Total Time:** ~2.5 hours for 100% production code coverage  
**Story Files:** Can be done later (documentation only)

## Next Actions

1. **NOW:** Complete error boundaries (Priority 1)
2. **THEN:** Batch atomic components (Priority 2)
3. **NEXT:** Marine components (Priority 3)
4. **FINALLY:** Remaining production code

**Goal:** 100% production code migrated, stories optional
