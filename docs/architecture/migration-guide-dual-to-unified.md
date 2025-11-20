# Migration Guide: Dual-System to Unified Presentation Architecture
**Epic 9: Story 9.6 - Settings Integration Modernization**

## Overview

This guide helps developers migrate from the legacy dual-system architecture (Epic 2-8) to the unified presentation system (Epic 9). The dual system maintained both `useUnitConversion` and the new presentation layer, causing complexity and reactivity issues. Epic 9 (Stories 9.1-9.6) unified the architecture.

## Architecture Comparison

### Before: Dual-System Architecture (Epic 2-8)

```
┌─────────────────────────────────────────────────────────────────┐
│ SETTINGS LAYER                                                   │
│  - useUnitConversion (1800 lines)                               │
│  - Unit definitions (depth_meters, speed_knots, etc.)           │
│  - Conversion functions (convert, convertToPreferred)           │
│  - Width calculations (getConsistentWidth)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├───────────────────────────────────────────┐
                 ▼                                           ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│ LEGACY PATH                    │  │ NEW PATH (Incomplete)          │
│  - useUnitConversion in        │  │  - usePresentationStore        │
│    widgets                     │  │  - Presentation definitions    │
│  - Manual conversion calls     │  │  - legacyBridge sync           │
│  - Component width calcs       │  │  - Partial widget migration    │
└────────────┬───────────────────┘  └──────────┬─────────────────────┘
             │                                  │
             └──────────────┬───────────────────┘
                            ▼
                 ❌ CONFLICTS & ISSUES
                 - Dual state sources
                 - Inconsistent reactivity
                 - Bridge sync overhead
                 - Widget behavior varies
```

### After: Unified Architecture (Epic 9)

```
┌─────────────────────────────────────────────────────────────────┐
│ SETTINGS LAYER                                                   │
│  UnitsConfigDialog → usePresentationStore                       │
│  - Single source of truth                                       │
│  - Direct presentation selection                                │
│  - No bridges, no translations                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                               │
│  usePresentationStore (Zustand)                                 │
│  - Reactive state management                                    │
│  - AsyncStorage persistence                                     │
│  - Instant subscriber updates                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ WIDGET LAYER                                                     │
│  useMetricDisplay hook                                          │
│  - Subscribes to presentation store                             │
│  - Returns MetricDisplayData                                    │
│  - FontMeasurementService for layout                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ COMPONENT LAYER                                                  │
│  PrimaryMetricCell, SecondaryMetricCell                         │
│  - Pure presentation components                                 │
│  - No unit system knowledge                                     │
│  - React handles re-renders                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Migration

### Step 1: Migrate Settings Components

**Before:**
```typescript
// ❌ OLD: UnitsConfigDialog using dual system
import { useUnitConversion, UnitDefinition } from '../../hooks/useUnitConversion';

const UnitsConfigDialog = () => {
  const {
    preferences,
    availableUnits,
    setPreferredUnit,
    setPreferredFormat,
  } = useUnitConversion();

  const handleUnitChange = (category: string, unitId: string) => {
    setPreferredUnit(category, unitId);
    
    // Legacy bridge sync to new system
    if (window.legacyBridge) {
      window.legacyBridge.syncUnit(category, unitId);
    }
  };

  return (
    <Modal>
      {availableUnits
        .filter(u => u.category === 'depth')
        .map(unit => (
          <Button key={unit.id} onPress={() => handleUnitChange('depth', unit.id)}>
            {unit.name}
          </Button>
        ))}
    </Modal>
  );
};
```

**After:**
```typescript
// ✅ NEW: UnitsConfigDialog using unified system
import { usePresentationStore } from '../../presentation/presentationStore';
import { PRESENTATIONS, getPresentationConfigLabel } from '../../presentation/presentations';

const UnitsConfigDialog = () => {
  const { setPresentationForCategory } = usePresentationStore();

  const handlePresentationChange = (category: DataCategory, presentationId: string) => {
    // Direct store update - no bridge, no translation
    setPresentationForCategory(category, presentationId);
  };

  const depthPresentations = PRESENTATIONS.depth.presentations;

  return (
    <Modal>
      {depthPresentations.map(presentation => (
        <Button
          key={presentation.id}
          onPress={() => handlePresentationChange('depth', presentation.id)}
        >
          {getPresentationConfigLabel(presentation)}
        </Button>
      ))}
    </Modal>
  );
};
```

**Changes:**
1. Replace `useUnitConversion` with `usePresentationStore`
2. Replace `setPreferredUnit(category, unitId)` with `setPresentationForCategory(category, presentationId)`
3. Remove legacy bridge sync calls
4. Use `PRESENTATIONS[category]` for available options
5. Use `getPresentationConfigLabel()` for display names

### Step 2: Migrate Widget Components

**Before:**
```typescript
// ❌ OLD: SpeedWidget using dual system
import { useUnitConversion } from '../hooks/useUnitConversion';

