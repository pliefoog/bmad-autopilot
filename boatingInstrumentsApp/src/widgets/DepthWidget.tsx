import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDepthAlarmThresholds } from '../hooks/useAlarmThresholds';
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
  
  // NEW: Get history and stats methods from store
  const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);
  const getSessionStats = useNmeaStore((state) => state.getSessionStats);
  
  // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
  // Priority: DPT (instance 0) > DBT (instance 1) > DBK (instance 2)
  // Subscribe to individual fields instead of entire depth objects
  const dptDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.depth, (a, b) => a === b);
  const dptReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.referencePoint, (a, b) => a === b);
  const dptTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.timestamp);
  
  const dbtDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.depth, (a, b) => a === b);
  const dbtReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.referencePoint, (a, b) => a === b);
  const dbtTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.timestamp);
  
  const dbkDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.depth, (a, b) => a === b);
  const dbkReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.referencePoint, (a, b) => a === b);
  const dbkTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.timestamp);
  
  // Track currently locked depth source to prevent unnecessary switching (using ref to avoid re-renders)
  const lockedSourceRef = React.useRef<'DPT' | 'DBT' | 'DBK' | null>(null);
  
  // Select depth source with sticky selection: once locked, only switch if current source becomes stale
  const selectedDepthData = useMemo(() => {
    const now = Date.now();
    const STALE_THRESHOLD = 10000; // 10 seconds
    
    // Helper to check if a source is valid and fresh
    const isSourceValid = (depth: number | undefined, timestamp: number | undefined): boolean => {
      return depth !== undefined && 
             timestamp !== undefined &&
             (now - timestamp) < STALE_THRESHOLD;
    };
    
    // If we have a locked source, check if it's still valid
    if (lockedSourceRef.current) {
      let currentDepth: number | undefined;
      let currentReferencePoint: string | undefined;
      let currentTimestamp: number | undefined;
      
      switch (lockedSourceRef.current) {
        case 'DPT':
          currentDepth = dptDepth;
          currentReferencePoint = dptReferencePoint;
          currentTimestamp = dptTimestamp;
          break;
        case 'DBT':
          currentDepth = dbtDepth;
          currentReferencePoint = dbtReferencePoint;
          currentTimestamp = dbtTimestamp;
          break;
        case 'DBK':
          currentDepth = dbkDepth;
          currentReferencePoint = dbkReferencePoint;
          currentTimestamp = dbkTimestamp;
          break;
      }
      
      // If current source is still valid, stick with it (STICKY SELECTION)
      if (isSourceValid(currentDepth, currentTimestamp)) {
        return {
          depth: currentDepth!,
          depthSource: lockedSourceRef.current,
          depthReferencePoint: currentReferencePoint,
          depthTimestamp: currentTimestamp!
        };
      }
      
      // Current source became stale, unlock and fall through to priority selection
      lockedSourceRef.current = null;
    }
    
    // No locked source or current source stale: use priority-based selection
    // Priority: DPT > DBT > DBK
    if (isSourceValid(dptDepth, dptTimestamp)) {
      lockedSourceRef.current = 'DPT';
      return {
        depth: dptDepth!,
        depthSource: 'DPT' as const,
        depthReferencePoint: dptReferencePoint,
        depthTimestamp: dptTimestamp!
      };
    }
    
    if (isSourceValid(dbtDepth, dbtTimestamp)) {
      lockedSourceRef.current = 'DBT';
      return {
        depth: dbtDepth!,
        depthSource: 'DBT' as const,
        depthReferencePoint: dbtReferencePoint,
        depthTimestamp: dbtTimestamp!
      };
    }
    
    if (isSourceValid(dbkDepth, dbkTimestamp)) {
      lockedSourceRef.current = 'DBK';
      return {
        depth: dbkDepth!,
        depthSource: 'DBK' as const,
        depthReferencePoint: dbkReferencePoint,
        depthTimestamp: dbkTimestamp!
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
  }, [dptDepth, dptReferencePoint, dptTimestamp, dbtDepth, dbtReferencePoint, dbtTimestamp, dbkDepth, dbkReferencePoint, dbkTimestamp]);
  
  // Remove the lockedSource useEffect entirely - ref handles it now
  
  const { depth, depthSource, depthReferencePoint, depthTimestamp } = selectedDepthData;
  
  // Simple stale check without interval
  const isStale = !depthTimestamp || (Date.now() - depthTimestamp) > 5000;
  
  // NEW: Get session stats efficiently from store
  const sessionStats = useMemo(() => {
    // Priority: DPT (instance 0) > DBT (instance 1) > DBK (instance 2)
    // Try to get stats from the primary source
    let stats = getSessionStats('depth', 0);
    
    // Fallback to other sources if primary has no data
    if (stats.count === 0) {
      stats = getSessionStats('depth', 1);
    }
    if (stats.count === 0) {
      stats = getSessionStats('depth', 2);
    }
    
    return stats;
  }, [getSessionStats]);

  // Get alarm thresholds for depth from CriticalAlarmConfiguration
  const alarmThresholds = useDepthAlarmThresholds();

  // Wrapper component to receive injected props from UnifiedWidgetGrid
  const TrendLineCell = useCallback(({ maxWidth: cellMaxWidth, cellHeight: cellHeightValue }: { maxWidth?: number; cellHeight?: number }) => {
    // Get all data points in 5 minute window
    const trendData = getSensorHistory('depth', 0, {
      timeWindowMs: 5 * 60 * 1000
    });
    
    // Convert alarm thresholds to display units for TrendLine
    const convertedWarningThreshold = alarmThresholds.warning !== 9999 
      ? depthPresentation.convert(alarmThresholds.warning) 
      : undefined;
    const convertedAlarmThreshold = alarmThresholds.min !== 9999 
      ? depthPresentation.convert(alarmThresholds.min) 
      : undefined;
    
    return (
      <TrendLine 
        data={trendData}
        width={cellMaxWidth || 300}
        height={cellHeightValue || 60}
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
        warningThreshold={convertedWarningThreshold}
        alarmThreshold={convertedAlarmThreshold}
        thresholdType={alarmThresholds.thresholdType}
      />
    );
  }, [getSensorHistory, alarmThresholds, depthPresentation]);

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
        // Fallback to meters if presentation system fails
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
      
      {pinned && (
        <TouchableOpacity
          onLongPress={handleLongPressOnPin}
          style={{ padding: 4, minWidth: 24, alignItems: 'center' }}
          testID={`pin-button-${id}`}
        >
          <UniversalIcon name="pin" size={headerIconSize} color={theme.iconPrimary} />
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
        
        {/* Row 2: Trend Line Graph */}
        <TrendLineCell />
        
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