import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Polygon, G } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';
import { useCachedMarineCalculation, useThrottledCallback } from '../utils/performanceOptimization';

type WindUnit = 'knots' | 'mph' | 'kmh' | 'ms';

interface WindReading {
  timestamp: number;
  speed: number;
  angle: number;
}

export const WindWidget: React.FC = React.memo(() => {
  // Optimized store selectors
  const windAngle = useNmeaStore(useCallback((state: any) => state.nmeaData.windAngle, []));
  const windSpeed = useNmeaStore(useCallback((state: any) => state.nmeaData.windSpeed, []));
  const heading = useNmeaStore(useCallback((state: any) => state.nmeaData.heading, []));
  const theme = useTheme();
  const [unit, setUnit] = useState<WindUnit>('knots');
  const [windHistory, setWindHistory] = useState<WindReading[]>([]);

  // Throttled wind history update to avoid excessive state updates
  const throttledHistoryUpdate = useThrottledCallback(() => {
    if (windSpeed !== undefined && windAngle !== undefined) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      
      setWindHistory(prev => {
        const newHistory = [...prev, { timestamp: now, speed: windSpeed, angle: windAngle }];
        return newHistory.filter(reading => reading.timestamp > tenMinutesAgo);
      });
    }
  }, 1000); // Update at most once per second

  // Track 10-minute wind history with throttling
  useEffect(() => {
    throttledHistoryUpdate();
  }, [windSpeed, windAngle, throttledHistoryUpdate]);

  // Memoized wind speed conversion
  const convertedWindSpeed = useMemo(() => {
    const convertWindSpeed = (speedKnots: number | undefined): { value: string; unitStr: string } => {
      if (speedKnots === undefined || speedKnots === null) return { value: '--', unitStr: 'kn' };
      
      switch (unit) {
        case 'mph':
          return { value: (speedKnots * 1.15078).toFixed(1), unitStr: 'mph' };
        case 'kmh':
          return { value: (speedKnots * 1.852).toFixed(1), unitStr: 'km/h' };
        case 'ms':
          return { value: (speedKnots * 0.514444).toFixed(1), unitStr: 'm/s' };
        default:
          return { value: speedKnots.toFixed(1), unitStr: 'kn' };
      }
    };
    
    return convertWindSpeed(windSpeed);
  }, [windSpeed, unit]);

  // Memoized wind strength calculation
  const windStrength = useMemo(() => {
    const getWindStrength = (speed: number): { level: string; color: string } => {
      if (speed < 1) return { level: 'Calm', color: theme.textSecondary };
      if (speed < 4) return { level: 'Light Air', color: theme.success };
      if (speed < 7) return { level: 'Light Breeze', color: theme.success };
      if (speed < 11) return { level: 'Gentle Breeze', color: theme.primary };
      if (speed < 16) return { level: 'Moderate Breeze', color: theme.primary };
      if (speed < 22) return { level: 'Fresh Breeze', color: theme.warning };
      if (speed < 28) return { level: 'Strong Breeze', color: theme.warning };
      if (speed < 34) return { level: 'Near Gale', color: theme.error };
      return { level: 'Gale+', color: theme.error };
    };
    
    return windSpeed !== undefined ? getWindStrength(windSpeed) : { level: '', color: theme.textSecondary };
  }, [windSpeed, theme]);

  // Memoized relative wind angle calculation
  const relativeAngle = useMemo(() => {
    if (windAngle === undefined || heading === undefined) return windAngle;
    // Calculate wind relative to boat heading
    let relative = windAngle - heading;
    if (relative < 0) relative += 360;
    if (relative > 360) relative -= 360;
    return relative;
  }, [windAngle, heading]);

  // Memoized widget state
  const state = useMemo(() => {
    if (windSpeed === undefined || windAngle === undefined) return 'no-data';
    if (windSpeed > 25) return 'alarm'; // Strong wind warning
    if (windSpeed > 20) return 'highlighted'; // Caution
    return 'normal';
  }, [windSpeed, windAngle]);

  const { value, unitStr } = convertedWindSpeed;

  const cycleUnit = useCallback(() => {
    const units: WindUnit[] = ['knots', 'mph', 'kmh', 'ms'];
    const currentIndex = units.indexOf(unit);
    setUnit(units[(currentIndex + 1) % units.length]);
  }, [unit]);

  const averageWindSpeed = windHistory.length > 0 
    ? windHistory.reduce((sum, reading) => sum + reading.speed, 0) / windHistory.length
    : windSpeed;

  // Story 4.4 AC6-10: Build comprehensive accessibility label for wind data
  const windAccessibilityLabel = useMemo(() => {
    if (windSpeed === undefined || windAngle === undefined) {
      return 'Wind: No data available';
    }
    
    const parts: string[] = ['Wind'];
    parts.push(`speed ${value} ${unitStr}`);
    
    if (relativeAngle !== undefined) {
      // Convert angle to cardinal direction for screen reader
      const getCardinalDirection = (angle: number): string => {
        if (angle < 22.5 || angle >= 337.5) return 'from ahead';
        if (angle < 67.5) return 'from starboard bow';
        if (angle < 112.5) return 'from starboard beam';
        if (angle < 157.5) return 'from starboard quarter';
        if (angle < 202.5) return 'from astern';
        if (angle < 247.5) return 'from port quarter';
        if (angle < 292.5) return 'from port beam';
        return 'from port bow';
      };
      parts.push(`direction ${Math.round(relativeAngle)} degrees, ${getCardinalDirection(relativeAngle)}`);
    }
    
    // Add wind strength description
    parts.push(windStrength.level);
    
    // Add average if available
    if (averageWindSpeed !== undefined && windHistory.length > 0) {
      parts.push(`10-minute average ${averageWindSpeed.toFixed(1)} knots`);
    }
    
    // Add warning states
    if (state === 'alarm') {
      parts.push('HIGH WIND WARNING');
    } else if (state === 'highlighted') {
      parts.push('Strong wind caution');
    }
    
    return parts.join(', ');
  }, [windSpeed, windAngle, value, unitStr, relativeAngle, windStrength, averageWindSpeed, windHistory, state]);

  const windAccessibilityHint = useMemo(() => {
    if (state === 'alarm') {
      return 'High wind conditions - take precautions';
    } else if (state === 'highlighted') {
      return 'Strong wind - monitor conditions';
    }
    return 'Tap to change wind speed units';
  }, [state]);

  return (
    <TouchableOpacity 
      onPress={cycleUnit}
      accessible={true}
      accessibilityLabel={windAccessibilityLabel}
      accessibilityHint={windAccessibilityHint}
      accessibilityRole="button"
    >
      <WidgetCard
        title="WIND"
        icon="leaf"
        state={state}
        accessibilityLabel={windAccessibilityLabel}
        accessibilityHint={windAccessibilityHint}
        accessibilityRole="text"
        accessibilityValue={windSpeed !== undefined ? {
          text: `${value} ${unitStr}`,
          now: windSpeed,
          min: 0,
          max: 50,
        } : undefined}
      >
        {/* PrimaryMetricCell Grid - 2x1 layout */}
        <View style={styles.metricGrid}>
          <PrimaryMetricCell
            mnemonic="SPD"
            value={value}
            unit={unitStr}
            state={state === 'no-data' ? 'normal' : state === 'alarm' ? 'alarm' : 'normal'}
            style={styles.metricCell}
          />
          <PrimaryMetricCell
            mnemonic="DIR"
            value={relativeAngle !== undefined ? Math.round(relativeAngle) : '---'}
            unit="°"
            state={relativeAngle === undefined ? 'normal' : 'normal'}
            style={styles.metricCell}
          />
        </View>

        {/* Wind Classification */}
        <Text style={[styles.windLevel, { color: windStrength.color }]}>
          {windStrength.level}
        </Text>

        {/* Wind Rose Visualization */}
        <View style={styles.windRoseContainer}>
          {relativeAngle !== undefined && windSpeed !== undefined && (
            <WindRose 
              angle={relativeAngle} 
              speed={windSpeed} 
              theme={theme} 
            />
          )}
        </View>

        {/* Average Wind Speed */}
        {averageWindSpeed !== undefined && windSpeed !== undefined && (
          <Text style={[styles.averageText, { color: theme.textSecondary }]}>
            Avg: {averageWindSpeed.toFixed(1)} kn
          </Text>
        )}
      </WidgetCard>
    </TouchableOpacity>
  );
});