const SpeedWidget = () => {
  const sogRaw = useNmeaStore(state => state.nmeaData.sensors.speed[0]?.overGround);
  
  const {
    convert,
    convertToPreferred,
    getPreferredUnit,
    formatValue,
  } = useUnitConversion();

  // Manual conversion
  const preferredUnit = getPreferredUnit('speed');
  const sogConverted = convert(sogRaw, 'meters_per_second', preferredUnit?.id);
  const sogFormatted = formatValue(sogConverted, preferredUnit);

  return (
    <View>
      <Text>SOG</Text>
      <Text>{sogFormatted}</Text>
      <Text>{preferredUnit?.symbol}</Text>
    </View>
  );
};
```

**After:**
```typescript
// ✅ NEW: SpeedWidget using unified system
import { useMetricDisplay } from '../hooks/useMetricDisplay';

const SpeedWidget = () => {
  const sogRaw = useNmeaStore(state => state.nmeaData.sensors.speed[0]?.overGround);
  
  // Single hook handles conversion, formatting, layout
  const sogDisplayData = useMetricDisplay('speed', sogRaw, 'SOG');

  return (
    <PrimaryMetricCell 
      data={sogDisplayData}
      state="normal"
    />
  );
};
```

**Changes:**
1. Replace `useUnitConversion` with `useMetricDisplay`
2. Remove manual conversion calls (`convert`, `convertToPreferred`)
3. Remove manual formatting calls (`formatValue`)
4. Pass `MetricDisplayData` to `PrimaryMetricCell` via `data` prop
5. Let hook handle all conversion, formatting, and layout

### Step 3: Migrate Presentation Components

**Before:**
```typescript
// ❌ OLD: PrimaryMetricCell with legacy width calculation
import { useUnitConversion } from '../hooks/useUnitConversion';

interface PrimaryMetricCellProps {
  mnemonic: string;
  value: string | number;
  unit: string;
  category?: string;  // For width calculation
  state?: 'normal' | 'warning' | 'alarm';
}

const PrimaryMetricCell = ({ mnemonic, value, unit, category, state }) => {
  const { getConsistentWidth, getPreferredUnit } = useUnitConversion();
  
  // Component calculates its own width
  const consistentWidth = useMemo(() => {
    if (category) {
      const preferredUnit = getPreferredUnit(category);
      return getConsistentWidth(category, unit, preferredUnit?.id);
    }
    return null;
  }, [category, unit, getConsistentWidth, getPreferredUnit]);

  return (
    <View style={{ minWidth: consistentWidth?.minWidth }}>
      <Text>{mnemonic}</Text>
      <Text>{value}</Text>
      <Text>{unit}</Text>
    </View>
  );
};
```

**After:**
```typescript
// ✅ NEW: PrimaryMetricCell as pure presentation component
import { MetricDisplayData } from '../types/MetricDisplayData';

interface PrimaryMetricCellProps {
  data?: MetricDisplayData;  // Single prop with all info
  state?: 'normal' | 'warning' | 'alarm';
}

