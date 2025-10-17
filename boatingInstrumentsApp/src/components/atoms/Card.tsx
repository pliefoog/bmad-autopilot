import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { PlatformStyles } from '../../utils/animationUtils';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  rounded?: 'none' | 'small' | 'medium' | 'large' | 'full';
  backgroundColor?: string;
  style?: ViewStyle;
  testID?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  rounded = 'medium',
  backgroundColor,
  style,
  testID,
}) => {
  const cardStyle = [
    styles.card,
    styles[`card_${variant}`],
    styles[`padding_${padding}`],
    styles[`margin_${margin}`],
    styles[`rounded_${rounded}`],
    backgroundColor && { backgroundColor },
    style,
  ];

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
  },
  card_default: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  card_elevated: {
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 3.84, 0.1),
    elevation: 5,
  },
  card_outlined: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  card_filled: {
    backgroundColor: '#F9FAFB',
  },
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: 8,
  },
  padding_medium: {
    padding: 16,
  },
  padding_large: {
    padding: 24,
  },
  margin_none: {
    margin: 0,
  },
  margin_small: {
    margin: 8,
  },
  margin_medium: {
    margin: 16,
  },
  margin_large: {
    margin: 24,
  },
  rounded_none: {
    borderRadius: 0,
  },
  rounded_small: {
    borderRadius: 4,
  },
  rounded_medium: {
    borderRadius: 8,
  },
  rounded_large: {
    borderRadius: 16,
  },
  rounded_full: {
    borderRadius: 9999,
  },
});

export default Card;