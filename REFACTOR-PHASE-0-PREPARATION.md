# SensorConfigDialog Refactor - Phase 0: Preparation Results

**Date:** January 22, 2026
**Branch:** refactor/unified-sensor-schema

---

## Step 0.1: Public API Impact Analysis

### Consumers Identified

**SensorConfigDialog:**
1. `/src/mobile/App.tsx` (line 39) - Lazy loaded for modal rendering
   - Uses React.lazy(() => import(...))
   - Accesses via `SensorConfigDialog` named export
   - **Impact:** Breaking changes to props will require update here

**useSensorConfigForm:**
1. `/src/components/dialogs/SensorConfigDialog.tsx` (line 64, 139)
   - Primary consumer of the hook
   - Destructures: `{ form, enrichedThresholds, handlers, computed }`
   - **Impact:** Hook will be completely removed, replaced with useFormState

2. `/src/registry/index.ts` (line 37) - Documentation reference only
   - Comments mention the hook for context
   - **Impact:** Documentation needs update

### Stale References (To be deleted)
- `/src/components/dialogs/sensor-config/ConfigFieldRenderer.tsx` (line 4) - Comment reference only
- `/src/components/dialogs/sensor-config/AlarmThresholdSlider.old.tsx` (line 45) - Old file, already marked for deletion

### Breaking Changes Assessment
✅ **SAFE TO REFACTOR** - Only 1 consumer (App.tsx) which uses standard props interface
- No external components depend on useSensorConfigForm
- No props used beyond standard dialog props (visible, onClose)
- Lazy loading pattern unaffected by internal refactor

---

## Step 0.2: Performance Baseline Measurement

### Measurement Strategy

**1. AsyncStorage Writes**
- **Scenario:** Adjust depth threshold slider 20 times in 1 minute
- **Measurement:** Count `AsyncStorage.setItem()` calls in React DevTools Profiler
- **Baseline Target:** Establish writes-per-minute before refactor
- **Expected Post-Refactor:** 70% reduction (batch writes on blur/unmount)

**2. Dialog Mount Time**
- **Scenario:** Open SensorConfigDialog from fresh app launch
- **Measurement:** React Profiler "Commit Time" for first paint
- **Baseline Target:** Time-to-Interactive (all hooks resolved)
- **Expected Post-Refactor:** Faster due to simpler hook dependencies

**3. Re-render Count During Threshold Adjustment**
- **Scenario:** Move depth threshold slider from 10ft → 50ft
- **Measurement:** React DevTools Component Render count
- **Baseline Target:** Number of re-renders for parent + children
- **Expected Post-Refactor:** Fewer re-renders (no React Hook Form watch overhead)

### Manual Test Procedure

```bash
# 1. Start development environment
npm run web

# 2. Open React DevTools Profiler
# Chrome DevTools → Profiler tab → Record

# 3. Execute test scenarios:
#    a) Open SensorConfigDialog (measure mount time)
#    b) Adjust depth threshold 20 times in 1 minute (count AsyncStorage writes)
#    c) Move slider slowly (count re-renders)

# 4. Stop profiling, export results
# React DevTools → Profiler → Export → Save as baseline-pre-refactor.json

# 5. After refactor, repeat and compare
```

**Baseline Results:** *(To be filled during manual testing)*
- AsyncStorage writes/min: `___`
- Dialog mount time: `___ ms`
- Re-renders per slider adjustment: `___`

---

## Step 0.3: AsyncStorage Migration Infrastructure

### Schema Versioning

**Current State:**
- No explicit schema version in sensor config storage
- Risk of incompatible data after refactor

**Solution:**
Add version constant following alarmStore pattern:

```typescript
// In nmeaStore.ts
const SENSOR_CONFIG_SCHEMA_VERSION = 2;

// Version 1: Single-metric (top-level) vs multi-metric (metrics object) split
// Version 2: Unified - always use metrics object
```

### Migration Function

```typescript
function migrateV1ToV2(persistedState: any): any {
  // V1: { name, context, thresholds: { warning, critical } }
  // V2: { name, context, metrics: { depth: { thresholds: { warning, critical } } } }
  
  if (!persistedState.nmeaData?.sensors) {
    return persistedState; // No sensor data to migrate
  }

  const migratedSensors = { ...persistedState.nmeaData.sensors };

  for (const sensorType in migratedSensors) {
    for (const instanceNum in migratedSensors[sensorType]) {
      const instance = migratedSensors[sensorType][instanceNum];
      
      // Check if already V2 format (has metrics object)
      if (instance.metrics) continue;

      // Migrate V1 → V2: Wrap in metrics object
      const sensorConfig = getSensorSchema(sensorType);
      if (!sensorConfig) continue;

      const alarmFields = getAlarmFields(sensorConfig);
      if (alarmFields.length === 1) {
        // Single-metric: Move top-level thresholds → metrics.fieldName
        const fieldName = alarmFields[0].name;
        migratedSensors[sensorType][instanceNum] = {
          ...instance,
          metrics: {
            [fieldName]: {
              thresholds: instance.thresholds || {}
            }
          }
        };
        delete migratedSensors[sensorType][instanceNum].thresholds;
      } else {
        // Multi-metric: Already has metrics object, no migration needed
        // (V1 multi-metric === V2 format)
      }
    }
  }

  return {
    ...persistedState,
    nmeaData: {
      ...persistedState.nmeaData,
      sensors: migratedSensors
    }
  };
}
```

