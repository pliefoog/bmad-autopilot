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
import { View, StyleSheet, Text } from 'react-native';
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
export const CustomWidget: React.FC<CustomWidgetProps> = React.memo(
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Widget state management

    // Get custom widget definition from widget settings
    const widgetConfig = useWidgetStore((state) =>
      state.dashboard?.widgets?.find((w) => w.id === id),
    );

    const customDefinition = useMemo(() => {
      return widgetConfig?.settings?.customDefinition as CustomWidgetDefinition | undefined;
    }, [widgetConfig]);

    // Unified Metric Architecture: CustomWidget reads MetricValue objects via getMetric()
    // No presentation hooks needed - data is pre-enriched in SensorInstance

    /**
     * Subscribe to ALL sensors that might be needed
     * Since we can't dynamically call hooks, we subscribe to all potential sensors
     * and filter based on what the widget actually uses
     */
    const allSensors = useNmeaStore((state) => state.nmeaData.sensors, (a, b) => a === b);

    /**
     * Build sensor data map from subscribed sensors based on widget definition
     */
    const sensorDataMap = useMemo(() => {
      if (!customDefinition) return {};

      const dataMap: Record<string, any> = {};

      // Collect all unique sensor keys from layout metrics
      const allMetrics = [
        ...customDefinition.layout.primaryMetrics,
        ...(customDefinition.layout.secondaryMetrics || []),
      ];

      // Parse sensor keys and get sensor data from subscribed sensors
      allMetrics.forEach((metric) => {
        const [category, instanceStr, measurementType] = metric.sensorKey.split('.');
        const instance = parseInt(instanceStr, 10);

        // Get sensor instance from subscribed data
        const sensorData = allSensors[category as any]?.[instance];

        dataMap[metric.sensorKey] = {
          sensor: sensorData,
          measurementType: measurementType,
        };
      });

      return dataMap;
    }, [customDefinition, allSensors]);

    /**
     * Build metric display data for a sensor binding using MetricValue API
     */
    const buildMetricDisplay = useCallback(
      (
        sensorKey: string,
        label: string,
        mnemonic: string,
        fallbackUnit: string,
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

        // Get MetricValue using Unified Metric Architecture
        const measurementType = data.measurementType;
        const metricValue = data.sensor.getMetric?.(measurementType);

        // If no metric value or invalid, show no data
        if (!metricValue) {
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

        // Use pre-enriched MetricValue properties
        return {
          mnemonic,
          value: metricValue.formattedValue, // ⭐ Use formattedValue (without unit)
          unit: metricValue.unit || fallbackUnit,
          rawValue: typeof metricValue.si_value === 'number' ? metricValue.si_value : 0,
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
      },
      [sensorDataMap],
    );

    // Render nothing if no definition
    if (!customDefinition) {
      return null;
    }

    // Build primary metrics
    const primaryMetrics = customDefinition.layout.primaryMetrics.map((metric) =>
      buildMetricDisplay(metric.sensorKey, metric.label, metric.mnemonic, metric.unit),
    );

    // Build secondary metrics (if any)
    const secondaryMetrics =
      customDefinition.layout.secondaryMetrics?.map((metric) =>
        buildMetricDisplay(metric.sensorKey, metric.label, metric.mnemonic, metric.unit),
      ) || [];

    // Build header component
    const headerComponent = (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>
          {customDefinition.name}
        </Text>
      </View>
    );

    return (
      <UnifiedWidgetGrid
        theme={theme}
        header={headerComponent}
        widgetWidth={width || 400}
        widgetHeight={height || 300}
        columns={1}
        primaryRows={primaryMetrics.length}
        secondaryRows={secondaryMetrics.length}
        testID={`custom-widget-${id}`}
      >
        {/* Render primary metrics */}
        {primaryMetrics.map((metric, index) => (
          <PrimaryMetricCell
            key={`primary-${index}`}
            mnemonic={metric.mnemonic}
            value={metric.value}
            unit={metric.unit}
            state="normal"
            fontSize={{
              mnemonic: fontSize.label,
              value: fontSize.value,
              unit: fontSize.unit,
            }}
          />
        ))}

        {/* Render secondary metrics */}
        {secondaryMetrics.map((metric, index) => (
          <SecondaryMetricCell
            key={`secondary-${index}`}
            mnemonic={metric.mnemonic}
            value={metric.value}
            unit={metric.unit}
            state="normal"
            compact={true}
            fontSize={{
              mnemonic: fontSize.label,
              value: fontSize.value,
              unit: fontSize.unit,
            }}
          />
        ))}
      </UnifiedWidgetGrid>
    );
  },
);

CustomWidget.displayName = 'CustomWidget';

const styles = StyleSheet.create({
  // Styles handled by UnifiedWidgetGrid
});

export default CustomWidget;
