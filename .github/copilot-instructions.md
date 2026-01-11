# GitHub Copilot Instructions - BMad Autopilot

## 🔴 MANDATORY DOCUMENTATION REQUIREMENT (NON-NEGOTIABLE)

**Every source file that is touched MUST be updated with comprehensive documentation.**

This is a **HARD REQUIREMENT** - no exceptions.

### Documentation Standards

**File-Level Documentation (Required for all modified files):**
```typescript
/**
 * FileName - Brief one-line description
 * 
 * Purpose:
 * - Primary responsibility of this file
 * - Secondary responsibilities
 * 
 * Key Features:
 * - Feature 1: Brief explanation
 * - Feature 2: Brief explanation
 * 
 * Critical Implementation Details:
 * - Detail 1: Why this approach was chosen
 * - Detail 2: Bug fixes and their history
 * - Detail 3: Performance considerations
 * 
 * Dependencies:
 * - Dependency 1: How it's used
 * - Dependency 2: What it provides
 * 
 * Related Files:
 * - File 1: Relationship explanation
 * - File 2: Data flow connection
 */
```

**Function/Method Documentation (Required for all non-trivial functions):**
```typescript
/**
 * Brief description of what function does
 * 
 * Implementation Notes:
 * - Why this approach was chosen
 * - Any gotchas or edge cases
 * - Performance characteristics
 * 
 * Bug Fix History (if applicable):
 * - Date: What was broken and how it was fixed
 * 
 * @param param1 - What this parameter controls
 * @param param2 - Constraints or validation rules
 * @returns What is returned and in what format
 */
```

**Inline Comments (Required for complex logic):**
- Explain WHY, not WHAT (code shows what, comments show why)
- Document bug fixes with date and explanation
- Flag performance optimizations and their rationale
- Explain React Native specific workarounds
- Document memory management strategies

**AI Agent Readability:**
- Use clear section headers with dashes or equals signs
- Document data flow with ASCII diagrams when helpful
- Explain architectural decisions and tradeoffs
- Link to related files and their relationships
- Include examples for non-obvious patterns

**Human Readability:**
- Use plain language, avoid jargon where possible
- Break complex logic into well-documented chunks
- Provide context for why code exists
- Document lessons learned from bugs
- Include testing recommendations

### Enforcement

**Before committing ANY code change:**
1. ✅ File has comprehensive header documentation
2. ✅ All modified functions have purpose comments
3. ✅ Complex logic sections have inline explanations
4. ✅ Bug fixes document what was broken and how it was fixed
5. ✅ Performance optimizations explain the reasoning
6. ✅ React Native workarounds explain the platform-specific issue

**If documentation is missing or inadequate:**
- DO NOT commit the code
- Add comprehensive documentation first
- Ensure both humans and AI agents can understand the code without external context

This requirement applies to:
- ✅ New files (full documentation required)
- ✅ Modified files (update existing docs + document changes)
- ✅ Bug fixes (document what was broken and the fix)
- ✅ Refactors (explain why old approach was replaced)
- ✅ Performance optimizations (document measurements and reasoning)

## Critical React Hooks Rules (MUST FOLLOW)

**⚠️ Rules of Hooks - Unconditional Execution (Jan 2025):**

React Hooks MUST be called:
1. At the top level (not inside loops, conditions, or nested functions)
2. In the same order every render
3. BEFORE any early return statements

**Violation #1: Hooks After Early Return**
```tsx
// ❌ WRONG - Hooks called after early return
export const Widget = ({ data }) => {
  const config = useStore(state => state.config);
  
  if (!data) return null;  // Early return
  
  const value = useNmeaStore(state => state.data);  // ERROR: Hook after return
  const formatted = useMemo(() => format(value), [value]);  // ERROR: Hook after return
  
  return <View>{formatted}</View>;
};

// ✅ CORRECT - All hooks before early return
export const Widget = ({ data }) => {
  const config = useStore(state => state.config);
  const value = useNmeaStore(state => state.data);
  const formatted = useMemo(() => format(value), [value]);
  
  if (!data) return null;  // Early return AFTER all hooks
  
  return <View>{formatted}</View>;
};
```

**Violation #2: Hooks Inside Conditionals**
```tsx
// ❌ WRONG - Hook inside if block
if (__DEV__) {
  const renderCount = useRef(0);  // ERROR: Conditional hook
  useEffect(() => {  // ERROR: Conditional hook
    console.log('renders:', renderCount.current++);
  });
}

// ✅ CORRECT - Hook called unconditionally, logic inside
const renderCount = useRef(0);
useEffect(() => {
  if (!__DEV__) return;  // Conditional logic INSIDE hook
  console.log('renders:', renderCount.current++);
});
```

**Violation #3: Hooks in Ternary/Logical Operators**
```tsx
// ❌ WRONG - Hook in ternary expression
const touchTargetSize = tvMode 
  ? platformTokens.touchTarget 
  : useTouchTargetSize();  // ERROR: Conditional hook call

// ✅ CORRECT - Hook called unconditionally, result used conditionally
const touchTargetSizeHook = useTouchTargetSize();
const touchTargetSize = tvMode 
  ? platformTokens.touchTarget 
  : touchTargetSizeHook;

// ❌ WRONG - Hook in logical AND
const data = isEnabled && useDataFetch();  // ERROR: Conditional hook

// ✅ CORRECT - Hook unconditional, result used conditionally
const fetchedData = useDataFetch();
const data = isEnabled ? fetchedData : null;
```

**Why This Matters:**
- Violating Rules of Hooks causes "Maximum update depth exceeded" crashes
- React throws "React has detected a change in the order of Hooks" errors
- Zustand stores with devtools + high-frequency updates (NMEA at 2Hz) amplify the issue
- ESLint rule `react-hooks/rules-of-hooks: error` catches these at lint-time

**Fixed Violations (Jan 2025):**
- `CustomWidget.tsx`: 5 hooks after early return (lines 190, 195, 202, 210, 239)
- `stateManagementOptimization.ts`: 3 hooks inside `if(__DEV__)` (lines 547, 548, 550)
- `PlatformButton.tsx`: 1 hook in ternary expression (line 110)

**ESLint Configuration:**
```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",  // Catches conditional hooks
    "react-hooks/exhaustive-deps": "warn"   // Catches missing dependencies
  }
}
```

## Critical React Native Rules

**⚠️ JSX Comment Syntax (NEVER use `//` inside JSX):**
```tsx
// ❌ WRONG - React Native treats // as text node
{isNarrow ? (
  // Mobile layout
  <View>...</View>
) : (
  // Desktop layout
  <View>...</View>
)}

// ✅ CORRECT - Use {/* */} for JSX comments
{isNarrow ? (
  {/* Mobile layout */}
  <View>...</View>
) : (
  {/* Desktop layout */}
  <View>...</View>
)}
```

