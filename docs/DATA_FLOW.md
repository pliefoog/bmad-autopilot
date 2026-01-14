# Data Flow Architecture - Unified Sensor Schema

**Purpose:** Document how data moves through the system with the unified schema  
**For:** System design reviews, performance optimization, debugging  
**Complexity:** Intermediate

## High-Level Overview

```
NMEA Network (Boat)
       │
       ▼ (TCP/WebSocket/UDP)
Connection Manager
       │
       ▼ (Raw NMEA sentences: "$IIDPT,5.2,0.0*3E")
Parser Layer (PureNmeaParser + pgnParser)
       │
       ├─ Parse sentence → Extract fields
       ├─ Validate against schema
       └─ Create SensorUpdate object
       │
       ▼ ({sensorType: 'depth', instance: 0, data: {depth: 2.5, ...}})
nmeaStore (Zustand)
       │
       ├─ Get or create SensorInstance
       ├─ Call SensorInstance.updateMetrics()
       └─ Trigger re-renders for subscribed widgets
       │
       ▼ (SensorInstance updated)
Enrichment Layer
       │
       ├─ For each metric: SI value → MetricValue
       ├─ Call MetricValue.enrich()
       └─ Cache: display value, formatted string, unit
       │
       ▼ (MetricValue with formattedValue cached)
Widgets (Display)
       │
       └─ Read: sensorInstance.getMetric(fieldName)
          Display: metric.formattedValue (NO transformation needed)
```

## Data Flow Phases

### Phase 1: Parser Input → Sensor Update

**Location:** `src/services/nmea/data/NmeaSensorProcessor.ts`

```
Raw NMEA Sentence
  ├─ "$IIDPT,5.2,0.0*3E"  (Depth sentence)
  └─ "$HEHDG,123.4,2.1,W,1.5,E*52"  (Heading sentence)
          │
          ▼
Parse Structure
  ├─ Identify message type: HDG, DPT, etc.
  ├─ Extract fields: {magnetic_heading: 123.4, variation: 2.1, ...}
  └─ Validate checksums and field counts
          │
          ▼
Schema Validation
  ├─ Get schema: SENSOR_SCHEMAS['heading']
  ├─ Check: field names exist in schema
  ├─ Extract: instance ID from talker ID (II, HE, WI, etc.)
  └─ Verify: field types match (numeric must be number, etc.)
          │
          ▼
Create SensorUpdate Object
  ├─ sensorType: 'heading'  (from schema)
  ├─ instance: 0  (from talker ID)
  ├─ data: {
  │    name: 'Heading',
  │    magneticHeading: 123.4,  (converted to SI: degrees)
  │    trueHeading: 121.3,  (calculated from variation)
  │    variation: -2.1,  (signed value)
  │    timestamp: 1705248000000
  │  }
  └─ Return to store
```

**Key Points:**
- Parser USES schema to validate field names
- Parser CREATES SI-unit values (no display unit conversion yet)
- Parser EXTRACTS instance from NMEA talker ID
- Parser VALIDATES against schema.fields structure

### Phase 2: Store → SensorInstance Update

**Location:** `src/store/nmeaStore.ts` → `src/types/SensorInstance.ts`

```
SensorUpdate Received
  ├─ sensorType: 'depth'
  ├─ instance: 0
  └─ data: {depth: 2.5, offset: 0.3}  (SI units: meters)
          │
          ▼
nmeaStore.updateSensorData()
  ├─ Check: sensors.depth exists?
  │   └─ If not: Create new Record<number, SensorInstance>
  ├─ Check: sensors.depth[0] exists?
  │   └─ If not: Create new SensorInstance('depth', 0)
  └─ Call: sensorInstance.updateMetrics(data)
          │
          ▼
SensorInstance.updateMetrics()
  ├─ For each field in update:
  │   ├─ Check: schema has this field?
  │   ├─ Create MetricValue(si_value, category)
  │   ├─ Call: metric.enrich()
  │   └─ Store: this.metrics.set(fieldName, metric)
  │
  └─ Return: this.metrics (Map of enriched values)
          │
          ▼
nmeaStore Update Complete
  └─ Trigger Zustand subscribers
     (Only components using affected fields re-render)
```

