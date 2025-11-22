# Theme Migration Progress Report

**Generated:** 2025-01-21  
**Objective:** Eliminate all hardcoded colors in favor of centralized theme system  
**Theme Properties:** 32 total (expanded from 17 baseline)

---

## 📊 Current Status

### Overall Progress
- **Total Files with Hardcoded Colors:** 74 files
- **Total Hardcoded Color Occurrences:** 461 instances
- **Files Migrated This Session:** 5 files
- **Colors Fixed This Session:** ~85 instances

### Migration Completion Rate
```
Files Migrated:  5 / 74  (6.8%)
Colors Fixed:    85 / 461 (18.4%)
```

---

## ✅ Completed Migrations (This Session)

### High-Priority Files
1. **AutopilotControlScreen.tsx** ✅
   - **Location:** `src/widgets/AutopilotControlScreen.tsx`
   - **Colors Fixed:** 35 instances
   - **Changes:**
     - Converted to factory function pattern
     - Replaced all hardcoded colors with theme properties
     - SVG elements now use theme colors
     - Error displays use theme.error, theme.text
     - Interactive buttons use theme.interactive, theme.warning
     - Status displays use theme.text, theme.textSecondary

2. **MaritimeSettingsConfiguration.tsx** ✅
   - **Location:** `src/components/settings/MaritimeSettingsConfiguration.tsx`
   - **Colors Fixed:** 28 instances
   - **Changes:**
     - All child components use theme hook
     - Factory function for each component
     - Borders use theme.borderLight
     - Backgrounds use theme.surface, theme.appBackground
     - Text uses theme.text, theme.textSecondary, theme.textTertiary
     - Success states use theme.success
     - Warning sections use theme.warning

3. **app/settings.tsx** ✅
   - **Location:** `app/settings.tsx`
   - **Colors Fixed:** 15 instances
   - **Changes:**
     - Main settings screen
     - Cards use theme.surface
     - Primary buttons use theme.primary
     - Disabled states use theme.textSecondary
     - Shadows use theme.shadow

4. **app/widget-selector.tsx** ✅
   - **Location:** `app/widget-selector.tsx`
   - **Colors Fixed:** 4 instances
   - **Changes:**
     - Background uses theme.appBackground
     - Text uses theme.text, theme.textSecondary
     - Borders use theme.borderLight

5. **app/+not-found.tsx** ✅
   - **Location:** `app/+not-found.tsx`
   - **Colors Fixed:** 4 instances
   - **Changes:**
     - 404 page
     - Button uses theme.primary
     - Text uses theme.text

---

## 🔄 Remaining Work

### Files Still Requiring Migration (69 files)

**Alarm Screens (2 files):**
- `app/settings/alarm-detail.tsx` - 1 hardcoded color
- `app/settings/alarms.tsx` - 2 hardcoded colors (fallback colors with theme || syntax)

**Alarm Components (2 files):**
- `src/components/alarms/AlarmHistoryList.tsx`
- `src/components/alarms/CriticalAlarmVisuals.tsx`

**Atomic Components (15 files):**
- `src/components/atoms/AddWidgetButton.tsx`
- `src/components/atoms/Badge.tsx`
- `src/components/atoms/Button.tsx`
- `src/components/atoms/Card.tsx`
- `src/components/atoms/Divider.tsx`
- `src/components/atoms/Icon.tsx`
- `src/components/atoms/Input.tsx`
- `src/components/atoms/Label.tsx`
- `src/components/atoms/LoadingSpinner.tsx`
- `src/components/atoms/ProgressBar.tsx`
- `src/components/atoms/Switch.tsx`
- `src/components/atoms/Tooltip.tsx`
- `src/components/atoms/VisualPolish.tsx`
- (and more...)

**Dialog Components (3 files):**
- `src/components/dialogs/AlarmConfigDialog.tsx`
- `src/components/dialogs/FactoryResetDialog.tsx`
- `src/components/dialogs/UnitsConfigDialog.tsx`

**Other Components (~47 files):**
- Dashboard components
- Widget components
- Settings components
- Help screens
- Error boundaries
- Molecule components
- Organism components

---

## 📋 Priority Order for Next Migrations

### Phase 1: Core Navigation (High Priority)
1. **Dashboard components** - Primary user interface
2. **DynamicDashboard** - Main navigation hub
3. **DraggableWidget components** - Interactive elements

### Phase 2: Critical Dialogs (High Priority)
4. **AlarmConfigDialog** - Safety critical
5. **UnitsConfigDialog** - User configuration
6. **FactoryResetDialog** - System management

### Phase 3: Atomic Components (Medium Priority)
7. **Button, Card, Badge** - Reusable UI primitives
8. **Input, Switch, ProgressBar** - Form controls
9. **Tooltip, LoadingSpinner** - UI feedback

### Phase 4: Specialized Components (Low Priority)
10. **AlarmHistoryList, CriticalAlarmVisuals** - Alarm system
11. **Help screens** - Documentation
12. **Error boundaries** - Edge cases

---

## 🎨 Theme System Reference

### Available Theme Properties (32 total)