**Text Nodes Must Be Wrapped:**
- ❌ `<View>dummy text</View>` - Error: text node cannot be child of View
- ✅ `<View><Text>dummy text</Text></View>` - Correct

**⚠️ CRITICAL: Conditional Rendering Text Node Leaks (Dec 2024 Bug):**
```tsx
// ❌ DANGEROUS - Double && can leak intermediate string values
{unit && unit.trim() !== '' && (
  <Text>({unit})</Text>
)}
// If unit = ".", evaluates: "." && true → renders "." as text node!

// ✅ CORRECT - Use ternary with explicit null
{unit && unit.trim() !== '' ? (
  <Text>({unit})</Text>
) : null}

// ✅ ALSO CORRECT - Single condition is safe
{unit && <Text>({unit})</Text>}
```

**Why This Matters:**
- The `&&` operator in JSX returns the last truthy value
- Chaining multiple conditions: `{value && otherCheck && <Component />}` can leak `value` as text
- React renders truthy strings/numbers as text nodes (violates React Native Web rules)
- ESLint's `react-native/no-raw-text` only catches static text, not dynamic leaks
- **Always use ternary `? :` for multi-condition rendering in React Native**

**⚠️ DEBUGGING TEXT NODE ERRORS:**
```bash
# Run Expo's linter to catch "Unexpected text node: . A text node cannot be a child of a <View>." errors
npx expo lint

# Or use ESLint directly for more control
npx eslint src --ext .tsx,.ts --rule 'react-native/no-raw-text: error'
```

The `react-native/no-raw-text` rule in `.eslintrc.json` catches text nodes outside `<Text>` components. Common causes:
- String values rendered directly: `{someString}` instead of `<Text>{someString}</Text>`
- Periods or special characters: `{unit}` when unit is "."
- Multi-condition `&&` chains leaking intermediate values
- Comments using wrong syntax: `{/* comment */}` in TypeScript code (use `//` instead)

**No Manual Formatting in Widgets:**
- ❌ `value.toFixed(1)` - Widgets don't format data
- ✅ `metricValue?.formattedValue` - Use pre-enriched MetricValue properties
- All formatting happens in `ConversionRegistry`, MetricValue caches enriched values

## MetricValue API Convention (CRITICAL)

**SensorInstance stores MetricValue objects** with standardized property names:

```typescript
// MetricValue properties (after enrich() is called):
{
  si_value: 2.5,                    // Original SI value (meters)
  category: 'depth',                // Data category
  value: 8.2,                       // Converted display value (feet)
  unit: 'ft',                       // Unit symbol
  formattedValue: '8.2',            // Formatted WITHOUT unit ⭐ USE THIS
  formattedValueWithUnit: '8.2 ft'  // Formatted WITH unit
}
```

**Widget Access Pattern:**
```typescript
// Get SensorInstance from store
const depthInstance = useNmeaStore(
  (state) => state.nmeaData.sensors.depth?.[0],
  (a, b) => a === b
);

// Extract MetricValue for a specific metric
const depthMetric = depthInstance?.getMetric('depth');

// Access pre-enriched properties
const displayValue = depthMetric?.formattedValue;  // "8.2" ✅ CORRECT
const displayWithUnit = depthMetric?.formattedValueWithUnit;  // "8.2 ft"
const numericValue = depthMetric?.value;  // 8.2
const unit = depthMetric?.unit;  // "ft"
```

