/**
 * Sensor Configuration Dialog - RHF Refactored
 *
 * Manages sensor configuration with React Hook Form integration.
 *
 * Architecture:
 * - useSensorConfigForm hook: RHF integration, enrichment, maritime safety
 * - ConfigFieldRenderer: Reusable field component with theme compliance, glove mode
 * - Explicit save on transition (onSubmit mode, not onChange)
 * - Direction-aware threshold validation via Zod
 * - Performance optimized: selective useWatch subscriptions, React.memo fields
 *
 * Maritime Context:
 * - Critical alarm confirmations (depth, battery, engine)
 * - Keyboard shortcuts: Escape (cancel), Enter (submit), Ctrl+S (save)
 * - Glove mode touch targets (44→56px)
 * - One-handed operation support
 *
 * Integration Pattern:
 * useSensorConfigForm hook provides form, enrichedThresholds, handlers, and computed values
 * Dialog renders InstanceTabBar, MetricSelector, and ConfigFieldRenderer components
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useWatch } from 'react-hook-form';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { useSensorConfigStore } from '../../store/sensorConfigStore';
import { useSettingsStore } from '../../store/settingsStore';
import { SensorType, SensorConfiguration } from '../../types/SensorData';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker } from './inputs/PlatformPicker';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { getSensorSchema } from '../../registry';
import { getAlarmDirection } from '../../utils/sensorAlarmUtils';
import { sensorRegistry } from '../../services/SensorDataRegistry';
import {
  SOUND_PATTERNS,
  MarineAudioAlertManager,
} from '../../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../services/alarms/types';
import { log } from '../../utils/logging/logger';

/* Extracted Components */
import { AlarmThresholdSlider } from './sensor-config/AlarmThresholdSlider';
import { SoundPatternControl } from './sensor-config/SoundPatternControl';
import { InstanceTabBar } from './sensor-config/InstanceTabBar';
import { MetricSelector } from './sensor-config/MetricSelector';
import { ConfigFieldRenderer } from './sensor-config/ConfigFieldRenderer';

/* Form Hook */
import { useSensorConfigForm } from '../../hooks/useSensorConfigForm';

/* Constants */
import { SOUND_TEST_DURATION_MS } from '../../constants/timings';

export interface SensorConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  sensorType?: SensorType;
}

interface SensorInstance {
  instance: number;
  name?: string;
  location?: string;
  lastUpdate?: number;
}

/**
 * SensorConfigDialog Component
 *
 * Renders sensor configuration UI with RHF integration via useSensorConfigForm hook.
 * Manages sensor selection, instance switching, metric selection, and alarm configuration.
 * All form state and validation handled by hook - dialog is a pure rendering component.
 */
