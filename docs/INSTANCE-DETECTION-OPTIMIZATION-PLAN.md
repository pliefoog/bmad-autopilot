# Instance Detection & Widget Pipeline Optimization Plan

**Date:** December 12, 2025  
**Commit:** ebac6b8 - Removed PGN/XDR fallback detection paths

## Executive Summary

This plan addresses performance, latency, and complexity issues in the NMEA → Widget pipeline. Current bottlenecks: 10-second polling, redundant state, and inefficient widget updates.

**Estimated Impact:**
- ⚡ **Latency:** 10s → <100ms (100x improvement)
- 🚀 **CPU Usage:** -80% reduction in scanning overhead
- 📦 **Memory:** -40% reduction through state consolidation
- 🧹 **Code Complexity:** -30% reduction in LOC

---

## Phase 1: Event-Driven Architecture (HIGH PRIORITY)

### 1.1 Problem Analysis

**Current Flow:**
```
Timer (10s) → performScan() → check all sensors → notify callbacks → update widgets
```

**Issues:**
- Scans happen even when no data changed (wasteful)
- New widgets appear 0-10s after first data arrives (poor UX)
- CPU usage spikes every 10s regardless of activity
- No differentiation between active/idle periods

### 1.2 Solution Design

**New Flow:**
```
NMEA data arrives → updateSensorData() → emit event → scan only changed type → instant update
```

**Implementation Steps:**

#### Step 1.2.1: Create Event Emitter in nmeaStore
**File:** `boatingInstrumentsApp/src/store/nmeaStore.ts`

```typescript
import { EventEmitter } from 'events';

// Add to store
export interface NmeaStore {
  // ... existing properties ...
  sensorEventEmitter: EventEmitter;
}

// In createNmeaStore():
sensorEventEmitter: new EventEmitter(),

updateSensorData: (sensorType, instance, data) => {
  set((state) => {
    // ... existing merge logic ...
    
    // Emit event after successful update
    state.sensorEventEmitter.emit('sensorUpdate', {
      sensorType,
      instance,
      timestamp: Date.now()
    });
    
    return updatedState;
  });
}
```

**Test:** Emit event only when data actually changes, not on every call.

#### Step 1.2.2: Subscribe to Events in instanceDetection
**File:** `boatingInstrumentsApp/src/services/nmea/instanceDetection.ts`

```typescript
public startScanning(): void {
  if (this.state.isScanning) return;
  
  this.state.isScanning = true;
  console.log('[InstanceDetection] Starting event-driven detection...');
  
  // Initial full scan
  this.performScan();
  
  // Subscribe to sensor updates
  const store = useNmeaStore.getState();
  store.sensorEventEmitter.on('sensorUpdate', this.handleSensorUpdate);
  
  // Keep a slower background scan for cleanup (60s instead of 10s)
  this.scanTimer = setInterval(() => {
    this.cleanupStaleInstances();
  }, 60000);
}

private handleSensorUpdate = (event: { sensorType: string; instance: number }) => {
  const currentTime = Date.now();
  const nmeaData = useNmeaStore.getState().nmeaData;
  
  // Only scan the specific sensor type that changed
  switch (event.sensorType) {
    case 'engine':
      this.scanForEngineInstances(nmeaData, currentTime);
      break;
    case 'battery':
      this.scanForBatteryInstances(nmeaData, currentTime);
      break;
    case 'tank':
      this.scanForTankInstances(nmeaData, currentTime);
      break;
    // ... etc
  }
  
  // Notify callbacks immediately
  this.notifyInstanceCallbacks();
};

public stopScanning(): void {
  const store = useNmeaStore.getState();
  store.sensorEventEmitter.off('sensorUpdate', this.handleSensorUpdate);
  
  // ... existing cleanup ...
}
```

**Test Cases:**
- New engine appears → event fired → widget created instantly
- Engine stops sending data → no events → cleanup after 60s
- Multiple sensors update simultaneously → batch processing

#### Step 1.2.3: Add Event Throttling
Prevent event storms when multiple sensors update rapidly:

