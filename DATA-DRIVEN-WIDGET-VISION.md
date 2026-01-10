# Data-Driven Widget Vision (Option C)

**Status:** Vision Document - Not Yet Implemented  
**Date:** January 10, 2026  
**Decision:** Full migration to declarative widget definitions (Option B of migration strategy)

---

## Executive Summary

**Goal:** Convert all 16 built-in .tsx widgets to data-driven `CustomWidgetDefinition` format, enabling XML/JSON exportability, non-developer widget creation, and zero code duplication.

**Core Principle:** Widgets are pure data structures that specify WHAT to display, not HOW to render it. CustomWidget.tsx interprets definitions and generates React components dynamically.

**Key Innovation:** Explicit `sensorType`/`instance`/`metricKey` props per cell, eliminating implicit sensor resolution and matching the proven built-in widget pattern.

---

## Current State Analysis

### Built-in Widgets (.tsx files - 16 total)
**Location:** `src/widgets/*.tsx`

**Pattern:**
```tsx
export const GPSWidget: React.FC<GPSWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {
  return (
    <TemplatedWidget template="2Rx1C-SEP-2Rx1C" sensorType="gps" instanceNumber={instanceNumber}>
      <PrimaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="latitude" />
      <PrimaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="longitude" />
      <SecondaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="utcDate" />
      <SecondaryMetricCell sensorType="gps" instance={instanceNumber} metricKey="utcTime" />
    </TemplatedWidget>
  );
});
```

**Characteristics:**
- ✅ Explicit props: Every cell gets `sensorType`, `instance`, `metricKey`
- ✅ No store subscriptions at widget level (pure layout)
- ✅ Type-safe at compile time
- ✅ Supports multi-sensor widgets (SpeedWidget: GPS + speed sensor)
- ✅ Supports TrendLine with full props configuration
- ❌ Requires .tsx file per widget (16 files)
- ❌ Not exportable as data
- ❌ Requires developer to create new widgets

### Custom Widgets (Definitions - 5 total)
**Location:** `src/config/defaultCustomWidgets.ts`

**Pattern:**
```typescript
export const SAILING_DASHBOARD_DEFINITION: CustomWidgetDefinition = {
  id: 'sailingDash',
  name: 'Sailing Dashboard',
  icon: 'boat-outline',
  grid: {
    template: '4Rx2C-NONE',
    primarySensor: { type: 'depth', instance: 0, mode: 'first-available' },
    additionalSensors: [{ type: 'gps', instance: 0, mode: 'first-available' }],
    cells: [
      { metricKey: 'depth' },  // Implicit primarySensor
      { sensorKey: 'gps', metricKey: 'speedOverGround' },  // Explicit sensorKey (not sensorType!)
      { metricKey: 'offset' },
      { sensorKey: 'gps', metricKey: 'track' },
    ],
  },
};
```

**Characteristics:**
- ✅ Data-driven (no .tsx required)
- ✅ XML/JSON exportable
- ✅ Non-developer friendly
- ❌ Implicit sensor props (requires runtime resolution: sensorKey → sensorType)
- ❌ Complex primarySensor/additionalSensors config
- ❌ Untyped TrendLine props (`props: Record<string, any>`)
- ❌ Cannot match built-in explicit props pattern

---

## Vision: Enhanced Data-Driven System

### Target Pattern (GPSWidget as Definition)

```typescript
export const GPS_WIDGET_DEFINITION: CustomWidgetDefinition = {
  id: 'gps',
  name: 'GPS',
  description: 'GPS position and time display',
  icon: 'navigate-outline',
  deletable: false,
  priority: 75,
  multiInstance: false,
  
  grid: {
    template: '2Rx1C-SEP-2Rx1C',
    
    cells: [
      // Primary Grid
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'latitude',
        cellType: 'primary',
      },
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'longitude',
        cellType: 'primary',
      },
      
      // Secondary Grid
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'utcDate',
        cellType: 'secondary',
      },
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'utcTime',
        cellType: 'secondary',
      },
    ],
  },
};
```

### Multi-Sensor Widget (SpeedWidget with GPS + Speed Sensor)

