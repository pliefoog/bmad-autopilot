/**
 * Memory Monitor Component
 *
 * Real-time memory usage display in the UI.
 * Shows current usage, growth rate, and leak warnings.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../store/themeStore';
import { memoryProfiler, MemorySnapshot } from '../utils/memoryProfiler';

interface MemoryMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  updateInterval?: number; // milliseconds
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({
  position = 'bottom-right',
  updateInterval = 1000,
}) => {
  const theme = useTheme();
  const [currentSnapshot, setCurrentSnapshot] = useState<MemorySnapshot | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [growthRate, setGrowthRate] = useState<number>(0);

  useEffect(() => {
    if (!memoryProfiler.isAvailable()) {
      return;
    }

    const interval = setInterval(() => {
      const stats = memoryProfiler.getCurrentStats();
      if (stats && stats.snapshots.length > 0) {
        const latest = stats.snapshots[stats.snapshots.length - 1];
        setCurrentSnapshot(latest);
        setGrowthRate(stats.growthRate);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  if (!memoryProfiler.isAvailable() || !currentSnapshot) {
    return null;
  }

  const positionStyles = {
    'top-left': { top: 60, left: 10 },
    'top-right': { top: 60, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
  };

  const getLeakColor = () => {
    if (growthRate > 5) return theme.error;
    if (growthRate > 2) return theme.warning;
    return theme.primary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        positionStyles[position],
        { backgroundColor: theme.surface, borderColor: getLeakColor() },
      ]}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.8}
    >
      <View style={styles.compact}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>MEM</Text>
        <Text style={[styles.value, { color: getLeakColor() }]}>
          {currentSnapshot.usedMB.toFixed(0)}
        </Text>
        <Text style={[styles.unit, { color: theme.textSecondary }]}>MB</Text>
      </View>

      {isExpanded && (
        <View style={styles.expanded}>
          <View style={styles.row}>
            <Text style={[styles.expandedLabel, { color: theme.textSecondary }]}>Used:</Text>
            <Text style={[styles.expandedValue, { color: theme.text }]}>
              {currentSnapshot.usedMB.toFixed(2)} MB
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.expandedLabel, { color: theme.textSecondary }]}>Total:</Text>
            <Text style={[styles.expandedValue, { color: theme.text }]}>
              {currentSnapshot.totalMB.toFixed(2)} MB
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.expandedLabel, { color: theme.textSecondary }]}>Usage:</Text>
            <Text style={[styles.expandedValue, { color: theme.text }]}>
              {currentSnapshot.percentUsed.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.expandedLabel, { color: theme.textSecondary }]}>Growth:</Text>
            <Text style={[styles.expandedValue, { color: getLeakColor() }]}>
              {growthRate > 0 ? '+' : ''}
              {growthRate.toFixed(2)} MB/min
            </Text>
          </View>

          {growthRate > 2 && (
            <View style={[styles.warning, { backgroundColor: theme.error + '20' }]}>
              <Text style={[styles.warningText, { color: theme.error }]}>
                ⚠️ Memory leak detected
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 10,
    fontWeight: '600',
  },
  expanded: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 4,
    minWidth: 180,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  warning: {
    marginTop: 4,
    padding: 6,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
