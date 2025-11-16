import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MarineWidget } from '@/components/organisms';
import { Button, Badge } from '@/components/atoms';
import { IconButton } from '@/components/molecules';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';

type DepthUnit = 'meters' | 'feet' | 'fathoms';

interface DepthWidgetAtomicProps {
  widgetId?: string;
  onExpand?: () => void;
}

export const DepthWidgetAtomic: React.FC<DepthWidgetAtomicProps> = ({ 
  widgetId = 'depth-widget',
  onExpand
}) => {
  const depthData = useNmeaStore((state: any) => state.nmeaData.sensors.depth[0]);
  const depth = depthData?.depth;
  const connectionStatus = useNmeaStore((state: any) => state.connectionStatus);
  const theme = useTheme();
  
  const [unit, setUnit] = useState<DepthUnit>('meters');
  const [shallowWarning] = useState(2.0); // 2 meters shallow warning
  const [criticalDepth] = useState(1.5); // 1.5 meters critical depth
  const [depthHistory, setDepthHistory] = useState<{ depth: number; timestamp: number }[]>([]);

  // Track depth history for trend analysis
  useEffect(() => {
    if (depth !== undefined && depth !== null) {
      const now = Date.now();
      setDepthHistory(prev => {
        const newHistory = [...prev, { depth, timestamp: now }];
        return newHistory.filter(entry => now - entry.timestamp <= 60000).slice(-30);
      });
    }
  }, [depth]);

  const convertDepth = (depthM: number | undefined): { value: string; unitStr: string } => {
    if (depthM === undefined || depthM === null) return { value: '--', unitStr: 'm' };
    
    switch (unit) {
      case 'feet':
        return { value: (depthM * 3.28084).toFixed(1), unitStr: 'ft' };
      case 'fathoms':
        return { value: (depthM * 0.546807).toFixed(2), unitStr: 'fath' };
      default:
        return { value: depthM.toFixed(1), unitStr: 'm' };
    }
  };

  const getDepthStatus = (depthM: number | undefined) => {
    if (depthM === undefined || depthM === null) return 'normal';
    if (depthM <= criticalDepth) return 'danger';
    if (depthM <= shallowWarning) return 'warning';
    return 'normal';
  };

  const getTrend = () => {
    if (depthHistory.length < 2) return undefined;
    const recent = depthHistory.slice(-3);
    const trend = recent[recent.length - 1].depth - recent[0].depth;
    if (Math.abs(trend) < 0.1) return 'stable';
    return trend > 0 ? 'up' : 'down';
  };

  const cycleUnit = () => {
    setUnit(current => {
      switch (current) {
        case 'meters': return 'feet';
        case 'feet': return 'fathoms';
        case 'fathoms': return 'meters';
        default: return 'meters';
      }
    });
  };

  const { value, unitStr } = convertDepth(depth);
  const status = connectionStatus === 'connected' ? 'connected' : 'disconnected';
  const metricStatus = getDepthStatus(depth);
  const trend = getTrend();

  return (
    <View style={styles.container}>
      <MarineWidget
        title="Depth"
        subtitle={`Sounder (${unitStr})`}
        status={status}
        iconName="water"
        value={value}
        unit={unitStr}
        trend={trend}
        metricStatus={metricStatus}
        precision={unit === 'fathoms' ? 2 : 1}
        onHeaderPress={onExpand}
        testID={`${widgetId}-marine-widget`}
      />
      
      {/* Depth Status Indicators */}
      {metricStatus !== 'normal' && (
        <View style={styles.alertContainer}>
          <Badge
            variant={metricStatus === 'danger' ? 'danger' : 'warning'}
            size="small"
          >
            {metricStatus === 'danger' ? 'CRITICAL DEPTH' : 'SHALLOW WATER'}
          </Badge>
        </View>
      )}
      
      {/* Unit Toggle Control */}
      <View style={styles.controlsContainer}>
        <Button
          variant="ghost"
          size="small"
          onPress={cycleUnit}
          testID={`${widgetId}-unit-toggle`}
        >
          {unitStr}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  alertContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
});

export default DepthWidgetAtomic;