import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InstrumentWidgetProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
}

export const InstrumentWidget: React.FC<InstrumentWidgetProps> = ({ title, value, unit }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.value}>{value !== undefined ? value : '--'} {unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f4fa',
    alignItems: 'center',
    margin: 8,
    minWidth: 120,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
});
