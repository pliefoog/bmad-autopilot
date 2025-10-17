import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../core/themeStore';
import { getUseNativeDriver, PlatformStyles } from '../utils/animationUtils';

export interface ToastMessageData {
  message: string;
  type: 'error' | 'warning' | 'success';
  duration?: number; // in milliseconds
}

interface ToastMessageProps {
  toast: ToastMessageData | null;
  onDismiss: () => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ toast, onDismiss }) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    if (toast) {
      // Clear any existing timer
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
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

      // Auto-dismiss timer
      const duration = toast.duration || getDefaultDuration(toast.type);
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, duration) as any;
    } else {
      handleDismiss();
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [toast]);

  const getDefaultDuration = (type: 'error' | 'warning' | 'success'): number => {
    switch (type) {
      case 'error':
        return 5000; // AC 11: Error messages 5s auto-dismiss
      case 'warning':
        return 5000; // AC 12: Warning messages 5s auto-dismiss
      case 'success':
        return 3000; // AC 13: Success messages 3s auto-dismiss
      default:
        return 5000;
    }
  };

  const handleDismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    // Hide animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 200,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) {
    return null;
  }

  const styles = createStyles(theme);
  const toastStyle = getToastBackgroundStyle(toast.type, theme);
  const textStyle = getToastTextStyle(toast.type, theme);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleDismiss} // AC 14: Tap to dismiss early
      testID={`toast-${toast.type}`}
    >
      <Animated.View
        style={[
          styles.toastContainer,
          toastStyle,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={[styles.toastText, textStyle]} numberOfLines={2}>
          {toast.message}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const getToastBackgroundStyle = (type: 'error' | 'warning' | 'success', theme: any) => {
  switch (type) {
    case 'error':
      return { backgroundColor: theme.error }; // AC 11: Red background
    case 'warning':
      return { backgroundColor: theme.warning }; // AC 12: Orange background
    case 'success':
      return { backgroundColor: theme.success }; // AC 13: Green background
    default:
      return { backgroundColor: theme.error };
  }
};

const getToastTextStyle = (type: 'error' | 'warning' | 'success', theme: any) => {
  switch (type) {
    case 'error':
      return { color: '#FFFFFF' }; // AC 11: White text on red
    case 'warning':
      return { color: theme.text }; // AC 12: Dark text on orange
    case 'success':
      return { color: '#FFFFFF' }; // AC 13: White text on green
    default:
      return { color: '#FFFFFF' };
  }
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    toastContainer: {
      position: 'absolute',
      top: 0,
      left: 16,
      right: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      ...PlatformStyles.boxShadow(theme.shadow, { x: 0, y: 2 }, 3.84, 0.25),
      elevation: 5,
    },
    toastText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

export default ToastMessage;