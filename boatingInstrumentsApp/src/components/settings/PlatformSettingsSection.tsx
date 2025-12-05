/**
 * Platform Settings Section Component
 * Epic 8 - Phase 1: Cross-Platform Dialog Unification
 * 
 * Platform-native section container for settings
 * iOS: Grouped list style with rounded corners and inset background
 * Android: Material Design card with elevation
 * TV: Flat list with prominent spacing
 * 
 * @example
 * ```tsx
 * <PlatformSettingsSection title="Connection">
 *   <PlatformSettingsRow label="IP Address" value="192.168.1.100" />
 *   <PlatformSettingsRow label="Port" value="10110" />
 * </PlatformSettingsSection>
 * ```
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { getPlatformVariant, isTV } from '../../utils/platformDetection';
import { PlatformSectionHeader } from './PlatformSectionHeader';

interface PlatformSettingsSectionProps {
  /** Section title (optional) */
  title?: string;
  
  /** Section content */
  children: React.ReactNode;
  
  /** Additional container style */
  style?: ViewStyle;
  
  /** Test ID */
  testID?: string;
}

/**
 * Platform Settings Section
 * Renders platform-appropriate section container
 */
export const PlatformSettingsSection: React.FC<PlatformSettingsSectionProps> = ({
  title,
  children,
  style,
  testID = 'platform-settings-section',
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
    <View style={[styles.container, style]} testID={testID}>
      {title && <PlatformSectionHeader title={title} />}
      <View style={styles.content} testID={`${testID}-content`}>
        {children}
      </View>
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
      marginBottom: platformTokens.spacing.section,
    },
    content: {
      // iOS: Grouped list style
      ...(isIOS && !tvMode && {
        backgroundColor: theme.surface,
        borderRadius: 10,
        overflow: 'hidden',
        // iOS inset shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }),
      
      // Android: Material card
      ...(isAndroid && !tvMode && {
        backgroundColor: theme.surface,
        borderRadius: 12,
        elevation: 2,
        overflow: 'hidden',
      }),
      
      // TV: Flat list (no container styling)
      ...(tvMode && {
        backgroundColor: 'transparent',
      }),
    },
  });
}
