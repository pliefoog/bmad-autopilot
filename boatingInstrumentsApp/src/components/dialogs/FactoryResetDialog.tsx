/**
 * Factory Reset Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 *
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Destructive action confirmation
 * - Clear warning message with bullet points
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal structure
 * - Action button for destructive Factory Reset operation
 * - Confirms via platform-native Alert on mobile platforms
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformSettingsSection } from '../settings';
import { UniversalIcon } from '../atoms/UniversalIcon';

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
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        { cancelable: true, onDismiss: onCancel },
      );
      return;
    }

    // For web and modal display, proceed with the action
    await onConfirm();
  };

  // Use BaseConfigDialog with destructive action button
  return (
    <BaseConfigDialog
      visible={visible}
      title="Factory Reset"
      onClose={onCancel}
      actionButton={{
        label: 'Factory Reset',
        onPress: handleConfirm,
        disabled: false,
        testID: 'factory-reset-confirm-button',
      }}
      testID="factory-reset-dialog"
    >
      {/* Warning Section */}
      <PlatformSettingsSection title="Warning">
        <View style={styles.warningBox}>
          <UniversalIcon
            name="warning-outline"
            size={32}
            color={theme.error}
            style={styles.warningIcon}
          />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>⚠️ Complete Factory Reset</Text>
            <Text style={styles.warningDescription}>
              This action will permanently delete all your custom settings and configurations. This
              cannot be undone!
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
    </BaseConfigDialog>
  );
};

/**
 * Create styles with theme integration
 */
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    warningBox: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.error,
    },
    warningIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    warningTextContainer: {
      flex: 1,
    },
    warningTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.error,
      marginBottom: 8,
    },
    warningDescription: {
      fontSize: 16,
      fontFamily: 'sans-serif',
      color: theme.text,
      lineHeight: 24,
    },
    bulletList: {
      gap: 12,
    },
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bullet: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginRight: 12,
      minWidth: 16,
    },
    bulletText: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'sans-serif',
      color: theme.text,
      lineHeight: 24,
    },
  });
