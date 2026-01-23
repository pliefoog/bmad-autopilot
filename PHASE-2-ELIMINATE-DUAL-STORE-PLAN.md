# Phase 2: Eliminate Dual-Store Pattern

**Goal:** Consolidate `sensorConfigStore` into `nmeaStore`, creating single source of truth for all sensor data and configuration.

**Status:** Planning - Architecture Design

## Current Architecture Analysis

### Two Separate Stores

**sensorConfigStore (AsyncStorage):**
- Purpose: Persistent sensor configuration storage
- Responsibility: User customizations (names, thresholds, contexts)
- Persistence: Zustand persist middleware → AsyncStorage
- Size: 492 lines
- Schema Version: 4 (unified metrics)

**nmeaStore (Volatile):**
- Purpose: Real-time NMEA data + UI state
- Responsibility: Connection status, alarms, message metadata
- Persistence: None (in-memory only)
- Size: 359 lines
- Delegates thresholds to SensorInstance via sensorRegistry

### Current Data Flow

```
┌─────────────────────────────┐
│   sensorConfigStore         │
│   (AsyncStorage Backed)     │
│                             │
│   configs: {                │
│     "depth:0": {            │
│       name: "...",          │
│       metrics: {            │
│         depth: { thresholds }│
│       }                     │
│     }                       │
│   }                         │
└──────────────┬──────────────┘
               │
               │ getConfig()
               │
               ▼
┌──────────────────────────────┐     ┌───────────────────────┐
│   SensorDataRegistry         │◄────│   nmeaStore           │
│   (Map<string, SensorInstance>)│     │   (Volatile UI State) │
│                              │     │                       │
│   get('depth', 0)            │     │   connectionStatus    │
│     → SensorInstance         │     │   alarms              │
│       .updateThresholdsFromConfig()│     │   messageCount        │
│       ._thresholds Map       │     └───────────────────────┘
└──────────────────────────────┘
```

**Problem:** Configuration lives in separate store, requires:
1. Manual synchronization during app init
2. Dual read patterns (config from sensorConfigStore, data from nmeaStore)
3. Complex hydration race condition handling
4. Two subscription patterns for UI updates

### Dependencies Analysis

**Files importing sensorConfigStore (5 locations):**

1. **SensorConfigDialog.tsx** (Line 38, 147)
   - Usage: `useSensorConfigStore.getState().setConfig()`
   - Purpose: Save button writes configuration

2. **SensorInstance.ts** (Line 48)
   - Usage: `useSensorConfigStore.getState().getConfig()`
   - Purpose: Read persisted config during initialization

3. **ThresholdPresentationService.ts** (Line 56)
   - Usage: `useSensorConfigStore.getState().getConfig()`
   - Purpose: Enrich thresholds for dialog display

4. **useSensorConfigForm.ts** (Line 29)
   - Usage: Hook state for form management
   - Purpose: Load initial values, track saved config

5. **TemplatedWidget.tsx** (Line 24)
   - Usage: `useSensorConfigStore()`
   - Purpose: Subscribe to config changes for custom names

## Proposed Unified Architecture

### Single Store Design

```typescript
// nmeaStore.ts - Unified Store v5.0

interface SensorConfigMap {
  [key: string]: StoredSensorConfig; // Format: "depth:0" → config
}

interface NmeaStore {
  // Existing volatile state
  connectionStatus: ConnectionStatus;
  alarms: Alarm[];
  messageCount: number;
  
  // NEW: Persistent sensor configuration
  sensorConfigs: SensorConfigMap;
  configVersion: number; // For migrations (start at 4)
  
  // NEW: Configuration management
  getSensorConfig: (type: SensorType, instance: number) => StoredSensorConfig | undefined;
  setSensorConfig: (type: SensorType, instance: number, config: Partial<SensorConfiguration>) => void;
  deleteSensorConfig: (type: SensorType, instance: number) => void;
  
  // Existing methods (unchanged)
  setConnectionStatus: (status: ConnectionStatus) => void;
  updateAlarms: (alarms: Alarm[]) => void;
  // ... others
}
```

### Persistence Strategy

**Use Zustand persist middleware on nmeaStore:**

```typescript
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ... store implementation
      }),
      {
        name: 'nmea-storage', // AsyncStorage key
        storage: createJSONStorage(() => AsyncStorage),
        version: 4, // Schema version (aligned with Phase 1)
        
        // Partial persistence: only persist sensorConfigs
        partialize: (state) => ({
          sensorConfigs: state.sensorConfigs,
          configVersion: state.configVersion,
        }),
        
        // Migration from sensorConfigStore format
        migrate: async (persistedState, version) => {
          // Handle version upgrades if needed
          return persistedState;
        },
      },
    ),
    { name: 'NmeaStore' },
  ),
);
```

