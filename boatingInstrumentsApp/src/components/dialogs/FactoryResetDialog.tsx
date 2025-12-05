/**
 * Factory Reset Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 * 
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Destructive action confirmation
 * - Clear warning message with bullet points
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { BaseSettingsModal } from './base/BaseSettingsModal';
import { PlatformSettingsSection } from '../settings';
import { PlatformButton } from './inputs/PlatformButton';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { isTV } from '../../utils/platformDetection';

interface FactoryResetDialogProps {
  visible: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const FactoryResetDialog: React.FC<FactoryResetDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = useMemo(
    () => createStyles(theme, platformTokens, tvMode),
    [theme, platformTokens, tvMode]
  );

  const handleConfirm = async () => {
    // For mobile platforms, use React Native Alert instead of the modal
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Factory Reset Confirmation',
        'This will completely restore the app to its initial state:\n\n' +
        '• All widgets will be removed\n' +
        '• Dashboard layouts will be reset\n' +
        '• All settings will be cleared\n' +
        '• Connection settings will be reset\n' +
        '• App will return to first-launch state\n' +
        '• Setup wizard will appear again\n\n' +
        'This action cannot be undone!',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Factory Reset',
            style: 'destructive',
            onPress: onConfirm,
          },
        ],
        { cancelable: true, onDismiss: onCancel }
      );
      return;
    }
    
    // For web and modal display, proceed with the action
    await onConfirm();
  };

  // Use platform-native modal
  return (
    <BaseSettingsModal
      visible={visible}
      title="Factory Reset"
      onClose={onCancel}
      showFooter={false}
      testID="factory-reset-dialog"
    >
      {/* Warning Section */}
      <PlatformSettingsSection title="Warning">
        <View style={styles.warningBox}>
          <UniversalIcon 
            name="warning-outline" 
            size={platformTokens.typography.body.fontSize * 2} 
            color={theme.error} 
            style={styles.warningIcon}
          />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>⚠️ Complete Factory Reset</Text>
            <Text style={styles.warningDescription}>
              This action will permanently delete all your custom settings and configurations.
              This cannot be undone!
            </Text>
          </View>
        </View>
      </PlatformSettingsSection>

      {/* What Will Be Reset Section */}
      <PlatformSettingsSection title="What Will Be Reset">
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>All widget positions and sizes</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Display units (speed, depth, wind, etc.)</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Widget lifecycle settings</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Alarm configurations</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Connection settings (IP address, port)</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Display theme preferences</Text>
          </View>
        </View>
      </PlatformSettingsSection>

      {/* What Will Be Preserved Section */}
      <PlatformSettingsSection title="What Will Be Preserved">
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>✓</Text>
            <Text style={styles.bulletText}>App installation and data</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>✓</Text>
            <Text style={styles.bulletText}>Device system settings</Text>
          </View>
        </View>
      </PlatformSettingsSection>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <PlatformButton
              variant="secondary"
              onPress={onCancel}
              title="Cancel"
              testID="factory-reset-cancel-button"
            />
          </View>
          <View style={styles.buttonWrapper}>
            <PlatformButton
              variant="danger"
              onPress={handleConfirm}
              title="Factory Reset"
              icon="warning-outline"
              testID="factory-reset-confirm-button"
            />
          </View>
        </View>
      </View>
    </BaseSettingsModal>
  );
};

/**
 * Create platform-aware styles
 */
const createStyles = (
  theme: ThemeColors,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  tvMode: boolean
) =>
  StyleSheet.create({
    warningBox: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: platformTokens.spacing.inset,
      borderWidth: 2,
      borderColor: theme.error,
    },
    warningIcon: {
      marginRight: platformTokens.spacing.row,
      marginTop: 2,
    },
    warningTextContainer: {
      flex: 1,
    },
    warningTitle: {
      fontSize: platformTokens.typography.body.fontSize * 1.1,
      fontWeight: '700',
      color: theme.error,
      marginBottom: platformTokens.spacing.row * 0.5,
    },
    warningDescription: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      lineHeight: platformTokens.typography.body.lineHeight * 1.5,
    },
    bulletList: {
      gap: platformTokens.spacing.row * 0.75,
    },
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bullet: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '700',
      color: theme.text,
      marginRight: platformTokens.spacing.row * 0.75,
      minWidth: 16,
    },
    bulletText: {
      flex: 1,
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      lineHeight: platformTokens.typography.body.lineHeight * 1.5,
    },
    actionContainer: {
      marginTop: platformTokens.spacing.row,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: platformTokens.spacing.row,
    },
    buttonWrapper: {
      flex: 1,
    },
  });