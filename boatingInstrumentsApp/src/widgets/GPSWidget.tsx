import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';
import { useCachedMarineCalculation } from '../utils/performanceOptimization';

// GPS coordinate format converters
export const formatLatLon = (lat: number, lon: number, format: 'DD' | 'DMS' = 'DD'): string => {
  if (format === 'DD') {
    return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
  }
  // DMS format
  const latDMS = decimalToDMS(lat, 'lat');
  const lonDMS = decimalToDMS(lon, 'lon');
  return `${latDMS}\n${lonDMS}`;
};

const decimalToDMS = (decimal: number, type: 'lat' | 'lon'): string => {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);
  
  let direction = '';
  if (type === 'lat') {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }
  
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};

export const GPSWidget: React.FC = React.memo(() => {
  // Optimized store selectors
  const gps = useNmeaStore(useCallback((state: any) => state.nmeaData.gpsPosition, []));
  const gpsQuality = useNmeaStore(useCallback((state: any) => state.nmeaData.gpsQuality, []));
  const theme = useTheme();
  
  // Memoized GPS status calculation
  const gpsStatus = useMemo(() => {
    const getFixStatus = (): string => {
      if (!gps) return 'NO FIX';
      if (gpsQuality?.fixType === 3) return '3D FIX';
      if (gpsQuality?.fixType === 2) return '2D FIX';
      return 'ACQUIRING';
    };
    
    const fixStatus = getFixStatus();
    const satellites = gpsQuality?.satellites || 0;
    
    return { fixStatus, satellites };
  }, [gps, gpsQuality]);
  
  // Cached coordinate formatting
  const formattedCoordinates = useCachedMarineCalculation(
    'gps-coordinates',
    () => {
      if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
        return { dd: '--', dms: '--' };
      }
      
      return {
        dd: formatLatLon(gps.latitude, gps.longitude, 'DD'),
        dms: formatLatLon(gps.latitude, gps.longitude, 'DMS'),
      };
    },
    [gps?.latitude, gps?.longitude]
  );
  
  const { fixStatus, satellites } = gpsStatus;
  const hdop = gpsQuality?.hdop?.toFixed(1) || '--';
  
  // Determine widget state
  const state = !gps ? 'no-data' : 'normal';
  
  // Format individual coordinates
  const latitude = gps ? `${gps.lat.toFixed(5)}°` : '--';
  const longitude = gps ? `${gps.lon.toFixed(5)}°` : '--';
  
  // Determine metric states based on GPS quality
  const getMetricState = (): 'normal' | 'warning' | 'alarm' | undefined => {
    if (!gps) return undefined; // Will show as no-data in the widget
    if (fixStatus === 'NO FIX') return 'alarm';
    if (satellites < 4) return 'warning';
    return 'normal';
  };
  
  const metricState = getMetricState();
  
  return (
    <WidgetCard
      title="GPS POSITION"
      icon="location"
      state={state}
    >
      <View style={styles.metricGrid}>
        <PrimaryMetricCell 
          mnemonic="LAT"
          value={latitude}
          unit=""
          state={metricState}
          style={styles.metricCell}
        />
        <PrimaryMetricCell 
          mnemonic="LON" 
          value={longitude}
          unit=""
          state={metricState}
          style={styles.metricCell}
        />
      </View>
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text 
            style={[styles.statusLabel, { color: theme.textSecondary }]}
            accessibilityLabel="GPS Fix Status Label"
          >
            Fix:
          </Text>
          <Text
            style={[
              styles.statusValue,
              {
                color: fixStatus === 'NO FIX' ? theme.error : theme.text,
              }
            ]}
            accessibilityLabel={`GPS fix status: ${fixStatus}`}
            accessibilityRole="text"
          >
            {fixStatus}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text 
            style={[styles.statusLabel, { color: theme.textSecondary }]}
            accessibilityLabel="Satellite Count Label"
          >
            Satellites:
          </Text>
          <Text 
            style={[styles.statusValue, { color: theme.text }]}
            accessibilityLabel={`${satellites} satellites in view`}
            accessibilityRole="text"
          >
            {satellites}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text 
            style={[styles.statusLabel, { color: theme.textSecondary }]}
            accessibilityLabel="HDOP Accuracy Label"
          >
            HDOP:
          </Text>
          <Text 
            style={[styles.statusValue, { color: theme.text }]}
            accessibilityLabel={`HDOP accuracy: ${hdop}`}
            accessibilityRole="text"
          >
            {hdop}
          </Text>
        </View>
      </View>
    </WidgetCard>
  );
});

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  metricCell: {
    flex: 1,
  },
  statusContainer: {
    marginTop: 8,
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