**Key Points:**
- Store VALIDATES schema exists before creating instance
- Store DELEGATES to SensorInstance for enrichment
- Store DEFERS unit conversion to MetricValue
- Store TRIGGERS selective re-renders (only affected widgets)

### Phase 3: MetricValue Enrichment

**Location:** `src/types/MetricValue.ts`

```
MetricValue Created
  ├─ si_value: 2.5  (meters, raw from parser)
  ├─ category: 'depth'  (from schema.fields.depth.unitType)
  ├─ formattedValue: null  (not yet cached)
  ├─ formattedValueWithUnit: null
  └─ displayValue: null
          │
          ▼
MetricValue.enrich()
  ├─ Get display unit from user settings:
  │   └─ userPreferences.displayUnits.depth = 'feet'
  │
  ├─ Get conversion function:
  │   └─ ConversionRegistry.get('depth').toDisplay(2.5)
  │       Result: 8.2 feet
  │
  ├─ Get format function:
  │   └─ ConversionRegistry.get('depth').format(8.2)
  │       Result: "8.2"
  │
  └─ Cache results:
      ├─ si_value: 2.5  (immutable)
      ├─ value: 8.2  (converted)
      ├─ unit: 'ft'  (symbol)
      ├─ formattedValue: '8.2'  ⭐ PRIMARY (no unit)
      └─ formattedValueWithUnit: '8.2 ft'  (with unit)
           │
           ▼
Metric Cached
  ├─ Future access: instant return (no recalculation)
  ├─ Re-enrich only if:
  │   ├─ User changes display units
  │   ├─ User changes preferences
  │   └─ New SI value arrives
  └─ Performance: O(1) access, batched re-enrichment
```

**Key Points:**
- Enrichment is DEFERRED until needed (lazy evaluation)
- Conversion uses ConversionRegistry (singleton pattern)
- Formatted values are CACHED for performance
- Re-enrichment is COORDINATED by ReEnrichmentCoordinator

### Phase 4: Widget Access → Display

**Location:** `src/widgets/` and `src/components/`

```
Widget Renders
  ├─ Props: {sensorType: 'depth', instance: 0, metricKey: 'depth'}
  └─ Hooks: useMetricValue(sensorType, instance, metricKey)
           │
           ▼
useMetricValue Hook
  ├─ Get SensorInstance:
  │   └─ useSensorInstance('depth', 0)
  │       └─ Returns: SensorInstance or undefined
  │
  ├─ If not found:
  │   └─ Return: { si_value: null, value: null, formattedValue: null }
  │
  └─ Call: sensorInstance.getMetric('depth')
           └─ Returns: MetricValue (or undefined)
               │
               ▼
Widget Display
  ├─ Access pre-cached value:
  │   └─ metric.formattedValue  ("8.2")
  │
  ├─ NO transformation:
  │   └─ Don't call .toFixed(), toString(), etc.
  │
  └─ Render: <Text>{metric.formattedValue}</Text>
             Result: "8.2"  ✅ Done!
```

**Key Points:**
- Widget receives FULLY ENRICHED MetricValue
- Widget uses PRE-CACHED formattedValue
- Widget performs NO transformations
- Widget is "dumb consumer" (matches React philosophy)

## Data Structures

### SensorUpdate (From Parser)

```typescript
interface SensorUpdate {
  sensorType: 'depth' | 'battery' | ... ;  // From schema
  instance: number;  // From NMEA talker ID
  data: Partial<SensorData[SensorType]>;  // SI units only
}

// Example: Depth
{
  sensorType: 'depth',
  instance: 0,
  data: {
    depth: 2.5,  // SI: meters (not feet)
    offset: 0.0,  // SI: meters
    timestamp: 1705248000000
  }
}

// Example: Battery
{
  sensorType: 'battery',
  instance: 0,
  data: {
    voltage: 12.5,  // SI: volts
    current: 10.2,  // SI: amps
    capacity: 100,  // SI: percent
    chemistry: 'lifepo4',  // String (no conversion)
    timestamp: 1705248000000
  }
}
```