```typescript
export const SPEED_WIDGET_DEFINITION: CustomWidgetDefinition = {
  id: 'speed',
  name: 'Speed',
  icon: 'speedometer-outline',
  
  grid: {
    template: '2Rx2C-SEP-2Rx2C',
    
    cells: [
      // GPS sensor metrics - instance 0, first available
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'speedOverGround',
        cellType: 'primary',
      },
      {
        type: 'metric',
        sensorType: 'gps',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'speedOverGround.max',
        cellType: 'primary',
      },
      
      // Speed sensor metrics - instance 0, first available (separate from GPS)
      {
        type: 'metric',
        sensorType: 'speed',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'throughWater',
        cellType: 'primary',
      },
      {
        type: 'metric',
        sensorType: 'speed',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'throughWater.avg',
        cellType: 'primary',
      },
      
      // Secondary cells...
    ],
  },
};
```

### TrendLine with Full Props (DepthWidget)

```typescript
export const DEPTH_WIDGET_DEFINITION: CustomWidgetDefinition = {
  id: 'depth',
  name: 'Depth',
  icon: 'water-outline',
  
  grid: {
    template: '2Rx1C-SEP-2Rx1C',
    
    cells: [
      // Primary: Current depth
      {
        type: 'metric',
        sensorType: 'depth',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'depth',
        cellType: 'primary',
      },
      
      // Primary: TrendLine with full configuration
      {
        type: 'component',
        component: 'TrendLine',
        sensorType: 'depth',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'depth',
        props: {
          timeWindowMs: 300000,  // 5 minutes - REQUIRED
          showXAxis: true,
          showYAxis: true,
          xAxisPosition: 'top',
          yAxisDirection: 'down',
          usePrimaryLine: true,
          strokeWidth: 2,
          forceZero: true,
          showTimeLabels: true,
        },
      },
      
      // Secondary: Min/Max stats
      {
        type: 'metric',
        sensorType: 'depth',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'depth.min',
        cellType: 'secondary',
      },
      {
        type: 'metric',
        sensorType: 'depth',
        instance: 0,
        instanceMode: 'first-available',
        metricKey: 'depth.max',
        cellType: 'secondary',
      },
    ],
  },
};
```

### EmptyCell for Grid Alignment (BatteryWidget)

```typescript
export const BATTERY_WIDGET_DEFINITION: CustomWidgetDefinition = {
  id: 'battery',
  name: 'Battery',
  icon: 'battery-charging-outline',
  
  grid: {
    template: '2Rx2C-SEP-2Rx2C',
    
    cells: [
      // Row 1: Voltage + Current
      {
        type: 'metric',
        sensorType: 'battery',
        instance: 0,
        metricKey: 'voltage',
        cellType: 'primary',
      },
      {
        type: 'metric',
        sensorType: 'battery',
        instance: 0,
        metricKey: 'current',
        cellType: 'primary',
      },
      
      // Row 2: Empty + Empty (grid spacer)
      { type: 'empty' },
      { type: 'empty' },
      
      // Secondary section
      {
        type: 'metric',
        sensorType: 'battery',
        instance: 0,
        metricKey: 'stateOfCharge',
        cellType: 'secondary',
      },
      // ...
    ],
  },
};
```

---

## Enhanced Type System Design

### Core Cell Definitions