const PrimaryMetricCell = ({ data, state }) => {
  const theme = useTheme();
  
  // Extract from pre-formatted data
  const mnemonic = data?.mnemonic ?? '';
  const value = data?.value ?? '';
  const unit = data?.unit ?? '';
  const minWidth = data?.layout?.minWidth;

  return (
    <View style={{ minWidth }}>
      <Text>{mnemonic}</Text>
      <Text>{value}</Text>
      <Text>{unit}</Text>
    </View>
  );
};
```

**Changes:**
1. Remove `useUnitConversion` import
2. Remove `category` prop (no longer needed)
3. Add `data: MetricDisplayData` prop
4. Use `data.layout.minWidth` instead of calculating width
5. Remove manual width calculation logic

### Step 4: Remove Legacy Bridge

**Files to Delete:**
```bash
# Story 9.3 already removed these
rm src/services/legacyBridge.ts
rm src/services/legacyBridge.test.ts
```

**Files to Update:**
```typescript
// Remove bridge imports from any remaining files
// grep -r "legacyBridge" src/
// (Should return 0 results after Story 9.3)
```

### Step 5: Test Reactivity

**Manual Test Script:**
```bash
# Use the provided test script
cd boatingInstrumentsApp
node test-settings-reactivity.js
```

**Expected Results:**
- Settings changes propagate to widgets in <100ms
- No console warnings or errors
- All widgets update simultaneously (no cascading delays)
- Layout remains stable (no jumping)

## Common Migration Issues

### Issue 1: Missing Conversion

**Symptom:**
```
Widget shows raw value (e.g., 10 m/s instead of 19.4 knots)
```

**Cause:**
Widget not using `useMetricDisplay` hook

**Solution:**
```typescript
// ❌ Before
const speedValue = useNmeaStore(state => state.nmeaData.sensors.speed[0]?.overGround);
return <Text>{speedValue}</Text>;  // Raw value

// ✅ After
const speedValue = useNmeaStore(state => state.nmeaData.sensors.speed[0]?.overGround);
const displayData = useMetricDisplay('speed', speedValue, 'SOG');
return <PrimaryMetricCell data={displayData} />;  // Formatted value
```

### Issue 2: Settings Not Persisting

**Symptom:**
```
Unit changes reset after app restart
```

**Cause:**
Zustand persist middleware not configured

**Solution:**
```typescript
// Verify presentationStore.ts has persist middleware
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePresentationStore = create<PresentationStoreState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'presentation-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Issue 3: Widgets Not Updating

**Symptom:**
```
Change units in settings, but widgets don't update
```

**Cause:**
Widget not subscribed to presentation store

**Solution:**
```typescript
// ❌ Before: Static value
const displayData = {
  mnemonic: 'DEPTH',
  value: depthRaw.toString(),
  unit: 'm',
  // ...
};

// ✅ After: Reactive hook
const displayData = useMetricDisplay('depth', depthRaw, 'DEPTH');
// Automatically updates when presentation changes
```

### Issue 4: Layout Jumping

**Symptom:**
```
Widget width changes when value changes (e.g., "9.9" → "10.0")
```

**Cause:**
Not using `FontMeasurementService` minWidth

**Solution:**
```typescript
// ✅ useMetricDisplay automatically includes minWidth from FontMeasurementService
const displayData = useMetricDisplay('depth', depthRaw, 'DEPTH');
// displayData.layout.minWidth prevents jumping

// PrimaryMetricCell applies minWidth automatically
<PrimaryMetricCell data={displayData} />
```

## Epic 9 Story Progression

### Story 9.1: Enhanced Presentation Foundation
- Created `useMetricDisplay` hook
- Defined `MetricDisplayData` interface
- Established presentation definitions
- **Status:** Complete

### Story 9.2: Component Migration
- Migrated `PrimaryMetricCell` and `SecondaryMetricCell`
- Migrated `SpeedWidget` and `WindWidget`
- Validated layout stability
- **Status:** Complete

### Story 9.3: System Cleanup
- Removed `legacyBridge.ts`
- Modernized `UnitsConfigDialog`
- Migrated all widgets except GPS date/time
- **Status:** Complete

### Story 9.4: GPSWidget Migration
- Added coordinate presentations (DD/DDM/DMS/UTM)
- Migrated lat/lon to `useMetricDisplay`
- Preserved date/time in `useUnitConversion` (out of scope)
- **Status:** Complete

### Story 9.5: FontMeasurementService
- Implemented canvas-based measurement
- Added LRU cache (500 entries, <5ms performance)
- Integrated with `useMetricDisplay`
- Theme invalidation on font changes
- **Status:** Complete

### Story 9.6: Settings Integration Modernization (This Story)
- Removed remaining dual-system references
- Validated direct presentation integration
- Confirmed instant reactivity (<100ms)
- Documented architecture for Epic 13.2
- **Status:** In Progress

## Validation Checklist

Use this checklist to verify migration completion:

### Settings Layer
- [ ] No `useUnitConversion` imports in settings components
- [ ] No `legacyBridge` references anywhere
- [ ] `UnitsConfigDialog` uses only `usePresentationStore`
- [ ] `setPresentationForCategory` called directly (no translations)
- [ ] `getPresentationConfigLabel` displays presentation names