**Primary Colors:**
- `primary` - Primary brand color (#007AFF day, #0A84FF night, #EF4444 red-night)
- `secondary` - Secondary accent (#6B7280 day, #9CA3AF night, #991B1B red-night)
- `accent` - Highlight color (#3B82F6 day, #60A5FA night, #DC2626 red-night)

**Semantic Colors:**
- `success` - Success states (#10B981 day, #34D399 night, #F87171 red-night)
- `warning` - Warning states (#F59E0B day, #FBBF24 night, #EF4444 red-night)
- `error` - Error states (#EF4444 day, #F87171 night, #DC2626 red-night)

**Text Colors:**
- `text` - Primary text (#000000 day, #F9FAFB night, #FCA5A5 red-night)
- `textSecondary` - Secondary text (#6B7280 day, #9CA3AF night, #DC2626 red-night)
- `textTertiary` - Tertiary text (#94A3B8 day, #64748B night, #991B1B red-night)

**Surface Colors:**
- `background` - Main background (#F3F4F6 day, #1F2937 night, #000000 red-night)
- `surface` - Card surfaces (#FFFFFF day, #374151 night, #1A0000 red-night)
- `appBackground` - App background (#FFFFFF day, #111827 night, #000000 red-night)
- `surfaceHighlight` - Highlighted surface (#F1F5F9 day, #334155 night, #450A0A red-night)
- `surfaceDim` - Dimmed surface (#F8FAFC day, #2D3748 night, #2D0A0A red-night)

**Border Colors:**
- `border` - Standard borders (#D1D5DB day, #4B5563 night, #7F1D1D red-night)
- `borderLight` - Light borders (#E5E7EB day, #374151 night, #450A0A red-night)
- `borderDark` - Dark borders (#9CA3AF day, #6B7280 night, #991B1B red-night)

**Shadow Colors:**
- `shadow` - Standard shadow (#000000 day, #000000 night, #000000 red-night)
- `shadowDark` - Dark shadow (rgba(0,0,0,0.3) day, rgba(0,0,0,0.5) night, rgba(0,0,0,0.7) red-night)

**Overlay Colors:**
- `overlay` - Standard overlay (rgba(0,0,0,0.3) day, rgba(0,0,0,0.5) night, rgba(0,0,0,0.7) red-night)
- `overlayDark` - Dark overlay (rgba(0,0,0,0.5) day, rgba(0,0,0,0.7) night, rgba(0,0,0,0.9) red-night)

**Icon Colors:**
- `iconPrimary` - Primary icons (#374151 day, #F9FAFB night, #FCA5A5 red-night)
- `iconSecondary` - Secondary icons (#6B7280 day, #D1D5DB night, #DC2626 red-night)
- `iconAccent` - Accent icons (#3B82F6 day, #60A5FA night, #EF4444 red-night)
- `iconDisabled` - Disabled icons (#D1D5DB day, #4B5563 night, #450A0A red-night)

**Interactive Colors:**
- `interactive` - Interactive elements (#0284C7 day, #38BDF8 night, #EF4444 red-night)
- `interactiveHover` - Hover state (#0369A1 day, #22D3EE night, #DC2626 red-night)
- `interactiveActive` - Active state (#075985 day, #06B6D4 night, #B91C1C red-night)
- `interactiveDisabled` - Disabled state (#E5E7EB day, #374151 night, #450A0A red-night)

---

## 🛠️ Migration Pattern

### Standard Factory Function Pattern
```typescript
import { useTheme, ThemeColors } from '../store/themeStore';
import { useMemo } from 'react';

const Component = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return <View style={styles.container}>...</View>;
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  },
  text: {
    color: theme.text,
  },
});
```

### Common Color Mappings
```
#000, #000000, black → theme.text (for text) or theme.surface (for dark backgrounds)
#fff, #ffffff, white → theme.text (night/red-night) or theme.surface (day)
#3b82f6, #007AFF → theme.interactive or theme.primary
#ef4444, #dc2626 → theme.error
#10b981, #059669 → theme.success
#f59e0b, #FF9500 → theme.warning
#6b7280, #666 → theme.textSecondary
#94a3b8, #9ca3af → theme.textTertiary
#d1d5db, #e0e0e0 → theme.borderLight
rgba(0,0,0,0.3) → theme.overlay
rgba(0,0,0,0.7) → theme.overlayDark
```

---

## 📝 Testing Checklist

After migrating each file:
- [ ] Test in Day theme (full color spectrum)
- [ ] Test in Night theme (no green, cyan substitute)
- [ ] Test in Red-night theme (red-only, 620-750nm wavelengths)
- [ ] Verify no hardcoded colors remain (grep check)
- [ ] Ensure marine compliance (USCG/IMO SOLAS standards)
- [ ] Visual regression testing

---

## 🎯 Success Criteria

### Definition of "Migration Complete"
- [ ] Zero hardcoded colors in all `.tsx` files
- [ ] All components use `useTheme()` hook
- [ ] All styles use factory function pattern
- [ ] All 3 themes tested and functional
- [ ] Marine compliance verified (day/night/red-night modes)
- [ ] No visual regressions

### How to Verify
```bash
# Run audit script
./audit-theme-migration.sh

# Should show:
# Total hardcoded colors found: 0
```

---

## 📚 Documentation References

- **Migration Guide:** `THEME-MIGRATION-GUIDE.md` - Comprehensive patterns and examples
- **Audit Script:** `audit-theme-migration.sh` - Track progress
- **Theme Store:** `src/store/themeStore.ts` - Single source of truth (32 properties)

---

**Next Steps:**
1. Continue systematic migration following priority order
2. Run audit script after each file to track progress
3. Test each migration in all 3 theme modes
4. Update this document as files are completed
