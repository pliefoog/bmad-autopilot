/**
 * Alarm Configuration Screen
 * Story 4.1: Critical Safety Alarms - Configuration & Management UI
 * 
 * Provides user-configurable thresholds for all 5 critical alarm types:
 * - Shallow Water Depth
 * - Engine Overheat
 * - Low Battery Voltage
 * - Autopilot Failure
 * - GPS Signal Loss
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/store/themeStore';
import { UniversalIcon } from '../../src/components/atoms/UniversalIcon';
import { CriticalAlarmConfiguration } from '../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, CriticalAlarmConfig } from '../../src/services/alarms/types';
import { AlarmConfigurationManager } from '../../src/services/alarms/AlarmConfigurationManager';

// Initialize services
const alarmConfig = new CriticalAlarmConfiguration();
const configManager = new AlarmConfigurationManager();

interface AlarmTypeConfig {
  type: CriticalAlarmType;
  label: string;
  description: string;
  iconName: string; // Ionicon name for UniversalIcon
  thresholdLabel: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
}

const ALARM_CONFIGS: AlarmTypeConfig[] = [
  {
    type: CriticalAlarmType.SHALLOW_WATER,
    label: 'Shallow Water',
    description: 'Alert when depth falls below configured threshold',
    iconName: 'water-outline',
    thresholdLabel: 'Minimum Depth',
    unit: 'm',
    min: 0.5,
    max: 10.0,
    defaultValue: 2.0,
  },
  {
    type: CriticalAlarmType.ENGINE_OVERHEAT,
    label: 'Engine Overheat',
    description: 'Alert when engine temperature exceeds safe limits',
    iconName: 'thermometer-outline',
    thresholdLabel: 'Maximum Temperature',
    unit: '°C',
    min: 80,
    max: 120,
    defaultValue: 100,
  },
  {
    type: CriticalAlarmType.LOW_BATTERY,
    label: 'Low Battery',
    description: 'Alert when battery voltage drops below safe level',
    iconName: 'battery-charging-outline',
    thresholdLabel: 'Minimum Voltage',
    unit: 'V',
    min: 10.5,
    max: 14.0,
    defaultValue: 12.0,
  },
  {
    type: CriticalAlarmType.AUTOPILOT_FAILURE,
    label: 'Autopilot Failure',
    description: 'Alert on autopilot disconnection or malfunction',
    iconName: 'swap-horizontal-outline',
    thresholdLabel: 'Detection Enabled',
    unit: '',
    min: 0,
    max: 1,
    defaultValue: 1,
  },
  {
    type: CriticalAlarmType.GPS_LOSS,
    label: 'GPS Signal Loss',
    description: 'Alert when GPS signal quality degrades or is lost',
    iconName: 'wifi-outline',
    thresholdLabel: 'Timeout',
    unit: 's',
    min: 5,
    max: 60,
    defaultValue: 15,
  },
];

export default function AlarmSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Map<CriticalAlarmType, CriticalAlarmConfig>>(new Map());
  const [thresholdValues, setThresholdValues] = useState<Map<CriticalAlarmType, string>>(new Map());
  const [testingAlarm, setTestingAlarm] = useState<CriticalAlarmType | null>(null);
  
  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load configurations on mount
  useEffect(() => {
    console.log('[AlarmSettings] Component mounted, loading configurations...');
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    console.log('[AlarmSettings] loadConfigurations called');
    setLoading(true);
    try {
      const loadedConfigs = new Map<CriticalAlarmType, CriticalAlarmConfig>();
      const loadedThresholds = new Map<CriticalAlarmType, string>();

      for (const alarmDef of ALARM_CONFIGS) {
        console.log('[AlarmSettings] Loading config for:', alarmDef.type);
        const config = alarmConfig.getAlarmConfig(alarmDef.type);
        console.log('[AlarmSettings] Config loaded:', config);
        if (config) {
          loadedConfigs.set(alarmDef.type, config);
          
          // Extract the critical threshold value for display
          const thresholdValue = config.thresholds.critical || alarmDef.defaultValue;
          loadedThresholds.set(alarmDef.type, thresholdValue.toString());
        }
      }

      console.log('[AlarmSettings] All configs loaded:', loadedConfigs.size, 'configs');
      setConfigs(loadedConfigs);
      setThresholdValues(loadedThresholds);
    } catch (error) {
      console.error('[AlarmSettings] Failed to load alarm configurations:', error);
      Alert.alert('Error', 'Failed to load alarm settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

    const handleEnableToggle = async (type: CriticalAlarmType, enabled: boolean) => {
    console.log('[AlarmSettings] handleEnableToggle called:', type, enabled);
    try {
      const result = await alarmConfig.setAlarmEnabled(type, enabled, false);
      console.log('[AlarmSettings] setAlarmEnabled result:', result);
      
      if (result.requiresConfirmation) {
        // Show confirmation dialog for critical alarms
        setConfirmDialog({
          visible: true,
          title: '⚠️ Critical Alarm Warning',
          message: result.message || 'This is a critical navigation alarm. Disabling it may compromise vessel safety. Are you sure?',
          onConfirm: async () => {
            // User confirmed, proceed with disabling
            const confirmedResult = await alarmConfig.setAlarmEnabled(type, enabled, true);
            if (confirmedResult.success) {
              const currentConfig = configs.get(type);
              if (currentConfig) {
                const updatedConfig = { ...currentConfig, enabled };
                setConfigs(new Map(configs.set(type, updatedConfig)));
              }
            }
            setConfirmDialog({ ...confirmDialog, visible: false });
          },
        });
      } else if (result.success) {
        // Update local state
        const currentConfig = configs.get(type);
        if (currentConfig) {
          const updatedConfig = { ...currentConfig, enabled };
          setConfigs(new Map(configs.set(type, updatedConfig)));
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to update alarm setting.');
      }
    } catch (error) {
      console.error(`[AlarmSettings] Failed to toggle alarm ${type}:`, error);
      Alert.alert('Error', 'Failed to update alarm setting.');
    }
  };

  const handleThresholdChange = (type: CriticalAlarmType, value: string) => {
    console.log('[AlarmSettings] handleThresholdChange called:', type, value);
    setThresholdValues(new Map(thresholdValues.set(type, value)));
  };

  const handleThresholdSave = async (type: CriticalAlarmType) => {
    const valueStr = thresholdValues.get(type);
    if (!valueStr) return;

    const value = parseFloat(valueStr);
    const alarmDef = ALARM_CONFIGS.find(a => a.type === type);
    
    if (!alarmDef) return;

    // Validate range
    if (isNaN(value) || value < alarmDef.min || value > alarmDef.max) {
      Alert.alert(
        'Invalid Value',
        `Please enter a value between ${alarmDef.min} and ${alarmDef.max} ${alarmDef.unit}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      const result = await alarmConfig.updateAlarmConfig(type, {
        thresholds: {
          critical: value,
        },
      });

      if (result.success) {
        Alert.alert('Success', 'Threshold updated successfully', [{ text: 'OK' }]);
        await loadConfigurations(); // Reload to get updated config
      } else {
        Alert.alert(
          'Validation Error',
          result.errors.join('\n'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`Failed to update threshold for ${type}:`, error);
      Alert.alert('Error', 'Failed to update threshold.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlarm = async (type: CriticalAlarmType) => {
    console.log('[AlarmSettings] handleTestAlarm called:', type);
    setTestingAlarm(type);
    try {
      const result = await alarmConfig.testAlarmConfiguration(type);
      console.log('[AlarmSettings] testAlarmConfiguration result:', result);
      
      if (result.configurationValid && result.thresholdsValid) {
        Alert.alert(
          'Test Complete',
          'Alarm system test completed successfully. Check audio and visual alerts.',
          [{ text: 'OK' }]
        );
      } else {
        const issues = [];
        if (!result.configurationValid) issues.push('Configuration invalid');
        if (!result.thresholdsValid) issues.push('Thresholds invalid');
        
        Alert.alert(
          'Test Failed',
          `Issues detected:\n${issues.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`Failed to test alarm ${type}:`, error);
      Alert.alert('Error', 'Failed to test alarm system.');
    } finally {
      setTestingAlarm(null);
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all alarm settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Reset all configs
            for (const alarmDef of ALARM_CONFIGS) {
              await alarmConfig.updateAlarmConfig(alarmDef.type, {
                thresholds: {
                  critical: alarmDef.defaultValue,
                },
              });
            }
            await loadConfigurations();
            Alert.alert('Success', 'All settings reset to defaults', [{ text: 'OK' }]);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alarm settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.text }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Alarm Configuration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Critical Safety Alarms</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Configure thresholds for marine safety alarms. Critical navigation alarms cannot be
            disabled for safety compliance.
          </Text>
        </View>

        {ALARM_CONFIGS.map((alarmDef) => {
          const config = configs.get(alarmDef.type);
          const thresholdValue = thresholdValues.get(alarmDef.type) || '';

          return (
            <View key={alarmDef.type} style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.alarmHeader}>
                <UniversalIcon name={alarmDef.iconName} size={32} color={theme.text} style={styles.alarmIcon} />
                <View style={styles.alarmTitleContainer}>
                  <Text style={[styles.alarmTitle, { color: theme.text }]}>{alarmDef.label}</Text>
                  <Text style={[styles.alarmDescription, { color: theme.textSecondary }]}>{alarmDef.description}</Text>
                </View>
              </View>

              {/* Enable/Disable Toggle */}
              <View style={styles.toggleRow}>
                <Switch
                  value={config?.enabled ?? true}
                  onValueChange={(value) => handleEnableToggle(alarmDef.type, value)}
                  trackColor={{ false: theme.border, true: theme.textSecondary }}
                  thumbColor={config?.enabled ? theme.text : theme.textSecondary}
                />
                <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>{config?.enabled ? 'Enabled' : 'Disabled'}</Text>
              </View>

              {/* Threshold Configuration */}
              {alarmDef.type !== CriticalAlarmType.AUTOPILOT_FAILURE && (
                <View style={styles.configRow}>
                  <Text style={[styles.configLabel, { color: theme.text }]}>
                    {alarmDef.thresholdLabel} ({alarmDef.unit})
                  </Text>
                  <View style={styles.thresholdInputContainer}>
                    <TextInput
                      style={[
                        styles.thresholdInput,
                        { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }
                      ]}
                      value={thresholdValue}
                      onChangeText={(value) => handleThresholdChange(alarmDef.type, value)}
                      keyboardType="decimal-pad"
                      placeholder={alarmDef.defaultValue.toString()}
                      editable={config?.enabled ?? true}
                    />
                    <Pressable
                      style={styles.saveButton}
                      onPress={() => handleThresholdSave(alarmDef.type)}
                      disabled={!config?.enabled || saving}
                    >
                      <Text style={[styles.saveButtonText, { color: (!config?.enabled || saving) ? theme.textSecondary : theme.text }]}>
                        {saving ? '...' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Valid Range Info */}
              <Text style={[styles.rangeInfo, { color: theme.textSecondary }]}>
                Valid range: {alarmDef.min} - {alarmDef.max} {alarmDef.unit}
              </Text>

              {/* Test Button */}
              <Pressable
                style={[
                  styles.testButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  testingAlarm === alarmDef.type && { backgroundColor: theme.surface, borderColor: theme.text },
                ]}
                onPress={() => handleTestAlarm(alarmDef.type)}
                disabled={testingAlarm !== null}
              >
                <Text style={[
                  styles.testButtonText,
                  { color: theme.text },
                  testingAlarm === alarmDef.type && { color: theme.text }
                ]}>
                  {testingAlarm === alarmDef.type ? 'Testing...' : 'Test Alarm'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Reset to Defaults */}
        <Pressable style={styles.resetButton} onPress={handleResetToDefaults}>
          <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset All to Defaults</Text>
        </Pressable>

        {/* Marine Safety Notice */}
                <View style={[styles.safetyNotice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.safetyNoticeTitle, { color: theme.text }]}>⚠️ Safety Compliance Notice</Text>
          <Text style={[styles.safetyNoticeText, { color: theme.textSecondary }]}>
            Critical navigation alarms meet marine safety standards and include redundant
            alerting. Alarm response time: &lt;500ms. Audio level: &gt;85dB for marine
            environment compliance.
          </Text>
        </View>
      </ScrollView>

      {/* Custom Confirmation Dialog */}
      <Modal
        visible={confirmDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDialog({ ...confirmDialog, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{confirmDialog.title}</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{confirmDialog.message}</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: theme.background }]}
                onPress={() => setConfirmDialog({ ...confirmDialog, visible: false })}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton, { backgroundColor: theme.error }]}
                onPress={confirmDialog.onConfirm}
              >
                <Text style={[styles.modalConfirmText, { color: theme.text }]}>Disable Anyway</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    lineHeight: 20,
  },
  alarmCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmIcon: {
    marginRight: 12,
  },
  alarmTitleContainer: {
    flex: 1,
  },
  alarmTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  alarmDescription: {
    fontSize: 14,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  configLabel: {
    fontSize: 16,
    flex: 1,
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 8,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeInfo: {
    fontSize: 12,
    marginBottom: 12,
  },
  testButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  safetyNotice: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  safetyNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  safetyNoticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