### Integration with nmeaStore

```typescript
// In nmeaStore.ts persist config
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ... store implementation
      }),
      {
        name: 'nmea-storage',
        version: SENSOR_CONFIG_SCHEMA_VERSION, // Add version
        migrate: migrateV1ToV2, // Add migration
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('[nmeaStore] Hydration error:', error);
            // Show toast: "Error loading sensor configurations"
          } else {
            console.log('[nmeaStore] Hydration complete');
            // Show toast if migration occurred
            if (state?._version === SENSOR_CONFIG_SCHEMA_VERSION - 1) {
              // showToast('Sensor configurations upgraded to v2');
            }
          }
        }
      }
    )
  )
);
```

### Migration Timing: App Launch

- Migration runs during nmeaStore hydration (before any component renders)
- Expected delay: 50-200ms for typical configs (<10 sensors)
- Blocking: User sees app shell, sensors populate after migration completes
- Fallback: On migration error, reset to defaults + show toast

### Migration Testing Checklist

- [ ] V1 single-metric (depth) → V2 with metrics.depth
- [ ] V1 multi-metric (battery) → V2 unchanged (already correct)
- [ ] Missing thresholds → V2 with empty metrics
- [ ] Corrupted data → Fallback to defaults
- [ ] Large configs (10+ sensors) → Migration completes <200ms

---

## Step 0.4: Platform Test Matrix

### Manual Test Checklist (Post-Refactor Validation)

**Primary Platforms (Must Pass):**
- [ ] **Web - Chrome** (Development platform)
  - [ ] Dialog opens, all controls interactive
  - [ ] Threshold slider adjusts smoothly
  - [ ] Save persists to AsyncStorage
  - [ ] Instance switching works
  - [ ] Metric selector (multi-metric) works

- [ ] **Web - Safari** (Secondary browser)
  - [ ] All Chrome tests pass
  - [ ] No Safari-specific rendering issues

- [ ] **iOS - iPhone** (Primary mobile)
  - [ ] Touch targets meet 44px minimum
  - [ ] Slider adjustable with touch
  - [ ] Keyboard dismisses properly
  - [ ] Haptics work on value change
  - [ ] No performance jank

- [ ] **Android - Phone** (Secondary mobile)
  - [ ] Touch targets meet 48dp minimum
  - [ ] Slider adjustable with touch
  - [ ] Keyboard dismisses properly
  - [ ] Material Design elevation correct
  - [ ] No performance jank

**Secondary Platforms (Regression Check Only):**
- [ ] **iOS - iPad** (Landscape + portrait layouts)
- [ ] **Android - Tablet** (Landscape + portrait layouts)
- [ ] **tvOS** (Focus navigation, 60px touch targets)
- [ ] **Android TV** (Focus navigation, 48dp touch targets)
- [ ] **macOS - Desktop** (Keyboard shortcuts, mouse hover)
- [ ] **Windows - Desktop** (Keyboard shortcuts, mouse hover)

### Test Scenarios (All Platforms)

**Scenario 1: Basic Configuration**
1. Open SensorConfigDialog
2. Change sensor name
3. Adjust warning threshold
4. Adjust critical threshold
5. Save and close
6. Reopen → Verify changes persisted

**Scenario 2: Multi-Metric Selector**
1. Open dialog for battery (multi-metric)
2. Select "Voltage" metric
3. Adjust thresholds
4. Switch to "Current" metric
5. Adjust thresholds
6. Save → Verify both metrics persisted

**Scenario 3: Instance Switching**
1. Open dialog for engine (2 instances)
2. Configure Engine 0
3. Switch to Engine 1 tab
4. Configure Engine 1
5. Save → Verify both instances configured

**Scenario 4: Edge Cases**
1. Empty sensor name (should use default)
2. Warning > Critical (should show validation error)
3. Invalid threshold values (NaN/Infinity)
4. Rapid slider adjustments (no crashes)
5. Close without save (should discard changes)

**Scenario 5: Error Recovery**
1. Disconnect network (AsyncStorage failure simulation)
2. Try to save → Should show error toast
3. Reconnect → Retry save should work

### Test Result Template

```
Platform: ___________
Date: ___________
Tester: ___________

Scenario 1 (Basic): ☐ Pass ☐ Fail - Notes: __________
Scenario 2 (Multi-Metric): ☐ Pass ☐ Fail - Notes: __________
Scenario 3 (Instance): ☐ Pass ☐ Fail - Notes: __________
Scenario 4 (Edge Cases): ☐ Pass ☐ Fail - Notes: __________
Scenario 5 (Error Recovery): ☐ Pass ☐ Fail - Notes: __________

Overall: ☐ PASS ☐ FAIL ☐ NEEDS REVIEW
```

---

## Next Steps

1. ✅ **Complete Performance Baseline** (manual testing)
2. ✅ **Implement AsyncStorage Migration** (nmeaStore.ts changes)
3. ✅ **Begin Phase 1: Data Structure Unification**

---

## Dependencies & Blockers

**None identified** - Ready to proceed with Phase 1 implementation.

**Risk Assessment:**
- ✅ Public API impact: Minimal (1 consumer, standard props)
- ✅ Migration strategy: Proven pattern from alarmStore
- ✅ Testing approach: Manual but comprehensive
- ✅ Performance targets: Measurable and realistic

**Estimated Phase 0 Time:** 2-3 hours (migration implementation + baseline measurement)
