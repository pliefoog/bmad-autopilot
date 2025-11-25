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
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

interface TanksWidgetProps {
  id: string;
  title: string;
  showUsageRate?: boolean;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * TanksWidget - Enhanced with collapsible functionality and secondary metrics
 * Primary Grid (2×1): Level (%) + Capacity (L)
 * Secondary Grid (2×1): Available Capacity + Type
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const { scaleFactor, fontSize, spacing } = useResponsiveScale(width, height);

  // Extract tank instance from widget ID (e.g., "tank-0", "tank-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/tank-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
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
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Auto-generate appropriate title based on tank data
  const getDisplayTitle = useCallback(() => {
    // Standard NMEA tank location mapping by instance number
    const locationMap: Record<number, string> = {
      0: 'Port',
      1: 'Stbd',
      2: 'Center',
      3: 'Fwd',
      4: 'Aft',
      5: 'Port',   // Second port tank (e.g., ballast)
      6: 'Stbd',   // Second starboard tank (e.g., ballast)
    };
    
    const location = locationMap[instanceNumber] || `#${instanceNumber + 1}`;
    const typeLabel = tankType.charAt(0).toUpperCase() + tankType.slice(1);
    
    // Format: "[Type] Tank - [Location]" e.g. "Fuel Tank - Port", "Water Tank - Center"
    return `${typeLabel} Tank - ${location}`;
  }, [tankType, instanceNumber]);

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
    secondaryView: {
      alignItems: 'flex-end',
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('tank')?.icon || 'cube-outline'} 
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

      {/* Primary Grid (2×1): Tank Level + Capacity */}
      <View style={styles.primaryView}>
        <View style={styles.primaryGrid}>
          <PrimaryMetricCell
            mnemonic="LEVEL"
            value={level !== null ? `${Math.round(level)}` : '---'}
            unit="%"
            state={tankState}
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
          <PrimaryMetricCell
            mnemonic="CAP"
            value={capacity !== null ? capacity.toFixed(0) : '---'}
            unit="L"
            state="normal"
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
        </View>
      </View>

      {/* Secondary Grid (2×1): Available Capacity + Type */}
      {/* Horizontal separator */}
      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* SECONDARY GRID */}
      <View style={styles.secondaryContainer}>
        <View style={styles.secondaryGrid}>
          <SecondaryMetricCell
            mnemonic="AVAIL"
            value={availableCapacity !== null ? availableCapacity.toFixed(0) : '---'}
            unit="L"
            state="normal"
            compact={true}
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
          <SecondaryMetricCell
            mnemonic="TYPE"
            value={tankType.toUpperCase()}
            unit=""
            state="normal"
            compact={true}
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

export default TanksWidget;
