import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';

/**
 * Debug component to monitor store state
 * Add to App.tsx temporarily to see what's in the store
 */
export const StoreDebug: React.FC = () => {
  const sensors = useNmeaStore((state) => state.nmeaData.sensors);
  const messageCount = useNmeaStore((state) => state.nmeaData.messageCount);
  const timestamp = useNmeaStore((state) => state.nmeaData.timestamp);

  useEffect(() => {
    console.log('=== STORE DEBUG ===');
    console.log('Message count:', messageCount);
    console.log('Last update:', new Date(timestamp).toISOString());
    console.log(
      'Sensors:',
      Object.keys(sensors).filter((key) => Object.keys(sensors[key as any]).length > 0),
    );

    // Check depth sensor specifically
    const depthSensor = sensors.depth?.[0];
    if (depthSensor) {
      const metrics = depthSensor.getAllMetrics();
      console.log('Depth sensor exists:', {
        type: depthSensor.type,
        instance: depthSensor.instance,
        timestamp: depthSensor.timestamp,
        metricsCount: Object.keys(metrics).length,
        metrics: Object.keys(metrics),
        isSensorInstance: depthSensor.constructor.name,
        hasGetMetric: typeof depthSensor.getMetric === 'function',
        hasUpdateMetrics: typeof depthSensor.updateMetrics === 'function',
        _metricsType: depthSensor._metrics ? depthSensor._metrics.constructor.name : 'undefined',
        _metricsSize: depthSensor._metrics ? depthSensor._metrics.size : 'N/A',
      });

      const depthMetric = depthSensor.getMetric('depth');
      if (depthMetric) {
        console.log('Depth metric:', {
          si_value: depthMetric.si_value,
          value: depthMetric.value,
          unit: depthMetric.unit,
          formattedValue: depthMetric.formattedValue,
          formattedValueWithUnit: depthMetric.formattedValueWithUnit,
        });
      } else {
        console.log('❌ Depth metric NOT FOUND');
      }
    } else {
      console.log('❌ No depth sensor in store');
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
