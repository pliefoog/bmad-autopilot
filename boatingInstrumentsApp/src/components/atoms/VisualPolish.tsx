/**
 * Visual Polish Utilities
 * Story 4.4 AC1-5: Smooth transitions, loading states, animations
 *
 * Provides:
 * - Animated component wrappers
 * - Loading state components
 * - Empty state components
 * - Transition helpers
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { designTokens } from '../../theme/designTokens';

// ============================================================================
// LOADING STATES
// ============================================================================

export interface LoadingStateProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'large',
  message,
  fullScreen = false,
}) => {
  const theme = useTheme();

  const containerStyle = fullScreen ? styles.loadingContainerFullScreen : styles.loadingContainer;

  return (
    <View
      style={[containerStyle, { backgroundColor: fullScreen ? theme.background : 'transparent' }]}
    >
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text style={[styles.loadingMessage, { color: theme.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
};

// ============================================================================
// EMPTY STATES
// ============================================================================

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, message, action }) => {
  const theme = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {message && (
        <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>{message}</Text>
      )}
      {action && (
        <View style={[styles.emptyAction, { backgroundColor: theme.primary }]}>
          <Text style={[styles.emptyActionText, { color: theme.surface }]}>{action.label}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// FADE IN ANIMATION
// ============================================================================

export interface FadeInViewProps {
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  duration = designTokens.transitions.duration.base,
  delay = 0,
  children,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
};

// ============================================================================
// SLIDE IN ANIMATION
// ============================================================================

export interface SlideInViewProps {
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  children: React.ReactNode;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
  direction = 'up',
  duration = designTokens.transitions.duration.base,
  delay = 0,
  distance = 50,
  children,
}) => {
  const slideAnim = React.useRef(new Animated.Value(distance)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, duration, delay]);

  const getTransform = () => {
    switch (direction) {
      case 'left':
        return [{ translateX: slideAnim }];
      case 'right':
        return [{ translateX: Animated.multiply(slideAnim, -1) }];
      case 'up':
        return [{ translateY: slideAnim }];
      case 'down':
        return [{ translateY: Animated.multiply(slideAnim, -1) }];
      default:
        return [{ translateY: slideAnim }];
    }
  };

  return <Animated.View style={{ transform: getTransform() }}>{children}</Animated.View>;
};

// ============================================================================
// SCALE IN ANIMATION
// ============================================================================

export interface ScaleInViewProps {
  duration?: number;
  delay?: number;
  initialScale?: number;
  children: React.ReactNode;
}

export const ScaleInView: React.FC<ScaleInViewProps> = ({
  duration = designTokens.transitions.duration.base,
  delay = 0,
  initialScale = 0.8,
  children,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(initialScale)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, delay]);

  return <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>;
};

// ============================================================================
// SKELETON LOADER
// ============================================================================

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = designTokens.borderRadius.sm,
  style,
}) => {
  const theme = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.border,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

// ============================================================================
// DIVIDER
// ============================================================================

export interface DividerProps {
  spacing?: keyof typeof designTokens.spacing;
  color?: string;
  thickness?: number;
}

export const Divider: React.FC<DividerProps> = ({ spacing = 4, color, thickness = 1 }) => {
  const theme = useTheme();

  return (
    <View
      style={{
        height: thickness,
        backgroundColor: color || theme.border,
        marginVertical: designTokens.spacing[spacing],
      }}
    />
  );
};

// ============================================================================
// BADGE
// ============================================================================

export interface BadgeProps {
  label: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', size = 'md' }) => {
  const theme = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'error':
        return theme.error;
      default:
        return theme.primary;
    }
  };

  const fontSize =
    size === 'sm' ? designTokens.typography.fontSize.xs : designTokens.typography.fontSize.sm;
  const padding = size === 'sm' ? 4 : 6;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          paddingHorizontal: padding * 2,
          paddingVertical: padding,
        },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize, color: theme.surface }]}>{label}</Text>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    padding: designTokens.spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainerFullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMessage: {
    marginTop: designTokens.spacing[4],
    fontSize: designTokens.typography.fontSize.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: designTokens.spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: designTokens.spacing[4],
  },
  emptyTitle: {
    fontSize: designTokens.typography.fontSize.xl,
    fontWeight: designTokens.typography.fontWeight.semibold as any,
    marginBottom: designTokens.spacing[2],
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: designTokens.typography.fontSize.base,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.base * designTokens.typography.lineHeight.normal,
    marginBottom: designTokens.spacing[6],
    maxWidth: 300,
  },
  emptyAction: {
    paddingHorizontal: designTokens.spacing[6],
    paddingVertical: designTokens.spacing[3],
    borderRadius: designTokens.borderRadius.md,
  },
  emptyActionText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.semibold as any,
  },
  badge: {
    borderRadius: designTokens.borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: designTokens.typography.fontWeight.bold as any,
    textAlign: 'center',
  },
});

// ============================================================================
// EXPORT
// ============================================================================

export default {
  LoadingState,
  EmptyState,
  FadeInView,
  SlideInView,
  ScaleInView,
  Skeleton,
  Divider,
  Badge,
};
