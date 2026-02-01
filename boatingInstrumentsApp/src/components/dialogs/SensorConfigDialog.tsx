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
import { useSettingsStore } from '../../store/settingsStore';
import { usePresentationStore } from '../../presentation/presentationStore';
import { SensorType, SensorConfiguration } from '../../types/SensorData';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker } from './inputs/PlatformPicker';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { getSensorSchema, getAlarmDefaults, getAlarmDirection } from '../../registry';
import { getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { sensorRegistry } from '../../services/SensorDataRegistry';
import { ThresholdPresentationService } from '../../services/ThresholdPresentationService';
import { SENSOR_SCHEMAS } from '../../registry/sensorSchemas';
import { ensureFormatFunction } from '../../presentation/presentations';
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
    let isMounted = true;
    
    if (visible && !initialSensorType && !selectedSensorType && availableSensorTypes.length > 0) {
      if (isMounted) {
        setSelectedSensorType(availableSensorTypes[0]);
      }
    }
    
    return () => { isMounted = false; };
  }, [visible, initialSensorType, selectedSensorType, availableSensorTypes]);

  // Reset instance when sensor type changes
  React.useEffect(() => {
    let isMounted = true;
    
    if (instances.length > 0 && !instances.find((i) => i.instance === selectedInstance)) {
      if (isMounted) {
        setSelectedInstance(instances[0].instance);
      }
    }
    
    return () => { isMounted = false; };
  }, [instances, selectedInstance]);

  // Get form hook (simplified - just form state + save)
  const { form, handlers } = useSensorConfigForm(
    selectedSensorType,
    selectedInstance,
    async (sensorType, instance, data) => {
      if (!sensorType) return;

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
      log.sensorConfig('onSave processing metric', () => ({
        metricKey,
        criticalValue: data.criticalValue,
        warningValue: data.warningValue,
      }));
      if (metricKey) {
        // Detect if this metric uses formula mode (ratio-based thresholds)
        const schema = getSensorSchema(sensorType);
        const fieldDef = schema.fields[metricKey as keyof typeof schema.fields];
        const hasFormula = fieldDef?.alarm &&
          Object.values((fieldDef.alarm as any).contexts || {}).some((ctx: any) =>
            ctx.critical?.formula !== undefined || ctx.warning?.formula !== undefined
          );
        log.sensorConfig('Detected formula mode', () => ({ hasFormula }));

        // Build metric config matching discriminated union structure
        const metricConfig: any = {
          direction: getAlarmDirection(sensorType, data.selectedMetric ?? '') ?? 'below',
          criticalSoundPattern: data.criticalSoundPattern,
          warningSoundPattern: data.warningSoundPattern,
          critical: data.criticalValue,
          warning: data.warningValue,
          // enabled: REMOVED - per-metric enabled now managed by handleMetricEnabledChange
        };

        // Add formula mode properties if applicable
        if (hasFormula) {
          // Extract formula from schema (assumes first context has formula)
          const contextValues = Object.values((fieldDef.alarm as any).contexts || {});
          const formulaDef = (contextValues[0] as any)?.critical?.formula;
          
          if (formulaDef) {
            metricConfig.mode = 'formula';
            metricConfig.formula = formulaDef;
            log.sensorConfig('Saving as formula mode', () => ({
              metricKey,
              criticalRatio: metricConfig.critical,
              warningRatio: metricConfig.warning,
              formula: metricConfig.formula,
            }));
          }
        } else {
          metricConfig.mode = 'direct';
          log.sensorConfig('Saving as direct mode', () => ({
            metricKey,
            critical: metricConfig.critical,
            warning: metricConfig.warning,
          }));
        }

        // ⭐ CRITICAL FIX (Jan 2025): Merge with existing metrics to preserve other metrics' config
        const currentConfig = useNmeaStore.getState().getSensorConfig(sensorType, instance);
        log.sensorConfig('Current config before merge', () => ({ metrics: currentConfig?.metrics }));
        updates.metrics = {
          ...currentConfig?.metrics, // Preserve existing metrics (voltage, current, etc.)
          [metricKey]: {
            ...currentConfig?.metrics?.[metricKey], // Preserve existing metric config (e.g., enabled state)
            ...metricConfig, // Apply new threshold values
          },
        };
        log.sensorConfig('Final updates.metrics to be saved', () => ({ metrics: updates.metrics }));
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
        log.sensorConfig('Saving config to store', () => ({ sensorType, instance, updates }));
        // ✅ FIXED: Get store methods at point of use to avoid stale closures
        const store = useNmeaStore.getState();
        store.updateSensorThresholds(sensorType, instance, updates);
        await store.setSensorConfig(sensorType, instance, updates);
        log.sensorConfig('Save completed, verifying', () => ({ sensorType, instance }));
        // Verify it was saved
        const verifyConfig = useNmeaStore.getState().getSensorConfig(sensorType, instance);
        log.sensorConfig('Verified saved config', () => ({ sensorType, instance, config: verifyConfig }));
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

  // ⭐ SIMPLIFIED ARCHITECTURE (Jan 2026): Computed values moved from hook to dialog
  // Hook handles FORM STATE, dialog handles PRESENTATION

  // Get selected metric for enrichment
  const selectedMetricValue = useWatch({ control: form.control, name: 'selectedMetric' });

  // Enrich thresholds for selected metric (dialog-local, not in hook)
  const enrichedThresholds = useMemo(() => {
    if (!selectedSensorType || !selectedMetricValue) return null;
    return ThresholdPresentationService.getEnrichedThresholds(
      selectedSensorType,
      selectedInstance,
      selectedMetricValue,
    );
  }, [selectedSensorType, selectedInstance, selectedMetricValue]);

  // Get current live value for metric selector display
  const currentMetricValue = useNmeaStore(
    (state) => {
      if (!selectedSensorType || !selectedMetricValue) return undefined;
      const sensorInstance = sensorRegistry.get(selectedSensorType, selectedInstance);
      const metricValue = sensorInstance?.getMetric(selectedMetricValue);
      const formatted = metricValue?.formattedValueWithUnit;
      // Safety: ensure we never return empty string or "." that could leak as text node
      if (!formatted || formatted.trim() === '' || formatted.trim() === '.') {
        return undefined;
      }
      return formatted;
    }
  );

  // Check if sensor supports alarms
  const supportsAlarms = useMemo(() => {
    if (!selectedSensorType) return false;
    const schema = SENSOR_SCHEMAS[selectedSensorType as keyof typeof SENSOR_SCHEMAS];
    return schema && Object.values(schema.fields).some(
      (field): field is any => 'alarm' in field && !!field.alarm
    );
  }, [selectedSensorType]);

  // Get alarm config for slider (direction, range, step)
  const alarmConfig = useMemo(() => {
    if (!selectedSensorType || !selectedMetricValue || !supportsAlarms) return null;
    const direction = getAlarmDirection(selectedSensorType, selectedMetricValue) ?? 'below';
    // Get sensor config to determine context for alarm defaults
    const config = useNmeaStore.getState().getSensorConfig(selectedSensorType, selectedInstance);
    const defaults = getAlarmDefaults(selectedSensorType, selectedMetricValue, config?.context);
    if (!defaults?.thresholdRange) return null;

    return {
      direction,
      triggerHint: getAlarmTriggerHint(selectedSensorType),
      min: defaults.thresholdRange.min,
      max: defaults.thresholdRange.max,
      step: 0.1,
    };
  }, [selectedSensorType, selectedMetricValue, supportsAlarms]);

  // Get slider presentation (format function + symbol)
  const sliderPresentation = useMemo(() => {
    if (!selectedSensorType || !selectedMetricValue) return null;
    const schema = SENSOR_SCHEMAS[selectedSensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[selectedMetricValue as keyof typeof schema.fields];
    if (!fieldDef || !('unitType' in fieldDef)) return null;

    const presentation = usePresentationStore.getState().getPresentationForCategory(fieldDef.unitType as any);
    if (!presentation) return null;

    // CRITICAL: Sanitize symbol to prevent "." from leaking as text node
    const symbol = presentation.symbol?.trim() || '';
    const sanitizedSymbol = (symbol && symbol.length > 0 && symbol !== '.') ? symbol : '';

    return {
      format: ensureFormatFunction(presentation),
      symbol: sanitizedSymbol,
    };
  }, [selectedSensorType, selectedMetricValue]);

  // Get alarm formula (for ratio mode detection)
  const alarmFormula = useMemo(() => {
    if (!selectedSensorType || !selectedMetricValue) return undefined;
    const schema = SENSOR_SCHEMAS[selectedSensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[selectedMetricValue as keyof typeof schema.fields];
    if (!fieldDef || !('alarm' in fieldDef)) return undefined;
    return (fieldDef.alarm as any)?.formula as string | undefined;
  }, [selectedSensorType, selectedMetricValue]);

  // Get sensor metrics (for formula evaluation)
  // ✅ FIXED: Build metrics Map from SensorInstance getMetric() calls
  const sensorMetrics = useMemo(() => {
    if (!selectedSensorType) return undefined;
    const sensorInstance = sensorRegistry.get(selectedSensorType, selectedInstance);
    if (!sensorInstance) return undefined;
    
    // Build Map of all metrics for formula evaluation
    const metricsMap = new Map<string, any>();
    const metricKeys = sensorInstance.getMetricKeys();
    
    for (const key of metricKeys) {
      const metric = sensorInstance.getMetric(key);
      if (metric) {
        metricsMap.set(key, metric.value); // Store converted display value
      }
    }
    
    return metricsMap;
  }, [selectedSensorType, selectedInstance]);

  // Get ratio unit (for indirect threshold display)
  const ratioUnit = useMemo(() => {
    if (!selectedSensorType || !selectedMetricValue || !alarmFormula) return undefined;
    const schema = SENSOR_SCHEMAS[selectedSensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[selectedMetricValue as keyof typeof schema.fields];
    if (!fieldDef || !('alarm' in fieldDef)) return undefined;

    const alarm = fieldDef.alarm as any;
    const firstContext = Object.keys(alarm.contexts || {})[0];
    const contextDef = firstContext ? alarm.contexts[firstContext] : null;
    return contextDef?.critical?.indirectThresholdUnit;
  }, [selectedSensorType, selectedMetricValue, alarmFormula]);

  // Bundle computed values (same API as before, but computed here instead of in hook)
  const computed = useMemo(() => ({
    alarmConfig,
    enrichedThresholds,
    sliderPresentation,
    alarmFormula,
    sensorMetrics,
    ratioUnit,
    resolvedRange: enrichedThresholds?.resolvedRange,
    formulaContext: enrichedThresholds?.formulaContext,
    supportsAlarms,
  }), [alarmConfig, enrichedThresholds, sliderPresentation, alarmFormula, sensorMetrics, ratioUnit, supportsAlarms]);

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
      .map(([key, field]) => {
        // Safety: ensure label is never just "." or empty
        const label = field.label && field.label.trim() && field.label.trim() !== '.'
          ? field.label.trim()
          : key; // Fallback to key name if label invalid
        return {
          key,
          label,
          category: field.unitType,
        };
      });
  }, [sensorConfig]);

  // Watch form fields for conditional rendering (performance optimized)
  // const enabledValue = useWatch({ control: form.control, name: 'enabled' });  // REMOVED: Now per-metric
  // selectedMetricValue already declared above in computed properties section
  // ✅ FIXED: Consolidate multiple useWatch calls into single subscription
  const {
    criticalSoundPattern: criticalPatternValue,
    warningSoundPattern: warningPatternValue,
    criticalValue: criticalValueWatched,
    warningValue: warningValueWatched,
  } = useWatch({
    control: form.control,
    name: ['criticalSoundPattern', 'warningSoundPattern', 'criticalValue', 'warningValue'],
  }) as {
    criticalSoundPattern?: string;
    warningSoundPattern?: string;
    criticalValue?: number;
    warningValue?: number;
  };

  // Watch current metric's enabled state from store (per-metric alarm enable)
  const currentMetricEnabled: boolean = useNmeaStore(
    (state) => {
      if (!selectedSensorType || !selectedMetricValue) return false;
      const config = state.getSensorConfig(selectedSensorType, selectedInstance);
      return config?.metrics?.[selectedMetricValue]?.enabled ?? true; // Default enabled
    }
  ) as boolean;

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
        form.formState.isSubmitting ? (
          <View style={styles.headerStatus}>
            <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.statusBadgeText}>Saving...</Text>
            </View>
          </View>
        ) : null
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
                onChange={(fieldKey: string, value: any) => {
                  form.setValue(fieldKey as any, value, { shouldDirty: false });
                  handlers.saveImmediately();
                }}
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

            {/* ✅ PER-METRIC: Metric label on top, dropdown and alarm toggle side-by-side */}
            {alarmMetrics.length > 0 && (
              <View style={styles.metricAlarmRow}>
                <Text style={[styles.label, { color: theme.text }]}>Metric</Text>
                <View style={styles.metricControlsRow}>
                  {/* Metric dropdown */}
                  
                  <View style={styles.metricDropdownContainer}>
                    <PlatformPicker
                      value={selectedMetricValue || ''}
                      onValueChange={(value) => handlers.handleMetricChange(String(value))}
                      items={alarmMetrics.map((m) => {
                        const isSelected = m.key === selectedMetricValue;
                        const valueDisplay = isSelected && currentMetricValue ? ` - ${currentMetricValue}` : '';
                        return {
                          label: `${m.label}${valueDisplay}`,
                          value: m.key,
                        };
                      })}
                    />
                  </View>
                  
                  {/* Alarm toggle */}
                  <View style={styles.alarmToggleRow}>
                    <Text style={[styles.toggleLabel, { color: theme.text }]}>Alarm</Text>
                    <PlatformToggle
                      label=""
                      value={currentMetricEnabled}
                      onValueChange={(value) => {
                        if (selectedMetricValue) {
                          handlers.handleMetricEnabledChange(selectedMetricValue, value);
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Conditional Rendering: Only show threshold/sound controls when metric alarm is enabled */}
            {currentMetricEnabled && (
              <View style={styles.settingGroup}>

                {/* Threshold Slider - Dumb component with validated props */}
                {/* ✅ UNIFIED: Slider always rendered when config available (no requiresMetricSelection check) */}
                {/* ✅ FIXED: Key includes metric to force remount when switching metrics (prevents stale state) */}
                {computed.alarmConfig && computed.sliderPresentation && enrichedThresholds ? (
                  <View style={styles.sliderSection}>
                    <AlarmThresholdSlider
                      key={`${selectedSensorType}-${selectedInstance}-${selectedMetricValue}`}
                      min={enrichedThresholds.display.min.value}
                      max={enrichedThresholds.display.max.value}
                      direction={computed.alarmConfig.direction}
                      currentCritical={criticalValueWatched ?? enrichedThresholds.display.critical?.value ?? enrichedThresholds.display.min.value}
                      currentWarning={warningValueWatched ?? enrichedThresholds.display.warning?.value ?? enrichedThresholds.display.max.value}
                      presentation={computed.sliderPresentation}
                      formula={computed.alarmFormula}
                      sensorMetrics={computed.sensorMetrics}
                      ratioUnit={computed.ratioUnit}
                      resolvedRange={computed.resolvedRange}
                      formulaContext={computed.formulaContext}
                      onThresholdsChange={(critical, warning) => {
                        form.setValue('criticalValue', critical, { shouldDirty: false });
                        form.setValue('warningValue', warning, { shouldDirty: false });
                        handlers.saveImmediately();
                      }}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {/* Sound Pattern Control */}
                {/*
                <SoundPatternControl
                  criticalPattern={criticalPatternValue ?? 'rapid_pulse'}
                  warningPattern={warningPatternValue ?? 'warble'}
                  soundPatternItems={soundPatternItems}
                  onCriticalChange={(pattern) => {
                    form.setValue('criticalSoundPattern', pattern, { shouldDirty: true });
                    handlers.triggerAutoSave();
                  }}
                  onWarningChange={(pattern) => {
                    form.setValue('warningSoundPattern', pattern, { shouldDirty: true });
                    handlers.triggerAutoSave();
                  }}
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
                */}
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
    marginTop: 4,  // Tighter spacing after horizontal row
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
    marginTop: 8,  // Compact spacing for mobile
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
  metricValueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  metricValueLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricValueText: {
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

  // NEW: Per-metric alarm layout - label on top, dropdown and toggle side-by-side
  metricAlarmRow: {
    marginBottom: 12,
  },
  metricControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  metricDropdownContainer: {
    flex: 1,
  },
  alarmToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 110,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
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
