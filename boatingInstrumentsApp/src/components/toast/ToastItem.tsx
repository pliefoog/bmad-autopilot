import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { ToastData } from '../../store/toastStore';
import { useToast } from '../../hooks/useToast';
import { getUseNativeDriver } from '../../utils/animationUtils';

export interface ToastItemProps {
  toast: ToastData;
  index: number;
  position: 'top' | 'bottom' | 'center';
  stackDirection: 'vertical' | 'horizontal';
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, index, position, stackDirection }) => {
  const theme = useTheme();
  const { dismiss } = useToast();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? -50 : 50)).current;

  const handleDismiss = useCallback(() => {
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(translateY, {
        toValue: position === 'top' ? -50 : 50,
        duration: 200,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start(() => {
      dismiss(toast.id);
    });
  }, [fadeAnim, scaleAnim, translateY, position, dismiss, toast.id]);

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start();

    // Auto-dismiss for non-persistent toasts
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [fadeAnim, scaleAnim, translateY, toast.duration, toast.persistent, handleDismiss]);

  const handleActionPress = () => {
    if (toast.action) {
      toast.action.action();
      handleDismiss();
    }
  };

  const styles = createStyles(theme);
  const toastStyle = getToastBackgroundStyle(toast.type, toast.priority, theme);
  const textStyle = getToastTextStyle(toast.type, theme);

  const marginStyle =
    stackDirection === 'vertical'
      ? { marginBottom: index < 2 ? 8 : 0 }
      : { marginRight: index < 2 ? 8 : 0 };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        marginStyle,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toast.persistent ? undefined : handleDismiss}
        style={[styles.toastContainer, toastStyle]}
        testID={`toast-${toast.type}-${toast.id}`}
      >
        <View style={styles.contentContainer}>
          <Text style={[styles.toastText, textStyle]} numberOfLines={3}>
            {toast.message}
          </Text>

          {toast.action && (
            <TouchableOpacity
              onPress={handleActionPress}
              style={[styles.actionButton, getActionButtonStyle(toast.action.style, theme)]}
            >
              <Text style={[styles.actionText, getActionTextStyle(toast.action.style, theme)]}>
                {toast.action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Priority indicator for critical toasts */}
        {toast.priority === 'critical' && (
          <View style={[styles.priorityIndicator, { backgroundColor: theme.error }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const getToastBackgroundStyle = (
  type: ToastData['type'],
  priority: ToastData['priority'],
  theme: any,
) => {
  // Critical alarms get special treatment
  if (priority === 'critical') {
    return {
      backgroundColor: theme.error,
      borderColor: theme.error,
      borderWidth: 2,
    };
  }

  switch (type) {
    case 'error':
      return { backgroundColor: theme.error };
    case 'warning':
      return { backgroundColor: theme.warning };
    case 'success':
      return { backgroundColor: theme.success };
    case 'info':
      return { backgroundColor: theme.primary };
    case 'alarm':
      return {
        backgroundColor: theme.error,
        borderColor: '#FF6B6B',
        borderWidth: 1,
      };
    default:
      return { backgroundColor: theme.surface };
  }
};

const getToastTextStyle = (type: ToastData['type'], theme: any) => {
  switch (type) {
    case 'error':
    case 'alarm':
      return { color: theme.text };
    case 'success':
      return { color: theme.text };
    case 'info':
      return { color: theme.text };
    case 'warning':
      return { color: theme.text };
    default:
      return { color: theme.text };
  }
};

const getActionButtonStyle = (style: string = 'default', theme: any) => {
  switch (style) {
    case 'destructive':
      return { backgroundColor: theme.error };
    case 'primary':
      return { backgroundColor: theme.primary };
    default:
      return { backgroundColor: theme.surface };
  }
};

const getActionTextStyle = (style: string = 'default', theme: any) => {
  return { color: theme.text, fontWeight: '600' as const };
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    toastWrapper: {
      // Wrapper for animation
    },

    toastContainer: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 4,
      minHeight: 56,
      justifyContent: 'center',
      elevation: 8,
      shadowColor: theme.shadow || '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      // Platform-specific styles
      ...(Platform.OS === 'web' && {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }),
    },

    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    toastText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },

    actionButton: {
      marginLeft: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      minWidth: 80,
      alignItems: 'center',
    },

    actionText: {
      fontSize: 12,
      fontWeight: '600',
    },

    priorityIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
  });
