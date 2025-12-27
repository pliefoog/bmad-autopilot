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

    // NEW: Get history and stats methods from store
    const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);
    const getSessionStats = useNmeaStore((state) => state.getSessionStats);

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

    // Calculate averages and maximums for secondary view using store history
    // Use getSessionStats which is optimized and updates correctly
    const calculations = useMemo(() => {
      const sogStats = getSessionStats('gps', 0, 'speedOverGround'); // GPS sensor tracks speedOverGround
      const stwStats = getSessionStats('speed', 0, 'throughWater'); // Speed sensor tracks throughWater

      return {
        sog: {
          avg: sogStats.avg,
          max: sogStats.max,
        },
        stw: {
          avg: stwStats.avg,
          max: stwStats.max,
        },
      };
    }, [getSessionStats, sog, stw, speedTimestamp]); // Re-calculate when sensor updates

    // NEW: Use MetricValue from SensorInstance (Phase 4 migration)
    // No more presentation hooks needed - data is pre-formatted in MetricValue
    const speedDisplayData = useMemo(() => {
      const createDisplay = (
        value: number | null | undefined,
        metricValue: any,
        mnemonic: string,
      ): MetricDisplayData => {
        // For direct sensor values, use MetricValue if available
        if (metricValue) {
          return {
            mnemonic,
            value: metricValue.formattedValue ?? '---',
            unit: metricValue.unit ?? 'kts',
            rawValue: value ?? 0,
            layout: { minWidth: 60, alignment: 'right' },
            presentation: { id: 'speed', name: 'Speed', pattern: 'xxx.x' },
            status: { isValid: value !== undefined && value !== null, isFallback: false },
          };
        }

        // For calculated values (avg, max), format using the same MetricValue's convert function if available
        let formattedValue = '---';
        let unit = 'kts';

        if (value !== null && value !== undefined) {
          // Get MetricValue from either GPS or speed sensor
          const availableMetric =
            gpsSensorData?.getMetric('speedOverGround') ||
            speedSensorData?.getMetric('throughWater');

          if (availableMetric && availableMetric.convertToDisplay) {
            // Use the same conversion and formatting as the primary sensor
            const converted = availableMetric.convertToDisplay(value);
            formattedValue = converted.toFixed(1); // Use same precision as main values
            unit = availableMetric.unit;
          } else {
            // Fallback: no formatting available
            formattedValue = value.toFixed(1);
          }
        }

        return {
          mnemonic,
          value: formattedValue,
          unit,
          rawValue: value ?? 0,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'speed', name: 'Speed', pattern: 'xxx.x' },
          status: { isValid: value !== undefined && value !== null, isFallback: false },
        };
      };

      return {
        sog: createDisplay(sog, gpsSensorData?.getMetric('speedOverGround'), 'SOG'),
        stw: createDisplay(stw, speedSensorData?.getMetric('throughWater'), 'STW'),
        sogAvg: createDisplay(calculations.sog.avg, null, 'AVG'),
        stwAvg: createDisplay(calculations.stw.avg, null, 'AVG'),
        sogMax: createDisplay(calculations.sog.max, null, 'MAX'),
        stwMax: createDisplay(calculations.stw.max, null, 'MAX'),
      };
    }, [sog, stw, calculations, gpsSensorData, speedSensorData]);

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
