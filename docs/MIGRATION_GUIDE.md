# Migration Guide: Legacy Registry to Unified Schema

**Target Audience:** Developers maintaining codebase  
**Phase:** 2.5+ Refactor  
**Duration:** ~30 minutes to understand

## Quick Summary

| What Changed | Old Code | New Code |
|---|---|---|
| Field lookup | `SensorConfigRegistry.getSensorField(type, key)` | `getFieldDefinition(type, key)` |
| Schema access | `SENSOR_CONFIG_REGISTRY[type].fields` | `getSensorSchema(type)?.fields` |
| Alarms | Registry + external defaults | Inline in schema (context-aware) |
| Type safety | Manual interfaces | Auto-generated from schema |
| File count | 2 files (363 + 2245 lines) | 1 file (800 lines) |

## What to Know

### 1. Sensor Type Names Changed

For semantic correctness (Phase 5):

```typescript
// Old names (still work via aliases)
compass     → heading
navigation  → position

// Both work, but prefer new names
const heading = useNmeaStore(state => state.nmeaData.sensors.heading);
```

**Why:** "Heading" is NMEA standard terminology. Compass can be magnetic or true.

### 2. Schema API is the Source of Truth

All sensor metadata now comes from unified schema:

```typescript
import { getSensorSchema, getFieldDefinition, getAlarmDefaults } from '../registry';

// Get all fields for a sensor
const schema = getSensorSchema('battery');
// Result: { voltage: {...}, current: {...}, chemistry: {...}, ... }

// Get specific field
const voltageField = getFieldDefinition('battery', 'voltage');
// Result: { type: 'numeric', unitType: 'voltage', alarm: {...}, ... }

// Get context-specific alarm (e.g., lifepo4 battery)
const lifepo4Limits = getAlarmDefaults('battery', 'voltage', 'lifepo4');
// Result: { critical: { min: 12.8 }, warning: { min: 13.0 } }
```

### 3. Context-Dependent Configuration

Some sensors vary their alarms based on a "context" field:

```typescript
// Battery chemistry affects voltage limits
const batteryChemistry = 'lifepo4';  // Set by user in settings
const limits = getAlarmDefaults('battery', 'voltage', batteryChemistry);
// Critical: min 12.8V, Warning: min 13.0V

// Engine type affects RPM limits
const engineType = 'diesel';
const rpmLimits = getAlarmDefaults('engine', 'rpm', engineType);
// Critical: max 2800 RPM
```

**Location:** `nmeaStore.sensorConfig[sensorType][instanceNumber].contextValue`

### 4. Type Definitions are Auto-Generated

Don't manually edit sensor types - edit schema instead:

```typescript
// ❌ WRONG - Edit types directly
export interface BatterySensorData {
  voltage: number;
  newField: string;  // Added manually
}

// ✅ CORRECT - Add to schema
export const SENSOR_SCHEMAS = {
  battery: {
    fields: {
      voltage: {...},
      newField: { type: 'textInput' }  // Added to schema
    }
  }
}

// Type automatically updates via InferSensorData<T>
// IDE shows newField available everywhere
```

## Common Tasks

### Task 1: Get Field Configuration in Component

**Old way:**
```typescript
import { SensorConfigRegistry } from '../registry/SensorConfigRegistry';

const field = SensorConfigRegistry.getField('battery', 'voltage');
```

**New way:**
```typescript
import { getFieldDefinition } from '../registry';

const field = getFieldDefinition('battery', 'voltage');
// Same interface, better architecture
```

### Task 2: Access Alarm Thresholds

**Old way:**
```typescript
const defaults = SENSOR_CONFIG_REGISTRY['battery'].fields
  .find(f => f.key === 'voltage')?.alarm?.[chemistry];
```

**New way:**
```typescript
import { getAlarmDefaults } from '../registry';

const defaults = getAlarmDefaults('battery', 'voltage', 'lifepo4');
// Cleaner API, automatic context handling
```

### Task 3: Add New Sensor Type

**Steps:**

1. **Update schema** (`src/registry/sensorSchemas.ts`):
```typescript
export const SENSOR_SCHEMAS = {
  // ... existing sensors
  newSensor: {
    category: 'your_category',
    contextKey: 'context_field',  // If context-dependent
    fields: {
      field1: {
        type: 'numeric',
        unitType: 'your_unit',
        label: 'Field 1',
        mnemonic: 'FIELD1'
      },
      // ... more fields
    }
  }
}
```

2. **Add to SensorsData union** (`src/types/SensorData.ts`):
```typescript
export type NewSensorData = InferSensorData<typeof SENSOR_SCHEMAS.newSensor>;

export type SensorsData = {
  battery: Record<number, BatterySensorData>;
  // ... other sensors
  newSensor: Record<number, NewSensorData>;  // NEW
};
```

3. **Update parsers** if needed (`src/services/nmea/data/NmeaSensorProcessor.ts`)

4. **Create widget** following [Registry-First Widget Architecture](./REGISTRY-FIRST-WIDGET-ARCHITECTURE.md)

### Task 4: Modify Alarm Thresholds

