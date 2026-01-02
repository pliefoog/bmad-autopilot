# GitHub Copilot Instructions - BMad Autopilot

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

**✅ Declarative Widget Pattern:**
```tsx
export const BatteryWidget: React.FC<Props> = React.memo(({ id }) => {
  const instance = useNmeaStore((state) => state.nmeaData.sensors.battery?.[0]);
  
  return (
    <TemplatedWidget
      template="2Rx2C-SEP-2Rx2C"
      sensorInstance={instance}
      sensorType="battery"
    >
      <PrimaryMetricCell metricKey="voltage" />
      <PrimaryMetricCell metricKey="current" />
      <SecondaryMetricCell metricKey="capacity" />
    </TemplatedWidget>
  );
});
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
// Primary sensor is implicit via sensorInstance prop
<TemplatedWidget
  template="2Rx1C-SEP-2Rx1C"
  sensorInstance={depthInstance}
  sensorType="depth"
>
  {/* Implicit primary sensor - no sensorKey needed */}
  <PrimaryMetricCell metricKey="depth" />
  <TrendLine metricKey="depth" timeWindowMs={300000} />
  
  {/* Virtual stat metrics using dot notation */}
  <SecondaryMetricCell metricKey="depth.min" />
  <SecondaryMetricCell metricKey="depth.max" />
</TemplatedWidget>
```

**Multi-Sensor Widget:**
```tsx
// Primary sensor: speed (STW), Additional sensor: gps (SOG)
<TemplatedWidget
  template="2Rx2C-SEP-2Rx2C"
  sensorInstance={speedInstance}
  sensorType="speed"
  additionalSensors={[
    { sensorType: 'gps', instance: 0 }
  ]}
>
  {/* GPS metrics require explicit sensorKey */}
  <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />
  <PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround.max" />
  
  {/* Primary sensor (speed) - no sensorKey needed */}
  <PrimaryMetricCell metricKey="throughWater" />
  <PrimaryMetricCell metricKey="throughWater.avg" />
</TemplatedWidget>
```

**Virtual Stat Metrics (Session Stats):**
```tsx
// Dot notation for computed statistics (calculated in SensorInstance.getMetric())
<PrimaryMetricCell metricKey="depth.min" />        // MIN DEPTH
<PrimaryMetricCell metricKey="depth.max" />        // MAX DEPTH  
<SecondaryMetricCell metricKey="depth.avg" />      // AVG DEPTH

// Works with any numeric metric field
<PrimaryMetricCell metricKey="speedOverGround.max" />  // MAX SOG
<SecondaryMetricCell metricKey="pressure.avg" />       // AVG pressure
```

**How Virtual Metrics Work:**
1. Component strips `.min/.max/.avg` suffix to look up field config in registry
2. Calls `sensorInstance.getMetric('fieldName.stat')` which:
   - Parses suffix using regex `/\.(min|max|avg)$/`
   - Fetches history buffer via `getHistory(fieldName)`
   - Calculates stat: `Math.min/max()` or average
   - Returns enriched MetricValue with proper units/formatting
3. Component adds stat prefix to mnemonic: "MIN DEPTH", "MAX SOG"

**Auto-Fetch Pattern** (SensorContext):
```tsx
{/* MetricCells auto-fetch everything via useSensorContext() */}
<PrimaryMetricCell metricKey="voltage" />
{/* Fetches: mnemonic, value, unit, alarm state, category config */}
```

**⚠️ CRITICAL RULES:**
- **Primary sensor:** Implicit via `sensorInstance` prop - NO `sensorKey` needed
- **Additional sensors:** MUST use `sensorKey` prop to specify sensor type
- **Virtual metrics:** ALWAYS use dot notation (`.min`, `.max`, `.avg`) NOT underscore
- **String fields:** Access directly (e.g., `metricKey="name"`) - NOT virtual metrics
- **Base metric name:** Used for registry lookup (strips virtual suffix automatically)

**Mandatory Mnemonics:**
All sensor fields MUST have `mnemonic: string` in `SensorConfigRegistry`. Startup validation throws if missing.

**⚠️ ANTI-PATTERNS:**
- ❌ Manual metric extraction in widgets
- ❌ Creating display data objects
- ❌ Hardcoded mnemonics
- ❌ Prop drilling (use Context)
- ❌ Widget-specific logic (belongs in SensorInstance)

**✅ CORRECT PATTERNS:**
- ✅ Template name + metricKey list = entire widget
- ✅ Let TemplatedWidget handle layout
- ✅ Let MetricCells auto-fetch everything
- ✅ Keep widgets <70 lines (avg 25-60 lines)
- ✅ SensorInstance methods for computed metrics

**Results:**
- 77% code reduction (855 → 183 lines across 3 widgets)
- Zero duplication
- XML-ready structure
- Type-safe throughout

## Project Overview

**React Native cross-platform marine instrument display** connecting to boat NMEA networks via WiFi bridges. Runs entirely on-device (no server), transforming smartphones/tablets/desktops into comprehensive marine displays with Raymarine autopilot control.

**Tech Stack:** React Native (Expo), TypeScript, Zustand state management, NMEA 0183/2000 parsing, WebSocket/TCP/UDP native modules

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
│   │   ├── parsing/             # NMEA sentence parsers
│   │   └── data/                # Sensor processing & store updates
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
    └── SensorData.ts           # Sensor type definitions
```

**Key files to understand:**
- `src/store/nmeaStore.ts` - Where ALL sensor data lives
- `src/widgets/DepthWidget.tsx` - Reference implementation for widget patterns
- `src/services/nmea/data/NmeaSensorProcessor.ts` - NMEA → sensor data transform
- `src/utils/logging/logger.ts` - Conditional logging implementation

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
