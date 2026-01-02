/**
 * ============================================================================
 * CUSTOM WIDGET - Definition-Driven Dynamic Renderer
 * ============================================================================
 * 
 * **PURPOSE:**
 * Renders widgets dynamically from CustomWidgetDefinition without writing
 * dedicated .tsx files. Supports metric cells, custom components, and
 * multi-sensor layouts.
 * 
 * **ARCHITECTURE:**
 * Definition → Dynamic Subscriptions → Cell Generation → TemplatedWidget
 * 
 * **HUMAN:**
 * This widget reads widget definitions and creates the UI automatically.
 * You define WHAT to show (in defaultCustomWidgets.ts), this renders HOW.
 * 
 * **AI AGENT:**
 * Core of definition-driven widget system. Handles:
 * - Dynamic sensor subscriptions based on grid.primarySensor + grid.additionalSensors
 * - Cell generation from grid.cells[] array
 * - Component instantiation from WidgetComponentRegistry
 * - Conditional rendering (platform-specific)
 * - Empty cell filling for layout
 * 
 * **DATA FLOW:**
 * 1. Read definition from widgetStore
 * 2. Subscribe to sensors dynamically
 * 3. Generate children array from grid.cells:
 *    - MetricCellDef → PrimaryMetricCell | SecondaryMetricCell
 *    - ComponentCellDef → Component from registry
 *    - EmptyCellDef → Empty View
 * 4. Pass to TemplatedWidget with correct template
 */

import React, { useMemo } from 'react';
import { View, Platform } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useWidgetStore } from '../store/widgetStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { getWidgetComponent } from '../registry/WidgetComponentRegistry';
import { getGridTemplate } from '../registry/GridTemplateRegistry';
import type { CustomWidgetDefinition, CellDefinition } from '../config/defaultCustomWidgets';
import type { SensorType } from '../types/SensorData';

interface CustomWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Dynamic Sensor Subscription Hook
 * 
 * **AI AGENT:**
 * Generates dynamic sensor subscriptions based on definition. Handles:
 * - Primary sensor subscription
 * - Additional sensors array
 * - Instance resolution (literal vs first-available)
 * - Stable selector memoization
 * 
/**
 * Cell Renderer
 * 
 * **AI AGENT:**
 * Converts CellDefinition to React element. Handles 3 cell types:
 * 1. MetricCellDef → PrimaryMetricCell | SecondaryMetricCell
 * 2. ComponentCellDef → Dynamic component from registry
 * 3. EmptyCellDef → Empty View for layout
 * 
 * **CONDITIONAL RENDERING:**
 * ComponentCellDef.condition.platform filters by OS. Cell only renders
 * if current platform matches condition array.
 */
function renderCell(
  cell: CellDefinition,
  index: number,
  sensorKey: string | undefined,
  isPrimary: boolean,
): React.ReactElement {
  // EmptyCellDef: Filler cell for layout
  if ('empty' in cell && cell.empty) {
    return <View key={`empty-${index}`} />;
  }
  
  // ComponentCellDef: Custom component from registry
  if ('component' in cell) {
    // Platform-specific rendering
    if (cell.condition?.platform) {
      const currentPlatform = Platform.OS as 'ios' | 'android' | 'web';
      if (!cell.condition.platform.includes(currentPlatform)) {
        return <View key={`hidden-${index}`} />;
      }
    }
    
    const Component = getWidgetComponent(cell.component);
    if (!Component) {
      console.warn(`[CustomWidget] Component "${cell.component}" not found in registry`);
      return <View key={`missing-${index}`} />;
    }
    
    return (
      <Component
        key={`component-${index}`}
        metricKey={(cell as any).metricKey}
        sensorKey={(cell as any).sensorKey}
        {...(cell.props || {})}
      />
    );
  }
  
  // MetricCellDef: Standard metric display (type narrowing)
  if ('metricKey' in cell) {
    const metricKey = cell.metricKey;
    const cellSensorKey = cell.sensorKey || sensorKey;
    const cellType = cell.cellType || (isPrimary ? 'primary' : 'secondary');
    
    if (cellType === 'primary') {
      return (
        <PrimaryMetricCell
          key={`metric-${index}`}
          metricKey={metricKey}
          sensorKey={cellSensorKey as any}
        />
      );
    } else {
      return (
        <SecondaryMetricCell
          key={`metric-${index}`}
          metricKey={metricKey}
          sensorKey={cellSensorKey as any}
        />
      );
    }
  }
  
  // EmptyCellDef: Return empty view
  return <View key={`empty-${index}`} />;
}

