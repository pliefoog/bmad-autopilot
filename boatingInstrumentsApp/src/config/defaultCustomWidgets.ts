/**
 * ============================================================================
 * DEFAULT CUSTOM WIDGETS - Definition-Driven Dynamic Widget System
 * ============================================================================
 *
 * **ARCHITECTURE CONTEXT (For AI Agents):**
 * This file defines the CustomWidget system - a declarative way to create
 * sensor-based widgets WITHOUT writing .tsx files. Widgets are defined as
 * data structures that specify:
 * 1. Which sensors to subscribe to
 * 2. Which metrics to display
 * 3. What layout template to use
 * 4. Optional custom components (TrendLines, SVG visualizations, etc.)
 *
 * The CustomWidget.tsx component reads these definitions and dynamically
 * generates the widget UI using TemplatedWidget + MetricCells.
 *
 * **DESIGN PHILOSOPHY:**
 * - Minimal: Only specify what's needed, registries provide the rest
 * - Declarative: Define WHAT to show, not HOW to render it
 * - Type-safe: Full TypeScript support with discriminated unions
 * - Extensible: Support for custom components beyond simple metrics
 *
 * **KEY REGISTRIES (Don't duplicate their data here):**
 * - SensorConfigRegistry: Provides mnemonics, labels, categories
 * - ConversionRegistry: Handles unit conversion and formatting
 * - GridTemplateRegistry: Defines layout templates
 * - MetricValue: Auto-enriches with formatted display values
 *
 * Pre-configured custom widgets that ship with the app, similar to built-in
 * sensor widgets but defined declaratively for easy customization.
 */

import type {
  WidgetRegistration,
  SensorDependency,
  SensorValueMap,
} from '../services/WidgetRegistrationService';
import type { WidgetConfig } from '../types/widget.types';
import type { SensorType } from '../types/SensorData';

// ============================================================================
// CELL DEFINITION TYPES
// ============================================================================

/**
 * Simple Metric Cell - Displays a sensor metric value
 *
 * **Most common cell type (~90% of cases)**
 *
 * **CRITICAL (Jan 2025):** ALL cells MUST specify sensorType + instance + metricKey explicitly.
 * Context-based sensor propagation was deprecated - see Explicit Props Pattern in copilot-instructions.md
 *
 * @example
 * ```typescript
 * // Explicit sensor specification (REQUIRED)
 * { sensorType: 'depth', instance: 0, metricKey: 'depth' }
 *
 * // Multi-sensor widget
 * { sensorType: 'gps', instance: 0, metricKey: 'speedOverGround' }
 *
 * // Engine comparison widget
 * { sensorType: 'engine', instance: 0, metricKey: 'rpm' }
 * { sensorType: 'engine', instance: 1, metricKey: 'rpm' }
 *
 * // Force cell type (override position-based detection)
 * { sensorType: 'battery', instance: 0, metricKey: 'voltage', cellType: 'secondary' }
 *
 * // Future: Session statistics
 * { sensorType: 'gps', instance: 0, metricKey: 'speedOverGround', stat: 'max' }
 * ```
 */
interface MetricCellDef {
  /** Sensor type from SensorData (e.g., "depth", "gps", "engine") - REQUIRED */
  sensorType: string;

  /** Sensor instance number (0 for first, 1 for second, etc.) - REQUIRED */
  instance: number;

  /** Metric key from SensorConfigRegistry (e.g., "depth", "speedOverGround") - REQUIRED */
  metricKey: string;

  /**
   * Override cell type (force primary or secondary styling)
   * Defaults to position-based: first N cells = primary, rest = secondary
   * where N = primaryRows × columns from template
   */
  cellType?: 'primary' | 'secondary';

  /**
   * Statistic type (FUTURE ENHANCEMENT - not yet implemented)
   * For displaying session stats instead of current value
   * Requires StatMetricCell component implementation
   */
  stat?: 'current' | 'min' | 'max' | 'avg';
}

