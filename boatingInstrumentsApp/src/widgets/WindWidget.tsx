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

  const compassInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.compass?.[0],
    (a, b) => a === b,
  );
  const headingMetric = compassInstance?.getMetric('heading');
  const heading = headingMetric?.si_value; // For true wind

  const speedInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.speed?.[0],
    (a, b) => a === b,
  );
  const sogMetric = speedInstance?.getMetric('overGround');
  const sog = sogMetric?.si_value; // For true wind

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

  // Calculate True Wind from Apparent Wind
  const trueWind = useMemo(() => {
    if (windSpeed === undefined || windAngle === undefined || sog === undefined || sog === null) {
      return { angle: null, speed: null };
    }

    // Convert apparent wind to true wind
    // AWA is relative to bow, convert to true wind relative to north
    const awsKnots = windSpeed;
    const awaRadians = (windAngle * Math.PI) / 180;
    const sogKnots = sog;
    const headingRadians = heading ? (heading * Math.PI) / 180 : 0;

    // Vector calculation for true wind
    const apparentWindX = awsKnots * Math.sin(awaRadians);
    const apparentWindY = awsKnots * Math.cos(awaRadians);

    const vesselSpeedX = sogKnots * Math.sin(headingRadians);
    const vesselSpeedY = sogKnots * Math.cos(headingRadians);

    const trueWindX = apparentWindX - vesselSpeedX;
    const trueWindY = apparentWindY - vesselSpeedY;

    const trueWindSpeed = Math.sqrt(trueWindX * trueWindX + trueWindY * trueWindY);
    let trueWindAngle = (Math.atan2(trueWindX, trueWindY) * 180) / Math.PI;

    // Normalize angle to 0-360
    if (trueWindAngle < 0) trueWindAngle += 360;

    return {
      speed: trueWindSpeed,
      angle: trueWindAngle,
    };
  }, [windSpeed, windAngle, sog, heading]);

  // Get wind stats from store (triggers on sensor updates via windTimestamp dependency)
  const apparentSpeedStats = useMemo(() => {
    const stats = useNmeaStore.getState().getSessionStats('wind', 0, 'speed');
    return stats;
  }, [windTimestamp, windSpeed]);

  const trueSpeedStats = useMemo(() => {
    const stats = useNmeaStore.getState().getSessionStats('wind', 0, 'trueSpeed');
    return stats;
  }, [windTimestamp]);

  // Calculate wind gusts from store session stats (Phase 4 architecture)
  const gustCalculations = useMemo(() => {
    const apparentGust = apparentSpeedStats.max;
    const trueGust = trueSpeedStats.max;

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
      apparentGust,
      trueGust,
      apparentVariation: calculateVariation(windHistory.apparent),
      trueVariation: calculateVariation(windHistory.true),
    };
  }, [apparentSpeedStats, trueSpeedStats, windHistory]);

  // NEW: Use cached display info from sensor.display (Phase 3 migration)
  // Helper function to create MetricDisplayData from sensor display or manual value
  const getWindDisplay = useCallback(
    (
      windValue: number | null | undefined,
      displayInfo: any,
      label: string = 'Wind',
    ): MetricDisplayData => {
      // If no valid value, return N/A
      if (windValue === null || windValue === undefined) {
        return {
          mnemonic: label,
          value: '---',
          unit: 'kt',
          rawValue: 0,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'wind', name: 'Wind', pattern: 'xxx.x' },
          status: { isValid: false, isFallback: true },
        };
      }

      // Use displayInfo if available, otherwise format the raw value
      return {
        mnemonic: label,
        value: displayInfo?.value ?? windValue.toFixed(1),
        unit: displayInfo?.unit ?? 'kt',
        rawValue: windValue,
        layout: { minWidth: 60, alignment: 'right' },
        presentation: { id: 'wind', name: 'Wind', pattern: 'xxx.x' },
        status: { isValid: true, isFallback: !displayInfo },
      };
    },
    [],
  );

  // Enhanced angle display function with AWA port/starboard indication
  const getAngleDisplay = useCallback(
    (angleValue: number | null | undefined, label: string = 'Angle'): MetricDisplayData => {
      if (angleValue === undefined || angleValue === null) {
        return {
          mnemonic: label,
          value: '---',
          unit: '°',
          rawValue: 0,
          layout: { minWidth: 70, alignment: 'right' },
          presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
          status: { isValid: false, error: 'No data', isFallback: true },
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
          rawValue: angleValue,
          layout: { minWidth: 70, alignment: 'right' },
          presentation: { id: 'awa_deg', name: 'AWA with Port/Starboard', pattern: 'xxx° SSS' },
          status: {
            isValid: true,
            isFallback: false,
          },
        };
      }

      return {
        mnemonic: label, // NMEA source abbreviation like "TWA"
        value: Math.round(angleValue).toString(),
        unit: '°', // Presentation symbol for degrees
        rawValue: angleValue,
        layout: { minWidth: 70, alignment: 'right' },
        presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
        status: { isValid: true, isFallback: false },
      };
    },
    [],
  );

  // Wind display data using MetricValue from SensorInstance (Phase 4)
  const windDisplayData = useMemo(() => {
    return {
      windSpeed: getWindDisplay(windSpeed, windSensorData?.getMetric('speed'), 'AWS'),
      trueWindSpeed: getWindDisplay(trueWind.speed, windSensorData?.getMetric('trueSpeed'), 'TWS'),
      windAngle: getAngleDisplay(windAngle, 'AWA'),
      trueWindAngle: getAngleDisplay(trueWind.angle, 'TWA'),
      apparentGust: getWindDisplay(gustCalculations.apparentGust, null, 'MAX'),
      trueGust: getWindDisplay(gustCalculations.trueGust, null, 'MAX'),
      apparentVariation: getAngleDisplay(gustCalculations.apparentVariation, 'VAR'),
      trueVariation: getAngleDisplay(gustCalculations.trueVariation, 'VAR'),
    };
  }, [
    getWindDisplay,
    getAngleDisplay,
    windSpeed,
    windAngle,
    trueWind,
    gustCalculations,
    windSensorData,
  ]);

  // Update true wind history
  useEffect(() => {
    if (trueWind.speed !== null && trueWind.angle !== null) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;

      setWindHistory((prev) => {
        // Check if the last entry is the same values to avoid duplicates
        const lastEntry = prev.true[prev.true.length - 1];
        if (
          lastEntry &&
          Math.abs(lastEntry.speed - trueWind.speed!) < 0.01 &&
          Math.abs(lastEntry.angle - trueWind.angle!) < 0.1 &&
          now - lastEntry.timestamp < 1000
        ) {
          return prev; // Skip if same values within 1 second
        }

        return {
          ...prev,
          true: [...prev.true, { speed: trueWind.speed!, angle: trueWind.angle!, timestamp: now }]
            .filter((entry) => entry.timestamp > tenMinutesAgo)
            .slice(-300),
        };
      });
    }
  }, [trueWind.speed, trueWind.angle]); // Use specific values instead of whole object

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
