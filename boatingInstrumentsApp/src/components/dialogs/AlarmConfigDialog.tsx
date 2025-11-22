/**
 * Alarm Configuration Dialog
 * Modal with internal navigation for alarm list and detail views
 * Matches UnitsConfigDialog pattern for consistency
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Switch from '../atoms/Switch';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { CriticalAlarmConfiguration } from '../../services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, CriticalAlarmConfig, AlarmEscalationLevel } from '../../services/alarms/types';
import { MarineAudioAlertManager } from '../../services/alarms/MarineAudioAlertManager';

// Use shared singleton instances
const alarmConfig = CriticalAlarmConfiguration.getInstance();
const audioManager = MarineAudioAlertManager.getInstance();

// Alarm list configuration
const ALARM_LIST = [
  {
    type: CriticalAlarmType.SHALLOW_WATER,
    label: 'Shallow Water',
    iconName: 'arrow-down-outline',
    unit: 'm',
  },
  {
    type: CriticalAlarmType.ENGINE_OVERHEAT,
    label: 'Engine Overheat',
    iconName: 'thermometer-outline',
    unit: '°C',
  },
  {
    type: CriticalAlarmType.LOW_BATTERY,
    label: 'Low Battery',
    iconName: 'battery-charging-outline',
    unit: 'V',
  },
  {
    type: CriticalAlarmType.AUTOPILOT_FAILURE,
    label: 'Autopilot Failure',
    iconName: 'swap-horizontal-outline',
    unit: '',
  },
  {
    type: CriticalAlarmType.GPS_LOSS,
    label: 'GPS Signal Loss',
    iconName: 'navigate-outline',
    unit: 's',
  },
];

// Alarm metadata for detail view
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
    thresholdLabel: 'Timeout Duration',
    unit: 's',
    min: 5,
    max: 60,
    defaultValue: 10,
    hasThreshold: true,
    defaultPattern: 'intermittent' as const,
    patternDescription: 'Intermittent - ISO Priority 2 urgent',
  },
};

interface AlarmConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'detail';

export const AlarmConfigDialog: React.FC<AlarmConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAlarmType, setSelectedAlarmType] = useState<CriticalAlarmType | null>(null);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Map<CriticalAlarmType, CriticalAlarmConfig>>(new Map());
  
  // Detail view state
  const [config, setConfig] = useState<CriticalAlarmConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all alarm configurations
  useEffect(() => {
    if (visible) {
      loadConfigurations();
    }
  }, [visible]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const loadedConfigs = new Map<CriticalAlarmType, CriticalAlarmConfig>();

      for (const alarm of ALARM_LIST) {
        const config = alarmConfig.getAlarmConfig(alarm.type);
        if (config) {
          loadedConfigs.set(alarm.type, config);
        }
      }

      setConfigs(loadedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to load configurations:', error);
      Alert.alert('Error', 'Failed to load alarm settings');
    } finally {
      setLoading(false);
    }
  };

  // Quick toggle from list view
  const handleQuickToggle = async (type: CriticalAlarmType, enabled: boolean) => {
    if (!enabled && type === CriticalAlarmType.SHALLOW_WATER) {
      Alert.alert(
        'Critical Safety Alarm',
        'This alarm cannot be disabled for safety compliance.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await alarmConfig.setAlarmEnabled(type, enabled);
      if (result.success) {
        setConfigs(prev => {
          const updated = new Map(prev);
          const config = updated.get(type);
          if (config) {
            updated.set(type, { ...config, enabled });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  // Navigate to detail view
  const handleNavigateToDetail = (type: CriticalAlarmType) => {
    setSelectedAlarmType(type);
    const alarmConfig = configs.get(type);
    if (alarmConfig) {
      setConfig(alarmConfig);
      setViewMode('detail');
      setHasChanges(false);
    }
  };

  // Navigate back to list
  const handleBackToList = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before going back?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => {
            setViewMode('list');
            setSelectedAlarmType(null);
            setConfig(null);
            setHasChanges(false);
          }},
          { text: 'Save', onPress: async () => {
            await handleSave();
            setViewMode('list');
            setSelectedAlarmType(null);
            setConfig(null);
          }},
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      setViewMode('list');
      setSelectedAlarmType(null);
      setConfig(null);
    }
  };

  // Save detail changes
  const handleSave = async () => {
    if (!config || !selectedAlarmType) return;

    setSaving(true);
    try {
      const result = await alarmConfig.updateAlarmConfig(selectedAlarmType, config);
      if (result.success) {
        setConfigs(prev => {
          const updated = new Map(prev);
          updated.set(selectedAlarmType, config);
          return updated;
        });
        setHasChanges(false);
        Alert.alert('Success', 'Alarm configuration saved', [{ text: 'OK' }]);
      } else {
        const errorMsg = result.errors?.join(', ') || 'Failed to save alarm configuration';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to save:', error);
      Alert.alert('Error', 'Failed to save alarm configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (viewMode === 'detail' && hasChanges) {
      handleBackToList();
    } else {
      onClose();
    }
  };

  // Reset all alarms
  const handleResetAll = () => {
    Alert.alert(
      'Reset All Alarms',
      'Are you sure you want to reset all alarm settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const alarm of ALARM_LIST) {
                await alarmConfig.resetToDefault(alarm.type);
              }
              await loadConfigurations();
              Alert.alert('Success', 'All alarms reset to defaults', [{ text: 'OK' }]);
            } catch (error) {
              console.error('[AlarmConfigDialog] Failed to reset:', error);
              Alert.alert('Error', 'Failed to reset alarms');
            }
          },
        },
      ]
    );
  };

  // Get alarm summary text
  const getAlarmSummary = (type: CriticalAlarmType, config: CriticalAlarmConfig | undefined): string => {
    if (!config) return 'Not configured';
    if (!config.enabled) return '';

    const alarm = ALARM_LIST.find(a => a.type === type);
    if (!alarm || type === CriticalAlarmType.AUTOPILOT_FAILURE) return '';

    return `Alert: ${config.thresholds.critical}${alarm.unit}`;
  };

  // Render list view
  const renderListView = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alarms...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Tap any alarm to customize its settings.
        </Text>

        {ALARM_LIST.map((alarm) => {
          const alarmConfig = configs.get(alarm.type);
          const isEnabled = alarmConfig?.enabled ?? false;
          const summary = getAlarmSummary(alarm.type, alarmConfig);

          return (
            <Pressable
              key={alarm.type}
              style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleNavigateToDetail(alarm.type)}
            >
              <View style={styles.alarmIcon}>
                <UniversalIcon name={alarm.iconName} size={32} color={theme.text} />
              </View>
              <View style={styles.alarmInfo}>
                <View style={styles.alarmHeader}>
                  <Text style={[styles.alarmLabel, { color: theme.text }]}>{alarm.label}</Text>
                  <View style={styles.alarmStatus}>
                    {isEnabled && <View style={[styles.statusDot, { backgroundColor: theme.success }]} />}
                    <Switch
                      value={isEnabled}
                      onValueChange={(value) => handleQuickToggle(alarm.type, value)}
                      trackColor={{ false: theme.border, true: theme.interactive }}
                      thumbColor={theme.surface}
                      ios_backgroundColor={theme.border}
                      disabled={alarm.type === CriticalAlarmType.SHALLOW_WATER && !isEnabled}
                    />
                  </View>
                </View>
                {summary && <Text style={[styles.alarmSummary, { color: theme.textSecondary }]}>{summary}</Text>}
              </View>
              <UniversalIcon name="chevron-forward-outline" size={20} color={theme.textSecondary} />
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.resetButton, { borderColor: theme.border }]}
          onPress={handleResetAll}
        >
          <UniversalIcon name="refresh-outline" size={20} color={theme.error} />
          <Text style={[styles.resetButtonText, { color: theme.error }]}>Reset All to Defaults</Text>
        </Pressable>
      </ScrollView>
    );
  };

  // Render detail view
  const renderDetailView = () => {
    if (!config || !selectedAlarmType) return null;

    const metadata = ALARM_METADATA[selectedAlarmType];
    if (!metadata) return null;

    const updateConfig = (updates: Partial<CriticalAlarmConfig>) => {
      setConfig(prev => prev ? { ...prev, ...updates } : null);
      setHasChanges(true);
    };

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Icon and Description */}
        <View style={styles.iconSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
            <UniversalIcon name={metadata.iconName} size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
            {metadata.description}
          </Text>
        </View>

        {/* Enable/Disable */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Enable Alarm</Text>
            <Switch
              value={config.enabled}
              onValueChange={(value) => updateConfig({ enabled: value })}
              trackColor={{ false: theme.border, true: theme.interactive }}
              thumbColor={theme.surface}
              ios_backgroundColor={theme.border}
              disabled={selectedAlarmType === CriticalAlarmType.SHALLOW_WATER && config.enabled}
            />
          </View>
        </View>

        {/* Threshold Configuration */}
        {metadata.hasThreshold && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {metadata.thresholdLabel}
            </Text>
            <View style={styles.thresholdInput}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={String(config.thresholds.critical)}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= metadata.min && value <= metadata.max) {
                    updateConfig({
                      thresholds: { ...config.thresholds, critical: value }
                    });
                  }
                }}
                keyboardType="decimal-pad"
                editable={config.enabled}
              />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>{metadata.unit}</Text>
            </View>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Range: {metadata.min} - {metadata.max} {metadata.unit}
            </Text>
          </View>
        )}

        {/* Sound Pattern */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound Pattern</Text>
          <Text style={[styles.patternDescription, { color: theme.textSecondary }]}>
            {metadata.patternDescription}
          </Text>
        </View>

        {/* Test Alarm */}
        <Pressable
          style={[styles.testButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            Alert.alert(
              'Test Alarm',
              `This will trigger the ${metadata.label} alarm sound.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Test',
                  onPress: () => {
                    // Trigger test alarm sound
                    console.log(`Testing alarm: ${selectedAlarmType}`);
                  }
                },
              ]
            );
          }}
          disabled={!config.enabled}
        >
          <UniversalIcon name="volume-high-outline" size={20} color={theme.text} />
          <Text style={styles.testButtonText}>Test Alarm Sound</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* iOS Drag Handle */}
        <View style={styles.dragHandle} />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={viewMode === 'detail' ? handleBackToList : handleClose}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.text }]}>
              {viewMode === 'detail' ? 'Back' : 'Done'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {viewMode === 'detail' && selectedAlarmType
              ? ALARM_METADATA[selectedAlarmType]?.label
              : 'Alarms'}
          </Text>
          {viewMode === 'detail' ? (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerButton}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text
                  style={[
                    styles.headerButtonText,
                    {
                      color: hasChanges ? theme.primary : theme.textSecondary,
                      fontWeight: hasChanges ? '600' : '400',
                    },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {/* Content */}
        {viewMode === 'list' ? renderListView() : renderDetailView()}
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: theme.overlay,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  description: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  alarmIcon: {
    marginRight: 16,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alarmLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  alarmStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alarmSummary: {
    fontSize: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
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
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  thresholdInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
  },
  unit: {
    fontSize: 17,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
  },
  patternDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  testButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
