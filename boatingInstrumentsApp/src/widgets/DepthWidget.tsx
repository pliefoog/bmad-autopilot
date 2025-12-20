import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
// Note: Alarm thresholds now auto-subscribed in TrendLine component
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
  
  // Widget state management per ui-architecture.md v2.3
  
  // NEW: Get session stats method from store
  const getSessionStats = useNmeaStore((state) => state.getSessionStats);
  
  // NMEA data selectors - Read depth sensor data with display cache
  // ARCHITECTURAL FIX: Priority logic (DPT > DBT > DBK) is in NmeaSensorProcessor
  // Widget just reads the single 'depth' field selected by data layer
  const depthSensorData = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0], (a, b) => a === b);
  const depth = depthSensorData?.depth;
  const depthSource = depthSensorData?.depthSource;
  const depthReferencePoint = depthSensorData?.depthReferencePoint;
  const sensorTimestamp = depthSensorData?.timestamp;
  
  // Legacy fields for debugging (no longer used by widget)
  const dptDepth = depthSensorData?.depthBelowWaterline;
  const dbtDepth = depthSensorData?.depthBelowTransducer;
  const dbkDepth = depthSensorData?.depthBelowKeel;
  
  // Simple stale check without interval
  const isStale = !sensorTimestamp || (Date.now() - sensorTimestamp) > 5000;
  
  // Get session stats from store (instance 0 - all depth measurements merged here)
  const sessionStats = useMemo(() => {
    const stats = getSessionStats('depth', 0);
    return stats;
  }, [getSessionStats, depth, sensorTimestamp]); // Re-calculate when depth changes

  // Note: Alarm thresholds for TrendLine are now auto-subscribed within the component
  // No need to fetch and convert them here

  const handleLongPressOnPin = useCallback(() => {
  }, [id]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // NEW: Use cached display info from sensor.display (Phase 3 migration)
  // No more presentation hooks needed - data is pre-formatted in store
  // 🛡️ ARCHITECTURAL VALIDATION: Display cache MUST exist - no fallbacks allowed
  const convertDepth = useMemo(() => {
    // CRITICAL: If depth exists but display cache is missing, this is a BUG
    if (depth !== null && depth !== undefined && !depthSensorData?.display?.depth) {
      console.error(
        '🚨 PRESENTATION CACHE BUG: Depth sensor has raw data but missing display cache!',
        {
          depth,
          depthSensorData,
          hasDisplay: !!depthSensorData?.display,
          displayDepth: depthSensorData?.display?.depth,
        }
      );
      // Throw exception in development to force structural fix
      if (__DEV__) {
        throw new Error(
          `[DepthWidget] Display cache missing for depth=${depth}. ` +
          `This indicates SensorPresentationCache.enrichSensorData() failed. ` +
          `Check SensorConfigRegistry has 'depth' field with category='depth'.`
        );
      }
    }

    return {
      current: {
        value: depthSensorData?.display?.depth?.formatted?.replace(` ${depthSensorData?.display?.depth?.unit}`, '') ?? '---',
        unit: depthSensorData?.display?.depth?.unit ?? 'm'
      },
      sessionMin: {
        value: sessionStats.min !== null ? sessionStats.min.toFixed(1) : '---',
        unit: depthSensorData?.display?.depth?.unit ?? 'm'
      },
      sessionMax: {
        value: sessionStats.max !== null ? sessionStats.max.toFixed(1) : '---',
        unit: depthSensorData?.display?.depth?.unit ?? 'm'
      }
    };
  }, [depth, sessionStats, depthSensorData]);

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