import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Badge } from '../atoms';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'warning' | 'danger';
  precision?: number;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  unitStyle?: TextStyle;
  testID?: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  unit,
  trend,
  status = 'normal',
  precision = 1,
  size = 'medium',
  layout = 'vertical',
  style,
  labelStyle,
  valueStyle,
  unitStyle,
  testID,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toFixed(precision);
    }
    return val;
  };

  const getTrendSymbol = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'warning': return 'warning';
      case 'danger': return 'danger';
      default: return 'default';
    }
  };

  const containerStyle = [
    styles.container,
    styles[`container_${layout}`],
    styles[`container_${size}`],
    style,
  ];

  return (
    <View style={containerStyle} testID={testID}>
      <Text
        style={[styles.label, styles[`label_${size}`], labelStyle]}
        testID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
      
      <View style={styles.valueContainer}>
        <Text
          style={[
            styles.value,
            styles[`value_${size}`],
            styles[`value_${status}`],
            valueStyle,
          ]}
          testID={testID ? `${testID}-value` : undefined}
        >
          {formatValue(value)}
        </Text>
        
        {unit && (
          <Text
            style={[styles.unit, styles[`unit_${size}`], unitStyle]}
            testID={testID ? `${testID}-unit` : undefined}
          >
            {unit}
          </Text>
        )}
        
        {trend && (
          <Text style={styles.trend}>
            {getTrendSymbol()}
          </Text>
        )}
      </View>
      
      {status !== 'normal' && (
        <Badge
          variant={getStatusBadgeVariant()}
          size="small"
          testID={testID ? `${testID}-status` : undefined}
        >
          {status}
        </Badge>
      )}
    </View>
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  container_horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container_vertical: {
    flexDirection: 'column',
  },
  container_small: {
    padding: 8,
  },
  container_medium: {
    padding: 12,
  },
  container_large: {
    padding: 16,
  },
  label: {
    color: theme.textSecondary,
    fontWeight: '500',
  },
  label_small: {
    fontSize: 10,
  },
  label_medium: {
    fontSize: 12,
  },
  label_large: {
    fontSize: 14,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: '700',
    color: theme.text,
  },
  value_small: {
    fontSize: 16,
  },
  value_medium: {
    fontSize: 24,
  },
  value_large: {
    fontSize: 32,
  },
  value_normal: {
    color: theme.text,
  },
  value_warning: {
    color: theme.warning,
  },
  value_danger: {
    color: theme.error,
  },
  unit: {
    color: theme.textSecondary,
    fontWeight: '500',
  },
  unit_small: {
    fontSize: 10,
  },
  unit_medium: {
    fontSize: 12,
  },
  unit_large: {
    fontSize: 14,
  },
  trend: {
    fontSize: 14,
    color: theme.textSecondary,
  },
});

export default MetricDisplay;