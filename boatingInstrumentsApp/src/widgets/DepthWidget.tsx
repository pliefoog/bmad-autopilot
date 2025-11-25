import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDepthPresentation } from '../presentation/useDataPresentation';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { DepthSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

interface DepthWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Depth Widget - Water depth sounder per ui-architecture.md v2.3
 * Primary Grid (2×1): Current depth with large value + Trend Line Graph
 * Secondary Grid (2×1): Minimum depth (shoal alarm) + Maximum depth from session
 * Uses centralized unit system (meters/feet/fathoms) configurable via hamburger menu
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const { scaleFactor, fontSize, spacing } = useResponsiveScale(width, height);
  
  // NEW: Clean semantic data presentation system
  const depthPresentation = useDepthPresentation();
  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // Create theme-aware styles
  const styles = useMemo(() => createStyles(theme), [theme]);
  
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

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`depth-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('depth')?.icon || 'water-outline'} 
            size={12} 
            color={theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.title, { color: theme.textSecondary }]}>
            {title.toUpperCase()}
          </Text>

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

      {/* PRIMARY GRID (2×1): Current depth with large value */}
      <View style={styles.depthContainer}>
        <PrimaryMetricCell
          mnemonic={depthSourceInfo.shortLabel || "DEPTH"}
          {...convertDepth.current}
          state={isStale ? 'warning' : depthState}
          fontSize={{
            mnemonic: fontSize.primaryLabel,
            value: fontSize.primaryValue,
            unit: fontSize.primaryUnit,
          }}
        />
        {/* Trend Line Graph */}
        <View style={styles.trendLineContainer}>
          <TrendLine 
            data={depthHistory.depths.map(d => d.value).slice(-20)}
            width={200}
            height={60}
            color={isStale ? theme.warning : depthState === 'alarm' ? theme.error : depthState === 'warning' ? theme.warning : theme.primary}
            theme={theme}
          />
        </View>
      </View>

      {/* Horizontal separator */}
      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* SECONDARY GRID (2×1): Session minimum and maximum depths */}
      <View style={styles.secondaryContainer}>
        <View style={styles.secondaryGrid}>
          <SecondaryMetricCell
            mnemonic="MIN"
            {...convertDepth.sessionMin}
            state="normal"
            compact={true}
            fontSize={{
              mnemonic: fontSize.primaryLabel,
              value: fontSize.primaryValue,
              unit: fontSize.primaryUnit,
            }}
          />
          <SecondaryMetricCell
            mnemonic="MAX"
            {...convertDepth.sessionMax}
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

DepthWidget.displayName = 'DepthWidget';

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sourceIndicator: {
    fontSize: 9,
    marginTop: 2,
    opacity: 0.8,
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
  },
  pinIcon: {
    fontSize: 12,
  },
  // Primary Grid: Depth display (2×1)
  depthContainer: {
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendLineContainer: {
    marginTop: 8,
    alignItems: 'center',
    height: 60,
  },
  // Horizontal separator between primary and secondary views
  separator: {
    height: 1,
    marginVertical: 4,
  },
  // Secondary Container
  secondaryContainer: {
    height: '50%',
    justifyContent: 'center',
  },
  // Secondary Grid (2R×1C): Min and Max depths
  secondaryGrid: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    width: '80%',
  },
});

// Simple trend line component
const TrendLine: React.FC<{ 
  data: number[]; 
  width: number; 
  height: number; 
  color: string;
  theme: any;
}> = ({ data, width, height, color, theme }) => {
  if (data.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>No trend data</Text>
      </View>
    );
  }
  
  const minDepth = Math.min(...data);
  const maxDepth = Math.max(...data);
  const range = maxDepth - minDepth || 1; // Avoid division by zero
  
  const points = data.map((depth, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((depth - minDepth) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
};

export default DepthWidget;