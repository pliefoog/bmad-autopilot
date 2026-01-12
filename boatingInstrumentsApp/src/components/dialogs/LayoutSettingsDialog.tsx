/**
 * Layout Settings Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 *
 * Consolidated widget lifecycle and layout reset settings
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Platform-adaptive sections (iOS grouped, Android cards, TV flat)
 * - TV remote navigation support
 * - Viewing-distance-optimized typography
 * - Glove-friendly touch targets
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal structure
 * - Uses PlatformToggle for theme-aware toggles
 * - No action button (auto-saves all changes)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useUIStore } from '../../store/uiStore';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformToggle } from './inputs/PlatformToggle';
import { getPlatformTokens } from '../../theme/settingsTokens';

interface LayoutSettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const LayoutSettingsDialog: React.FC<LayoutSettingsDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = React.useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  // Widget store settings
  const {
    enableWidgetAutoRemoval,
    setEnableWidgetAutoRemoval,
    widgetExpirationTimeout,
    setWidgetExpirationTimeout,
  } = useWidgetStore();

  // UI store settings (header auto-hide)
  const autoHideEnabled = useUIStore((state) => state.autoHideEnabled);
  const setAutoHideEnabled = useUIStore((state) => state.setAutoHideEnabled);
  const autoHideTimeoutMs = useUIStore((state) => state.autoHideTimeoutMs);
  const setAutoHideTimeout = useUIStore((state) => state.setAutoHideTimeout);

  // Widget removal timeout state
  const widgetTimeoutMinutes = Math.round(widgetExpirationTimeout / 60000);
  const [selectedWidgetTimeout, setSelectedWidgetTimeout] = React.useState(widgetTimeoutMinutes);

  // Header auto-hide timeout state
  const headerTimeoutSeconds = Math.round(autoHideTimeoutMs / 1000);
  const [selectedHeaderTimeout, setSelectedHeaderTimeout] = React.useState(headerTimeoutSeconds);

  const handleWidgetTimeoutChange = (minutes: number) => {
    setSelectedWidgetTimeout(minutes);
    setWidgetExpirationTimeout(minutes * 60000);
  };

  const handleHeaderTimeoutChange = (seconds: number) => {
    setSelectedHeaderTimeout(seconds);
    setAutoHideTimeout(seconds * 1000);
  };

  const widgetTimeoutOptions = [
    { label: '1 min', value: 1 },
    { label: '2 min', value: 2 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
  ];

  const headerTimeoutOptions = [
    { label: '3 sec', value: 3 },
    { label: '5 sec', value: 5 },
    { label: '10 sec', value: 10 },
    { label: '15 sec', value: 15 },
    { label: '30 sec', value: 30 },
    { label: '1 min', value: 60 },
  ];

  return (
    <BaseConfigDialog
      visible={visible}
      title="Layout Settings"
      onClose={onClose}
      testID="layout-settings-dialog"
    >
      {/* App Header Card */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>Header</Text>
            <Text style={styles.titleSeparator}> - </Text>
            <Text style={styles.settingLabel}>Auto-hide</Text>
          </View>
          <View style={styles.toggleWrapper}>
            <PlatformToggle
              value={autoHideEnabled}
              onValueChange={setAutoHideEnabled}
              testID="auto-hide-toggle"
              scale={0.75}
            />
          </View>
        </View>

        {autoHideEnabled && (
          <>
            <View style={styles.settingGroup}>
              <Text style={styles.groupLabel}>Inactivity timeout</Text>
              <View style={styles.optionGrid}>
                {headerTimeoutOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      selectedHeaderTimeout === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => handleHeaderTimeoutChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        selectedHeaderTimeout === option.value && styles.optionButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.hintText}>
              Tap top of screen to reveal header when hidden
            </Text>
          </>
        )}
      </View>

      {/* Widget Lifecycle Card */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>Widget</Text>
            <Text style={styles.titleSeparator}> - </Text>
            <Text style={styles.settingLabel}>Auto-remove</Text>
          </View>
          <View style={styles.toggleWrapper}>
            <PlatformToggle
              value={enableWidgetAutoRemoval}
              onValueChange={setEnableWidgetAutoRemoval}
              testID="auto-remove-toggle"
              scale={0.75}
            />
          </View>
        </View>

        {enableWidgetAutoRemoval && (
          <View style={styles.settingGroup}>
            <Text style={styles.groupLabel}>Inactivity timeout</Text>
            <View style={styles.optionGrid}>
              {widgetTimeoutOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selectedWidgetTimeout === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => handleWidgetTimeoutChange(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      selectedWidgetTimeout === option.value && styles.optionButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </BaseConfigDialog>
  );
};

/**
 * Create styles with theme integration
 */
const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: platformTokens.borderRadius.card,
      padding: 8,
      marginBottom: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }),
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    titleSeparator: {
      fontSize: 15,
      fontWeight: '400',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    toggleWrapper: {
      flexShrink: 0,
      marginLeft: 8,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    settingLabel: {
      fontSize: platformTokens.typography.label.fontSize,
      fontWeight: platformTokens.typography.label.fontWeight,
      lineHeight: platformTokens.typography.label.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      flex: 1,
    },
    settingGroup: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    groupLabel: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '500',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: theme.border,
      minWidth: 60,
      alignItems: 'center',
    },
    optionButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    optionButtonText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    optionButtonTextActive: {
      color: theme.textInverse,
    },
    hintText: {
      fontSize: platformTokens.typography.hint.fontSize,
      fontWeight: platformTokens.typography.hint.fontWeight,
      lineHeight: platformTokens.typography.hint.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      fontStyle: platformTokens.typography.hint.fontStyle,
      color: theme.textSecondary,
      marginTop: 12,
    },
  });