/**
 * Component Cell - Renders custom component (TrendLine, SVG, etc.)
 *
 * **Use for:** Visualizations, custom displays, interactive elements
 *
 * @example
 * ```typescript
 * // TrendLine for pressure
 * {
 *   component: 'TrendLine',
 *   metricKey: 'pressure',
 *   props: {
 *     timeWindowMs: 300000,
 *     showXAxis: true,
 *     showYAxis: true,
 *   }
 * }
 *
 * // SVG visualization
 * {
 *   component: 'RudderIndicator',
 *   metricKey: 'rudderAngle',
 * }
 *
 * // Platform-specific component
 * {
 *   component: 'NativeControl',
 *   condition: { platform: ['ios', 'android'] }
 * }
 * ```
 */
interface ComponentCellDef {
  /**
   * Component name from WIDGET_COMPONENT_REGISTRY
   * Built-in: 'TrendLine', 'RudderIndicator'
   */
  component: string;

  /**
   * Sensor type (required if component needs sensor data)
   * Example: 'weather', 'gps', 'engine'
   */
  sensorType?: string;

  /**
   * Sensor instance number (required if component needs sensor data)
   */
  instance?: number;

  /**
   * Metric key if component needs metric data (e.g., TrendLine)
   * Component receives MetricValue via props
   */
  metricKey?: string;

  /**
   * Component-specific props (passed directly to component)
   * Component also auto-receives: theme, sensorInstance, metricValue
   */
  props?: Record<string, any>;

  /**
   * Conditional rendering rules
   * Component only renders if conditions are met
   */
  condition?: {
    /** Only render on specified platforms */
    platform?: ('ios' | 'android' | 'web')[];
  };
}

/**
 * Empty Cell - Fills layout space without rendering anything
 *
 * **Use for:** Layout alignment, grid filling, spacing
 *
 * @example
 * ```typescript
 * // Fill empty slot in grid
 * { empty: true }
 * ```
 */
interface EmptyCellDef {
  /** Marker for empty cell */
  empty: true;
}

/**
 * Cell Definition - Union of all cell types
 *
 * Discriminated union enables type-safe cell processing:
 * - Check 'empty' for EmptyCellDef
 * - Check 'component' for ComponentCellDef
 * - Otherwise it's MetricCellDef
 */
export type CellDefinition = MetricCellDef | ComponentCellDef | EmptyCellDef;

// ============================================================================
// CUSTOM WIDGET DEFINITION
// ============================================================================

/**
 * Custom Widget Definition - Declarative Widget Configuration
 *
 * **HUMAN DOCUMENTATION:**
 * Defines a complete widget without writing .tsx code. Specify sensors,
 * metrics, and layout - CustomWidget.tsx handles the rendering.
 *
 * **AI AGENT CONTEXT:**
 * This is the core abstraction for definition-driven widgets. It bridges:
 * 1. Sensor subscription (which sensors to read from)
 * 2. Metric display (what data to show)
 * 3. Layout templates (how to arrange cells)
 * 4. Component registry (custom visualizations)
 *
 * **DESIGN PRINCIPLES:**
 * - Minimal: Only specify unique info, not what registries already know
 * - Declarative: "Show depth + speed" not "subscribe to stores, extract metrics..."
 * - Composable: Mix metric cells with custom components
 * - Type-safe: TypeScript ensures valid configurations
 *
 * **DATA FLOW:**
 * Definition → CustomWidget.tsx → TemplatedWidget → MetricCells → Display
 *                                 ↓
 *                          SensorContext (auto-injected)
 *
 * @example See SAILING_DASHBOARD_DEFINITION below for complete example
 */
export interface CustomWidgetDefinition {
  // -------------------------------------------------------------------------
  // Widget Identity
  // -------------------------------------------------------------------------

  /** Unique widget identifier (e.g., 'sailingDash', 'weatherStation') */
  id: string;

  /** Display name shown in widget header */
  name: string;

  /** Human-readable description for widget picker */
  description: string;

  /** Ionicons icon name */
  icon: string;

  /** Can user delete this widget? (false = protected like ThemeWidget) */
  deletable: boolean;

  /** Priority for widget ordering in picker (higher = earlier) */
  priority: number;

  /** Allow multiple instances? (e.g., multiple temperature zones) */
  multiInstance: boolean;

  // -------------------------------------------------------------------------
  // Grid Configuration - THE CORE OF THE DEFINITION
  // -------------------------------------------------------------------------

