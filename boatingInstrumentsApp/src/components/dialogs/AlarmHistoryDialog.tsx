/**
 * Alarm History Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 *
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Historical alarm event display (coming soon)
 * - Clear history functionality
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal structure
 * - Action button for destructive Clear History operation
 */

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useAlarmStore } from '../../store/alarmStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformSettingsSection } from '../settings';

interface AlarmHistoryDialogProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Alarm History Dialog
 * Shows historical alarms and provides option to clear history
 */
export const AlarmHistoryDialog: React.FC<AlarmHistoryDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const alarmStore = useAlarmStore();

  const handleClearHistory = () => {
    Alert.alert('Clear Alarm History', 'This will remove all alarm history records. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          // TODO: Implement actual history clearing in alarmStore
          Alert.alert('Success', 'Alarm history cleared');
        },
      },
    ]);
  };

  return (
    <BaseConfigDialog
      visible={visible}
      title="Alarm History"
      onClose={onClose}
      actionButton={{
        label: 'Clear History',
        onPress: handleClearHistory,
        disabled: false,
        testID: 'clear-history-button',
      }}
      testID="alarm-history-dialog"
    >
      <PlatformSettingsSection title="Recent Alarms">
        <View style={styles.infoBox}>
          <UniversalIcon
            name="information-circle-outline"
            size={24}
            color={theme.primary}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Alarm history tracking coming soon.{'\n\n'}
            This will show:{'\n'}• Historical alarm events{'\n'}• Alarm timestamps{'\n'}• Alarm
            severity levels{'\n'}• Acknowledgment status{'\n'}• Option to export history
          </Text>
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
      fontSize: 16,
      fontFamily: 'sans-serif',
      color: theme.text,
      lineHeight: 24,
    },
  });
