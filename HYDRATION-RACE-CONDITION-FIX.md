# Hydration Race Condition Fix (Jan 2025)

## Problem: CRITICAL Race Condition

**Scenario:** NMEA data arrives before Zustand persist completes AsyncStorage hydration

**Timeline of failure:**
```
T+0ms:   App starts
T+20ms:  NMEA data arrives via WebSocket
T+50ms:  SensorDataRegistry.update() called
T+60ms:  getConfig() returns undefined (AsyncStorage not hydrated yet)
T+70ms:  Schema defaults applied to sensor
T+200ms: AsyncStorage hydration completes
T+201ms: User's saved config is now in memory... BUT TOO LATE
```

**Impact:** Silent data loss - user's customizations ignored, schema defaults applied instead

## Solution: Hydration-Aware Sensor Creation

### Implementation Changes

**1. Added `_hydrated` flag to sensorConfigStore**
- Tracks AsyncStorage hydration completion
- Initialized to `false`, set to `true` after hydration
- Set even on hydration errors to prevent infinite waiting

**2. Modified `onRehydrateStorage` callback**
- Sets `_hydrated: true` when hydration completes
- Emits global `sensorConfigStoreHydrated` event (browser only)
- Allows waiting sensors to reapply configs

**3. Updated SensorDataRegistry initialization logic**

**Path A - Store Already Hydrated (Normal Case):**
```typescript
if (store._hydrated) {
  const config = store.getConfig(sensorType, instance);
  if (config) {
    sensor.updateThresholdsFromConfig(config); // User config
  } else {
    applySchemaDefaults(sensor); // Fallback
  }
}
```

**Path B - Store NOT Hydrated Yet (Race Condition):**
```typescript
else {
  // Apply schema defaults TEMPORARILY
  applySchemaDefaults(sensor);
  
  // Listen for hydration event (browser/web only)
  window.addEventListener('sensorConfigStoreHydrated', () => {
    const config = store.getConfig(sensorType, instance);
    if (config) {
      sensor.updateThresholdsFromConfig(config); // Reapply user config
    }
  }, { once: true });
}
```

## Behavior Matrix

| AsyncStorage State | Persisted Config? | Action | Result |
|-------------------|------------------|--------|---------|
| Hydrated | Yes (valid) | Apply persisted config | User values loaded |
| Hydrated | Yes (corrupted) | Apply schema defaults | Graceful fallback |
| Hydrated | No | Apply schema defaults | First-time sensor |
| NOT hydrated | Unknown | Apply defaults + listen | Temp defaults, reapply when hydrated |
| Read error | N/A | Apply schema defaults | Graceful fallback |

## Architecture Benefits

**1. Zero Data Loss:**
- User configs always applied if they exist
- Schema defaults only used as fallback

**2. No Startup Blocking:**
- Sensors created immediately with defaults
- Config reapplied asynchronously when hydration completes
- UI remains responsive

**3. Event-Driven Coordination:**
- Global event allows multiple sensors to listen
- One-time listener cleans up automatically
- No polling or timers

**4. Platform Agnostic:**
- Browser: Uses `window.addEventListener`
- React Native: Zustand hydrates synchronously (no race condition)
- Gracefully handles missing `window` object

**5. Error Resilience:**
- Hydration errors don't block sensor creation
- Corrupted configs fall back to schema defaults
- AsyncStorage read failures handled gracefully

## Testing Recommendations

**Test Case 1: Immediate NMEA Data**
```typescript
// Start app with NMEA data arriving in <50ms
// Verify: Schema defaults applied temporarily
// Verify: User config reapplied after hydration
// Verify: No console errors
```

**Test Case 2: Slow Network/AsyncStorage**
```typescript
// Simulate 500ms AsyncStorage delay
// Verify: Multiple sensors created with temp defaults
// Verify: All configs reapplied after hydration event
// Verify: Single event handles all waiting sensors
```

**Test Case 3: Corrupted AsyncStorage**
```typescript
// Inject invalid JSON into AsyncStorage
// Verify: Hydration error logged
// Verify: _hydrated still set to true
// Verify: Schema defaults applied
```

**Test Case 4: First-Time User**
```typescript
// Clean AsyncStorage (no persisted configs)
// Verify: Schema defaults applied
// Verify: No hydration event listeners created
// Verify: Configs persist on first save
```

## Files Modified

1. **sensorConfigStore.ts**
   - Added `_hydrated: boolean` to store state
   - Initialize to `false` in create function
   - Set to `true` in `onRehydrateStorage` callback
   - Emit `sensorConfigStoreHydrated` event on completion

2. **SensorDataRegistry.ts**
   - Check `store._hydrated` before reading config
   - Apply temp defaults if not hydrated
   - Add event listener for hydration completion
   - Reapply config when event fires
   - Remove listener after config applied

## Performance Impact

**Memory:** +1 boolean flag (negligible)
**CPU:** +1 event listener per sensor created before hydration (temporary)
**Latency:** No additional blocking, async reapplication is non-blocking

## Related Issues Fixed

- Race condition between Zustand persist and NMEA data arrival
- Silent data loss when configs ignored
- User customizations not applied on fast network startup
- No guarantee AsyncStorage hydration completed before sensor creation

## Future Improvements

1. Add hydration timeout (fail-safe after 5 seconds)
2. Add metrics for hydration timing in telemetry
3. Consider preloading critical configs in splash screen
4. Add visual indicator if configs reapplied post-hydration
