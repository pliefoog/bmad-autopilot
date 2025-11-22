import React from 'react';
import { View, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface ScreenTransitionProps {
  children: React.ReactNode;
  duration?: number;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
  style?: ViewStyle;
  testID?: string;
}

const ScreenTransition: React.FC<ScreenTransitionProps> = ({ children, duration = 300, direction = 'up', style, testID }) => {
  const theme = useTheme();
  const opacity = React.useRef(new Animated.Value(theme.reducedMotion ? 1 : 0)).current;
  const translate = React.useRef(new Animated.Value(theme.reducedMotion ? 0 : (direction === 'up' || direction === 'down' ? 10 : 10))).current;

  React.useEffect(() => {
    if (theme.reducedMotion) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, translate, duration, theme.reducedMotion]);

  const transform = [] as any[];
  if (direction === 'up') transform.push({ translateY: translate });
  else if (direction === 'down') transform.push({ translateY: Animated.multiply(translate, -1) });
  else if (direction === 'left') transform.push({ translateX: translate });
  else if (direction === 'right') transform.push({ translateX: Animated.multiply(translate, -1) });

  return (
    <Animated.View
      testID={testID}
      style={[styles.container, style, { opacity, transform }]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenTransition;
