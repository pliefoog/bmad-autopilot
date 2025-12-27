import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
// Note: Alarm thresholds now auto-subscribed in TrendLine component
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemperatureSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { getSensorDisplayName } from '../utils/sensorDisplayName';

interface TemperatureWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  maxWidth?: number; // Cell width from UnifiedWidgetGrid
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
}

/**
 * TemperatureWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Grid (2×1): Temperature (°C/°F) + Trend Line Graph
 * Secondary Grid (2×1): Location + Instance
 * Supports multi-instance temperature sensors (seawater, engine, cabin, exhaust, etc.)
 */
export const TemperatureWidget: React.FC<TemperatureWidgetProps> = React.memo(
  ({ id, title, width, height, maxWidth, cellHeight }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract temperature instance from widget ID (e.g., "temp-0", "temp-1", "temperature-0", "temperature-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/temp(?:erature)?-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // Widget state management

    // NEW: Get session stats method from store
    const getSessionStats = useNmeaStore((state) => state.getSessionStats);

    // NMEA data - Read SensorInstance once, extract all metrics via getMetric()
    const temperatureSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.temperature?.[instanceNumber],
      (a, b) => a === b,
    );

    // Extract numeric MetricValue
    const temperatureMetric = temperatureSensorData?.getMetric('value');
    const temperature = (temperatureMetric?.si_value as number | null) ?? null;

    // Extract string MetricValues (now properly stored in _metrics Map)
    const locationMetric = temperatureSensorData?.getMetric('location');
    const location = (locationMetric?.si_value as string) ?? 'unknown';

    const unitsMetric = temperatureSensorData?.getMetric('units');
    const units = (unitsMetric?.si_value as string) ?? 'C';

    const nameMetric = temperatureSensorData?.getMetric('name');
    const sensorName = (nameMetric?.si_value as string) ?? title;

    const temperatureTimestamp = temperatureSensorData?.timestamp;

    // Extract alarm level for temperature
    const temperatureAlarmLevel = temperatureSensorData?.getAlarmState('value') ?? 0;

    // Check if data is stale (> 5 seconds old)
    // Use state + useEffect to detect staleness without causing re-renders on every cycle
    const [isStale, setIsStale] = useState(true);

    useEffect(() => {
      if (!temperatureTimestamp) {
        setIsStale(true);
        return;
      }

      const checkStale = () => {
        const age = Date.now() - temperatureTimestamp;
        setIsStale(age > 5000);
      };

      // Check immediately when timestamp changes
      checkStale();

      // Then check periodically every second
      const interval = setInterval(checkStale, 1000);
      return () => clearInterval(interval);
    }, [temperatureTimestamp]); // CRITICAL: Only timestamp, not full object!

    // NEW: Use MetricValue from SensorInstance (Phase 4 migration)
    // MetricValue has pre-enriched display data
    const valueMetric = temperatureSensorData?.getMetric('value');
    const displayTemperature = valueMetric?.value ?? null;
    const displayUnit = valueMetric?.unit || '°C';

    // Note: Alarm thresholds for TrendLine are now auto-subscribed within the component
    // No need to fetch and convert them here

    const handleLongPressOnPin = useCallback(() => {}, [id]);

    // Get display title with custom name support
    const getDisplayTitle = useCallback(() => {
      // Standard NMEA temperature location mapping for fallback
      const locationMap: Record<string, string> = {
        engine: 'Engine',
        engineRoom: 'Engine Room',
        seawater: 'Sea Water',
        outside: 'Outside Air',
        cabin: 'Main Cabin',
        exhaust: 'Exhaust',
        refrigeration: 'Refrigerator',
        refrigerator: 'Refrigerator',
        freezer: 'Freezer',
        battery: 'Battery Bay',
        liveWell: 'Live Well',
        baitWell: 'Bait Well',
      };

      const locationName =
        locationMap[location] ||
        (location && location.length > 0
          ? location.charAt(0).toUpperCase() + location.slice(1)
          : 'Unknown');
      const fallbackTitle = `Temperature - ${locationName}`;

      // Use getSensorDisplayName to get custom name if configured
      return getSensorDisplayName(
        'temperature',
        instanceNumber,
        temperatureSensorData?.alarmThresholds,
        fallbackTitle,
      );
    }, [location, instanceNumber, temperatureSensorData]);

    // Calculate responsive header sizes based on widget dimensions
    // Responsive header sizing using proper base-size scaling
    const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

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
            name={WidgetMetadataRegistry.getMetadata('temperature')?.icon || 'thermometer-outline'}
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
            {getDisplayTitle()}
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
        testID={`temperature-widget-${instanceNumber}`}
      >
        {/* Primary Row 1: Temperature */}
        <PrimaryMetricCell
          mnemonic="TEMP"
          value={displayTemperature !== null ? String(displayTemperature) : '---'}
          unit={displayUnit}
          data={{ alarmState: isStale ? 1 : temperatureAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Primary Row 2: Trend Line - Self-subscribing pattern with auto-subscribed thresholds */}
        <TrendLine
          sensor="temperature"
          instance={instanceNumber}
          metric="value"
          timeWindowMs={5 * 60 * 1000}
          usePrimaryLine={temperatureAlarmLevel === 0}
          showXAxis={true}
          showYAxis={true}
          xAxisPosition="bottom"
          yAxisDirection="up"
          timeWindowMinutes={5}
          showTimeLabels={true}
          showGrid={true}
          strokeWidth={2}
        />

        {/* Secondary Row 1: Location */}
        <SecondaryMetricCell
          mnemonic="LOC"
          value={location && location.trim().length > 0 ? location.toUpperCase() : 'UNKNOWN'}
          unit=""
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Secondary Row 2: Instance */}
        <SecondaryMetricCell
          mnemonic="INST"
          value={typeof instanceNumber === 'number' ? String(instanceNumber) : '0'}
          unit=""
          state="normal"
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

export default TemperatureWidget;