### Widget Layer
- [ ] All widgets use `useMetricDisplay` for conversions
- [ ] Widgets pass `MetricDisplayData` to cells via `data` prop
- [ ] No manual conversion calls (`convert`, `convertToPreferred`)
- [ ] No manual formatting calls (`formatValue`)
- [ ] No manual width calculations

### Component Layer
- [ ] `PrimaryMetricCell` removed `useUnitConversion` import
- [ ] `PrimaryMetricCell` removed `category` prop
- [ ] `PrimaryMetricCell` uses `data.layout.minWidth`
- [ ] `SecondaryMetricCell` follows same pattern
- [ ] No components calculate their own consistent width

### Reactivity
- [ ] Settings changes propagate in <100ms
- [ ] No console warnings during unit changes
- [ ] Multiple widgets update simultaneously
- [ ] Layout stable (no jumping)
- [ ] Settings persist across app restarts

### Testing
- [ ] Run `node test-settings-reactivity.js`
- [ ] Run unit tests: `npm test`
- [ ] Manual test: Change depth units → verify widget updates
- [ ] Manual test: Change speed units → verify widget updates
- [ ] Manual test: Apply preset → verify multiple widgets update

## Future Considerations

### Epic 13.2: Unified Settings System

The architecture established in Epic 9 scales to all settings categories:

**Settings Categories:**
- ✅ Unit Preferences (Epic 9)
- 🔜 Theme Settings (Epic 13.2)
- 🔜 Alarm Thresholds (Epic 13.2)
- 🔜 Widget Layout (Epic 13.2)
- 🔜 NMEA Connection (Epic 13.2)

**Pattern for New Settings:**
```typescript
// 1. Create Zustand store
export const useNewSettingsStore = create<NewSettingsState>()(
  persist(
    (set) => ({
      settings: {},
      setSetting: (key, value) => set(state => ({
        settings: { ...state.settings, [key]: value }
      }))
    }),
    { name: 'new-settings' }
  )
);

// 2. Create settings dialog
const NewSettingsDialog = () => {
  const { setSetting } = useNewSettingsStore();
  // Direct store updates, instant reactivity
};

// 3. Widgets react automatically
const SomeWidget = () => {
  const setting = useNewSettingsStore(state => state.settings.someSetting);
  // Re-renders when setting changes
};
```

**No Additional Infrastructure Required:**
- Zustand handles reactivity
- React handles rendering
- AsyncStorage handles persistence
- Epic 9 pattern applies universally

## Questions & Support

**Q: Do I need to migrate all widgets at once?**
A: No. Epic 9.3 already migrated all widgets. This migration guide is for reference when adding new widgets.

**Q: What about date/time formatting?**
A: Date/time formatting remains in `useUnitConversion` per Story 9.4 decision. It's preserved in `GPSWidget` only.

**Q: Can I still use legacy props on `PrimaryMetricCell`?**
A: Yes, backward compatibility maintained via `mnemonic`, `value`, `unit` props. But `data` prop is preferred.

**Q: What if settings don't persist?**
A: Verify Zustand persist middleware configured correctly in `presentationStore.ts`.

**Q: How do I measure reactivity performance?**
A: Use `node test-settings-reactivity.js` or browser DevTools Performance tab.

## Conclusion

Epic 9 (Stories 9.1-9.6) transforms the codebase from dual-system complexity to unified simplicity:

**Before:** 1800-line `useUnitConversion` + partial presentation layer + legacy bridge
**After:** Single `useMetricDisplay` hook + direct `usePresentationStore` + instant reactivity

**Benefits:**
- ✅ Single source of truth
- ✅ Instant settings reactivity (<100ms)
- ✅ Layout stability (FontMeasurementService)
- ✅ Marine precision (format patterns)
- ✅ Simplified architecture
- ✅ Foundation for Epic 13.2

Follow this guide when:
- Adding new widgets
- Creating new settings categories
- Onboarding new developers
- Extending Epic 9 architecture

For questions, refer to:
- [Settings Integration Architecture Guide](./settings-integration-architecture.md)
- [Story 9.6 Documentation](../sprint-artifacts/9-6-settings-integration-modernization.md)
- [Epic 9 Overview](../stories/epic-9-enhanced-presentation-system.md)