```typescript
/**
 * Instance resolution modes for dynamic sensor selection
 */
export type InstanceMode = 
  | 'literal'          // Use exact instance number specified
  | 'first-available'  // Use first detected instance of this sensor type
  | 'user-default';    // Use user's preferred instance from settings

/**
 * Explicit Metric Cell - Displays a sensor metric value
 * 
 * Maps 1:1 to built-in widget pattern:
 * <PrimaryMetricCell sensorType={...} instance={...} metricKey={...} />
 */
interface ExplicitMetricCellDef {
  type: 'metric';
  
  /** Sensor type (e.g., 'depth', 'battery', 'gps') */
  sensorType: keyof SensorsData;
  
  /** Sensor instance number (0-indexed) */
  instance: number;
  
  /** How to resolve instance number (default: 'first-available') */
  instanceMode?: InstanceMode;
  
  /** Metric field name (e.g., 'depth', 'voltage', 'speedOverGround') */
  metricKey: string;
  
  /** Force primary or secondary styling (default: position-based) */
  cellType?: 'primary' | 'secondary';
}

/**
 * TrendLine Cell - Historical metric visualization
 * 
 * Extends metric cell with TrendLine-specific configuration
 */
interface TrendLineCellDef {
  type: 'component';
  component: 'TrendLine';
  
  /** Sensor type */
  sensorType: keyof SensorsData;
  
  /** Sensor instance number */
  instance: number;
  
  /** Instance resolution mode */
  instanceMode?: InstanceMode;
  
  /** Metric to visualize */
  metricKey: string;
  
  /** TrendLine configuration (type-safe props) */
  props: TrendLineProps;
}

/**
 * TrendLine Props (from src/components/TrendLine.tsx)
 */
interface TrendLineProps {
  // REQUIRED
  timeWindowMs: number;
  
  // Optional: Axis configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisPosition?: 'top' | 'bottom';
  yAxisDirection?: 'up' | 'down';
  
  // Optional: Time scale
  timeWindowMinutes?: number;
  showTimeLabels?: boolean;
  
  // Optional: Value range
  minValue?: number;
  maxValue?: number;
  forceZero?: boolean;
  
  // Optional: Styling
  usePrimaryLine?: boolean;
  strokeWidth?: number;
  showGrid?: boolean;
  fontSize?: number;
  
  // Optional: Data points
  showDataPoints?: boolean;
  dataPointRadius?: number;
}

/**
 * Empty Cell - Grid spacer for alignment
 */
interface EmptyCellDef {
  type: 'empty';
}

/**
 * Future: Generic Component Cell for custom visualizations
 */
interface GenericComponentCellDef {
  type: 'component';
  component: string;  // Name from WIDGET_COMPONENT_REGISTRY
  sensorType: keyof SensorsData;
  instance: number;
  instanceMode?: InstanceMode;
  metricKey?: string;
  props?: Record<string, any>;
}

/**
 * Cell Definition Union
 */
type CellDefinition = 
  | ExplicitMetricCellDef 
  | TrendLineCellDef
  | EmptyCellDef
  | GenericComponentCellDef;
```

### Simplified CustomWidgetDefinition

```typescript
/**
 * Enhanced Custom Widget Definition
 * 
 * BREAKING CHANGES from current system:
 * - Removed: grid.primarySensor (cells are self-describing)
 * - Removed: grid.additionalSensors (cells are self-describing)
 * - Removed: implicit sensorKey resolution
 * - Added: Explicit sensorType/instance/instanceMode per cell
 * - Added: Type-safe component props
 */
export interface CustomWidgetDefinition {
  // Widget Identity (unchanged)
  id: string;
  name: string;
  description: string;
  icon: string;
  deletable: boolean;
  priority: number;
  multiInstance: boolean;
  
  // Grid Configuration (simplified)
  grid: {
    /** Template name from GridTemplateRegistry */
    template: string;
    
    /** Cell definitions (self-describing, no sensor config needed) */
    cells: CellDefinition[];
    
    /** Optional: Default instance mode for all cells without explicit mode */
    defaultInstanceMode?: InstanceMode;
  };
}
```

---

## Implementation Plan

### Phase 1: Type System Foundation (2-3 hours)

**File:** `src/config/defaultCustomWidgets.ts`

1. Define new cell types:
   - `ExplicitMetricCellDef`
   - `TrendLineCellDef`
   - `EmptyCellDef`
   - `GenericComponentCellDef`
   - `CellDefinition` union

2. Add `InstanceMode` type
3. Update `CustomWidgetDefinition.grid` interface
4. Keep old types temporarily for backward compatibility

**Validation:** TypeScript compiles, existing custom widgets still work

---

### Phase 2: CustomWidget.tsx Renderer Update (3-4 hours)

**File:** `src/components/CustomWidget.tsx`

**Changes:**

1. **Instance Resolution Logic**
   ```typescript
   function resolveInstance(
     sensorType: keyof SensorsData,
     instanceSpec: number,
     mode: InstanceMode = 'first-available'
   ): number {
     switch (mode) {
       case 'literal':
         return instanceSpec;
       
       case 'first-available':
         const sensors = useNmeaStore.getState().nmeaData.sensors[sensorType];
         return sensors ? Math.min(...Object.keys(sensors).map(Number)) : instanceSpec;
       
       case 'user-default':
         // Read from settings store
         return settingsStore.getState().preferredInstances[sensorType] ?? instanceSpec;
     }
   }
   ```