**⚠️ NEVER:**
- Use `formatted` (old property name, doesn't exist)
- Use `formattedWithUnit` (old property name, doesn't exist)  
- Manual formatting with `.toFixed()` - use pre-enriched values

**✅ ALWAYS:**
- Use `formattedValue` for display without unit
- Use `formattedValueWithUnit` for display with unit
- Access via `sensorInstance.getMetric(fieldName)`

## Registry-First Widget Architecture (Dec 2024)

**Philosophy:** Widgets are pure configuration, zero logic. All metadata in `SensorConfigRegistry`, all rendering in reusable components.

**🔴 MANDATORY: Explicit Props Pattern (Jan 2025 Refactor)**

**ALL widgets and cell components MUST pass sensor information explicitly as props.**

**NEVER use React Context for sensor data propagation** - this pattern was deprecated in January 2025. The old `useSensorContext()` hook and `SensorContext.Provider` have been removed from the codebase.

**Required Pattern:**
```tsx
// ✅ CORRECT - Explicit props
<PrimaryMetricCell sensorType="depth" instance={0} metricKey="depth" />
<SecondaryMetricCell sensorType="battery" instance={0} metricKey="voltage" />
<TrendLine sensorType="wind" instance={0} metricKey="speed" timeWindowMs={300000} />

// ❌ WRONG - Context-based (deprecated, will not compile)
<PrimaryMetricCell metricKey="depth" />  // Missing sensorType and instance
<PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />  // Old sensorKey prop removed
```

**Type Safety:**
All cell components require `SensorMetricProps<TMetricKey>` which enforces:
- `sensorType: keyof SensorsData` - Which sensor type (depth, battery, etc.)
- `instance: number` - Sensor instance number (0 for single, 0+ for multiple)
- `metricKey: TMetricKey` - Specific metric field name

**Multi-Sensor Widgets:**
When a widget uses multiple sensor types (e.g., SpeedWidget with both 'speed' and 'gps'), explicitly differentiate:
```tsx
{/* GPS sensor metrics */}
<PrimaryMetricCell sensorType="gps" instance={0} metricKey="speedOverGround" />

{/* Speed sensor metrics */}
<PrimaryMetricCell sensorType="speed" instance={0} metricKey="throughWater" />
```

**Custom/Dynamic Widgets:**
For widgets with dynamic configuration, create a helper function to resolve sensor type and instance from the configuration, then pass explicit props to all cells.

**✅ Declarative Widget Pattern:**
```tsx
export const BatteryWidget: React.FC<BatteryWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorType="battery"
      instanceNumber={instanceNumber}
      testID={id}
    >
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="voltage" />
      <PrimaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="current" />
      <SecondaryMetricCell sensorType="battery" instance={instanceNumber} metricKey="capacity" />
    </TemplatedWidget>
  );
});

BatteryWidget.displayName = 'BatteryWidget';

export default BatteryWidget;
```

**Grid Templates** (`GridTemplateRegistry.ts`):
- `2Rx2C-SEP-2Rx2C`: Two rows of 2 columns (primary) + separator + two rows of 2 columns (secondary)
- `2Rx2C-SEP-2Rx2C-WIDE`: Same but secondary cells span full width
- `2Rx1C-SEP-2Rx1C`: Simple vertical layout
- `4Rx2C-NONE`: Dense 4-row primary grid
- `3Rx2C-SEP-1Rx2C`: 3-row primary + 1-row secondary

**Widget Sensor & Metric Reference Pattern (CRITICAL):**

**Single Sensor Widget:**
```tsx
<TemplatedWidget
  template="2Rx1C-SEP-2Rx1C"
  sensorType="depth"
  instanceNumber={instanceNumber}
>
  {/* All cells require explicit sensorType and instance */}
  <PrimaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth" />
  <TrendLine sensorType="depth" instance={instanceNumber} metricKey="depth" timeWindowMs={300000} />
  
  {/* Virtual stat metrics using dot notation */}
  <SecondaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth.min" />
  <SecondaryMetricCell sensorType="depth" instance={instanceNumber} metricKey="depth.max" />
</TemplatedWidget>
```

**Multi-Sensor Widget:**
```tsx
// Primary sensor: speed (STW), Additional sensor: gps (SOG)
<TemplatedWidget
  template="2Rx2C-SEP-2Rx2C"
  sensorType="speed"
  instanceNumber={instanceNumber}
  testID={id}
>
  {/* GPS metrics use explicit sensorType="gps" */}
  <PrimaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="speedOverGround" />
  <PrimaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="speedOverGround.max" />
  
  {/* Speed metrics use explicit sensorType="speed" */}
  <PrimaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="throughWater" />
  <PrimaryMetricCell sensorType="speed" instance={instanceNumber} metricKey="throughWater.avg" />
</TemplatedWidget>
```

**Virtual Stat Metrics (Session Stats):**
```tsx
// Dot notation for computed statistics (calculated in SensorInstance.getMetric())
<PrimaryMetricCell sensorType="depth" instance={0} metricKey="depth.min" />        // MIN DEPTH
<PrimaryMetricCell sensorType="depth" instance={0} metricKey="depth.max" />        // MAX DEPTH  
<SecondaryMetricCell sensorType="depth" instance={0} metricKey="depth.avg" />      // AVG DEPTH

// Works with any numeric metric field
<PrimaryMetricCell sensorType="gps" instance={0} metricKey="speedOverGround.max" />  // MAX SOG
<SecondaryMetricCell sensorType="weather" instance={0} metricKey="pressure.avg" />   // AVG pressure
```

**How Virtual Metrics Work:**
1. Component strips `.min/.max/.avg` suffix to look up field config in registry
2. Calls `sensorInstance.getMetric('fieldName.stat')` which:
   - Parses suffix using regex `/\.(min|max|avg)$/`
   - Fetches history buffer via `getHistory(fieldName)`
   - Calculates stat: `Math.min/max()` or average
   - Returns enriched MetricValue with proper units/formatting
3. Component adds stat prefix to mnemonic: "MIN DEPTH", "MAX SOG"

**Direct Store Access Pattern:**
```tsx
{/* MetricCells receive sensor info explicitly and fetch from store */}
<PrimaryMetricCell sensorType="battery" instance={0} metricKey="voltage" />
{/* Internally calls: useMetric(sensorType, instance, metricKey) */}
{/* Fetches: mnemonic, value, unit, alarm state, category config */}
```

**⚠️ CRITICAL RULES:**
- **Explicit props required:** ALL cells MUST receive `sensorType`, `instance`, `metricKey` as direct props
- **No context propagation:** NEVER use `useSensorContext()` or `SensorContext.Provider` (deprecated Jan 2025)
- **Multi-sensor widgets:** Explicitly differentiate with different `sensorType` values
- **Virtual metrics:** ALWAYS use dot notation (`.min`, `.max`, `.avg`) NOT underscore
- **String fields:** Access directly (e.g., `metricKey="name"`) - NOT virtual metrics
- **Base metric name:** Used for registry lookup (strips virtual suffix automatically)

**Widget File Standards (MANDATORY):**
- ✅ Use default imports: `import TemplatedWidget from` (NOT `import { TemplatedWidget } from`)
- ✅ Use `testID={id}` (NOT `testID={\`widget-\${instanceNumber}\`}`)
- ✅ Add `displayName = 'WidgetName'` before export for React DevTools
- ✅ Accept `instanceNumber` prop with default 0 (NOT regex extraction from id)
- ✅ Keep documentation brief (9-12 lines max) - template, metrics, pattern note
- ✅ Consistent import order: React, components, then types

**Mandatory Mnemonics:**
All sensor fields MUST have `mnemonic: string` in `SensorConfigRegistry`. Startup validation throws if missing.

**⚠️ ANTI-PATTERNS:**
- ❌ Manual metric extraction in widgets
- ❌ Creating display data objects
- ❌ Hardcoded mnemonics
- ❌ Using React Context for sensor data (deprecated)
- ❌ Widget-specific logic (belongs in SensorInstance)
- ❌ Implicit sensor props via context
- ❌ Named imports for TemplatedWidget/TrendLine
- ❌ Constructed testID strings
- ❌ Regex extraction of instanceNumber from id
- ❌ Missing displayName for React DevTools
- ❌ Verbose documentation blocks (keep 9-12 lines)

**✅ CORRECT PATTERNS:**
- ✅ Explicit props: `sensorType="X" instance={N} metricKey="Y"`
- ✅ Template name + explicit cells = entire widget
- ✅ Let TemplatedWidget handle layout
- ✅ Let MetricCells fetch via useMetric hook
- ✅ Keep widgets <70 lines (avg 25-60 lines)
- ✅ SensorInstance methods for computed metrics
- ✅ Default imports for all components
- ✅ Direct `testID={id}` prop usage
- ✅ `displayName` for all widgets
- ✅ Accept `instanceNumber` prop (no extraction)
- ✅ Brief focused documentation

**Results:**
- 77% code reduction (855 → 183 lines across 3 widgets)
- Zero duplication
- XML-ready structure
- Type-safe throughout
- Self-documenting widget declarations (Jan 2025 improvement)

## Project Overview

**React Native cross-platform marine instrument display** connecting to boat NMEA networks via WiFi bridges. Runs entirely on-device (no server), transforming smartphones/tablets/desktops into comprehensive marine displays with Raymarine autopilot control.

**Tech Stack:** React Native (Expo), TypeScript, Zustand state management, **Self-contained NMEA 0183/2000 parsing** (no external dependencies), WebSocket/TCP/UDP native modules

**⚠️ CRITICAL: Self-Contained NMEA Architecture (Jan 2025)**
- **NO external NMEA parsing libraries** - nmea-simple and @canboat/canboatjs removed
- **ALL NMEA parsing done in-house:**
  - PureNmeaParser.ts: NMEA 0183 sentence parsing (15+ message types)
  - pgnParser.ts: NMEA 2000 PGN parsing (10+ PGN types)
  - autopilotService.ts: PGN encoding for transmission
- **100% self-contained** - complete control over parsing logic, zero dependency risk
- **Comprehensive coverage:** Depth, Speed, Wind, GPS, Engine, Battery, Tank, Temperature, etc.
- **Manual byte-level parsing** with proper endianness, invalid value detection, unit conversions

## Architecture Overview

### Core Data Flow (CRITICAL to understand)

```
                                    ┌─────────────────────────────────┐
                                    │      NMEA Network (Boat)        │
                                    └──────────────┬──────────────────┘
                                                   │
                                    ┌──────────────▼──────────────────┐
                                    │   Connection Layer (WS/TCP)     │
                                    └──────────────┬──────────────────┘
                                                   │
                                    ┌──────────────▼──────────────────┐
                                    │   Parser Layer (NMEA 0183/2000) │
                                    └──────────────┬──────────────────┘
                                                   │
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │                  nmeaStore (SI units)                        │
                    │            SINGLE SOURCE OF TRUTH                            │
                    └──────────────┬───────────────────────────┬───────────────────┘
                                   │                           │
                    ┌──────────────▼──────────┐   ┌───────────▼──────────────────┐
                    │ SensorPresentationCache │   │ ThresholdPresentationService │
                    │  (Live sensor data)     │   │   (Threshold configuration)  │
                    │  • Runs on update       │   │   • On-demand (memoized)     │
                    │  • Caches display info  │   │   • Returns enriched info    │
                    └──────────────┬──────────┘   └───────────┬──────────────────┘
                                   │                           │
                    ┌──────────────▼──────────┐   ┌───────────▼──────────────────┐
                    │    Widgets (Display)    │   │  SensorConfigDialog (Edit)   │
                    │  sensor.display.depth   │   │  enrichedThresholds.display  │
                    │    .formatted           │   │    .critical.value           │
                    └─────────────────────────┘   └──────────────────────────────┘
```

**Two Parallel Enrichment Paths:**
1. **Live Data → Widgets**: SensorPresentationCache runs once per sensor update
2. **Config Data → Dialog**: ThresholdPresentationService runs on-demand (memoized)

**1. Connection Layer** (`src/services/nmea/connection/`)
   - `PureConnectionManager.ts` - Manages WebSocket/TCP connections
   - `NmeaConnectionManager.ts` - React wrapper with lifecycle

**2. Parser Layer** (`src/services/nmea/`)
   - `PureNmeaParser.ts` - NMEA 0183/2000 sentence parsing
   - `NmeaSensorProcessor.ts` - Transforms parsed messages to sensor data
   - `PureStoreUpdater.ts` - Applies updates to store (pure function)

**3. Store Layer** (`src/store/`)
   - `nmeaStore.ts` - **SINGLE SOURCE OF TRUTH** for all sensor data
   - Uses Zustand with DevTools for time-travel debugging
   - Stores `SensorInstance` objects (not plain data)
   - `sensors: { depth: {0: SensorInstance}, engine: {0: SensorInstance}, ... }`

**4. Enrichment Layer** (`src/types/` & `src/utils/`)
   - `MetricValue.ts` - **Encapsulates single sensor metric** with SI + enriched display values
   - `SensorInstance.ts` - **Manages sensor lifecycle**, metrics Map, history, thresholds
   - `ConversionRegistry.ts` - **SI ↔ display unit conversion** (singleton)
   - Auto-enrichment: SensorInstance.updateMetrics() → MetricValue.enrich() → cached display values
   - Example: updateMetrics({depth: 2.5}) → MetricValue{si_value: 2.5, value: 8.2, formattedValue: '8.2', unit: 'ft'}

**5. Widget Layer** (`src/widgets/`)
   - Widgets read **SensorInstance from nmeaStore** using selectors
   - Extract **MetricValue** via `sensorInstance.getMetric(fieldName)`
   - Never transform/convert data - use pre-enriched `formattedValue` property
   - Pattern: `depthInstance?.getMetric('depth')?.formattedValue`

**6. Widget Registration** (`src/services/WidgetRegistrationService.ts`)
   - Event-driven widget detection (not polling)
   - Tracks sensor dependencies per widget type
   - Updates `widgetStore` when sensors appear/disappear

### Critical Patterns

**✅ Widget Data Access Pattern (UNIFIED METRIC ARCHITECTURE):**
```typescript
// Read SensorInstance from nmeaStore
const depthInstance = useNmeaStore(
  (state) => state.nmeaData.sensors.depth?.[0], 
  (a, b) => a === b  // Shallow equality for optimization
);

// Extract MetricValue for specific field
const depthMetric = depthInstance?.getMetric('depth');

// Access pre-enriched properties (NO manual formatting!)
const depth = depthMetric?.si_value;              // 2.5 (SI units - meters)
const displayValue = depthMetric?.formattedValue; // "8.2" (no unit) ⭐ PRIMARY
const displayWithUnit = depthMetric?.formattedValueWithUnit; // "8.2 ft" (with unit)
const numericValue = depthMetric?.value;          // 8.2 (converted number)
const unit = depthMetric?.unit;                   // "ft"

// MetricValue API surface:
// {
//   si_value: 2.5,                    // Immutable SI value
//   category: 'depth',                // Immutable category
//   value: 8.2,                       // Converted display value
//   unit: 'ft',                       // Unit symbol
//   formattedValue: '8.2',            // Formatted WITHOUT unit ⭐
//   formattedValueWithUnit: '8.2 ft', // Formatted WITH unit
//   convertToDisplay: (si) => ...,    // SI → display
//   convertToSI: (display) => ...,    // display → SI
//   getAlarmState: (thresholds) => ...// Alarm checking
// }
```

**✅ Store Methods:**
```typescript
// Get SensorInstance
const instance = useNmeaStore.getState().getSensorInstance('depth', 0);

// Get history for a metric
const history = useNmeaStore.getState().getSensorHistory('depth', 0, 'depth');

// Get session stats
const stats = useNmeaStore.getState().getSessionStats('depth', 0, 'depth');
// Returns: { min, max, avg }

// Update sensor data (creates SensorInstance if needed)
useNmeaStore.getState().updateSensorData('depth', 0, { depth: 2.5, offset: 0.3 });
```

**✅ Logging Pattern (Conditional, Zero-Overhead):**
```typescript
import { log } from '@/utils/logging/logger';

// NEVER: console.log() - these were mass-removed from codebase
// ALWAYS: Use conditional logger with lazy evaluation
log.depth('Processing depth', () => ({ 
  value: depthValue,
  expensive: calculateSomething()  // Only runs if logging enabled
}));
```

**❌ ANTI-PATTERNS to avoid:**
- Adding `console.log()` statements (removed by cleanup scripts)
- Transforming sensor data in widgets - use `metricValue.formattedValue`
- Accessing old `display` fields (doesn't exist - use `getMetric()`)
- Using old property names: `formatted`, `formattedWithUnit` (use `formattedValue`, `formattedValueWithUnit`)
- Manual formatting with `.toFixed()` - MetricValue handles it
- Calling `getMetric()` multiple times - memoize the result
- Polling stores for changes (use Zustand selectors with equality checks)
- Non-null assertions without validation (`field.category!`)

**✅ PERFORMANCE BEST PRACTICES:**
- Memoize MetricValue extraction: `const metric = useMemo(() => instance?.getMetric('depth'), [instance])`
- Use primitive selectors for performance: `(state) => state.nmeaData.sensors.depth?.[0]`
- Shallow equality checks: `(a, b) => a === b`
- Only re-enrich on unit changes (ReEnrichmentCoordinator handles this)
- Always validate MetricValue exists before accessing properties

## Development Workflows

### Build Instructions

#### Development Builds

**Web (Primary Development Platform):**
```bash
# 1. Install dependencies
cd boatingInstrumentsApp && npm install

# 2. Start web development server
npm run web
# Opens at http://localhost:8081
# Hot reload enabled - changes apply immediately
# No rebuild required for code changes
```

**iOS (Requires macOS):**
```bash
# 1. Install dependencies
cd boatingInstrumentsApp && npm install

# 2a. Build and run on SIMULATOR (default)
npx expo run:ios
# Automatically handles CocoaPods installation
# Starts Metro bundler
# Installs app on iOS simulator
# Enables Fast Refresh for live updates

# 2b. Build and run on PHYSICAL DEVICE
npx expo run:ios --device
# Automatically handles CocoaPods installation
# Lists all connected iOS devices
# Select device from list
# Requires Apple Developer account (free or paid)
# Requires device to be trusted in Xcode

# CRITICAL: First-time app install will fail with "profile has not been explicitly trusted"
# After build completes, trust the developer profile on device:
# Settings → General → VPN & Device Management → Developer App → Trust "[Your Apple ID]"
# Then you need to manually start Metro bundler (see below)

# CRITICAL: Start Metro bundler after build completes
# The build command may exit without keeping Metro running, so start it manually:
npx expo start
# Metro will serve the JS bundle to the device
# Keep this terminal running while developing
# Device should auto-connect if on same WiFi network

# MANUAL CONFIGURATION (if auto-discovery fails):
# iOS requires Expo protocol scheme for manual configuration
# 1. Find Mac's IP: ifconfig | grep "inet " | grep -v 127.0.0.1
# 2. Shake device → "Configure Bundler"
# 3. Enter: exp://192.168.1.X:8081 (replace X with your Mac's IP)
# IMPORTANT: Use exp:// not http:// - iOS requires Expo protocol scheme

# RECOMMENDED: Use tunneling if network discovery fails
# If device can't discover Metro (common with firewalls, multiple networks):
npm install -g @expo/ngrok
npx expo start --tunnel
# This creates a public URL that works from any network
# Device will automatically connect via tunnel
# Slower than local but more reliable for complex network setups

# Alternative: Specify device by name
npx expo run:ios --device "John's iPhone"

# Alternative: List available devices first
xcrun xctrace list devices

# IMPORTANT: Physical Device Requirements
# - Connect iPhone/iPad via USB cable
# - Trust computer on device (popup when first connected)
# - Enable Developer Mode: Settings → Privacy & Security → Developer Mode (iOS 16+)
# - Apple ID signed in to Xcode: Xcode → Settings → Accounts
# - Automatic signing: Xcode will create free provisioning profile
# - Device must be on same WiFi network as dev machine for hot reload

# Note: After installing new native modules (e.g., NetInfo):
# - Just rebuild with npx expo run:ios (handles CocoaPods automatically)
# - DO NOT run npx pod-install separately (deprecated)
```

**Android (All Platforms):**
```bash
# 1. Install dependencies
cd boatingInstrumentsApp && npm install

# 2. Build and run development build
npx expo run:android
# Automatically starts Metro bundler
# Installs app on connected device/emulator
# Enables Fast Refresh for live updates

# Alternative: List devices
adb devices

# Note: After installing new native modules (e.g., NetInfo):
# - Rebuild with npx expo run:android (Gradle handles native deps)
```

**Development Build Notes:**
- Web: Instant refresh, no native modules (TCP/UDP unavailable)
- iOS/Android: Requires rebuild after native module changes
- Metro bundler serves JS code (shared across iOS/Android)
- Fast Refresh applies code changes without losing app state

#### Production Builds

**Web (Static Site):**
```bash
# 1. Build optimized production bundle
cd boatingInstrumentsApp && npm run build:web
# Outputs to boatingInstrumentsApp/web-build/
# Minified, tree-shaken, optimized assets

# 2. Test production build locally
npx serve web-build
# Opens at http://localhost:3000

# 3. Deploy to hosting (examples)
# Netlify: Drag web-build folder to Netlify drop zone
# Vercel: vercel web-build
# GitHub Pages: Copy web-build/* to gh-pages branch
```

**iOS (App Store / TestFlight):**
```bash
# Prerequisites:
# - Apple Developer account ($99/year)
# - EAS CLI: npm install -g eas-cli
# - eas.json configured (already in repo)

# 1. Login to Expo account
eas login

# 2. Configure iOS bundle identifier (first time only)
eas build:configure

# 3. Build production iOS app (.ipa)
eas build --platform ios --profile production
# Builds on Expo servers (no local Xcode required)
# Takes 10-20 minutes
# Downloads .ipa file when complete

# 4. Submit to App Store
eas submit --platform ios --latest
# Prompts for Apple ID credentials
# Uploads to App Store Connect
# Submit for review in App Store Connect dashboard

# Alternative: Build for TestFlight (internal testing)
eas build --platform ios --profile preview
```

**Android (Google Play / APK):**
```bash
# Prerequisites:
# - Google Play Developer account ($25 one-time)
# - EAS CLI: npm install -g eas-cli
# - eas.json configured (already in repo)

# 1. Login to Expo account
eas login

# 2. Configure Android package name (first time only)
eas build:configure

# 3. Build production Android app (.aab)
eas build --platform android --profile production
# Builds Android App Bundle for Play Store
# Takes 10-20 minutes
# Downloads .aab file when complete

# 4. Submit to Google Play
eas submit --platform android --latest
# Uploads to Google Play Console
# Submit for review in Play Console dashboard

# Alternative: Build APK for direct distribution
eas build --platform android --profile preview
# Downloads .apk file for sideloading
```

**Production Build Notes:**
- Web: Static files, can host anywhere (Netlify, Vercel, S3)
- iOS: Requires Apple Developer account, uses App Store Connect
- Android: Requires Google Play Developer account, uses Play Console
- EAS Build: Cloud build service (free tier: 30 builds/month)
- Local builds: Possible with `npx expo prebuild` but not recommended

**iOS UDP Multicast Networking (NMEA 239.2.1.1:10110):**
- **Requires Paid Apple Developer Program** ($99/year) for multicast entitlement
- **Free "Personal Team" accounts cannot use multicast** - build will fail with provisioning profile error
- Entitlement location: `ios/easyNAVpro/easyNAVpro.entitlements`
- Currently commented out for free account compatibility
- **Alternatives for Free Accounts:**
  - TCP: Host 192.168.1.X, Port 2000 (direct device connection)
  - WebSocket: Host localhost, Port 8080 (nmea-bridge simulator)
- **Android:** No multicast restrictions - UDP multicast works on all accounts
- **To Enable iOS Multicast:**
  1. Upgrade to paid Apple Developer Program
  2. Uncomment `com.apple.developer.networking.multicast` in entitlements file
  3. Rebuild with `npx expo run:ios --device`
  4. Multicast implementation verified in `PureConnectionManager.ts` (socket.addMembership)

**Build Profiles** (eas.json):
- `production`: App Store/Play Store releases (optimized, signed)
- `preview`: TestFlight/internal testing (development signing)
- `development`: Local development builds (debugging enabled)

**First-Time Setup:**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login (create account at expo.dev if needed)
eas login

# Initialize project (already done in this repo)
eas build:configure

# Generate app signing credentials (iOS/Android)
# Follow prompts - EAS manages certificates automatically
eas build --platform ios
eas build --platform android
```

### Start Development Environment

**Use VS Code Tasks (Ctrl+Shift+P → Tasks: Run Task):**
- `Start Full Web Development Stack` - Launches web server + NMEA simulator
- `Start NMEA Bridge: Scenario - Coastal Sailing` - Realistic test data
- `Stop NMEA Bridge Simulator` - Clean shutdown

**Manual commands (if needed):**
```bash
# Web development
cd boatingInstrumentsApp && npm run web

# With simulator
cd boatingInstrumentsApp && node server/nmea-bridge.js --scenario ../marine-assets/test-scenarios/navigation/coastal-sailing.yml --loop
```

### Debugging Tools (Use in Order)

**1. PRIMARY: Zustand DevTools**
- Browser DevTools → Redux tab
- See ALL state changes with time-travel
- Zero performance overhead when closed
- All stores configured: NMEA, Widget, Theme, Settings, Alarm, Toast, etc.

**2. SECONDARY: Conditional Logs (Execution Flow Only)**
```javascript
// Runtime control in browser console
enableLog('nmea.depth')           // Enable depth NMEA logs
enableLog('widget.registration')  // Enable widget detection logs
enableLogNamespace('nmea')        // Enable ALL nmea.* logs
listEnabledLogs()                 // See what's active
```

Available categories: `nmea.*`, `widget.*`, `store.*`, `performance.*`, `ui.*`

**3. TERTIARY: React Profiler**
- Wrap slow components: `<ProfiledComponent id="DepthWidget">...</ProfiledComponent>`
- Warns if render takes >16ms

### Common Tasks

**Add new sensor type:**
1. Define type in `src/types/SensorData.ts`
2. Add parser logic in `src/services/nmea/NmeaSensorProcessor.ts`
3. Register display config in `src/registry/SensorConfigRegistry.ts`
4. Create widget in `src/widgets/` following existing pattern
5. Register widget in `src/config/builtInWidgetRegistrations.ts`

**Fix widget not updating:**
1. Check `nmeaStore.nmeaData.sensors.{type}` has data (Zustand DevTools)
2. Verify `display` field exists (enrichment working)
3. Check widget selector equality function: `(a, b) => a === b`
4. Enable logging: `enableLog('widget.{type}')` and `enableLog('nmea.{type}')`

**Add conditional logging:**
1. Import: `import { log } from '@/utils/logging/logger';`
2. Use category method: `log.depth()`, `log.engine()`, `log.widgetRegistration()`
3. Lazy evaluation: `log.depth('msg', () => expensiveData)`
4. Test: `enableLog('nmea.depth')` in browser console

## File Organization

```
boatingInstrumentsApp/src/
├── services/
│   ├── nmea/
│   │   ├── connection/          # WebSocket/TCP management
│   │   ├── parsing/             # Self-contained NMEA 0183 parsers
│   │   │   └── PureNmeaParser.ts  # ⭐ 15+ message types, zero dependencies
│   │   ├── data/                # Sensor processing & store updates
│   │   │   └── NmeaSensorProcessor.ts # 30+ sentence handlers
│   │   ├── pgnParser.ts         # ⭐ Self-contained NMEA 2000 PGN parser (10+ PGNs)
│   │   └── instanceDetection.ts # Multi-sensor detection (deprecated)
│   ├── autopilotService.ts      # ⭐ Raymarine control + manual PGN encoding
│   ├── SensorPresentationCache.ts  # Display caching (SI → user units)
│   └── WidgetRegistrationService.ts # Event-driven widget detection
├── store/                       # Zustand stores (SINGLE SOURCE OF TRUTH)
│   ├── nmeaStore.ts            # **Primary data store**
│   ├── widgetStore.ts          # Widget layout/visibility
│   └── [other stores]
├── widgets/                     # Marine instrument widgets
│   ├── DepthWidget.tsx         # Follow this pattern for data access
│   ├── EngineWidget.tsx        
│   └── [15 total widgets]
├── registry/
│   ├── SensorConfigRegistry.ts # Sensor metadata & display config
│   └── WidgetMetadataRegistry.ts
├── utils/
│   └── logging/
│       └── logger.ts           # **Conditional logging system**
└── types/
    ├── SensorData.ts           # Sensor type definitions
    ├── MetricValue.ts          # Single metric encapsulation
    └── SensorInstance.ts       # Sensor lifecycle management
```

**Key files to understand:**
- `src/store/nmeaStore.ts` - Where ALL sensor data lives
- `src/services/nmea/parsing/PureNmeaParser.ts` - ⭐ Self-contained NMEA 0183 parser
- `src/services/nmea/pgnParser.ts` - ⭐ Self-contained NMEA 2000 PGN parser
- `src/services/autopilotService.ts` - ⭐ Manual PGN encoding for Raymarine
- `src/widgets/DepthWidget.tsx` - Reference implementation for widget patterns
- `src/services/nmea/data/NmeaSensorProcessor.ts` - NMEA → sensor data transform
- `src/utils/logging/logger.ts` - Conditional logging implementation

## NMEA Parsing Architecture (Self-Contained - Jan 2025)

**⚠️ CRITICAL: Zero external dependencies for NMEA parsing**

### PureNmeaParser.ts - NMEA 0183 Parsing
**Location:** `src/services/nmea/parsing/PureNmeaParser.ts`
**Purpose:** Parse NMEA 0183 ASCII sentences without external libraries
**Supported Messages (15+):**
- **Navigation:** GGA, RMC, GLL, VTG (GPS position, speed, track)
- **Depth:** DBT, DPT, DBK (depth below transducer/keel)
- **Speed:** VHW (speed through water, heading)
- **Wind:** MWV, VWR, VWT (wind speed/angle, relative/true)
- **Heading:** HDG, HDT, HDM (magnetic/true heading)
- **Temperature:** MTW (water temperature)
- **Engine:** RPM (engine RPM and status)
- **Environment:** MDA (atmospheric data)
- **Transducer:** XDR (generic transducer)
- **Time:** ZDA (UTC date/time)
- **NMEA 2000:** DIN (PGN wrapper)

**Implementation Details:**
- Checksum validation for data integrity
- Field extraction with null-safe parsing
- NaN validation for numeric conversions (Jan 2025)
- Explicit radix for parseInt (base-10)
- Returns ParsedNmeaMessage with structured fields
- Zero dependencies - pure TypeScript

### pgnParser.ts - NMEA 2000 PGN Parsing
**Location:** `src/services/nmea/pgnParser.ts`
**Purpose:** Parse NMEA 2000 binary PGN messages without external libraries
**Supported PGNs (10+):**
- **128267:** Water Depth (instance from SID)
- **128259:** Speed (STW with instance)
- **130306:** Wind Data (speed/angle with instance)
- **129029:** GNSS Position (lat/lon with instance)
- **127250:** Vessel Heading (magnetic/true)
- **130310/130311:** Temperature (Environmental)
- **127488:** Engine Parameters (RPM, boost, trim)
- **127508/127513:** Battery Status/Config
- **127505:** Fluid Level (tanks)
- **Route/Waypoint:** Navigation data

**Implementation Details:**
- Manual byte-level parsing with proper endianness
- Little-endian multi-byte conversion
- Invalid value detection (0xFFFF, 0xFFFFFFFF)
- Unit conversions (Kelvin→Celsius, m/s→knots, radians→degrees)
- Instance extraction from SID bytes
- Signed/unsigned integer handling
- Zero dependencies - pure TypeScript

### autopilotService.ts - PGN Encoding
**Location:** `src/services/autopilotService.ts`
**Purpose:** Encode NMEA 2000 PGN messages for Raymarine autopilot control
**Implementation:**
- Manual PGN message encoding (encodePgnMessage method)
- ISO 11783 / NMEA 2000 format compliance
- 29-bit CAN identifier construction
- Priority, data page, PDU format handling
- Buffer allocation and byte packing
- Zero dependencies - pure TypeScript

**Why Self-Contained:**
1. **Full Control:** Complete control over parsing logic and edge cases
2. **Zero Dependency Risk:** No external library updates breaking production
3. **Performance:** Optimized for our specific sensor types
4. **Maintainability:** All NMEA knowledge in our codebase
5. **Bundle Size:** Reduced app size (removed ~500KB of dependencies)
6. **Debugging:** Can trace through all parsing logic
7. **Customization:** Easy to add custom NMEA extensions

**Adding New NMEA Support:**
1. For NMEA 0183: Add parser function to PureNmeaParser.ts
2. For NMEA 2000: Add PGN handler to pgnParser.ts
3. Add sensor processor to NmeaSensorProcessor.ts
4. Register in SensorConfigRegistry.ts
5. Create widget following existing patterns



## Critical Context for AI Agents

### Recent Bug Fixes (Lessons Learned)

**ThresholdPresentationService Implementation (Dec 2024):**
- Fixed architectural violation: Dialog was doing presentation work
- Created service following SensorPresentationCache pattern
- Optimized from 5 redundant service calls to 3 memoized calls
- Added data corruption protection: blocks save if enrichment fails
- Added comprehensive error logging (9 strategic points)
- Fixed category lookup edge case: multi-metric sensors require metric parameter
- Removed dead code: unused convertDisplayToSI method
- **Lesson:** Dialogs should be "dumb consumers" like widgets, all presentation logic in service layer

**Console.log Mass Removal (Dec 2024):**
- Removed 550+ `console.log()` statements for clean debugging
- Python script tracked parentheses depth for multi-line removal
- **CRITICAL:** Logger's own `console.log()` output was accidentally removed
- **Lesson:** Never add direct `console.log()` - always use conditional `log.*()` methods

**Widget Registration Service Logging:**
- Early logging pattern logged ALL sensors to `widget.depth` category
- Fixed to be sensor-specific: only depth sensors → `widget.depth` logs
- Pattern: Check `sensorType === 'depth'` before calling `log.widgetDepth()`

**SensorValueMap vs Raw Sensor Data:**
- `widgetStore.instanceWidgets[].sensorData` uses SensorValueMap format (`"depth.0.depth": 2.8`)
- Widgets MUST read from `nmeaStore.sensors.depth[0]` for full data (includes `display`, `history`)
- Don't try to merge these - they serve different purposes (detection vs rendering)

### NMEA Simulator

**Port 8080** (WebSocket) - NMEA data stream
**Port 9090** (HTTP) - Simulator Control API

**Scenarios** in `marine-assets/test-scenarios/`:
- `navigation/coastal-sailing.yml` - Most realistic test case
- `engine/basic-engine-monitoring-with-variation.yml` - Engine data
- `autopilot/autopilot-engagement.yml` - Autopilot testing

**Control API:**
```bash
# Start scenario
curl http://localhost:9090/api/scenarios/coastal-sailing

# Inject single message
curl -X POST http://localhost:9090/api/inject-data \
  -H "Content-Type: application/json" \
  -d '{"sentence": "$IIDPT,5.2,0.0,M*3E"}'
```

## Settings Dialog UI Language (Jan 2025)

**Mandatory pattern for all settings dialogs** - consistent, minimalistic, card-based layout:

### Card-Based Architecture
```tsx
// ✅ CORRECT - Card per section with clear visual separation
<BaseConfigDialog title="Dialog Name" visible={visible} onClose={onClose}>
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Section Name</Text>
    
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>Setting Action</Text>
      <PlatformToggle value={value} onValueChange={setValue} label="Setting Action" />
    </View>
    
    {/* When toggle enabled, show options */}
    {value && (
      <View style={styles.settingGroup}>
        <Text style={styles.groupLabel}>Option Category</Text>
        <View style={styles.optionGrid}>
          {/* Option buttons */}
        </View>
      </View>
    )}
    
    <Text style={styles.hintText}>Additional context hint</Text>
  </View>
</BaseConfigDialog>

// ❌ WRONG - Using PlatformSettingsSection (not card-based)
<PlatformSettingsSection title="Header Auto-Hide">
  <PlatformSettingsRow label="Auto-hide header menu" />
</PlatformSettingsSection>
```

### Information Hierarchy - Minimalistic Storytelling
```
1. Section Title (Bold, prominent) → Category being configured
   Example: "App Header", "Widget Lifecycle", "Connection"
   
2. Setting Label (Left of control) → Action being enabled/disabled
   Example: "Auto-hide", "Remove inactive widgets"
   DO NOT repeat label text next to toggle component
   
3. Group Label (When options appear) → What options configure
   Example: "Inactivity timeout", "Retry interval"
   
4. Selected Option → Clearly visible (primary color background)
   Example: "5 sec", "10 min", "Custom"
   
5. Hint Text (Italic, secondary color) → Additional context
   Example: "Tap top of screen to reveal header when hidden"
```

### Theme Integration (CRITICAL)
```tsx
// Card styling with platform-specific shadows
card: {
  backgroundColor: theme.surface,
  borderRadius: platformTokens.borderRadius.card,  // 12px
  padding: 20,
  marginBottom: 16,
  ...Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
           shadowOpacity: 0.1, shadowRadius: 8 },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  }),
},