export const SensorConfigDialog: React.FC<SensorConfigDialogProps> = ({
  visible,
  onClose,
  sensorType: initialSensorType,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;

  // Sensor type and instance state (minimal, only for UI routing)
  const [selectedSensorType, setSelectedSensorType] = React.useState<SensorType | null>(
    initialSensorType || null,
  );
  const [selectedInstance, setSelectedInstance] = React.useState<number>(0);

  // Get available sensors from registry
  const availableSensorTypes = useMemo(() => {
    const allSensors = sensorRegistry.getAllSensors();
    const uniqueTypes = new Set(allSensors.map((s) => s.sensorType));
    return Array.from(uniqueTypes) as SensorType[];
  }, []);

  // Get instances for selected sensor
  const instances = useMemo(() => {
    if (!selectedSensorType) return [];
    const sensors = sensorRegistry.getAllOfType(selectedSensorType);
    return sensors.map((sensorInstance) => ({
      instance: sensorInstance.instance,
      name: `${selectedSensorType} ${sensorInstance.instance}`,
      location: undefined,
      lastUpdate: Date.now(),
    })) as SensorInstance[];
  }, [selectedSensorType]);

  // Initialize sensor on open
  React.useEffect(() => {
    if (visible && !initialSensorType && !selectedSensorType && availableSensorTypes.length > 0) {
      setSelectedSensorType(availableSensorTypes[0]);
    }
  }, [visible, initialSensorType, selectedSensorType, availableSensorTypes]);

  // Reset instance when sensor type changes
  React.useEffect(() => {
    if (instances.length > 0 && !instances.find((i) => i.instance === selectedInstance)) {
      setSelectedInstance(instances[0].instance);
    }
  }, [instances, selectedInstance]);

  // Get form hook (all form logic centralized here)
  const { form, enrichedThresholds, currentMetricValue, handlers, computed } = useSensorConfigForm(
    selectedSensorType,
    selectedInstance,
    async (sensorType, instance, data) => {
      if (!sensorType) return;
      
      // Capture store methods inside callback to avoid stale closure
      const updateSensorThresholds = useNmeaStore.getState().updateSensorThresholds;
      const setConfig = useSensorConfigStore.getState().setConfig;
      
      // If name field is empty, set default format
      const trimmedName = data.name?.trim();
      const defaultName = trimmedName || `${sensorType}-${instance}`;

      // ✅ UNIFIED (Schema V4): Top-level only has name + context
      // All thresholds/sounds/direction now in metrics object
      const updates: Partial<SensorConfiguration> = {
        name: defaultName,
      };

      // ✅ UNIFIED (Schema V4): Always save thresholds to metrics object
      // For single-metric sensors: metrics = { depth: { critical, warning, direction, ... } }
      // For multi-metric sensors: metrics = { voltage: {...}, current: {...} }
      const metricKey = data.selectedMetric; // Always populated (watchedMetric || defaultMetric)
      if (metricKey) {
        updates.metrics = {
          [metricKey]: {
            critical: data.criticalValue,
            warning: data.warningValue,
            direction: getAlarmDirection(sensorType, data.selectedMetric).direction,
            criticalSoundPattern: data.criticalSoundPattern,
            warningSoundPattern: data.warningSoundPattern,
            enabled: data.enabled,
          },
        };
      }

      // Generic context handling (schema-driven)
      // Context field determined by schema.contextKey (e.g., 'chemistry', 'engineType')
      // Value stored as string (e.g., 'agm', 'diesel')
      if (data.context) {
        const schema = getSensorSchema(sensorType);
        const contextField = schema.contextKey ? schema.fields[schema.contextKey] : null;
        
        // Validate context value against schema options
        if (contextField?.options) {
          const isValid = contextField.options.includes(data.context);
          if (isValid) {
            updates.context = data.context;
          } else {
            log.app('SensorConfigDialog: Invalid context value', () => ({
              sensorType,
              contextKey: schema.contextKey,
              value: data.context,
              allowedValues: contextField.options,
            }));
          }
        } else {
          // No context validation defined - allow any string
          updates.context = data.context;
        }
      }

      try {
        updateSensorThresholds(sensorType, instance, updates);
        await setConfig(sensorType, instance, updates);
      } catch (error) {
        log.app('SensorConfigDialog: Error saving config', () => ({
          error: error instanceof Error ? error.message : String(error),
        }));
        if (Platform.OS === 'web') {
          alert('Failed to save configuration. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to save configuration. Please try again.');
        }
        throw error;
      }
    },
  );

  // Get glove mode setting (before useMemo that depends on sensorConfig)
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);

  // Get sensor config EARLY - before useMemo that uses it
  // Safe to call: selectedSensorType is guaranteed to exist by guard below
  const sensorConfig = selectedSensorType ? getSensorSchema(selectedSensorType) : null;

  // Cache filtered config fields to avoid calling filter twice
  // Now safe: sensorConfig is defined above
  // Convert fields object to array with key property for ConfigFieldRenderer
  const editableFields = useMemo(() => {
    if (!sensorConfig) return [];
    return Object.entries(sensorConfig.fields)
      .filter(([_, field]) => field.iostate !== 'readOnly')
      .map(([key, field]) => ({ ...field, key }));
  }, [sensorConfig]);

  // Compute alarm metrics from fields with alarm configuration
  const alarmMetrics = useMemo(() => {
    if (!sensorConfig) return [];
    return Object.entries(sensorConfig.fields)
      .filter(([_, field]) => field.alarm !== undefined)
      .map(([key, field]) => ({
        key,
        label: field.label,
        category: field.unitType,
      }));
  }, [sensorConfig]);

  // Watch form fields for conditional rendering (performance optimized)
  const enabledValue = useWatch({ control: form.control, name: 'enabled' });
  const selectedMetricValue = useWatch({ control: form.control, name: 'selectedMetric' });
  const criticalPatternValue = useWatch({ control: form.control, name: 'criticalSoundPattern' });
  const warningPatternValue = useWatch({ control: form.control, name: 'warningSoundPattern' });
  const criticalValueWatched = useWatch({ control: form.control, name: 'criticalValue' });
  const warningValueWatched = useWatch({ control: form.control, name: 'warningValue' });

  // Track unsaved changes for UI feedback
  const hasUnsavedChanges = form.formState.isDirty && !form.formState.isSubmitting;

  // Early guard: No sensor selected
  if (!selectedSensorType) {
    return (
      <BaseConfigDialog visible={visible} onClose={onClose} title="Sensor Configuration">
        <View style={styles.emptyState}>
          {availableSensorTypes.length === 0 ? (
            <>
              <UniversalIcon name="alert-circle-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>
                No sensors detected
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                Connect to an NMEA network to configure sensors
              </Text>
            </>
          ) : (
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              Select a sensor to configure
            </Text>
          )}
        </View>
      </BaseConfigDialog>
    );
  }

  // Guard: sensorConfig failed to load (after selectedSensorType guard)
  if (!sensorConfig) {
    return (
      <BaseConfigDialog visible={visible} onClose={onClose} title="Sensor Configuration">
        <View style={styles.emptyState}>
          <UniversalIcon name="alert-circle-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.text }]}>
            Configuration unavailable
          </Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
            Unable to load sensor configuration
          </Text>
        </View>
      </BaseConfigDialog>
    );
  }

  const soundPatternItems = [
    { label: 'None', value: 'none' },
    ...SOUND_PATTERNS.map((p) => ({ label: p.label, value: p.value })),
  ];

  return (
    <BaseConfigDialog
      visible={visible}
      onClose={async () => {
        const shouldClose = await handlers.handleClose();
        if (shouldClose) {
          onClose(); // Actually close the dialog
        }
      }}
      title="Sensor Configuration"
      headerRight={
        <View style={styles.headerStatus}>
          {form.formState.isSubmitting && (
            <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.statusBadgeText}>Saving...</Text>
            </View>
          )}
          {hasUnsavedChanges && !form.formState.isSubmitting && (
            <View style={[styles.statusBadge, { backgroundColor: theme.warning }]}>
              <UniversalIcon name="alert-circle" size={14} color="white" />
              <Text style={styles.statusBadgeText}>Unsaved</Text>
            </View>
          )}
        </View>
      }
    >
      <ScrollView style={styles.container}>
        {/* Sensor Type Picker - only show if not initialized with specific type */}
        {!initialSensorType && availableSensorTypes.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sensor Selection</Text>
            <View style={styles.settingRow}>
              <Text style={[styles.label, { color: theme.text }]}>Sensor Type</Text>
              <View style={styles.inputWrapper}>
                <PlatformPicker
                  value={selectedSensorType}
                  onValueChange={async (value) => {
                    await handlers.handleSensorTypeSwitch(value as SensorType);
                    setSelectedSensorType(value as SensorType);
                  }}
                  items={availableSensorTypes.map((type) => ({
                    label: getSensorSchema(type).displayName,
                    value: type,
                  }))}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Instance Tabs */}
        <InstanceTabBar
          instances={instances}
          selectedInstance={selectedInstance}
          onInstanceSelect={async (instance) => {
            await handlers.handleInstanceSwitch(instance);
            setSelectedInstance(instance);
          }}
          theme={theme}
        />

        {/* Config Fields - render each field via ConfigFieldRenderer */}
        {editableFields.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sensor Configuration</Text>
            {editableFields.map((field) => (
              <ConfigFieldRenderer
                key={field.key}
                field={field}
                value={form.watch(field.key as any)}
                onChange={(fieldKey: string, value: any) => form.setValue(fieldKey as any, value)}
                sensorInstance={
                  selectedSensorType
                    ? sensorRegistry.get(selectedSensorType, selectedInstance) ?? undefined
                    : undefined
                }
                theme={theme}
                gloveMode={gloveMode}
              />
              ))}
          </View>
        )}

        {/* Alarm Configuration Section */}
        {computed.supportsAlarms && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Alarms</Text>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Enable alarms</Text>
              <PlatformToggle
                label=""
                value={enabledValue ?? false}
                onValueChange={(value) => {
                  if (!value && ['depth', 'battery', 'engine'].includes(selectedSensorType)) {
                    handlers.handleEnabledChange(value);
                  } else {
                    form.setValue('enabled', value);
                  }
                }}
              />
            </View>

            {enabledValue && (
              <View style={styles.settingGroup}>
                {/* Metric Display/Selector */}
                {computed.requiresMetricSelection && alarmMetrics.length > 0 ? (
                  <>
                    <Text style={styles.groupLabel}>Alarm metric</Text>
                    <MetricSelector
                      alarmMetrics={alarmMetrics}
                      selectedMetric={selectedMetricValue ?? ''}
                      onMetricChange={(metric) => handlers.handleMetricChange(metric)}
                      theme={theme}
                    />
                  </>
                ) : computed.metricLabel ? (
                  <>
                    <Text style={styles.groupLabel}>Metric</Text>
                    <View style={[styles.metricDisplay, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.metricDisplayLabel, { color: theme.text }]}>
                        {computed.metricLabel}
                      </Text>
                      {currentMetricValue && (
                        <Text style={[styles.metricDisplayValue, { color: theme.primary }]}>
                          {currentMetricValue}
                        </Text>
                      )}
                    </View>
                  </>
                ) : null}

                {/* Threshold Slider - Dumb component with validated props */}
                {/* ✅ UNIFIED: Slider always rendered when config available (no requiresMetricSelection check) */}
                {computed.alarmConfig && computed.sliderPresentation && enrichedThresholds && (
                  <View style={styles.sliderSection}>
                    <Text style={styles.groupLabel}>Threshold values</Text>
                    <AlarmThresholdSlider
                      min={enrichedThresholds.display.min.value}
                      max={enrichedThresholds.display.max.value}
                      direction={computed.alarmConfig.direction}
                      currentCritical={criticalValueWatched ?? enrichedThresholds.display.critical?.value ?? enrichedThresholds.display.min.value}
                      currentWarning={warningValueWatched ?? enrichedThresholds.display.warning?.value ?? enrichedThresholds.display.max.value}
                      presentation={computed.sliderPresentation}
                      formula={computed.alarmFormula}
                      sensorMetrics={computed.sensorMetrics}
                      ratioUnit={computed.ratioUnit}
                      onThresholdsChange={(critical, warning) => {
                        form.setValue('criticalValue', critical);
                        form.setValue('warningValue', warning);
                      }}
                      theme={theme}
                    />
                  </View>
                )}

                {/* Sound Pattern Control */}
                <SoundPatternControl
                  criticalPattern={criticalPatternValue ?? 'rapid_pulse'}
                  warningPattern={warningPatternValue ?? 'warble'}
                  soundPatternItems={soundPatternItems}
                  onCriticalChange={(pattern) => form.setValue('criticalSoundPattern', pattern)}
                  onWarningChange={(pattern) => form.setValue('warningSoundPattern', pattern)}
                  onTestSound={async (soundPattern: string) => {
                    if (soundPattern === 'none') return;
                    try {
                      const audioManager = MarineAudioAlertManager.getInstance();
                      await audioManager.testAlarmSound(
                        CriticalAlarmType.ENGINE_OVERHEAT,
                        AlarmEscalationLevel.WARNING,
                        SOUND_TEST_DURATION_MS,
                        soundPattern,
                      );
                    } catch (error) {
                      log.app('SensorConfigDialog: Error playing test sound', () => ({
                        error: error instanceof Error ? error.message : String(error),
                      }));
                    }
                  }}
                  isNarrow={isNarrow}
                  theme={theme}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </BaseConfigDialog>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 20,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingGroup: {
    marginTop: 16,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  inputWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 12,
  },
  sliderSection: {
    marginTop: 16,
  },
  metricDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  metricDisplayLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricDisplayValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
  },
  sliderMinMax: {
    height: 60,
    paddingTop: 5,
  },
  minMaxText: {
    fontSize: 10,
    minWidth: 40,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sliderContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // NEW: Unsaved changes indicator
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});
