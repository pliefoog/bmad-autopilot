import React, { useMemo, useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { TrendLine } from '../components/TrendLine';

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
 * Primary Grid (2x2): Pressure, Air Temp, Humidity, Dew Point
 * Secondary Grid: Pressure trend line
 * Supports multi-instance weather stations (up to 5)
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = React.memo(
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract weather station instance from widget ID (e.g., "weather-0", "weather-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/weather-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // NMEA data - Read SensorInstance once, extract all metrics via getMetric()
    const weatherSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.weather?.[instanceNumber],
    );

    // Extract MetricValues for all weather fields
    const pressureMetric = weatherSensorData?.getMetric('pressure');
    const airTempMetric = weatherSensorData?.getMetric('airTemperature');
    const humidityMetric = weatherSensorData?.getMetric('humidity');
    const dewPointMetric = weatherSensorData?.getMetric('dewPoint');
    const nameMetric = weatherSensorData?.getMetric('name');

    const sensorName = (nameMetric?.si_value as string) ?? title;
    const weatherTimestamp = weatherSensorData?.timestamp;

    // Extract alarm levels
    const pressureAlarmLevel = weatherSensorData?.getAlarmState('pressure') ?? 0;
    const airTempAlarmLevel = weatherSensorData?.getAlarmState('airTemperature') ?? 0;
    const humidityAlarmLevel = weatherSensorData?.getAlarmState('humidity') ?? 0;
    const dewPointAlarmLevel = weatherSensorData?.getAlarmState('dewPoint') ?? 0;

    // Display values from MetricValue (pre-enriched with unit conversion)
    const displayPressure = pressureMetric?.formattedValue ?? null;
    const displayPressureUnit = pressureMetric?.unit ?? 'hPa';
    const displayAirTemp = airTempMetric?.formattedValue ?? null;
    const displayAirTempUnit = airTempMetric?.unit ?? '°C';
    const displayHumidity = humidityMetric?.formattedValue ?? null;
    const displayHumidityUnit = humidityMetric?.unit ?? '%';
    const displayDewPoint = dewPointMetric?.formattedValue ?? null;
    const displayDewPointUnit = dewPointMetric?.unit ?? '°C';

    // Check if data is stale (> 5 minutes old for weather data)
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
      const interval = setInterval(checkStale, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }, [weatherTimestamp]);

    // Display title
    const getDisplayTitle = () => {
      if (instanceNumber === 0) {
        return sensorName || 'WEATHER STATION';
      }
      return sensorName || `WEATHER ${instanceNumber}`;
    };

    // Calculate responsive header sizes
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
            name={WidgetMetadataRegistry.getMetadata('weather')?.icon || 'partly-sunny-outline'}
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
        widgetWidth={width || 320}
        widgetHeight={height || 240}
        columns={2}
        primaryRows={2}
        secondaryRows={1}
        testID={`weather-widget-${instanceNumber}`}
      >
        {/* Primary Grid 2x2 */}
        {/* Row 1, Col 1: Barometric Pressure */}
        <PrimaryMetricCell
          mnemonic="PRESS"
          value={displayPressure !== null ? String(displayPressure) : '---'}
          unit={displayPressureUnit}
          state={isStale ? 'warning' : pressureAlarmLevel > 0 ? 'alarm' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 1, Col 2: Air Temperature */}
        <PrimaryMetricCell
          mnemonic="AIR"
          value={displayAirTemp !== null ? String(displayAirTemp) : '---'}
          unit={displayAirTempUnit}
          state={isStale ? 'warning' : airTempAlarmLevel > 0 ? 'alarm' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 2, Col 1: Humidity */}
        <PrimaryMetricCell
          mnemonic="HUM"
          value={displayHumidity !== null ? String(displayHumidity) : '---'}
          unit={displayHumidityUnit}
          state={isStale ? 'warning' : humidityAlarmLevel > 0 ? 'alarm' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 2, Col 2: Dew Point */}
        <PrimaryMetricCell
          mnemonic="DEW"
          value={displayDewPoint !== null ? String(displayDewPoint) : '---'}
          unit={displayDewPointUnit}
          state={isStale ? 'warning' : dewPointAlarmLevel > 0 ? 'alarm' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Secondary Row 1: Pressure Trend Line */}
        <TrendLine
          sensor="weather"
          instance={instanceNumber}
          metric="pressure"
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
          forceZero={false}
        />
      </UnifiedWidgetGrid>
    );
  },
);

export default WeatherWidget;
