import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface WidgetFooterProps {
  testID?: string;
}

/**
 * WidgetFooter - Visual spacing/balance for widget layout
 * 
 * Provides consistent footer spacing below widget grid content.
 * Matches 1/3 of header height for visual symmetry.
 */
export const WidgetFooter: React.FC<WidgetFooterProps> = ({ testID }) => {
  const theme = useTheme();

  return (
    <View 
      style={[
        styles.footer,
        { backgroundColor: theme.widgetBackground }
      ]} 
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    height: 16, // 1/3 of typical header height (~48px)
    width: '100%',
  },
});

export default WidgetFooter;
