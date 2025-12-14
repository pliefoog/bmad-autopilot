import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
// Note: Alarm thresholds now auto-subscribed in TrendLine component
import { useDepthPresentation } from '../presentation/useDataPresentation';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { DepthSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface DepthWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
  maxWidth?: number; // Cell width from UnifiedWidgetGrid
  cellHeight?: number; // Cell height from UnifiedWidgetGrid
}

/**
 * Depth Widget - Water depth sounder per ui-architecture.md v2.3
 * Primary Grid (2×1): Current depth with large value + Trend Line Graph
 * Secondary Grid (2×1): Minimum depth (shoal alarm) + Maximum depth from session
 * Uses centralized unit system (meters/feet/fathoms) configurable via hamburger menu
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id, title, width, height, maxWidth, cellHeight }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width, height);
  
  // NEW: Clean semantic data presentation system
  const depthPresentation = useDepthPresentation();
  
  // Widget state management per ui-architecture.md v2.3
  
  // NEW: Get session stats method from store
  const getSessionStats = useNmeaStore((state) => state.getSessionStats);
  
  // NMEA data selectors - Read from single sensor instance (based on talker ID)
  // All three depth types (DPT, DBT, DBK) from same physical sensor are in separate fields
  // Priority: DPT (depthBelowWaterline) > DBT (depthBelowTransducer) > DBK (depthBelowKeel)
  const dptDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.depthBelowWaterline) as number | undefined;
  const dbtDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.depthBelowTransducer) as number | undefined;
  const dbkDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.depthBelowKeel) as number | undefined;
  const sensorTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.timestamp);
  
  // Track currently locked depth source to prevent unnecessary switching (using ref to avoid re-renders)
  const lockedSourceRef = React.useRef<'DPT' | 'DBT' | 'DBK' | null>(null);
  
  // Select depth measurement type with sticky selection: once locked, only switch if current type unavailable
  const selectedDepthData = useMemo(() => {
    // Helper to check if a depth value is valid
    const isDepthValid = (depth: number | undefined): boolean => {
      return depth !== undefined && !isNaN(depth);
    };
    
    // Check if sensor data is fresh (10 second threshold for depth selection stability)
    const isSensorFresh = sensorTimestamp !== undefined && (Date.now() - sensorTimestamp) < 10000;
    
    // If we have a locked source, check if it's still available and fresh
    if (lockedSourceRef.current && isSensorFresh) {
      let currentDepth: number | undefined;
      let currentReferencePoint: 'waterline' | 'transducer' | 'keel';
      
      switch (lockedSourceRef.current) {
        case 'DPT':
          currentDepth = dptDepth;
          currentReferencePoint = 'waterline';
          break;
        case 'DBT':
          currentDepth = dbtDepth;
          currentReferencePoint = 'transducer';
          break;
        case 'DBK':
          currentDepth = dbkDepth;
          currentReferencePoint = 'keel';
          break;
      }
      
      // If current measurement type is still available, stick with it (STICKY SELECTION)
      if (isDepthValid(currentDepth)) {
        return {
          depth: currentDepth!,
          depthSource: lockedSourceRef.current,
          depthReferencePoint: currentReferencePoint,
          depthTimestamp: sensorTimestamp!
        };
      }
      
      // Current measurement type unavailable, unlock and fall through to priority selection
      lockedSourceRef.current = null;
    }
    
    // No locked source or sensor stale: use priority-based selection
    // Priority: DPT (waterline) > DBT (transducer) > DBK (keel)
    if (isDepthValid(dptDepth) && isSensorFresh) {
      lockedSourceRef.current = 'DPT';
      return {
        depth: dptDepth!,
        depthSource: 'DPT' as const,
        depthReferencePoint: 'waterline' as const,
        depthTimestamp: sensorTimestamp!
      };
    }
    
    if (isDepthValid(dbtDepth) && isSensorFresh) {
      lockedSourceRef.current = 'DBT';
      return {
        depth: dbtDepth!,
        depthSource: 'DBT' as const,
        depthReferencePoint: 'transducer' as const,
        depthTimestamp: sensorTimestamp!
      };
    }
    
    if (isDepthValid(dbkDepth) && isSensorFresh) {
      lockedSourceRef.current = 'DBK';
      return {
        depth: dbkDepth!,
        depthSource: 'DBK' as const,
        depthReferencePoint: 'keel' as const,
        depthTimestamp: sensorTimestamp!
      };
    }
    
    // No valid depth data available
    lockedSourceRef.current = null;
    return { 
      depth: undefined, 
      depthSource: undefined, 
      depthReferencePoint: undefined, 
      depthTimestamp: undefined 
    };
  }, [dptDepth, dbtDepth, dbkDepth, sensorTimestamp]);
  
  // Remove the lockedSource useEffect entirely - ref handles it now
  
  const { depth, depthSource, depthReferencePoint, depthTimestamp } = selectedDepthData;
  
  // Simple stale check without interval
  const isStale = !depthTimestamp || (Date.now() - depthTimestamp) > 5000;
  
  // Get session stats from store (instance 0 - all depth measurements merged here)
  const sessionStats = useMemo(() => {
    const stats = getSessionStats('depth', 0);
    return stats;
  }, [getSessionStats, depth, depthTimestamp]); // Re-calculate when depth changes

  // Note: Alarm thresholds for TrendLine are now auto-subscribed within the component
  // No need to fetch and convert them here

  const handleLongPressOnPin = useCallback(() => {
  }, [id]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // NEW: Simple depth conversion using semantic presentation system
  const convertDepth = useMemo(() => {
    const convert = (depthMeters: number | null | undefined): { value: string; unit: string } => {
      if (depthMeters === undefined || depthMeters === null) {
        return { 
          value: '---', 
          unit: depthPresentation.presentation?.symbol || 'm' 
        };
      }

      if (!depthPresentation.isValid) {
        // Fallback to meters with 1 decimal place (standard marine instrument precision)
        return { value: depthMeters.toFixed(1), unit: 'm' };
      }

      const result = { 
        value: depthPresentation.convertAndFormat(depthMeters), 
        unit: depthPresentation.presentation?.symbol || 'm'
      };
      return result;
    };

    return {
      current: convert(depth),
      sessionMin: convert(sessionStats.min),
      sessionMax: convert(sessionStats.max)
    };
  }, [depth, sessionStats, depthPresentation]);

  // Depth alarm states
  const depthState = useMemo(() => {
    if (depth === undefined || depth === null) return 'normal';
    
    // Critical depth alarm at 1.5m / 5ft
    const criticalDepthMeters = 1.5;
    // Shallow water warning at 3.0m / 10ft  
    const shallowDepthMeters = 3.0;
    
    if (depth < criticalDepthMeters) return 'alarm';
    if (depth < shallowDepthMeters) return 'warning';
    return 'normal';
  }, [depth]);

  // Generate depth source info for user display
  const depthSourceInfo = useMemo(() => {
    if (!depthSource) return { 
      shortLabel: 'DEPTH',
      icon: '❓'
    };
    
    const sourceInfo: Record<string, { shortLabel: string; icon: string }> = {
      'DBT': { shortLabel: 'DBT', icon: '🔊' },  // Sonar/transducer
      'DPT': { shortLabel: 'DPT', icon: '〰️' },  // Water surface
      'DBK': { shortLabel: 'DBK', icon: '⚓' }   // Anchor/keel
    };

    return sourceInfo[depthSource] || { 
      shortLabel: depthSource,
      icon: '❓'
    };
  }, [depthSource]);

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
          name={WidgetMetadataRegistry.getMetadata('depth')?.icon || 'water-outline'} 
          size={headerIconSize} 
          color={theme.iconPrimary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
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
      testID={`depth-widget-${id}`}
    >
        {/* Row 1: Current depth with large value */}
        <PrimaryMetricCell
          mnemonic={depthSourceInfo.shortLabel || "DEPTH"}
          {...convertDepth.current}
          state={isStale ? 'warning' : depthState}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        
        {/* Row 2: Trend Line Graph - Self-subscribing pattern with auto-subscribed thresholds */}
        <TrendLine 
          sensor="depth"
          instance={0}
          timeWindowMs={5 * 60 * 1000}
          usePrimaryLine={true}
          showXAxis={true}
          showYAxis={true}
          xAxisPosition="top"
          yAxisDirection="down"
          timeWindowMinutes={5}
          showTimeLabels={true}
          showGrid={true}
          strokeWidth={2}
          forceZero={true}
        />
        
        {/* Separator rendered automatically after row 1 (index 1) = after the trend line */}
        
        {/* Row 3: Session minimum depth */}
        <SecondaryMetricCell
          mnemonic="MIN"
          {...convertDepth.sessionMin}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        
        {/* Row 4: Session maximum depth */}
        <SecondaryMetricCell
          mnemonic="MAX"
          {...convertDepth.sessionMax}
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

DepthWidget.displayName = 'DepthWidget';

export default DepthWidget;