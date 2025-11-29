import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
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
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface DynamicTemperatureWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  maxWidth?: number; // Cell width from UnifiedWidgetGrid
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
}

/**
 * TemperatureWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Grid (2×1): Temperature (°C/°F) + Trend Line Graph
 * Secondary Grid (2×1): Location + Instance
 * Supports multi-instance temperature sensors (seawater, engine, cabin, exhaust, etc.)
 */
export const DynamicTemperatureWidget: React.FC<DynamicTemperatureWidgetProps> = React.memo(({ id, title, width, height, maxWidth, cellHeight }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);

  // Extract temperature instance from widget ID (e.g., "temp-0", "temp-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/temp-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data - get temperature data from store using direct subscription
  // This ensures the component re-renders when temperature data updates
  const temperatureData = useNmeaStore((state) => 
    state.nmeaData.sensors.temperature?.[instanceNumber]
  );
  
  // Temperature history tracking
  const [temperatureHistory, setTemperatureHistory] = useState<Array<{ value: number; timestamp: number }>>([]);
  
  // Extract temperature values
  const temperature = temperatureData?.value || null; // Temperature in Celsius
  const location = temperatureData?.location || 'unknown';
  const units = temperatureData?.units || 'C';
  const sensorName = temperatureData?.name || title;
  
  useEffect(() => {
    if (temperature !== null && temperature !== undefined) {
      const now = Date.now();
      setTemperatureHistory(prev => {
        const newHistory = [...prev, { value: temperature, timestamp: now }];
        // Keep only last 5 minutes of data
        return newHistory.filter(entry => entry.timestamp > now - 5 * 60 * 1000);
      });
    }
  }, [temperature]);
  
  // Check if data is stale (> 5 seconds old)
  // Use state + useEffect to detect staleness without causing re-renders on every cycle
  const [isStale, setIsStale] = useState(true);
  
  useEffect(() => {
    if (!temperatureData?.timestamp) {
      setIsStale(true);
      return;
    }
    
    const checkStale = () => {
      const age = Date.now() - temperatureData.timestamp;
      setIsStale(age > 5000);
    };
    
    // Check immediately when data changes
    checkStale();
    
    // Then check periodically every second
    const interval = setInterval(checkStale, 1000);
    return () => clearInterval(interval);
  }, [temperatureData]); // Changed dependency to full temperatureData object
  
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
  
  // Wrapper component to receive injected props from UnifiedWidgetGrid
  const TrendLineCell = ({ maxWidth: cellMaxWidth, cellHeight: cellHeightValue }: { maxWidth?: number; cellHeight?: number }) => (
    <TrendLine 
      data={temperatureHistory}
      width={cellMaxWidth || 300}
      height={cellHeightValue || 60}
      color={temperatureState === 'alarm' ? theme.error : temperatureState === 'warning' ? theme.warning : theme.primary}
      theme={theme}
      showXAxis={true}
      showYAxis={true}
      xAxisPosition="bottom"
      yAxisDirection="up"
      timeWindowMinutes={5}
      showTimeLabels={true}
      showGrid={true}
      strokeWidth={2}
    />
  );

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

  // Calculate responsive header sizes based on widget dimensions
  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Header component for UnifiedWidgetGrid v2
  const headerComponent = (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <UniversalIcon 
          name={WidgetMetadataRegistry.getMetadata('temperature')?.icon || 'thermometer-outline'} 
          size={headerIconSize} 
          color={theme.primary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{getDisplayTitle()}</Text>
      </View>
      
      {pinned && (
        <TouchableOpacity
          onLongPress={handleLongPressOnPin}
          style={{ padding: 4, minWidth: 24, alignItems: 'center' }}
          testID={`pin-button-${id}`}
        >
          <UniversalIcon name="pin" size={headerIconSize} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <UnifiedWidgetGrid 
      theme={theme}
      header={headerComponent}
      widgetWidth={width || 400}
      widgetHeight={height || 300}
      columns={1}
      primaryRows={2}
      secondaryRows={2}
      onPress={handlePress}
      testID={`temperature-widget-${instanceNumber}`}
    >
      {/* Primary Row 1: Temperature */}
      <PrimaryMetricCell
        mnemonic="TEMP"
        value={displayTemperature !== null ? displayTemperature.toFixed(1) : '---'}
        unit={displayUnit}
        state={isStale ? 'warning' : temperatureState}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Primary Row 2: Trend Line */}
      <TrendLineCell />
      
      {/* Secondary Row 1: Location */}
      <SecondaryMetricCell
        mnemonic="LOC"
        value={location.toUpperCase()}
        unit=""
        state="normal"
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      {/* Secondary Row 2: Instance */}
      <SecondaryMetricCell
        mnemonic="INST"
        value={`${instanceNumber}`}
        unit=""
        state="normal"
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
    </UnifiedWidgetGrid>
  );
});

