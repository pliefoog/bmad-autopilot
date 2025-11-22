import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useSpeedPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import { usePresentationStore } from '../presentation/presentationStore';
import { findPresentation } from '../presentation/presentations';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';

interface SpeedWidgetProps {
  id: string;
  title: string;
}

/**
 * Speed Widget - STW/SOG Focus per ui-architecture.md v2.3
 * Primary Grid (1×2): STW + SOG with large values
 * Secondary Grid (2×2): AVG and MAX for both STW/SOG in columns
 * Interactive Chart: STW trend (tap to switch to SOG)
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // NEW: Clean semantic data presentation system for speed
  const speedPresentation = useSpeedPresentation();
  const presentationStore = usePresentationStore();
  
  // Get the full presentation object with formatSpec
  const fullPresentation = useMemo(() => {
    const presentationId = presentationStore.selectedPresentations.speed;
    return presentationId ? findPresentation('speed', presentationId) : null;
  }, [presentationStore.selectedPresentations.speed]);
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // Create theme-aware styles
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // NMEA data selectors - NMEA Store v2.0 sensor-based interface
  const speedData = useNmeaStore(useCallback((state: any) => state.nmeaData.sensors.speed[0], [])); // Speed sensor data
  
  // Extract speed values from sensor data
  const sog = speedData?.overGround; // Speed Over Ground (VTG/RMC/GPS)
  const stw = speedData?.throughWater; // Speed Through Water (VHW/log/paddle wheel)
  const speedTimestamp = speedData?.timestamp;
  
  // Speed history for averages and maximums
  const [speedHistory, setSpeedHistory] = useState<{
    sog: { value: number; timestamp: number }[];
    stw: { value: number; timestamp: number }[];  // Speed Through Water
  }>({ sog: [], stw: [] });

  // Track speed history for calculations
  useEffect(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    
    // Only update if we have valid new data
    if (sog !== undefined && sog !== null) {
      setSpeedHistory(prev => {
        // Check if the last entry is the same value to avoid duplicates
        const lastSogEntry = prev.sog[prev.sog.length - 1];
        if (lastSogEntry && Math.abs(lastSogEntry.value - sog) < 0.01 && (now - lastSogEntry.timestamp) < 1000) {
          return prev; // Skip if same value within 1 second
        }
        
        return {
          ...prev,
          sog: [...prev.sog, { value: sog, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300) // Keep max 300 entries
        };
      });
    }
    
    if (stw !== undefined && stw !== null) {
      setSpeedHistory(prev => {
        // Check if the last entry is the same value to avoid duplicates
        const lastStwEntry = prev.stw[prev.stw.length - 1];
        if (lastStwEntry && Math.abs(lastStwEntry.value - stw) < 0.01 && (now - lastStwEntry.timestamp) < 1000) {
          return prev; // Skip if same value within 1 second
        }
        
        return {
          ...prev,
          stw: [...prev.stw, { value: stw, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300)
        };
      });
    }
  }, [sog, stw]);

  // Calculate averages and maximums for secondary view
  const calculations = useMemo(() => {
    const calculateStats = (data: { value: number; timestamp: number }[]) => {
      if (data.length === 0) return { avg: null, max: null };
      const values = data.map(d => d.value);
      return {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values)
      };
    };

    return {
      sog: calculateStats(speedHistory.sog),
      stw: calculateStats(speedHistory.stw)  // Speed Through Water
    };
  }, [speedHistory]);

  // NEW: Speed conversion using semantic presentation system
  const getSpeedDisplay = useCallback((speedValue: number | null | undefined, label: string = 'Speed'): MetricDisplayData => {
    const presentation = speedPresentation.presentation;
    
    if (speedValue === undefined || speedValue === null) {
      return {
        mnemonic: label, // NMEA source abbreviation like "SOG", "STW"
        value: '---',
        unit: presentation?.symbol || 'kts', // Presentation symbol
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: presentation?.id || 'kts_1',
          name: presentation?.name || 'Knots (1 decimal)',
          pattern: fullPresentation?.formatSpec.pattern || 'xxx.x'
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true
        }
      };
    }
    
    if (!speedPresentation.isValid || !presentation || !fullPresentation) {
      // Fallback to knots if presentation system fails
      return {
        mnemonic: label, // NMEA source abbreviation like "SOG", "STW"  
        value: speedValue.toFixed(1),
        unit: 'kts', // Fallback presentation symbol
        rawValue: speedValue,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'kts_1',
          name: 'Knots (1 decimal)',
          pattern: 'xxx.x'
        },
        status: {
          isValid: true,
          isFallback: true
        }
      };
    }
    
    return {
      mnemonic: label, // NMEA source abbreviation like "SOG", "STW"
      value: speedPresentation.convertAndFormat(speedValue),
      unit: presentation.symbol, // Presentation symbol like "kts", "mph"
      rawValue: speedValue,
      layout: {
        minWidth: fullPresentation.formatSpec.minWidth * 8, // Approximate character width
        alignment: 'right'
      },
      presentation: {
        id: presentation.id,
        name: presentation.name,
        pattern: fullPresentation.formatSpec.pattern
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, [speedPresentation, fullPresentation]);

  // Speed display data for component compatibility using presentation system
  const speedDisplayData = useMemo(() => {
    return {
      sog: getSpeedDisplay(sog, 'SOG'),
      stw: getSpeedDisplay(stw, 'STW'),
      sogAvg: getSpeedDisplay(calculations.sog.avg, 'AVG'),
      stwAvg: getSpeedDisplay(calculations.stw.avg, 'AVG'),
      sogMax: getSpeedDisplay(calculations.sog.max, 'MAX'),
      stwMax: getSpeedDisplay(calculations.stw.max, 'MAX')
    };
  }, [getSpeedDisplay, sog, stw, calculations]);

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    toggleWidgetExpansion(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetExpansion, updateWidgetInteraction]);

  const handleLongPressOnCaret = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Data staleness detection - consider stale if no speed data (either SOG or STW)
  const isStale = (sog === undefined || sog === null) && (stw === undefined || stw === null);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`speed-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('speed')?.icon || 'speedometer-outline'} 
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
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
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

      {/* PRIMARY GRID (1×2): SOG + Speed with large values */}
      <View style={styles.primaryGrid}>
        <PrimaryMetricCell
          data={speedDisplayData.sog}
          state={isStale ? 'warning' : 'normal'}
        />
        <PrimaryMetricCell
          data={speedDisplayData.stw}
          state={isStale ? 'warning' : 'normal'}
        />
      </View>

      {/* SECONDARY GRID (2×2): SOG column and Speed column */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          {/* First Row: AVG values */}
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={speedDisplayData.sogAvg}
                state="normal"
                compact={true}
              />
            </View>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={speedDisplayData.stwAvg}
                state="normal"
                compact={true}
              />
            </View>
          </View>
          {/* Second Row: MAX values */}
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={speedDisplayData.sogMax}
                state="normal"
                compact={true}
              />
            </View>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={speedDisplayData.stwMax}
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

SpeedWidget.displayName = 'SpeedWidget';

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
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  // Primary Grid (1×2): Side by side STW/SOG
  primaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 80, // Ensure adequate height for content
  },
  // Secondary Container for expanded view
  secondaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  // Secondary Grid (2×2): SOG and STW in columns
  secondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  // Grid cell wrapper for proper alignment
  gridCell: {
    flex: 1,
    alignItems: 'flex-end',
  },
});

export default SpeedWidget;
