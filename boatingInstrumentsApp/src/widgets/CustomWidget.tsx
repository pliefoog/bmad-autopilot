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
 *    - EmptyCellDef → EmptyCell
 * 4. Pass to TemplatedWidget with correct template
 */

import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useWidgetStore } from '../store/widgetStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import EmptyCell from '../components/EmptyCell';
import { TemplatedWidget } from '../components/TemplatedWidget';
import { getWidgetComponent } from '../registry/WidgetComponentRegistry';
import { getGridTemplate } from '../registry/GridTemplateRegistry';
import type { CustomWidgetDefinition, CellDefinition } from '../config/defaultCustomWidgets';

interface CustomWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * Cell Renderer
 *
 * Converts CellDefinition to React element. Handles 3 cell types:
 * 1. MetricCellDef → PrimaryMetricCell | SecondaryMetricCell
 * 2. ComponentCellDef → Dynamic component from registry
 * 3. EmptyCellDef → EmptyCell for layout
 */
function renderCell(
  cell: CellDefinition,
  index: number,
  isPrimary: boolean,
  primarySensorType: string,
  primaryInstance: number,
  additionalSensorsMap: Record<string, { type: string; instance: number }>,
): React.ReactElement {
  // EmptyCellDef: Filler cell for layout
  if ('empty' in cell && cell.empty) {
    return <EmptyCell key={`empty-${index}`} />;
  }

  // ComponentCellDef: Custom component from registry
  if ('component' in cell) {
    // Platform-specific rendering
    if (cell.condition?.platform) {
      const currentPlatform = Platform.OS as 'ios' | 'android' | 'web';
      if (!cell.condition.platform.includes(currentPlatform)) {
        return <EmptyCell key={`hidden-${index}`} />;
      }
    }

    const Component = getWidgetComponent(cell.component);
    if (!Component) {
      console.warn(`[CustomWidget] Component "${cell.component}" not found in registry`);
      return <EmptyCell key={`missing-${index}`} />;
    }

    // Determine sensor type and instance for component
    let sensorType: string;
    let instance: number;
    
    if ((cell as any).sensorKey && additionalSensorsMap[(cell as any).sensorKey]) {
      const additionalSensor = additionalSensorsMap[(cell as any).sensorKey];
      sensorType = additionalSensor.type;
      instance = additionalSensor.instance;
    } else {
      sensorType = primarySensorType;
      instance = primaryInstance;
    }

    return (
      <Component
        key={`component-${index}`}
        sensorType={sensorType as any}
        instance={instance}
        metricKey={(cell as any).metricKey}
        {...(cell.props || {})}
      />
    );
  }

  // MetricCellDef: Standard metric display
  if ('metricKey' in cell) {
    const metricKey = cell.metricKey;
    
    // Determine sensor type and instance
    // If cell specifies sensorKey, look it up in additionalSensorsMap
    // Otherwise use primary sensor
    let sensorType: string;
    let instance: number;
    
    if (cell.sensorKey && additionalSensorsMap[cell.sensorKey]) {
      const additionalSensor = additionalSensorsMap[cell.sensorKey];
      sensorType = additionalSensor.type;
      instance = additionalSensor.instance;
    } else {
      sensorType = primarySensorType;
      instance = primaryInstance;
    }
    
    const cellType = cell.cellType || (isPrimary ? 'primary' : 'secondary');

    if (cellType === 'primary') {
      return (
        <PrimaryMetricCell
          key={`metric-${index}`}
          sensorType={sensorType as any}
          instance={instance}
          metricKey={metricKey}
        />
      );
    } else {
      return (
        <SecondaryMetricCell
          key={`metric-${index}`}
          sensorType={sensorType as any}
          instance={instance}
          metricKey={metricKey}
        />
      );
    }
  }

  // Fallback: Empty cell
  return <EmptyCell key={`empty-${index}`} />;
}

/**
 * CustomWidget Renderer
 *
 * Renders widgets dynamically from CustomWidgetDefinition
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const CustomWidget: React.FC<CustomWidgetProps> = React.memo(
  ({ id, instanceNumber = 0 }) => {
    // Get custom widget definition from widget settings
    const widgetConfig = useWidgetStore((state) =>
      state.dashboard?.widgets?.find((w) => w.id === id),
    );

    const definition = useMemo(() => {
      return widgetConfig?.settings?.customDefinition as CustomWidgetDefinition | undefined;
    }, [widgetConfig]);

    // Dynamic Sensor Types (no subscriptions)
    const primarySensorType = definition?.grid?.primarySensor?.type;
    const primaryInstance = definition?.grid?.primarySensor?.instance ?? 0;

    // Build additional sensors array for TemplatedWidget
    const additionalSensors = useMemo(() => {
      if (!definition?.grid?.additionalSensors) return undefined;

      return definition.grid.additionalSensors.map((sensor) => ({
        sensorType: sensor.type,
        instance: sensor.instance ?? 0,
        required: sensor.required,
      }));
    }, [definition]);

    // Build additionalSensorsMap for renderCell lookups
    const additionalSensorsMap = useMemo(() => {
      const map: Record<string, { type: string; instance: number }> = {};
      
      if (definition?.grid?.additionalSensors) {
        definition.grid.additionalSensors.forEach((sensor) => {
          // Use sensor key if provided, otherwise use type as key
          const key = sensor.key || sensor.type;
          map[key] = {
            type: sensor.type,
            instance: sensor.instance ?? 0,
          };
        });
      }
      
      return map;
    }, [definition]);

    // Determine primary/secondary split from GridTemplateRegistry
    const gridTemplate = definition?.grid?.template
      ? getGridTemplate(definition.grid.template)
      : null;
    const primaryCellCount = gridTemplate
      ? gridTemplate.primaryGrid.rows * gridTemplate.primaryGrid.columns
      : 0;

    // Generate children from cells
    const children = useMemo(() => {
      if (!definition?.grid?.cells) return [];
      if (!primarySensorType) return [];

      return definition.grid.cells.map((cell, index) => {
        const isPrimary = index < primaryCellCount;
        return renderCell(cell, index, isPrimary, primarySensorType, primaryInstance, additionalSensorsMap);
      });
    }, [definition?.grid?.cells, primaryCellCount, primarySensorType, primaryInstance, additionalSensorsMap]);

    // Validation
    if (!definition?.grid) {
      console.error(
        `[CustomWidget] RENDER BLOCKED - No grid configuration found for widget: ${id}`,
      );
      return null;
    }

    if (!primarySensorType) {
      console.error(
        `[CustomWidget] RENDER BLOCKED - No primary sensor type defined for widget: ${id}`,
      );
      return null;
    }

    if (!gridTemplate) {
      console.error(
        `[CustomWidget] RENDER BLOCKED - Invalid template "${definition.grid.template}" for widget: ${id}`,
      );
      return null;
    }

    if (children.length === 0) {
      console.error(`[CustomWidget] RENDER BLOCKED - No children generated for widget: ${id}`);
      return null;
    }

    return (
      <TemplatedWidget
        template={definition.grid.template}
        sensorType={primarySensorType}
        instanceNumber={primaryInstance}
        widgetId={definition.id}
        additionalSensors={additionalSensors}
      >
        {children}
      </TemplatedWidget>
    );
  },
);

CustomWidget.displayName = 'CustomWidget';

export default CustomWidget;
