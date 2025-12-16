# SensorConfigDialog - Critical Architectural Review

**Date:** December 16, 2025  
**Component:** `SensorConfigDialog.tsx` (1360 lines)  
**Status:** 🚨 CRITICAL - Structural issues causing recurring save/load failures

---

## Executive Summary

The SensorConfigDialog has **fundamental architectural problems** that cannot be fixed with incremental patches. We've been addressing symptoms (hooks firing too early, state not persisting, toggles closing) but the root cause is a **fragmented state management architecture** with multiple sources of truth and unclear data flow.

### Core Issues Identified

1. **Dual Store Architecture with No Clear Owner**
2. **Reactive Subscription Anti-Pattern**
3. **Complex Initialization Dependencies**
4. **Race Conditions in Instance/Metric Switching**
5. **Presentation System Overcomplexity**

---

## 1. CRITICAL: Dual Store Architecture

### Problem Statement

The component writes to **TWO stores** but neither is the authoritative source of truth:

```typescript
// handleSave writes to BOTH stores
setConfig(selectedSensorType, selectedInstance, updates);           // AsyncStorage
updateSensorThresholds(selectedSensorType, selectedInstance, updates); // Runtime NMEA
```

**Storage Model:**
- **sensorConfigStore**: AsyncStorage-backed, indexed by `"${sensorType}:${instance}"`
- **nmeaStore**: In-memory, nested structure `nmeaData.sensors[sensorType][instance].thresholds`

### The Fundamental Flaw

```typescript
// Reading - tries to merge from both sources
const currentThresholds = useMemo(() => {
  // storedConfig comes from sensorConfigStore (AsyncStorage)
  // getSensorThresholds() reads from nmeaStore (runtime)
  return storedConfig || getSensorThresholds(...) || { enabled: false };
}, [storedConfig, getSensorThresholds, ...]);
```

**Why This Fails:**

1. **Write Order Uncertainty**: Which store updates first? Are they atomic?
2. **Read Inconsistency**: `storedConfig` might have new data, but `getSensorThresholds()` has stale data
3. **Reactivity Mismatch**: zustand subscriptions fire at different times
4. **Merge Strategy Undefined**: What happens when stores have conflicting data?

### Evidence of Failure

- Issue #13: Alarm activation not saved → stores out of sync
- Issue #14: Alarm state not retrieved → wrong store being read
- Issue #11: Form not updating on instance switch → reading from stale store

### Severity

🔴 **CRITICAL** - This is the root cause of 90% of reported issues.

---

## 2. CRITICAL: Reactive Subscription Anti-Pattern

### Problem Statement

Added a reactive Zustand subscription to force component re-renders:

```typescript
// Lines 245-250 - Added to fix Issue #14
const storedConfig = useSensorConfigStore((state) => {
  if (!selectedSensorType || selectedInstance === undefined) return undefined;
  const sensorConfigs = state.configs[selectedSensorType] as any;
  return sensorConfigs?.[selectedInstance];
});
```

**Why This Is An Anti-Pattern:**

1. **Bypasses Single Source of Truth**: Now reading from store directly AND via `getSensorThresholds()`
2. **Type Safety Violations**: Uses `as any` to bypass TypeScript (line 248)
3. **Selector Complexity**: Conditional logic inside selector (lines 247-248)
4. **Performance Risk**: Re-renders on ANY config change, not just relevant instance
5. **Symptom Fix**: Added because merge logic in `currentThresholds` was broken

### The Real Problem It's Hiding

The reason we needed this subscription is because **the initialization order is wrong**:

```typescript
// initialFormData depends on currentThresholds
const initialFormData = useMemo(() => {
  return {
    enabled: currentThresholds.enabled || false,  // Reading from store
    // ...
  };
}, [currentThresholds, ...]);

// But currentThresholds depends on initialFormData.selectedMetric
const currentThresholds = useMemo(() => {
  // Which store? Which data is authoritative?
  return storedConfig || getSensorThresholds(...) || { enabled: false };
}, [...]);
```

**Circular Dependency Detected**: initialFormData → currentThresholds → selectedMetric → initialFormData

### Severity

🔴 **CRITICAL** - Indicates fundamental architectural confusion about data flow.

---

## 3. MAJOR: Complex Initialization Dependencies