interface WindRoseProps {
  angle: number;
  speed: number;
  theme: any;
}

const WindRose: React.FC<WindRoseProps> = React.memo(({ angle, speed, theme }) => {
  const windRoseCalculations = useMemo(() => {
    const size = 60;
    const center = size / 2;
    const radius = 22;
    
    // Convert angle to radians (0° = north, clockwise)
    const angleRad = (angle - 90) * Math.PI / 180;
    
    // Wind arrow end point
    const endX = center + radius * Math.cos(angleRad);
    const endY = center + radius * Math.sin(angleRad);
    
    // Arrow head points
    const arrowLength = 8;
    const arrowAngle = Math.PI / 6;
    const leftX = endX - arrowLength * Math.cos(angleRad - arrowAngle);
    const leftY = endY - arrowLength * Math.sin(angleRad - arrowAngle);
    const rightX = endX - arrowLength * Math.cos(angleRad + arrowAngle);
    const rightY = endY - arrowLength * Math.sin(angleRad + arrowAngle);

    const speedColor = speed > 25 ? theme.error : 
                      speed > 20 ? theme.warning : 
                      speed > 10 ? theme.primary : theme.success;
    
    return {
      size, center, radius, endX, endY, leftX, leftY, rightX, rightY, speedColor
    };
  }, [angle, speed, theme]);

  const { size, center, radius, endX, endY, leftX, leftY, rightX, rightY, speedColor } = windRoseCalculations;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Wind rose circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={theme.border}
        strokeWidth="1"
      />
      
      {/* Cardinal directions */}
      <Line x1={center} y1={center-radius} x2={center} y2={center-radius+5} stroke={theme.border} strokeWidth="1" />
      <Line x1={center+radius} y1={center} x2={center+radius-5} y2={center} stroke={theme.border} strokeWidth="1" />
      <Line x1={center} y1={center+radius} x2={center} y2={center+radius-5} stroke={theme.border} strokeWidth="1" />
      <Line x1={center-radius} y1={center} x2={center-radius+5} y2={center} stroke={theme.border} strokeWidth="1" />
      
      {/* Wind direction arrow */}
      <Line
        x1={center}
        y1={center}
        x2={endX}
        y2={endY}
        stroke={speedColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Arrow head */}
      <Polygon
        points={`${endX},${endY} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={speedColor}
      />
    </Svg>
  );
});

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  metricCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  windLevel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 4,
  },
  windRoseContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  averageText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
