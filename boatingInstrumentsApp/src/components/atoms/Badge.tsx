import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

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
  const theme = useTheme();
  
  // Create dynamic styles based on current theme
  const dynamicStyles = useMemo(() => ({
    badge_default: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    badge_primary: {
      backgroundColor: theme.primary,
    },
    badge_secondary: {
      backgroundColor: theme.secondary,
    },
    badge_success: {
      backgroundColor: theme.success, // Theme-aware (red in red-night mode)
    },
    badge_warning: {
      backgroundColor: theme.warning,
    },
    badge_danger: {
      backgroundColor: theme.error,
    },
    text_default: {
      color: theme.text,
    },
  }), [theme]);

  const badgeStyle = [
    styles.badge,
    dynamicStyles[`badge_${variant}`],
    styles[`badge_${size}`],
    rounded && styles.badge_rounded,
    style,
  ];

  const badgeTextStyle = [
    styles.text,
    variant === 'default' ? dynamicStyles.text_default : styles.text_colored,
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
  text_colored: {
    color: '#000000', // Dark text on colored badges for better contrast in all themes
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