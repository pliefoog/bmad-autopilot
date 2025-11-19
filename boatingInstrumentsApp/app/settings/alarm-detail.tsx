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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/store/themeStore';
import { UniversalIcon } from '../../src/components/atoms/UniversalIcon';
import { CriticalAlarmConfiguration } from '../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, CriticalAlarmConfig, AlarmEscalationLevel } from '../../src/services/alarms/types';
import { MarineAudioAlertManager } from '../../src/services/alarms/MarineAudioAlertManager';

// Use shared singleton instances
const alarmConfig = CriticalAlarmConfiguration.getInstance();
const audioManager = MarineAudioAlertManager.getInstance();

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
  defaultPattern: 'rapid_pulse' | 'warble' | 'intermittent' | 'triple_blast' | 'morse_u' | 'continuous_descending';
  patternDescription: string;
}> = {
  [CriticalAlarmType.SHALLOW_WATER]: {
    label: 'Shallow Water',
    description: 'Alert when depth falls below configured threshold. Critical for preventing grounding in shallow waters.',
    iconName: 'arrow-down-outline',
    thresholdLabel: 'Minimum Depth',
    unit: 'm',
    min: 0.5,
    max: 10.0,
    defaultValue: 2.0,
    hasThreshold: true,
    defaultPattern: 'rapid_pulse' as const,
    patternDescription: 'Rapid pulse - ISO Priority 1 immediate danger',
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
    defaultPattern: 'warble' as const,
    patternDescription: 'Warble - ISO Priority 3 equipment warning',
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
    defaultPattern: 'triple_blast' as const,
    patternDescription: 'Triple blast - General alert pattern',
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
    defaultPattern: 'morse_u' as const,
    patternDescription: 'Morse "U" - Maritime standard for "You are in danger"',
  },
  [CriticalAlarmType.GPS_LOSS]: {
    label: 'GPS Signal Loss',
    description: 'Alert when GPS signal quality degrades or is lost. Essential for navigation safety.',
    iconName: 'navigate-outline',
    thresholdLabel: 'Timeout',
    unit: 's',
    min: 5,
    max: 60,
    defaultValue: 15,
    hasThreshold: true,
    defaultPattern: 'intermittent' as const,
    patternDescription: 'Intermittent - Information priority pattern',
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
  const [selectedPattern, setSelectedPattern] = useState<'rapid_pulse' | 'warble' | 'intermittent' | 'triple_blast' | 'morse_u' | 'continuous_descending'>('rapid_pulse');
  const [testing, setTesting] = useState(false);
  const [switchValue, setSwitchValue] = useState(true); // Local state for switch to prevent visual flicker

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
        setSwitchValue(loadedConfig.enabled); // Sync switch with config
        setThresholdValue(loadedConfig.thresholds.critical?.toString() || metadata.defaultValue.toString());
        setSelectedPattern(loadedConfig.audioPattern || metadata.defaultPattern);
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
    // Show warning when disabling any alarm
    if (!enabled) {
      // Use browser confirm on web, Alert on native
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          'Are you sure you want to disable this safety alarm? This may compromise your vessel\'s safety monitoring.'
        );
        if (!confirmed) {
          return; // User cancelled
        }
        // User confirmed, proceed with disable
        try {
          const result = await alarmConfig.setAlarmEnabled(alarmType, false, true);
          if (result.success) {
            setConfig(prev => prev ? { ...prev, enabled: false } : null);
            setSwitchValue(false);
          } else {
            window.alert('Error: ' + (result.message || 'Failed to disable alarm'));
          }
        } catch (error) {
          console.error('[AlarmDetail] Failed to disable alarm:', error);
          window.alert('Error: Failed to update alarm state');
        }
      } else {
        // Native platforms use Alert.alert
        Alert.alert(
          'Disable Alarm',
          'Are you sure you want to disable this safety alarm? This may compromise your vessel\'s safety monitoring.',
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
            },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  const result = await alarmConfig.setAlarmEnabled(alarmType, false, true);
                  if (result.success) {
                    setConfig(prev => prev ? { ...prev, enabled: false } : null);
                    setSwitchValue(false);
                  } else {
                    Alert.alert('Error', result.message || 'Failed to disable alarm');
                  }
                } catch (error) {
                  console.error('[AlarmDetail] Failed to disable alarm:', error);
                  Alert.alert('Error', 'Failed to update alarm state');
                }
              },
            },
          ]
        );
      }
      return;
    }

    // Enable without confirmation
    try {
      const result = await alarmConfig.setAlarmEnabled(alarmType, true);
      if (result.success) {
        setConfig(prev => prev ? { ...prev, enabled: true } : null);
        setSwitchValue(true);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Error: ' + (result.message || 'Failed to enable alarm'));
        } else {
          Alert.alert('Error', result.message || 'Failed to enable alarm');
        }
      }
    } catch (error) {
      console.error('[AlarmDetail] Failed to enable alarm:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to update alarm state');
      } else {
        Alert.alert('Error', 'Failed to update alarm state');
      }
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

  // Auto-save on pattern change
  const handlePatternChange = async (pattern: typeof selectedPattern) => {
    setSelectedPattern(pattern);
    
    try {
      await alarmConfig.updateAlarmConfig(alarmType, {
        audioPattern: pattern,
      });
      setConfig(prev => prev ? { ...prev, audioPattern: pattern } : null);
    } catch (error) {
      console.error('[AlarmDetail] Failed to save audio pattern:', error);
      Alert.alert('Error', 'Failed to save audio pattern');
    }
  };

  // Test alarm
  const handleTestAlarm = async () => {
    setTesting(true);
    try {
      console.log('[AlarmDetail] Starting alarm test for:', alarmType);
      
      // First validate configuration
      const result = await alarmConfig.testAlarmConfiguration(alarmType);
      console.log('[AlarmDetail] Configuration test result:', result);
      
      if (!result.configurationValid || !result.thresholdsValid) {
        const issues = result.issues.join('\n');
        console.warn('[AlarmDetail] Configuration issues:', issues);
        if (Platform.OS === 'web') {
          window.alert(`Configuration issues:\n${issues}`);
        } else {
          Alert.alert('Configuration Issues', issues, [{ text: 'OK' }]);
        }
        return;
      }
      
      console.log('[AlarmDetail] Playing test alarm sound...');
      
      // Play the alarm sound for 3 seconds
      const played = await audioManager.testAlarmSound(
        alarmType,
        AlarmEscalationLevel.WARNING,
        3000 // 3 second test
      );
      
      console.log('[AlarmDetail] Alarm sound play result:', played);
      
      if (played) {
        // Success - no dialog needed, just console log
        console.log('[AlarmDetail] Alarm test successful - playing for 3 seconds');
      } else {
        console.error('[AlarmDetail] Failed to play alarm sound');
        if (Platform.OS === 'web') {
          window.alert('Failed to play alarm sound.\n\nPossible issues:\n- Browser needs user interaction first\n- Audio permissions blocked\n- Web Audio API not supported');
        } else {
          Alert.alert('Test Failed', 'Failed to play alarm sound. Check audio permissions.', [{ text: 'OK' }]);
        }
      }
    } catch (error) {
      console.error('[AlarmDetail] Test failed with error:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error instanceof Error ? error.message : 'Failed to test alarm'}`);
      } else {
        Alert.alert('Error', 'Failed to test alarm');
      }
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
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/settings/alarms');
              }
            }} 
            style={styles.backButton}
          >
            <UniversalIcon name="chevron-back-outline" size={24} color={theme.textSecondary} />
          </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{metadata.label}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Icon and Description */}
        <View style={styles.iconSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
            <UniversalIcon name={metadata.iconName} size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {metadata.description}
          </Text>
        </View>

        {/* Enable/Disable */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Enable Alert</Text>
            <Switch
              value={switchValue}
              onValueChange={handleEnableToggle}
              trackColor={{ false: theme.border, true: theme.textSecondary }}
              thumbColor={switchValue ? theme.text : theme.textSecondary}
            />
          </View>
        </View>

        {/* Threshold Configuration */}
        {metadata.hasThreshold && config.enabled && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              {metadata.thresholdLabel} ({metadata.unit})
            </Text>
            <View style={styles.thresholdControl}>
              <Pressable
                style={[styles.adjustButton, { borderColor: theme.border }]}
                onPress={() => {
                  const current = parseFloat(thresholdValue) || metadata.defaultValue;
                  const step = metadata.unit === '°C' ? 1 : 0.5; // 1° for temp, 0.5 for others
                  const newValue = Math.max(metadata.min, current - step);
                  setThresholdValue(newValue.toFixed(metadata.unit === '°C' ? 0 : 1));
                  handleThresholdBlur();
                }}
              >
                <Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text>
              </Pressable>
              
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
              
              <Pressable
                style={[styles.adjustButton, { borderColor: theme.border }]}
                onPress={() => {
                  const current = parseFloat(thresholdValue) || metadata.defaultValue;
                  const step = metadata.unit === '°C' ? 1 : 0.5; // 1° for temp, 0.5 for others
                  const newValue = Math.min(metadata.max, current + step);
                  setThresholdValue(newValue.toFixed(metadata.unit === '°C' ? 0 : 1));
                  handleThresholdBlur();
                }}
              >
                <Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text>
              </Pressable>
            </View>
            <Text style={[styles.rangeInfo, { color: theme.textSecondary }]}>
              Valid range: {metadata.min} - {metadata.max} {metadata.unit}
            </Text>
          </View>
        )}

        {/* Audio Pattern Selection */}
        {config.enabled && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>
              Alarm Sound Pattern
            </Text>
            <Text style={[styles.patternDescription, { color: theme.textSecondary }]}>
              {metadata.patternDescription}
            </Text>
            
            <View style={styles.patternOptions}>
              {[
                { value: 'rapid_pulse', label: 'Rapid Pulse', description: 'ISO Priority 1 - Immediate danger' },
                { value: 'morse_u', label: 'Morse "U" (·· —)', description: 'ISO Priority 2 - "You are in danger"' },
                { value: 'warble', label: 'Warble', description: 'ISO Priority 3 - Equipment warning' },
                { value: 'triple_blast', label: 'Triple Blast', description: 'ISO Priority 4 - General alert' },
                { value: 'intermittent', label: 'Intermittent', description: 'ISO Priority 5 - Information' },
                { value: 'continuous_descending', label: 'Descending', description: 'Signal degradation (custom)' },
              ].map((pattern) => (
                <Pressable
                  key={pattern.value}
                  style={[
                    styles.patternOption,
                    { 
                      backgroundColor: theme.background,
                      borderColor: selectedPattern === pattern.value ? theme.primary : theme.border,
                      borderWidth: selectedPattern === pattern.value ? 2 : 1,
                    }
                  ]}
                  onPress={() => handlePatternChange(pattern.value as typeof selectedPattern)}
                >
                  <View style={styles.patternOptionContent}>
                    <View style={styles.patternRadio}>
                      {selectedPattern === pattern.value && (
                        <View style={[styles.patternRadioSelected, { backgroundColor: theme.primary }]} />
                      )}
                    </View>
                    <View style={styles.patternText}>
                      <Text style={[styles.patternLabel, { color: theme.text }]}>
                        {pattern.label}
                      </Text>
                      <Text style={[styles.patternDesc, { color: theme.textSecondary }]}>
                        {pattern.description}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
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
  thresholdControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  rangeInfo: {
    fontSize: 13,
    marginTop: 0,
  },
  patternDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  patternOptions: {
    gap: 12,
  },
  patternOption: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  patternOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patternRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  patternText: {
    flex: 1,
  },
  patternLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  patternDesc: {
    fontSize: 13,
    lineHeight: 18,
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