```typescript
private lastEventTime = new Map<string, number>();
private readonly EVENT_THROTTLE_MS = 100; // Max 10 events/sec per sensor type

private handleSensorUpdate = (event: { sensorType: string; instance: number }) => {
  const key = `${event.sensorType}-${event.instance}`;
  const now = Date.now();
  const lastTime = this.lastEventTime.get(key) || 0;
  
  if (now - lastTime < this.EVENT_THROTTLE_MS) {
    return; // Throttle rapid updates
  }
  
  this.lastEventTime.set(key, now);
  // ... existing scan logic ...
};
```

**Expected Outcomes:**
- ✅ Widgets appear within 100ms of first data
- ✅ CPU usage drops by 70-80% during idle periods
- ✅ No performance degradation during high-traffic periods

---

## Phase 2: Widget Update Optimization (HIGH PRIORITY)

### 2.1 Problem Analysis

**Current Code:** `widgetStore.updateInstanceWidgets()`
```typescript
// Rebuilds entire widget array every scan (10s)
// No early exit if nothing changed
// Expensive WidgetFactory calls for every widget
```

**Issues:**
- Dashboard re-renders even when no widgets changed
- React reconciliation overhead on every scan
- WidgetFactory.createWidgetInstance() called repeatedly for same IDs

### 2.2 Solution Design

#### Step 2.2.1: Add Incremental Update Logic
**File:** `boatingInstrumentsApp/src/store/widgetStore.ts`

```typescript
interface WidgetStore {
  // ... existing ...
  currentWidgetIds: Set<string>; // Track current widget IDs
}

updateInstanceWidgets: (detectedInstances) => {
  // Build set of required widget IDs
  const newWidgetIds = new Set<string>([
    ...detectedInstances.engines.map(e => e.id),
    ...detectedInstances.batteries.map(b => b.id),
    ...detectedInstances.tanks.map(t => t.id),
    ...detectedInstances.temperatures.map(temp => temp.id),
    ...detectedInstances.instruments.map(inst => inst.id)
  ]);
  
  // Early exit if no changes
  if (setsEqual(get().currentWidgetIds, newWidgetIds)) {
    console.log('[WidgetStore] No widget changes detected, skipping update');
    return;
  }
  
  // Calculate diff
  const toAdd = setDifference(newWidgetIds, get().currentWidgetIds);
  const toRemove = setDifference(get().currentWidgetIds, newWidgetIds);
  
  console.log(`[WidgetStore] Widget diff: +${toAdd.size} -${toRemove.size}`);
  
  let widgets = [...get().dashboard.widgets];
  
  // Remove orphaned widgets (but keep system widgets)
  if (toRemove.size > 0) {
    widgets = widgets.filter(w => 
      w.isSystemWidget || !toRemove.has(w.id)
    );
  }
  
  // Add new widgets
  for (const widgetId of toAdd) {
    try {
      const newWidget = WidgetFactory.createWidgetInstance(widgetId);
      widgets.push(newWidget);
      console.log(`[WidgetStore] Created widget: ${widgetId}`);
    } catch (error) {
      console.error(`[WidgetStore] Failed to create widget ${widgetId}:`, error);
    }
  }
  
  // Update state
  set({ currentWidgetIds: newWidgetIds });
  get().updateDashboard({ widgets });
}

// Helper functions
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter(x => !b.has(x)));
}
```

#### Step 2.2.2: Add Performance Metrics
Track update frequency and efficiency:

```typescript
interface WidgetUpdateMetrics {
  totalUpdates: number;
  skippedUpdates: number;
  widgetsAdded: number;
  widgetsRemoved: number;
  lastUpdateTime: number;
}

// Log metrics every 100 updates
if (metrics.totalUpdates % 100 === 0) {
  const efficiency = (metrics.skippedUpdates / metrics.totalUpdates * 100).toFixed(1);
  console.log(`[WidgetStore] Update efficiency: ${efficiency}% skipped (${metrics.totalUpdates} total)`);
}
```

**Expected Outcomes:**
- ✅ 90-95% of scans result in no update (early exit)
- ✅ Dashboard only re-renders when widgets actually change
- ✅ Faster widget creation (only new widgets created)

---

## Phase 3: State Consolidation (MEDIUM PRIORITY)

### 3.1 Problem Analysis

**Current Architecture:**
```
nmeaData.sensors[type][instance]  ← Store data
instanceDetection.state.engines   ← Duplicate data
instanceDetection.state.batteries ← Duplicate data
instanceDetection.state.tanks     ← Duplicate data
```

