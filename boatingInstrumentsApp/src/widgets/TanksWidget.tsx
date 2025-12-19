import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { TankSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

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
  const fontSize = useResponsiveFontSize(width || 0, height || 0);

  // Extract tank instance from widget ID (e.g., "tank-0", "tank-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/tank-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  
  // NMEA data - Phase 1 Optimization: Selective field subscriptions with shallow equality
  const tankLevel = useNmeaStore((state) => state.nmeaData.sensors.tank?.[instanceNumber]?.level, (a, b) => a === b);
  const capacity = useNmeaStore((state) => state.nmeaData.sensors.tank?.[instanceNumber]?.capacity ?? null, (a, b) => a === b);
  const tankType = useNmeaStore((state) => state.nmeaData.sensors.tank?.[instanceNumber]?.type ?? 'unknown', (a, b) => a === b);
  const tankName = useNmeaStore((state) => state.nmeaData.sensors.tank?.[instanceNumber]?.name ?? title, (a, b) => a === b);
  const tankTimestamp = useNmeaStore((state) => state.nmeaData.sensors.tank?.[instanceNumber]?.timestamp, (a, b) => a === b);
  
  // Extract tank values
  const level = tankLevel ? tankLevel * 100 : null; // Convert ratio to percentage
  
  // Calculate available capacity (capacity * level ratio)
  const availableCapacity = useMemo(() => {
    if (capacity && tankLevel) {
      return capacity * tankLevel; // Available liters
    }
    return null;
  }, [capacity, tankLevel]);
  
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

  const handleLongPressOnPin = useCallback(() => {
  }, [id]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

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
          name={WidgetMetadataRegistry.getMetadata('tank')?.icon || 'cube-outline'} 
          size={headerIconSize} 
          color={theme.iconPrimary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{getDisplayTitle()}</Text>
      </View>
      

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
      testID={`tank-widget-${id}`}
    >
        {/* Row 1: Level */}
        <PrimaryMetricCell
          mnemonic="LEVEL"
          value={level !== null ? `${Math.round(level)}` : '---'}
          unit="%"
          state={tankState}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: Capacity */}
        <PrimaryMetricCell
          mnemonic="CAP"
          value={capacity !== null ? capacity.toFixed(0) : '---'}
          unit="L"
          state="normal"
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Available */}
        <SecondaryMetricCell
          mnemonic="AVAIL"
          value={availableCapacity !== null ? availableCapacity.toFixed(0) : '---'}
          unit="L"
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 4: Type */}
        <SecondaryMetricCell
          mnemonic="TYPE"
          value={tankType.toUpperCase()}
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

export default TanksWidget;
