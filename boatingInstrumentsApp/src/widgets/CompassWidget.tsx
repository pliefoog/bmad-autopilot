import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface CompassWidgetProps {
  id: string;
  title: string;
}

type CompassMode = 'TRUE' | 'MAGNETIC';

/**
 * Compass Widget - Interactive per ui-architecture.md v2.3
 * Primary Grid (1×1): SVG compass rose with digital heading + Mode Toggle (TRUE ↔ MAGNETIC)
 * Secondary Grid (1×2): Variation and Deviation (if available)
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Heading data
  const heading = useNmeaStore(useCallback((state: any) => state.nmeaData.heading, [])); // True heading
  const magneticHeading = useNmeaStore(useCallback((state: any) => state.nmeaData.magneticHeading, [])); // Magnetic heading
  const variation = useNmeaStore(useCallback((state: any) => state.nmeaData.magneticVariation, [])); // Magnetic variation
  const deviation = useNmeaStore(useCallback((state: any) => state.nmeaData.magneticDeviation, [])); // Magnetic deviation (rarely available)
  const headingTimestamp = useNmeaStore(useCallback((state: any) => state.nmeaData.headingTimestamp, []));
  
  // Epic 9 Enhanced Presentation System for compass angles
  const anglePresentation = useDataPresentation('angle');

  // Compass angle display data using Epic 9 presentation system
  const getAngleDisplay = useCallback((
    presentation: any,
    value: number | null | undefined,
    angleMnemonic: string,
    fallbackSymbol: string = '°',
    fallbackName: string = 'Degrees'
  ): MetricDisplayData => {
    const presDetails = presentation.presentation;
    
    if (value === null || value === undefined) {
      return {
        mnemonic: angleMnemonic, // NMEA source abbreviation like "VAR", "DEV"
        value: '---',
        unit: fallbackSymbol, // Presentation symbol
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: presDetails?.id || 'default',
          name: fallbackName,
          pattern: 'xxx'
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true
        }
      };
    }

    if (!presentation.isValid || !presDetails) {
      return {
        mnemonic: angleMnemonic, // NMEA source abbreviation
        value: value.toFixed(1),
        unit: fallbackSymbol, // Presentation symbol
        rawValue: value,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'fallback',
          name: fallbackName,
          pattern: 'xxx.x'
        },
        status: {
          isValid: true,
          isFallback: true
        }
      };
    }
    
    return {
      mnemonic: angleMnemonic, // NMEA source abbreviation like "VAR", "DEV"
      value: presentation.convertAndFormat(value),
      unit: presDetails.symbol, // Presentation symbol like "°"
      rawValue: value,
      layout: {
        minWidth: 60,
        alignment: 'right'
      },
      presentation: {
        id: presDetails.id,
        name: presDetails.name,
        pattern: 'xxx.x'
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, []);

  const variationDisplay = useMemo(() =>
    getAngleDisplay(anglePresentation, variation, 'VAR', '°', 'Degrees VAR'),
    [anglePresentation, variation, getAngleDisplay]
  );

  const deviationDisplay = useMemo(() =>
    getAngleDisplay(anglePresentation, deviation, 'DEV', '°', 'Degrees DEV'),
    [anglePresentation, deviation, getAngleDisplay]
  );
  
  // Compass mode state with toggle capability
  const [compassMode, setCompassMode] = useState<CompassMode>('TRUE'); // Default to TRUE per marine standards

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    toggleWidgetExpansion(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetExpansion, updateWidgetInteraction]);

  const handleLongPressOnCaret = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Mode toggle handler (tap compass to switch TRUE ↔ MAGNETIC)
  const handleModeToggle = useCallback(() => {
    setCompassMode(prev => prev === 'TRUE' ? 'MAGNETIC' : 'TRUE');
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  // Current heading based on selected mode
  const currentHeading = useMemo(() => {
    switch (compassMode) {
      case 'TRUE':
        return heading;
      case 'MAGNETIC':
        return magneticHeading || (heading && variation ? heading - variation : null);
      default:
        return heading;
    }
  }, [heading, magneticHeading, variation, compassMode]);

  // Data staleness detection (>5s = stale)
  const isStale = headingTimestamp ? (Date.now() - headingTimestamp) > 5000 : true;

  // Heading display formatting
  const headingDisplay = useMemo(() => {
    if (currentHeading === undefined || currentHeading === null) {
      return '---°';
    }
    return `${Math.round(currentHeading).toString().padStart(3, '0')}°`;
  }, [currentHeading]);

  // Cardinal direction
  const cardinalDirection = useMemo(() => {
    if (currentHeading === undefined || currentHeading === null) return '';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(currentHeading / 22.5) % 16;
    return directions[index];
  }, [currentHeading]);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`compass-widget-${id}`}
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

      {/* PRIMARY GRID (1×1): SVG compass rose with digital heading */}
      <TouchableOpacity onPress={handleModeToggle} style={styles.compassContainer}>
        <View style={styles.compassHeader}>
          <Text style={[styles.modeIndicator, { 
            color: compassMode === 'TRUE' ? theme.primary : theme.warning 
          }]}>
            {compassMode}
          </Text>
          <Text style={[styles.cardinalText, { color: theme.textSecondary }]}>
            {cardinalDirection}
          </Text>
        </View>
        
        {/* SVG Compass Rose */}
        <View style={styles.compassRose}>
          <CompassRose 
            heading={currentHeading || 0} 
            theme={theme} 
            isStale={isStale}
          />
        </View>
        
        {/* Digital Heading Display */}
        <Text style={[styles.headingText, { 
          color: isStale ? theme.textSecondary : theme.text 
        }]}>
          {headingDisplay}
        </Text>
      </TouchableOpacity>

      {/* SECONDARY GRID (1×2): Variation and Deviation */}
      {expanded && (
        <View style={styles.secondaryContainer}>
          <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
              data={variationDisplay}
              state="normal"
              compact={true}
            />
          </View>
          <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
              data={deviationDisplay}
              state="normal"
              compact={true}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

// SVG Compass Rose Component
interface CompassRoseProps {
  heading: number;
  theme: any;
  isStale: boolean;
}

const CompassRose: React.FC<CompassRoseProps> = React.memo(({ heading, theme, isStale }) => {
  const size = 120;
  const center = size / 2;
  const radius = 45;
  
  // Compass rose color based on state
  const strokeColor = isStale ? theme.textSecondary : theme.primary;
  const fillColor = isStale ? theme.textSecondary : theme.text;
  
  // Calculate rotation (north up, heading rotates clockwise)
  const rotation = -heading; // Negative because we want the rose to rotate opposite to heading
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G transform={`rotate(${rotation}, ${center}, ${center})`}>
        {/* Outer circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
        />
        
        {/* Cardinal direction markers */}
        {[0, 90, 180, 270].map((angle, index) => {
          const radian = (angle * Math.PI) / 180;
          const x1 = center + (radius - 10) * Math.sin(radian);
          const y1 = center - (radius - 10) * Math.cos(radian);
          const x2 = center + radius * Math.sin(radian);
          const y2 = center - radius * Math.cos(radian);
          
          return (
            <Line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Intercardinal direction markers */}
        {[45, 135, 225, 315].map((angle) => {
          const radian = (angle * Math.PI) / 180;
          const x1 = center + (radius - 5) * Math.sin(radian);
          const y1 = center - (radius - 5) * Math.cos(radian);
          const x2 = center + radius * Math.sin(radian);
          const y2 = center - radius * Math.cos(radian);
          
          return (
            <Line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* North pointer (triangle) */}
        <G>
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center}
            y2={center - 8}
            stroke={fillColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Arrow head */}
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center - 5}
            y2={center - radius + 25}
            stroke={fillColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center + 5}
            y2={center - radius + 25}
            stroke={fillColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>
        
        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r="3"
          fill={fillColor}
        />
      </G>
    </Svg>
  );
});

CompassWidget.displayName = 'CompassWidget';

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
  // Primary Grid: Compass rose display (1×1)
  compassContainer: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 180,
  },
  compassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  modeIndicator: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardinalText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  compassRose: {
    marginVertical: 8,
  },
  headingText: {
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  // Secondary Container for expanded view
  secondaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // Secondary Grid (1×2): Variation and Deviation
  secondaryGrid: {
    marginBottom: 8,
  },
});

export default CompassWidget;