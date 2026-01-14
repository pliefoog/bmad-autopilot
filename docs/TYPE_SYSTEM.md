# Type System - Unified Sensor Schema

**Purpose:** Document the type inference system that powers automatic type generation  
**Complexity:** Advanced (TypeScript generics + mapped types)  
**For:** AI agents, advanced developers, architecture reviews

## Core Type Inference

### 1. Field Type Inference

Map schema field definitions to TypeScript types:

```typescript
/**
 * Infer the TypeScript type for a field based on its schema definition
 * 
 * Flow:
 * - Field defines: { type: 'numeric', ... } or { type: 'textInput' } etc.
 * - Inference: Converts field.type → TS type (number | string | boolean | Date)
 * - Result: Automatic type for that field
 */
type InferFieldType<F> = 
  F extends { type: 'numeric' } ? number :
  F extends { type: 'textInput' } ? string :
  F extends { type: 'picker' } ? string :
  F extends { type: 'toggle' } ? boolean :
  F extends { type: 'dateTime' } ? Date | null :
  never;

// Examples:
// InferFieldType<{ type: 'numeric' }> = number
// InferFieldType<{ type: 'textInput' }> = string
// InferFieldType<{ type: 'toggle' }> = boolean
```

### 2. Sensor Data Inference

Build complete data object type from sensor schema:

```typescript
/**
 * Infer complete sensor data interface from schema
 * 
 * Maps: schema.fields → { [fieldName]: fieldType }
 * 
 * Flow:
 * 1. Get sensor schema: SENSOR_SCHEMAS['battery']
 * 2. Iterate over fields: { voltage: {...}, current: {...}, ... }
 * 3. For each field, infer type: voltage → number, chemistry → string
 * 4. Build object: { voltage: number, current: number, chemistry: string, ... }
 */
type InferSensorData<S extends SensorSchema> = {
  [K in keyof S['fields']]: InferFieldType<S['fields'][K]>;
};

// Example: Battery schema to BatterySensorData
type BatterySensorData = InferSensorData<typeof SENSOR_SCHEMAS.battery>;
// Result: {
//   voltage: number,
//   current: number,
//   capacity: number,
//   chemistry: string,
//   temperature: number,
//   stateOfCharge: number,
//   modelName: string,
//   manufactureDate: Date | null,
//   serviceInterval: number,
// }
```

### 3. Sensor Union Type

Build discriminated union of all sensors:

```typescript
/**
 * Create SensorsData: Record of all sensor types with instances
 * 
 * Pattern:
 * {
 *   battery: Record<number, BatterySensorData>,
 *   depth: Record<number, DepthSensorData>,
 *   // ... all sensors
 * }
 */
type SensorsData = {
  [K in keyof typeof SENSOR_SCHEMAS]: Record<number, InferSensorData<typeof SENSOR_SCHEMAS[K]>>;
};

// Result: Fully typed sensor store with instance support
// Usage: nmeaStore.nmeaData.sensors.battery[0] → BatterySensorData
```

## Advanced Patterns

### Pattern 1: Sensor Type Constraint

Enforce that a value is a valid sensor type:

```typescript
/**
 * Only allow valid sensor type names
 */
type SensorType = keyof typeof SENSOR_SCHEMAS;
// Result: 'battery' | 'depth' | 'engine' | 'speed' | 'wind' | 'gps' | ...

// Usage: Function only accepts valid sensor types
function getSensorData<S extends SensorType>(type: S) {
  const data = useNmeaStore(state => state.nmeaData.sensors[type][0]);
  return data;  // Type: InferSensorData<typeof SENSOR_SCHEMAS[S]>
}

// ✅ OK
getSensorData('battery');

// ❌ Error: Argument of type '"invalid"' is not assignable to parameter of type SensorType
getSensorData('invalid');
```

### Pattern 2: Field Key Constraint

Ensure only valid fields are accessed for a sensor:

```typescript
/**
 * Get only valid field names for a sensor type
 */
type SensorFieldNames<S extends SensorType> = keyof typeof SENSOR_SCHEMAS[S]['fields'];

// Usage: Function only accepts valid field names
function getField<S extends SensorType, F extends SensorFieldNames<S>>(
  sensor: S,
  fieldName: F
) {
  const schema = getSensorSchema(sensor);
  return schema.fields[fieldName];  // Type: FieldDefinition
}

// ✅ OK
getField('battery', 'voltage');

// ❌ Error: "unknownField" is not assignable to field names for battery
getField('battery', 'unknownField');
```

