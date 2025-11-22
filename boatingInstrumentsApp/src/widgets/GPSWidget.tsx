import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUnitConversion } from '../hooks/useUnitConversion';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';

interface GPSWidgetProps {
  id: string;
  title: string;
}

/**
 * GPS Widget - GPS Position Display per ui-architecture.md v2.3
 * Primary Grid (2×1): Latitude and Longitude coordinates using unit conversion system
 * Secondary Grid (2×1): UTC Date with day of week + UTC Time
 */
export const GPSWidget: React.FC<GPSWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // Date/time formatting still uses useUnitConversion (Story 9.6 scope)
  const { getGpsFormattedDateTime } = useUnitConversion();

  // GPS settings for date/time formatting
  // Coordinate format handled by useMetricDisplay hook
  const gpsDateFormat = useSettingsStore((state) => state.gps.dateFormat); // eslint-disable-line @typescript-eslint/no-unused-vars
  const gpsTimeFormat = useSettingsStore((state) => state.gps.timeFormat); // eslint-disable-line @typescript-eslint/no-unused-vars
  const gpsTimezone = useSettingsStore((state) => state.gps.timezone); // eslint-disable-line @typescript-eslint/no-unused-vars
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // Create theme-aware styles
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // NMEA data selectors - NMEA Store v2.0 sensor-based interface
  const gpsData = useNmeaStore(useCallback((state: any) => state.nmeaData.sensors.gps[0], [])); // GPS sensor data
  
  // Extract GPS values from sensor data
  const gpsPosition = gpsData?.position; // GPS position object with lat/lon
  const gpsQuality = gpsData?.quality; // GPS quality data
  const utcTime = gpsData?.utcTime; // UTC time from GPS
  const gpsTimestamp = gpsData?.timestamp;
  
  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    toggleWidgetExpansion(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetExpansion, updateWidgetInteraction]);

  const handleLongPressOnCaret = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Use useMetricDisplay for coordinate formatting with hemisphere support
  const latMetric = useMetricDisplay(
    'coordinates',
    gpsPosition?.latitude,
    'LAT',
    { metadata: { isLatitude: true } }
  );

  const lonMetric = useMetricDisplay(
    'coordinates',
    gpsPosition?.longitude,
    'LON',
    { metadata: { isLatitude: false } }
  );

  // Extract individual props for PrimaryMetricCell (DepthWidget pattern)
  const latDisplay = {
    mnemonic: latMetric.mnemonic,
    value: latMetric.value,
    unit: latMetric.unit
  };

  const lonDisplay = {
    mnemonic: lonMetric.mnemonic,
    value: lonMetric.value,
    unit: lonMetric.unit
  };



  // Date and Time formatting - GPS always displays UTC time (marine standard)
  const dateTimeFormatted = useMemo(() => {
    if (!utcTime) {
      return { 
        date: '--- ---, ----', 
        time: '--:--:--',
        timezone: 'UTC'
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
        formattedDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        break;
      case 'us_date':
        formattedDate = `${(month + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        break;
      case 'eu_date':
        formattedDate = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
        break;
      case 'uk_date':
        formattedDate = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
        break;
      case 'nautical_date':
      default:
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        formattedDate = `${dayNames[date.getUTCDay()]} ${monthNames[month]} ${day.toString().padStart(2, '0')}, ${year}`;
        break;
    }
    
    // Format time based on GPS time format setting
    let formattedTime: string;
    switch (gpsTimeFormat) {
      case 'time_24h':
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        break;
      case 'time_12h':
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        formattedTime = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        break;
      case 'time_12h_full':
        const hours12Full = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampmFull = hours >= 12 ? 'PM' : 'AM';
        formattedTime = `${hours12Full.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampmFull}`;
        break;
      case 'time_compact':
        formattedTime = `${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`;
        break;
      case 'time_24h_full':
      default:
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        break;
    }
    
    return {
      date: formattedDate,
      time: formattedTime,
      timezone: 'UTC'
    };
  }, [utcTime, gpsDateFormat, gpsTimeFormat]);

  // Data staleness detection (>10s = stale for GPS)
  const isStale = gpsTimestamp ? (Date.now() - gpsTimestamp) > 10000 : true;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`gps-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('gps')?.icon || 'navigate-outline'} 
            size={12} 
            color={theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.title, { color: theme.textSecondary }]}>
            {title.toUpperCase()}
          </Text>
        </View>
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePress}
              onLongPress={handleLongPressOnCaret}
              style={styles.controlButton}
              testID={`caret-button-${id}`}
            >
              <Text style={[styles.caret, { color: theme.textSecondary }]}>
                {expanded ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PRIMARY GRID (2×1): Latitude and Longitude coordinates */}
      <View style={styles.primaryContainer}>
        <View style={styles.coordinateContainer}>
          <PrimaryMetricCell
            mnemonic={latDisplay.mnemonic}
            value={latDisplay.value}
            unit={latDisplay.unit}
            state={isStale ? 'warning' : 'normal'}
          />
        </View>
        <View style={styles.coordinateContainer}>
          <PrimaryMetricCell
            mnemonic={lonDisplay.mnemonic}
            value={lonDisplay.value}
            unit={lonDisplay.unit}
            state={isStale ? 'warning' : 'normal'}
          />
        </View>
      </View>

      {/* SECONDARY GRID (2×1): Date with day of week + Time with timezone */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="DATE"
                value={dateTimeFormatted.date}
                state="normal"
                compact={true}
              />
            </View>
          </View>
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="TIME"
                value={`${dateTimeFormatted.time} ${dateTimeFormatted.timezone}`}
                state="normal"
                compact={true}
              />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

GPSWidget.displayName = 'GPSWidget';

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  caret: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pinIcon: {
    fontSize: 12,
  },

  // Primary Container for coordinate grid
  primaryContainer: {
    marginBottom: 8,
  },
  // Coordinate Container for individual lat/lon (matches DepthWidget pattern)
  coordinateContainer: {
    marginBottom: 8,
    minHeight: 80, // Ensure consistent height with other widgets
  },


  // Secondary Container for expanded view
  secondaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  // Secondary Grid (2×1): Date and Time
  secondaryGrid: {
    marginBottom: 8,
  },
  // Grid cell wrapper for proper alignment
  gridCell: {
    alignItems: 'flex-end',
  },
});

export default GPSWidget;