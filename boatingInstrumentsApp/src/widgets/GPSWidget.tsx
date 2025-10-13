import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

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

export const GPSWidget: React.FC = () => {
  const gps = useNmeaStore((state: any) => state.nmeaData.gpsPosition);
  const gpsQuality = useNmeaStore((state: any) => state.nmeaData.gpsQuality);
  const theme = useTheme();
  
  // Determine fix status
  const getFixStatus = (): string => {
    if (!gps) return 'NO FIX';
    if (gpsQuality?.fixType === 3) return '3D FIX';
    if (gpsQuality?.fixType === 2) return '2D FIX';
    return 'ACQUIRING';
  };
  
  const fixStatus = getFixStatus();
  const satellites = gpsQuality?.satellites || 0;
  const hdop = gpsQuality?.hdop?.toFixed(1) || '--';
  
  // Determine widget state
  const state = !gps ? 'no-data' : 'normal';
  
  // Format coordinates
  const value = gps ? formatLatLon(gps.lat, gps.lon, 'DD') : '--';
  
  return (
    <WidgetCard
      title="GPS POSITION"
      icon="location"
      value={value}
      unit=""
      state={state}
    >
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
                color: fixStatus === 'NO FIX' ? theme.error : theme.success,
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
};

const styles = StyleSheet.create({
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
