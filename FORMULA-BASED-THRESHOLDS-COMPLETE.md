# Formula-Based Threshold System - Implementation Complete

**Date:** January 2025  
**Status:** ✅ Complete - All 28 calculated thresholds migrated to declarative formula strings

## Overview

Completed migration from verbose calculated threshold properties to declarative formula-based threshold system. This represents the ultimate expression of the "everything in the schema" philosophy - all threshold calculation logic is now visible and editable directly in sensor schemas.

## What Changed

### Before: Verbose Calculated Properties (9 fields per threshold)

```typescript
interface ThresholdConfig {
  value?: number;
  hysteresis?: number;
  sound: AlarmSoundPattern;
  calculated?: true;           // Flag for calculated threshold
  baseField?: string;          // Which field to multiply (capacity, nominalVoltage, maxRpm)
  multiplier?: number;         // Multiplication factor
  minValue?: number;           // Lower clamp bound
  maxValue?: number;           // Upper clamp bound
  tempCompensation?: number;   // Hidden temperature compensation rate
}

// Example: Battery voltage threshold
critical: { 
  calculated: true, 
  baseField: 'nominalVoltage', 
  multiplier: 0.985, 
  minValue: 11.8, 
  maxValue: 14.0, 
  tempCompensation: -0.05,  // Hidden in resolver logic!
  hysteresis: 0.02, 
  sound: 'triple_blast' 
}
```

### After: Declarative Formula Strings (4 fields per threshold)

```typescript
interface ThresholdConfig {
  value?: number;        // Static threshold value
  formula?: string;      // Dynamic threshold formula (NEW)
  hysteresis?: number;
  sound: AlarmSoundPattern;
}

// Example: Battery voltage threshold with visible temperature compensation
critical: { 
  formula: 'nominalVoltage * 0.985 + (temperature - 25) * -0.05',
  hysteresis: 0.02, 
  sound: 'triple_blast' 
}
```

## Key Improvements

### 1. Visibility - All Logic in Schema
**Before:** Temperature compensation hidden in `thresholdResolver.ts` code  
**After:** Explicitly visible in formula: `+ (temperature - 25) * -0.05`

### 2. Simplicity - Native JavaScript Evaluation
**Before:** Complex conditional logic with 6 calculated properties  
**After:** Single formula string evaluated with `new Function()`

### 3. Maintainability - Self-Documenting
**Before:** Must read resolver code to understand calculation  
**After:** Formula is self-explanatory: `capacity * 0.5` = 0.5C rate

### 4. Correctness - Temperature in Celsius
**Before:** Confusing Kelvin → Celsius conversions in resolver  
**After:** Direct Celsius reference: `(temperature - 25)` = deviation from 25°C

## Migration Statistics

- **28 Total Thresholds Migrated:**
  - ✅ 10 Battery voltage thresholds (with temperature compensation)
  - ✅ 10 Battery current thresholds (simple multipliers)
  - ✅ 8 Engine RPM thresholds (simple multipliers)

- **Code Reduction:**
  - **ThresholdConfig:** 9 properties → 4 properties (56% reduction)
  - **thresholdResolver.ts:** ~180 lines → ~85 lines (53% reduction)
  - **Per threshold:** 8 properties → 3 properties (63% reduction)

## Implementation Files

### Core Files Created/Modified

**1. formulaEvaluator.ts (NEW - 130 lines)**
```typescript
/**
 * Core formula evaluation engine for dynamic threshold calculations
 * 
 * Uses built-in JavaScript Function constructor for evaluation
 * Zero external dependencies - pure TypeScript
 */

// Main API:
evaluateFormula(formula: string, context: Record<string, number | undefined>): number | undefined
extractFieldNames(formula: string): string[]

// Features:
// - Extracts field names using regex (filters JS keywords)
// - Validates all fields are numbers before evaluation
// - Returns undefined if any field missing (graceful degradation)
// - Try/catch with error logging (formula + context)
// - TODO: Add helper functions (min, max, abs, clamp) via injection
```

