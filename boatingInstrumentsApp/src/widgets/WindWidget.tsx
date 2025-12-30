import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { useCurrentPresentation } from '../presentation/presentationStore';
import { MetricValue } from '../types/MetricValue';
import { createMetricDisplay } from '../utils/metricDisplayHelpers';

interface WindWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Wind Widget - Apparent/True Wind Focus per ui-architecture.md v2.3
 * Primary Grid (2×2): AWA, AWS, Gust (apparent wind)
 * Secondary Grid (2×2): TWA, TWS, True Gust (calculated true wind)
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);

  // Widget state management per ui-architecture.md v2.3

  // NOTE: History now tracked automatically in sensor data - no subscription needed

  // NMEA data - Read SensorInstances once, extract metrics
  const windSensorData = useNmeaStore(
    (state) => state.nmeaData.sensors.wind?.[0],
    (a, b) => a === b,
  );
  const windAngleMetric = windSensorData?.getMetric('direction');
  const windAngle = windAngleMetric?.si_value; // AWA
  const windSpeedMetric = windSensorData?.getMetric('speed');
  const windSpeed = windSpeedMetric?.si_value; // AWS
  const windTimestamp = windSensorData?.timestamp;

  // Extract alarm levels for wind metrics
  const windSpeedAlarmLevel = windSensorData?.getAlarmState('speed') ?? 0;
  const windAngleAlarmLevel = windSensorData?.getAlarmState('direction') ?? 0;

  // Get true wind from sensor (either hardware VWT or calculated)
  const trueSpeedMetric = windSensorData?.getMetric('trueSpeed');
  const trueSpeed = trueSpeedMetric?.si_value;
  const trueDirectionMetric = windSensorData?.getMetric('trueDirection');
  const trueDirection = trueDirectionMetric?.si_value;

  // Get GPS data for reference (STW - Speed Through Water)
  const speedInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.speed?.[0],
    (a, b) => a === b,
  );
  const stwMetric = speedInstance?.getMetric('throughWater');
  const stw = stwMetric?.si_value; // Speed through water (for reference only)

  // Wind history for gust calculations
  const [windHistory, setWindHistory] = useState<{
    apparent: { speed: number; angle: number; timestamp: number }[];
    true: { speed: number; angle: number; timestamp: number }[];
  }>({ apparent: [], true: [] });

  // NOTE: Wind speed history now auto-managed in sensor data - access via getSensorHistory when needed

  // Track wind history for gust calculations (local state for multi-dimensional data)
  useEffect(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    if (
      windSpeed !== undefined &&
      windSpeed !== null &&
      windAngle !== undefined &&
      windAngle !== null
    ) {
      setWindHistory((prev) => {
        // Check if the last entry is the same values to avoid duplicates
        const lastEntry = prev.apparent[prev.apparent.length - 1];
        if (
          lastEntry &&
          Math.abs(lastEntry.speed - windSpeed) < 0.01 &&
          Math.abs(lastEntry.angle - windAngle) < 0.1 &&
          now - lastEntry.timestamp < 1000
        ) {
          return prev; // Skip if same values within 1 second
        }

        return {
          ...prev,
          apparent: [...prev.apparent, { speed: windSpeed, angle: windAngle, timestamp: now }]
            .filter((entry) => entry.timestamp > tenMinutesAgo)
            .slice(-300), // Keep max 300 entries
        };
      });
    }
  }, [windSpeed, windAngle]);

  // Calculate wind gusts from store session stats (Phase 4 architecture)
  // PERFORMANCE: Cache formatted stats with timestamp-based dependency (fine-grained)
  const apparentStats = useMemo(
    () => windSensorData?.getFormattedSessionStats('speed'),
    [windSensorData?.timestamp],
  );
  const trueStats = useMemo(
    () => windSensorData?.getFormattedSessionStats('trueSpeed'),
    [windSensorData?.timestamp],
  );

  const gustCalculations = useMemo(() => {
    // Direction variation calculation still uses local history
    // (angle stats need different calculation than simple min/max)
    const calculateVariation = (data: { angle: number; timestamp: number }[]) => {
      if (data.length < 2) return null;
      const angles = data.map((d) => d.angle);

      // Calculate standard deviation for wind direction variation
      const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
      const variance =
        angles.reduce((sum, angle) => {
          const diff = angle - mean;
          return sum + diff * diff;
        }, 0) / angles.length;

      return Math.sqrt(variance);
    };

    return {
      apparentStats,
      trueStats,
      apparentVariation: calculateVariation(windHistory.apparent),
      trueVariation: calculateVariation(windHistory.true),
    };
  }, [apparentStats, trueStats, windHistory]);

  // Get current wind presentation for proper conversion
  const windPresentation = useCurrentPresentation('wind');

  // Enhanced angle display function with AWA port/starboard indication
  const getAngleDisplay = useCallback(
    (angleValue: number | null | undefined, label: string = 'Angle'): MetricDisplayData => {
      if (angleValue === undefined || angleValue === null) {
        return {
          mnemonic: label,
          value: undefined,
          unit: undefined,
          alarmState: 0,
        };
      }

      // Special formatting for Apparent Wind Angle (AWA)
      if (label === 'AWA') {
        const absAngle = Math.abs(angleValue);
        const side = angleValue >= 0 ? 'STB' : 'PRT';

        return {
          mnemonic: label,
          value: Math.round(absAngle).toString(),
          unit: `° ${side}`,
          alarmState: 0,
        };
      }

      return {
        mnemonic: label,
        value: Math.round(angleValue).toString(),
        unit: '°',
        alarmState: 0,
      };
    },
    [],
  );

  // Wind display data using MetricValue from SensorInstance (Phase 4)
  const windDisplayData = useMemo(() => {
    return {
      windSpeed: createMetricDisplay('AWS', windSensorData?.getMetric('speed')?.formattedValue, windSensorData?.getMetric('speed')?.unit, windSpeedAlarmLevel),
      trueWindSpeed: createMetricDisplay('TWS', windSensorData?.getMetric('trueSpeed')?.formattedValue, windSensorData?.getMetric('trueSpeed')?.unit, 0),
      windAngle: getAngleDisplay(windAngle, 'AWA'),
      trueWindAngle: getAngleDisplay(trueDirection, 'TWA'),
      apparentGust: createMetricDisplay('MAX', gustCalculations.apparentStats?.formattedMaxValue, gustCalculations.apparentStats?.unit, 0),
      trueGust: createMetricDisplay('MAX', gustCalculations.trueStats?.formattedMaxValue, gustCalculations.trueStats?.unit, 0),
      apparentVariation: getAngleDisplay(gustCalculations.apparentVariation, 'VAR'),
      trueVariation: getAngleDisplay(gustCalculations.trueVariation, 'VAR'),
    };
  }, [
    getAngleDisplay,
    windSpeed,
    windAngle,
    trueSpeed,
    trueDirection,
    gustCalculations,
    windSensorData,
    windPresentation,
    windSpeedAlarmLevel,
  ]);

  // Update true wind history
  useEffect(() => {
    if (trueSpeed !== null && trueSpeed !== undefined && trueDirection !== null && trueDirection !== undefined) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;

      setWindHistory((prev) => {
        // Check if the last entry is the same values to avoid duplicates
        const lastEntry = prev.true[prev.true.length - 1];
        if (
          lastEntry &&
          Math.abs(lastEntry.speed - trueSpeed) < 0.01 &&
          Math.abs(lastEntry.angle - trueDirection) < 0.1 &&
          now - lastEntry.timestamp < 1000
        ) {
          return prev; // Skip if same values within 1 second
        }

        return {
          ...prev,
          true: [...prev.true, { speed: trueSpeed, angle: trueDirection, timestamp: now }]
            .filter((entry) => entry.timestamp > tenMinutesAgo)
            .slice(-300),
        };
      });
    }
  }, [trueSpeed, trueDirection]);

  const handleLongPressOnPin = useCallback(() => {}, [id]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Data staleness detection (>5s = stale)
  const isStale = windTimestamp ? Date.now() - windTimestamp > 5000 : true;

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
          name={WidgetMetadataRegistry.getMetadata('wind')?.icon || 'navigate-outline'}
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
      columns={2}
      primaryRows={2}
      secondaryRows={2}
      testID={`wind-widget-${id}`}
    >
      {/* Row 1: AWS | TWS */}
      <PrimaryMetricCell
        data={{ ...windDisplayData.windSpeed, alarmState: isStale ? 1 : windSpeedAlarmLevel }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <PrimaryMetricCell
        data={{ ...windDisplayData.trueWindSpeed, alarmState: isStale ? 1 : 0 }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Row 2: AWA | TWA */}
      <PrimaryMetricCell
        data={{ ...windDisplayData.windAngle, alarmState: isStale ? 1 : windAngleAlarmLevel }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <PrimaryMetricCell
        data={{ ...windDisplayData.trueWindAngle, alarmState: isStale ? 1 : 0 }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Separator after row 2 */}
      {/* Row 3: Apparent Gust | True Gust */}
      <SecondaryMetricCell
        data={{ ...windDisplayData.apparentGust, alarmState: 0 }}
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <SecondaryMetricCell
        data={{ ...windDisplayData.trueGust, alarmState: 0 }}
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Row 4: Apparent Variation | True Variation */}
      <SecondaryMetricCell
        data={{ ...windDisplayData.apparentVariation, alarmState: 0 }}
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <SecondaryMetricCell
        data={{ ...windDisplayData.trueVariation, alarmState: 0 }}
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
    </UnifiedWidgetGrid>
  );
});

WindWidget.displayName = 'WindWidget';

export default WindWidget;
