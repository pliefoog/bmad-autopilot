import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { sensorRegistry } from '../services/SensorDataRegistry';
import { log } from '../utils/logging/logger';

/**
 * Debug component to monitor store state
 * Add to App.tsx temporarily to see what's in the store
 */
export const StoreDebug: React.FC = () => {
  const allSensors = sensorRegistry.getAllSensors();
  const messageCount = useNmeaStore((state) => state.nmeaData.messageCount);
  const timestamp = useNmeaStore((state) => state.nmeaData.timestamp);

  useEffect(() => {
    const uniqueTypes = new Set(allSensors.map(s => s.sensorType));
    log.app('[StoreDebug] Store state', () => ({
      messageCount,
      lastUpdate: new Date(timestamp).toISOString(),
      sensorTypes: Array.from(uniqueTypes),
    }));

    const depthSensor = sensorRegistry.get('depth', 0);
    if (depthSensor) {
      const metrics = depthSensor.getAllMetrics();
      log.app('[StoreDebug] Depth sensor', () => ({
        type: depthSensor.sensorType,
        instance: depthSensor.instance,
        timestamp: depthSensor.timestamp,
        metricsCount: Object.keys(metrics).length,
        metrics: Object.keys(metrics),
      }));

      const depthMetric = depthSensor.getMetric('depth');
      if (depthMetric) {
        log.app('[StoreDebug] Depth metric', () => ({
          si_value: depthMetric.si_value,
          value: depthMetric.value,
          unit: depthMetric.unit,
          formattedValue: depthMetric.formattedValue,
          formattedValueWithUnit: depthMetric.formattedValueWithUnit,
        }));
      } else {
        log.app('[StoreDebug] Depth metric NOT FOUND');
      }
    } else {
      log.app('[StoreDebug] No depth sensor in store');
    }
  }, [sensors, messageCount, timestamp]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store Debug</Text>
      <Text style={styles.text}>Messages: {messageCount}</Text>
      <Text style={styles.text}>
        Sensors:{' '}
        {Object.keys(sensors)
          .filter((key) => Object.keys(sensors[key as any]).length > 0)
          .join(', ')}
      </Text>
      {sensors.depth?.[0] ? (
        <View>
          <Text style={styles.text}>✅ Depth sensor exists</Text>
          <Text style={styles.text}>
            Metrics: {Object.keys(sensors.depth[0].getAllMetrics()).length}
          </Text>
          {sensors.depth[0].getMetric('depth') ? (
            <Text style={styles.text}>
              Depth: {sensors.depth[0].getMetric('depth')?.formattedValueWithUnit}
            </Text>
          ) : (
            <Text style={styles.text}>❌ No depth metric</Text>
          )}
        </View>
      ) : (
        <Text style={styles.text}>❌ No depth sensor</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 9999,
    maxWidth: 300,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
});
