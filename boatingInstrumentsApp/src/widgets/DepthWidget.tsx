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
      data={depthHistory.depths
        .filter(d => d.timestamp > Date.now() - 5 * 60 * 1000)
        .map(d => d.value)}
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
  
  // NMEA data selectors - Depth data with Raymarine-style priority selection
  // Clean sensor data access - NMEA Store v2.0
  const depthData = useNmeaStore(useCallback((state) => 
    state.getSensorData('depth', 0) as DepthSensorData | undefined, // Primary depth sensor instance
    []
  ));
  
  // Marine depth data with clean sensor access
  const selectedDepthData = useMemo(() => {
    if (!depthData) {
      return { depth: undefined, depthSource: undefined, depthReferencePoint: undefined, depthTimestamp: undefined };
    }
    
    // Clean sensor data directly from NMEA Store v2.0
    return {
      depth: depthData.depth,
      depthSource: 'DBT' as const, // NMEA sentence type
      depthReferencePoint: depthData.referencePoint,
      depthTimestamp: depthData.timestamp
    };
  }, [depthData]);
  
  const { depth, depthSource, depthReferencePoint, depthTimestamp } = selectedDepthData;
  
  // Depth history for min/max calculations
  const [depthHistory, setDepthHistory] = useState<{
    depths: { value: number; timestamp: number }[];
    sessionMin: number | null;
    sessionMax: number | null;
  }>({ depths: [], sessionMin: null, sessionMax: null });

  // Track depth history and session min/max
  useEffect(() => {
    if (depth !== undefined && depth !== null) {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const timeWindowMs = 5 * 60 * 1000; // 5 minutes for trend display
      
      setDepthHistory(prev => {
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
          sessionMax: currentSessionMax
        };
      });
    }
  }, [depth]);

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Calculate responsive header sizes based on widget dimensions
  const headerIconSize = useMemo(() => {
    const baseSize = 16;
    const minSize = 12;
    const maxSize = 20;
    const scaleFactor = (width || 400) / 400;
    return Math.max(minSize, Math.min(maxSize, baseSize * scaleFactor));
  }, [width]);

  const headerFontSize = useMemo(() => {
    const baseSize = 11;
    const minSize = 9;
    const maxSize = 13;
    const scaleFactor = (width || 400) / 400;
    return Math.max(minSize, Math.min(maxSize, baseSize * scaleFactor));
  }, [width]);

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

  // Data staleness detection (>10s = stale for depth)
  const isStale = depthTimestamp ? (Date.now() - depthTimestamp) > 10000 : true;

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