2. **Cell Renderer Switch**
   ```typescript
   function renderCell(cellDef: CellDefinition, position: number) {
     const cellType = cellDef.cellType ?? (position < primaryCellCount ? 'primary' : 'secondary');
     
     switch (cellDef.type) {
       case 'metric': {
         const instance = resolveInstance(cellDef.sensorType, cellDef.instance, cellDef.instanceMode);
         const CellComponent = cellType === 'primary' ? PrimaryMetricCell : SecondaryMetricCell;
         
         return (
           <CellComponent
             key={position}
             sensorType={cellDef.sensorType}
             instance={instance}
             metricKey={cellDef.metricKey}
           />
         );
       }
       
       case 'component': {
         if (cellDef.component === 'TrendLine') {
           const instance = resolveInstance(cellDef.sensorType, cellDef.instance, cellDef.instanceMode);
           return (
             <TrendLine
               key={position}
               sensorType={cellDef.sensorType}
               instance={instance}
               metricKey={cellDef.metricKey}
               {...cellDef.props}
             />
           );
         }
         // Handle other components...
       }
       
       case 'empty':
         return <EmptyCell key={position} />;
     }
   }
   ```

3. **Remove Sensor Context Logic**
   - Delete primarySensor/additionalSensors resolution
   - Delete sensorKey lookup
   - Cells are now fully self-contained

**Validation:** Convert 1 custom widget to new format, verify rendering

---

### Phase 3: Convert Built-in Widgets (1-2 days)

**Strategy:** Convert widgets in priority order, validate each before proceeding

**Priority Order:**
1. **Simple single-sensor widgets** (4 hours)
   - GPSWidget → GPS_WIDGET_DEFINITION ✅
   - CompassWidget → COMPASS_WIDGET_DEFINITION ✅
   - WindWidget → WIND_WIDGET_DEFINITION ✅
   - TanksWidget → TANKS_WIDGET_DEFINITION ✅

2. **Widgets with TrendLine** (3 hours)
   - DepthWidget → DEPTH_WIDGET_DEFINITION (TrendLine + stats)
   - TemperatureWidget → TEMPERATURE_WIDGET_DEFINITION
   - WeatherWidget → WEATHER_WIDGET_DEFINITION (includes multiple TrendLines)

3. **Multi-sensor widgets** (3 hours)
   - SpeedWidget → SPEED_WIDGET_DEFINITION (GPS + speed sensor)
   - NavigationWidget → NAVIGATION_WIDGET_DEFINITION (GPS + navigation data)

4. **Multi-instance widgets** (3 hours)
   - BatteryWidget → BATTERY_WIDGET_DEFINITION (includes EmptyCell)
   - EngineWidget → ENGINE_WIDGET_DEFINITION (complex secondary layout)

5. **Special case widgets** (4 hours)
   - AutopilotWidget → AUTOPILOT_WIDGET_DEFINITION (engaged/standby states)
   - RudderWidget → RUDDER_WIDGET_DEFINITION (graphical rudder)
   - ThemeWidget → THEME_WIDGET_DEFINITION (no sensor data)

**Conversion Script (Semi-Automated):**
```bash
# Parse .tsx file to extract template, cells, props
node scripts/convert-widget-to-definition.js src/widgets/GPSWidget.tsx

# Output: Proposed GPS_WIDGET_DEFINITION
# Human review + adjustments
# Copy to defaultCustomWidgets.ts
```

**Validation Per Widget:**
- Side-by-side rendering (old .tsx vs new definition)
- Visual diff screenshots
- Jest snapshot tests
- User acceptance

---

### Phase 4: Update Widget Registration (2 hours)

**File:** `src/config/builtInWidgetRegistrations.ts`

**Change Pattern:**

