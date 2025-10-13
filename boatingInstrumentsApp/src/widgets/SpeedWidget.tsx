import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

// Speed history for 5-minute trending
interface SpeedHistory {
  timestamp: number;
  speed: number;
}

export const SpeedWidget: React.FC = () => {
  const theme = useTheme();
  const cog = useNmeaStore((state: any) => state.nmeaData.cog);
  const sog = useNmeaStore((state: any) => state.nmeaData.sog);
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
  
  const displaySpeed = sog !== undefined && sog !== null
    ? sog.toFixed(1)
    : '--';
  
  const displayCOG = cog !== undefined && cog !== null
    ? `${Math.round(cog)}°`
    : '--';
  
  const state = (sog === undefined || sog === null) ? 'no-data' : 'normal';
  
  // Calculate VMG (simplified - would need wind data for accurate calculation)
  // For now, just show speed trend
  const speedTrend = calculateSpeedTrend(speedHistory);
  
  return (
    <WidgetCard
      title="COG / SOG"
      icon="speedometer"
      value={displaySpeed}
      unit="kn"
      state={state}
      secondary={`Course: ${displayCOG}`}
    >
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
                {speedTrend > 0 ? '↑' : speedTrend < 0 ? '↓' : '→'} {Math.abs(speedTrend).toFixed(1)} kn
              </Text>
            </View>
          )}
        </View>
      )}
    </WidgetCard>
  );
};

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

const CourseIndicator: React.FC<CourseIndicatorProps> = ({ course, theme }) => {
  const size = 40;
  const center = size / 2;
  const length = 15;
  
  // Convert course to radians
  const angle = (course - 90) * (Math.PI / 180); // -90 to make 0° point up
  
  const x2 = center + length * Math.cos(angle);
  const y2 = center + length * Math.sin(angle);
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line
        x1={center}
        y1={center}
        x2={x2}
        y2={y2}
        stroke={theme.primary}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <Line
        x1={x2}
        y1={y2}
        x2={x2 - 5 * Math.cos(angle - 0.5)}
        y2={y2 - 5 * Math.sin(angle - 0.5)}
        stroke={theme.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1={x2}
        y1={y2}
        x2={x2 - 5 * Math.cos(angle + 0.5)}
        y2={y2 - 5 * Math.sin(angle + 0.5)}
        stroke={theme.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

// Speed trend sparkline chart
interface SpeedTrendChartProps {
  history: SpeedHistory[];
  theme: any;
}

const SpeedTrendChart: React.FC<SpeedTrendChartProps> = ({ history, theme }) => {
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
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        fill="none"
        stroke={theme.success}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
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
