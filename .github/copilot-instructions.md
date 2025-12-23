# GitHub Copilot Instructions - BMad Autopilot

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
