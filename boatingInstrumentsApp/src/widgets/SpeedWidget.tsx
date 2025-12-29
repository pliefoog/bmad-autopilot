import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { MetricValue } from '../types/MetricValue';

interface SpeedWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Speed Widget - STW/SOG Focus per ui-architecture.md v2.3
 * Primary Grid (2×2): Column 1: SOG + MAX SOG, Column 2: STW + MAX STW
 * Secondary Grid (2×2): AVG values for both STW/SOG
 * Interactive Chart: STW trend (tap to switch to SOG)
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width, height);

    // Responsive header sizing using proper base-size scaling
    const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

    // Widget state management per ui-architecture.md v2.3

    // NOTE: History now tracked automatically in sensor data - no subscription needed

    // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
    // ARCHITECTURAL FIX: STW from speed sensor (paddlewheel), SOG from GPS sensor (GPS-calculated)
    // VHW sentence → speed sensor throughWater (STW - paddlewheel measurement)
    // VTG/RMC sentence → GPS sensor speedOverGround (SOG - GPS calculation from position changes)
    const speedSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.speed?.[0],
      (a, b) => a === b,
    );
    const gpsSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.gps?.[0],
      (a, b) => a === b,
    );
    const stw = speedSensorData?.throughWater;
    const sog = gpsSensorData?.speedOverGround;
    const speedTimestamp = speedSensorData?.timestamp;

    // Debug: Log actual values from store
    useEffect(() => {
      if (Math.random() < 0.05) {
        // Log ~5% of the time
      }
    }, [sog, stw]);

    // Get alarm levels from SensorInstance (Phase 5 refactor)
    const sogAlarmLevel = gpsSensorData?.getAlarmState('speedOverGround') ?? 0;
    const stwAlarmLevel = speedSensorData?.getAlarmState('throughWater') ?? 0;

    // NEW: Use MetricValue from SensorInstance (Phase 4 migration)
    // No more presentation hooks needed - data is pre-formatted in MetricValue
    
    // PERFORMANCE: Cache formatted stats with timestamp-based dependencies (fine-grained)
    const sogStats = useMemo(
      () => gpsSensorData?.getFormattedSessionStats('speedOverGround'),
      [gpsSensorData?.timestamp],
    );
    const stwStats = useMemo(
      () => speedSensorData?.getFormattedSessionStats('throughWater'),
      [speedSensorData?.timestamp],
    );
    
    // PERFORMANCE: Cache MetricValue objects with timestamp-based dependencies
    const sogMetric = useMemo(
      () => gpsSensorData?.getMetric('speedOverGround'),
      [gpsSensorData?.timestamp],
    );
    const stwMetric = useMemo(
      () => speedSensorData?.getMetric('throughWater'),
      [speedSensorData?.timestamp],
    );
    
    const speedDisplayData = useMemo(() => {
      const createDisplay = (
        value: number | null | undefined,
        metricValue: any,
        mnemonic: string,
        statValue?: string,
        statUnit?: string,
      ): MetricDisplayData => {
        // For session stats, use formatted values from getFormattedSessionStats
        if (statValue !== undefined) {
          return {
            mnemonic,
            value: statValue,
            unit: statUnit ?? 'kts',
            alarmState: 0,
            layout: { minWidth: 60, alignment: 'right' },
          };
        }

        // For direct sensor values, use MetricValue if available
        if (metricValue) {
          return {
            mnemonic,
            value: metricValue.formattedValue ?? '---',
            unit: metricValue.unit ?? 'kts',
            alarmState: 0,
            layout: { minWidth: 60, alignment: 'right' },
          };
        }

        return {
          mnemonic,
          value: '---',
          unit: 'kts',
          alarmState: 0,
          layout: { minWidth: 60, alignment: 'right' },
        };
      };

      return {
        sog: createDisplay(sog, sogMetric, 'SOG'),
        stw: createDisplay(stw, stwMetric, 'STW'),
        sogAvg: createDisplay(null, null, 'AVG', sogStats?.formattedAvgValue, sogStats?.unit),
        stwAvg: createDisplay(null, null, 'AVG', stwStats?.formattedAvgValue, stwStats?.unit),
        sogMax: createDisplay(null, null, 'MAX', sogStats?.formattedMaxValue, sogStats?.unit),
        stwMax: createDisplay(null, null, 'MAX', stwStats?.formattedMaxValue, stwStats?.unit),
      };
    }, [sog, stw, sogMetric, stwMetric, sogStats, stwStats]);

    const handleLongPressOnPin = useCallback(() => {}, [id]);

    // Data staleness detection - consider stale if no speed data (either SOG or STW)
    const isStale = (sog === undefined || sog === null) && (stw === undefined || stw === null);

    // Widget header component with responsive sizing
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
            name={WidgetMetadataRegistry.getMetadata('speed')?.icon || 'speedometer-outline'}
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
        widgetWidth={width}
        widgetHeight={height}
        primaryRows={2}
        secondaryRows={2}
        columns={2}
        testID={`speed-widget-${id}`}
      >
        {/* Row 0: SOG and STW (current values) */}
        <PrimaryMetricCell
          data={{ ...speedDisplayData.sog, alarmState: isStale ? 1 : sogAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...speedDisplayData.stw, alarmState: isStale ? 1 : stwAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 1: MAX SOG and MAX STW */}
        <PrimaryMetricCell
          data={{ ...speedDisplayData.sogMax, alarmState: 0 }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...speedDisplayData.stwMax, alarmState: 0 }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={{ ...speedDisplayData.sogAvg, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={{ ...speedDisplayData.stwAvg, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 3: Empty space for consistent 4-row layout */}
        <View />
        <View />
      </UnifiedWidgetGrid>
    );
  },
);

SpeedWidget.displayName = 'SpeedWidget';

export default SpeedWidget;
