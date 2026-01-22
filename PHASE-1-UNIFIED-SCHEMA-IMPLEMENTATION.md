# Phase 1: Unified Sensor Schema Implementation

**Goal:** Eliminate single vs multi-metric conditional logic by always using `metrics` object.

## Current State Analysis

### SensorConfiguration Interface (src/types/SensorData.ts)

**Problem:** Dual storage paths
```typescript
export interface SensorConfiguration {
  name?: string;
  context?: string;
  
  // ❌ Single-metric path (depth, speed-through-water)
  critical?: number;
  warning?: number;
  direction?: 'above' | 'below';
  criticalSoundPattern?: string;
  warningSoundPattern?: string;
  criticalHysteresis?: number;
  warningHysteresis?: number;
  enabled: boolean;
  
  // ❌ Multi-metric path (battery, engine)
  metrics?: {
    [metricKey: string]: {
      critical?: number;
      warning?: number;
      direction?: 'above' | 'below';
      criticalSoundPattern?: string;
      warningSoundPattern?: string;
      criticalHysteresis?: number;
      warningHysteresis?: number;
      enabled: boolean;
    };
  };
  
  audioEnabled?: boolean;
  lastModified?: number;
}
```

**Impact:** Conditional code throughout codebase:
- `useSensorConfigForm.ts` (711 lines) - dual form initialization paths
- `SensorConfigDialog.tsx` (617 lines) - conditional rendering
- `ThresholdPresentationService.ts` (556 lines) - dual enrichment paths
- `schemaDefaults.ts` - dual default application

## Target Schema V2 (Unified)

```typescript
export interface SensorConfiguration {
  name?: string;
  context?: string;
  
  // ✅ UNIFIED: Always use metrics object
  metrics: {
    [metricKey: string]: {
      critical?: number;
      warning?: number;
      direction?: 'above' | 'below';
      criticalSoundPattern?: string;
      warningSoundPattern?: string;
      criticalHysteresis?: number;
      warningHysteresis?: number;
      enabled: boolean;
    };
  };
  
  audioEnabled?: boolean;
  lastModified?: number;
}
```

**Benefits:**
- Single code path (no conditionals based on `getAlarmFields().length`)
- MetricSelector always rendered (disabled for single-metric)
- Slider/threshold editor unified
- **~300 lines deleted** from conditional logic elimination

## Implementation Steps

### Step 1: Update Type Definition (BREAKING CHANGE)

**File:** `src/types/SensorData.ts`

```typescript
// Remove top-level threshold fields (lines 58-68)
// Make metrics required (remove ?)
// Update MetricThresholds to match structure

export interface SensorConfiguration {
  name?: string;
  context?: string;
  metrics: {  // Changed from optional to required
    [metricKey: string]: MetricConfiguration;  // Extract to separate type
  };
  audioEnabled?: boolean;
  lastModified?: number;
}

export interface MetricConfiguration {
  critical?: number;
  warning?: number;
  direction?: 'above' | 'below';
  criticalSoundPattern?: string;
  warningSoundPattern?: string;
  criticalHysteresis?: number;
  warningHysteresis?: number;
  enabled: boolean;
}
```

### Step 2: Migration Function

**File:** `src/store/nmeaStore.ts` (add migration)

