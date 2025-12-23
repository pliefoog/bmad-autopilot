import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';

interface InstrumentWidgetProps {
  title: string;
  value: string | number | undefined;
  unit?: string;
}

export const InstrumentWidget: React.FC<InstrumentWidgetProps> = ({ title, value, unit }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const displayText = value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : '--';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{displayText}</Text>
    </View>
  );
};

const createStyles = (theme: typeof useTheme extends () => infer R ? R : never) =>
  StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.surface,
      alignItems: 'center',
      margin: 8,
      minWidth: 120,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
      color: theme.text,
    },
    value: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
  });

export default InstrumentWidget;
