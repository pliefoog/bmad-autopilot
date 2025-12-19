import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface WindWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Wind Widget - Apparent/True Wind Focus per ui-architecture.md v2.3
 * Primary Grid (2×2): AWA, AWS, Gust (apparent wind)
 * Secondary Grid (2×2): TWA, TWS, True Gust (calculated true wind)
 */
export const WindWidget: React.FC<WindWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  
  // Widget state management per ui-architecture.md v2.3
  
  // NOTE: History now tracked automatically in sensor data - no subscription needed
  
  // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
  const windSensorData = useNmeaStore((state) => state.nmeaData.sensors.wind?.[0], (a, b) => a === b);
  const windAngle = windSensorData?.angle; // AWA
  const windSpeed = windSensorData?.speed; // AWS
  const windTimestamp = windSensorData?.timestamp;
  const heading = useNmeaStore((state) => state.nmeaData.sensors.compass?.[0]?.heading, (a, b) => a === b); // For true wind
  const sog = useNmeaStore((state) => state.nmeaData.sensors.speed?.[0]?.overGround, (a, b) => a === b); // For true wind
  
  // Wind history for gust calculations
  const [windHistory, setWindHistory] = useState<{
    apparent: { speed: number; angle: number; timestamp: number }[];
    true: { speed: number; angle: number; timestamp: number }[];
  }>({ apparent: [], true: [] });
  
  // NOTE: Wind speed history now auto-managed in sensor data - access via getSensorHistory when needed

  // Track wind history for gust calculations (local state for multi-dimensional data)
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

  // NEW: Use cached display info from sensor.display (Phase 3 migration)
  // Helper function to create MetricDisplayData from sensor display or manual value
  const getWindDisplay = useCallback((windValue: number | null | undefined, displayInfo: any, label: string = 'Wind'): MetricDisplayData => ({
    mnemonic: label,
    value: displayInfo?.value ?? (windValue !== null && windValue !== undefined ? windValue.toFixed(1) : '---'),
    unit: displayInfo?.unit ?? 'kt',
    rawValue: windValue ?? 0,
    layout: { minWidth: 60, alignment: 'right' },
    presentation: { id: 'wind', name: 'Wind', pattern: 'xxx.x' },
    status: { isValid: windValue !== null && windValue !== undefined, isFallback: false }
  }), []);
  
  // Enhanced angle display function with AWA port/starboard indication
  const getAngleDisplay = useCallback((angleValue: number | null | undefined, label: string = 'Angle'): MetricDisplayData => {
    if (angleValue === undefined || angleValue === null) {
      return {
        mnemonic: label,
        value: '---',
        unit: '°',
        rawValue: 0,
        layout: { minWidth: 70, alignment: 'right' },
        presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
        status: { isValid: false, error: 'No data', isFallback: true }
      };
    }
    
    // Special formatting for Apparent Wind Angle (AWA)
    if (label === 'AWA') {
      const absAngle = Math.abs(angleValue);
      const side = angleValue >= 0 ? 'STB' : 'PRT';
      
      return {
        mnemonic: label,
        value: absAngle.toFixed(0),
        unit: `° ${side}`,
        rawValue: angleValue,
        layout: { minWidth: 70, alignment: 'right' },
        presentation: { id: 'awa_deg', name: 'AWA with Port/Starboard', pattern: 'xxx° SSS' },
        status: { 
          isValid: true, 
          isFallback: false
        }
      };
    }
    
    return {
      mnemonic: label, // NMEA source abbreviation like "TWA"
      value: Math.round(angleValue).toString(),
      unit: '°', // Presentation symbol for degrees
      rawValue: angleValue,
      layout: { minWidth: 70, alignment: 'right' },
      presentation: { id: 'deg_0', name: 'Degrees (integer)', pattern: 'xxx' },
      status: { isValid: true, isFallback: false }
    };
  }, []);

  // Wind display data using sensor.display cache
  const windDisplayData = useMemo(() => {
    return {
      windSpeed: getWindDisplay(windSpeed, windSensorData?.display?.speed, 'AWS'),
      trueWindSpeed: getWindDisplay(trueWind.speed, windSensorData?.display?.trueSpeed, 'TWS'),
      windAngle: getAngleDisplay(windAngle, 'AWA'),
      trueWindAngle: getAngleDisplay(trueWind.angle, 'TWA'),
      apparentGust: getWindDisplay(gustCalculations.apparentGust, null, 'MAX'),
      trueGust: getWindDisplay(gustCalculations.trueGust, null, 'MAX'),
      apparentVariation: getAngleDisplay(gustCalculations.apparentVariation, 'VAR'),
      trueVariation: getAngleDisplay(gustCalculations.trueVariation, 'VAR')
    };
  }, [getWindDisplay, getAngleDisplay, windSpeed, windAngle, trueWind, gustCalculations, windSensorData]);

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

  const handleLongPressOnPin = useCallback(() => {
  }, [id]);

  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

  // Data staleness detection (>5s = stale)
  const isStale = windTimestamp ? (Date.now() - windTimestamp) > 5000 : true;

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
          name={WidgetMetadataRegistry.getMetadata('wind')?.icon || 'navigate-outline'} 
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
      columns={2}
      primaryRows={2}
      secondaryRows={2}
      testID={`wind-widget-${id}`}
    >
        {/* Row 1: AWS | TWS */}
        <PrimaryMetricCell
          data={windDisplayData.windSpeed}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={windDisplayData.trueWindSpeed}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: AWA | TWA */}
        <PrimaryMetricCell
          data={windDisplayData.windAngle}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={windDisplayData.trueWindAngle}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Apparent Gust | True Gust */}
        <SecondaryMetricCell
          data={windDisplayData.apparentGust}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={windDisplayData.trueGust}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 4: Apparent Variation | True Variation */}
        <SecondaryMetricCell
          data={windDisplayData.apparentVariation}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={windDisplayData.trueVariation}
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

WindWidget.displayName = 'WindWidget';

export default WindWidget;