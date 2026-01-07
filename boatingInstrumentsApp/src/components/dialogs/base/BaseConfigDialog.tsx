/**
 * Base Config Dialog Component
 *
 * Reusable foundation for configuration dialogs with consistent structure:
 * - Standard Modal wrapper with pageSheet presentation
 * - Header with close button and title
 * - Optional action button (Connect, Save, etc.)
 * - ScrollView content area
 * - Consistent styling across all config dialogs
 *
 * **Architecture Decision:**
 * This component was created to eliminate ~260 lines of duplicate Modal/header/footer
 * code across ConnectionConfigDialog, UnitsConfigDialog, and SensorConfigDialog.
 *
 * **Component Purpose:**
 * Provides consistent Modal structure for all configuration dialogs across the app.
 * All 7 dialogs now use this component: ConnectionConfigDialog, UnitsConfigDialog, SensorConfigDialog,
 * LayoutSettingsDialog, FactoryResetDialog, DisplayThemeDialog, AlarmHistoryDialog
 *
 * **Usage:**
 * ```tsx
 * <BaseConfigDialog
 *   visible={visible}
 *   title="Connection Settings"
 *   onClose={handleClose}
 *   actionButton={{
 *     label: "Connect",
 *     onPress: handleConnect,
 *     disabled: !isValid
 *   }}
 * >
 *   {/* Your dialog content here *\/}
 * </BaseConfigDialog>
 * ```
 */

import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme, ThemeColors } from '../../../store/themeStore';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { getPlatformTokens } from '../../../theme/settingsTokens';

export interface BaseConfigDialogProps {
  /** Controls modal visibility */
  visible: boolean;

  /** Dialog title displayed in header */
  title: string;

  /** Callback when dialog is closed (X button or backdrop) */
  onClose: () => void;

  /** Optional action button configuration (Connect, Save, etc.) */
  actionButton?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    testID?: string;
  };

  /** Dialog content */
  children: React.ReactNode;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Base Config Dialog
 *
 * Provides consistent Modal structure for all configuration dialogs.
 * Handles header, close button, optional action button, and scrollable content area.
 */
export const BaseConfigDialog: React.FC<BaseConfigDialogProps> = ({
  visible,
  title,
  onClose,
  actionButton,
  children,
  testID,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          {/* Close Button (Left) */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityLabel="Close dialog"
            accessibilityRole="button"
            testID={`${testID}-close-button`}
          >
            <UniversalIcon name="close" size={24} color={theme.text} />
            <Text style={[styles.headerButtonText, { color: theme.text }]}>Done</Text>
          </TouchableOpacity>

          {/* Title (Center) */}
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          {/* Action Button (Right) or Spacer */}
          {actionButton ? (
            <TouchableOpacity
              style={[styles.headerButton, actionButton.disabled && styles.headerButtonDisabled]}
              onPress={actionButton.onPress}
              disabled={actionButton.disabled}
              accessibilityLabel={actionButton.label}
              accessibilityRole="button"
              testID={actionButton.testID || `${testID}-action-button`}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                {actionButton.label}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
};

// === STYLES ===

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      minHeight: 56,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 8,
      minWidth: 80,
      opacity: 1,
    },
    headerButtonDisabled: {
      opacity: 0.5,
    },
    headerButtonText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      flex: 1,
      textAlign: 'center',
    },
    actionButtonText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 0,
      paddingBottom: 20,
    },
  });
