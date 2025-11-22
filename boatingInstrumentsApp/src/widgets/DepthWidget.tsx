import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDepthPresentation } from '../presentation/useDataPresentation';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { DepthSensorData } from '../types/SensorData';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';

interface DepthWidgetProps {
  id: string;
  title: string;
}

/**
 * Depth Widget - Water depth sounder per ui-architecture.md v2.3
 * Primary Grid (1×1): Current depth with large value
 * Secondary Grid (1×2): Minimum depth (shoal alarm) + Maximum depth from session
 * Uses centralized unit system (meters/feet/fathoms) configurable via hamburger menu
 */
export const DepthWidget: React.FC<DepthWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // NEW: Clean semantic data presentation system
  const depthPresentation = useDepthPresentation();
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
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
    toggleWidgetExpansion(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetExpansion, updateWidgetInteraction]);

  const handleLongPressOnCaret = useCallback(() => {
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
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPressOnCaret}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <Text style={[styles.pinIcon, { color: theme.primary }]}>📌</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePress}
              onLongPress={handleLongPressOnCaret}
              style={styles.controlButton}
              testID={`caret-button-${id}`}
            >
              <Text style={[styles.caret, { color: theme.textSecondary }]}>
                {expanded ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PRIMARY GRID (1×1): Current depth with large value */}
      <View style={styles.depthContainer}>
        <PrimaryMetricCell
          mnemonic={depthSourceInfo.shortLabel || "DEPTH"}
          {...convertDepth.current}
          state={isStale ? 'warning' : depthState}
        />
      </View>

      {/* SECONDARY GRID (1×2): Session minimum and maximum depths */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="MIN"
                {...convertDepth.sessionMin}
                state="normal"
                compact={true}
              />
            </View>
          </View>
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                mnemonic="MAX"
                {...convertDepth.sessionMax}
                state="normal"
                compact={true}
              />
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

DepthWidget.displayName = 'DepthWidget';

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
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
  // Primary Grid: Depth display (1×1)
  depthContainer: {
    marginBottom: 8,
    minHeight: 80, // Ensure consistent height with other widgets
  },
  // Secondary Container for expanded view
  secondaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  // Secondary Grid (1×2): Min and Max depths
  secondaryGrid: {
    marginBottom: 8,
  },
  // Grid cell wrapper for proper alignment
  gridCell: {
    alignItems: 'flex-end',
  },
});

export default DepthWidget;