/**
 * CustomWidget Renderer
 * 
 * **RENDERING ALGORITHM:**
 * 1. Get definition from widgetStore
 * 2. Validate grid configuration
 * 3. Subscribe to sensors dynamically
 * 4. Determine primary/secondary split from template
 * 5. Generate children from grid.cells[]
 * 6. Pass to TemplatedWidget
 */
export const CustomWidget: React.FC<CustomWidgetProps> = React.memo(({ id, instanceNumber = 0 }) => {

  // Get custom widget definition from widget settings
  const widgetConfig = useWidgetStore((state) =>
    state.dashboard?.widgets?.find((w) => w.id === id),
  );

  const definition = useMemo(() => {
    return widgetConfig?.settings?.customDefinition as CustomWidgetDefinition | undefined;
  }, [widgetConfig]);

  // Render nothing if no definition or grid configuration
  if (!definition?.grid) {
    console.warn('[CustomWidget] No grid configuration found for widget:', id);
    return null;
  }

  /**
   * Dynamic Sensor Subscriptions
   * 
   * **LIMITATION:** React hooks rules prevent truly dynamic subscriptions.
   * Currently supports up to 3 sensors total:
   * - 1 primary sensor
   * - 2 additional sensors
   * 
   * **Why:** Can't call useNmeaStore in a loop (hooks must be unconditional).
   * 
   * **Future:** Refactor to render prop pattern or context-based subscription
   * if more than 3 sensors are needed for a single custom widget.
   * 
   * **AI AGENT NOTE:** This is intentional technical debt. Most custom widgets
   * need 1-2 sensors. If you encounter a definition with 4+ sensors, you'll
   * need to refactor this section.
   */
  const primarySensorType = definition.grid.primarySensor?.type;
  const primaryInstance = definition.grid.primarySensor?.instance ?? 0;
  
  const primarySensor = useNmeaStore(
    (state) => primarySensorType ? state.nmeaData.sensors[primarySensorType]?.[primaryInstance] : undefined
  );
  
  // Additional sensor support (max 2 additional sensors = 3 total)
  const additionalSensor1 = useNmeaStore(
    (state) => {
      const sensor = definition.grid.additionalSensors?.[0];
      return sensor ? state.nmeaData.sensors[sensor.type]?.[sensor.instance ?? 0] : undefined;
    }
  );
  
  const additionalSensor2 = useNmeaStore(
    (state) => {
      const sensor = definition.grid.additionalSensors?.[1];
      return sensor ? state.nmeaData.sensors[sensor.type]?.[sensor.instance ?? 0] : undefined;
    }
  );

  // Build additional sensors array for TemplatedWidget
  const additionalSensors = useMemo(() => {
    if (!definition.grid.additionalSensors) return undefined;
    
    return definition.grid.additionalSensors.map(sensor => ({
      sensorType: sensor.type,
      instance: sensor.instance ?? 0,
      required: sensor.required,
    }));
  }, [definition]);

  // Determine primary/secondary split from GridTemplateRegistry
  // Template defines exact cell counts: primary = rows × cols, secondary = rows × cols
  const gridTemplate = getGridTemplate(definition.grid.template);
  const primaryCellCount = gridTemplate.primaryGrid.rows * gridTemplate.primaryGrid.columns;
  const secondaryCellCount = gridTemplate.secondaryGrid
    ? gridTemplate.secondaryGrid.rows * gridTemplate.secondaryGrid.columns
    : 0;
  const totalExpectedCells = primaryCellCount + secondaryCellCount;
  
  // Validate cell count matches template
  if (definition.grid.cells.length !== totalExpectedCells) {
    console.warn(
      `[CustomWidget] Cell count mismatch for widget ${id}:`,
      `expected ${totalExpectedCells} cells (${primaryCellCount} primary + ${secondaryCellCount} secondary)`,
      `but definition has ${definition.grid.cells.length} cells`
    );
  }

  // Generate children from cells
  const children = useMemo(() => {
    return definition.grid.cells.map((cell, index) => {
      const isPrimary = index < primaryCellCount;
      const defaultSensorKey = primarySensorType;
      
      return renderCell(cell, index, defaultSensorKey, isPrimary);
    });
  }, [definition.grid.cells, primaryCellCount, primarySensorType]);

  return (
    <TemplatedWidget
      template={definition.grid.template}
      sensorInstance={primarySensor}
      sensorType={primarySensorType!}
      additionalSensors={additionalSensors}
    >
      {children as React.ReactElement | React.ReactElement[]}
    </TemplatedWidget>
  );
});

CustomWidget.displayName = 'CustomWidget';

export default CustomWidget;
