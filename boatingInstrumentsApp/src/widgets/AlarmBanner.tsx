import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alarm } from '../core/nmeaStore';

export const AlarmBanner: React.FC<{ alarms: Alarm[] }> = ({ alarms }) => {
  if (!alarms || alarms.length === 0) return null;
  return (
    <View style={styles.banner}>
      {alarms.map((alarm) => (
        <View key={alarm.id} style={[styles.alarm, styles[alarm.level]]}>
          <Text style={styles.message}>{alarm.message}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginBottom: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fffbe6',
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  alarm: {
    padding: 6,
    marginBottom: 4,
    borderRadius: 6,
  },
  message: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  info: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  warning: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffe58f',
  },
  critical: {
    backgroundColor: '#fff1f0',
    borderColor: '#ff7875',
  },
});
