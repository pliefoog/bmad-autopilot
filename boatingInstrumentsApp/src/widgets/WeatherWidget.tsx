import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { WeatherSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { getSensorDisplayName } from '../utils/sensorDisplayName';
import { log } from '../utils/logging/logger';

interface WeatherWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  cellHeight?: number;
}

/**
 * WeatherWidget - Atmospheric conditions monitoring
 * Primary Grid (2×2): Barometric Pressure (large) + Air Temperature + Humidity (stacked)
 * Trend Line: Pressure history with rising/falling/steady indicator
 * Secondary Grid: Dew Point (if available)
 * Supports multi-instance weather stations (up to 5)
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = React.memo(
  ({ id, title, width, height, maxWidth, cellHeight }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract weather station instance from widget ID (e.g., "weather-0", "weather-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/weather-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // Get session stats method from store
    const getSessionStats = useNmeaStore((state) => state.getSessionStats);

    // NMEA data - Read SensorInstance once, extract all metrics via getMetric()
    const weatherSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.weather?.[instanceNumber],
      (a, b) => a === b,
    );

    // Extract MetricValues for all weather fields
    const pressureMetric = weatherSensorData?.getMetric('pressure');
    const airTempMetric = weatherSensorData?.getMetric('airTemperature');
    const humidityMetric = weatherSensorData?.getMetric('humidity');
    const dewPointMetric = weatherSensorData?.getMetric('dewPoint');
    const nameMetric = weatherSensorData?.getMetric('name');

    // Extract SI values
    const pressure = (pressureMetric?.si_value as number | null) ?? null;
    const airTemperature = (airTempMetric?.si_value as number | null) ?? null;
    const humidity = (humidityMetric?.si_value as number | null) ?? null;
    const dewPoint = (dewPointMetric?.si_value as number | null) ?? null;
    const sensorName = (nameMetric?.si_value as string) ?? title;

    const weatherTimestamp = weatherSensorData?.timestamp;

    // Extract alarm levels
    const pressureAlarmLevel = weatherSensorData?.getAlarmState('pressure') ?? 0;
    const airTempAlarmLevel = weatherSensorData?.getAlarmState('airTemperature') ?? 0;

    // Check if data is stale (> 5 minutes old for atmospheric data)
    const [isStale, setIsStale] = useState(true);

    useEffect(() => {
      if (!weatherTimestamp) {
        setIsStale(true);
        return;
      }

      const checkStale = () => {
        const age = Date.now() - weatherTimestamp;
        setIsStale(age > 300000); // 5 minutes
      };

      checkStale();
      const interval = setInterval(checkStale, 10000); // Check every 10s
      return () => clearInterval(interval);
    }, [weatherTimestamp]);

    // Get display values from MetricValue (pre-enriched)
    const displayPressure = pressureMetric?.formattedValue ?? null;
    const displayPressureUnit = pressureMetric?.unit ?? 'hPa';
    const displayAirTemp = airTempMetric?.formattedValue ?? null;
    const displayAirTempUnit = airTempMetric?.unit ?? '°C';
    const displayHumidity = humidityMetric?.formattedValue ?? null;
    const displayDewPoint = dewPointMetric?.formattedValue ?? null;
    const displayDewPointUnit = dewPointMetric?.unit ?? '°C';

    // Get session stats for primary metrics
    const pressureStats = useMemo(() => {
      if (!weatherSensorData || !pressure) return null;
      return getSessionStats('weather', instanceNumber, 'pressure');
    }, [weatherSensorData, pressure, instanceNumber, getSessionStats]);

    const airTempStats = useMemo(() => {
      if (!weatherSensorData || !airTemperature) return null;
      return getSessionStats('weather', instanceNumber, 'airTemperature');
    }, [weatherSensorData, airTemperature, instanceNumber, getSessionStats]);

    const humidityStats = useMemo(() => {
      if (!weatherSensorData || !humidity) return null;
      return getSessionStats('weather', instanceNumber, 'humidity');
    }, [weatherSensorData, humidity, instanceNumber, getSessionStats]);

    // Widget state management
    const showSecondaryMetrics = useWidgetStore(
      (state) => state.visibilityState[id]?.showSecondaryMetrics ?? false,
    );

    const toggleSecondaryMetrics = useCallback(() => {
      useWidgetStore.getState().setWidgetVisibility(id, {
        showSecondaryMetrics: !showSecondaryMetrics,
      });
      log.widgetWeather('Weather widget toggled secondary metrics', () => ({
        widgetId: id,
        showSecondaryMetrics: !showSecondaryMetrics,
      }));
    }, [id, showSecondaryMetrics]);

    // Header with responsive font sizing
    const headerFontSize = useResponsiveHeader(width || 0, height || 0);
    const metadata = WidgetMetadataRegistry.getMetadata('weather');
    const displayName = getSensorDisplayName('weather', instanceNumber, sensorName);

    const header = (
      <View style={[styles.header, { height: cellHeight ?? 50 }]}>
        <View style={styles.headerLeft}>
          <UniversalIcon
            name={metadata?.icon || 'partly-sunny-outline'}
            size={headerFontSize}
            color={theme.colors.text}
          />
          <Text style={[styles.headerText, { fontSize: headerFontSize, color: theme.colors.text }]}>
            {displayName}
          </Text>
        </View>

        <TouchableOpacity onPress={toggleSecondaryMetrics} style={styles.toggleButton}>
          <UniversalIcon
            name={showSecondaryMetrics ? 'chevron-up' : 'chevron-down'}
            size={headerFontSize * 0.8}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>
    );

    // Primary Grid: Pressure (large), Air Temp + Humidity (stacked)
    const primaryGrid = (
      <View style={styles.primaryGrid}>
        {/* Pressure - Large cell (2 columns wide) */}
        <View style={styles.pressureContainer}>
          <PrimaryMetricCell
            value={displayPressure}
            unit={displayPressureUnit}
            label="PRESSURE"
            alarmLevel={pressureAlarmLevel}
            fontSize={fontSize * 1.2}
            showSessionStats={true}
            sessionStats={pressureStats}
            isStale={isStale}
          />
          
          {/* Pressure Trend Line */}
          {weatherSensorData && pressure !== null && (
            <View style={styles.trendContainer}>
              <TrendLine
                sensorType="weather"
                instance={instanceNumber}
                fieldName="pressure"
                width={(maxWidth ?? 300) * 0.9}
                height={(cellHeight ?? 120) * 0.3}
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>

        {/* Air Temperature + Humidity - Stacked cells */}
        <View style={styles.stackedContainer}>
          <SecondaryMetricCell
            value={displayAirTemp}
            unit={displayAirTempUnit}
            label="AIR TEMP"
            alarmLevel={airTempAlarmLevel}
            fontSize={fontSize * 0.9}
            showSessionStats={false}
            isStale={isStale}
          />
          
          <SecondaryMetricCell
            value={displayHumidity}
            unit="%"
            label="HUMIDITY"
            alarmLevel={0}
            fontSize={fontSize * 0.9}
            showSessionStats={false}
            isStale={isStale}
          />
        </View>
      </View>
    );

    // Secondary Grid: Dew Point (optional)
    const secondaryGrid = showSecondaryMetrics && dewPoint !== null && (
      <View style={styles.secondaryGrid}>
        <SecondaryMetricCell
          value={displayDewPoint}
          unit={displayDewPointUnit}
          label="DEW POINT"
          alarmLevel={0}
          fontSize={fontSize}
          showSessionStats={false}
          isStale={isStale}
        />
      </View>
    );

    return (
      <UnifiedWidgetGrid
        id={id}
        header={header}
        primaryGrid={primaryGrid}
        secondaryGrid={secondaryGrid}
        showSecondaryMetrics={showSecondaryMetrics}
        width={width}
        height={height}
        maxWidth={maxWidth}
        cellHeight={cellHeight}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.maxWidth === nextProps.maxWidth &&
      prevProps.cellHeight === nextProps.cellHeight
    );
  },
);

WeatherWidget.displayName = 'WeatherWidget';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontWeight: '600',
  },
  toggleButton: {
    padding: 4,
  },
  primaryGrid: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  pressureContainer: {
    flex: 2,
    justifyContent: 'space-between',
  },
  trendContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  stackedContainer: {
    flex: 1,
    gap: 8,
  },
  secondaryGrid: {
    marginTop: 8,
    gap: 8,
  },
});

export default WeatherWidget;
