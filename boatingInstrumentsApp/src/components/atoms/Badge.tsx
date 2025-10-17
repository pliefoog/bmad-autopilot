import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  children: string | number;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  rounded?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  rounded = true,
  style,
  textStyle,
  testID,
}) => {
  const badgeStyle = [
    styles.badge,
    styles[`badge_${variant}`],
    styles[`badge_${size}`],
    rounded && styles.badge_rounded,
    style,
  ];

  const badgeTextStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    textStyle,
  ];

  return (
    <View style={badgeStyle} testID={testID}>
      <Text style={badgeTextStyle} testID={testID ? `${testID}-text` : undefined}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge_default: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  badge_primary: {
    backgroundColor: '#3B82F6',
  },
  badge_secondary: {
    backgroundColor: '#6B7280',
  },
  badge_success: {
    backgroundColor: '#10B981',
  },
  badge_warning: {
    backgroundColor: '#F59E0B',
  },
  badge_danger: {
    backgroundColor: '#EF4444',
  },
  badge_small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badge_medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badge_large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badge_rounded: {
    borderRadius: 9999,
  },
  text: {
    fontWeight: '500',
  },
  text_default: {
    color: '#374151',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_success: {
    color: '#FFFFFF',
  },
  text_warning: {
    color: '#FFFFFF',
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_small: {
    fontSize: 10,
  },
  text_medium: {
    fontSize: 12,
  },
  text_large: {
    fontSize: 14,
  },
});

export default Badge;