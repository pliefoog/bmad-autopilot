import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import { getUseNativeDriver } from '../../utils/animationUtils';

// Simple fixed heights
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 292;

export interface SimpleWidgetProps {
  title: string;
  icon: string;
  value: string;
  unit: string;
  state?: 'normal' | 'alarm' | 'warning' | 'no-data';
  secondary?: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode; // For expanded content
  testID?: string;
  // For widgets with interactive content
  hasInteractiveContent?: boolean;
}

/**
 * SimpleWidget - A single component that handles everything:
 * - Display (title, icon, value, unit)
 * - Animation (expand/collapse)
 * - Touch handling (with smart nesting prevention)
 * - Styling (theme-aware)
 *
 * No more complex component hierarchies!
 */
export const SimpleWidget: React.FC<SimpleWidgetProps> = ({
  title,
  icon,
  value,
  unit,
  state = 'normal',
  secondary,
  expanded,
  onToggle,
  children,
  testID = 'simple-widget',
  hasInteractiveContent = false,
}) => {
  const theme = useTheme();
  const heightAnimation = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const chevronAnimation = useRef(new Animated.Value(0)).current;

  // Animate height and chevron
  React.useEffect(() => {
    const targetHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    const targetChevron = expanded ? 1 : 0;

    Animated.parallel([
      Animated.timing(heightAnimation, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnimation, {
        toValue: targetChevron,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start();
  }, [expanded]);

  const chevronRotation = chevronAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Get state color
  const getStateColor = () => {
    switch (state) {
      case 'alarm':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'no-data':
        return theme.textSecondary;
      default:
        return theme.text;
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);
  const stateColor = getStateColor();

  // Smart touch handling: use View if expanded and has interactive content
  const WrapperComponent = expanded && hasInteractiveContent ? View : TouchableOpacity;
  const wrapperProps =
    expanded && hasInteractiveContent
      ? {}
      : {
          onPress: onToggle,
          activeOpacity: 0.95,
          accessibilityRole: 'button' as const,
          accessibilityLabel: `${expanded ? 'Collapse' : 'Expand'} ${title} widget`,
        };

  return (
    <Animated.View style={[styles.container, { height: heightAnimation }]} testID={testID}>
      <WrapperComponent style={styles.content} {...wrapperProps}>
        {/* Header with title, value, and chevron */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name={icon as any} size={16} color={theme.iconPrimary} />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {!expanded && (
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </Animated.View>
            )}
          </View>

          {/* Main value display */}
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: stateColor }]} testID={`${testID}-value`}>
              {value}
            </Text>
            <Text style={[styles.unit, { color: theme.textSecondary }]}>{unit}</Text>
          </View>

          {/* Secondary info */}
          {secondary && (
            <Text style={[styles.secondary, { color: theme.textSecondary }]}>{secondary}</Text>
          )}
        </View>

        {/* Expanded content area */}
        {expanded && (
          <View style={styles.expandedContent}>
            {children}
            {/* Collapse button for interactive widgets */}
            {hasInteractiveContent && (
              <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
                <Ionicons name="chevron-up" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </WrapperComponent>
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      width: 180,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      padding: 12,
    },
    header: {
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      flex: 1,
      marginLeft: 6,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    value: {
      fontSize: 32,
      fontWeight: '300',
      letterSpacing: -1,
    },
    unit: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
      marginBottom: 4,
    },
    secondary: {
      fontSize: 11,
      fontWeight: '500',
    },
    expandedContent: {
      flex: 1,
      marginTop: 8,
    },
    collapseButton: {
      alignSelf: 'center',
      padding: 8,
      marginTop: 8,
    },
  });
