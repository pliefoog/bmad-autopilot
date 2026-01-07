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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useUIStore } from '../../store/uiStore';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformSettingsSection, PlatformSettingsRow } from '../settings';
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

  const [focusedWidgetIndex, setFocusedWidgetIndex] = React.useState(
    widgetTimeoutOptions.findIndex((opt) => opt.value === selectedWidgetTimeout),
  );

  const [focusedHeaderIndex, setFocusedHeaderIndex] = React.useState(
    headerTimeoutOptions.findIndex((opt) => opt.value === selectedHeaderTimeout),
  );

  return (
    <BaseConfigDialog
      visible={visible}
      title="Layout Settings"
      onClose={onClose}
      testID="layout-settings-dialog"
    >
      {/* Header Auto-Hide Section */}
      <PlatformSettingsSection 
        title="Header Visibility" 
        style={styles.section}
      >
        <PlatformSettingsRow
          label="Auto-hide after inactivity"
          control={
            <PlatformToggle
              value={autoHideEnabled}
              onValueChange={setAutoHideEnabled}
              label="Auto-hide header"
              testID="auto-hide-toggle"
            />
          }
          isFirst
          isLast={!autoHideEnabled}
        />

        {autoHideEnabled && (
          <View style={styles.timeoutContainer}>
            <Text style={styles.timeoutLabel}>
              Hide after: {selectedHeaderTimeout} {selectedHeaderTimeout === 1 ? 'second' : 'seconds'}
            </Text>
            <View style={styles.timeoutOptions}>
              {headerTimeoutOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeoutOption,
                    selectedHeaderTimeout === option.value && styles.timeoutOptionActive,
                    focusedHeaderIndex === index && styles.timeoutOptionFocused,
                  ]}
                  onPress={() => {
                    handleHeaderTimeoutChange(option.value);
                    setFocusedHeaderIndex(index);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeoutOptionText,
                      selectedHeaderTimeout === option.value && styles.timeoutOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hintText}>
              Tap top of screen to reveal header when hidden
            </Text>
          </View>
        )}
      </PlatformSettingsSection>

      {/* Widget Auto-Removal Section */}
      <PlatformSettingsSection 
        title="Widget Lifecycle" 
        style={styles.section}
      >
        <PlatformSettingsRow
          label="Remove widgets without data"
          control={
            <PlatformToggle
              value={enableWidgetAutoRemoval}
              onValueChange={setEnableWidgetAutoRemoval}
              label="Auto-remove stale widgets"
              testID="auto-remove-toggle"
            />
          }
          isFirst
          isLast={!enableWidgetAutoRemoval}
        />

        {enableWidgetAutoRemoval && (
          <View style={styles.timeoutContainer}>
            <Text style={styles.timeoutLabel}>
              Remove after: {selectedWidgetTimeout} {selectedWidgetTimeout === 1 ? 'minute' : 'minutes'}
            </Text>
            <View style={styles.timeoutOptions}>
              {widgetTimeoutOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeoutOption,
                    selectedWidgetTimeout === option.value && styles.timeoutOptionActive,
                    focusedWidgetIndex === index && styles.timeoutOptionFocused,
                  ]}
                  onPress={() => {
                    handleWidgetTimeoutChange(option.value);
                    setFocusedWidgetIndex(index);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeoutOptionText,
                      selectedWidgetTimeout === option.value && styles.timeoutOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </PlatformSettingsSection>
    </BaseConfigDialog>
  );
};

/**
 * Create styles with theme integration
 */
const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    section: {
      marginBottom: 0,
    },
    timeoutContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    timeoutLabel: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: platformTokens.typography.body.fontWeight,
      lineHeight: platformTokens.typography.body.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    hintText: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontWeight: platformTokens.typography.caption.fontWeight,
      lineHeight: platformTokens.typography.caption.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
      fontStyle: 'italic',
      marginTop: 12,
    },
    timeoutOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    timeoutOption: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    timeoutOptionActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    timeoutOptionFocused: {
      borderWidth: 4,
      borderColor: theme.interactive,
    },
    timeoutOptionText: {
      fontSize: platformTokens.typography.label.fontSize,
      fontWeight: platformTokens.typography.label.fontWeight,
      lineHeight: platformTokens.typography.label.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    timeoutOptionTextActive: {
      color: '#FFFFFF',
    },
  });