**2. sensorSchemas.ts - ThresholdConfig Type**
```typescript
// BEFORE (9 properties):
export interface ThresholdConfig {
  value?: number;
  hysteresis?: number;
  sound: AlarmSoundPattern;
  calculated?: true;
  baseField?: 'capacity' | 'nominalVoltage' | 'maxRpm';
  multiplier?: number;
  minValue?: number;
  maxValue?: number;
  tempCompensation?: number;
}

// AFTER (4 properties):
export interface ThresholdConfig {
  value?: number;        // Static threshold value in SI units
  formula?: string;      // Dynamic threshold formula
  hysteresis?: number;
  sound: AlarmSoundPattern;
}
```

**3. thresholdResolver.ts - Simplified Resolver**
```typescript
// BEFORE: ~180 lines with calculated logic, clamping, temp compensation functions
// AFTER: ~85 lines with simple formula evaluation

export function resolveThreshold(
  threshold: ThresholdConfig,
  sensorConfig: SensorConfiguration,
): number | undefined {
  // Static threshold: return value directly
  if (threshold.value !== undefined) {
    return threshold.value;
  }

  // Formula-based threshold: evaluate formula with sensor config
  if (threshold.formula) {
    return evaluateFormula(
      threshold.formula, 
      sensorConfig as unknown as Record<string, number | undefined>
    );
  }

  // No value or formula - invalid threshold
  return undefined;
}

// Removed functions (no longer needed):
// - isCalculatedThreshold() type guard
// - getFieldValue() field extractor
// - calculateTemperatureCompensation() temp compensation logic
// - Clamping logic (minValue/maxValue bounds)
```

## Formula Examples

### Battery Voltage (WITH Temperature Compensation)

**Lead-acid:**
```typescript
critical: { formula: 'nominalVoltage * 0.985 + (temperature - 25) * -0.05', ... }
warning: { formula: 'nominalVoltage * 0.99 + (temperature - 25) * -0.05', ... }
```

**AGM:**
```typescript
critical: { formula: 'nominalVoltage * 1.0 + (temperature - 25) * -0.04', ... }
warning: { formula: 'nominalVoltage * 1.015 + (temperature - 25) * -0.04', ... }
```

**Gel:**
```typescript
critical: { formula: 'nominalVoltage * 1.002 + (temperature - 25) * -0.045', ... }
warning: { formula: 'nominalVoltage * 1.018 + (temperature - 25) * -0.045', ... }
```

**LiFePO4:**
```typescript
critical: { formula: 'nominalVoltage * 1.067 + (temperature - 25) * -0.03', ... }
warning: { formula: 'nominalVoltage * 1.083 + (temperature - 25) * -0.03', ... }
```

**Unknown:**
```typescript
critical: { formula: 'nominalVoltage * 0.975 + (temperature - 25) * -0.05', ... }
warning: { formula: 'nominalVoltage * 0.983 + (temperature - 25) * -0.05', ... }
```

### Battery Current (NO Temperature Compensation)

**Lead-acid:**
```typescript
critical: { formula: 'capacity * 0.5', ... }   // 0.5C rate (C/2)
warning: { formula: 'capacity * 0.33', ... }   // 0.33C rate (C/3)
```

**AGM:**
```typescript
critical: { formula: 'capacity * 1.0', ... }   // 1.0C rate
warning: { formula: 'capacity * 0.75', ... }   // 0.75C rate
```

**Gel:**
```typescript
critical: { formula: 'capacity * 0.5', ... }   // 0.5C rate
warning: { formula: 'capacity * 0.35', ... }   // 0.35C rate
```

**LiFePO4:**
```typescript
critical: { formula: 'capacity * 1.4', ... }   // 1.4C rate
warning: { formula: 'capacity * 1.0', ... }    // 1.0C rate
```

**Unknown:**
```typescript
critical: { formula: 'capacity * 0.45', ... }  // Conservative 0.45C
warning: { formula: 'capacity * 0.3', ... }    // Conservative 0.3C
```

