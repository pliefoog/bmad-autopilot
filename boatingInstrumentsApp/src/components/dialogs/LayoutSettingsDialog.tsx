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
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseSettingsModal } from './base/BaseSettingsModal';
import { 
  PlatformSettingsSection, 
  PlatformSettingsRow 
} from '../settings';
import { PlatformButton } from './inputs/PlatformButton';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { isTV } from '../../utils/platformDetection';
import { useTVFocusManager } from '../../hooks/useTVFocusManager';

interface LayoutSettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const LayoutSettingsDialog: React.FC<LayoutSettingsDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = React.useMemo(
    () => createStyles(theme, platformTokens, tvMode),
    [theme, platformTokens, tvMode]
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

  // TV focus management for timeout options
  const {
    focusedIndex,
    setFocusedIndex,
  } = useTVFocusManager({
    itemCount: timeoutOptions.length,
    initialIndex: timeoutOptions.findIndex(opt => opt.value === selectedTimeout),
    onSelect: (index) => handleTimeoutChange(timeoutOptions[index].value),
    enabled: tvMode && enableWidgetAutoRemoval,
  });

  return (
    <BaseSettingsModal
      visible={visible}
      title="Layout Settings"
      onClose={onClose}
      showFooter={false}
      testID="layout-settings-dialog"
    >
      {/* Layout Mode Section */}
      <PlatformSettingsSection title="Layout Mode">
        <View style={styles.infoBox}>
          <UniversalIcon 
            name="information-circle-outline" 
            size={platformTokens.typography.body.fontSize * 1.5} 
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
                    tvMode && focusedIndex === index && styles.timeoutOptionFocused,
                  ]}
                  onPress={() => {
                    handleTimeoutChange(option.value);
                    if (tvMode) setFocusedIndex(index);
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
    infoBox: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: platformTokens.spacing.row,
      marginBottom: platformTokens.spacing.row,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    infoIcon: {
      marginRight: platformTokens.spacing.row,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      lineHeight: platformTokens.typography.body.lineHeight,
    },
    resetButtonContainer: {
      marginTop: platformTokens.spacing.row,
    },
    timeoutContainer: {
      marginTop: platformTokens.spacing.row,
      paddingTop: platformTokens.spacing.row,
      paddingHorizontal: platformTokens.spacing.inset,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    timeoutLabel: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.textSecondary,
      marginBottom: platformTokens.spacing.row,
    },
    timeoutOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: platformTokens.spacing.row,
    },
    timeoutOption: {
      paddingHorizontal: tvMode ? 24 : 16,
      paddingVertical: tvMode ? 16 : 8,
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
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      fontWeight: '500',
    },
    timeoutOptionTextActive: {
      color: '#FFFFFF',
    },
    closeButtonContainer: {
      marginTop: platformTokens.spacing.section,
    },
  });
