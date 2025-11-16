import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

interface DynamicTemperatureWidgetProps {
  id: string;
  title: string;
}

/**
 * TemperatureWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Metric: Temperature (°C/°F)
 * Secondary Metrics: Location, Sensor Type
 * Supports multi-instance temperature sensors (seawater, engine, cabin, exhaust, etc.)
 */
export const DynamicTemperatureWidget: React.FC<DynamicTemperatureWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();

  // Extract temperature instance from widget ID (e.g., "temp-0", "temp-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/temp-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data - get temperature data from store
  const temperatureData = useNmeaStore(useCallback((state: any) => state.getTemperatureData(instanceNumber), [instanceNumber]));
  
  // Extract temperature values
  const temperature = temperatureData?.value || null; // Temperature in Celsius
  const location = temperatureData?.location || 'unknown';
  const units = temperatureData?.units || 'C';
  const sensorName = temperatureData?.name || title;
  
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
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

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
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
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
    primaryView: {
      marginBottom: 8,
    },
    secondaryContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    secondaryGrid: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
      gap: 16,
    },
    gridCell: {
      alignItems: 'flex-end',
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
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
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

      {/* Primary View: Temperature */}
      <View style={styles.primaryView}>
        <PrimaryMetricCell
          mnemonic="TEMP"
          value={displayTemperature !== null ? displayTemperature.toFixed(1) : '---'}
          unit={displayUnit}
          state={temperatureState}
        />
      </View>

      {/* Secondary View: Location and Sensor Type */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="LOC"
                value={location.toUpperCase()}
                unit=""
                state="normal"
                compact={true}
                align="right"
              />
            </View>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="INST"
                value={`${instanceNumber}`}
                unit=""
                state="normal"
                compact={true}
                align="right"
              />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});