**Issues:**
- Data duplication wastes memory
- Must keep two structures in sync
- Potential for stale/inconsistent data

### 3.2 Solution Design

#### Step 3.2.1: Remove DetectedInstance Maps
**File:** `boatingInstrumentsApp/src/services/nmea/instanceDetection.ts`

```typescript
// BEFORE:
interface InstanceDetectionState {
  engines: Map<string, DetectedInstance>;
  batteries: Map<string, DetectedInstance>;
  tanks: Map<string, DetectedInstance>;
  // ...
}

// AFTER:
interface InstanceDetectionState {
  isScanning: boolean;
  lastScanTime: number;
  scanInterval: number;
  // Maps removed - query nmeaStore directly
}
```

#### Step 3.2.2: Query Store Directly
```typescript
public getDetectedInstances(): {
  engines: DetectedInstance[];
  batteries: DetectedInstance[];
  tanks: DetectedInstance[];
  temperatures: DetectedInstance[];
  instruments: DetectedInstance[];
} {
  const { sensors } = useNmeaStore.getState().nmeaData;
  const currentTime = Date.now();
  const STALE_THRESHOLD = 30000;
  
  const result = {
    engines: [],
    batteries: [],
    tanks: [],
    temperatures: [],
    instruments: []
  };
  
  // Convert sensor data to DetectedInstance on-demand
  Object.entries(sensors).forEach(([sensorType, instances]) => {
    Object.entries(instances).forEach(([instanceStr, data]: [string, any]) => {
      const instance = parseInt(instanceStr, 10);
      
      // Skip stale data
      if (currentTime - data.timestamp > STALE_THRESHOLD) {
        return;
      }
      
      const widgetId = WidgetFactory.generateInstanceWidgetId(sensorType, instance);
      const widgetInstance = WidgetFactory.createWidgetInstance(widgetId);
      
      const detected: DetectedInstance = {
        id: widgetId,
        type: sensorType as any,
        instance,
        title: widgetInstance.title,
        icon: widgetInstance.icon,
        priority: this.calculatePriority(sensorType, instance),
        lastSeen: data.timestamp,
        category: widgetInstance.category as any
      };
      
      // Route to correct category
      if (sensorType === 'engine') result.engines.push(detected);
      else if (sensorType === 'battery') result.batteries.push(detected);
      else if (sensorType === 'tank') result.tanks.push(detected);
      // ... etc
    });
  });
  
  return result;
}
```

**Benefits:**
- Single source of truth (nmeaStore)
- Reduced memory footprint
- No sync issues
- Simpler code

**Migration Steps:**
1. Implement new `getDetectedInstances()` logic
2. Run tests in parallel with old implementation
3. Verify identical results
4. Switch over and remove old Maps
5. Remove unused scan methods

---

## Phase 4: WidgetFactory Caching (MEDIUM PRIORITY)

### 4.1 Problem Analysis

**Current Behavior:**
```typescript
// Called repeatedly for same IDs:
WidgetFactory.parseWidgetId('engine-0')  // Regex parsing every time
WidgetFactory.getWidgetTitle('engine-0') // Lookup every time
WidgetFactory.getWidgetIcon('engine-0')  // Lookup every time
```

**Issues:**
- Expensive regex parsing on every call
- Dictionary lookups repeated unnecessarily
- No benefit from repeated calls with same ID

### 4.2 Solution Design

#### Step 4.2.1: Add Metadata Cache
**File:** `boatingInstrumentsApp/src/services/WidgetFactory.ts`

```typescript
export class WidgetFactory {
  // LRU cache for widget metadata (max 256 entries)
  private static metadataCache = new Map<string, {
    title: string;
    icon: string;
    category: string;
    baseType: string;
    instance?: number;
  }>();
  
  private static readonly MAX_CACHE_SIZE = 256;
  
  static getWidgetMetadata(widgetId: string) {
    // Check cache first
    if (this.metadataCache.has(widgetId)) {
      return this.metadataCache.get(widgetId)!;
    }
    
    // Compute metadata
    const parsed = this.parseWidgetId(widgetId);
    const metadata = {
      title: this.getWidgetTitle(widgetId),
      icon: this.getWidgetIcon(widgetId),
      category: this.getWidgetCategory(widgetId),
      baseType: parsed.baseType,
      instance: parsed.instance
    };
    
    // Add to cache (LRU eviction)
    if (this.metadataCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.metadataCache.keys().next().value;
      this.metadataCache.delete(firstKey);
    }
    this.metadataCache.set(widgetId, metadata);
    
    return metadata;
  }
  
  static clearCache() {
    this.metadataCache.clear();
  }
}
```