### SensorInstance (In Store)

```typescript
class SensorInstance {
  sensorType: SensorType;
  instance: number;
  
  // Core data: Raw SI values + metadata
  private metrics: Map<string, MetricValue>;
  private history: Map<string, number[]>;  // Ring buffer per field
  
  // Config: User settings + thresholds
  private config: SensorConfig;
  private alarmThresholds: Map<string, AlarmThresholds>;
  
  // Methods:
  updateMetrics(data: Partial<SensorData>): void  // Called by store
  getMetric(fieldName: string): MetricValue | undefined
  getHistory(fieldName: string): number[]
  getSessionStats(fieldName: string): { min, max, avg }
}

// Usage:
const instance = useNmeaStore.getState().getSensorInstance('depth', 0);
const metric = instance?.getMetric('depth');
console.log(metric?.formattedValue);  // "8.2"
```

### MetricValue (Cached Enrichment)

```typescript
class MetricValue {
  // Immutable SI value
  readonly si_value: number;
  readonly category: DataCategory;  // From schema
  
  // Cached display values (computed once, reused many times)
  readonly value: number;  // Converted to user units
  readonly unit: string;  // Unit symbol ("ft", "m", "V", etc.)
  readonly formattedValue: string;  // Value formatted ("8.2") ⭐
  readonly formattedValueWithUnit: string;  // ("8.2 ft")
  
  // Computed properties
  readonly convertToDisplay: (si: number) => number
  readonly convertToSI: (display: number) => number
  
  // Alarm checking
  getAlarmState(thresholds: AlarmThresholds): AlarmLevel
}

// Usage:
const metric = instance.getMetric('depth');
metric.formattedValue  // "8.2" - ready to display
metric.si_value  // 2.5 - for calculations
metric.value  // 8.2 - for numeric comparisons
```

## Re-Enrichment Flow

When user changes units or theme:

```
User Changes Display Unit
  ├─ depth: 'meters' → 'feet'
  └─ Update userPreferencesStore
           │
           ▼
ReEnrichmentCoordinator.onUnitChange()
  ├─ Get all affected sensors (category: 'depth')
  ├─ For each sensor instance:
  │   ├─ Get metrics with that category
  │   ├─ Call: metric.enrich() [recalculates conversion]
  │   └─ Update cache: si_value → formattedValue
  │
  └─ Trigger store update
           │
           ▼
Zustand Subscribers Notified
  ├─ Only widgets using depth metrics re-render
  ├─ Battery widgets unaffected
  └─ Display shows new units
```

## History & Statistics Flow

### History Collection

```
New Metric Value Arrives
  ├─ Call: sensorInstance.updateMetrics({depth: 2.5})
  │
  └─ SensorInstance.updateMetrics():
      ├─ Update metric value: depth = 2.5
      └─ Append to history buffer:
          ├─ Ring buffer: last 1000 values
          ├─ Timestamp: 1705248000000
          └─ Value: 2.5
```

### Statistics Calculation

```
Widget Requests: depth.max
  ├─ Call: sensorInstance.getMetric('depth.max')
  │
  └─ SensorInstance.getMetric('depth.max'):
      ├─ Parse suffix: '.max'
      ├─ Get base field: 'depth'
      ├─ Get history: [1.2, 2.5, 1.8, 3.1, 2.2, ...]
      ├─ Calculate: max([...]) = 3.1
      ├─ Create MetricValue:
      │   ├─ si_value: 3.1
      │   ├─ Enrich (convert to display units)
      │   └─ Return with stat prefix: "MAX DEPTH"
      │
      └─ Result: {
          si_value: 3.1,
          value: 10.2,  (in feet)
          formattedValue: "10.2",
          formattedValueWithUnit: "10.2 ft",
          mnemonic: "MAX DEPTH"
        }
```

