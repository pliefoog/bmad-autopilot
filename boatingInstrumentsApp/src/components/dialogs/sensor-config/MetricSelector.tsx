/**
 * Metric Selector Component
 *
 * Dropdown for selecting alarm metric on multi-metric sensors (e.g., battery).
 * Uses presentation store to get unit symbols for each metric category.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../store/themeStore';
import { PlatformPicker } from '../inputs/PlatformPicker';
import { DataCategory } from '../../../presentation/categories';
import { usePresentationStore } from '../../../presentation/presentationStore';

export interface AlarmMetric {
  key: string;
  label: string;
  category?: DataCategory;
}

export interface MetricSelectorProps {
  alarmMetrics: AlarmMetric[];
  selectedMetric: string | undefined;
  onMetricChange: (metric: string) => void;
  theme: ThemeColors;
  currentValue?: string;  // Current live value to display in dropdown label
}

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  alarmMetrics,
  selectedMetric,
  onMetricChange,
  theme,
  currentValue,
}) => {
  const presentationStore = usePresentationStore();

  const items = alarmMetrics.map((m) => {
    let unit = '';

    if (m.category) {
      const presentation = presentationStore.getPresentationForCategory(m.category);
      unit = presentation?.symbol || '';
    } else if (m.key === 'soc') {
      unit = '%';
    }

    // If this is the selected metric and we have a current value, include it in the label
    const isSelected = m.key === selectedMetric;
    const valueDisplay = isSelected && currentValue ? ` - ${currentValue}` : '';

    return {
      label: `${m.label}${valueDisplay}${unit && !isSelected ? ` (${unit})` : ''}`,
      value: m.key,
    };
  });

  return (
    <View style={[styles.container, styles.field, styles.metricPickerField]}>
      <Text style={[styles.label, { color: theme.text }]}>Metric</Text>
      <PlatformPicker
        value={selectedMetric || ''}
        onValueChange={(value) => onMetricChange(String(value))}
        items={items}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  metricPickerField: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