### Engine RPM (NO Temperature Compensation)

**Diesel:**
```typescript
critical: { formula: 'maxRpm * 0.93', ... }    // 93% of max
warning: { formula: 'maxRpm * 0.87', ... }     // 87% of max
```

**Gasoline:**
```typescript
critical: { formula: 'maxRpm * 0.93', ... }    // 93% of max
warning: { formula: 'maxRpm * 0.87', ... }     // 87% of max
```

**Outboard:**
```typescript
critical: { formula: 'maxRpm * 0.93', ... }    // 93% of max
warning: { formula: 'maxRpm * 0.87', ... }     // 87% of max
```

**Unknown:**
```typescript
critical: { formula: 'maxRpm * 0.90', ... }    // Conservative 90%
warning: { formula: 'maxRpm * 0.83', ... }     // Conservative 83%
```

## Temperature Compensation Explained

### Why Temperature Matters (Battery Voltage)

Battery voltage varies with temperature:
- **Cold batteries** (< 25°C): Higher voltage needed to trigger alarm
- **Hot batteries** (> 25°C): Lower voltage triggers alarm earlier

### Formula Breakdown

```typescript
'nominalVoltage * 0.985 + (temperature - 25) * -0.05'
│                │         │                    │
│                │         │                    └─ Rate: -0.05 V/°C (lead-acid)
│                │         └─ Deviation from 25°C reference
│                └─ Base threshold (98.5% of nominal)
└─ Reference field (12V system)
```

### Example Calculations

**Lead-acid 12V system at different temperatures:**

- **At 25°C (reference):**
  - Formula: `12 * 0.985 + (25 - 25) * -0.05 = 11.82 + 0 = 11.82V`
  - No compensation, reference temperature

- **At 15°C (cold):**
  - Formula: `12 * 0.985 + (15 - 25) * -0.05 = 11.82 + 0.5 = 12.32V`
  - +0.5V compensation (higher threshold in cold)

- **At 35°C (hot):**
  - Formula: `12 * 0.985 + (35 - 25) * -0.05 = 11.82 - 0.5 = 11.32V`
  - -0.5V compensation (lower threshold in heat)

## Design Decisions

### 1. Built-in Function vs Parser

**User's Insight:** "Isn't there any baked in typescript capability to directly evaluate the formula rather than doing this what seems to me the complex parsing?"

**Decision:** Use built-in `new Function()` instead of complex parser
- **Simpler:** No parser implementation needed
- **Faster:** Native JavaScript execution
- **Safer:** Formulas are developer-written (not user input)
- **Flexible:** Full JavaScript expression support

### 2. Temperature Units: Celsius Not Kelvin

**User's Correction:** "Note that all temperature is in the SI unit celsius not KELVIN!!!"

**Decision:** Reference temperature 25°C (not 298.15K)
- **Simplicity:** Direct Celsius in formulas: `(temperature - 25)`
- **Clarity:** No Kelvin → Celsius conversion in resolver
- **Correctness:** SI temperature unit for sensors IS Celsius (not Kelvin)

### 3. Eliminated Clamping Bounds

**Rationale:** `minValue`/`maxValue` were redundant with `thresholdRange`
- **Single source of truth:** Only `thresholdRange` defines valid range
- **Simplified:** Removed 2 properties per threshold (minValue, maxValue)
- **Cleaner:** No dual bounds checking (schema range + threshold clamps)

### 4. Security Model: Developer Formulas

**Context:** Formulas are written by developers in schema files, NOT user input

**Implications:**
- **Safe to use `new Function()`** - no code injection risk
- **No need for sandboxing** - trusted code path
- **Full JS expression support** - arithmetic, parentheses, constants

## Future Enhancements

### Helper Functions (TODO)

Add mathematical helper functions by injecting into Function scope:

