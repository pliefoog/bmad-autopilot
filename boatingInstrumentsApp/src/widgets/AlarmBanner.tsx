import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alarm } from '../store/nmeaStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme, ThemeColors } from '../store/themeStore';

// Helper function to get theme-aware alarm styles
const getAlarmStyle = (level: string, highContrast: boolean, theme: ThemeColors) => {
  if (highContrast) {
    switch (level) {
      case 'info':
        return {
          backgroundColor: '#0050B3', // Dark blue
          borderColor: '#FFFFFF',
          borderWidth: 3,
        };
      case 'warning':
        return {
          backgroundColor: '#D46B08', // Dark orange
          borderColor: '#FFFFFF',
          borderWidth: 3,
        };
      case 'critical':
        return {
          backgroundColor: '#CF1322', // Dark red
          borderColor: '#FFFFFF',
          borderWidth: 4, // Thicker border for critical
        };
      default:
        return {};
    }
  } else {
    // Standard theme-aware styles
    switch (level) {
      case 'info':
        return {
          backgroundColor: theme.surface,
          borderColor: theme.primary,
          borderWidth: 1,
        };
      case 'warning':
        return {
          backgroundColor: theme.surface,
          borderColor: theme.warning,
          borderWidth: 1,
        };
      case 'critical':
        return {
          backgroundColor: theme.error + '20', // 20% opacity
          borderColor: theme.error,
          borderWidth: 2,
        };
      default:
        return {};
    }
  }
};

const styles = StyleSheet.create({
  banner: {
    position: 'relative',
    zIndex: 1000, // High z-index for overlay behavior
    elevation: 10, // Android elevation
    marginBottom: 12,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
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
  messageHighContrast: {
    fontSize: 16, // Slightly larger for readability
    fontWeight: '900', // Extra bold
    letterSpacing: 0.5,
  },
});

export const AlarmBanner: React.FC<{ alarms: Alarm[] }> = ({ alarms }) => {
  const highContrast = useSettingsStore((state) => state.themeSettings.highContrast);
  const theme = useTheme();
  
  if (!alarms || alarms.length === 0) return null;
  
  return (
    <View style={[
      styles.banner,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }
    ]}>
      {alarms.map((alarm) => (
        <View 
          key={alarm.id} 
          style={[
            styles.alarm, 
            getAlarmStyle(alarm.level, highContrast, theme)
          ]}
        >
          <Text 
            style={[
              styles.message,
              { color: theme.text },
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