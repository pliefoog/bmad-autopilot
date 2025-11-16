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
  icon: string;
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
    icon: '⚓',
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
    icon: '🔥',
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
    icon: '🔋',
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
    icon: '🧭',
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
    icon: '📡',
    thresholdLabel: 'Timeout',
    unit: 's',
    min: 5,
    max: 60,
    defaultValue: 15,
  },
];

export default function AlarmSettingsScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading alarm settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Alarm Configuration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critical Safety Alarms</Text>
          <Text style={styles.sectionDescription}>
            Configure thresholds for marine safety alarms. Critical navigation alarms cannot be
            disabled for safety compliance.
          </Text>
        </View>

        {ALARM_CONFIGS.map((alarmDef) => {
          const config = configs.get(alarmDef.type);
          const thresholdValue = thresholdValues.get(alarmDef.type) || '';

          return (
            <View key={alarmDef.type} style={styles.alarmCard}>
              <View style={styles.alarmHeader}>
                <Text style={styles.alarmIcon}>{alarmDef.icon}</Text>
                <View style={styles.alarmTitleContainer}>
                  <Text style={styles.alarmTitle}>{alarmDef.label}</Text>
                  <Text style={styles.alarmDescription}>{alarmDef.description}</Text>
                </View>
              </View>

              {/* Enable/Disable Toggle */}
              <View style={styles.toggleRow}>
                <Switch
                  value={config?.enabled ?? true}
                  onValueChange={(value) => handleEnableToggle(alarmDef.type, value)}
                  trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                />
                <Text style={styles.toggleLabel}>{config?.enabled ? 'Enabled' : 'Disabled'}</Text>
              </View>

              {/* Threshold Configuration */}
              {alarmDef.type !== CriticalAlarmType.AUTOPILOT_FAILURE && (
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>
                    {alarmDef.thresholdLabel} ({alarmDef.unit})
                  </Text>
                  <View style={styles.thresholdInputContainer}>
                    <TextInput
                      style={styles.thresholdInput}
                      value={thresholdValue}
                      onChangeText={(value) => handleThresholdChange(alarmDef.type, value)}
                      keyboardType="decimal-pad"
                      placeholder={alarmDef.defaultValue.toString()}
                      editable={config?.enabled ?? true}
                    />
                    <Pressable
                      style={[
                        styles.saveButton,
                        (!config?.enabled || saving) && styles.saveButtonDisabled,
                      ]}
                      onPress={() => handleThresholdSave(alarmDef.type)}
                      disabled={!config?.enabled || saving}
                    >
                      <Text style={styles.saveButtonText}>
                        {saving ? '...' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Valid Range Info */}
              <Text style={styles.rangeInfo}>
                Valid range: {alarmDef.min} - {alarmDef.max} {alarmDef.unit}
              </Text>

              {/* Test Button */}
              <Pressable
                style={[
                  styles.testButton,
                  testingAlarm === alarmDef.type && styles.testButtonActive,
                ]}
                onPress={() => handleTestAlarm(alarmDef.type)}
                disabled={testingAlarm !== null}
              >
                <Text style={styles.testButtonText}>
                  {testingAlarm === alarmDef.type ? 'Testing...' : 'Test Alarm'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Reset to Defaults */}
        <Pressable style={styles.resetButton} onPress={handleResetToDefaults}>
          <Text style={styles.resetButtonText}>Reset All to Defaults</Text>
        </Pressable>

        {/* Marine Safety Notice */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyNoticeTitle}>⚠️ Marine Safety Notice</Text>
          <Text style={styles.safetyNoticeText}>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{confirmDialog.title}</Text>
            <Text style={styles.modalMessage}>{confirmDialog.message}</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setConfirmDialog({ ...confirmDialog, visible: false })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmDialog.onConfirm}
              >
                <Text style={styles.modalConfirmText}>Disable Anyway</Text>
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
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
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
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  alarmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  alarmTitleContainer: {
    flex: 1,
  },
  alarmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  alarmDescription: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
    marginLeft: 12,
  },
  configLabel: {
    fontSize: 16,
    color: '#000000',
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
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rangeInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  testButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  safetyNotice: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD60A',
    marginBottom: 16,
  },
  safetyNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  safetyNoticeText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#F2F2F7',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
