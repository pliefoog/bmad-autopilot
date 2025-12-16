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
 * - No action button (contains embedded PlatformButton controls)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { 
  PlatformSettingsSection, 
  PlatformSettingsRow 
} from '../settings';
import { PlatformButton } from './inputs/PlatformButton';

interface LayoutSettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const LayoutSettingsDialog: React.FC<LayoutSettingsDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(
    () => createStyles(theme),
    [theme]
  );
  
  const {
    resetLayoutToAutoDiscovery,
    enableWidgetAutoRemoval,
    setEnableWidgetAutoRemoval,
    widgetExpirationTimeout,
    setWidgetExpirationTimeout,
  } = useWidgetStore();

  const dashboardConfig = useWidgetStore(state => state.dashboard);

  const timeoutMinutes = Math.round(widgetExpirationTimeout / 60000);
  const [selectedTimeout, setSelectedTimeout] = React.useState(timeoutMinutes);

  const handleTimeoutChange = (minutes: number) => {
    setSelectedTimeout(minutes);
    setWidgetExpirationTimeout(minutes * 60000);
  };

  const handleResetLayout = () => {
    resetLayoutToAutoDiscovery();
    onClose();
  };

  const timeoutOptions = [
    { label: '1 min', value: 1 },
    { label: '2 min', value: 2 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
  ];

  const [focusedIndex, setFocusedIndex] = React.useState(
    timeoutOptions.findIndex(opt => opt.value === selectedTimeout)
  );

  return (
    <BaseConfigDialog
      visible={visible}
      title="Layout Settings"
      onClose={onClose}
      testID="layout-settings-dialog"
    >
      {/* Layout Mode Section */}
      <PlatformSettingsSection title="Layout Mode">
        <View style={styles.infoBox}>
          <UniversalIcon 
            name="information-circle-outline" 
            size={24} 
            color={theme.primary} 
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            {dashboardConfig?.userPositioned
              ? 'Custom layout active. Long-press widgets to rearrange.'
              : 'Auto-discovery mode: widgets appear automatically based on NMEA data.'}
          </Text>
        </View>

        {dashboardConfig?.userPositioned && (
          <View style={styles.resetButtonContainer}>
            <PlatformButton
              title="Reset to Auto Layout"
              variant="danger"
              onPress={handleResetLayout}
              icon="refresh"
              fullWidth
              testID="reset-layout-button"
            />
          </View>
        )}
      </PlatformSettingsSection>

      {/* Widget Lifecycle Section */}
      <PlatformSettingsSection title="Widget Lifecycle">
        <PlatformSettingsRow
          label="Auto-remove stale widgets"
          control={
            <Switch
              value={enableWidgetAutoRemoval}
              onValueChange={setEnableWidgetAutoRemoval}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.surface}
            />
          }
          isFirst
          isLast={!enableWidgetAutoRemoval}
        />
        
        {enableWidgetAutoRemoval && (
          <View style={styles.timeoutContainer}>
            <Text style={styles.timeoutLabel}>
              Expiration timeout: {selectedTimeout} {selectedTimeout === 1 ? 'minute' : 'minutes'}
            </Text>
            <View style={styles.timeoutOptions}>
              {timeoutOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeoutOption,
                    selectedTimeout === option.value && styles.timeoutOptionActive,
                    focusedIndex === index && styles.timeoutOptionFocused,
                  ]}
                  onPress={() => {
                    handleTimeoutChange(option.value);
                    setFocusedIndex(index);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeoutOptionText,
                      selectedTimeout === option.value && styles.timeoutOptionTextActive,
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

      {/* Close Button */}
      <View style={styles.closeButtonContainer}>
        <PlatformButton
          title="Done"
          variant="primary"
          onPress={onClose}
          fullWidth
          testID="done-button"
        />
      </View>
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
      marginBottom: 16,
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
    resetButtonContainer: {
      marginTop: 16,
    },
    timeoutContainer: {
      marginTop: 16,
      paddingTop: 16,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    timeoutLabel: {
      fontSize: 16,
      fontFamily: 'sans-serif',
      color: theme.textSecondary,
      marginBottom: 12,
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
      fontSize: 14,
      fontFamily: 'sans-serif',
      color: theme.text,
      fontWeight: '500',
    },
    timeoutOptionTextActive: {
      color: '#FFFFFF',
    },
    closeButtonContainer: {
      marginTop: 24,
    },
  });