```typescript
// BEFORE
export const GPS_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'gps',
  displayName: 'GPS',
  icon: 'navigate-outline',
  requiredSensors: [
    { sensorType: 'gps', metricName: 'latitude', required: true },
  ],
  createWidget: (instance, sensorData) => {
    return createWidgetConfig('gps', instance, 'GPS', 'navigate-outline');
  },
};

// AFTER
import { GPS_WIDGET_DEFINITION } from './defaultCustomWidgets';

export const GPS_WIDGET_REGISTRATION: WidgetRegistration = {
  widgetType: 'gps',
  displayName: 'GPS',
  icon: 'navigate-outline',
  requiredSensors: [
    { sensorType: 'gps', metricName: 'latitude', required: true },
  ],
  definition: GPS_WIDGET_DEFINITION,  // Reference to definition
};
```

**WidgetRegistrationService Update:**
```typescript
// If registration has definition, use it to create widget config
if (registration.definition) {
  return createCustomWidgetConfig(registration.definition, instance);
}
// Otherwise, use legacy createWidget() function
return registration.createWidget(instance, sensorData);
```

---

### Phase 5: Cleanup (2 hours)

1. **Delete .tsx widget files** (after full validation)
   ```bash
   rm src/widgets/GPSWidget.tsx
   rm src/widgets/DepthWidget.tsx
   # ... (16 files total)
   ```

2. **Update DynamicDashboard.tsx**
   - Remove individual widget imports
   - Use CustomWidget for all widgets with definitions
   ```typescript
   // BEFORE: 16 different imports
   import GPSWidget from './widgets/GPSWidget';
   import DepthWidget from './widgets/DepthWidget';
   // ...
   
   // AFTER: Single component
   import CustomWidget from './components/CustomWidget';
   
   // Render all widgets uniformly
   <CustomWidget definition={widgetDefinition} instance={instanceNumber} />
   ```

3. **Update tests** to use definitions instead of components

4. **Documentation**
   - Update developer guide with new definition format
   - Create widget creation tutorial (non-developer friendly)
   - Document instance resolution modes

---

### Phase 6: Enable External Configuration (Future)

**Goals:**
- Export widget definitions as JSON
- Import custom widgets from files
- Widget marketplace / sharing

**JSON Export Example:**
```json
{
  "id": "gps",
  "name": "GPS",
  "icon": "navigate-outline",
  "grid": {
    "template": "2Rx1C-SEP-2Rx1C",
    "cells": [
      {
        "type": "metric",
        "sensorType": "gps",
        "instance": 0,
        "metricKey": "latitude",
        "cellType": "primary"
      }
    ]
  }
}
```

**Implementation:**
1. Add JSON schema validation
2. Create widget import/export UI
3. Security: Validate sensor types, metric keys exist
4. Sandboxing: Prevent injection attacks

---

## Benefits of Data-Driven Approach

### For Developers
- ✅ **No .tsx boilerplate:** 70-line widget → 30-line definition
- ✅ **Zero duplication:** Type system enforces consistency
- ✅ **Easier testing:** Validate definitions as data structures
- ✅ **Better diff reviews:** JSON changes vs React code changes

### For Power Users
- ✅ **Customizable layouts:** Rearrange cells without coding
- ✅ **Widget templates:** Save/share custom dashboard configurations
- ✅ **A/B testing:** Try different layouts without rebuilding

### For Product
- ✅ **Faster iteration:** New widgets in minutes, not hours
- ✅ **Non-developer contributions:** Boat owners can create widgets
- ✅ **Widget marketplace:** Community-driven widget library
- ✅ **Export/import:** Share configs across devices

### For Architecture
- ✅ **Single rendering path:** CustomWidget.tsx handles all widgets uniformly
- ✅ **Separation of concerns:** Definitions (what) vs renderer (how)
- ✅ **Extensibility:** New cell types without changing 16 widgets
- ✅ **Type safety:** Full TypeScript support maintained

---

## Risks & Mitigation

### Risk 1: Complex Widgets Lose Flexibility
**Concern:** AutopilotWidget has custom state logic, RudderWidget has custom graphics

**Mitigation:**
- Move custom logic to registered components (WIDGET_COMPONENT_REGISTRY)
- Example: `<AutopilotStateIndicator>` component handles engaged/standby logic
- Definitions compose components: `{ component: 'AutopilotStateIndicator', props: {...} }`

