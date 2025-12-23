import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../atoms';
import { WidgetHeader, MetricDisplay } from '../molecules';

interface MarineWidgetProps {
  title: string;
  subtitle?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'warning';
  iconName?: string;
  value: string | number;
  unit?: string;
  label?: string;
  trend?: 'up' | 'down' | 'stable';
  metricStatus?: 'normal' | 'warning' | 'danger';
  precision?: number;
  onHeaderPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const MarineWidget: React.FC<MarineWidgetProps> = ({
  title,
  subtitle,
  status,
  iconName,
  value,
  unit,
  label,
  trend,
  metricStatus = 'normal',
  precision = 1,
  onHeaderPress,
  style,
  testID,
}) => {
  return (
    <Card variant="elevated" padding="none" rounded="medium" style={style} testID={testID}>
      <WidgetHeader
        title={title}
        subtitle={subtitle}
        status={status}
        iconName={iconName}
        onPress={onHeaderPress}
        testID={testID ? `${testID}-header` : undefined}
      />

      <View style={styles.content}>
        <MetricDisplay
          label={label || title}
          value={value}
          unit={unit}
          trend={trend}
          status={metricStatus}
          precision={precision}
          size="large"
          layout="vertical"
          testID={testID ? `${testID}-metric` : undefined}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MarineWidget;
