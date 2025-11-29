import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface CompassWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

type CompassMode = 'TRUE' | 'MAGNETIC';

/**
 * Compass Widget - Interactive per ui-architecture.md v2.3
 * Primary Grid (2×1): True Heading + Magnetic Heading
 * Secondary Grid (2×1): Variation and Deviation (if available)
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - NMEA Store v2.0 sensor-based interface
  // NMEA data selectors - direct subscription without useCallback
  const compassData = useNmeaStore((state) => state.nmeaData.sensors.compass?.[0]); // Compass sensor data
  
  // Extract heading values from sensor data
  const heading = compassData?.heading; // True/magnetic heading
  const magneticHeading = compassData?.magneticHeading; // Magnetic heading (if available separately)
  const compassTimestamp = compassData?.timestamp;
  const variation = compassData?.magneticVariation; // Magnetic variation from sensor data
  const deviation = compassData?.magneticDeviation; // Magnetic deviation from sensor data
  const headingTimestamp = compassData?.timestamp; // Use sensor timestamp
  
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
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

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
          name={WidgetMetadataRegistry.getMetadata('compass')?.icon || 'compass-outline'} 
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
      testID={`compass-widget-${id}`}
    >
        {/* Row 1: True Heading */}
        <PrimaryMetricCell
          mnemonic="TRUE"
          value={heading !== null && heading !== undefined ? Math.round(heading).toString().padStart(3, '0') : '---'}
          unit="°"
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: Magnetic Heading */}
        <PrimaryMetricCell
          mnemonic="MAG"
          value={magneticHeading !== null && magneticHeading !== undefined ? Math.round(magneticHeading).toString().padStart(3, '0') : (heading && variation ? Math.round(heading - variation).toString().padStart(3, '0') : '---')}
          unit="°"
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Variation */}
        <SecondaryMetricCell
          data={variationDisplay}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 4: Deviation */}
        <SecondaryMetricCell
          data={deviationDisplay}
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

export default CompassWidget;