/**
 * Platform Section Header Component
 * Epic 8 - Phase 1: Cross-Platform Dialog Unification
 * 
 * Platform-native section header for settings
 * iOS: Uppercase, small, gray text above section
 * Android: Prominent colored text with bottom padding
 * TV: Large prominent text with extra spacing
 */

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { getPlatformVariant, isTV } from '../../utils/platformDetection';

interface PlatformSectionHeaderProps {
  /** Section title */
  title: string;
  
  /** Test ID */
  testID?: string;
}

/**
 * Platform Section Header
 * Renders platform-appropriate section header
 */
export const PlatformSectionHeader: React.FC<PlatformSectionHeaderProps> = ({
  title,
  testID = 'platform-section-header',
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const variant = getPlatformVariant();
  const tvMode = isTV();
  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, variant, tvMode),
    [theme, platformTokens, variant, tvMode]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
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
  tvMode: boolean
) {
  const isIOS = variant.startsWith('ios');
  const isAndroid = variant.startsWith('android');

  return StyleSheet.create({
    container: {
      // iOS: Compact header above section
      ...(isIOS && !tvMode && {
        paddingTop: 12,
        paddingBottom: 6,
        paddingHorizontal: platformTokens.spacing.inset,
      }),
      
      // Android: Prominent header with spacing
      ...(isAndroid && !tvMode && {
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: platformTokens.spacing.inset,
      }),
      
      // TV: Extra large spacing
      ...(tvMode && {
        paddingTop: platformTokens.spacing.section,
        paddingBottom: platformTokens.spacing.row,
        paddingHorizontal: platformTokens.spacing.inset,
      }),
    },
    title: {
      fontFamily: platformTokens.typography.fontFamily,
      
      // iOS: Uppercase, small, secondary text
      ...(isIOS && !tvMode && {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
        color: theme.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }),
      
      // Android: Prominent, colored text
      ...(isAndroid && !tvMode && {
        fontSize: platformTokens.typography.sectionHeader.fontSize,
        fontWeight: platformTokens.typography.sectionHeader.fontWeight,
        lineHeight: platformTokens.typography.sectionHeader.lineHeight,
        color: theme.interactive,
      }),
      
      // TV: Large prominent text
      ...(tvMode && {
        fontSize: platformTokens.typography.sectionHeader.fontSize,
        fontWeight: platformTokens.typography.sectionHeader.fontWeight,
        lineHeight: platformTokens.typography.sectionHeader.lineHeight,
        color: theme.text,
      }),
    },
  });
}
