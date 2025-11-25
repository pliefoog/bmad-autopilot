import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useTemperaturePresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TemperatureSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

interface DynamicTemperatureWidgetProps {
  id: string;
  title: string;
}

/**
 * TemperatureWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Grid (2×1): Temperature (°C/°F) + Trend Line Graph
 * Secondary Grid (2×1): Location + Instance
 * Supports multi-instance temperature sensors (seawater, engine, cabin, exhaust, etc.)
 */
export const DynamicTemperatureWidget: React.FC<DynamicTemperatureWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const { scaleFactor, fontSize, spacing } = useResponsiveScale(width, height);

  // Extract temperature instance from widget ID (e.g., "temp-0", "temp-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/temp-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data - get temperature data from store
  const temperatureData = useNmeaStore(useCallback((state: any) => state.getTemperatureData(instanceNumber), [instanceNumber]));
  
  // Extract temperature values
  const temperature = temperatureData?.value || null; // Temperature in Celsius
  const location = temperatureData?.location || 'unknown';
  const units = temperatureData?.units || 'C';
  const sensorName = temperatureData?.name || title;
  
  // Temperature history for trend line
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([]);
  
  useEffect(() => {
    if (temperature !== null && temperature !== undefined) {
      setTemperatureHistory(prev => {
        const newHistory = [...prev, temperature];
        return newHistory.slice(-20); // Keep last 20 readings
      });
    }
  }, [temperature]);
  
  // Presentation hooks for temperature conversion
  const tempPresentation = useTemperaturePresentation();
  
  // Convert temperature using presentation system
  const displayTemperature = useMemo(() => {
    if (temperature === null) return null;
    return tempPresentation.convert(temperature);
  }, [temperature, tempPresentation]);
  
  const displayUnit = tempPresentation.presentation?.symbol || '°C';
  
  // Debug logging
  console.log(`[TemperatureWidget-${instanceNumber}] Raw temp: ${temperature}°C, Display: ${displayTemperature}${displayUnit}, Location: ${location}`);

  // Marine safety thresholds for temperature monitoring
  const getTemperatureState = useCallback((temp: number | null, location: string) => {
    if (temp === null) return 'warning';
    
    // Critical conditions for marine temperature sensors
    switch (location) {
      case 'engine':
        if (temp > 95) return 'alarm';     // Dangerous engine temperature
        if (temp > 85) return 'warning';   // High engine temperature
        break;
      case 'exhaust':
        if (temp > 65) return 'alarm';     // Dangerous exhaust temperature
        if (temp > 55) return 'warning';   // High exhaust temperature
        break;
      case 'engineRoom':
        if (temp > 50) return 'alarm';     // Dangerous engine room temperature
        if (temp > 40) return 'warning';   // High engine room temperature
        break;
      case 'seawater':
        if (temp > 30 || temp < 0) return 'warning'; // Unusual seawater temperature
        break;
      case 'cabin':
      case 'outside':
        if (temp > 40 || temp < -10) return 'warning'; // Extreme air temperature
        break;
    }
    
    return 'normal';
  }, []);

  const temperatureState = getTemperatureState(temperature, location);

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Auto-generate appropriate title based on temperature data
  const getDisplayTitle = useCallback(() => {
    // Standard NMEA temperature location mapping
    const locationMap: Record<string, string> = {
      'engine': 'Engine Room',
      'seawater': 'Sea Water',
      'outside': 'Outside Air',
      'cabin': 'Main Cabin',
      'exhaust': 'Exhaust',
      'refrigerator': 'Refrigerator',
      'freezer': 'Freezer',
      'battery': 'Battery Bay',
      'engineRoom': 'Engine Room',
    };
    
    const locationName = locationMap[location] || location.charAt(0).toUpperCase() + location.slice(1);
    
    // Format: "Temperature - [Location]" e.g. "Temperature - Engine Room", "Temperature - Sea Water"
    return `Temperature - ${locationName}`;
  }, [location]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
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
    primaryView: {
      height: '50%',
      justifyContent: 'center',
    },
    primaryGrid: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: 8,
      width: '80%',
    },
    trendLineContainer: {
      alignItems: 'center',
      height: 60,
    },
    // Horizontal separator between primary and secondary views
    separator: {
      height: 1,
      marginVertical: 4,
    },
    secondaryContainer: {
      height: '50%',
      justifyContent: 'center',
    },
    secondaryGrid: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: 8,
      width: '80%',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`temperature-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('temperature')?.icon || 'thermometer-outline'} 
            size={16} 
            color={theme.primary}
          />
          <Text style={styles.title}>{getDisplayTitle()}</Text>
        </View>
        
        {/* Pin Control */}
        {pinned && (
          <View style={styles.controls}>
            <TouchableOpacity
              onLongPress={handleLongPressOnPin}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Primary Grid (2×1): Temperature + Trend Line */}
      <View style={styles.primaryView}>
        <View style={styles.primaryGrid}>
          <PrimaryMetricCell
            mnemonic="TEMP"
            value={displayTemperature !== null ? displayTemperature.toFixed(1) : '---'}
            unit={displayUnit}
            state={temperatureState}
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
          
          {/* Trend Line Graph */}
          <View style={styles.trendLineContainer}>
            <TrendLine 
              data={temperatureHistory}
              width={200}
              height={60}
              color={temperatureState === 'alarm' ? theme.error : temperatureState === 'warning' ? theme.warning : theme.primary}
              theme={theme}
            />
          </View>
        </View>
      </View>

      {/* Secondary View: Location and Sensor Type */}
      {/* Horizontal separator */}
      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* SECONDARY CONTAINER */}
      <View style={styles.secondaryContainer}>
        <View style={styles.secondaryGrid}>
          <SecondaryMetricCell
            mnemonic="LOC"
            value={location.toUpperCase()}
            unit=""
            state="normal"
            compact={true}
            align="right"
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
          <SecondaryMetricCell
            mnemonic="INST"
            value={`${instanceNumber}`}
            unit=""
            state="normal"
            compact={true}
            align="right"
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Simple trend line component
const TrendLine: React.FC<{ 
  data: number[]; 
  width: number; 
  height: number; 
  color: string;
  theme: any;
}> = ({ data, width, height, color, theme }) => {
  if (data.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>No trend data</Text>
      </View>
    );
  }
  
  const minTemp = Math.min(...data);
  const maxTemp = Math.max(...data);
  const range = maxTemp - minTemp || 1; // Avoid division by zero
  
  const points = data.map((temp, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((temp - minTemp) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
};
