import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Polygon, G } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

type WindUnit = 'knots' | 'mph' | 'kmh' | 'ms';

interface WindReading {
  timestamp: number;
  speed: number;
  angle: number;
}

export const WindWidget: React.FC = () => {
  const windAngle = useNmeaStore((state: any) => state.nmeaData.windAngle);
  const windSpeed = useNmeaStore((state: any) => state.nmeaData.windSpeed);
  const heading = useNmeaStore((state: any) => state.nmeaData.heading);
  const theme = useTheme();
  const [unit, setUnit] = useState<WindUnit>('knots');
  const [windHistory, setWindHistory] = useState<WindReading[]>([]);

  // Track 10-minute wind history
  useEffect(() => {
    if (windSpeed !== undefined && windAngle !== undefined) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      
      setWindHistory(prev => {
        const newHistory = [...prev, { timestamp: now, speed: windSpeed, angle: windAngle }];
        return newHistory.filter(reading => reading.timestamp > tenMinutesAgo);
      });
    }
  }, [windSpeed, windAngle]);

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

  const getRelativeWindAngle = (): number | undefined => {
    if (windAngle === undefined || heading === undefined) return windAngle;
    // Calculate wind relative to boat heading
    let relative = windAngle - heading;
    if (relative < 0) relative += 360;
    if (relative > 360) relative -= 360;
    return relative;
  };

  const getState = () => {
    if (windSpeed === undefined || windAngle === undefined) return 'no-data';
    if (windSpeed > 25) return 'alarm'; // Strong wind warning
    if (windSpeed > 20) return 'highlighted'; // Caution
    return 'normal';
  };

  const { value, unitStr } = convertWindSpeed(windSpeed);
  const relativeAngle = getRelativeWindAngle();
  const windInfo = windSpeed !== undefined ? getWindStrength(windSpeed) : { level: '', color: theme.textSecondary };
  const state = getState();

  const cycleUnit = () => {
    const units: WindUnit[] = ['knots', 'mph', 'kmh', 'ms'];
    const currentIndex = units.indexOf(unit);
    setUnit(units[(currentIndex + 1) % units.length]);
  };

  const averageWindSpeed = windHistory.length > 0 
    ? windHistory.reduce((sum, reading) => sum + reading.speed, 0) / windHistory.length
    : windSpeed;

  return (
    <TouchableOpacity onPress={cycleUnit}>
      <WidgetCard
        title="WIND"
        icon="leaf"
        value={value}
        unit={unitStr}
        state={state}
        secondary={windInfo.level}
      >
        <View style={styles.windRoseContainer}>
          {relativeAngle !== undefined && windSpeed !== undefined && (
            <WindRose 
              angle={relativeAngle} 
              speed={windSpeed} 
              theme={theme} 
            />
          )}
        </View>
        {averageWindSpeed !== undefined && windSpeed !== undefined && (
          <Text style={[styles.averageText, { color: theme.textSecondary }]}>
            Avg: {averageWindSpeed.toFixed(1)} kn
          </Text>
        )}
      </WidgetCard>
    </TouchableOpacity>
  );
};

interface WindRoseProps {
  angle: number;
  speed: number;
  theme: any;
}

const WindRose: React.FC<WindRoseProps> = ({ angle, speed, theme }) => {
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
};

const styles = StyleSheet.create({
  windRoseContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  averageText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
