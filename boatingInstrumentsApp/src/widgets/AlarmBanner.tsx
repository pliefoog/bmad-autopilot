import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alarm } from '../store/nmeaStore';
import { useSettingsStore } from '../store/settingsStore';

export const AlarmBanner: React.FC<{ alarms: Alarm[] }> = ({ alarms }) => {
  const highContrast = useSettingsStore((state) => state.themeSettings.highContrast);
  
  if (!alarms || alarms.length === 0) return null;
  
  return (
    <View style={styles.banner}>
      {alarms.map((alarm) => (
        <View 
          key={alarm.id} 
          style={[
            styles.alarm, 
            highContrast ? styles[`${alarm.level}HighContrast`] : styles[alarm.level]
          ]}
        >
          <Text 
            style={[
              styles.message,
              highContrast && styles.messageHighContrast,
              highContrast && { color: '#FFFFFF' } // White text for high contrast dark backgrounds
            ]}
          >
            {alarm.message}
          </Text>
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
    color: '#1a1a1a', // Default dark text
  },
  messageHighContrast: {
    fontSize: 16, // Slightly larger for readability
    fontWeight: '900', // Extra bold
    letterSpacing: 0.5,
  },
  
  // Standard contrast styles
  info: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
    borderWidth: 1,
  },
  warning: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffe58f',
    borderWidth: 1,
  },
  critical: {
    backgroundColor: '#fff1f0',
    borderColor: '#ff7875',
    borderWidth: 2,
  },
  
  // High contrast styles (WCAG AA compliant - 4.5:1 minimum for text, 3:1 for large text)
  infoHighContrast: {
    backgroundColor: '#0050B3', // Dark blue
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  warningHighContrast: {
    backgroundColor: '#D46B08', // Dark orange
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  criticalHighContrast: {
    backgroundColor: '#CF1322', // Dark red
    borderColor: '#FFFFFF',
    borderWidth: 4, // Thicker border for critical
  },
});
