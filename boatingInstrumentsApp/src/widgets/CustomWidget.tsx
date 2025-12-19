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
  
  // Phase 5: CustomWidget now uses sensor.display directly
  // No presentation hooks needed - data is pre-formatted in store
  
  /**
   * Subscribe to sensor data dynamically based on widget definition
   * Phase 5: Get complete sensor data (including display property)
   */
  const sensorDataMap = useMemo(() => {
    if (!customDefinition) return {};
    
    const dataMap: Record<string, any> = {};
    
    // Collect all sensor bindings (required + optional)
    const allBindings = [
      ...customDefinition.sensorBindings.required,
      ...customDefinition.sensorBindings.optional,
    ];
    
    // Subscribe to each sensor's complete data
    allBindings.forEach(binding => {
      const instance = binding.instance ?? 0;
      const key = `${binding.category}.${instance}.${binding.measurementType}`;
      
      // Get complete sensor data from store (includes display property)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const sensorData = useNmeaStore(
        (state) => state.nmeaData.sensors[binding.category]?.[instance],
        (a, b) => a === b
      );
      
      dataMap[key] = {
        sensor: sensorData,
        measurementType: binding.measurementType,
      };
    });
    
    return dataMap;
  }, [customDefinition]);
  
  /**
   * Build metric display data for a sensor binding using Phase 5 sensor.display
   */
  const buildMetricDisplay = useCallback((
    sensorKey: string,
    label: string,
    mnemonic: string,
    fallbackUnit: string
  ): MetricDisplayData => {
    const data = sensorDataMap[sensorKey];
    
    // No sensor data state
    if (!data || !data.sensor) {
      return {
        mnemonic,
        value: '---',
        unit: fallbackUnit,
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right',
        },
        presentation: {
          id: 'default',
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
    
    const measurementType = data.measurementType;
    const displayInfo = data.sensor.display?.[measurementType];
    
    // If no display info or invalid, show no data
    if (!displayInfo) {
      return {
        mnemonic,
        value: '---',
        unit: fallbackUnit,
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right',
        },
        presentation: {
          id: 'default',
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
    
    // Phase 5: Use cached display info from sensor.display
    return {
      mnemonic,
      value: displayInfo.formatted,
      unit: displayInfo.unit,
      rawValue: displayInfo.value,
      layout: {
        minWidth: 60,
        alignment: 'right',
      },
      presentation: {
        id: measurementType,
        name: label,
        pattern: 'xxx.x',
      },
      status: {
        isValid: true,
        isFallback: false,
      },
    };
  }, [sensorDataMap]);
  
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
