import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useTemperaturePresentation } from '../presentation/useDataPresentation';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

type TempUnit = 'celsius' | 'fahrenheit';

interface TempReading {
  timestamp: number;
  temperature: number;
}

interface WaterTemperatureWidgetProps {
  id: string;
  title: string;
}

/**
 * WaterTemperatureWidget - Water temperature display with trend analysis per ui-architecture.md v2.3
 * Primary Grid (1×1): Current temperature with unit toggle
 * Secondary Grid (1×2): Status/Trend, 1-hour Average
 * Features: Celsius/Fahrenheit toggle, trend detection, marine safety thresholds
 */
export const WaterTemperatureWidget: React.FC<WaterTemperatureWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // NEW: Clean semantic data presentation system for temperature
  const temperaturePresentation = useTemperaturePresentation();
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Water temperature
  const waterTemp = useNmeaStore(useCallback((state: any) => state.nmeaData.waterTemperature, []));
  
  // Local state for temperature history (no more unit state - handled by presentation system)
  const [tempHistory, setTempHistory] = useState<TempReading[]>([]);
  
  const isStale = waterTemp === undefined || waterTemp === null;

  // Track temperature history for trend analysis
  useEffect(() => {
    if (!isStale) {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      
      setTempHistory(prev => {
        const newHistory = [...prev, { timestamp: now, temperature: waterTemp }];
        return newHistory.filter(reading => reading.timestamp > oneHourAgo);
      });
    }
  }, [waterTemp, isStale]);

  // NEW: Temperature conversion using semantic presentation system
  const convertTemperature = useCallback((tempC: number | undefined): { value: string; unitStr: string } => {
    if (tempC === undefined || tempC === null) {
      return { 
        value: '---', 
        unitStr: temperaturePresentation.presentation?.symbol || '°C' 
      };
    }
    
    if (!temperaturePresentation.isValid) {
      // Fallback to Celsius if presentation system fails
      return { value: tempC.toFixed(1), unitStr: '°C' };
    }

    return { 
      value: temperaturePresentation.convertAndFormat(tempC), 
      unitStr: temperaturePresentation.presentation?.symbol || '°C'
    };
  }, [temperaturePresentation]);

  // Trend analysis
  const getTrend = useCallback((): 'up' | 'down' | 'stable' | null => {
    if (tempHistory.length < 3) return null;
    const recent = tempHistory.slice(-3);
    const trend = recent[2].temperature - recent[0].temperature;
    if (Math.abs(trend) < 0.5) return 'stable';
    return trend > 0 ? 'up' : 'down';
  }, [tempHistory]);

  // Marine safety evaluation for water temperature
  const getTemperatureState = useCallback((temp: number | undefined) => {
    if (temp === undefined || temp === null) return 'normal';
    
    // Temperature ranges for marine conditions
    if (temp < 0 || temp > 35) return 'alarm';     // Freezing or very hot
    if (temp < 5 || temp > 30) return 'warning';   // Very cold or hot
    return 'normal';                                // Normal range
  }, []);

  const getTemperatureStatus = useCallback((temp: number | undefined): string => {
    if (temp === undefined || temp === null) return 'No Data';
    
    if (temp < 0) return 'Freezing';
    if (temp < 5) return 'Very Cold';
    if (temp < 15) return 'Cold';
    if (temp < 25) return 'Moderate';
    if (temp < 30) return 'Warm';
    if (temp < 35) return 'Hot';
    return 'Very Hot';
  }, []);

  const tempState = getTemperatureState(waterTemp);
  const trend = getTrend();
  const { value, unitStr } = convertTemperature(waterTemp);
  const tempStatus = getTemperatureStatus(waterTemp);
  
  // Calculate 1-hour average
  const averageTemp = tempHistory.length > 0 
    ? tempHistory.reduce((sum, reading) => sum + reading.temperature, 0) / tempHistory.length
    : waterTemp;

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: tempState === 'alarm' ? theme.error :
                   tempState === 'warning' ? theme.warning :
                   '#E5E7EB',
      padding: 16,
      marginBottom: 8,
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
      color: theme.textSecondary,
      textTransform: 'uppercase',
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
      color: theme.textSecondary,
    },
    pinIcon: {
      fontSize: 12,
      color: theme.primary,
    },
    primaryGrid: {
      alignItems: 'center',
    },
    secondaryGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: tempState === 'alarm' ? theme.error :
                       tempState === 'warning' ? theme.warning :
                       theme.success,
      opacity: isStale ? 0.3 : 1,
    },
    trendContainer: {
      alignItems: 'center',
      gap: 4,
    },
    trendIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    trendText: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    unitToggle: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
    },
    unitToggleText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', color: theme.textSecondary }]}>{title}</Text>
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <Text style={styles.pinIcon}>📌</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePress}
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`caret-button-${id}`}
            >
              <Text style={styles.caret}>
                {expanded ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Primary Grid (1×1): Current temperature */}
      <View style={styles.primaryGrid}>
        <PrimaryMetricCell
          mnemonic="WATER"
          value={value}
          unit={unitStr}
          state={tempState}
        />
      </View>

      {/* Secondary Grid (1×2): Status/Trend, Average */}
      {expanded && (
        <View style={styles.secondaryGrid}>
          <View style={[styles.trendContainer, { flex: 1 }]}>
            <SecondaryMetricCell
              mnemonic="STATUS"
              value={tempStatus}
              unit=""
            />
            {trend && (
              <View style={styles.trendIndicator}>
                <Ionicons
                  name={
                    trend === 'up' ? 'trending-up' :
                    trend === 'down' ? 'trending-down' : 'remove'
                  }
                  size={16}
                  color={
                    trend === 'up' ? theme.warning :
                    trend === 'down' ? theme.primary :
                    theme.textSecondary
                  }
                />
                <Text style={styles.trendText}>
                  {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
                </Text>
              </View>
            )}
          </View>
          
          <SecondaryMetricCell
            mnemonic="1H AVG"
            value={averageTemp !== undefined ? convertTemperature(averageTemp).value : '---'}
            unit={unitStr}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default WaterTemperatureWidget;