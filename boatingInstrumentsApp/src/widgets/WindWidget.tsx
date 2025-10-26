import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useWindPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import { usePresentationStore } from '../presentation/presentationStore';
import { findPresentation } from '../presentation/presentations';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface WindWidgetProps {
  id: string;
  title: string;
}

/**
 * Wind Widget - Apparent/True Wind Focus per ui-architecture.md v2.3
 * Primary Grid (2×2): AWA, AWS, Gust (apparent wind)
 * Secondary Grid (2×2): TWA, TWS, True Gust (calculated true wind)
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // NEW: Clean semantic data presentation system for wind
  const windPresentation = useWindPresentation();
  const presentationStore = usePresentationStore();
  
  // Get the full presentation object with formatSpec
  const fullWindPresentation = useMemo(() => {
    const presentationId = presentationStore.selectedPresentations.wind;
    return presentationId ? findPresentation('wind', presentationId) : null;
  }, [presentationStore.selectedPresentations.wind]);
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Apparent and True Wind
  const windAngle = useNmeaStore(useCallback((state: any) => state.nmeaData.windAngle, [])); // AWA (Apparent Wind Angle)
  const windSpeed = useNmeaStore(useCallback((state: any) => state.nmeaData.windSpeed, [])); // AWS (Apparent Wind Speed)
  const heading = useNmeaStore(useCallback((state: any) => state.nmeaData.heading, [])); // For true wind calculations
  const sog = useNmeaStore(useCallback((state: any) => state.nmeaData.sog, [])); // Speed Over Ground for true wind
  const windTimestamp = useNmeaStore(useCallback((state: any) => state.nmeaData.windTimestamp, []));
  
  // Debug logging - remove after testing
  React.useEffect(() => {
    console.log('🎣 WindWidget - windAngle:', windAngle, 'windSpeed:', windSpeed);
  }, [windAngle, windSpeed]);
  
  // Wind history for gust calculations
  const [windHistory, setWindHistory] = useState<{
    apparent: { speed: number; angle: number; timestamp: number }[];
    true: { speed: number; angle: number; timestamp: number }[];
  }>({ apparent: [], true: [] });

  // Track wind history for gust calculations
  useEffect(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    
    if (windSpeed !== undefined && windSpeed !== null && windAngle !== undefined && windAngle !== null) {
      setWindHistory(prev => {
        // Check if the last entry is the same values to avoid duplicates
        const lastEntry = prev.apparent[prev.apparent.length - 1];
        if (lastEntry && 
            Math.abs(lastEntry.speed - windSpeed) < 0.01 && 
            Math.abs(lastEntry.angle - windAngle) < 0.1 && 
            (now - lastEntry.timestamp) < 1000) {
          return prev; // Skip if same values within 1 second
        }
        
        return {
          ...prev,
          apparent: [...prev.apparent, { speed: windSpeed, angle: windAngle, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300) // Keep max 300 entries
        };
      });
    }
  }, [windSpeed, windAngle]);

  // Calculate True Wind from Apparent Wind
  const trueWind = useMemo(() => {
    if (windSpeed === undefined || windAngle === undefined || sog === undefined || sog === null) {
      return { angle: null, speed: null };
    }

    // Convert apparent wind to true wind
    // AWA is relative to bow, convert to true wind relative to north
    const awsKnots = windSpeed;
    const awaRadians = (windAngle * Math.PI) / 180;
    const sogKnots = sog;
    const headingRadians = heading ? (heading * Math.PI) / 180 : 0;

    // Vector calculation for true wind
    const apparentWindX = awsKnots * Math.sin(awaRadians);
    const apparentWindY = awsKnots * Math.cos(awaRadians);
    
    const vesselSpeedX = sogKnots * Math.sin(headingRadians);
    const vesselSpeedY = sogKnots * Math.cos(headingRadians);
    
    const trueWindX = apparentWindX - vesselSpeedX;
    const trueWindY = apparentWindY - vesselSpeedY;
    
    const trueWindSpeed = Math.sqrt(trueWindX * trueWindX + trueWindY * trueWindY);
    let trueWindAngle = (Math.atan2(trueWindX, trueWindY) * 180) / Math.PI;
    
    // Normalize angle to 0-360
    if (trueWindAngle < 0) trueWindAngle += 360;
    
    return {
      speed: trueWindSpeed,
      angle: trueWindAngle
    };
  }, [windSpeed, windAngle, sog, heading]);

  // Calculate wind gusts and variations
  const gustCalculations = useMemo(() => {
    const calculateGust = (data: { speed: number; timestamp: number }[]) => {
      if (data.length === 0) return null;
      return Math.max(...data.map(d => d.speed));
    };
    
    const calculateVariation = (data: { angle: number; timestamp: number }[]) => {
      if (data.length < 2) return null;
      const angles = data.map(d => d.angle);
      
      // Calculate standard deviation for wind direction variation
      const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
      const variance = angles.reduce((sum, angle) => {
        const diff = angle - mean;
        return sum + diff * diff;
      }, 0) / angles.length;
      
      return Math.sqrt(variance);
    };

    return {
      apparentGust: calculateGust(windHistory.apparent),
      trueGust: calculateGust(windHistory.true),
      apparentVariation: calculateVariation(windHistory.apparent),
      trueVariation: calculateVariation(windHistory.true)
    };
  }, [windHistory]);

  // NEW: Wind conversion using semantic presentation system
  const getWindDisplay = useCallback((windValue: number | null | undefined, label: string = 'Wind'): MetricDisplayData => {
    const presentation = windPresentation.presentation;
    
    if (windValue === undefined || windValue === null) {
      return {
        mnemonic: label, // NMEA source abbreviation like "AWA", "AWS", "TWA", "TWS"
        value: '---',
        unit: presentation?.symbol || 'kt', // Presentation symbol
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: presentation?.id || 'wind_kts_1',
          name: presentation?.name || 'Knots (1 decimal)',
          pattern: fullWindPresentation?.formatSpec.pattern || 'xxx.x'
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true
        }
      };
    }
    
    if (!windPresentation.isValid || !presentation || !fullWindPresentation) {
      // Fallback to knots if presentation system fails
      return {
        mnemonic: label, // NMEA source abbreviation like "AWA", "AWS", "TWA", "TWS"
        value: windValue.toFixed(1),
        unit: 'kt', // Fallback presentation symbol
        rawValue: windValue,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'wind_kts_1',
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
      mnemonic: label, // NMEA source abbreviation like "AWA", "AWS", "TWA", "TWS"
      value: windPresentation.convertAndFormat(windValue),
      unit: presentation.symbol, // Presentation symbol like "kt", "Bf"
      rawValue: windValue,
      layout: {
        minWidth: fullWindPresentation.formatSpec.minWidth * 8,
        alignment: 'right'
      },
      presentation: {
        id: presentation.id,
        name: presentation.name,
        pattern: fullWindPresentation.formatSpec.pattern
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, [windPresentation, fullWindPresentation]);
  
  // Simple angle display function (angles don't need conversion, just formatting)
  const getAngleDisplay = useCallback((angleValue: number | null | undefined, label: string = 'Angle'): MetricDisplayData => {
    if (angleValue === undefined || angleValue === null) {
      return {
        mnemonic: label, // NMEA source abbreviation like "AWA", "TWA"
        value: '---',
        unit: '°', // Presentation symbol for degrees
        rawValue: 0,
        layout: { minWidth: 50, alignment: 'right' },
        presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
        status: { isValid: false, error: 'No data', isFallback: true }
      };
    }
    
    return {
      mnemonic: label, // NMEA source abbreviation like "AWA", "TWA"
      value: Math.round(angleValue).toString(),
      unit: '°', // Presentation symbol for degrees
      rawValue: angleValue,
      layout: { minWidth: 50, alignment: 'right' },
      presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
      status: { isValid: true, isFallback: false }
    };
  }, []);

  // Wind display data using presentation system
  const windDisplayData = useMemo(() => {
    return {
      windSpeed: getWindDisplay(windSpeed, 'AWS'),
      trueWindSpeed: getWindDisplay(trueWind.speed, 'TWS'),
      windAngle: getAngleDisplay(windAngle, 'AWA'),
      trueWindAngle: getAngleDisplay(trueWind.angle, 'TWA'),
      apparentGust: getWindDisplay(gustCalculations.apparentGust, 'MAX'),
      trueGust: getWindDisplay(gustCalculations.trueGust, 'MAX'),
      apparentVariation: getAngleDisplay(gustCalculations.apparentVariation, 'VAR'),
      trueVariation: getAngleDisplay(gustCalculations.trueVariation, 'VAR')
    };
  }, [getWindDisplay, getAngleDisplay, windSpeed, windAngle, trueWind, gustCalculations]);

  // Update true wind history
  useEffect(() => {
    if (trueWind.speed !== null && trueWind.angle !== null) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      
      setWindHistory(prev => {
        // Check if the last entry is the same values to avoid duplicates
        const lastEntry = prev.true[prev.true.length - 1];
        if (lastEntry && 
            Math.abs(lastEntry.speed - trueWind.speed!) < 0.01 && 
            Math.abs(lastEntry.angle - trueWind.angle!) < 0.1 && 
            (now - lastEntry.timestamp) < 1000) {
          return prev; // Skip if same values within 1 second
        }
        
        return {
          ...prev,
          true: [...prev.true, { speed: trueWind.speed!, angle: trueWind.angle!, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300)
        };
      });
    }
  }, [trueWind.speed, trueWind.angle]); // Use specific values instead of whole object

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    toggleWidgetExpansion(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetExpansion, updateWidgetInteraction]);

  const handleLongPressOnCaret = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Data staleness detection (>5s = stale)
  const isStale = windTimestamp ? (Date.now() - windTimestamp) > 5000 : true;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`wind-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>
          {title.toUpperCase()}
        </Text>
        
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

      {/* PRIMARY GRID (2×2): Apparent Wind vs True Wind */}
      <View style={styles.primaryContainer}>
        {/* First Row: AWS and TWS */}
        <View style={styles.primaryGrid}>
          <View style={styles.gridCell}>
            <PrimaryMetricCell
              data={windDisplayData.windSpeed}
              state={isStale ? 'warning' : 'normal'}
            />
          </View>
          <View style={styles.gridCell}>
            <PrimaryMetricCell
              data={windDisplayData.trueWindSpeed}
              state={isStale ? 'warning' : 'normal'}
            />
          </View>
        </View>
        {/* Second Row: AWA and TWA */}
        <View style={styles.primaryGrid}>
          <View style={styles.gridCell}>
            <PrimaryMetricCell
              data={windDisplayData.windAngle}
              state={isStale ? 'warning' : 'normal'}
            />
          </View>
          <View style={styles.gridCell}>
            <PrimaryMetricCell
              data={windDisplayData.trueWindAngle}
              state={isStale ? 'warning' : 'normal'}
            />
          </View>
        </View>
      </View>

      {/* SECONDARY GRID (2×2): Wind Gusts and Variations */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          {/* First Row: AWS Gust and TWS Gust */}
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={windDisplayData.apparentGust}
                state="normal"
                compact={true}
              />
            </View>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={windDisplayData.trueGust}
                state="normal"
                compact={true}
              />
            </View>
          </View>
          {/* Second Row: AWA Var and TWA Var */}
          <View style={styles.secondaryGrid}>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={windDisplayData.apparentVariation}
                state="normal"
                compact={true}
              />
            </View>
            <View style={styles.gridCell}>
              <SecondaryMetricCell
                data={windDisplayData.trueVariation}
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

WindWidget.displayName = 'WindWidget';

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  // Primary Container for 2x2 wind grid
  primaryContainer: {
    marginBottom: 8,
  },
  // Primary Grid (2×2): Apparent vs True Wind
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
    borderTopColor: '#E5E7EB',
  },
  // Secondary Grid (2×2): Gust and Variation data
  secondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emptyCell: {
    flex: 1,
  },
  // Grid cell wrapper for proper alignment within grid
  gridCell: {
    flex: 1,
    alignItems: 'flex-end', // Right-align the metric cell within its grid space
  },
});

export default WindWidget;