#### Step 4.2.2: Update Callers
Replace individual calls with cached metadata:

```typescript
// BEFORE:
const title = WidgetFactory.getWidgetTitle('engine-0');
const icon = WidgetFactory.getWidgetIcon('engine-0');
const { baseType } = WidgetFactory.parseWidgetId('engine-0');

// AFTER:
const { title, icon, baseType } = WidgetFactory.getWidgetMetadata('engine-0');
```

**Expected Outcomes:**
- ✅ 10x faster repeated lookups
- ✅ Reduced regex parsing overhead
- ✅ Minimal memory impact (~8KB for 256 entries)

---

## Phase 5: Remove Legacy Fallbacks (LOW PRIORITY)

### 5.1 Remaining Cleanup

**Already Completed:**
- ✅ Removed PGN battery fallbacks
- ✅ Removed PGN tank fallbacks
- ✅ Removed XDR battery/tank fallbacks

**Still To Do:**

#### Step 5.1.1: Clean Up Engine Detection
**File:** `boatingInstrumentsApp/src/services/nmea/instanceDetection.ts`

Currently still has legacy PGN 127488 fallback:
```typescript
// Lines 384-433: Remove this entire block
if (pgnData['127488']) {
  const enginePgns = Array.isArray(pgnData['127488']) ? ...
  // ... fallback logic ...
}
```

#### Step 5.1.2: Clean Up NMEA 0183 Fallbacks
Remove direct sentence parsing (should go through sensor pipeline):
```typescript
// Remove RPM sentence fallback (lines ~417-428)
const rpmMatch = sentence.match(/^\$..RPM,E,(\d+)...
```

**Rationale:**
All NMEA 0183 sentences should be parsed by `PureNmeaParser` → `NmeaSensorProcessor` → `nmeaStore.sensors`.
Direct sentence parsing in instanceDetection bypasses the pipeline and creates duplicate detection paths.

---

## Phase 6: Unified Timestamp Helpers (LOW PRIORITY)

### 6.1 Solution Design

**File:** `boatingInstrumentsApp/src/store/nmeaStore.ts`

```typescript
export interface NmeaStore {
  // ... existing ...
  
  // Helper methods
  isSensorFresh: (sensorType: string, instance: number, maxAgeMs?: number) => boolean;
  getSensorAge: (sensorType: string, instance: number) => number | null;
}

// In createNmeaStore():
isSensorFresh: (sensorType, instance, maxAgeMs = 30000) => {
  const sensor = get().nmeaData.sensors[sensorType]?.[instance];
  if (!sensor?.timestamp) return false;
  return (Date.now() - sensor.timestamp) < maxAgeMs;
},

getSensorAge: (sensorType, instance) => {
  const sensor = get().nmeaData.sensors[sensorType]?.[instance];
  if (!sensor?.timestamp) return null;
  return Date.now() - sensor.timestamp;
}
```

**Usage:**
```typescript
// Replace scattered timestamp checks:
if (currentTime - tankData.timestamp < 30000) { ... }

// With unified helper:
if (nmeaStore.isSensorFresh('tank', 0)) { ... }
```

---

## Implementation Timeline

### Week 1: High Priority Items
- **Day 1-2:** Phase 1 - Event-driven architecture
  - Implement event emitter in nmeaStore
  - Add event handlers in instanceDetection
  - Test with simulator scenarios
  
- **Day 3-4:** Phase 2 - Widget update optimization
  - Add incremental update logic
  - Implement early exit checks
  - Add performance metrics
  
- **Day 5:** Integration testing
  - Full scenario testing
  - Performance benchmarking
  - Bug fixes

### Week 2: Medium Priority Items
- **Day 1-3:** Phase 3 - State consolidation
  - Remove DetectedInstance Maps
  - Implement on-demand queries
  - Migration and testing
  