**Key Design Decision: Partial Persistence**

Only `sensorConfigs` persists to AsyncStorage. Volatile state (connectionStatus, alarms, messageCount) remains in-memory only.

This matches current behavior:
- sensorConfigStore → persistent
- nmeaStore → volatile (except new sensorConfigs field)

### Data Flow After Consolidation

```
┌─────────────────────────────────────────┐
│   nmeaStore (Unified)                   │
│                                         │
│   Volatile State:                       │
│     connectionStatus, alarms, messages  │
│                                         │
│   Persistent State (AsyncStorage):      │
│     sensorConfigs: {                    │
│       "depth:0": { name, metrics },     │
│       "battery:0": { name, metrics }    │
│     }                                   │
│     configVersion: 4                    │
└────────────────┬────────────────────────┘
                 │
                 │ getSensorConfig()
                 │
                 ▼
┌──────────────────────────────────┐
│   SensorDataRegistry             │
│   (Map<string, SensorInstance>)  │
│                                  │
│   get('depth', 0)                │
│     → SensorInstance             │
│       .updateThresholdsFromConfig()│
│       ._thresholds Map           │
└──────────────────────────────────┘
```

**Benefits:**
1. Single subscription point for UI
2. No hydration race conditions (Zustand handles it)
3. Simpler initialization (one store to hydrate)
4. Unified DevTools view (config + data in same store)

## Migration Strategy

### Step 1: Add Config Fields to nmeaStore

```typescript
// Add to NmeaStore interface
sensorConfigs: SensorConfigMap;
configVersion: number;
getSensorConfig: (type: SensorType, instance: number) => StoredSensorConfig | undefined;
setSensorConfig: (type: SensorType, instance: number, config: Partial<SensorConfiguration>) => void;
deleteSensorConfig: (type: SensorType, instance: number) => void;
```

### Step 2: Implement Persist Middleware

```typescript
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    persist(
      // ... store implementation,
      {
        name: 'nmea-storage',
        storage: createJSONStorage(() => AsyncStorage),
        version: 4,
        partialize: (state) => ({
          sensorConfigs: state.sensorConfigs,
          configVersion: state.configVersion,
        }),
      },
    ),
    { name: 'NmeaStore' },
  ),
);
```

### Step 3: Data Migration from sensorConfigStore

**One-time migration on first app launch after upgrade:**

```typescript
// Add to nmeaStore initialization
const migrateFromSensorConfigStore = async () => {
  try {
    // Read old AsyncStorage key
    const oldData = await AsyncStorage.getItem('sensor-configs');
    if (!oldData) return; // No old data to migrate
    
    const parsed = JSON.parse(oldData);
    const oldConfigs = parsed?.state?.configs;
    if (!oldConfigs) return;
    
    // Write to new store format
    useNmeaStore.setState({
      sensorConfigs: oldConfigs,
      configVersion: parsed?.state?.version || 4,
    });
    
    // Delete old key (optional - keep for safety during beta)
    // await AsyncStorage.removeItem('sensor-configs');
    
    log.app('[Migration] Migrated configs from sensorConfigStore', () => ({
      configCount: Object.keys(oldConfigs).length,
    }));
  } catch (error) {
    log.app('[Migration] Failed to migrate from sensorConfigStore', () => ({ error }));
  }
};

// Call during app initialization (in App.tsx or similar)
useEffect(() => {
  migrateFromSensorConfigStore();
}, []);
```

### Step 4: Update All Import Sites

**Replace `useSensorConfigStore` with `useNmeaStore`:**

1. **SensorConfigDialog.tsx:**
   ```typescript
   // OLD:
   const setConfig = useSensorConfigStore.getState().setConfig;
   
   // NEW:
   const setConfig = useNmeaStore.getState().setSensorConfig;
   ```

2. **SensorInstance.ts:**
   ```typescript
   // OLD:
   import { useSensorConfigStore } from '../store/sensorConfigStore';
   const config = useSensorConfigStore.getState().getConfig(type, instance);
   
   // NEW:
   import { useNmeaStore } from '../store/nmeaStore';
   const config = useNmeaStore.getState().getSensorConfig(type, instance);
   ```

3. **ThresholdPresentationService.ts:**
   ```typescript
   // Similar replacement
   ```

4. **useSensorConfigForm.ts:**
   ```typescript
   // Replace hook import and all getConfig/setConfig calls
   ```

