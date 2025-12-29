import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
// Note: Alarm thresholds now auto-subscribed in TrendLine component
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { DepthSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { MetricValue } from '../types/MetricValue';
import { createMetricDisplay } from '../utils/metricDisplayHelpers';

interface DepthWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
  maxWidth?: number; // Cell width from UnifiedWidgetGrid
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
}

/**
 * Depth Widget - Water depth sounder per ui-architecture.md v2.3
 * Primary Grid (2×1): Current depth with large value + Trend Line Graph
 * Secondary Grid (2×1): Minimum depth (shoal alarm) + Maximum depth from session
 * Uses centralized unit system (meters/feet/fathoms) configurable via hamburger menu
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(
  ({ id, title, width, height, maxWidth, cellHeight }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width, height);

    // Widget state management per ui-architecture.md v2.3

    // NMEA data selectors - Read SensorInstance with primitive selector
    // ARCHITECTURAL FIX: Priority logic (DPT > DBT > DBK) is in NmeaSensorProcessor
    // Widget reads from SensorInstance.getMetric() for enriched display data
    const depthSensorInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.depth?.[0],
      (a, b) => a === b,
    );

    // Extract metrics from SensorInstance
    const depth = depthSensorInstance?.getMetric('depth')?.si_value;
    const depthSource = depthSensorInstance?.getMetric('depthSource')?.si_value;
    const depthReferencePoint = depthSensorInstance?.getMetric('depthReferencePoint')?.si_value;
    const sensorTimestamp = depthSensorInstance?.getMetric('timestamp')?.si_value;

    // Legacy fields for debugging (no longer used by widget)
    const dptDepth = depthSensorInstance?.getMetric('depthBelowWaterline')?.si_value;
    const dbtDepth = depthSensorInstance?.getMetric('depthBelowTransducer')?.si_value;
    const dbkDepth = depthSensorInstance?.getMetric('depthBelowKeel')?.si_value;

    // Simple stale check without interval
    const isStale = !sensorTimestamp || Date.now() - sensorTimestamp > 5000;

    // Note: Alarm thresholds for TrendLine are now auto-subscribed within the component
    // No need to fetch and convert them here

    const handleLongPressOnPin = useCallback(() => {}, [id]);

    // Responsive header sizing using proper base-size scaling
    const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

    // NEW: Use MetricValue display fields from SensorInstance (Phase 3 migration)
    // No more presentation hooks needed - MetricValue has pre-enriched display data
    // 🛡️ ARCHITECTURAL VALIDATION: MetricValue MUST exist - no fallbacks allowed
    
    // PERFORMANCE: Cache MetricValue with timestamp-based dependency (fine-grained)
    const depthMetric = useMemo(
      () => depthSensorInstance?.getMetric('depth'),
      [depthSensorInstance?.timestamp],
    );
    
    // PERFORMANCE: Cache formatted stats with timestamp-based dependency (fine-grained)
    const sessionStats = useMemo(
      () => depthSensorInstance?.getFormattedSessionStats('depth'),
      [depthSensorInstance?.timestamp],
    );

    // PERFORMANCE: Cache alarm level with timestamp-based dependency (fine-grained)
    const depthAlarmLevel = useMemo(
      () => depthSensorInstance?.getAlarmState('depth') ?? 0,
      [depthSensorInstance?.timestamp],
    );

    const convertDepth = useMemo(() => {
      // CRITICAL: If depth exists but metric is missing, this is a BUG
      if (depth !== null && depth !== undefined && !depthMetric) {
        console.error('🚨 SENSOR INSTANCE BUG: Depth value exists but metric not found!', {
          depth,
          depthSensorInstance,
          hasMetric: !!depthMetric,
        });
        // Throw exception in development to force structural fix
        if (__DEV__) {
          throw new Error(
            `[DepthWidget] Metric missing for depth=${depth}. ` +
              `This indicates SensorInstance.updateMetrics() failed. ` +
              `Check that 'depth' field is being passed to updateMetrics().`,
          );
        }
      }

      return {
        current: createMetricDisplay(
          'DEPTH',
          depthMetric?.formattedValue,
          depthMetric?.unit,
          depthAlarmLevel,
        ),
        sessionMin: createMetricDisplay(
          'MIN',
          sessionStats?.formattedMinValue,
          sessionStats?.unit,
          0,
        ),
        sessionMax: createMetricDisplay(
          'MAX',
          sessionStats?.formattedMaxValue,
          sessionStats?.unit,
          0,
        ),
      };
    }, [depth, depthMetric, sessionStats, depthAlarmLevel]);

    // Generate depth source info for user display
    const depthSourceInfo = useMemo(() => {
      if (!depthSource)
        return {
          shortLabel: 'DEPTH',
          icon: '❓',
        };

      const sourceInfo: Record<string, { shortLabel: string; icon: string }> = {
        DBT: { shortLabel: 'DBT', icon: '🔊' }, // Sonar/transducer
        DPT: { shortLabel: 'DPT', icon: '〰️' }, // Water surface
        DBK: { shortLabel: 'DBK', icon: '⚓' }, // Anchor/keel
      };

      return (
        sourceInfo[depthSource] || {
          shortLabel: depthSource,
          icon: '❓',
        }
      );
    }, [depthSource]);

    // Header component for UnifiedWidgetGrid v2
    const headerComponent = (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UniversalIcon
            name={WidgetMetadataRegistry.getMetadata('depth')?.icon || 'water-outline'}
            size={headerIconSize}
            color={theme.iconPrimary}
          />
          <Text
            style={{
              fontSize: headerFontSize,
              fontWeight: 'bold',
              letterSpacing: 0.5,
              color: theme.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    );

    return (
      <UnifiedWidgetGrid
        theme={theme}
        header={headerComponent}
        widgetWidth={width || 400}
        widgetHeight={height || 300}
        columns={1}
        primaryRows={2}
        secondaryRows={2}
        testID={`depth-widget-${id}`}
      >
        {/* Row 1: Current depth with large value */}
        <PrimaryMetricCell
          data={{
            ...convertDepth.current,
            mnemonic: depthSourceInfo.shortLabel || 'DEPTH',
            alarmState: isStale ? 1 : depthAlarmLevel,
          }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 2: Trend Line Graph - Self-subscribing pattern with auto-subscribed thresholds */}
        <TrendLine
          sensor="depth"
          instance={0}
          metric="depth"
          timeWindowMs={5 * 60 * 1000}
          usePrimaryLine={true}
          showXAxis={true}
          showYAxis={true}
          xAxisPosition="top"
          yAxisDirection="down"
          timeWindowMinutes={5}
          showTimeLabels={true}
          showGrid={true}
          strokeWidth={2}
          forceZero={true}
        />
        <SecondaryMetricCell
          data={{
            ...convertDepth.sessionMin,
            alarmState: 0,
          }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 4: Session maximum depth */}
        <SecondaryMetricCell
          data={{
            ...convertDepth.sessionMax,
            alarmState: 0,
          }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
      </UnifiedWidgetGrid>
    );
  },
);

DepthWidget.displayName = 'DepthWidget';

export default DepthWidget;
