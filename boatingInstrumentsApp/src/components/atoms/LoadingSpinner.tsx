import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { getUseNativeDriver } from '../../utils/animationUtils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
  testID?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#007AFF',
  style,
  testID,
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: getUseNativeDriver(),
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinnerStyle = [
    styles.spinner,
    styles[`spinner_${size}`],
    { borderTopColor: color },
    style,
  ];

  return (
    <Animated.View
      style={[spinnerStyle, { transform: [{ rotate: spin }] }]}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  spinner: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 50,
  },
  spinner_small: {
    width: 16,
    height: 16,
  },
  spinner_medium: {
    width: 24,
    height: 24,
  },
  spinner_large: {
    width: 32,
    height: 32,
  },
});

export default LoadingSpinner;