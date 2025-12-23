/**
 * Platform Settings Row Component
 * Epic 8 - Phase 1: Cross-Platform Dialog Unification
 *
 * Platform-native row for settings items
 * iOS: Clean row with label/value, disclosure indicator
 * Android: Material row with prominent touch targets
 * TV: Large touch targets with focus borders
 *
 * @example
 * ```tsx
 * <PlatformSettingsRow
 *   label="IP Address"
 *   value="192.168.1.100"
 *   onPress={() => handleEdit()}
 *   disclosure
 * />
 *
 * <PlatformSettingsRow
 *   label="Enable WiFi"
 *   control={<PlatformToggle value={enabled} onValueChange={setEnabled} />}
 * />
 * ```
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { getPlatformTokens, touchTargets } from '../../theme/settingsTokens';
import { getPlatformVariant, isTV } from '../../utils/platformDetection';

interface PlatformSettingsRowProps {
  /** Row label */
  label: string;

  /** Optional value text (right side) */
  value?: string;

  /** Optional control component (switch, picker, etc.) */
  control?: React.ReactNode;

  /** Show disclosure indicator (chevron) */
  disclosure?: boolean;

  /** Callback when row is pressed */
  onPress?: () => void;

  /** Whether row is disabled */
  disabled?: boolean;

  /** Whether this is the first row in section */
  isFirst?: boolean;

  /** Whether this is the last row in section */
  isLast?: boolean;

  /** Additional container style */
  style?: ViewStyle;

  /** TV focus state (for TV navigation) */
  focused?: boolean;

  /** Test ID */
  testID?: string;
}

/**
 * Platform Settings Row
 * Renders platform-appropriate settings row
 */
export const PlatformSettingsRow: React.FC<PlatformSettingsRowProps> = ({
  label,
  value,
  control,
  disclosure = false,
  onPress,
  disabled = false,
  isFirst = false,
  isLast = false,
  style,
  focused = false,
  testID = 'platform-settings-row',
}) => {
  const theme = useTheme();
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const platformTokens = getPlatformTokens();
  const variant = getPlatformVariant();
  const tvMode = isTV();

  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, variant, tvMode, gloveMode, focused),
    [theme, platformTokens, variant, tvMode, gloveMode, focused],
  );

  const content = (
    <View style={[styles.content, isFirst && styles.firstRow, isLast && styles.lastRow]}>
      {/* Label */}
      <Text style={[styles.label, disabled && styles.disabledText]} numberOfLines={1}>
        {label}
      </Text>

      {/* Right side: value, control, or disclosure */}
      <View style={styles.rightContainer}>
        {value && (
          <Text style={[styles.value, disabled && styles.disabledText]} numberOfLines={1}>
            {value}
          </Text>
        )}
        {control && <View style={styles.control}>{control}</View>}
        {disclosure && !control && (
          <UniversalIcon
            name="chevron-forward"
            size={tvMode ? 32 : 20}
            color={disabled ? theme.textSecondary : theme.textTertiary}
            style={styles.disclosure}
          />
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.container, style]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${value}` : ''}`}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {content}
    </View>
  );
};

/**
 * Create platform-specific styles
 */
function createStyles(
  theme: ThemeColors,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  variant: ReturnType<typeof getPlatformVariant>,
  tvMode: boolean,
  gloveMode: boolean,
  focused: boolean,
) {
  const isIOS = variant.startsWith('ios');
  const isAndroid = variant.startsWith('android');

  // Touch target height based on platform and mode
  const touchTarget = gloveMode
    ? touchTargets.glove
    : tvMode
    ? touchTargets.tv
    : platformTokens.touchTarget;

  return StyleSheet.create({
    container: {
      // TV: Focus border
      ...(tvMode &&
        focused && {
          borderWidth: 4,
          borderColor: theme.interactive,
          borderRadius: 8,
        }),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: touchTarget,
      paddingHorizontal: platformTokens.spacing.inset,
      paddingVertical: platformTokens.spacing.row,

      // iOS: Separator between rows
      ...(isIOS &&
        !tvMode && {
          backgroundColor: theme.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        }),

      // Android: No separator (card handles spacing)
      ...(isAndroid &&
        !tvMode && {
          backgroundColor: theme.surface,
        }),

      // TV: Prominent background
      ...(tvMode && {
        backgroundColor: focused ? theme.surfaceHighlight : theme.surface,
        borderRadius: 8,
        marginBottom: 4,
      }),
    },
    firstRow: {
      // iOS: No top border on first row
      ...(isIOS &&
        !tvMode && {
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }),

      // Android: Top radius on first row
      ...(isAndroid &&
        !tvMode && {
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }),
    },
    lastRow: {
      // Remove bottom border on last row
      borderBottomWidth: 0,

      // iOS: Bottom radius on last row
      ...(isIOS &&
        !tvMode && {
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }),

      // Android: Bottom radius on last row
      ...(isAndroid &&
        !tvMode && {
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }),
    },
    label: {
      flex: 1,
      fontSize: platformTokens.typography.label.fontSize,
      fontWeight: platformTokens.typography.label.fontWeight,
      lineHeight: platformTokens.typography.label.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    rightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: platformTokens.spacing.row,
    },
    value: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: platformTokens.typography.body.fontWeight,
      lineHeight: platformTokens.typography.body.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
      marginRight: 8,
    },
    control: {
      // Control components handle their own sizing
    },
    disclosure: {
      marginLeft: 4,
    },
    disabledText: {
      opacity: 0.4,
    },
  });
}