## Alarm Checking Flow

```
New MetricValue Received
  ├─ value: 12.4 (battery voltage)
  └─ category: 'voltage'
           │
           ▼
Alarm Threshold Check
  ├─ Get sensor config:
  │   └─ user selected: chemistry = 'lifepo4'
  │
  ├─ Get context-specific thresholds:
  │   └─ getAlarmDefaults('battery', 'voltage', 'lifepo4')
  │       Result: {
  │         critical: { min: 12.8 },
  │         warning: { min: 13.0 },
  │         ...
  │       }
  │
  ├─ Compare:
  │   ├─ 12.4 < 12.8 → CRITICAL ⚠️
  │   ├─ 12.4 < 13.0 → WARNING 🟡
  │   └─ Set AlarmLevel accordingly
  │
  └─ Store alarm state in nmeaStore
           │
           ▼
Alarm UI Updates
  ├─ Red indicator (critical)
  ├─ Amber indicator (warning)
  ├─ Optional: Sound alert
  └─ Optional: Toast notification
```

## Performance Characteristics

### Lookup Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Parse NMEA sentence | 1-5ms | Depends on sentence length |
| Schema validation | <1ms | O(1) Map lookup |
| Create SensorInstance | <1ms | Zustand store operation |
| Enrich MetricValue | 2-10ms | Conversion + format |
| Widget render | <16ms | React render budget |
| Zustand selector | <1ms | Shallow equality check |

### Memory Usage

| Component | Size | Notes |
|-----------|------|-------|
| SENSOR_SCHEMAS | ~100KB | Static definition |
| globalSensorCache | ~50KB | Pre-computed lookups |
| SensorInstance (typical) | ~5-10KB | 13 metrics × ~1KB each |
| MetricValue (cached) | ~200 bytes | Per metric |
| History buffer (1000 items) | ~8KB | Per field |

### Total for Full Dashboard

- 13 sensors × 2 instances × 5 metrics × 200 bytes = ~26KB
- Plus history: 13 × 2 × 5 × 8KB = ~520KB
- **Total:** ~550KB for complete session history

## Debugging Data Flow

### Verify Parser Output

```typescript
// Enable NMEA parser logging
enableLog('nmea.depth');
enableLog('nmea.battery');

// In console, watch parsed updates:
// NMEA: processDBT {depth: 2.5, offset: 0.0, timestamp: 1705248000000}
```

### Verify Store Updates

```typescript
// Check nmeaStore in Redux DevTools
// Look for: nmeaData.sensors.depth[0] with MetricValue
{
  si_value: 2.5,
  value: 8.2,
  formattedValue: "8.2",
  unit: "ft",
  ...
}
```

### Verify Widget Rendering

```typescript
// In widget component
console.log('Received metric:', metric);
console.log('Display value:', metric?.formattedValue);

// Should show cached, not recalculated
```

## Common Issues

### Issue: formattedValue is null

**Cause:** MetricValue not enriched  
**Fix:** Call `metric.enrich()` or check if `si_value` is valid

### Issue: Widget not updating

**Cause:** Selector equality check failing  
**Fix:** Use proper equality in Zustand selector:
```typescript
const metric = useNmeaStore(
  state => state.nmeaData.sensors.depth?.[0]?.getMetric('depth'),
  (a, b) => a === b  // ← Shallow equality
);
```

### Issue: Stale data in widget

**Cause:** Component not re-rendering on update  
**Fix:** Check subscription is in useEffect dependency array

## References

- **Parser:** `src/services/nmea/data/NmeaSensorProcessor.ts`
- **Store:** `src/store/nmeaStore.ts`
- **SensorInstance:** `src/types/SensorInstance.ts`
- **MetricValue:** `src/types/MetricValue.ts`
- **Conversion:** `src/utils/ConversionRegistry.ts`
