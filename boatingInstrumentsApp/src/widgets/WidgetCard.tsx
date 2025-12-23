import React from 'react';
import { View, Text, TouchableOpacity, AccessibilityRole } from 'react-native';
import UniversalIcon from '../components/atoms/UniversalIcon';
import { useTheme } from '../store/themeStore';
import { createWidgetStyles, getStateColor } from '../theme/styles/widgetStyles';

type WidgetCardProps = {
  title: string;
  icon: string;
  value?: string | number;
  unit?: string;
  state?: 'normal' | 'alarm' | 'no-data' | 'highlighted';
  secondary?: string;
  children?: React.ReactNode;
  expanded?: boolean; // AC 17: Add expanded prop for chevron display
  isPinned?: boolean; // Story 2.15: Pin state for visual indicator
  onExpandToggle?: () => void; // Story 2.15: Handle tap to expand/collapse
  onPinToggle?: () => void; // Story 2.15: Handle long-press to pin/unpin
  testID?: string;
  // Story 4.4 AC6-10: Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityValue?: { text: string; now?: number; min?: number; max?: number };
};

/**
 * WidgetCard - Pure presentational component for widget content
 * Now designed to work inside WidgetShell wrapper
 * Story 4.4 AC6-10: Full accessibility support for screen readers
 */
export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  value,
  unit,
  state = 'normal',
  secondary,
  children,
  expanded = false,
  isPinned = false,
  onExpandToggle,
  onPinToggle,
  testID = 'widget-card',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  accessibilityValue,
}) => {
  const theme = useTheme();
  const widgetStyles = createWidgetStyles(theme);
  const displayColor = getStateColor(state, theme);

  // Build comprehensive accessibility label if not provided
  const defaultAccessibilityLabel = React.useMemo(() => {
    if (accessibilityLabel) return accessibilityLabel;

    const parts: string[] = [title];

    if (value !== undefined && value !== null && value !== '---' && value !== '--') {
      parts.push(`${value} ${unit || ''}`);
    } else if (state === 'no-data') {
      parts.push('no data available');
    }

    if (secondary) {
      parts.push(secondary);
    }

    // Add state information for critical states
    if (state === 'alarm') {
      parts.push('ALARM');
    } else if (state === 'highlighted') {
      parts.push('WARNING');
    }

    return parts.join(', ');
  }, [accessibilityLabel, title, value, unit, secondary, state]);

  const handleCaretPress = () => {
    onExpandToggle?.();
  };

  const handleCaretLongPress = () => {
    onPinToggle?.();
  };

  return (
    <View
      style={widgetStyles.widgetContainer}
      testID={testID}
      accessible={true}
      accessibilityLabel={defaultAccessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityValue={accessibilityValue}
      accessibilityState={{
        disabled: state === 'no-data',
        selected: expanded,
      }}
      accessibilityLiveRegion={
        state === 'alarm' ? 'assertive' : state === 'highlighted' ? 'polite' : 'none'
      }
    >
      {/* Widget Header with Chevron/Pin Indicator */}
      <View style={widgetStyles.widgetHeader}>
        <UniversalIcon
          name={icon}
          size={12}
          color={theme.textSecondary}
          style={widgetStyles.widgetIcon}
        />
        <Text style={widgetStyles.widgetTitle} testID={`${testID}-title`}>
          {title.toUpperCase()}
        </Text>

        {/* Story 2.15: Pin indicator or chevron */}
        <View
          style={widgetStyles.caretContainer}
          testID={`${testID}-caret`}
          accessible={true}
          accessibilityLabel={isPinned ? 'Pinned' : expanded ? 'Collapse widget' : 'Expand widget'}
          accessibilityHint={isPinned ? 'Widget is pinned' : 'Tap to toggle expansion'}
          accessibilityRole="text"
        >
          {isPinned ? (
            <UniversalIcon name="pin" size={12} color={theme.accent} />
          ) : (
            <Text style={widgetStyles.widgetChevron} testID={`${testID}-chevron`}>
              {expanded ? '⌃' : '⌄'}
            </Text>
          )}
        </View>
      </View>

      {/* Widget Content */}
      <View style={widgetStyles.widgetContent} testID={`${testID}-content`}>
        {/* Primary value display - show when value provided and either no children or value explicitly set */}
        {value !== undefined && (
          <View style={widgetStyles.valueContainer}>
            <Text style={[widgetStyles.metricValue, { color: displayColor }]}>
              {value !== null ? value : '---'}
            </Text>
            {unit && unit.trim() !== '' && <Text style={widgetStyles.metricUnit}>{unit}</Text>}
          </View>
        )}
        {secondary && (
          <Text style={widgetStyles.secondaryText} testID={`${testID}-secondary`}>
            {secondary}
          </Text>
        )}
        {children}
      </View>
    </View>
  );
};

// All styles now managed by widgetStyles.ts - no more hardcoded colors!
