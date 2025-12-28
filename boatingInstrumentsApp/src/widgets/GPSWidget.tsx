import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUnitConversion } from '../hooks/useUnitConversion';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface GPSWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * GPS Widget - GPS Position Display per ui-architecture.md v2.3
 * Primary Grid (2×1): Latitude and Longitude coordinates using unit conversion system
 * Secondary Grid (2×1): UTC Date with day of week + UTC Time
 */
export const GPSWidget: React.FC<GPSWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Date/time formatting still uses useUnitConversion (Story 9.6 scope)
  const { getGpsFormattedDateTime } = useUnitConversion();

  // GPS settings for date/time formatting
  // Coordinate format handled by useMetricDisplay hook
  const gpsDateFormat = useSettingsStore((state) => state.gps.dateFormat);
  const gpsTimeFormat = useSettingsStore((state) => state.gps.timeFormat);
  const gpsTimezone = useSettingsStore((state) => state.gps.timezone); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Widget state management per ui-architecture.md v2.3

  // Widget interaction handlers per ui-architecture.md v2.3

  // NMEA data selectors - NMEA Store v2.0 sensor-based interface
  // Using SensorInstance pattern with getMetric() for proper MetricValue access
  const gpsInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.gps?.[0],
    (a, b) => a === b,
  );

  // Extract MetricValues for coordinates and time (proper formatting per user preferences)
  const latitudeMetric = gpsInstance?.getMetric('latitude');
  const longitudeMetric = gpsInstance?.getMetric('longitude');
  const utcTimeMetric = gpsInstance?.getMetric('utcTime');

  // Extract MetricValues for GPS quality fields (numeric fields, not nested object)
  const fixTypeMetric = gpsInstance?.getMetric('fixType');
  const satellitesMetric = gpsInstance?.getMetric('satellites');
  const hdopMetric = gpsInstance?.getMetric('hdop');

  // GPS timestamp for staleness detection
  const gpsTimestamp = gpsInstance?.timestamp;

  // Extract display values from MetricValues (pre-enriched with user formatting)
  const latDisplay = {
    mnemonic: 'LAT',
    value: latitudeMetric?.formattedValue ?? '---',
    unit: latitudeMetric?.unit ?? '',
  };

  const lonDisplay = {
    mnemonic: 'LON',
    value: longitudeMetric?.formattedValue ?? '---',
    unit: longitudeMetric?.unit ?? '',
  };

  // Date and Time formatting - GPS always displays UTC time (marine standard)
  const dateTimeFormatted = useMemo(() => {
    const utcTime = utcTimeMetric?.si_value; // Get timestamp from MetricValue
    if (!utcTime) {
      return {
        date: '--- ---, ----',
        time: '--:--:--',
        timezone: 'UTC',
      };
    }

    const date = new Date(utcTime); // utcTime is already a UTC timestamp

    // GPS always shows UTC time - format directly without timezone conversion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();

    // Format date based on GPS date format setting
    let formattedDate: string;
    switch (gpsDateFormat) {
      case 'iso_date':
        formattedDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day
          .toString()
          .padStart(2, '0')}`;
        break;
      case 'us_date':
        formattedDate = `${(month + 1).toString().padStart(2, '0')}/${day
          .toString()
          .padStart(2, '0')}/${year}`;
        break;
      case 'eu_date':
        formattedDate = `${day.toString().padStart(2, '0')}.${(month + 1)
          .toString()
          .padStart(2, '0')}.${year}`;
        break;
      case 'uk_date':
        formattedDate = `${day.toString().padStart(2, '0')}/${(month + 1)
          .toString()
          .padStart(2, '0')}/${year}`;
        break;
      case 'nautical_date':
      default:
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        formattedDate = `${dayNames[date.getUTCDay()]} ${monthNames[month]} ${day
          .toString()
          .padStart(2, '0')}, ${year}`;
        break;
    }

    // Format time based on GPS time format setting
    let formattedTime: string;
    switch (gpsTimeFormat) {
      case 'time_24h':
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}`;
        break;
      case 'time_12h':
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        formattedTime = `${hours12.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')} ${ampm}`;
        break;
      case 'time_12h_full':
        const hours12Full = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampmFull = hours >= 12 ? 'PM' : 'AM';
        formattedTime = `${hours12Full.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampmFull}`;
        break;
      case 'time_compact':
        formattedTime = `${hours.toString().padStart(2, '0')}.${minutes
          .toString()
          .padStart(2, '0')}`;
        break;
      case 'time_24h_full':
      default:
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        break;
    }

    return {
      date: formattedDate,
      time: formattedTime,
      timezone: 'UTC',
    };
  }, [utcTimeMetric, gpsDateFormat, gpsTimeFormat]);

  const handleLongPressOnPin = useCallback(() => {}, [id]);

  // Data staleness detection (>10s = stale for GPS)
  const isStale = gpsTimestamp ? Date.now() - gpsTimestamp > 10000 : true;

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
          name={WidgetMetadataRegistry.getMetadata('gps')?.icon || 'location-outline'}
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
      columns={1}
      testID={`gps-widget-${id}`}
    >
      {/* Row 1: Latitude */}
      <PrimaryMetricCell
        mnemonic={latDisplay.mnemonic}
        value={latDisplay.value}
        unit={latDisplay.unit}
        data={{ alarmState: isStale ? 1 : 0 }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Row 2: Longitude */}
      <PrimaryMetricCell
        mnemonic={lonDisplay.mnemonic}
        value={lonDisplay.value}
        unit={lonDisplay.unit}
        data={{ alarmState: isStale ? 1 : 0 }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Separator after row 2 */}
      {/* Row 3: Date */}
      <SecondaryMetricCell
        mnemonic="DATE"
        value={
          dateTimeFormatted.date && String(dateTimeFormatted.date).trim() !== ''
            ? dateTimeFormatted.date
            : '--- ---, ----'
        }
        state="normal"
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Row 4: Time */}
      <SecondaryMetricCell
        mnemonic="TIME"
        value={
          dateTimeFormatted.time && dateTimeFormatted.timezone
            ? `${dateTimeFormatted.time} ${dateTimeFormatted.timezone}`
            : '---'
        }
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
});

GPSWidget.displayName = 'GPSWidget';

export default GPSWidget;
