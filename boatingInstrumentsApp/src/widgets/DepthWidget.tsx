import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

type DepthUnit = 'meters' | 'feet' | 'fathoms';

export const DepthWidget: React.FC = () => {
  const depth = useNmeaStore((state: any) => state.nmeaData.depth);
  const theme = useTheme();
  const [unit, setUnit] = useState<DepthUnit>('meters');
  const [shallowWarning] = useState(2.0); // 2 meters shallow warning
  const [depthHistory, setDepthHistory] = useState<number[]>([]);

  // Track depth history for trend analysis
  useEffect(() => {
    if (depth !== undefined && depth !== null) {
      setDepthHistory(prev => {
        const newHistory = [...prev, depth];
        return newHistory.slice(-10); // Keep last 10 readings
      });
    }
  }, [depth]);

  const convertDepth = (depthM: number | undefined): { value: string; unitStr: string } => {
    if (depthM === undefined || depthM === null) return { value: '--', unitStr: 'm' };
    
    switch (unit) {
      case 'feet':
        return { value: (depthM * 3.28084).toFixed(1), unitStr: 'ft' };
      case 'fathoms':
        return { value: (depthM / 1.8288).toFixed(2), unitStr: 'fth' };
      default:
        return { value: depthM.toFixed(1), unitStr: 'm' };
    }
  };

  const getTrend = (): 'up' | 'down' | 'stable' | null => {
    if (depthHistory.length < 3) return null;
    const recent = depthHistory.slice(-3);
    const trend = recent[2] - recent[0];
    if (Math.abs(trend) < 0.1) return 'stable';
    return trend > 0 ? 'up' : 'down';
  };

  const getState = () => {
    if (depth === undefined || depth === null) return 'no-data';
    if (depth <= shallowWarning) return 'alarm';
    if (depth <= shallowWarning + 1.0) return 'highlighted';
    return 'normal';
  };

  const { value, unitStr } = convertDepth(depth);
  const trend = getTrend();
  const state = getState();

  const cycleUnit = () => {
    const units: DepthUnit[] = ['meters', 'feet', 'fathoms'];
    const currentIndex = units.indexOf(unit);
    setUnit(units[(currentIndex + 1) % units.length]);
  };

  return (
    <TouchableOpacity onPress={cycleUnit}>
      <WidgetCard
        title="DEPTH"
        icon="water"
        value={value}
        unit={unitStr}
        state={state}
        secondary={
          state === 'alarm' ? 'SHALLOW WATER!' :
          state === 'highlighted' ? 'Caution' :
          trend === 'up' ? 'Getting Deeper' :
          trend === 'down' ? 'Getting Shallower' : 'Stable'
        }
      >
        <View style={styles.trendContainer}>
          {trend && (
            <Ionicons
              name={
                trend === 'up' ? 'arrow-up' :
                trend === 'down' ? 'arrow-down' : 'remove'
              }
              size={16}
              color={
                trend === 'up' ? theme.success :
                trend === 'down' ? (state === 'alarm' ? theme.error : theme.warning) :
                theme.textSecondary
              }
            />
          )}
        </View>
      </WidgetCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  trendContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
});
