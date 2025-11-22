import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
interface TooltipProps {
  children: string;
  variant?: 'default' | 'dark' | 'light';
  size?: 'small' | 'medium' | 'large';
  style?: TextStyle;
  testID?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  testID,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const tooltipStyle = [
    styles.tooltip,
    styles[`tooltip_${variant}`],
    styles[`tooltip_${size}`],
    style,
  ];

  return (
    <Text style={tooltipStyle} testID={testID}>
      {children}
    </Text>
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    position: 'absolute',
    zIndex: 1000,
    textAlign: 'center',
  },
  tooltip_default: {
    backgroundColor: theme.surfaceDim,
    color: theme.text,
  },
  tooltip_dark: {
    backgroundColor: theme.surface,
    color: theme.text,
  },
  tooltip_light: {
    backgroundColor: theme.surfaceHighlight,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  tooltip_small: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tooltip_medium: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltip_large: {
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default Tooltip;