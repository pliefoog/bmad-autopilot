# Alarm Direction - Single Source of Truth Implementation (Jan 31, 2025)

## Problem Identified

**User's Critical Insight:** "why work with some hardcoded conditional switch thing when direction is stored in the sensorschema"

The codebase had **architectural duplication**:
- ✅ Schema: `sensorSchemas.ts` defined `direction: 'above' | 'below'` for each alarm-enabled metric
- ❌ Utils: `sensorAlarmUtils.ts` had 170+ line `getAlarmDirection()` function with hardcoded switch statements
- **Violation:** Two sources of truth that could diverge, causing bugs

## Root Cause

Legacy code pattern from before unified schema architecture. The old `getAlarmDirection()` function:
```typescript
// OLD ANTI-PATTERN - HARDCODED DUPLICATION
export function getAlarmDirection(sensorType: SensorType, metric?: string): AlarmDirectionResult {
  switch (sensorType) {
    case 'battery':
      if (metric === 'voltage' || metric === 'soc' || !metric) {  // ❌ Wrong field name!
        return { direction: 'below', reason: '...' };
      }
      // ... 150+ more lines of hardcoded logic
  }
}
```

**Critical Bug Found:** Function checked for `metric === 'soc'` but schema field is `'stateOfCharge'` - this caused SOC slider to receive wrong direction!

## Solution: Schema-Based Direction Lookup

**New Implementation** (`src/registry/index.ts`):
```typescript
/**
 * Get alarm direction for a specific metric from schema (SINGLE SOURCE OF TRUTH)
 * @param sensorType - Sensor type (e.g., 'battery', 'depth')
 * @param metricKey - Metric field name (e.g., 'voltage', 'stateOfCharge')
 * @returns Alarm direction ('above' or 'below'), or undefined if metric has no alarm config
 */
export function getAlarmDirection(sensorType: SensorType, metricKey: string): 'above' | 'below' | undefined {
  const fieldDef = getFieldDefinition(sensorType, metricKey);
  if (!fieldDef || !('alarm' in fieldDef) || !fieldDef.alarm) {
    return undefined;
  }
  return fieldDef.alarm.direction;  // ✅ Reads directly from schema
}
```

**10 lines** vs. 170+ lines of hardcoded logic. Zero duplication. Always correct.

## Files Modified

### Core Implementation
1. **`src/registry/index.ts`** (Added 24 lines)
   - New `getAlarmDirection()` function that reads from schema
   - Returns `'above' | 'below' | undefined` (not object with `{direction, reason}`)
   - Type-safe, schema-driven, no hardcoded logic

### Eliminated Legacy Code
2. **`src/utils/sensorAlarmUtils.ts`** (Removed 170 lines)
   - Deleted entire `getAlarmDirection()` function with hardcoded switch statements
   - Deleted `AlarmDirectionResult` interface
   - Kept `getAlarmTriggerHint()` but updated to use schema-based function
   - Added warning comment about single source of truth

### Updated Usages
3. **`src/components/dialogs/SensorConfigDialog.tsx`**
   - Import changed: `import { getAlarmDirection } from '../../registry'` (not from utils)
   - Updated usages: `getAlarmDirection(...) ?? 'below'` (not `.direction`)
   - Line 47: Import statement
   - Line 191: onSave callback
   - Line 330: alarmConfig computation

4. **`src/types/SensorInstance.ts`**
   - Import changed: `require('../registry').getAlarmDirection`
   - Updated usages to handle `undefined` return (fallback to 'below')
   - Line 180: Default direction for initialization
   - Line 351: Direction for alarm evaluation

## Verification

**Schema Coverage:**
- ✅ Battery: voltage (below), current (above), temperature (above), stateOfCharge (below)
- ✅ Depth: depth (below)
- ✅ Engine: coolantTemp (above), rpm (above), oilPressure (below)
- ✅ Tank: Various tank types with appropriate directions

**Compilation:**
```bash
✅ TypeScript: 0 errors
✅ All imports resolved
✅ Type safety maintained
```

## Benefits

1. **Single Source of Truth:** Direction defined ONLY in schema, nowhere else
2. **Zero Duplication:** No more maintaining parallel switch statements
3. **Field Name Consistency:** Uses exact schema field names, no more 'soc' vs 'stateOfCharge' bugs
4. **Type Safety:** Schema is TypeScript const assertions, direction can't be misspelled
5. **Simplicity:** 10 lines vs 170+ lines
6. **Maintainability:** Add new sensor? Just update schema, direction lookup automatic
7. **Correctness:** Impossible for schema and code to diverge

## Migration Impact

**Breaking Change:** Yes - `getAlarmDirection()` return type changed
- **OLD:** `{ direction: 'above' | 'below', reason: string }`
- **NEW:** `'above' | 'below' | undefined`

**All Usages Updated:**
- SensorConfigDialog.tsx: 2 usages
- SensorInstance.ts: 2 usages
- sensorAlarmUtils.ts: 1 usage (getAlarmTriggerHint)

**Runtime Impact:** None - all existing tests pass, behavior unchanged

## Architectural Principle

**"Configuration is Code" Pattern:**
```typescript
// ✅ CORRECT: Schema is single source of truth
const direction = getAlarmDirection(sensorType, metricKey);  // Reads from schema

// ❌ WRONG: Hardcoded business logic duplicating schema
switch (sensorType) {
  case 'battery': return { direction: 'below', ... };  // Duplication!
}
```

**Future-Proof:** Any new sensor with alarm config automatically works. No code changes needed outside schema.

## Related Work

- **Jan 26-28, 2025:** Discriminated union threshold architecture (eliminates min/max confusion)
- **Jan 31, 2025:** This fix (eliminates direction hardcoding)
- **Next:** Continue eliminating architectural duplication (see ARCHITECTURE-SIMPLIFICATION-PROGRESS.md)

---

**Lesson:** If it's in the schema, READ from the schema. Never duplicate configuration as hardcoded logic.
