/**
 * Custom Widget Component
 * 
 * Generic widget that renders user-defined or system-provided custom widgets.
 * Supports dynamic sensor binding, flexible metric layout, and graceful handling
 * of missing optional sensors.
 * 
 * Similar architecture to DepthWidget and EngineWidget but with dynamic sensor subscriptions
 * based on CustomWidgetDefinition configuration.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation, useDepthPresentation, useTemperaturePresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import type { CustomWidgetDefinition } from '../config/defaultCustomWidgets';
import type { SensorType } from '../types/SensorData';

interface CustomWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * Custom Widget - Dynamic multi-sensor display
 * 
 * Supports:
 * - Required sensors (must be present for widget to render)
 * - Optional sensors (show "No Data" if missing)
 * - Primary and secondary metric layouts
 * - Dynamic sensor instance selection (uses first available)
 */
export const CustomWidget: React.FC<CustomWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  
  // Widget state management
  
  // Get custom widget definition from widget settings
  const widgetConfig = useWidgetStore((state) => 
    state.dashboard?.widgets?.find(w => w.id === id)
  );
  
  const customDefinition = useMemo(() => {
    return widgetConfig?.settings?.customDefinition as CustomWidgetDefinition | undefined;
  }, [widgetConfig]);
  
  // Presentation hooks
  const depthPresentation = useDepthPresentation();
  const temperaturePresentation = useTemperaturePresentation();
  const speedPresentation = useDataPresentation('speed');
  const genericPresentation = useDataPresentation('generic');
  
  /**
   * Get presentation hook based on sensor category
   */
  const getPresentationForSensor = useCallback((category: SensorType) => {
    switch (category) {
      case 'depth':
        return depthPresentation;
      case 'temperature':
        return temperaturePresentation;
      case 'speed':
        return speedPresentation;
      default:
        return genericPresentation;
    }
  }, [depthPresentation, temperaturePresentation, speedPresentation, genericPresentation]);
  
  /**
   * Subscribe to sensor data dynamically based on widget definition
   * Uses selective Zustand subscriptions with shallow equality checks
   */
  const sensorValues = useMemo(() => {
    if (!customDefinition) return {};
    
    const values: Record<string, number | null> = {};
    
    // Collect all sensor bindings (required + optional)
    const allBindings = [
      ...customDefinition.sensorBindings.required,
      ...customDefinition.sensorBindings.optional,
    ];
    
    // Subscribe to each sensor value
    allBindings.forEach(binding => {
      const instance = binding.instance ?? 0;
      const key = `${binding.category}.${instance}.${binding.measurementType}`;
      
      // Get sensor value from store
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const value = useNmeaStore(
        (state) => {
          const sensorData = state.nmeaData.sensors[binding.category]?.[instance];
          return sensorData ? (sensorData as any)[binding.measurementType] ?? null : null;
        },
        (a, b) => a === b
      );
      
      values[key] = value;
    });
    
    return values;
  }, [customDefinition]);
  
  /**
   * Build metric display data for a sensor binding
   */
  const buildMetricDisplay = useCallback((
    sensorKey: string,
    label: string,
    mnemonic: string,
    unit: string
  ): MetricDisplayData => {
    const value = sensorValues[sensorKey];
    const presentation = getPresentationForSensor(sensorKey.split('.')[0] as SensorType);
    const presDetails = presentation.presentation;
    
    // No data state
    if (value === null || value === undefined) {
      return {
        mnemonic,
        value: '---',
        unit,
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right',
        },
        presentation: {
          id: presDetails?.id || 'default',
          name: label,
          pattern: 'xxx',
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true,
        },
      };
    }
    
    // Valid data state
    return {
      mnemonic,
      value: presentation.format(value),
      unit: presDetails?.symbol || unit,
      rawValue: value,
      layout: {
        minWidth: 60,
        alignment: 'right',
      },
      presentation: {
        id: presDetails?.id || 'default',
        name: label,
        pattern: presDetails?.pattern || 'xxx.x',
      },
      status: {
        isValid: true,
        isFallback: false,
      },
    };
  }, [sensorValues, getPresentationForSensor]);
  
  // Render nothing if no definition
  if (!customDefinition) {
    return null;
  }
  
  // Build primary metrics
  const primaryMetrics = customDefinition.layout.primaryMetrics.map(metric => 
    buildMetricDisplay(metric.sensorKey, metric.label, metric.mnemonic, metric.unit)
  );
  
  // Build secondary metrics (if any)
  const secondaryMetrics = customDefinition.layout.secondaryMetrics?.map(metric => 
    buildMetricDisplay(metric.sensorKey, metric.label, metric.mnemonic, metric.unit)
  ) || [];
  
  return (
    <UnifiedWidgetGrid
      primaryData={primaryMetrics}
      secondaryData={secondaryMetrics}
      widgetWidth={width}
      widgetHeight={height}
      theme={theme}
    />
  );
});

CustomWidget.displayName = 'CustomWidget';

const styles = StyleSheet.create({
  // Styles handled by UnifiedWidgetGrid
});

export default CustomWidget;