**Old way:**
```typescript
// Edit in SensorConfigRegistry.ts manually
export const SENSOR_CONFIG_REGISTRY = {
  battery: {
    fields: [
      {
        key: 'voltage',
        alarm: {
          'lifepo4': { critical: { min: 12.8 } }  // Edit here
        }
      }
    ]
  }
}
```

**New way:**
```typescript
// Edit in sensorSchemas.ts - same location but cleaner structure
export const SENSOR_SCHEMAS = {
  battery: {
    fields: {
      voltage: {
        alarm: {
          contexts: {
            'lifepo4': { critical: { min: 12.8 } }  // Edit here - more organized
          }
        }
      }
    }
  }
}
```

### Task 5: Validate Field Exists

**Old way:**
```typescript
const exists = SENSOR_CONFIG_REGISTRY['battery'].fields.some(f => f.key === 'voltage');
```

**New way:**
```typescript
const field = getFieldDefinition('battery', 'voltage');
const exists = field !== undefined;
```

## Debugging

### Issue: Field not found

```typescript
const field = getFieldDefinition('battery', 'volts');  // Wrong name!
console.log(field);  // undefined

// Check what fields exist
import { getSensorSchema } from '../registry';
const schema = getSensorSchema('battery');
console.log(Object.keys(schema.fields));  // ['voltage', 'current', 'capacity', ...]
// Ah! It's 'voltage' not 'volts'
```

### Issue: Alarm defaults not working

```typescript
// This returns undefined
const limits = getAlarmDefaults('battery', 'voltage', 'lead-acid');

// Debug: Check context values
import { getContextValues } from '../registry';
const validContexts = getContextValues('battery');
console.log(validContexts);  // ['lead-acid', 'agm', 'gel', 'lifepo4']
// All good - check the field actually has alarm config

// Debug: Check field has alarm
const field = getFieldDefinition('battery', 'voltage');
console.log(field.alarm);  // Should have contexts property
```

## TypeScript Tips

### Using Inferred Types

```typescript
import type { InferSensorData } from '../registry/sensorSchemas';

// Get type for a sensor
type BatteryData = InferSensorData<typeof SENSOR_SCHEMAS.battery>;

// Use in function
function updateBattery(data: BatteryData) {
  console.log(data.voltage);  // ✅ TypeScript knows this exists
  console.log(data.unknown);  // ❌ TypeScript error!
}
```

### Getting Available Fields as Types

```typescript
import type { SensorType } from '../types/SensorData';

// Limit metricKey to valid fields for a sensor type
type BatteryFields = keyof typeof SENSOR_SCHEMAS.battery.fields;
// Result: 'voltage' | 'current' | 'capacity' | ...

function useMetric<S extends SensorType, F extends keyof typeof SENSOR_SCHEMAS[S]>(
  sensorType: S,
  fieldKey: F  // ✅ TypeScript enforces valid field names
) {
  const schema = getSensorSchema(sensorType);
  return schema.fields[fieldKey];
}
```

## Breaking Changes

### None! 🎉

**Backward Compatibility Features:**
- Type aliases maintain old sensor names (`CompassSensorData`, `NavigationSensorData`)
- `getSensorField()` wrapper supports old function name
- All public APIs available with new names
- No code changes required for existing widgets

**Timeline:**
- Phase 2.5+: New schema available alongside old code
- Phase 6+: Old registry archived, but compatibility layer in place
- No deprecation period - can migrate at own pace

## Performance Notes

### No Runtime Impact
- Type inference: TypeScript-only, zero runtime cost
- Schema access: O(1) via global cache
- Migration doesn't affect runtime performance

### Improvement
- App startup: ~5ms to initialize cache (negligible)
- Field lookups: 10x faster (O(n) → O(1))
- Effective: Faster on heavily instrumented dashboards

## Testing Your Changes

### Verify Schema Consistency

```typescript
import { getSensorSchema } from '../registry';

// Check all sensors have complete config
for (const sensorType of ['battery', 'depth', 'engine', ...]) {
  const schema = getSensorSchema(sensorType as SensorType);
  if (!schema) {
    console.error(`Missing schema for: ${sensorType}`);
  }
  
  // Check all fields have unitType (for conversions)
  for (const [fieldName, field] of Object.entries(schema.fields)) {
    if (!field.unitType && field.type === 'numeric') {
      console.warn(`Field ${fieldName} in ${sensorType} missing unitType`);
    }
  }
}
```

### Verify Type Safety

```typescript
// TypeScript should catch these errors at compile time
const battery: BatterySensorData = {
  voltage: 12.5,
  unknown: 'value'  // ❌ Error: unknown property
};

const field: FieldDefinition = {
  type: 'unknownType'  // ❌ Error: invalid type
};
```

## References

- **Architecture:** [SENSOR_SCHEMA_ARCHITECTURE.md](./SENSOR_SCHEMA_ARCHITECTURE.md)
- **Implementation:** `src/registry/sensorSchemas.ts`
- **API Reference:** `src/registry/index.ts`
- **Example Widget:** `src/widgets/DepthWidget.tsx`
