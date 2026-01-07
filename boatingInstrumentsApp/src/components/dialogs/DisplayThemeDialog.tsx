/**
 * Display & Theme Settings Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 *
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Coming soon placeholder for theme selection
 * - Future: Theme widget functionality + accessibility settings
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal structure
 * - No action button (informational dialog only)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformSettingsSection } from '../settings';
import { getPlatformTokens } from '../../theme/settingsTokens';

interface DisplayThemeDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const DisplayThemeDialog: React.FC<DisplayThemeDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = React.useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Display & Theme"
      onClose={onClose}
      testID="display-theme-dialog"
    >
      <PlatformSettingsSection title="Coming Soon">
        <View style={styles.infoBox}>
          <UniversalIcon
            name="information-circle-outline"
            size={24}
            color={theme.primary}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            This dialog will include:{'\n\n'}• Theme selection (Day/Night/Red-Night/Auto){'\n'}•
            Brightness control{'\n'}• Font size adjustment{'\n'}• Accessibility settings{'\n'}
            {'  '}- High contrast mode{'\n'}
            {'  '}- Reduce animations{'\n'}
            {'  '}- Large text{'\n'}
            {'  '}- Glove mode{'\n'}
            {'  '}- Haptic feedback{'\n'}
            {'  '}- Marine mode
          </Text>
        </View>
      </PlatformSettingsSection>
    </BaseConfigDialog>
  );
};

/**
 * Create styles with theme integration
 */
const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    infoBox: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    infoIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: platformTokens.typography.body.fontWeight,
      lineHeight: platformTokens.typography.body.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
  });