### Problem Statement

Component initialization requires **8 interdependent memoized values** in specific order:

```typescript
// Step 1: Get sensor types (depends on rawSensorData)
const availableSensorTypes = useMemo(...);

// Step 2: Select sensor (useState)
const [selectedSensorType, setSelectedSensorType] = useState(...);

// Step 3: Subscribe to config store (depends on selectedSensorType)
const storedConfig = useSensorConfigStore((state) => ...);

// Step 4: Get instances (depends on selectedSensorType)
const instances = useMemo(...);

// Step 5: Select instance (useState)
const [selectedInstance, setSelectedInstance] = useState(0);

// Step 6: Get alarm config (depends on selectedSensorType)
const alarmConfig = selectedSensorType ? SENSOR_ALARM_CONFIG[...] : null;

// Step 7: Get thresholds (depends on selectedSensorType, selectedInstance, storedConfig)
const currentThresholds = useMemo(...);

// Step 8: Initialize form (depends on currentThresholds, alarmConfig)
const initialFormData = useMemo(...);
```

**Initialization Order Issues:**

- **Hook Ordering Bug**: Just fixed - `storedConfig` used state before it was declared (Issue #15)
- **Race Conditions**: `selectedInstance` can change before `instances` updates
- **Stale Closures**: Memoized values capture old state when dependencies update

### Evidence

```typescript
// Lines 268-273 - Band-aid fix for initialization race
useEffect(() => {
  if (instances.length > 0 && !instances.find(i => i.instance === selectedInstance)) {
    setSelectedInstance(instances[0].instance);
  }
}, [instances, selectedInstance]);
```

Why do we need this? Because `selectedInstance` can become invalid before `instances` updates.

### Severity

🟠 **MAJOR** - Causes unpredictable behavior during initialization and sensor switching.

---

## 4. MAJOR: Race Conditions in Instance/Metric Switching

### Problem Statement

Instance and metric switching involves **4 async operations** with manual coordination:

```typescript
const handleInstanceSwitch = useCallback(async (newInstance: number) => {
  await saveNow();                                    // 1. Save current form
  await new Promise(resolve => setTimeout(resolve, 50)); // 2. Wait for propagation
  setSelectedInstance(newInstance);                    // 3. Update state
  // (useEffect will fire and reload form)              // 4. Reload happens later
}, [saveNow]);
```

**Race Condition Vectors:**

1. **Save Propagation**: 50ms delay is arbitrary - what if store takes longer?
2. **State Update Ordering**: `setSelectedInstance()` triggers multiple useEffects
3. **Form Reload Timing**: Depends on `prevInstanceRef` to prevent loops (lines 456-470)
4. **Store Sync**: Two stores update independently - which completes first?

### Band-Aid Fixes Applied

```typescript
// Lines 454-455 - Prevent reload loops
const prevInstanceRef = React.useRef<number | undefined>(undefined);
const prevMetricRef = React.useRef<string | undefined>(undefined);

// Lines 461-470 - Only reload when instance ACTUALLY changes
useEffect(() => {
  if (selectedInstance !== prevInstanceRef.current) {
    prevInstanceRef.current = selectedInstance;
    updateFields({...}); // Reload entire form
  }
}, [selectedInstance, ...]);
```

**Why These Are Band-Aids:**

- **Manual State Tracking**: Using refs to manually track what React should handle
- **Symptom Treatment**: Preventing loops instead of fixing root cause (why do loops happen?)
- **Fragile**: Any new useEffect watching these states can break the logic

### Severity

🟠 **MAJOR** - Causes data loss, form not updating, and unpredictable state during switching.

---

## 5. MODERATE: Presentation System Overcomplexity

### Problem Statement

Multi-metric sensors require **pre-calling 6 presentation hooks** to avoid conditional hook violations:

```typescript
// Lines 276-281 - ALL hooks MUST be called unconditionally
const voltagePresentation = useDataPresentation('voltage');
const temperaturePresentation = useDataPresentation('temperature');
const currentPresentation = useDataPresentation('current');
const pressurePresentation = useDataPresentation('pressure');
const rpmPresentation = useDataPresentation('rpm');
const speedPresentation = useDataPresentation('speed');

// Lines 555-574 - Then select the right one in a memo
const metricPresentation = useMemo(() => {
  const categoryPresentationMap: Partial<Record<DataCategory, any>> = {
    voltage: voltagePresentation,
    temperature: temperaturePresentation,
    // ...
  };
  return categoryPresentationMap[metricInfo.category] || presentation;
}, [requiresMetricSelection, ...]);
```

**Problems:**

1. **Performance**: Always calling 6 hooks even if only 1 is needed
2. **Maintenance**: Adding new metric category requires updating 3 places
3. **Type Safety**: `Partial<Record<...>>` and `any` type (line 566)
4. **Duplication**: Same map exists in `getMetricPresentation()` helper (lines 170-182)

### Why This Exists

React Rules of Hooks forbid conditional hook calls. But this indicates the presentation system wasn't designed for this use case.

### Severity

🟡 **MODERATE** - Degrades performance and maintainability, but not causing data corruption.

---

## Root Cause Analysis

### The Central Problem

**There is no single source of truth for sensor configuration.**

The component tries to be clever by:
1. Writing to two stores for "reliability"
2. Reading from two stores and merging
3. Adding reactive subscriptions when reads fail
4. Using refs to prevent re-render loops
5. Adding delays to wait for store propagation

**All of these are symptoms of architectural confusion.**

### Design Principles Violated

1. **Single Source of Truth**: Data should have ONE authoritative location
2. **Unidirectional Data Flow**: Data should flow one direction (store → component)
3. **Separation of Concerns**: Component should not manage store synchronization
4. **Idempotency**: Same operation repeated should produce same result
5. **Declarative Over Imperative**: React is declarative, but this component is imperative

---

## Recommended Architecture (Proposed)

### 1. Single Store Pattern

**Decision**: Make `sensorConfigStore` the **ONLY** source of truth for configuration.

```typescript
// ❌ OLD: Dual writes
setConfig(sensorType, instance, updates);           // AsyncStorage
updateSensorThresholds(sensorType, instance, updates); // Runtime

// ✅ NEW: Single write
setConfig(sensorType, instance, updates);           // AsyncStorage only

// NMEA store reads from config store when needed
```

**Benefits:**
- Eliminates sync issues
- Clear ownership: AsyncStorage = persistence, NMEA = runtime computation
- Zustand subscriptions work correctly
- No merge logic needed

### 2. Simplified Data Flow

```
┌────────────────────────────────────────────────────────────┐
│ User Action (toggle alarm, change threshold)              │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ Form State (useFormState with debounce)                   │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼ onSave callback
┌────────────────────────────────────────────────────────────┐
│ sensorConfigStore (AsyncStorage) - SOURCE OF TRUTH         │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼ Zustand subscription
┌────────────────────────────────────────────────────────────┐
│ Component Re-renders with new data                         │
└────────────────────────────────────────────────────────────┘
```

**No More:**
- Manual store synchronization
- Merge logic in currentThresholds
- Reactive subscriptions to force updates
- Race condition delays
- prevInstanceRef band-aids

### 3. Refactored State Management

```typescript
export const SensorConfigDialog: React.FC<Props> = ({ visible, onClose, sensorType }) => {
  // STAGE 1: Configuration (single source of truth)
  const [selectedSensorType, setSelectedSensorType] = useState(sensorType || null);
  const [selectedInstance, setSelectedInstance] = useState(0);
  
  // STAGE 2: Data fetching (single store read)
  const sensorConfig = useSensorConfigStore(
    (state) => state.getConfig(selectedSensorType, selectedInstance)
  );
  
  // STAGE 3: Form initialization (simple, no merging)
  const initialFormData = useMemo(() => ({
    enabled: sensorConfig?.enabled || false,
    // ... rest of fields directly from sensorConfig
  }), [sensorConfig]);
  
  // STAGE 4: Form management (unchanged)
  const { formData, updateField, saveNow } = useFormState(initialFormData, {
    onSave: (data) => setConfig(selectedSensorType, selectedInstance, data),
  });
  
  // STAGE 5: Instance switching (simple, synchronous)
  const handleInstanceSwitch = (newInstance: number) => {
    saveNow(); // Synchronous, no await needed
    setSelectedInstance(newInstance);
    // Form auto-reloads via initialFormData dependency
  };
  
  // No prevInstanceRef needed
  // No prevMetricRef needed
  // No storedConfig subscription needed
  // No currentThresholds merge logic needed
}
```

### 4. Store Refactoring

**sensorConfigStore** (source of truth):
```typescript
interface SensorConfigState {
  configs: Record<string, SensorConfig>; // Key: "battery:0", "engine:1"
  
  // Simple getters/setters
  getConfig: (type: SensorType, instance: number) => SensorConfig | undefined;
  setConfig: (type: SensorType, instance: number, config: Partial<SensorConfig>) => void;
  
  // No complex merge logic
  // No async operations in setters
}
```

**nmeaStore** (runtime only):
```typescript
// Reads config from sensorConfigStore when evaluating alarms
function evaluateAlarms(sensors: SensorData): Alarm[] {
  const batteryConfig = useSensorConfigStore.getState().getConfig('battery', 0);
  
  if (batteryConfig?.enabled && sensors.battery[0].voltage < batteryConfig.critical) {
    return [{ message: 'Critical battery voltage', ... }];
  }
}
```

**Clear Separation:**
- `sensorConfigStore`: User preferences, thresholds, names (persisted)
- `nmeaStore`: Live sensor data, computed alarms (ephemeral)

### 5. Presentation System Simplification

**Problem**: Pre-calling 6 hooks is wasteful.

**Solution**: Make `useDataPresentation` accept dynamic category:

```typescript
// ❌ OLD: Pre-call all hooks
const voltagePresentation = useDataPresentation('voltage');
const tempPresentation = useDataPresentation('temperature');
// ... 4 more

// ✅ NEW: Single hook with dynamic category
const metricCategory = alarmConfig?.metrics?.find(m => m.key === formData.selectedMetric)?.category;
const presentation = useDataPresentation(metricCategory || category);
```

**Implementation**: Refactor `useDataPresentation` to use `useMemo` internally instead of being a hook that must be pre-called.

---

## Migration Plan

### Phase 1: Store Consolidation (2-3 hours)

**Tasks:**
1. Update `sensorConfigStore` structure to use simple key format: `"${type}:${instance}"`
2. Add Zustand selector helpers: `getConfig(type, instance)`
3. Remove dual-write pattern from `handleSave` - write only to `sensorConfigStore`
4. Update `nmeaStore.evaluateAlarms()` to read from `sensorConfigStore`
5. Test: Verify alarms still trigger correctly from config store

**Success Criteria:**
- [ ] Only `setConfig()` called in handleSave
- [ ] No calls to `updateSensorThresholds()`
- [ ] Alarm evaluation reads from config store
- [ ] All existing tests pass

### Phase 2: Component Simplification (3-4 hours)

**Tasks:**
1. Remove `storedConfig` reactive subscription (lines 245-250)
2. Simplify `currentThresholds` to read directly from store via selector
3. Remove `prevInstanceRef` and associated useEffect (lines 454-470)
4. Remove `prevMetricRef` and associated useEffect (lines 482-543)
5. Simplify `handleInstanceSwitch` - remove async/await and delays
6. Simplify `handleMetricChange` - remove async/await and delays
7. Update `initialFormData` to depend only on config store data

**Success Criteria:**
- [ ] No ref-based state tracking
- [ ] No setTimeout delays
- [ ] All useEffects have clear, single purpose
- [ ] Instance switching updates form immediately
- [ ] Metric switching updates thresholds immediately

### Phase 3: Presentation System Refactor (2-3 hours)

**Tasks:**
1. Refactor `useDataPresentation` to accept dynamic category
2. Remove pre-called presentation hooks (lines 276-281)
3. Simplify `metricPresentation` useMemo
4. Remove `getMetricPresentation` helper (now unnecessary)
5. Update `handleSave` to use single presentation

**Success Criteria:**
- [ ] Only 1 presentation hook called per render
- [ ] No `categoryPresentationMap` needed
- [ ] Type safety maintained (no `as any`)
- [ ] Conversions still work for all sensor types

### Phase 4: Testing & Validation (2-3 hours)

**Test Scenarios:**
1. [ ] Enable alarm on Battery 1, switch to Battery 2, switch back → alarm still enabled
2. [ ] Change threshold on Battery 1, switch to Battery 2 → Battery 2 has different threshold
3. [ ] Multi-metric sensor: Switch between voltage/current/SOC → thresholds load correctly
4. [ ] Close dialog with unsaved changes → changes persist
5. [ ] Switch sensor types (Battery → Engine) → correct instances shown
6. [ ] Disable alarm on critical sensor → confirmation dialog appears
7. [ ] Invalid threshold entry → validation error shown
8. [ ] Rapid instance switching → no race conditions, no data loss

**Performance Testing:**
1. [ ] Measure render count on instance switch (should be ≤2)
2. [ ] Measure save latency (should be <50ms)
3. [ ] Verify no memory leaks from subscriptions

---

## Risk Assessment

### High Risk Items

1. **Store Migration Breaking Changes**
   - **Risk**: Existing saved configs in AsyncStorage won't load
   - **Mitigation**: Add migration logic in `sensorConfigStore` to convert old format to new
   - **Rollback**: Keep old store implementation in backup file

2. **Alarm Evaluation Changes**
   - **Risk**: Alarms stop triggering if config store read fails
   - **Mitigation**: Add extensive logging, fallback to defaults if config missing
   - **Rollback**: Temporarily read from both stores during migration

### Medium Risk Items

3. **useDataPresentation Refactor**
   - **Risk**: Breaking existing widgets that use presentation system
   - **Mitigation**: Make change backward-compatible with wrapper function
   - **Rollback**: Presentation system is isolated, can be reverted independently

### Low Risk Items

4. **Component Simplification**
   - **Risk**: Minor behavior changes users might notice
   - **Mitigation**: Comprehensive testing before deployment
   - **Impact**: Positive - component will be more predictable

---

## Estimated Effort

- **Phase 1 (Store)**: 3 hours
- **Phase 2 (Component)**: 4 hours
- **Phase 3 (Presentation)**: 3 hours
- **Phase 4 (Testing)**: 3 hours
- **Buffer**: 2 hours

**Total**: 15 hours (~2 days)

---

## Alternative: Quick Fix (Not Recommended)

If full refactoring is not feasible, a minimal band-aid approach:

### Option B: Patch Current Implementation

**Changes:**
1. Make `sensorConfigStore` the read source, `nmeaStore` write-only for alarms
2. Keep reactive subscription but add proper TypeScript types
3. Add comprehensive error boundaries
4. Add detailed logging for debugging

**Pros:**
- Faster: ~2 hours
- Less risky

**Cons:**
- Doesn't fix root issues
- Will continue to have bugs
- Technical debt compounds
- Next developer will curse us

**Recommendation**: ❌ **DO NOT PURSUE** - This is how we got here in the first place.

---

## Decision Request

**Question for stakeholder:**

Do you want to:

**A) Full Refactoring** (Recommended)
- Fix root architectural issues
- Cleaner, more maintainable code
- Eliminates recurring bugs
- **Time:** ~15 hours (2 days)
- **Risk:** Medium (but managed with rollback plan)

**B) Continue with Band-Aids**
- Keep patching symptoms as they appear
- Code becomes increasingly fragile
- Accumulating technical debt
- **Time:** Unknown (each new issue takes 1-2 hours)
- **Risk:** High (unpredictable when next issue appears)

**C) Hybrid Approach**
- Phase 1 (Store) + Phase 2 (Component) only
- Skip presentation refactor for now
- Gets most benefits with less risk
- **Time:** ~7 hours (1 day)
- **Risk:** Low

---

## My Recommendation

🎯 **Option C: Hybrid Approach**

**Reasoning:**
1. Fixes the core issue (dual store architecture)
2. Simplifies component without risky presentation changes
3. Can validate with real usage before Phase 3
4. If Phase 1+2 work well, Phase 3 can wait
5. Reasonable time investment with high value

**Next Steps if Approved:**
1. Create feature branch: `refactor/sensor-config-single-store`
2. Implement Phase 1 (Store consolidation)
3. Commit + test
4. Implement Phase 2 (Component simplification)
5. Commit + test
6. Merge to main if all tests pass
7. Monitor for issues
8. Schedule Phase 3 if needed

---

## Questions?

Please let me know which approach you'd like to proceed with, and I can provide more detailed implementation plans for any phase.
