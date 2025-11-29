import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendLine } from '../components/TrendLine';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
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
  
  // Wrapper component to receive injected props from UnifiedWidgetGrid
  const TrendLineCell = ({ maxWidth: cellMaxWidth, cellHeight: cellHeightValue }: { maxWidth?: number; cellHeight?: number }) => (
    <TrendLine 
      data={depthHistory.depths.filter(d => d.timestamp > Date.now() - 5 * 60 * 1000)}
      width={cellMaxWidth || 300}
      height={cellHeightValue || 60}
      color={theme.primary}
      theme={theme}
      showXAxis={true}
      showYAxis={true}
      xAxisPosition="top"
      yAxisDirection="down"
      timeWindowMinutes={5}
      showTimeLabels={true}
      showGrid={true}
      strokeWidth={2}
      forceZero={true}
      warningThreshold={3.0}
      alarmThreshold={1.5}
      thresholdType="min"
      warningColor={theme.warning}
      alarmColor={theme.error}
      normalColor={theme.primary}
    />
  );
  
  // NEW: Clean semantic data presentation system
  const depthPresentation = useDepthPresentation();
  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions
  // Priority: DPT (instance 0) > DBT (instance 1) > DBK (instance 2)
  // Subscribe to individual fields instead of entire depth objects
  const dptDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.depth);
  const dptReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.referencePoint);
  const dptTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[0]?.timestamp);
  
  const dbtDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.depth);
  const dbtReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.referencePoint);
  const dbtTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[1]?.timestamp);
  
  const dbkDepth = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.depth);
  const dbkReferencePoint = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.referencePoint);
  const dbkTimestamp = useNmeaStore((state) => state.nmeaData.sensors.depth?.[2]?.timestamp);
  
  // Track currently locked depth source to prevent unnecessary switching
  const [lockedSource, setLockedSource] = useState<'DPT' | 'DBT' | 'DBK' | null>(null);
  
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
    if (lockedSource) {
      let currentDepth: number | undefined;
      let currentReferencePoint: string | undefined;
      let currentTimestamp: number | undefined;
      
      switch (lockedSource) {
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
          depthSource: lockedSource,
          depthReferencePoint: currentReferencePoint,
          depthTimestamp: currentTimestamp!
        };
      }
      
      // Current source became stale, unlock and fall through to priority selection
      console.log(`[DepthWidget] Source ${lockedSource} became stale, re-evaluating priority`);
      setLockedSource(null);
    }
    
    // No locked source or current source stale: use priority-based selection
    // Priority: DPT > DBT > DBK
    if (isSourceValid(dptDepth, dptTimestamp)) {
      setLockedSource('DPT');
      return {
        depth: dptDepth!,
        depthSource: 'DPT' as const,
        depthReferencePoint: dptReferencePoint,
        depthTimestamp: dptTimestamp!
      };
    }
    
    if (isSourceValid(dbtDepth, dbtTimestamp)) {
      setLockedSource('DBT');
      return {
        depth: dbtDepth!,
        depthSource: 'DBT' as const,
        depthReferencePoint: dbtReferencePoint,
        depthTimestamp: dbtTimestamp!
      };
    }
    
    if (isSourceValid(dbkDepth, dbkTimestamp)) {
      setLockedSource('DBK');
      return {
        depth: dbkDepth!,
        depthSource: 'DBK' as const,
        depthReferencePoint: dbkReferencePoint,
        depthTimestamp: dbkTimestamp!
      };
    }
    
    // No valid depth data available
    setLockedSource(null);
    return { 
      depth: undefined, 
      depthSource: undefined, 
      depthReferencePoint: undefined, 
      depthTimestamp: undefined 
    };
  }, [dptDepth, dptReferencePoint, dptTimestamp, dbtDepth, dbtReferencePoint, dbtTimestamp, dbkDepth, dbkReferencePoint, dbkTimestamp, lockedSource]);
  
  const { depth, depthSource, depthReferencePoint, depthTimestamp } = selectedDepthData;
  
  // Check if data is stale (> 5 seconds old)
  // Use state + useEffect to detect staleness without causing re-renders on every cycle
  const [isStale, setIsStale] = useState(true);
  
  useEffect(() => {
    if (!depthTimestamp) {
      setIsStale(true);
      return;
    }
    
    const checkStale = () => {
      const age = Date.now() - depthTimestamp;
      setIsStale(age > 5000);
    };
    
    // Check immediately when timestamp changes
    checkStale();
    
    // Then check periodically every second
    const interval = setInterval(checkStale, 1000);
    return () => clearInterval(interval);
  }, [depthTimestamp]); // CRITICAL: Only timestamp, not full sensor objects!
  
  // Depth history for min/max calculations with source tracking
  const [depthHistory, setDepthHistory] = useState<{
    depths: { value: number; timestamp: number }[];
    sessionMin: number | null;
    sessionMax: number | null;
    currentSource?: 'DPT' | 'DBT' | 'DBK'; // Track which source we're using
  }>({ depths: [], sessionMin: null, sessionMax: null, currentSource: undefined });

  // Track depth history and session min/max
  useEffect(() => {
    if (depth !== undefined && depth !== null && depthSource) {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const timeWindowMs = 5 * 60 * 1000; // 5 minutes for trend display
      
      setDepthHistory(prev => {
        // CRITICAL: Clear history if source changed to prevent mixing reference points
        // (DPT=waterline, DBT=transducer, DBK=keel have different absolute values)
        if (prev.currentSource && prev.currentSource !== depthSource) {
          console.log(`[DepthWidget] Source changed: ${prev.currentSource} → ${depthSource}, clearing history to prevent spikes`);
          return {
            depths: [{ value: depth, timestamp: now }],
            sessionMin: depth,
            sessionMax: depth,
            currentSource: depthSource
          };
        }
        
        // Check if the last entry is the same value to avoid duplicates
        const lastEntry = prev.depths[prev.depths.length - 1];
        if (lastEntry && Math.abs(lastEntry.value - depth) < 0.01 && (now - lastEntry.timestamp) < 1000) {
          return prev; // Skip if same value within 1 second
        }
        
        const newDepths = [...prev.depths, { value: depth, timestamp: now }]
          .filter(entry => entry.timestamp > oneHourAgo)
          .slice(-1000); // Keep max 1000 entries
        
        const currentSessionMin = prev.sessionMin !== null ? Math.min(prev.sessionMin, depth) : depth;
        const currentSessionMax = prev.sessionMax !== null ? Math.max(prev.sessionMax, depth) : depth;
        
        return {
          depths: newDepths,
          sessionMin: currentSessionMin,
          sessionMax: currentSessionMax,
          currentSource: depthSource // Update current source
        };
      });
    }
  }, [depth, depthSource]);

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // NEW: Simple depth conversion using semantic presentation system
  const convertDepth = useMemo(() => {
    console.log(`🏛️ [DepthWidget] Presentation system:`, {
      isValid: depthPresentation.isValid,
      presentation: depthPresentation.presentation,
      depth
    });
    
    const convert = (depthMeters: number | null | undefined): { value: string; unit: string } => {
      if (depthMeters === undefined || depthMeters === null) {
        return { 
          value: '---', 
          unit: depthPresentation.presentation?.symbol || 'm' 
        };
      }

      if (!depthPresentation.isValid) {
        // Fallback to meters if presentation system fails
        console.warn(`⚠️ [DepthWidget] Presentation system invalid, using fallback`);
        return { value: depthMeters.toFixed(1), unit: 'm' };
      }

      const result = { 
        value: depthPresentation.convertAndFormat(depthMeters), 
        unit: depthPresentation.presentation?.symbol || 'm'
      };
      console.log(`📊 [DepthWidget] Converted ${depthMeters}m ->`, result);
      return result;
    };

    return {
      current: convert(depth),
      sessionMin: convert(depthHistory.sessionMin),
      sessionMax: convert(depthHistory.sessionMax)
    };
  }, [depth, depthHistory, depthPresentation]);

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
          color={theme.primary}
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