### Risk 2: Performance Regression
**Concern:** Dynamic rendering slower than compiled .tsx

**Mitigation:**
- Memoize cell rendering: `useMemo(() => renderCell(def), [def])`
- Benchmark before/after: <16ms render time target
- Cell components already optimized (useMetric with version-based equality)

### Risk 3: Type Safety Loss
**Concern:** Untyped props: `Record<string, any>` allows invalid configurations

**Mitigation:**
- Import actual component prop interfaces: `TrendLineProps`, `MetricCellProps`
- Runtime validation: Zod schema or custom validator
- TypeScript discriminated unions: `component: 'TrendLine'` narrows props type

### Risk 4: Breaking Changes for Users
**Concern:** Existing custom widgets stop working

**Mitigation:**
- Keep old interfaces temporarily (deprecation phase)
- Automatic migration script: Convert old definitions to new format
- Runtime compatibility layer: CustomWidget.tsx handles both formats
- Version definitions: `{ version: 2, ... }` for format detection

### Risk 5: Incomplete Conversion
**Concern:** Some widgets can't be converted, mixed system remains

**Mitigation:**
- Identify unconvertible widgets early (AutopilotWidget, RudderWidget)
- Extract custom rendering to components first
- Validate 100% of widgets work as definitions before deleting .tsx
- Rollback plan: Keep .tsx in git history, revert if needed

---

## Success Metrics

### Technical Metrics
- [ ] All 16 built-in widgets converted to definitions
- [ ] Zero .tsx widget files remaining (except special cases if any)
- [ ] <16ms render time per widget (same as current)
- [ ] 100% test coverage maintained
- [ ] TypeScript compilation with zero errors

### Code Quality Metrics
- [ ] <1000 lines total definition code (vs ~1500 lines current .tsx)
- [ ] Zero duplication (DRY score: 100%)
- [ ] Cyclomatic complexity: <10 per function

### User Experience Metrics
- [ ] Visual parity: 100% match with current widgets
- [ ] No regressions: Zero new bugs introduced
- [ ] Faster widget creation: <5 minutes for simple widgets

### Future Capability Metrics
- [ ] JSON export/import working
- [ ] Non-developer can create widget in <10 minutes
- [ ] Widget sharing enabled (export → send → import)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Type System | 2-3 hours | None |
| Phase 2: Renderer Update | 3-4 hours | Phase 1 |
| Phase 3: Widget Conversion | 1-2 days | Phase 2 |
| Phase 4: Registration Update | 2 hours | Phase 3 |
| Phase 5: Cleanup | 2 hours | Phase 4 |
| **Total** | **2-3 days** | - |

**Recommended Approach:**
- **Week 1:** Phases 1-2 (foundation)
- **Week 2:** Phase 3 (convert 5-6 widgets, validate thoroughly)
- **Week 3:** Phase 3 continued (remaining 10-11 widgets)
- **Week 4:** Phases 4-5 (integration and cleanup)

---

## Related Documents

- **Current Architecture:** `docs/architecture.md`
- **Widget Pattern Guide:** `.github/copilot-instructions.md` (Registry-First Widget Architecture section)
- **Sensor Config Registry:** `src/registry/SensorConfigRegistry.ts`
- **Grid Templates:** `src/registry/GridTemplateRegistry.ts`
- **Widget Components:** `src/registry/WidgetComponentRegistry.ts`

---

## Approval Status

- [ ] Technical review (Senior Architect)
- [ ] UX review (Design team)
- [ ] Product review (Stakeholders)
- [ ] Security review (If external config enabled)
- [ ] Performance benchmarks completed
- [ ] Migration plan validated
- [ ] Rollback plan documented

---

## Implementation Notes

**Start Date:** TBD  
**Assigned To:** TBD  
**Status:** Vision Document - Awaiting Approval

**Next Steps:**
1. Review this vision document with team
2. Prototype Phase 1-2 (type system + renderer)
3. Convert 1 simple widget (GPSWidget) as proof-of-concept
4. Validate performance and developer experience
5. Get approval to proceed with full migration
6. Execute phases 3-5

---

**Last Updated:** January 10, 2026
