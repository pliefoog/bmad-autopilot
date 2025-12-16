# Data Presentation System

## Overview

The data presentation system provides unit conversion, formatting, and display logic for sensor data across the application. It ensures consistent data presentation regardless of user preferences for units (metric/imperial/nautical).

## Architecture

- **presentations.ts**: Defines formatSpec for each data type (depth, speed, wind, etc.)
- **categories.ts**: Groups data types into logical categories
- **presentationStore.ts**: Manages user unit preferences (Zustand store)
- **useDataPresentation.ts**: React hook for accessing presentation logic in components

## FormatSpec Structure

Each data type has a `formatSpec` that defines:

```typescript
{
  symbol: string;       // Unit symbol (e.g., "m", "ft", "kts")
  decimals: number;     // Number of decimal places to display
  testCases: {
    min: number;        // Minimum valid value (SI units)
    max: number;        // Maximum valid value (SI units)
  };
}
```

## Requirements for Threshold-Enabled Sensors

**CRITICAL:** All sensors that support alarm thresholds MUST have complete `formatSpec` definitions including:

1. **decimals**: Used for step calculation in threshold editors
   - Step = 10^(-decimals)
   - Example: decimals: 1 → step: 0.1

2. **testCases.min**: Used for boundary enforcement (prevent invalid thresholds)
   - Defines the minimum valid value in SI units
   - Example: depth.testCases.min = 0 (cannot have negative depth)

3. **testCases.max**: Used for boundary enforcement (prevent invalid thresholds)
   - Defines the maximum valid value in SI units
   - Example: depth.testCases.max = 100 (reasonable maximum depth in meters)

### Threshold-Enabled Sensors

The following sensor types require complete formatSpec:

#### Depth Sensors
- **depth** (meters): decimals: 1, min: 0, max: 100

#### Speed Sensors
- **speed** (knots): decimals: 1, min: 0, max: 50
- **speedOverGround** (knots): decimals: 1, min: 0, max: 50

#### Wind Sensors
- **windSpeed** (knots): decimals: 1, min: 0, max: 100

#### Temperature Sensors
- **temperature** (Celsius): decimals: 1, min: -40, max: 150
- **engineTemp** (Celsius): decimals: 1, min: -40, max: 150
- **coolantTemp** (Celsius): decimals: 1, min: -40, max: 150

#### Pressure Sensors
- **pressure** (Pascals): decimals: 0, min: 0, max: 1000000
- **oilPressure** (Pascals): decimals: 0, min: 0, max: 1000000

#### Battery Sensors
- **voltage** (Volts): decimals: 1, min: 0, max: 50
- **current** (Amperes): decimals: 1, min: -500, max: 500
- **stateOfCharge** (percentage): decimals: 0, min: 0, max: 100

#### Tank Sensors
- **tankLevel** (percentage): decimals: 0, min: 0, max: 100
- **volume** (liters): decimals: 1, min: 0, max: 10000

#### Engine Sensors
- **rpm** (revolutions per minute): decimals: 0, min: 0, max: 10000

## Usage in Components

### Reading Presentation Data

```typescript
import { useDataPresentation } from '@/presentation/useDataPresentation';

function MyComponent() {
  const presentation = useDataPresentation('depth');
  
  // Access properties
  const symbol = presentation.presentation?.symbol;  // "m" or "ft" depending on settings
  const decimals = presentation.formatSpec.decimals; // 1
  const min = presentation.testCases.min;            // 0
  const max = presentation.testCases.max;            // 100
  
  // Convert from SI to display units
  const displayValue = presentation.convert(5.2);    // 5.2m or 17.1ft
  
  // Convert from display units back to SI
  const siValue = presentation.convertBack(17.1);    // 5.2 (always in SI)
  
  // Format with symbol
  const formatted = presentation.format(5.2);        // "5.2 m" or "17.1 ft"
}
```

### Using in Threshold Editors

```typescript
import { useDataPresentation } from '@/presentation/useDataPresentation';

function ThresholdEditor({ sensorType }) {
  const presentation = useDataPresentation(sensorType);
  
  // Calculate step from decimals
  const step = Math.pow(10, -presentation.formatSpec.decimals);
  // For depth: 10^(-1) = 0.1
  
  // Enforce boundaries
  const minValue = presentation.testCases.min;
  const maxValue = presentation.testCases.max;
  
  // Display with correct symbol
  const symbol = presentation.presentation?.symbol || '';
  
  return (
    <input
      type="number"
      step={step}
      min={minValue}
      max={maxValue}
      placeholder={`0.0 ${symbol}`}
    />
  );
}
```

## Adding New Threshold-Enabled Sensors

When adding a new sensor type that requires alarm thresholds:

1. **Define formatSpec in presentations.ts**:
   ```typescript
   {
     imperial: {
       symbol: 'unit',
       decimals: 1,
       testCases: { min: 0, max: 100 }
     },
     metric: { /* same structure */ },
     // ... other unit systems
   }
   ```

2. **Add to appropriate category** in categories.ts

3. **Update this README** with the new sensor in the "Threshold-Enabled Sensors" section

4. **Add default thresholds** in `src/registry/AlarmThresholdDefaults.ts`

## Validation

Before releasing changes to presentation system:

1. **Audit all threshold-enabled sensors**: Verify formatSpec completeness
2. **Test boundary enforcement**: Ensure min/max prevent invalid thresholds
3. **Test step calculation**: Verify decimals produce correct increment steps
4. **Test unit conversion**: Ensure SI ↔ display units work correctly
5. **Test across all unit systems**: Metric, imperial, nautical

## Common Issues

### Missing testCases

**Symptom**: Threshold editor allows invalid values (negative depth, speed > 1000 kts)

**Solution**: Add testCases.min and testCases.max to formatSpec

### Incorrect Step Size

**Symptom**: Threshold increments by wrong amount (0.01 instead of 0.1)

**Solution**: Verify formatSpec.decimals is correct

### Unit Conversion Errors

**Symptom**: Thresholds save with wrong values after unit change

**Solution**: Always use `presentation.convertBack()` before saving to store (stores in SI units)

## References

- **presentations.ts**: All formatSpec definitions
- **AlarmThresholdDefaults.ts**: Default threshold values (in SI units)
- **ThresholdEditor.tsx**: Component using formatSpec for threshold editing
- **useDataPresentation.ts**: Hook implementation
