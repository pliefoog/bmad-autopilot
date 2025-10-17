# Technical Implementation Fix Specification
**Document ID:** TECH-FIX-20251015
**Created:** October 15, 2025
**Author:** Sally (UX Expert)
**Status:** Ready for Implementation
**Priority:** HIGH

---

## Executive Summary

This document addresses critical UX/UI implementation gaps identified between the current application state and the documented requirements in Stories 2.7 (Dashboard Customization) and 2.12 (Two-State Widget System). The current implementation fails to meet several acceptance criteria, resulting in a suboptimal user experience.

**Key Issues:**
1. Dashboard layout not filling available viewport space
2. Widget sizing inconsistent with 180×180pt standard
3. Collapsed/expanded state system not integrated into main app
4. Drag & drop positioning not functional
5. Widget icons not monochromatic (theme-aware)
6. Long-press to lock expanded state not implemented

---

## Issue 1: Dashboard Layout Not Filling Screen

### Problem Statement
The dashboard area (`.instrumentPanel` in [App.tsx:613-616](../boatingInstrumentsApp/src/mobile/App.tsx#L613-L616)) does not extend to the bottom of the screen. There is excessive whitespace between the widget area and the footer controls.

### Current Behavior
```typescript
// App.tsx lines 269, 355-358
<View style={styles.contentArea}>  {/* flex: 1 */}
  <View style={styles.instrumentPanel}>  {/* flex: 1 */}
    {/* Widgets */}
  </View>
</View>

contentArea: {
  flex: 1,
  overflow: 'hidden',
},
```

**Issue:** The `.widgetsFlow` container (line 617-624) uses `flex: 1` but has inadequate content, causing it not to expand fully.

### Expected Behavior
Dashboard should fill entire space from HeaderBar to footer (Autopilot Control + Bottom Nav).

### Technical Solution

**File:** `boatingInstrumentsApp/src/mobile/App.tsx`

**Change 1: Update `.widgetsFlow` style**
```typescript
// Lines 617-624 - MODIFY
widgetsFlow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  justifyContent: 'flex-start',
  padding: 8,
  minHeight: '100%', // ADD: Ensure widgets fill available height
},
```

**Change 2: Update `.instrumentPanel` style**
```typescript
// Lines 613-616 - MODIFY
instrumentPanel: {
  flex: 1,
  backgroundColor: '#ffffff', // White background for day theme
  overflow: 'scroll', // ADD: Allow scrolling if widgets exceed viewport
},
```

**Change 3: Calculate proper heights**
```typescript
// Add after line 41 (after STORAGE_KEY constant)
const { height: screenHeight } = Dimensions.get('window');
const HEADER_HEIGHT = 60; // HeaderBar height
const FOOTER_HEIGHT = 88; // Autopilot Control (70) + Bottom Nav (18)
const DASHBOARD_HEIGHT = screenHeight - HEADER_HEIGHT - FOOTER_HEIGHT;
```

### Testing Criteria
- [ ] Dashboard extends to footer edge with no whitespace
- [ ] Scrolling works when widgets exceed viewport height
- [ ] Layout adapts correctly to orientation changes
- [ ] No layout thrashing or flickering

---

## Issue 2: Widget Sizing Non-Compliance

### Problem Statement
Current widgets in the flow layout do not adhere to the **180×180pt collapsed** standard defined in Story 2.12 (AC 20). The [WidgetShell.tsx:15-17](../boatingInstrumentsApp/src/components/WidgetShell.tsx#L15-L17) component defines correct dimensions, but widgets are not being wrapped in WidgetShell.

### Current Behavior
```typescript
// App.tsx lines 100-110
const widgetMap: { [key: string]: () => React.ReactNode } = {
  depth: () => <DepthWidget />,
  speed: () => <SpeedWidget />,
  // ... other widgets WITHOUT WidgetShell wrapper
};
```

**Issue:** Widgets rendered directly without WidgetShell wrapper, bypassing sizing standards.

### Expected Behavior
All widgets should:
- **Collapsed:** 180×180pt (mobile), 200×200pt (tablet)
- **Expanded:** 180×280pt (mobile), 200×400pt (tablet)
- Be wrapped in WidgetShell for consistent sizing

### Technical Solution

**File:** `boatingInstrumentsApp/src/mobile/App.tsx`

**Change 1: Add WidgetShell imports**
```typescript
// Line 20 - ADD import
import { WidgetShell } from '../components/WidgetShell';
```

**Change 2: Add expanded state management**
```typescript
// Add after line 57 (after showConnectionDialog state)
const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({
  depth: false,
  speed: false,
  wind: false,
  gps: false,
  compass: false,
  engine: false,
  battery: false,
  tanks: false,
  autopilot: false,
});

const toggleWidgetExpanded = useCallback((widgetKey: string) => {
  setExpandedWidgets(prev => ({
    ...prev,
    [widgetKey]: !prev[widgetKey],
  }));
}, []);
```

**Change 3: Wrap widgets in WidgetShell**
```typescript
// Lines 100-110 - REPLACE widgetMap
const widgetMap: { [key: string]: () => React.ReactNode } = {
  depth: () => (
    <WidgetShell
      expanded={expandedWidgets.depth}
      onToggle={() => toggleWidgetExpanded('depth')}
      testID="depth-shell"
    >
      <DepthWidget />
    </WidgetShell>
  ),
  speed: () => (
    <WidgetShell
      expanded={expandedWidgets.speed}
      onToggle={() => toggleWidgetExpanded('speed')}
      testID="speed-shell"
    >
      <SpeedWidget />
    </WidgetShell>
  ),
  wind: () => (
    <WidgetShell
      expanded={expandedWidgets.wind}
      onToggle={() => toggleWidgetExpanded('wind')}
      testID="wind-shell"
    >
      <WindWidget />
    </WidgetShell>
  ),
  gps: () => (
    <WidgetShell
      expanded={expandedWidgets.gps}
      onToggle={() => toggleWidgetExpanded('gps')}
      testID="gps-shell"
    >
      <GPSWidget />
    </WidgetShell>
  ),
  compass: () => (
    <WidgetShell
      expanded={expandedWidgets.compass}
      onToggle={() => toggleWidgetExpanded('compass')}
      testID="compass-shell"
    >
      <CompassWidget />
    </WidgetShell>
  ),
  engine: () => (
    <WidgetShell
      expanded={expandedWidgets.engine}
      onToggle={() => toggleWidgetExpanded('engine')}
      testID="engine-shell"
    >
      <EngineWidget />
    </WidgetShell>
  ),
  battery: () => (
    <WidgetShell
      expanded={expandedWidgets.battery}
      onToggle={() => toggleWidgetExpanded('battery')}
      testID="battery-shell"
    >
      <BatteryWidget />
    </WidgetShell>
  ),
  tanks: () => (
    <WidgetShell
      expanded={expandedWidgets.tanks}
      onToggle={() => toggleWidgetExpanded('tanks')}
      testID="tanks-shell"
    >
      <TanksWidget />
    </WidgetShell>
  ),
  autopilot: () => (
    <WidgetShell
      expanded={expandedWidgets.autopilot}
      onToggle={() => toggleWidgetExpanded('autopilot')}
      testID="autopilot-shell"
    >
      <AutopilotStatusWidget showControls={true} />
    </WidgetShell>
  ),
};
```

**Change 4: Remove widgetWrapper style (no longer needed)**
```typescript
// Lines 625-627 - REMOVE
// widgetWrapper: {
//   // No fixed size - let widgets size themselves
// },
```

### Testing Criteria
- [ ] All widgets render at 180×180pt when collapsed
- [ ] Tap widget body → expands to 180×280pt with 300ms animation
- [ ] Tap again → collapses back to 180×180pt
- [ ] Chevron rotates 180° during expansion
- [ ] Consistent sizing across all widget types

---

## Issue 3: Collapsed/Expanded State Not Persisted

### Problem Statement
Story 2.12 (AC 3) requires that expanded state persists across app restarts. Additionally, **long-press on chevron** should lock the widget in expanded state permanently. Current implementation has no persistence mechanism.

### Current Behavior
- Expanded state stored in local component state only
- State resets on app restart
- No long-press functionality

### Expected Behavior
- Tap widget → toggle expanded state (temporary)
- Long-press chevron → lock expanded state (persisted)
- State restored from AsyncStorage on app load

### Technical Solution

**File:** `boatingInstrumentsApp/src/mobile/App.tsx`

**Change 1: Add persistence utilities**
```typescript
// Add after line 41 (after STORAGE_KEY constant)
const WIDGET_STATE_KEY = 'widget-expanded-state';

// Load persisted widget states
const loadWidgetStates = async (): Promise<Record<string, boolean>> => {
  try {
    const stored = await AsyncStorage.getItem(WIDGET_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load widget states:', error);
  }
  return {};
};

// Save widget states
const saveWidgetStates = async (states: Record<string, boolean>) => {
  try {
    await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save widget states:', error);
  }
};
```

**Change 2: Initialize state from storage**
```typescript
// MODIFY the expandedWidgets state initialization (after line 57)
const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({
  depth: false,
  speed: false,
  wind: false,
  gps: false,
  compass: false,
  engine: false,
  battery: false,
  tanks: false,
  autopilot: false,
});

// ADD useEffect to load persisted states
useEffect(() => {
  const initializeWidgetStates = async () => {
    const savedStates = await loadWidgetStates();
    if (Object.keys(savedStates).length > 0) {
      setExpandedWidgets(prev => ({ ...prev, ...savedStates }));
    }
  };
  initializeWidgetStates();
}, []);
```

**Change 3: Save state on toggle**
```typescript
// MODIFY toggleWidgetExpanded function
const toggleWidgetExpanded = useCallback((widgetKey: string) => {
  setExpandedWidgets(prev => {
    const newState = {
      ...prev,
      [widgetKey]: !prev[widgetKey],
    };
    saveWidgetStates(newState); // Persist to storage
    return newState;
  });
}, []);
```

**Change 4: Add long-press lock functionality**
```typescript
// ADD new function for long-press lock
const lockWidgetExpanded = useCallback((widgetKey: string) => {
  setExpandedWidgets(prev => {
    const newState = {
      ...prev,
      [widgetKey]: true, // Always expand on lock
    };
    saveWidgetStates(newState);

    // Show visual feedback
    showSuccessToast(`${widgetKey.toUpperCase()} widget locked in expanded mode`);
    return newState;
  });
}, [showSuccessToast]);
```

**Change 5: Update WidgetShell to support long-press**

**File:** `boatingInstrumentsApp/src/components/WidgetShell.tsx`

```typescript
// Lines 19-39 - ADD onLongPress prop
interface WidgetShellProps {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  onLongPress?: () => void; // ADD: Optional long-press handler
  testID?: string;
}

// Lines 50-55 - UPDATE component signature
export const WidgetShell: React.FC<WidgetShellProps> = ({
  children,
  expanded,
  onToggle,
  onLongPress, // ADD
  testID = 'widget-shell',
}) => {

// Lines 113-121 - ADD onLongPress handler
<TouchableOpacity
  style={styles.touchable}
  onPress={handlePress}
  onLongPress={onLongPress} // ADD
  activeOpacity={0.95}
  testID={`${testID}-touchable`}
  accessibilityRole="button"
  accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} widget`}
  accessibilityHint="Double tap to toggle, long press to lock expanded"
>
```

**Change 6: Update widgetMap to include onLongPress**
```typescript
// App.tsx - EXAMPLE for depth widget
depth: () => (
  <WidgetShell
    expanded={expandedWidgets.depth}
    onToggle={() => toggleWidgetExpanded('depth')}
    onLongPress={() => lockWidgetExpanded('depth')} // ADD
    testID="depth-shell"
  >
    <DepthWidget />
  </WidgetShell>
),
// ... repeat for all other widgets
```

### Testing Criteria
- [ ] Tap widget → toggles expanded state
- [ ] Long-press widget → locks in expanded mode (toast confirmation)
- [ ] Expanded state persists after app restart
- [ ] Locked widgets remain expanded across sessions
- [ ] AsyncStorage handles errors gracefully

---

## Issue 4: Drag & Drop Not Functional

### Problem Statement
Story 2.7 (AC 1) requires drag & drop widget repositioning. Current implementation renders widgets in a simple flow layout with no drag capabilities.

### Current Behavior
```typescript
// App.tsx lines 280-286
<View style={styles.widgetsFlow}>
  {selectedWidgets.map(key => (
    <View key={key} style={styles.widgetWrapper}>
      {widgetMap[key] && widgetMap[key]()}
    </View>
  ))}
</View>
```

**Issue:** Widgets rendered in static flow layout, no gesture handlers.

### Expected Behavior
- Long-press widget → enter drag mode (visual feedback)
- Drag widget → repositions with snap-to-grid
- Drop widget → saves new layout position
- Visual grid guidelines during drag

### Technical Solution

This requires significant refactoring. **Recommendation:** Use existing [LayoutManager.tsx](../boatingInstrumentsApp/src/widgets/LayoutManager.tsx) component instead of custom flow layout.

**File:** `boatingInstrumentsApp/src/mobile/App.tsx`

**Option A: Replace flow layout with LayoutManager** (RECOMMENDED)

```typescript
// Lines 280-286 - REPLACE with LayoutManager
<LayoutManager widgets={layoutWidgets} />
```

This component already exists and provides:
- Drag & drop positioning
- Grid-based layout
- Layout persistence
- Multiple layout profiles

**Option B: Add drag handlers to current layout** (MORE WORK)

Requires:
1. Install `react-native-gesture-handler` (if not already installed)
2. Wrap each widget in `PanGestureHandler`
3. Track drag position with Animated values
4. Implement snap-to-grid logic
5. Save final positions to layoutService

**Recommendation:** Use Option A (LayoutManager) as it's already implemented and tested per Story 2.7.

### Testing Criteria
- [ ] Long-press widget → visual feedback (scale down 0.95)
- [ ] Drag widget → smooth movement following finger
- [ ] Grid guidelines visible during drag
- [ ] Snap-to-grid on drop (8pt grid)
- [ ] Layout position persists across sessions

---

## Issue 5: Widget Icons Not Monochromatic

### Problem Statement
Widget icons should be monochromatic and theme-aware. Current implementation in [WidgetCard.tsx:43-48](../boatingInstrumentsApp/src/widgets/WidgetCard.tsx#L43-L48) uses `theme.textSecondary` correctly, but individual widgets may override with hardcoded colors.

### Current Behavior
```typescript
// WidgetCard.tsx lines 43-48 (CORRECT)
<Ionicons
  name={icon}
  size={12}
  color={theme.textSecondary}  // Monochromatic
  style={widgetStyles.widgetIcon}
/>
```

### Expected Behavior
All widget icons should:
- Day theme: `theme.textSecondary` (gray)
- Night theme: `theme.textSecondary` (lighter gray)
- Redlight theme: `theme.textSecondary` (red monochrome)

### Technical Solution

**Audit Required:** Check all widget components for hardcoded icon colors.

**Files to check:**
- `boatingInstrumentsApp/src/widgets/DepthWidget.tsx`
- `boatingInstrumentsApp/src/widgets/SpeedWidget.tsx`
- `boatingInstrumentsApp/src/widgets/WindWidget.tsx`
- `boatingInstrumentsApp/src/widgets/GPSWidget.tsx`
- `boatingInstrumentsApp/src/widgets/CompassWidget.tsx`
- `boatingInstrumentsApp/src/widgets/EngineWidget.tsx`
- `boatingInstrumentsApp/src/widgets/BatteryWidget.tsx`
- `boatingInstrumentsApp/src/widgets/TanksWidget.tsx`
- `boatingInstrumentsApp/src/widgets/AutopilotStatusWidget.tsx`

**Search pattern:**
```bash
grep -r "color.*#[0-9a-fA-F]" boatingInstrumentsApp/src/widgets/*.tsx
grep -r "color.*'green'" boatingInstrumentsApp/src/widgets/*.tsx
grep -r "color.*'blue'" boatingInstrumentsApp/src/widgets/*.tsx
```

**Fix pattern:**
```typescript
// WRONG
<Ionicons name="water" size={24} color="#00ff00" />

// CORRECT
<Ionicons name="water" size={24} color={theme.textSecondary} />
```

### Testing Criteria
- [ ] All widget icons use `theme.textSecondary` color
- [ ] Icons change color when switching themes (Day/Night/Redlight)
- [ ] No hardcoded color values in icon components
- [ ] Icons remain visible in all theme modes

---

## Issue 6: Theme Integration for Redlight Mode

### Problem Statement
The app should support **Day**, **Night**, and **Redlight** themes. Current [widgetStyles.ts](../boatingInstrumentsApp/src/styles/widgetStyles.ts) is theme-aware, but the main app doesn't provide theme switching UI.

### Current Behavior
```typescript
// App.tsx lines 314-317 (Bottom Nav)
<TouchableOpacity style={styles.navButton}>
  <Text style={styles.navButtonIcon}>◐</Text>
  <Text style={styles.navButtonText}>DAY</Text>
</TouchableOpacity>
```

**Issue:** Button renders but doesn't actually switch themes.

### Expected Behavior
- Tap theme button → cycle through Day → Night → Redlight
- Icon updates to reflect current theme
- All widgets update immediately with new theme colors

### Technical Solution

**File:** `boatingInstrumentsApp/src/mobile/App.tsx`

**Change 1: Add theme switching logic**
```typescript
// Add imports
import { useTheme, setTheme } from '../core/themeStore';

// Add state for current theme
const currentTheme = useTheme();
const [themeMode, setThemeMode] = useState<'day' | 'night' | 'redlight'>('day');

// Add theme cycle handler
const cycleTheme = useCallback(() => {
  const nextTheme =
    themeMode === 'day' ? 'night' :
    themeMode === 'night' ? 'redlight' : 'day';

  setThemeMode(nextTheme);
  setTheme(nextTheme); // Update global theme store

  showSuccessToast(`Theme: ${nextTheme.toUpperCase()}`);
}, [themeMode, showSuccessToast]);

// Get theme icon
const getThemeIcon = () => {
  switch (themeMode) {
    case 'day': return '☀️';
    case 'night': return '🌙';
    case 'redlight': return '🔴';
    default: return '◐';
  }
};

const getThemeLabel = () => {
  switch (themeMode) {
    case 'day': return 'DAY';
    case 'night': return 'NIGHT';
    case 'redlight': return 'RED';
    default: return 'DAY';
  }
};
```

**Change 2: Wire up theme button**
```typescript
// Lines 314-317 - REPLACE
<TouchableOpacity
  style={styles.navButton}
  onPress={cycleTheme}  // ADD handler
>
  <Text style={styles.navButtonIcon}>{getThemeIcon()}</Text>
  <Text style={styles.navButtonText}>{getThemeLabel()}</Text>
</TouchableOpacity>
```

**Change 3: Persist theme preference**
```typescript
// Add after WIDGET_STATE_KEY constant
const THEME_PREFERENCE_KEY = 'theme-preference';

// Save theme preference
const saveThemePreference = async (theme: 'day' | 'night' | 'redlight') => {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
};

// Load theme preference on app start
useEffect(() => {
  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
      if (saved && ['day', 'night', 'redlight'].includes(saved)) {
        setThemeMode(saved as 'day' | 'night' | 'redlight');
        setTheme(saved as 'day' | 'night' | 'redlight');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };
  loadThemePreference();
}, []);

// Update cycleTheme to persist
const cycleTheme = useCallback(() => {
  const nextTheme =
    themeMode === 'day' ? 'night' :
    themeMode === 'night' ? 'redlight' : 'day';

  setThemeMode(nextTheme);
  setTheme(nextTheme);
  saveThemePreference(nextTheme); // ADD persistence

  showSuccessToast(`Theme: ${nextTheme.toUpperCase()}`);
}, [themeMode, showSuccessToast]);
```

### Testing Criteria
- [ ] Tap theme button → cycles Day → Night → Redlight → Day
- [ ] Icon and label update to reflect current theme
- [ ] All widgets change colors immediately
- [ ] Theme preference persists across app restarts
- [ ] Redlight mode uses appropriate red monochrome palette

---

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. **Issue 2: Widget Sizing** - Wrap all widgets in WidgetShell
2. **Issue 1: Dashboard Layout** - Fix viewport height calculation
3. **Issue 3: State Persistence** - Add AsyncStorage integration

**Estimated Effort:** 4-6 hours
**Impact:** HIGH - Fixes major UX issues visible in screenshot

### Phase 2: Enhanced Functionality (Next Sprint)
4. **Issue 6: Theme Switching** - Wire up theme button
5. **Issue 5: Icon Audit** - Ensure monochromatic icons
6. **Issue 4: Drag & Drop** - Integrate LayoutManager

**Estimated Effort:** 6-8 hours
**Impact:** MEDIUM - Completes Story 2.7 and 2.12 requirements

---

## Testing Strategy

### Unit Tests Required
- [ ] WidgetShell expansion/collapse animation
- [ ] AsyncStorage persistence (load/save widget states)
- [ ] Theme cycling logic
- [ ] Long-press lock functionality

### Integration Tests Required
- [ ] Full app rendering with all widgets in WidgetShell
- [ ] Theme switching updates all widgets
- [ ] State persistence across app restart (E2E)
- [ ] Drag & drop widget repositioning (if implemented)

### Manual Testing Checklist
- [ ] Dashboard fills screen from header to footer (no whitespace)
- [ ] All widgets render at 180×180pt when collapsed
- [ ] Tap widget → expands to 280pt height with smooth animation
- [ ] Long-press widget → locks expanded state with toast confirmation
- [ ] Restart app → widgets restore expanded/collapsed state
- [ ] Theme button cycles Day → Night → Redlight with visual updates
- [ ] All widget icons are monochromatic and theme-aware
- [ ] Drag & drop positioning works (if LayoutManager integrated)

---

## Related Documentation

- **Story 2.7:** [Dashboard Customization](../stories/story-2.7-dashboard-customization.md)
- **Story 2.12:** [Two-State Widget System](../stories/story-2.12-widget-states.md)
- **UI Architecture:** [Component Standards](./component-standards.md)
- **UI Architecture:** [Design System](./design-system.md)

---

## Approval & Sign-off

**Reviewed By:** ___________________
**Date:** ___________________
**Approved for Implementation:** ☐ Yes  ☐ No (see comments)

**Comments:**
```
[Space for reviewer feedback]
```

---

## Appendix A: Quick Reference - Key Files

| File | Purpose | Changes Required |
|------|---------|------------------|
| [App.tsx](../boatingInstrumentsApp/src/mobile/App.tsx) | Main app component | Wrap widgets in WidgetShell, add state persistence, fix layout |
| [WidgetShell.tsx](../boatingInstrumentsApp/src/components/WidgetShell.tsx) | Widget wrapper | Add onLongPress prop |
| [WidgetCard.tsx](../boatingInstrumentsApp/src/widgets/WidgetCard.tsx) | Widget presentation | No changes (already correct) |
| [widgetStyles.ts](../boatingInstrumentsApp/src/styles/widgetStyles.ts) | Centralized styles | No changes (already theme-aware) |
| [layoutService.ts](../boatingInstrumentsApp/src/services/layoutService.ts) | Layout persistence | Already implemented (use for drag & drop) |

---

## Appendix B: Code Snippets

### Complete WidgetMap with WidgetShell (Copy-Paste Ready)

```typescript
// boatingInstrumentsApp/src/mobile/App.tsx
// Replace lines 100-110 with this complete implementation

const widgetMap: { [key: string]: () => React.ReactNode } = {
  depth: () => (
    <WidgetShell
      expanded={expandedWidgets.depth}
      onToggle={() => toggleWidgetExpanded('depth')}
      onLongPress={() => lockWidgetExpanded('depth')}
      testID="depth-shell"
    >
      <DepthWidget />
    </WidgetShell>
  ),
  speed: () => (
    <WidgetShell
      expanded={expandedWidgets.speed}
      onToggle={() => toggleWidgetExpanded('speed')}
      onLongPress={() => lockWidgetExpanded('speed')}
      testID="speed-shell"
    >
      <SpeedWidget />
    </WidgetShell>
  ),
  wind: () => (
    <WidgetShell
      expanded={expandedWidgets.wind}
      onToggle={() => toggleWidgetExpanded('wind')}
      onLongPress={() => lockWidgetExpanded('wind')}
      testID="wind-shell"
    >
      <WindWidget />
    </WidgetShell>
  ),
  gps: () => (
    <WidgetShell
      expanded={expandedWidgets.gps}
      onToggle={() => toggleWidgetExpanded('gps')}
      onLongPress={() => lockWidgetExpanded('gps')}
      testID="gps-shell"
    >
      <GPSWidget />
    </WidgetShell>
  ),
  compass: () => (
    <WidgetShell
      expanded={expandedWidgets.compass}
      onToggle={() => toggleWidgetExpanded('compass')}
      onLongPress={() => lockWidgetExpanded('compass')}
      testID="compass-shell"
    >
      <CompassWidget />
    </WidgetShell>
  ),
  engine: () => (
    <WidgetShell
      expanded={expandedWidgets.engine}
      onToggle={() => toggleWidgetExpanded('engine')}
      onLongPress={() => lockWidgetExpanded('engine')}
      testID="engine-shell"
    >
      <EngineWidget />
    </WidgetShell>
  ),
  battery: () => (
    <WidgetShell
      expanded={expandedWidgets.battery}
      onToggle={() => toggleWidgetExpanded('battery')}
      onLongPress={() => lockWidgetExpanded('battery')}
      testID="battery-shell"
    >
      <BatteryWidget />
    </WidgetShell>
  ),
  tanks: () => (
    <WidgetShell
      expanded={expandedWidgets.tanks}
      onToggle={() => toggleWidgetExpanded('tanks')}
      onLongPress={() => lockWidgetExpanded('tanks')}
      testID="tanks-shell"
    >
      <TanksWidget />
    </WidgetShell>
  ),
  autopilot: () => (
    <WidgetShell
      expanded={expandedWidgets.autopilot}
      onToggle={() => toggleWidgetExpanded('autopilot')}
      onLongPress={() => lockWidgetExpanded('autopilot')}
      testID="autopilot-shell"
    >
      <AutopilotStatusWidget showControls={true} />
    </WidgetShell>
  ),
};
```

---

**End of Technical Implementation Fix Specification**
