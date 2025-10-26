import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TankSensorData } from '../types/SensorData';

interface TanksWidgetProps {
  id: string;
  title: string;
  showUsageRate?: boolean;
}

/**
 * TanksWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Metric: Level (%)
 * Secondary Metric: Available Capacity (PGN 127505 Fluid Level Capacity field x level)
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();

  // Extract tank instance from widget ID (e.g., "tank-0", "tank-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/tank-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data - get tank data from store
  const tankData = useNmeaStore(useCallback((state: any) => state.getTankData(instanceNumber), [instanceNumber]));
  
  // Extract tank values
  const level = tankData?.level ? tankData.level * 100 : null; // Convert ratio to percentage
  const capacity = tankData?.capacity || null; // Total capacity in liters
  const tankType = tankData?.type || 'unknown';
  const tankName = tankData?.name || title;
  
  // Calculate available capacity (capacity * level ratio)
  const availableCapacity = useMemo(() => {
    if (capacity && tankData?.level) {
      return capacity * tankData.level; // Available liters
    }
    return null;
  }, [capacity, tankData?.level]);
  
  // Debug logging
  console.log(`[TankWidget-${instanceNumber}] Raw ratio: ${tankData?.level}, Display %: ${level}, Capacity: ${capacity}L, Available: ${availableCapacity?.toFixed(1)}L`);

  // Marine safety thresholds for tank monitoring
  const getTankState = useCallback((level: number | null, tankType: string) => {
    if (level === null) return 'warning';
    
    // Critical conditions for marine tanks
    if (tankType === 'fuel') {
      if (level < 10) return 'alarm';     // Critical fuel level
      if (level < 25) return 'warning';   // Low fuel warning
    } else if (tankType === 'water') {
      if (level < 15) return 'alarm';     // Critical water level  
      if (level < 30) return 'warning';   // Low water warning
    } else if (tankType === 'waste' || tankType === 'blackwater') {
      if (level > 90) return 'alarm';     // Nearly full waste
      if (level > 75) return 'warning';   // High waste level
    }
    
    return 'normal';
  }, []);

  const tankState = getTankState(level, tankType);

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  // Auto-generate appropriate title based on tank data
  const getDisplayTitle = useCallback(() => {
    // Use tank name from NMEA data if available, otherwise use provided title
    return tankName !== title ? tankName : title;
  }, [tankName, title]);

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
    secondaryView: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`tank-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={styles.title}>{getDisplayTitle()}</Text>
        
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

      {/* Primary View: Tank Level */}
      <View style={styles.primaryView}>
        <PrimaryMetricCell
          mnemonic="LEVEL"
          value={level !== null ? `${Math.round(level)}` : '---'}
          unit="%"
          state={tankState}
        />
      </View>

      {/* Secondary View: Available Capacity (PGN 127505 capacity field × level) */}
      {expanded && (
        <View style={styles.secondaryView}>
          <SecondaryMetricCell
            mnemonic="AVAIL"
            value={availableCapacity !== null ? availableCapacity.toFixed(1) : '---'}
            unit="L"
            state="normal"
            compact={true}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default TanksWidget;