5. **TemplatedWidget.tsx:**
   ```typescript
   // Replace subscription from sensorConfigStore to nmeaStore
   ```

### Step 5: Delete sensorConfigStore.ts

- Remove file: `src/store/sensorConfigStore.ts`
- Remove test file: `src/store/__tests__/sensorConfigStore.test.ts` (if exists)
- Verify no remaining imports

### Step 6: Update Documentation

- Update architecture docs to reflect unified store
- Remove references to "dual-store pattern"
- Update `.github/copilot-instructions.md`

## Testing Strategy

### Manual Testing Checklist

**Configuration Persistence:**
- [ ] Create new sensor config (custom name, thresholds)
- [ ] Close app completely (force quit)
- [ ] Reopen app → verify config restored

**Migration from Old Format:**
- [ ] Install version with sensorConfigStore
- [ ] Create several sensor configs
- [ ] Upgrade to unified store version
- [ ] Verify all configs migrated correctly

**Multi-Instance Sensors:**
- [ ] Configure battery:0 and battery:1
- [ ] Verify both persist independently
- [ ] Verify no cross-contamination

**Schema V4 Compatibility:**
- [ ] Single-metric sensor (depth) uses metrics.depth
- [ ] Multi-metric sensor (battery) uses metrics.voltage/current/capacity
- [ ] Verify backward compatibility with V3 data (if any exists)

### Cross-Platform Testing

**Web:** Primary test platform
**iOS:** Verify AsyncStorage works on device
**Android:** Verify AsyncStorage works on device

## Success Criteria

✅ **Zero Breaking Changes:**
- All existing functionality works unchanged
- No data loss during migration
- Schema V4 structure preserved

✅ **Code Simplification:**
- Delete ~500 lines (sensorConfigStore.ts)
- Single import point for all sensor data
- No more dual read patterns

✅ **Performance Neutral:**
- No regression in render performance
- Persist middleware overhead acceptable (<50ms saves)

✅ **DevTools Improvement:**
- Config and data visible in same Redux DevTools view
- Time-travel works for config changes

## Risks and Mitigations

**Risk 1: AsyncStorage Key Conflict**
- Old key: `sensor-configs`
- New key: `nmea-storage`
- Mitigation: Different keys prevent conflict, migration reads old key

**Risk 2: Hydration Race Conditions**
- Zustand persist is async, components may render before hydration
- Mitigation: Use `_hasHydrated` flag (Zustand built-in)

**Risk 3: Data Loss During Migration**
- Migration failure could lose all user configs
- Mitigation: Keep old AsyncStorage key until migration confirmed successful

**Risk 4: Increased Store Size**
- Adding persistence to nmeaStore increases bundle size
- Mitigation: Partial persistence (only sensorConfigs field)

## Implementation Order

1. ✅ Planning & Architecture Design (this document)
2. ⏳ Implement config fields in nmeaStore (add persist middleware)
3. ⏳ Implement migration from sensorConfigStore
4. ⏳ Update all 5 import sites
5. ⏳ Delete sensorConfigStore.ts
6. ⏳ Testing (manual + cross-platform)
7. ⏳ Documentation updates
8. ⏳ Code review & merge

## Estimated Impact

**Lines Changed:**
- nmeaStore.ts: +150 lines (config methods + persist)
- SensorConfigDialog.tsx: -5 lines (import change)
- SensorInstance.ts: -5 lines (import change)
- ThresholdPresentationService.ts: -5 lines (import change)
- useSensorConfigForm.ts: -10 lines (import + method changes)
- TemplatedWidget.tsx: -5 lines (import change)
- sensorConfigStore.ts: -492 lines (deleted)

**Net: -372 lines** (26% reduction in store-related code)

**Files Modified:** 7
**Files Deleted:** 1

## Rollback Plan

If critical issues discovered:

1. Revert commits (git revert or reset)
2. Old AsyncStorage key (`sensor-configs`) remains intact
3. No data loss - old format still readable
4. Fall back to Phase 1 state

**Tag before Phase 2:** `pre-phase-2-dual-store`

## Next Steps

After Phase 2 completion:

**Phase 3: Remove React Hook Form**
- Simplify useSensorConfigForm
- Use plain React state instead of RHF
- Further reduce bundle size

**Phase 4: Testing & Documentation**
- Comprehensive test coverage
- Update all architectural documentation
- Performance benchmarks

---

**Phase 2 Status:** Planning Complete - Ready for Implementation
**Estimated Time:** 2-3 hours implementation + 1 hour testing
**Breaking Changes:** None (migration handles backward compatibility)