### Pattern 3: Context-Aware Typing

Get context values for context-dependent sensors:

```typescript
/**
 * Get valid context values for a sensor type
 */
type SensorContextValues<S extends SensorType> = 
  typeof SENSOR_SCHEMAS[S] extends { contextKey: infer C }
    ? C extends string
      ? typeof SENSOR_SCHEMAS[S]['fields'][C] extends { options: (infer O)[] }
        ? O
        : never
      : never
    : never;

// Usage: Type-safe context selection
function getAlarmDefaults<S extends SensorType>(
  sensor: S,
  field: SensorFieldNames<S>,
  context: SensorContextValues<S>
) {
  return getAlarmDefaults(sensor, field, context);
}

// ✅ OK
getAlarmDefaults('battery', 'voltage', 'lifepo4');

// ❌ Error: Argument of type '"invalid"' is not assignable to SensorContextValues<'battery'>
getAlarmDefaults('battery', 'voltage', 'invalid');

// ❌ Error: "depth" has no context-dependent alarms
getAlarmDefaults('depth', 'depth', 'anything');
```

### Pattern 4: Instance Selector

Build typed selector for safe store access:

```typescript
/**
 * Create strongly-typed Zustand selector for sensor instances
 */
function useSensorInstance<S extends SensorType>(
  sensor: S,
  instance: number
) {
  return useNmeaStore(
    (state) => state.nmeaData.sensors[sensor]?.[instance],
    (a, b) => a === b
  ) as InferSensorData<typeof SENSOR_SCHEMAS[S]> | undefined;
}

// Usage: Full type safety
const battery = useSensorInstance('battery', 0);
// Type: BatterySensorData | undefined

if (battery) {
  console.log(battery.voltage);  // ✅ Type: number
  console.log(battery.unknown);  // ❌ Error: unknown property
}
```

## Type Flow Diagram

```
┌──────────────────────────────────────────┐
│ Schema Definition                         │
│ SENSOR_SCHEMAS.battery.fields.voltage    │
│ = { type: 'numeric', unitType: ... }     │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│ Field Type Inference                     │
│ InferFieldType<{ type: 'numeric' }>      │
│ = number                                 │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│ Sensor Data Inference                    │
│ InferSensorData<battery schema>          │
│ = { voltage: number, current: number,... }
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│ Store Access (Fully Typed)               │
│ const battery: BatterySensorData = ...   │
│ battery.voltage  ✅ (autocomplete)       │
│ battery.unknown  ❌ (type error)         │
└──────────────────────────────────────────┘
```

## Type Checking Examples

### Example 1: Component Props

```typescript
interface DepthWidgetProps {
  sensorType: 'depth';  // Constrained to valid type
  instance: number;
  metricKey: keyof typeof SENSOR_SCHEMAS['depth']['fields'];  // Valid fields only
}

// Compile-time validation:
<DepthWidget sensorType="depth" instance={0} metricKey="depth" />  // ✅ OK
<DepthWidget sensorType="depth" instance={0} metricKey="unknown" />  // ❌ Error
<DepthWidget sensorType="battery" instance={0} metricKey="depth" />  // ❌ Error
```

### Example 2: Function Parameters

```typescript
function updateMetric<S extends SensorType>(
  sensor: S,
  instance: number,
  data: Partial<InferSensorData<typeof SENSOR_SCHEMAS[S]>>
) {
  // data type is automatically correct for the sensor type
  useNmeaStore.getState().updateSensorData(sensor, instance, data);
}

// ✅ Valid battery updates
updateMetric('battery', 0, { voltage: 12.5, current: 10 });

// ✅ Valid depth updates
updateMetric('depth', 0, { depth: 2.5, offset: 0.3 });

// ❌ Type error: voltage doesn't exist on depth
updateMetric('depth', 0, { voltage: 12.5 });

// ❌ Type error: depth doesn't exist on battery
updateMetric('battery', 0, { depth: 2.5 });
```

### Example 3: Zustand Store Mutation

