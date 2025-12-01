import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { useWidgetStore } from '../store/widgetStore';
import { useTheme, ThemeColors } from '../store/themeStore';
import UniversalIcon from './atoms/UniversalIcon';

interface DashboardSettingsMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const DashboardSettingsMenu: React.FC<DashboardSettingsMenuProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  const {
    resetLayoutToAutoDiscovery,
    enableWidgetAutoRemoval,
    setEnableWidgetAutoRemoval,
    widgetExpirationTimeout,
    setWidgetExpirationTimeout,
  } = useWidgetStore();

  const dashboardConfig = useWidgetStore(state => 
    state.dashboards.find(d => d.id === state.currentDashboard)
  );

  // Convert timeout from ms to minutes for display
  const timeoutMinutes = Math.round(widgetExpirationTimeout / 60000);
  const [selectedTimeout, setSelectedTimeout] = useState(timeoutMinutes);

  const handleResetLayout = () => {
    Alert.alert(
      'Reset to Auto Layout',
      'This will remove all custom widget positioning and return to automatic discovery order. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetLayoutToAutoDiscovery();
            onClose();
          },
        },
      ]
    );
  };

  const handleTimeoutChange = (minutes: number) => {
    setSelectedTimeout(minutes);
    setWidgetExpirationTimeout(minutes * 60000);
  };

  const timeoutOptions = [
    { label: '1 min', value: 1 },
    { label: '2 min', value: 2 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.menuContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Dashboard Settings</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <UniversalIcon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Layout Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Layout</Text>
              
              <View style={styles.infoBox}>
                <UniversalIcon 
                  name="information-circle-outline" 
                  size={20} 
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
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetLayout}
                  activeOpacity={0.7}
                >
                  <UniversalIcon 
                    name="refresh" 
                    size={20} 
                    color={theme.error} 
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.resetButtonText}>Reset to Auto Layout</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Auto-Removal Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Widget Lifecycle</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingText}>Auto-remove stale widgets</Text>
                  <Text style={styles.settingDescription}>
                    Remove widgets when no data received
                  </Text>
                </View>
                <Switch
                  value={enableWidgetAutoRemoval}
                  onValueChange={setEnableWidgetAutoRemoval}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.surface}
                />
              </View>

              {enableWidgetAutoRemoval && (
                <View style={styles.timeoutContainer}>
                  <Text style={styles.timeoutLabel}>
                    Expiration timeout: {selectedTimeout} {selectedTimeout === 1 ? 'minute' : 'minutes'}
                  </Text>
                  <View style={styles.timeoutOptions}>
                    {timeoutOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.timeoutOption,
                          selectedTimeout === option.value && styles.timeoutOptionActive,
                        ]}
                        onPress={() => handleTimeoutChange(option.value)}
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
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    menuContainer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      width: '100%',
      maxWidth: 500,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    section: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    infoIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.error,
    },
    buttonIcon: {
      marginRight: 8,
    },
    resetButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.error,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    settingLabel: {
      flex: 1,
      marginRight: 12,
    },
    settingText: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    timeoutContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    timeoutLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    timeoutOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
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
    timeoutOptionText: {
      fontSize: 13,
      color: theme.text,
      fontWeight: '500',
    },
    timeoutOptionTextActive: {
      color: '#FFFFFF',
    },
    footer: {
      padding: 20,
    },
    doneButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