  /**
   * Grid Layout Configuration
   *
   * **HUMAN:** Defines widget layout, sensors, and cell content
   * **AI AGENT:** This is where the magic happens - maps sensors to cells
   */
  grid: {
    /**
     * Template name from GridTemplateRegistry
     *
     * Common templates:
     * - '2Rx1C-SEP-2Rx1C': 2 primary rows + 2 secondary rows (single column)
     * - '2Rx2C-SEP-2Rx2C': 2×2 primary grid + 2×2 secondary grid
     * - '2Rx2C-SEP-2Rx2C-WIDE': 2×2 primary + 2 full-width secondary
     * - '4Rx2C-NONE': Dense 4×2 primary grid, no secondary
     *
     * Template determines:
     * - Grid dimensions (rows × columns)
     * - Primary/secondary split
     * - Separator visibility
     * - Cell sizing/spacing
     */
    template: string;

    /**
     * Primary Sensor Configuration
     *
     * **HUMAN:** The main sensor this widget displays
     * **AI AGENT:** Becomes sensorInstance prop on TemplatedWidget
     *
     * The first sensor subscribed to. Provides SensorContext for cells
     * without explicit sensorKey.
     */
    primarySensor: {
      /** Sensor type (e.g., 'depth', 'wind', 'engine') */
      type: SensorType;

      /**
       * Sensor instance number
       *
       * Mode 'first-available': Use first detected instance (recommended)
       * Mode 'literal': Use exact instance number
       */
      instance: number;

      /**
       * Instance selection mode
       * - 'first-available': Dynamic - use first detected instance (default)
       * - 'literal': Static - use exact instance number
       */
      mode?: 'literal' | 'first-available';

      /**
       * Is this sensor required for widget to appear?
       * - true: Widget only appears when sensor is detected (default)
       * - false: Widget always appears, shows "No Data" if missing
       */
      required?: boolean;
    };

    /**
     * Additional Sensors (for multi-sensor widgets)
     *
     * **HUMAN:** Other sensors this widget needs (e.g., GPS for speed widget)
     * **AI AGENT:** Becomes additionalSensors prop on TemplatedWidget
     *
     * Cells access these via sensorKey prop:
     * `<PrimaryMetricCell sensorKey="gps" metricKey="speedOverGround" />`
     */
    additionalSensors?: {
      /** Sensor type */
      type: SensorType;

      /** Instance number */
      instance: number;

      /** Instance selection mode (default: 'first-available') */
      mode?: 'literal' | 'first-available';

      /** Is this sensor required? (default: false for additional sensors) */
      required?: boolean;
    }[];

    /**
     * Cell Definitions (in grid order: top-left to bottom-right)
     *
     * **HUMAN:** List what to show in each grid cell
     * **AI AGENT:** Generates ReactElement children for TemplatedWidget
     *
     * **Position determines Primary/Secondary:**
     * Template defines primary cell count (e.g., 2×2 = 4 cells)
     * - Cells 0-3: Primary section (large, prominent)
     * - Cells 4+: Secondary section (smaller, detailed)
     *
     * **Order matters:** First cell renders top-left, last cell bottom-right
     *
     * **Cell Types:**
     * 1. Metric Cell: `{ metricKey: 'depth' }`
     * 2. Component: `{ component: 'TrendLine', metricKey: 'pressure' }`
     * 3. Empty: `{ empty: true }`
     */
    cells: CellDefinition[];
  };

  // -------------------------------------------------------------------------
  // Legacy Fields (kept for backward compatibility, will be removed)
  // -------------------------------------------------------------------------

  /**
   * @deprecated Use grid.primarySensor and grid.additionalSensors instead
   * Legacy sensor bindings format - kept for migration only
   */
  sensorBindings?: {
    required: SensorDependency[];
    optional: SensorDependency[];
  };