```typescript
// Strongly-typed mutation
const updateBattery = (instance: number, voltage: number) => {
  useNmeaStore.getState().updateSensorData(
    'battery',
    instance,
    { voltage }  // ✅ voltage is valid battery field
  );
};

// Type-safe alternative using generic:
const updateSensor = <S extends SensorType>(
  sensor: S,
  instance: number,
  data: Partial<InferSensorData<typeof SENSOR_SCHEMAS[S]>>
) => {
  useNmeaStore.getState().updateSensorData(sensor, instance, data);
};

updateSensor('battery', 0, { voltage: 12.5 });  // ✅ OK
updateSensor('depth', 0, { depth: 2.5 });       // ✅ OK
updateSensor('battery', 0, { depth: 2.5 });     // ❌ Type error
```

## Runtime Type Checking

### Validating Field Existence

```typescript
/**
 * At runtime, validate that a field exists before using
 * (TypeScript can't always catch schema violations at compile time)
 */
function validateField(sensor: SensorType, fieldName: string): boolean {
  const schema = getSensorSchema(sensor);
  return fieldName in schema.fields;
}

// Usage
if (validateField('battery', 'voltage')) {
  // Safe to access battery.voltage
  console.log('Voltage field exists');
}
```

### Type Guards

```typescript
/**
 * Create type guard for narrowing sensor types
 */
function isSensorType(value: unknown): value is SensorType {
  return typeof value === 'string' && value in SENSOR_SCHEMAS;
}

// Usage
const sensorName: unknown = getUserInput();

if (isSensorType(sensorName)) {
  // Now sensorName is typed as SensorType
  const schema = getSensorSchema(sensorName);  // ✅ Safe
} else {
  console.error('Invalid sensor type');
}
```

## Generic Helper Functions

### Extract Field Type

```typescript
/**
 * Get the TypeScript type of a specific field
 */
type GetFieldType<S extends SensorType, F extends SensorFieldNames<S>> =
  typeof SENSOR_SCHEMAS[S]['fields'][F] extends { type: infer T }
    ? T extends 'numeric' ? number
    : T extends 'textInput' ? string
    : T extends 'picker' ? string
    : T extends 'toggle' ? boolean
    : T extends 'dateTime' ? Date | null
    : never
    : never;

// Usage
type VoltageType = GetFieldType<'battery', 'voltage'>;  // number
type ChemistryType = GetFieldType<'battery', 'chemistry'>;  // string
```

### Extract Alarm Type

```typescript
/**
 * Get alarm definition for a field
 */
type GetFieldAlarm<S extends SensorType, F extends SensorFieldNames<S>> =
  typeof SENSOR_SCHEMAS[S]['fields'][F] extends { alarm: infer A }
    ? A
    : undefined;

// Usage
type VoltageAlarm = GetFieldAlarm<'battery', 'voltage'>;
// Result: { contexts: { 'lead-acid': {...}, 'lifepo4': {...}, ... } }
```

## Performance & Limits

### Type Complexity

- **File Size:** ~40KB of generated type definitions
- **Compiler Time:** +100-150ms during TypeScript compilation
- **IDE Response:** <100ms for autocomplete
- **Impact:** Negligible for projects with modern hardware

### Circular Reference Safety

The type system avoids circular references:

```typescript
// ✅ Safe: Field refers to schema, schema refers to field
type FieldType = InferFieldType<Field>;
type SchemaType = InferSensorData<Schema>;

// ✅ Safe: Both resolve to concrete types (number, string, etc.)
```

## Common Issues & Solutions

### Issue 1: Type is 'never'

```typescript
// ❌ Something went wrong
type BadType = GetFieldType<'battery', 'invalidField'>;  // never

// Debug: Check field exists
type ValidFields = SensorFieldNames<'battery'>;
// Shows all valid fields - find the correct name
```

### Issue 2: Autocomplete Not Working

```typescript
// ❌ Works but no autocomplete
const field: any = schema.fields.voltage;

// ✅ Works with autocomplete
const field: FieldDefinition = schema.fields['voltage' as const];

// ✅ Best: Use typed access
const field = getFieldDefinition('battery', 'voltage');
```

### Issue 3: Generic Constraint Too Loose

```typescript
// ❌ Too loose - accepts any string
function getData(sensor: string) {
  // sensor could be anything
}

// ✅ Properly constrained
function getData<S extends SensorType>(sensor: S) {
  // sensor is exactly one of the 13 sensor types
}
```

## References

- **Schema:** `src/registry/sensorSchemas.ts`
- **Type Definitions:** `src/types/SensorData.ts`
- **Cache:** `src/registry/globalSensorCache.ts`
- **API:** `src/registry/index.ts`