```typescript
const SENSOR_CONFIG_SCHEMA_VERSION = 2;

function migrateV1ToV2(persistedState: any): any {
  if (!persistedState?.nmeaData?.sensors) {
    return persistedState;
  }

  const migratedSensors = { ...persistedState.nmeaData.sensors };

  for (const sensorType in migratedSensors) {
    for (const instanceNum in migratedSensors[sensorType]) {
      const instanceData = migratedSensors[sensorType][instanceNum];
      
      // Skip if already V2 (has required metrics, no top-level thresholds)
      if (instanceData.metrics && !instanceData.critical && !instanceData.warning) {
        continue;
      }

      // V1 → V2 Migration
      const schema = getSensorSchema(sensorType);
      if (!schema) continue;

      const alarmFields = getAlarmFields(schema);
      
      if (alarmFields.length === 1) {
        // Single-metric: Wrap top-level thresholds in metrics object
        const fieldName = alarmFields[0];
        migratedSensors[sensorType][instanceNum] = {
          name: instanceData.name,
          context: instanceData.context,
          metrics: {
            [fieldName]: {
              critical: instanceData.critical,
              warning: instanceData.warning,
              direction: instanceData.direction,
              criticalSoundPattern: instanceData.criticalSoundPattern,
              warningSoundPattern: instanceData.warningSoundPattern,
              criticalHysteresis: instanceData.criticalHysteresis,
              warningHysteresis: instanceData.warningHysteresis,
              enabled: instanceData.enabled ?? true,
            }
          },
          audioEnabled: instanceData.audioEnabled,
          lastModified: instanceData.lastModified,
        };
      } else {
        // Multi-metric: Already correct, just ensure no top-level fields
        migratedSensors[sensorType][instanceNum] = {
          name: instanceData.name,
          context: instanceData.context,
          metrics: instanceData.metrics || {},
          audioEnabled: instanceData.audioEnabled,
          lastModified: instanceData.lastModified,
        };
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

### Step 3: Update schemaDefaults.ts

**File:** `src/registry/schemaDefaults.ts`

```typescript
// Remove conditional logic at line 79-106
// Always write to metrics object

export function applySchemaDefaults(sensorInstance: SensorInstance): void {
  const sensorType = sensorInstance.sensorType;
  const schema = getSensorSchema(sensorType);
  const alarmFields = getAlarmFields(sensorType);
  
  if (alarmFields.length === 0) {
    return;
  }
  
  const contextKey = getContextKey(sensorType);
  let defaultContextValue = 'default';
  
  if (contextKey) {
    const contextField = schema.fields[contextKey];
    if (contextField && 'default' in contextField) {
      defaultContextValue = String(contextField.default);
    }
  }
  
  // ✅ UNIFIED: Always write to metrics object
  for (const fieldKey of alarmFields) {
    const field = schema.fields[fieldKey];
    if (!field || !field.alarm) continue;
    
    const defaults = getAlarmDefaults(sensorType, fieldKey, defaultContextValue);
    if (!defaults) continue;
    
    const metricConfig: MetricConfiguration = {
      critical: defaults.critical?.value,
      warning: defaults.warning?.value,
      direction: field.alarm.direction,
      criticalSoundPattern: defaults.critical?.sound,
      warningSoundPattern: defaults.warning?.sound,
      criticalHysteresis: defaults.critical?.hysteresis,
      warningHysteresis: defaults.warning?.hysteresis,
      enabled: true,
    };
    
    // Update via metrics path (no conditional)
    sensorInstance.updateMetricThresholds(fieldKey, metricConfig);
  }
}
```

### Step 4: Update SensorInstance Methods

**File:** `src/types/SensorInstance.ts`

```typescript
// Update getThresholds() to always read from metrics
// Update updateThresholds() to always write to metrics
// Remove conditional logic based on alarm field count

public getMetricThresholds(metricKey: string): MetricConfiguration | undefined {
  // Always read from metrics object
  return this.config?.metrics?.[metricKey];
}

public updateMetricThresholds(metricKey: string, config: Partial<MetricConfiguration>): void {
  if (!this.config) {
    this.config = { metrics: {}, audioEnabled: true, lastModified: Date.now() };
  }
  
  if (!this.config.metrics) {
    this.config.metrics = {};
  }
  
  // Always write to metrics object
  this.config.metrics[metricKey] = {
    ...this.config.metrics[metricKey],
    ...config,
    enabled: config.enabled ?? true,
  };
  
  this.config.lastModified = Date.now();
}
```

### Step 5: Update useSensorConfigForm (Major Simplification)

**File:** `src/hooks/useSensorConfigForm.ts`

**Before:** 711 lines with conditional form initialization
**After:** ~400 lines (single code path)

```typescript
// Remove lines 387-432 (conditional computed metricKey logic)
// Always use metrics object
// MetricSelector always rendered (disabled for single-metric)