  /**
   * @deprecated Use grid.cells instead
   * Legacy layout format - kept for migration only
   */
  layout?: {
    primaryMetrics: {
      sensorKey: string;
      label: string;
      mnemonic: string;
      unit: string;
    }[];
    secondaryMetrics?: {
      sensorKey: string;
      label: string;
      mnemonic: string;
      unit: string;
    }[];
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create Widget Configuration from Definition
 *
 * **HUMAN:** Converts definition to runtime widget config
 * **AI AGENT:** Bridge between definition (data) and widget system (runtime)
 *
 * Transforms CustomWidgetDefinition into WidgetConfig that the widget
 * system understands. Handles:
 * - Widget ID generation (definition.id + instance number)
 * - Layout dimensions (default 2×2 grid)
 * - Settings propagation
 * - Lock status (based on deletable flag)
 */
function createCustomWidgetConfig(
  definition: CustomWidgetDefinition,
  instance: number,
): WidgetConfig {
  const widgetId = `${definition.id}-${instance}`;

  return {
    id: widgetId,
    type: definition.id, // Use definition.id as type so it matches registration widgetType
    title: definition.name,
    settings: {
      icon: definition.icon,
      customDefinition: definition,
      deletable: definition.deletable,
    },
  };
}

// ============================================================================
// EXAMPLE DEFINITIONS
// ============================================================================

/**
 * Example 1: Sailing Dashboard
 *
 * **WHAT IT SHOWS:** Essential sailing metrics - depth and speed over ground
 *
 * **ARCHITECTURE:**
 * - Primary sensor: depth (for depth metric)
 * - Additional sensor: gps (for speed metric)
 * - Template: 4Rx2C-NONE (4 cells in 2×2 grid, no secondary section)
 *
 * **WHY THIS DESIGN:**
 * Sailors need quick glance at two critical metrics. Simple 2×2 layout
 * provides large, readable display. No secondary section needed for
 * essential data - keep it simple.
 *
 * **AI AGENT NOTES:**
 * This demonstrates multi-sensor widget pattern. First cell has no sensorKey
 * (uses primarySensor), second cell specifies sensorKey="gps" (uses
 * additionalSensors[0]). SensorContext automatically injected by TemplatedWidget.
 */
export const SAILING_DASHBOARD_DEFINITION: CustomWidgetDefinition = {
  id: 'sailingDash',
  name: 'Sailing Dashboard',
  description: 'Essential sailing metrics: Depth and Speed Over Ground',
  icon: 'boat-outline',
  deletable: true,
  priority: 88,
  multiInstance: false,

  grid: {
    template: '4Rx2C-NONE',

    primarySensor: {
      type: 'depth',
      instance: 0,
      mode: 'first-available',
      required: true,
    },

    additionalSensors: [
      {
        type: 'gps',
        instance: 0,
        mode: 'first-available',
        required: true,
      },
    ],

    cells: [
      // Row 1, Col 1: Depth (explicit sensor specification)
      { sensorType: 'depth', instance: 0, metricKey: 'depth' },

      // Row 1, Col 2: Speed Over Ground (explicit GPS sensor)
      { sensorType: 'gps', instance: 0, metricKey: 'speedOverGround' },

      // Row 2, Col 1: Depth Offset (explicit sensor specification)
      { sensorType: 'depth', instance: 0, metricKey: 'offset' },

      // Row 2, Col 2: GPS Track (explicit GPS sensor)
      { sensorType: 'gps', instance: 0, metricKey: 'track' },
    ],
  },
};

/**
 * Example 2: Weather Station with Trends
 *
 * **WHAT IT SHOWS:** 4 weather metrics + 2 trend visualizations
 *
 * **ARCHITECTURE:**
 * - Primary sensor: weather
 * - Template: 2Rx2C-SEP-2Rx2C-WIDE (4 primary cells + 2 full-width secondary)
 *
 * **CELL COMPOSITION:**
 * Primary section (4 metric cells):
 * - Atmospheric pressure
 * - Air temperature
 * - Humidity
 * - Dew point
 *
 * Secondary section (2 TrendLine components, full-width):
 * - Pressure trend (5 min window)
 * - Temperature trend (5 min window)
 *
 * **WHY THIS DESIGN:**
 * Weather data benefits from historical trends. Top 2×2 grid shows current
 * values, bottom full-width section shows trends. TrendLines get more
 * horizontal space for better visualization.
 *
 * **AI AGENT NOTES:**
 * Demonstrates component cells. TrendLine components auto-receive:
 * - metricValue (from metricKey)
 * - sensorInstance (from context)
 * - theme (from useTheme)
 * Props object passed directly to TrendLine component.
 */
export const WEATHER_STATION_DEFINITION: CustomWidgetDefinition = {
  id: 'weatherStation',
  name: 'Weather Station',
  description: 'Comprehensive weather metrics with trend visualization',
  icon: 'cloud-outline',
  deletable: true,
  priority: 75,
  multiInstance: false,

  grid: {
    template: '2Rx2C-SEP-2Rx2C-WIDE',

    primarySensor: {
      type: 'weather',
      instance: 0,
      mode: 'first-available',
      required: true,
    },

    cells: [
      // Primary Grid: Current weather metrics (4 cells, 2×2) - explicit sensor specification
      { sensorType: 'weather', instance: 0, metricKey: 'pressure' },
      { sensorType: 'weather', instance: 0, metricKey: 'airTemperature' },
      { sensorType: 'weather', instance: 0, metricKey: 'humidity' },
      { sensorType: 'weather', instance: 0, metricKey: 'dewPoint' },

      // Secondary Grid: Trend visualizations (2 cells, full-width)
      {
        component: 'TrendLine',
        sensorType: 'weather',
        instance: 0,
        metricKey: 'pressure',
        props: {
          timeWindowMs: 300000,
          showXAxis: true,
          showYAxis: true,
          gridColor: '#333',
        },
      },
      {
        component: 'TrendLine',
        sensorType: 'weather',
        instance: 0,
        metricKey: 'airTemperature',
        props: {
          timeWindowMs: 300000,
          showXAxis: true,
          showYAxis: true,
          gridColor: '#333',
        },
      },
    ],
  },
};

/**
 * Example 3: Engine Monitor (Multi-Instance)
 *
 * **WHAT IT SHOWS:** Engine 0 and Engine 1 side-by-side
 *
 * **ARCHITECTURE:**
 * - Primary sensor: engine (instance 0)
 * - Additional sensor: engine (instance 1)
 * - Template: 4Rx2C-NONE (4 cells, no secondary)
 *
 * **CELL LAYOUT:**
 * ```
 * ┌─────────┬─────────┐
 * │ ENG 0   │ ENG 1   │
 * │ RPM     │ RPM     │
 * ├─────────┼─────────┤
 * │ ENG 0   │ ENG 1   │
 * │ TEMP    │ TEMP    │
 * └─────────┴─────────┘
 * ```
 *
 * **WHY THIS DESIGN:**
 * Twin-engine boats need to compare engines at a glance. Side-by-side
 * layout makes comparison easy. Uses instance override to show different
 * engine instances in same widget.
 *
 * **AI AGENT NOTES:**
 * Demonstrates instance override pattern. Even though primarySensor is
 * engine instance 0, cells can specify instance: 1 to show data from
 * second engine. This is powerful for comparison widgets.
 */
export const DUAL_ENGINE_MONITOR_DEFINITION: CustomWidgetDefinition = {
  id: 'dualEngineMonitor',
  name: 'Twin Engine Monitor',
  description: 'Side-by-side engine comparison',
  icon: 'hardware-chip-outline',
  deletable: true,
  priority: 70,
  multiInstance: false,

  grid: {
    template: '4Rx2C-NONE',

    primarySensor: {
      type: 'engine',
      instance: 0,
      mode: 'literal', // Use exact instance 0
      required: true,
    },

    additionalSensors: [
      {
        type: 'engine',
        instance: 1,
        mode: 'literal', // Use exact instance 1
        required: false, // Widget works with one engine
      },
    ],

    cells: [
      // Row 1: Engine RPM comparison - EXPLICIT sensor specification required (Jan 2025)
      { sensorType: 'engine', instance: 0, metricKey: 'rpm' }, // Engine 0
      { sensorType: 'engine', instance: 1, metricKey: 'rpm' }, // Engine 1

      // Row 2: Engine temperature comparison - EXPLICIT sensor specification required (Jan 2025)
      { sensorType: 'engine', instance: 0, metricKey: 'coolantTemp' }, // Engine 0
      { sensorType: 'engine', instance: 1, metricKey: 'coolantTemp' }, // Engine 1
    ],
  },
};

/**
 * Example 4: Platform-Specific Controls
 *
 * **WHAT IT SHOWS:** Cross-platform widget with conditional cells
 *
 * **ARCHITECTURE:**
 * - Template: 2Rx2C-SEP-2Rx1C (4 primary + 2 secondary)
 * - Conditional rendering based on platform
 *
 * **WHY THIS DESIGN:**
 * Some features only make sense on mobile (native brightness control).
 * Web build doesn't have these APIs. Conditional rendering keeps widget
 * functional across all platforms without code duplication.
 *
 * **AI AGENT NOTES:**
 * Demonstrates condition.platform usage. Component only renders on specified
 * platforms. Empty cell fills the space on other platforms to maintain
 * grid layout consistency.
 */
export const CROSS_PLATFORM_EXAMPLE: CustomWidgetDefinition = {
  id: 'crossPlatformDemo',
  name: 'Cross-Platform Demo',
  description: 'Demonstrates platform-specific rendering',
  icon: 'phone-portrait-outline',
  deletable: true,
  priority: 50,
  multiInstance: false,

  grid: {
    template: '2Rx2C-SEP-2Rx1C',

    primarySensor: {
      type: 'gps',
      instance: 0,
      required: true,
    },

    cells: [
      // Primary: Standard metrics (all platforms) - explicit sensor specification
      { sensorType: 'gps', instance: 0, metricKey: 'latitude' },
      { sensorType: 'gps', instance: 0, metricKey: 'longitude' },
      { sensorType: 'gps', instance: 0, metricKey: 'speedOverGround' },
      { sensorType: 'gps', instance: 0, metricKey: 'track' },

      // Secondary: Platform-specific component
      {
        component: 'NativeControl',
        condition: {
          platform: ['ios', 'android'], // Only on mobile
        },
      },

      // Empty cell for web (maintains grid layout)
      { empty: true },
    ],
  },
};

/**
 * Legacy Definition - OLD FORMAT (for migration reference)
 *
 * **DO NOT USE THIS FORMAT FOR NEW WIDGETS**
 *
 * This shows the old format that's being phased out. Keep for backward
 * compatibility during migration period.
 */
export const CUSTOM_T1_DEFINITION: CustomWidgetDefinition = {
  id: 'customT1',
  name: 'Custom T1',
  description: 'Essential sailing metrics: Depth and Speed',
  icon: 'analytics-outline',
  deletable: true, // Users can remove this widget
  priority: 88, // Between depth (90) and wind (85)
  multiInstance: false, // Only one instance

  sensorBindings: {
    required: [
      {
        sensorType: 'depth',
        metricName: 'depth',
        instance: 0, // Use first depth sensor (with dynamic fallback)
        required: true,
        label: 'Depth Below Transducer',
      },
      {
        sensorType: 'gps',
        metricName: 'speedOverGround',
        instance: 0, // Use first GPS sensor (with dynamic fallback)
        required: true,
        label: 'Speed Over Ground',
      },
    ],
    optional: [],
  },

  layout: {
    primaryMetrics: [
      {
        sensorKey: 'depth.0.depth',
        label: 'Depth',
        mnemonic: 'DBT',
        unit: 'm',
      },
      {
        sensorKey: 'gps.0.speedOverGround',
        label: 'Speed',
        mnemonic: 'SOG',
        unit: 'kn',
      },
    ],
    secondaryMetrics: [],
  },

  // Modern grid format (prefer this)
  grid: {
    template: '2Rx1C-SEP-2Rx1C', // 2 rows × 1 column (vertical stack)
    primarySensor: {
      type: 'depth',
      instance: 0,
      required: true,
    },
    additionalSensors: [{ type: 'gps', instance: 0, required: true }],
    cells: [
      { sensorType: 'depth', instance: 0, metricKey: 'depth' },
      { sensorType: 'gps', instance: 0, metricKey: 'speedOverGround' },
      { empty: true }, // Secondary section (row 1)
      { empty: true }, // Secondary section (row 2)
    ],
  },
};

// ============================================================================
// WIDGET REGISTRATION INTEGRATION
// ============================================================================

/**
 * Convert CustomWidgetDefinition to WidgetRegistration
 *
 * **HUMAN:** Makes custom widgets work with the widget detection system
 * **AI AGENT:** Bridge between definition-driven system and registration-based system
 *
 * Transforms declarative CustomWidgetDefinition into WidgetRegistration
 * that WidgetRegistrationService understands. Handles:
 * - Sensor dependency extraction (from grid.cells)
 * - Required vs optional sensor detection
 * - Widget validation logic
 * - Widget factory function
 *
 * **DATA FLOW:**
 * Definition → customWidgetToRegistration → WidgetRegistration → Detection System
 *
 * @param definition The custom widget definition to convert
 * @returns WidgetRegistration compatible with registration service
 */
export function customWidgetToRegistration(definition: CustomWidgetDefinition): WidgetRegistration {
  // Extract unique sensors from cells and primary/additional sensor config
  const requiredSensors: SensorDependency[] = [];
  const optionalSensors: SensorDependency[] = [];

  // Helper to find first metricKey for a sensor from cells (Jan 2025: explicit sensorType pattern)
  const findMetricForSensor = (targetSensorType: string): string => {
    if (!definition.grid?.cells) return '';

    for (const cell of definition.grid.cells) {
      // Check if this is a metric cell with explicit sensorType
      if ('metricKey' in cell && !('empty' in cell) && !('component' in cell)) {
        const metricCell = cell as MetricCellDef;
        if (metricCell.sensorType === targetSensorType) {
          return metricCell.metricKey || '';
        }
      }
    }
    return '';
  };

  // Add primary sensor
  if (definition.grid?.primarySensor) {
    const metricName = findMetricForSensor(definition.grid.primarySensor.type);
    const dep: SensorDependency = {
      sensorType: definition.grid.primarySensor.type,
      metricName, // Extract from cells
      instance: definition.grid.primarySensor.instance,
      required: definition.grid.primarySensor.required ?? true,
      label: definition.name,
    };

    if (dep.required) {
      requiredSensors.push(dep);
    } else {
      optionalSensors.push(dep);
    }
  }

  // Add additional sensors
  definition.grid?.additionalSensors?.forEach((sensor) => {
    const metricName = findMetricForSensor(sensor.type);
    const dep: SensorDependency = {
      sensorType: sensor.type,
      metricName, // Extract from cells
      instance: sensor.instance,
      required: sensor.required ?? false,
      label: `${definition.name} - ${sensor.type}`,
    };

    if (dep.required) {
      requiredSensors.push(dep);
    } else {
      optionalSensors.push(dep);
    }
  });

  // Fallback to legacy sensorBindings if grid not defined
  if (!definition.grid && definition.sensorBindings) {
    requiredSensors.push(...definition.sensorBindings.required);
    optionalSensors.push(...definition.sensorBindings.optional);
  }

  return {
    widgetType: definition.id,
    displayName: definition.name,
    icon: definition.icon,
    multiInstance: definition.multiInstance,
    maxInstances: definition.multiInstance ? -1 : 1,
    priority: definition.priority,

    requiredSensors,
    optionalSensors,

    createWidget: (instance: number, sensorData: SensorValueMap): WidgetConfig => {
      return createCustomWidgetConfig(definition, instance);
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All default custom widget definitions
 *
 * **HUMAN:** Add new definitions here to make them available in the app
 * **AI AGENT:** These get registered on app startup via registerDefaultCustomWidgets
 */
export const DEFAULT_CUSTOM_WIDGETS: CustomWidgetDefinition[] = [
  SAILING_DASHBOARD_DEFINITION,
  WEATHER_STATION_DEFINITION,
  DUAL_ENGINE_MONITOR_DEFINITION,
  CUSTOM_T1_DEFINITION, // Keep legacy definition for migration
];

/**
 * Register all default custom widgets with the registration service
 *
 * **HUMAN:** Called during app initialization to make custom widgets available
 * **AI AGENT:** Converts definitions to registrations and registers with service
 *
 * @param registrationService The widget registration service instance
 */
export function registerDefaultCustomWidgets(
  registrationService: any, // WidgetRegistrationService
): void {
  DEFAULT_CUSTOM_WIDGETS.forEach((definition) => {
    const registration = customWidgetToRegistration(definition);
    registrationService.registerWidget(registration);
  });
}
