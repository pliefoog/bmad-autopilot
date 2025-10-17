import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Icon } from '../atoms';

interface IconButtonProps {
  iconName: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  rounded?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  onPress,
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  loading = false,
  rounded = true,
  style,
  testID,
}) => {
  const buttonStyle = [
    rounded && styles.rounded,
    style,
  ];

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      style={buttonStyle}
      testID={testID}
    >
      <Icon
        name={iconName}
        size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
        color={disabled ? '#9CA3AF' : undefined}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Button>
  );
};

const styles = StyleSheet.create({
  rounded: {
    borderRadius: 9999,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IconButton;