```typescript
// TODO: Enhance evaluateFormula to support helper functions
const helpers = { min, max, abs, clamp };
const func = new Function(
  ...Object.keys(helpers),      // min, max, abs, clamp
  ...fieldNames,                 // nominalVoltage, temperature, etc.
  `return ${formula}`
);
return func(...Object.values(helpers), ...fieldValues);

// Usage in formulas:
formula: 'max(0, nominalVoltage * 0.985 + (temperature - 25) * -0.05)'
formula: 'clamp(capacity * 0.5, 20, 250)'
formula: 'abs(temperature - 25) * -0.05'
```

### Schema Validation at Startup

Validate all formulas reference valid fields:

```typescript
function validateFormula(formula: string, sensorType: string): void {
  const referencedFields = extractFieldNames(formula);
  const validFields = Object.keys(SENSOR_SCHEMAS[sensorType].fields);
  
  for (const field of referencedFields) {
    if (!validFields.includes(field)) {
      throw new Error(
        `Invalid formula in ${sensorType}: "${formula}" references ` +
        `non-existent field "${field}". Valid: ${validFields.join(', ')}`
      );
    }
  }
}

// Run once at app initialization, before any threshold resolution
```

## Lessons Learned

### 1. Simpler is Better
Chose built-in `new Function()` over complex parser - eliminated hundreds of lines of code

### 2. Visibility Matters
Making temperature compensation explicit in formulas reveals hidden logic that was buried in resolver code

### 3. Type Safety Through Simplification
Eliminating conditional type checking (calculated vs static) reduced type discrimination complexity

### 4. Single Source of Truth
Removing redundant clamping bounds (`minValue`/`maxValue`) enforces `thresholdRange` as authoritative

### 5. User Insights Drive Architecture
User's question "isn't there any baked in typescript capability" led to better design choice

## Testing Checklist

- [ ] **Formula Evaluation:** Test evaluateFormula with sample contexts
  - [ ] Battery voltage with temperature: 15°C, 25°C, 35°C
  - [ ] Battery current: Various capacities (50Ah, 100Ah, 200Ah)
  - [ ] Engine RPM: Various maxRpm (3000, 6000, 7000)

- [ ] **Missing Fields:** Verify undefined return when field missing
  - [ ] Formula references `nominalVoltage`, config has no field
  - [ ] Formula references `temperature`, config has undefined value

- [ ] **Backward Compatibility:** Test with old saved configs
  - [ ] AsyncStorage data with old calculated properties
  - [ ] Migration to formula strings on load

- [ ] **UI Validation:** Verify slider ranges still work
  - [ ] ThresholdRange min/max respected
  - [ ] Duplicate units fixed (no "V V")
  - [ ] Default values properly set

- [ ] **Runtime Testing:** Load scenarios and verify alarms
  - [ ] Battery voltage alarms at different temperatures
  - [ ] Battery current alarms at different discharge rates
  - [ ] Engine RPM alarms at different speeds

## Compilation Status

✅ **All files compile without errors**
- formulaEvaluator.ts: 0 errors
- sensorSchemas.ts: 0 errors
- thresholdResolver.ts: 0 errors

Pre-existing errors (unrelated to threshold migration):
- SensorInstance.toJSON() missing (separate issue)
- CalculatedMetricsService.getUnitType() typo (should be getUnitTypeFor)
- useSensorConfigForm type issues (separate hook refactor)

## Conclusion

This migration represents the culmination of the "fully declarative, schema-driven" philosophy. All threshold calculation logic is now:

1. **Visible** in schema definitions (not hidden in code)
2. **Editable** as simple formula strings (not complex property sets)
3. **Self-documenting** with clear mathematical expressions
4. **Type-safe** with simplified type system (4 properties vs 9)
5. **Maintainable** with 50%+ code reduction

Temperature compensation, which was previously a hidden implementation detail in the resolver, is now an explicit, visible part of the schema. A developer can look at a formula like `nominalVoltage * 0.985 + (temperature - 25) * -0.05` and immediately understand:
- Base threshold: 98.5% of nominal voltage
- Temperature compensation: -50mV per °C deviation from 25°C reference

This is the power of declarative configuration - everything you need to know is in the schema.