- **Day 4-5:** Phase 4 - WidgetFactory caching
  - Implement metadata cache
  - Update callers
  - Performance validation

### Week 3: Cleanup & Documentation
- **Day 1-2:** Phase 5 - Remove legacy fallbacks
- **Day 3:** Phase 6 - Unified timestamp helpers
- **Day 4-5:** Documentation, metrics, final testing

---

## Testing Strategy

### Unit Tests
- Event emitter behavior (emit, throttle, cleanup)
- Widget diff calculation (add/remove/no-change cases)
- Cache hit/miss rates
- Timestamp validation helpers

### Integration Tests
- Full pipeline: NMEA data → events → widgets → rendering
- Scenario testing with all simulator modes
- Performance benchmarks (CPU, memory, latency)
- Stress testing (rapid updates, many instances)

### Performance Benchmarks

**Metrics to Track:**
1. **Widget Creation Latency**
   - Before: 0-10s (polling interval)
   - Target: <100ms (event-driven)

2. **CPU Usage (Idle)**
   - Before: Spikes every 10s
   - Target: <1% baseline

3. **Memory Usage**
   - Before: ~2MB (DetectedInstance Maps + sensor data)
   - Target: ~1.2MB (sensor data only)

4. **Dashboard Update Frequency**
   - Before: Every 10s regardless of changes
   - Target: Only when widgets change (95% reduction)

### Acceptance Criteria
- ✅ All existing tests pass
- ✅ Widget creation latency <100ms
- ✅ CPU usage reduction >70%
- ✅ No widget duplication issues
- ✅ Stale widget cleanup works correctly
- ✅ Performance does not degrade under load

---

## Rollback Plan

Each phase is independent and can be rolled back:

1. **Phase 1 (Events):** Keep timer-based scan as fallback
   ```typescript
   if (USE_EVENT_DRIVEN) {
     // event-based logic
   } else {
     // timer-based fallback
   }
   ```

2. **Phase 2 (Widget Updates):** Old logic preserved until validated
3. **Phase 3 (State Consolidation):** Deploy behind feature flag
4. **Phase 4 (Caching):** No-op fallback if cache disabled

**Feature Flags:**
```typescript
const OPTIMIZATION_FLAGS = {
  USE_EVENT_DRIVEN: true,
  USE_INCREMENTAL_UPDATES: true,
  USE_STATE_CONSOLIDATION: true,
  USE_WIDGET_CACHE: true
};
```

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Event storm overwhelming system | High | Low | Event throttling, batch processing |
| Widget duplication reappears | Medium | Low | Extensive testing, Set-based ID tracking |
| Performance regression under load | Medium | Low | Benchmarking, stress testing |
| Cache invalidation issues | Low | Medium | LRU eviction, clear cache on reset |
| Breaking changes to external integrations | Low | Low | Maintain public API compatibility |

---

## Success Metrics

### Quantitative
- ✅ Widget latency: <100ms (vs 10s)
- ✅ CPU usage: -80% reduction
- ✅ Memory usage: -40% reduction
- ✅ Dashboard updates: -95% reduction

### Qualitative
- ✅ Simpler codebase (fewer LOC)
- ✅ Single source of truth for sensor data
- ✅ More maintainable architecture
- ✅ Better developer experience

---

## Next Steps

1. **Review this plan** with team
2. **Create feature branch:** `feature/instance-detection-optimization`
3. **Start Phase 1 implementation**
4. **Daily standups** to track progress
5. **Weekly performance reports**

---

## References

- Current commit: `ebac6b8` - Removed PGN/XDR fallbacks
- Related documentation:
  - [ARCHITECTURE-SIMPLIFICATION-PROGRESS.md](../ARCHITECTURE-SIMPLIFICATION-PROGRESS.md)
  - [PHASE-3-INTEGRATION-COMPLETE.md](../PHASE-3-INTEGRATION-COMPLETE.md)
  - [STORE-HISTORY-ROLLOUT-COMPLETE.md](../STORE-HISTORY-ROLLOUT-COMPLETE.md)

---

**Plan Author:** GitHub Copilot  
**Review Status:** ⏳ Pending Review  
**Approval Required:** Yes