// Section title - Bold, hierarchical
sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  fontFamily: platformTokens.typography.fontFamily,
  color: theme.text,
  marginBottom: 16,
},

// Hint text - Use theme hint style
hintText: {
  fontSize: platformTokens.typography.hint.fontSize,
  fontWeight: platformTokens.typography.hint.fontWeight,
  lineHeight: platformTokens.typography.hint.lineHeight,
  fontFamily: platformTokens.typography.fontFamily,
  fontStyle: platformTokens.typography.hint.fontStyle,  // 'italic'
  color: theme.textSecondary,
  marginTop: 12,
},
```

### Anti-Patterns to AVOID
❌ **Redundant text**: "Auto-hide after inactivity" label + "Auto-hide header" toggle label  
✅ **Minimalistic**: "Auto-hide" label (toggle has no separate label)

❌ **Dynamic detail text**: "Hide after: 5 seconds" (changes with selection)  
✅ **Static group label + visible selection**: "Inactivity timeout" + "5 sec" button highlighted

❌ **Repeating information**: Section "Header Visibility" + Label "Header auto-hide"  
✅ **Complementary**: Section "App Header" + Label "Auto-hide"

❌ **Mixing UI patterns**: Some sections use cards, others use PlatformSettingsSection  
✅ **Consistent**: All sections use card-based layout

### Example: Perfect Dialog Structure
```tsx
// App Header card
<View style={styles.card}>
  <Text style={styles.sectionTitle}>App Header</Text>
  
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>Auto-hide</Text>
    <PlatformToggle value={autoHide} onValueChange={setAutoHide} label="Auto-hide" />
  </View>
  
  {autoHide && (
    <>
      <View style={styles.settingGroup}>
        <Text style={styles.groupLabel}>Inactivity timeout</Text>
        <View style={styles.optionGrid}>
          {/* Pill buttons: 3 sec, 5 sec, 10 sec... */}
        </View>
      </View>
      <Text style={styles.hintText}>Tap top of screen to reveal header when hidden</Text>
    </>
  )}
