import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, G, Text as SvgText, Line, Polyline } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';
import { withMarineOptimization, useCachedMarineCalculation } from '../utils/performanceOptimization';

// Speed history for 5-minute trending
interface SpeedHistory {
  timestamp: number;
  speed: number;
}

export const SpeedWidget: React.FC = React.memo(() => {
  const theme = useTheme();
  
  // Optimized store selectors
  const cog = useNmeaStore(useCallback((state: any) => state.nmeaData.cog, []));
  const sog = useNmeaStore(useCallback((state: any) => state.nmeaData.sog, []));
  const [speedHistory, setSpeedHistory] = useState<SpeedHistory[]>([]);
  
  // Track speed history (keep last 5 minutes)
  useEffect(() => {
    if (sog !== undefined && sog !== null) {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      setSpeedHistory(prev => {
        const updated = [...prev, { timestamp: now, speed: sog }];
        // Keep only last 5 minutes of data
        return updated.filter(entry => entry.timestamp > fiveMinutesAgo);
      });
    }
  }, [sog]);
  
  // Memoized calculations
  const displayValues = useMemo(() => {
    const displaySpeed = sog !== undefined && sog !== null
      ? sog.toFixed(1)
      : '--';
    
    const displayCOG = cog !== undefined && cog !== null
      ? `${Math.round(cog)}°`
      : '--';
    
    const state: 'normal' | 'no-data' | 'alarm' | 'highlighted' = (sog === undefined || sog === null) ? 'no-data' : 'normal';
    
    return { displaySpeed, displayCOG, state };
  }, [sog, cog]);
  
  // Cached speed trend calculation
  const speedTrend = useCachedMarineCalculation(
    'speed-trend',
    () => calculateSpeedTrend(speedHistory),
    [speedHistory]
  );
  
  const { displaySpeed, displayCOG, state } = displayValues;

  // Story 4.4 AC6-10: Build comprehensive accessibility label
  const speedAccessibilityLabel = useMemo(() => {
    if (sog === undefined || sog === null) {
      return 'Speed: No data available';
    }
    
    const parts: string[] = ['Speed'];
    parts.push(`${displaySpeed} knots`);
    
    if (cog !== undefined && cog !== null) {
      parts.push(`Course over ground ${Math.round(cog)} degrees`);
    }
    
    // Add trend information
    if (speedTrend > 0.5) {
      parts.push('speed increasing');
    } else if (speedTrend < -0.5) {
      parts.push('speed decreasing');
    } else if (speedHistory.length > 1) {
      parts.push('speed steady');
    }
    
    return parts.join(', ');
  }, [sog, displaySpeed, cog, speedTrend, speedHistory]);

  const speedAccessibilityHint = useMemo(() => {
    if (state === 'no-data') {
      return 'Waiting for GPS speed data';
    }
    return 'Shows vessel speed over ground and course';
  }, [state]);
  
  return (
    <WidgetCard
      title="SPEED"
      icon="speedometer"
      state={state}
      accessibilityLabel={speedAccessibilityLabel}
      accessibilityHint={speedAccessibilityHint}
      accessibilityRole="text"
      accessibilityValue={sog !== undefined && sog !== null ? {
        text: `${displaySpeed} knots`,
        now: sog,
        min: 0,
        max: 50,
      } : undefined}
    >
      {/* PrimaryMetricCell Grid - 2x1 layout */}
      <View style={styles.metricGrid}>
        <PrimaryMetricCell
          mnemonic="SOG"
          value={displaySpeed}
          unit="kn"
          state={state === 'no-data' ? 'normal' : 'normal'}
          style={styles.metricCell}
        />
        <PrimaryMetricCell
          mnemonic="COG"
          value={cog !== undefined && cog !== null ? Math.round(cog) : '---'}
          unit="°"
          state={cog === undefined || cog === null ? 'normal' : 'normal'}
          style={styles.metricCell}
        />
      </View>

      {/* Extended Details (Course Indicator and Trend) */}
      {sog !== undefined && sog !== null && (
        <View 
          style={styles.detailsContainer}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Speed over ground: ${displaySpeed} knots, Course over ground: ${displayCOG}`}
        >
          {cog !== undefined && cog !== null && (
            <View style={styles.cogIndicator}>
              <CourseIndicator course={cog} theme={theme} />
            </View>
          )}
          {speedHistory.length > 1 && (
            <View style={styles.trendContainer}>
              <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>5-Min Trend</Text>
              <SpeedTrendChart history={speedHistory} theme={theme} />
              <Text style={[styles.trendValue, { color: theme.success }]}>
                {`${speedTrend > 0 ? '↑' : speedTrend < 0 ? '↓' : '→'} ${Math.abs(speedTrend).toFixed(1)} kn`}
              </Text>
            </View>
          )}
        </View>
      )}
    </WidgetCard>
  );
});

// Calculate speed trend (change over last 5 minutes)
const calculateSpeedTrend = (history: SpeedHistory[]): number => {
  if (history.length < 2) return 0;
  
  const recent = history[history.length - 1].speed;
  const old = history[0].speed;
  return recent - old;
};

// Course indicator - simple arrow pointing in COG direction
interface CourseIndicatorProps {
  course: number;
  theme: any;
}

const CourseIndicator: React.FC<CourseIndicatorProps> = React.memo(({ course, theme }) => {
  const size = 40;
  const center = size / 2;
  const length = 15;
  
  // Memoized angle calculation
  const angleCalculations = useMemo(() => {
    // Convert course to radians
    const angle = (course - 90) * (Math.PI / 180); // -90 to make 0° point up
    
    const x2 = center + length * Math.cos(angle);
    const y2 = center + length * Math.sin(angle);
    
    return {
      angle,
      x2,
      y2,
      arrowX1: x2 - 5 * Math.cos(angle - 0.5),
      arrowY1: y2 - 5 * Math.sin(angle - 0.5),
      arrowX2: x2 - 5 * Math.cos(angle + 0.5),
      arrowY2: y2 - 5 * Math.sin(angle + 0.5),
    };
  }, [course, center, length]);
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line
        x1={center}
        y1={center}
        x2={angleCalculations.x2}
        y2={angleCalculations.y2}
        stroke={theme.primary}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <Line
        x1={angleCalculations.x2}
        y1={angleCalculations.y2}
        x2={angleCalculations.arrowX1}
        y2={angleCalculations.arrowY1}
        stroke={theme.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1={angleCalculations.x2}
        y1={angleCalculations.y2}
        x2={angleCalculations.arrowX2}
        y2={angleCalculations.arrowY2}
        stroke={theme.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
});

// Speed trend sparkline chart
interface SpeedTrendChartProps {
  history: SpeedHistory[];
  theme: any;
}

const SpeedTrendChart: React.FC<SpeedTrendChartProps> = React.memo(({ history, theme }) => {
  const chartData = useMemo(() => {
    if (history.length < 2) return null;
    
    const width = 80;
    const height = 30;
    const padding = 2;
    
    // Find min/max for scaling
    const speeds = history.map(h => h.speed);
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    const range = maxSpeed - minSpeed || 1; // Avoid division by zero
    
    // Create points for polyline
    const points = history.map((entry, index) => {
      const x = padding + (index / (history.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((entry.speed - minSpeed) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
    
    return { width, height, points };
  }, [history]);

  if (!chartData) return null;
  
  return (
    <Svg width={chartData.width} height={chartData.height} viewBox={`0 0 ${chartData.width} ${chartData.height}`}>
      <Polyline
        points={chartData.points}
        fill="none"
        stroke={theme.success}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  detailsContainer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
  },
  cogIndicator: {
    marginVertical: 4,
  },
  trendContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  trendLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