const alarmFields = useMemo(() => getAlarmFields(sensorType), [sensorType]);
const requiresMetricSelection = alarmFields.length > 1;

// ✅ UNIFIED: Always default to first metric
const [selectedMetric, setSelectedMetric] = useState<string>(alarmFields[0] || '');

// Form initialization: Always read from metrics object
const initialFormData = useMemo(() => {
  const metricConfig = savedConfig?.metrics?.[selectedMetric];
  
  return {
    name: savedConfig?.name || `${sensorConfig.displayName} ${instance + 1}`,
    context: savedConfig?.context || defaultContext,
    critical: metricConfig?.critical,
    warning: metricConfig?.warning,
    direction: metricConfig?.direction,
    // ... etc
  };
}, [savedConfig, selectedMetric]);
```

### Step 6: Update SensorConfigDialog (Render Simplification)

**File:** `src/components/dialogs/SensorConfigDialog.tsx`

**Before:** Lines 410-434 have dual render paths
**After:** Single path, MetricSelector always shown

```typescript
// Remove conditional at line 410: computed.requiresMetricSelection && alarmMetrics.length > 0 ? (...)

// ✅ UNIFIED: Always render MetricSelector
<View style={styles.settingGroup}>
  <Text style={styles.groupLabel}>Alarm metric</Text>
  <MetricSelector
    metrics={alarmMetrics}
    selectedMetric={selectedMetricValue || alarmMetrics[0]}
    onSelectMetric={handlers.handleMetricChange}
    disabled={alarmMetrics.length === 1}  // ⭐ Disable for single-metric
  />
</View>

{/* Show current value for selected metric (always) */}
<View style={styles.metricDisplay}>
  <Text style={styles.metricLabel}>{computed.metricLabel}</Text>
  <Text style={styles.metricValue}>{computed.currentMetricValue}</Text>
</View>
```

### Step 7: Update ThresholdPresentationService (Delete Conditional Paths)

**File:** `src/services/ThresholdPresentationService.ts`

**Before:** Lines 215-282 have dual enrichment paths
**After:** Single path (or delete entirely, convert on-the-fly)

```typescript
// Option A: Unify enrichment (single path)
public enrichThresholds(sensorType, instance, metricKey, contextValue) {
  // Always read from metrics object
  const config = sensor.config?.metrics?.[metricKey];
  // ... enrichment logic (no conditionals)
}

// Option B: Delete service entirely, convert in components
// (Deferred to Phase 2)
```

## Testing Checklist

After implementation:

- [ ] **V1 → V2 Migration**
  - [ ] Single-metric sensor (depth) migrates to `metrics.depth`
  - [ ] Multi-metric sensor (battery) unchanged (already correct)
  - [ ] Missing config creates empty metrics object
  - [ ] Corrupted data falls back to schema defaults

- [ ] **Schema Defaults**
  - [ ] Single-metric sensor gets defaults in `metrics.depth`
  - [ ] Multi-metric sensor gets defaults in `metrics.voltage`, `metrics.current`, etc.

- [ ] **Dialog Rendering**
  - [ ] Single-metric shows disabled MetricSelector (1 option)
  - [ ] Multi-metric shows active MetricSelector (multiple options)
  - [ ] Threshold slider works for both paths
  - [ ] Save persists to metrics object

- [ ] **Type Safety**
  - [ ] No TypeScript errors after interface change
  - [ ] All `as any` casts removed (type-safe metrics access)

## Impact Summary

**Lines Deleted:** ~300 lines
- Conditional logic in useSensorConfigForm: ~150 lines
- Conditional rendering in SensorConfigDialog: ~50 lines
- Dual enrichment paths in ThresholdPresentationService: ~100 lines

**Lines Modified:** ~200 lines
- Type definitions: 20 lines
- Migration function: 50 lines
- schemaDefaults.ts: 30 lines
- SensorInstance methods: 40 lines
- useSensorConfigForm: 40 lines
- SensorConfigDialog: 20 lines

**Time Estimate:** 6-8 hours

**Risk:** HIGH - Breaking change to data structure, requires thorough testing

**Blocker:** None - Ready to implement
