/**
 * Alarm Detail Screen
 * Individual alarm configuration with auto-save
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/store/themeStore';
import { UniversalIcon } from '../../src/components/atoms/UniversalIcon';
import { CriticalAlarmConfiguration } from '../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, CriticalAlarmConfig } from '../../src/services/alarms/types';

// Initialize alarm service
const alarmConfig = new CriticalAlarmConfiguration();

// Alarm metadata for all types
const ALARM_METADATA: Record<string, {
  label: string;
  description: string;
  iconName: string;
  thresholdLabel: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
  hasThreshold: boolean;
}> = {
  [CriticalAlarmType.SHALLOW_WATER]: {
    label: 'Shallow Water',
    description: 'Alert when depth falls below configured threshold. Critical for preventing grounding in shallow waters.',
    iconName: 'water-outline',
    thresholdLabel: 'Minimum Depth',
    unit: 'm',
    min: 0.5,
    max: 10.0,
    defaultValue: 2.0,
    hasThreshold: true,
  },
  [CriticalAlarmType.ENGINE_OVERHEAT]: {
    label: 'Engine Overheat',
    description: 'Alert when engine temperature exceeds safe operating limits. Prevents engine damage from overheating.',
    iconName: 'thermometer-outline',
    thresholdLabel: 'Maximum Temperature',
    unit: '°C',
    min: 80,
    max: 120,
    defaultValue: 100,
    hasThreshold: true,
  },
  [CriticalAlarmType.LOW_BATTERY]: {
    label: 'Low Battery',
    description: 'Alert when battery voltage drops below safe level. Ensures sufficient power for critical systems.',
    iconName: 'battery-charging-outline',
    thresholdLabel: 'Minimum Voltage',
    unit: 'V',
    min: 10.5,
    max: 14.0,
    defaultValue: 12.0,
    hasThreshold: true,
  },
  [CriticalAlarmType.AUTOPILOT_FAILURE]: {
    label: 'Autopilot Failure',
    description: 'Alert on autopilot disconnection or malfunction. Critical for safe navigation when using autopilot.',
    iconName: 'swap-horizontal-outline',
    thresholdLabel: 'Detection Enabled',
    unit: '',
    min: 0,
    max: 1,
    defaultValue: 1,
    hasThreshold: false,
  },
  [CriticalAlarmType.GPS_LOSS]: {
    label: 'GPS Signal Loss',
    description: 'Alert when GPS signal quality degrades or is lost. Essential for navigation safety.',
    iconName: 'wifi-outline',
    thresholdLabel: 'Timeout',
    unit: 's',
    min: 5,
    max: 60,
    defaultValue: 15,
    hasThreshold: true,
  },
};

export default function AlarmDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const alarmType = params.type as CriticalAlarmType;
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CriticalAlarmConfig | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [testing, setTesting] = useState(false);

  const metadata = ALARM_METADATA[alarmType];

  // Load alarm configuration
  useEffect(() => {
    loadConfiguration();
  }, [alarmType]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const loadedConfig = alarmConfig.getAlarmConfig(alarmType);
      if (loadedConfig) {
        setConfig(loadedConfig);
        setThresholdValue(loadedConfig.thresholds.critical?.toString() || metadata.defaultValue.toString());
      }
    } catch (error) {
      console.error('[AlarmDetail] Failed to load configuration:', error);
      Alert.alert('Error', 'Failed to load alarm configuration');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save on enabled toggle
  const handleEnableToggle = async (enabled: boolean) => {
    if (!enabled && alarmType === CriticalAlarmType.SHALLOW_WATER) {
      Alert.alert(
        'Critical Safety Alarm',
        'This is a critical navigation alarm and cannot be disabled for safety compliance.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await alarmConfig.setAlarmEnabled(alarmType, enabled);
      if (result.success) {
        setConfig(prev => prev ? { ...prev, enabled } : null);
      }
    } catch (error) {
      console.error('[AlarmDetail] Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm state');
    }
  };

  // Auto-save on threshold change (debounced)
  const handleThresholdBlur = async () => {
    if (!thresholdValue || !config) return;

    const numValue = parseFloat(thresholdValue);
    if (isNaN(numValue) || numValue < metadata.min || numValue > metadata.max) {
      Alert.alert(
        'Invalid Value',
        `Please enter a value between ${metadata.min} and ${metadata.max} ${metadata.unit}`,
        [{ text: 'OK' }]
      );
      setThresholdValue(config.thresholds.critical?.toString() || metadata.defaultValue.toString());
      return;
    }

    try {
      await alarmConfig.updateAlarmConfig(alarmType, {
        thresholds: { critical: numValue },
      });
      setConfig(prev => prev ? {
        ...prev,
        thresholds: { ...prev.thresholds, critical: numValue }
      } : null);
    } catch (error) {
      console.error('[AlarmDetail] Failed to save threshold:', error);
      Alert.alert('Error', 'Failed to save threshold value');
    }
  };

  // Test alarm
  const handleTestAlarm = async () => {
    setTesting(true);
    try {
      const result = await alarmConfig.testAlarmConfiguration(alarmType);
      if (result.configurationValid && result.thresholdsValid && result.audioSystemReady && result.visualSystemReady) {
        Alert.alert('Test Successful', 'Alarm configuration is valid and systems are ready.', [{ text: 'OK' }]);
      } else {
        const issues = result.issues.join('\n');
        Alert.alert('Test Failed', `Issues found:\n${issues}`, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('[AlarmDetail] Test failed:', error);
      Alert.alert('Error', 'Failed to test alarm');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !config || !metadata) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <UniversalIcon name="chevron-back-outline" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{metadata.label}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Icon and Description */}
        <View style={styles.iconSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
            <UniversalIcon name={metadata.iconName} size={48} color={theme.text} />
          </View>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {metadata.description}
          </Text>
        </View>

        {/* Enable/Disable */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Enabled</Text>
            <Switch
              value={config.enabled}
              onValueChange={handleEnableToggle}
              trackColor={{ false: theme.border, true: theme.textSecondary }}
              thumbColor={config.enabled ? theme.text : theme.textSecondary}
            />
          </View>
        </View>

        {/* Threshold Configuration */}
        {metadata.hasThreshold && config.enabled && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {metadata.thresholdLabel} ({metadata.unit})
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }
              ]}
              value={thresholdValue}
              onChangeText={setThresholdValue}
              onBlur={handleThresholdBlur}
              keyboardType="decimal-pad"
              placeholder={metadata.defaultValue.toString()}
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.rangeInfo, { color: theme.textSecondary }]}>
              Valid range: {metadata.min} - {metadata.max} {metadata.unit}
            </Text>
          </View>
        )}

        {/* Test Button */}
        {config.enabled && (
          <Pressable
            style={[
              styles.testButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              testing && { opacity: 0.5 }
            ]}
            onPress={handleTestAlarm}
            disabled={testing}
          >
            <Text style={[styles.testButtonText, { color: theme.text }]}>
              {testing ? 'Testing...' : 'Test Alarm'}
            </Text>
          </Pressable>
        )}

        {/* Safety Notice */}
        {alarmType === CriticalAlarmType.SHALLOW_WATER && (
          <View style={[styles.notice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.noticeTitle, { color: theme.text }]}>⚠️ Critical Safety Alarm</Text>
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              This alarm cannot be disabled as it is critical for safe navigation and meets marine safety standards.
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginTop: 8,
  },
  rangeInfo: {
    fontSize: 13,
    marginTop: 8,
  },
  testButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notice: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
