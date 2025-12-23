/**
 * ContextualHelp - Tooltip and help bubble system for contextual assistance
 *
 * Features:
 * - Position-aware tooltips (top, bottom, left, right, center)
 * - Auto-positioning to stay within screen bounds
 * - Dismissible with tap-outside
 * - Animated transitions
 * - Accessible for screen readers
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { HelpContent } from '../../systems/help/types';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface ContextualHelpProps {
  content: string | HelpContent;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  target?: { x: number; y: number; width: number; height: number }; // Target element bounds
  visible: boolean;
  onDismiss: () => void;
  maxWidth?: number;
  autoDismiss?: number; // Auto-dismiss after milliseconds (0 = never)
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_MARGIN = 8; // Gap between tooltip and target
const ARROW_SIZE = 8;

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  content,
  position = 'bottom',
  target,
  visible,
  onDismiss,
  maxWidth = 300,
  autoDismiss = 0,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Auto-dismiss timer
  useEffect(() => {
    if (visible && autoDismiss > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismiss]);

  // Animation on visibility change
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) {
    return null;
  }

  // Extract text content
  const contentText = typeof content === 'string' ? content : content.content;
  const titleText = typeof content === 'object' ? content.title : undefined;

  // Calculate tooltip position
  const tooltipPos = calculateTooltipPosition(
    position,
    target,
    maxWidth,
    TOOLTIP_MARGIN,
    ARROW_SIZE,
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.container}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.tooltip,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  maxWidth,
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  ...tooltipPos.style,
                },
              ]}
            >
              {/* Arrow */}
              {tooltipPos.showArrow && target && (
                <View
                  style={[
                    styles.arrow,
                    tooltipPos.arrowPosition === 'top' && styles.arrowTop,
                    tooltipPos.arrowPosition === 'bottom' && styles.arrowBottom,
                    tooltipPos.arrowPosition === 'left' && styles.arrowLeft,
                    tooltipPos.arrowPosition === 'right' && styles.arrowRight,
                    {
                      borderTopColor:
                        tooltipPos.arrowPosition === 'bottom' ? theme.surface : 'transparent',
                      borderBottomColor:
                        tooltipPos.arrowPosition === 'top' ? theme.surface : 'transparent',
                      borderLeftColor:
                        tooltipPos.arrowPosition === 'right' ? theme.surface : 'transparent',
                      borderRightColor:
                        tooltipPos.arrowPosition === 'left' ? theme.surface : 'transparent',
                    },
                  ]}
                />
              )}
              <View style={styles.content}>
                {titleText && (
                  <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                    {titleText}
                  </Text>
                )}
                <Text
                  style={[
                    styles.text,
                    { color: theme.textSecondary },
                    titleText && styles.textWithTitle,
                  ]}
                >
                  {contentText}
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/**
 * Calculate tooltip position based on target and preferred position
 */
function calculateTooltipPosition(
  preferredPosition: 'top' | 'bottom' | 'left' | 'right' | 'center',
  target?: { x: number; y: number; width: number; height: number },
  maxWidth: number = 300,
  margin: number = 8,
  arrowSize: number = 8,
): {
  style: { top?: number; bottom?: number; left?: number; right?: number };
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  showArrow: boolean;
} {
  // Center position (no target required)
  if (preferredPosition === 'center' || !target) {
    return {
      style: {
        top: SCREEN_HEIGHT / 2 - 50,
        left: (SCREEN_WIDTH - maxWidth) / 2,
      },
      arrowPosition: 'bottom',
      showArrow: false,
    };
  }

  const tooltipHeight = 100; // Estimated, adjust as needed
  let style: any = {};
  let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  switch (preferredPosition) {
    case 'top':
      style = {
        bottom: SCREEN_HEIGHT - target.y + margin + arrowSize,
        left: target.x + (target.width - maxWidth) / 2,
      };
      arrowPosition = 'bottom';
      break;

    case 'bottom':
      style = {
        top: target.y + target.height + margin + arrowSize,
        left: target.x + (target.width - maxWidth) / 2,
      };
      arrowPosition = 'top';
      break;

    case 'left':
      style = {
        top: target.y + (target.height - tooltipHeight) / 2,
        right: SCREEN_WIDTH - target.x + margin + arrowSize,
      };
      arrowPosition = 'right';
      break;

    case 'right':
      style = {
        top: target.y + (target.height - tooltipHeight) / 2,
        left: target.x + target.width + margin + arrowSize,
      };
      arrowPosition = 'left';
      break;
  }

  // Ensure tooltip stays within screen bounds
  if (style.left !== undefined) {
    style.left = Math.max(16, Math.min(style.left, SCREEN_WIDTH - maxWidth - 16));
  }
  if (style.top !== undefined) {
    style.top = Math.max(16, Math.min(style.top, SCREEN_HEIGHT - tooltipHeight - 16));
  }

  return {
    style,
    arrowPosition,
    showArrow: true,
  };
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.overlay,
    },
    tooltip: {
      position: 'absolute',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadowDark,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
        web: {
          boxShadow: `0 2px 4px ${theme.shadow}`,
        },
      }),
    },
    arrow: {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: ARROW_SIZE,
    },
    arrowTop: {
      top: -ARROW_SIZE * 2,
      left: '50%',
      marginLeft: -ARROW_SIZE,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    arrowBottom: {
      bottom: -ARROW_SIZE * 2,
      left: '50%',
      marginLeft: -ARROW_SIZE,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: 'transparent',
    },
    arrowLeft: {
      left: -ARROW_SIZE * 2,
      top: '50%',
      marginTop: -ARROW_SIZE,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: 'transparent',
    },
    arrowRight: {
      right: -ARROW_SIZE * 2,
      top: '50%',
      marginTop: -ARROW_SIZE,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    content: {
      // Content container
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
    },
    textWithTitle: {
      marginTop: 4,
    },
  });

export default ContextualHelp;