</View>
```

**Narrative reads naturally top-to-bottom:**
"App Header > Auto-hide > Inactivity timeout > 5 sec > (hint about revealing)"

Each level adds **new information** without repeating previous context.

## Communication Preferences

**✅ DO:**
- Use MCP tools (`read_file`, `replace_string_in_file`, `grep_search`) for file operations
- Communicate status directly in chat, not via terminal echo
- Ask for architectural guidance when uncertain
- Check existing patterns before implementing new features

**❌ DON'T:**
- Add `console.log()` statements (use `log.*()` with lazy evaluation)
- Duplicate functionality (survey existing code first)
- Make breaking changes without discussing impact
- Output code blocks when tools can edit directly

## Git Commit Guidelines

**✅ CORRECT: Use MCP create_file tool + temp file**
```typescript
// 1. Create temp file using MCP create_file tool (NOT in git staging)
create_file({
  filePath: '/path/to/repo/.git_commit_message.txt',
  content: `fix: brief summary line

Detailed explanation of changes:
- Point 1
- Point 2

Files: file1.ts, file2.ts`
});

// 2. Commit staged files using temp file, then delete temp file
run_in_terminal({
  command: 'cd /path/to/repo && git commit -F .git_commit_message.txt && rm .git_commit_message.txt',
  explanation: 'Commit changes with message from temp file and cleanup',
  isBackground: false
});

// IMPORTANT: Temp file must NOT be staged/committed
// It's created AFTER git add, used only for commit message, then deleted
```

**❌ WRONG: Shell heredoc/cat/pipe patterns**
```bash
# These ALL fail in zsh/bash with multi-line messages:
cat > file.txt << 'EOF' ...           # Heredoc corruption
git commit -m "$(cat << 'EOF' ...)"   # Shell escaping issues  
cat file.txt | git commit -F -        # Pipe corruption
```

**Why MCP create_file + temp file:**
- IDE/MCP tools handle file creation reliably
- No shell escaping or heredoc issues
- Works consistently across all terminals
- Easy to verify message before commit
- Clean, atomic operation
- Follows project's MCP-first philosophy

## Testing

```bash
npm test                    # Run all tests
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode
```

Test files in `src/**/__tests__/` - colocated with source

## Platform-Specific Notes

**Web:** Primary development platform (fastest iteration)
**iOS/Android:** Requires native module linking for TCP/UDP (see `docs/ANDROID-NATIVE-MODULE-LINKING.md`)
**Desktop:** Windows/macOS support in Phase 1.5

---

For detailed architectural decisions and epic breakdown, see `docs/architecture.md` and `docs/prd.md`.
