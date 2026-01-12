/**
 * Sensor Configuration Dialog - Refactored Architecture
 *
 * Streamlined from 1700 lines to ~600 lines by extracting components:
 * - AlarmThresholdSlider: Dual-threshold range slider with zone visualization
 * - SoundPatternControl: Unified mobile/desktop sound pattern selection
 * - InstanceTabBar: Multi-instance tab navigation
 * - MetricSelector: Multi-metric alarm configuration dropdown
 *
 * Features:
 * - Registry-driven dynamic form rendering
 * - Explicit save timing (transitions only, no auto-save)
 * - SI unit storage with presentation system conversion
 * - Multi-metric alarm support (battery: voltage/SOC/temp/current)
 * - Direction-aware threshold validation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { z } from 'zod';
import { useFormState } from '../../hooks/useFormState';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { useSensorConfigStore } from '../../store/sensorConfigStore';
import { SensorType, SensorConfiguration } from '../../types/SensorData';
import { DataCategory } from '../../presentation/categories';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker, PlatformPickerItem } from './inputs/PlatformPicker';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { getAlarmDirection, getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { getSensorDisplayName, formatSensorTypeInstance } from '../../utils/sensorDisplayName';
import { sensorRegistry } from '../../services/SensorDataRegistry';
import {
  SOUND_PATTERNS,
  MarineAudioAlertManager,
} from '../../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../services/alarms/types';
import {
  SENSOR_CONFIG_REGISTRY,
  getSensorConfig,
  getAlarmDefaults,
} from '../../registry/SensorConfigRegistry';
import { ThresholdPresentationService } from '../../services/ThresholdPresentationService';
import { log } from '../../utils/logging/logger';

/* Extracted Components */
import { AlarmThresholdSlider } from './sensor-config/AlarmThresholdSlider';
import { SoundPatternControl } from './sensor-config/SoundPatternControl';
import { InstanceTabBar } from './sensor-config/InstanceTabBar';
import { MetricSelector } from './sensor-config/MetricSelector';

/* Utilities */
import {
  getCriticalSliderRange,
  getWarningSliderRange,
  clampToRange,
} from '../../utils/alarmSliderUtils';

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

const createSensorFormSchema = (direction?: 'above' | 'below') =>
  z
    .object({
      name: z.string().optional(),
      enabled: z.boolean(),
      batteryChemistry: z.enum(['lead-acid', 'agm', 'lifepo4']).optional(),
      engineType: z.enum(['diesel', 'gasoline', 'outboard']).optional(),
      selectedMetric: z.string().optional(),
      criticalValue: z.number().optional(),
      warningValue: z.number().optional(),
      criticalSoundPattern: z.string(),
      warningSoundPattern: z.string(),
    })
    .refine(
      (data) => {
        if (data.warningValue !== undefined && data.criticalValue !== undefined && direction) {
          if (direction === 'above') {
            return data.warningValue < data.criticalValue;
          } else {
            return data.warningValue > data.criticalValue;
          }
        }
        return true;
      },
      {
        message: 'Warning threshold must be less severe than critical threshold',
      },
    );

type SensorFormData = z.infer<ReturnType<typeof createSensorFormSchema>>;

export const SensorConfigDialog: React.FC<SensorConfigDialogProps> = ({
  visible,
  onClose,
  sensorType: initialSensorType,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;

  /* NMEA Store Access */
  const updateSensorThresholds = useNmeaStore((state) => state.updateSensorThresholds);
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);
  const setConfig = useSensorConfigStore((state) => state.setConfig);

  /* Available Sensors - Use sensorRegistry instead of removed nmeaData.sensors */
  const availableSensorTypes = useMemo(() => {
    const allSensors = sensorRegistry.getAllSensors();
    const uniqueTypes = new Set(allSensors.map(s => s.sensorType));
    return Array.from(uniqueTypes) as SensorType[];
  }, []);

  /* Selected Sensor & Instance */
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType | null>(
    initialSensorType || null,
  );
  const [selectedInstance, setSelectedInstance] = useState<number>(0);

  /* Instances for Selected Sensor */
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

  /* Initialize selected sensor on open */
  useEffect(() => {
    if (visible && !initialSensorType && !selectedSensorType && availableSensorTypes.length > 0) {
      setSelectedSensorType(availableSensorTypes[0]);
    }
  }, [visible, initialSensorType, selectedSensorType, availableSensorTypes]);

  useEffect(() => {
    if (visible && initialSensorType && initialSensorType !== selectedSensorType) {
      setSelectedSensorType(initialSensorType);
    }
  }, [visible, initialSensorType]);

  useEffect(() => {
    if (instances.length > 0 && !instances.find((i) => i.instance === selectedInstance)) {
      setSelectedInstance(instances[0].instance);
    }
  }, [instances, selectedInstance]);

  /* Derive category from registry */
  const category = useMemo(() => {
    if (!selectedSensorType) return null;
    const sensorConfig = getSensorConfig(selectedSensorType);

    if (sensorConfig.alarmMetrics && sensorConfig.alarmMetrics.length > 0) {
      return sensorConfig.alarmMetrics[0].category || null;
    }

    const categoryMap: Partial<Record<SensorType, DataCategory>> = {
      depth: 'depth',
      speed: 'speed',
      wind: 'wind',
      temperature: 'temperature',
    };

    return categoryMap[selectedSensorType] || null;
  }, [selectedSensorType]);

  /* Sensor Config from Registry */
  const sensorConfig = selectedSensorType ? getSensorConfig(selectedSensorType) : null;
  const requiresMetricSelection = sensorConfig?.alarmSupport === 'multi-metric';
  const supportsAlarms = sensorConfig?.alarmSupport !== 'none';

  /* Sound Pattern Items */
  const soundPatternItems = useMemo<PlatformPickerItem[]>(
    () => [
      { label: 'None', value: 'none' },
      ...SOUND_PATTERNS.map((p) => ({ label: p.label, value: p.value })),
    ],
    [],
  );

  /* Current Thresholds from Store */
  const currentThresholds = useMemo(() => {
    if (!selectedSensorType) return { enabled: false };
    return getSensorThresholds(selectedSensorType, selectedInstance) || { enabled: false };
  }, [selectedSensorType, selectedInstance, getSensorThresholds]);

  /* Initial Metric (for enrichment before formData exists) */
  const initialMetric = useMemo(() => {
    if (!selectedSensorType || !requiresMetricSelection) return undefined;
    const config = getSensorConfig(selectedSensorType);
    return config?.alarmMetrics?.[0]?.key;
  }, [selectedSensorType, requiresMetricSelection]);

  /* Initial Enriched Thresholds (before formData) */
  const initialEnrichedThresholds = useMemo(() => {
    if (!selectedSensorType) return null;

    const enriched = ThresholdPresentationService.getEnrichedThresholds(
      selectedSensorType,
      selectedInstance,
      initialMetric,
    );

    if (!enriched) {
      log.app('SensorConfigDialog: Failed to get initial enriched thresholds', () => ({
        sensorType: selectedSensorType,
        instance: selectedInstance,
        metric: initialMetric,
      }));
    }

    return enriched;
  }, [selectedSensorType, selectedInstance, initialMetric]);

  /* Get current sensor instance data */
  const getSensorInstance = useCallback(() => {
    if (!selectedSensorType) return undefined;
    return sensorRegistry.get(selectedSensorType, selectedInstance);
  }, [selectedSensorType, selectedInstance]);

  /* Initialize Form Data */
  const initialFormData: SensorFormData = useMemo(() => {
    const sensorInstance = getSensorInstance();
    const sensorName = sensorInstance?.name;
    const displayName = selectedSensorType
      ? getSensorDisplayName(
          selectedSensorType,
          selectedInstance,
          currentThresholds,
          sensorName,
        )
      : '';

    const firstMetric = requiresMetricSelection && sensorConfig?.alarmMetrics?.[0]?.key;
    let criticalValue: number | undefined;
    let warningValue: number | undefined;
    let criticalSoundPattern = 'rapid_pulse';
    let warningSoundPattern = 'warble';

    {
      /* Use initial enriched thresholds to get display values */
    }
    if (initialEnrichedThresholds) {
      {
        /* Values are already in display units */
      }
      criticalValue = initialEnrichedThresholds.display.critical?.value;
      warningValue = initialEnrichedThresholds.display.warning?.value;
    }

    {
      /* Get sound patterns from store */
    }
    if (requiresMetricSelection && firstMetric) {
      const metricConfig = currentThresholds.metrics?.[firstMetric];
      if (metricConfig) {
        criticalSoundPattern = metricConfig.criticalSoundPattern || 'rapid_pulse';
        warningSoundPattern = metricConfig.warningSoundPattern || 'warble';
      }
    } else {
      criticalSoundPattern = currentThresholds.criticalSoundPattern || 'rapid_pulse';
      warningSoundPattern = currentThresholds.warningSoundPattern || 'warble';
    }

    return {
      name: displayName,
      enabled: currentThresholds.enabled || false,
      batteryChemistry:
        (currentThresholds.context?.batteryChemistry as 'lead-acid' | 'agm' | 'lifepo4') ||
        'lead-acid',
      engineType:
        (currentThresholds.context?.engineType as 'diesel' | 'gasoline' | 'outboard') || 'diesel',
      selectedMetric: firstMetric || '',
      criticalValue,
      warningValue,
      criticalSoundPattern,
      warningSoundPattern,
    };
  }, [
    selectedSensorType,
    selectedInstance,
    currentThresholds,
    requiresMetricSelection,
    sensorConfig,
    initialEnrichedThresholds,
    getSensorInstance,
  ]);

  /* Form State with useFormState Hook */
  const { formData, updateField, updateFields, saveNow, isDirty, reset } =
    useFormState<SensorFormData>(initialFormData, {
      onSave: async (data) => {
        if (!selectedSensorType) return;

        const updates: Partial<SensorConfiguration> = {
          name: data.name?.trim() || undefined,
          enabled: data.enabled,
          direction: getAlarmDirection(
            selectedSensorType,
            requiresMetricSelection ? data.selectedMetric : undefined,
          ).direction,
          criticalSoundPattern: data.criticalSoundPattern,
          warningSoundPattern: data.warningSoundPattern,
        };

        // Check if we're saving threshold values (critical/warning)
        const hasCriticalValue = data.criticalValue !== undefined;
        const hasWarningValue = data.warningValue !== undefined;
        const isSavingThresholds = hasCriticalValue || hasWarningValue;

        // Only validate enrichedThresholds if we're actually saving threshold values
        if (isSavingThresholds && !enrichedThresholds) {
          const errorMsg =
            'Cannot save thresholds - unit conversion unavailable. This would corrupt data.';
          log.app('SensorConfigDialog: Cannot save - enrichment unavailable', () => ({
            message: errorMsg,
          }));
          if (Platform.OS === 'web') {
            alert(errorMsg);
          } else {
            Alert.alert('Configuration Error', errorMsg);
          }
          throw new Error(errorMsg); // Prevent save
        }

        if (requiresMetricSelection && data.selectedMetric) {
          {/* Multi-metric: convert display values to SI (only if values exist) */}
          const criticalSI =
            data.criticalValue !== undefined && enrichedThresholds
              ? enrichedThresholds.convertToSI(data.criticalValue)
              : undefined;
          const warningSI =
            data.warningValue !== undefined && enrichedThresholds
              ? enrichedThresholds.convertToSI(data.warningValue)
              : undefined;

          updates.metrics = {
            [data.selectedMetric]: {
              critical: criticalSI,
              warning: warningSI,
              criticalSoundPattern: data.criticalSoundPattern,
              warningSoundPattern: data.warningSoundPattern,
              enabled: data.enabled,
            },
          };
        } else {
          {/* Single-metric: convert display values to SI (only if values exist) */}
          updates.critical =
            data.criticalValue !== undefined && enrichedThresholds
              ? enrichedThresholds.convertToSI(data.criticalValue)
              : undefined;
          updates.warning =
            data.warningValue !== undefined && enrichedThresholds
              ? enrichedThresholds.convertToSI(data.warningValue)
              : undefined;
        }

        if (data.batteryChemistry) {
          updates.context = { ...updates.context, batteryChemistry: data.batteryChemistry };
        }
        if (data.engineType) {
          updates.context = { ...updates.context, engineType: data.engineType };
        }

        try {
          updateSensorThresholds(selectedSensorType, selectedInstance, updates);
          await setConfig(selectedSensorType, selectedInstance, updates);
        } catch (error) {
          log.app('SensorConfigDialog: Error saving sensor config', () => ({
            error: error instanceof Error ? error.message : String(error),
            sensorType: selectedSensorType,
            instance: selectedInstance,
          }));
          if (Platform.OS === 'web') {
            alert('Failed to save configuration. Please try again.');
          } else {
            Alert.alert('Error', 'Failed to save configuration. Please try again.');
          }
          throw error; // Re-throw to prevent hook from updating state
        }
      },
      debounceMs: 300,
    });

  /* Update form when sensor/instance changes */
  useEffect(() => {
    reset(initialFormData);
  }, [initialFormData, reset]);

  /* Get Metric-Specific Category for enrichment */
  const currentMetricForEnrichment = useMemo(() => {
    if (!selectedSensorType) return undefined;
    return requiresMetricSelection ? formData.selectedMetric : undefined;
  }, [selectedSensorType, requiresMetricSelection, formData.selectedMetric]);

  /* Memoized Enriched Thresholds - Single Source of Truth */
  const enrichedThresholds = useMemo(() => {
    if (!selectedSensorType) return null;

    const enriched = ThresholdPresentationService.getEnrichedThresholds(
      selectedSensorType,
      selectedInstance,
      currentMetricForEnrichment,
    );

    if (!enriched) {
      log.app('SensorConfigDialog: Failed to get enriched thresholds', () => ({
        sensorType: selectedSensorType,
        instance: selectedInstance,
        metric: currentMetricForEnrichment,
      }));
    }

    return enriched;
  }, [selectedSensorType, selectedInstance, currentMetricForEnrichment]);

  /* Full Presentation for Formatting */
  const metricCategory = useMemo(() => {
    if (!requiresMetricSelection || !formData.selectedMetric || !sensorConfig?.alarmMetrics) {
      return category;
    }
    const metricInfo = sensorConfig.alarmMetrics.find((m) => m.key === formData.selectedMetric);
    return metricInfo?.category || category;
  }, [requiresMetricSelection, formData.selectedMetric, sensorConfig, category]);

  const formatMetricValue = useCallback(
    (siValue: number): string => {
      if (!enrichedThresholds) {
        log.app('SensorConfigDialog: Cannot format value - enriched thresholds unavailable');
        return siValue.toFixed(1);
      }

      {
        /* Convert SI to display and format using memoized enriched data */
      }
      return enrichedThresholds.formatValue(enrichedThresholds.convertFromSI(siValue));
    },
    [enrichedThresholds],
  );

  /* Handle Instance Switch */
  const handleInstanceSwitch = useCallback(
    async (newInstance: number) => {
      // Only save if form has changes AND enrichment is available
      if (isDirty && enrichedThresholds) {
        try {
          await saveNow();
        } catch (error) {
          // Save failed, but still allow switching (form will reset to saved values)
          log.app('SensorConfigDialog: Instance switch save failed, resetting form', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
      setSelectedInstance(newInstance);
    },
    [isDirty, enrichedThresholds, saveNow],
  );

  /* Handle Sensor Type Switch */
  const handleSensorTypeSwitch = useCallback(
    async (newType: SensorType) => {
      // Only save if form has changes AND enrichment is available
      if (isDirty && enrichedThresholds) {
        try {
          await saveNow();
        } catch (error) {
          // Save failed, but still allow switching (form will reset to saved values)
          log.app('SensorConfigDialog: Sensor type switch save failed, resetting form', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
      setSelectedSensorType(newType);
      setSelectedInstance(0);
    },
    [isDirty, enrichedThresholds, saveNow],
  );

  /* Handle Metric Change */
  const handleMetricChange = useCallback(
    (newMetric: string) => {
      if (!selectedSensorType || !sensorConfig) return;

      {
        /* Get enriched thresholds for the NEW metric (can't use memoized one) */
      }
      const enriched = ThresholdPresentationService.getEnrichedThresholds(
        selectedSensorType,
        selectedInstance,
        newMetric,
      );

      if (!enriched) {
        log.app('SensorConfigDialog: Cannot load thresholds for metric', () => ({
          metric: newMetric,
          sensorType: selectedSensorType,
          instance: selectedInstance,
        }));
      }

      const criticalValue = enriched?.display.critical?.value;
      const warningValue = enriched?.display.warning?.value;

      updateFields({
        selectedMetric: newMetric,
        criticalValue,
        warningValue,
      });
    },
    [selectedSensorType, selectedInstance, sensorConfig, updateFields],
  );

  /* Handle Alarm Enable with Safety Confirmation */
  const handleEnabledChange = useCallback(
    (value: boolean) => {
      const isCritical =
        selectedSensorType && ['depth', 'battery', 'engine'].includes(selectedSensorType);

      if (!value && isCritical) {
        if (Platform.OS === 'web') {
          if (
            confirm(
              `${selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`,
            )
          ) {
            updateField('enabled', value);
          }
        } else {
          Alert.alert(
            'Disable Critical Alarm?',
            `${selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Disable',
                style: 'destructive',
                onPress: () => updateField('enabled', value),
              },
            ],
          );
        }
      } else {
        updateField('enabled', value);
      }
    },
    [selectedSensorType, updateField],
  );

  /* Handle Close */
  const handleClose = useCallback(async () => {
    // Only save if form has changes AND enrichment is available
    if (isDirty && enrichedThresholds) {
      try {
        await saveNow();
      } catch (error) {
        // Save failed - user already saw the alert in onSave callback
        log.app('SensorConfigDialog: Close save failed, discarding changes', () => ({
          error: error instanceof Error ? error.message : String(error),
        }));
        // Dialog will close anyway, changes are discarded
      }
    }
    onClose();
  }, [isDirty, enrichedThresholds, saveNow, onClose]);

  /* Test Sound */
  const handleTestSound = useCallback(async (soundPattern: string) => {
    if (soundPattern === 'none') return;

    try {
      const audioManager = MarineAudioAlertManager.getInstance();
      await audioManager.testAlarmSound(
        CriticalAlarmType.ENGINE_OVERHEAT,
        AlarmEscalationLevel.WARNING,
        3000,
        soundPattern,
      );
    } catch (error) {
      log.app('SensorConfigDialog: Error playing test sound', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  /* Get Unit Symbol and Label */
  const { unitSymbol, metricLabel } = useMemo(() => {
    if (!selectedSensorType) {
      return { unitSymbol: '', metricLabel: '' };
    }

    if (requiresMetricSelection && formData.selectedMetric && sensorConfig?.alarmMetrics) {
      const metricInfo = sensorConfig.alarmMetrics.find((m) => m.key === formData.selectedMetric);
      const symbol = enrichedThresholds?.display.min.unit || (metricInfo?.key === 'soc' ? '%' : '');

      return {
        unitSymbol: symbol,
        metricLabel: metricInfo?.label || '',
      };
    }

    const symbol = enrichedThresholds?.display.min.unit || '';
    return {
      unitSymbol: symbol,
      metricLabel: sensorConfig?.displayName || selectedSensorType,
    };
  }, [
    requiresMetricSelection,
    formData.selectedMetric,
    sensorConfig,
    selectedSensorType,
    enrichedThresholds,
  ]);

  /* Get Alarm Configuration */
  const alarmConfig = useMemo(() => {
    if (!selectedSensorType) return null;

    const metric = requiresMetricSelection ? formData.selectedMetric : undefined;
    const direction = getAlarmDirection(selectedSensorType, metric).direction;
    const triggerHint = getAlarmTriggerHint(selectedSensorType);

    const defaults = getAlarmDefaults(selectedSensorType, currentThresholds.context);
    const metricKey = requiresMetricSelection ? formData.selectedMetric : undefined;
    const metricDefaults = metricKey && defaults?.metrics?.[metricKey];

    const baseMin = metricDefaults?.min ?? defaults?.min ?? 0;
    const baseMax = metricDefaults?.max ?? defaults?.max ?? 100;
    const step = metricDefaults?.step ?? defaults?.step ?? 0.1;

    return { direction, triggerHint, min: baseMin, max: baseMax, step };
  }, [selectedSensorType, currentThresholds, requiresMetricSelection, formData.selectedMetric]);

  /* Slider Range Calculations */
  const criticalSliderRange = useMemo(() => {
    if (!alarmConfig) return { min: 0, max: 100 };
    return getCriticalSliderRange(
      alarmConfig.min,
      alarmConfig.max,
      formData.warningValue,
      alarmConfig.direction,
    );
  }, [alarmConfig, formData.warningValue]);

  const warningSliderRange = useMemo(() => {
    if (!alarmConfig) return { min: 0, max: 100 };
    return getWarningSliderRange(
      alarmConfig.min,
      alarmConfig.max,
      formData.criticalValue,
      alarmConfig.direction,
    );
  }, [alarmConfig, formData.criticalValue]);

  /* Auto-clamp slider values when ranges change */
  useEffect(() => {
    if (formData.criticalValue !== undefined) {
      const clampedCritical = clampToRange(
        formData.criticalValue,
        criticalSliderRange.min,
        criticalSliderRange.max,
      );
      if (clampedCritical !== formData.criticalValue) {
        updateField('criticalValue', clampedCritical);
      }
    }

    if (formData.warningValue !== undefined) {
      const clampedWarning = clampToRange(
        formData.warningValue,
        warningSliderRange.min,
        warningSliderRange.max,
      );
      if (clampedWarning !== formData.warningValue) {
        updateField('warningValue', clampedWarning);
      }
    }
  }, [
    criticalSliderRange.min,
    criticalSliderRange.max,
    warningSliderRange.min,
    warningSliderRange.max,
    formData.criticalValue,
    formData.warningValue,
    updateField,
  ]);

  /* Styles - Must be defined BEFORE renderConfigFields callback */
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  /* Render Config Fields */
  const renderConfigFields = useCallback(() => {
    if (!selectedSensorType) return null;

    const config = getSensorConfig(selectedSensorType);

    return config.fields
      .filter((field) => field.iostate !== 'readOnly')
      .map((field) => {
        const sensorInstance = getSensorInstance();
        
        // For readOnlyIfValue, check if field has a value
        // First check hardwareField if specified, otherwise check the field itself
        let hasValue = false;
        let hardwareValue: any = undefined;
        
        // Special case: 'name' field should NEVER read from hardware
        // It's a pure config field initialized from getSensorDisplayName with proper priority
        if (field.key !== 'name') {
          if (field.hardwareField) {
            // Hardware value from a different field
            hardwareValue = sensorInstance?.getMetric(field.hardwareField)?.si_value;
            hasValue = hardwareValue !== undefined && hardwareValue !== null && hardwareValue !== '';
          } else {
            // Check the field's own value in the sensor instance
            const fieldMetric = sensorInstance?.getMetric(field.key);
            const fieldValue = fieldMetric?.si_value ?? fieldMetric?.value;
            hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            if (hasValue) {
              hardwareValue = fieldValue;
            }
          }
        }
        
        const isReadOnly =
          field.iostate === 'readOnly' ||
          (field.iostate === 'readOnlyIfValue' && hasValue);
        
        // Calculate currentValue with special handling for 'name' field
        let currentValue: any;
        if (field.key === 'name') {
          // For name field: if empty, use fallback format "SensorType Instance"
          const formValue = formData[field.key as keyof SensorFormData];
          if (formValue && String(formValue).trim()) {
            currentValue = formValue;
          } else {
            // Use fallback format when name is empty
            currentValue = formatSensorTypeInstance(selectedSensorType, selectedInstance);
          }
        } else {
          currentValue =
            hardwareValue !== undefined
              ? hardwareValue
              : formData[field.key as keyof SensorFormData] ?? field.default;
        }

        // Switch on uiType to determine rendering (valueType determines data handling)
        switch (field.uiType) {
          case 'textInput':
            return (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={String(currentValue || '')}
                  onChangeText={(text) => {
                    // Strict parsing based on valueType
                    if (field.valueType === 'string') {
                      updateField(field.key as keyof SensorFormData, text);
                    } else if (field.valueType === 'number') {
                      const num = parseFloat(text);
                      updateField(
                        field.key as keyof SensorFormData,
                        Number.isNaN(num) ? undefined : num,
                      );
                    }
                  }}
                  placeholder={field.helpText}
                  placeholderTextColor={theme.textSecondary}
                  editable={!isReadOnly}
                />
              </View>
            );

          case 'numericInput':
            return (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {field.label}
                  {field.valueType === 'number' &&
                  'min' in field &&
                  'max' in field &&
                  field.min !== undefined &&
                  field.max !== undefined ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {` (${field.min}-${field.max})`}
                    </Text>
                  ) : null}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={String(currentValue ?? '')}
                  onChangeText={(text) => {
                    const num = parseFloat(text);

                    // Strict validation: allow NaN (no valid reading), reject Infinity
                    if (!Number.isNaN(num) && !Number.isFinite(num)) {
                      // Reject Infinity (parser bug)
                      return;
                    }

                    // Apply min/max clamping if defined
                    let finalValue = num;
                    if (
                      !Number.isNaN(num) &&
                      field.valueType === 'number' &&
                      'min' in field &&
                      'max' in field
                    ) {
                      if (field.min !== undefined && num < field.min) finalValue = field.min;
                      if (field.max !== undefined && num > field.max) finalValue = field.max;
                    }

                    updateField(
                      field.key as keyof SensorFormData,
                      Number.isNaN(finalValue) ? undefined : finalValue,
                    );
                  }}
                  placeholder={field.helpText}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  editable={!isReadOnly}
                />
              </View>
            );

          case 'picker':
            return (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
                <PlatformPicker
                  value={String(currentValue || field.default || '')}
                  onValueChange={(value) => {
                    // Enum validation for string fields
                    if (field.valueType === 'string' && 'options' in field && field.options) {
                      const isValid = field.options.some((opt) =>
                        typeof opt === 'string' ? opt === value : opt.value === value,
                      );
                      if (!isValid) {
                        log.app('SensorConfigDialog: Invalid enum value', () => ({
                          value,
                          fieldKey: field.key,
                          allowedOptions: field.options,
                        }));
                        return;
                      }
                    }
                    updateField(field.key as keyof SensorFormData, String(value));
                  }}
                  items={
                    field.valueType === 'string' && 'options' in field && field.options
                      ? field.options.map((opt) =>
                          typeof opt === 'string'
                            ? { label: opt, value: opt }
                            : { label: opt.label, value: opt.value },
                        )
                      : []
                  }
                />
                {isReadOnly ? (
                  <Text style={[styles.helpText, { color: theme.success }]}>
                    Provided by sensor hardware
                  </Text>
                ) : null}
              </View>
            );

          case 'toggle':
            return (
              <View key={field.key} style={styles.field}>
                <View style={styles.toggleRow}>
                  <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
                  <Switch
                    value={Boolean(currentValue ?? field.default ?? false)}
                    onValueChange={(value) => {
                      // Strict boolean validation
                      if (typeof value !== 'boolean') {
                        log.app('SensorConfigDialog: Invalid boolean value', () => ({
                          fieldKey: field.key,
                          valueType: typeof value,
                        }));
                        return;
                      }
                      updateField(field.key as keyof SensorFormData, value);
                    }}
                    disabled={isReadOnly}
                  />
                </View>
                {field.helpText ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                    {field.helpText}
                  </Text>
                ) : null}
              </View>
            );

          case null:
            // Field not exposed in UI (internal/computed)
            return null;

          default:
            log.app('SensorConfigDialog: Unknown uiType', () => ({
              uiType: field.uiType,
              fieldKey: field.key,
            }));
            return null;
        }
      });
  }, [selectedSensorType, formData, selectedInstance, theme, updateField, getSensorInstance]);

  /* Memoize rendered config fields */
  const configFieldsJSX = useMemo(() => renderConfigFields(), [renderConfigFields]);

  /* Empty State */
  if (availableSensorTypes.length === 0) {
    return (
      <BaseConfigDialog visible={visible} onClose={onClose} title="Sensor Configuration">
        <View style={styles.emptyState}>
          <UniversalIcon name="alert-circle-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.text }]}>No sensors detected</Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
            Connect to an NMEA network to configure sensors
          </Text>
        </View>
      </BaseConfigDialog>
    );
  }

  if (!selectedSensorType) {
    return (
      <BaseConfigDialog visible={visible} onClose={onClose} title="Sensor Configuration">
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: theme.text }]}>
            Select a sensor to configure
          </Text>
        </View>
      </BaseConfigDialog>
    );
  }

  return (
    <BaseConfigDialog visible={visible} onClose={handleClose} title="Sensor Configuration">
      <ScrollView style={styles.container}>
        {/* Sensor Type Picker */}
        {!initialSensorType && availableSensorTypes.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sensor Selection</Text>
            <View style={styles.settingRow}>
              <Text style={[styles.label, { color: theme.text }]}>Sensor Type</Text>
              <View style={styles.inputWrapper}>
                <PlatformPicker
                  value={selectedSensorType}
                  onValueChange={(value) => handleSensorTypeSwitch(value as SensorType)}
                  items={availableSensorTypes.map((type) => ({
                    label: getSensorConfig(type).displayName,
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
          onInstanceSelect={handleInstanceSwitch}
          theme={theme}
        />

        {/* Config Fields */}
        {configFieldsJSX && configFieldsJSX.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sensor Configuration</Text>
            {configFieldsJSX}
          </View>
        )}

        {/* Alarm Configuration */}
        {supportsAlarms && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Alarms</Text>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Enable alarms</Text>
              <PlatformToggle
                label="Enable alarms"
                value={formData.enabled}
                onValueChange={handleEnabledChange}
              />
            </View>

            {formData.enabled && (
              <View style={styles.settingGroup}>
                {/* Metric Selector */}
                {requiresMetricSelection && sensorConfig?.alarmMetrics ? (
                  <>
                    <Text style={styles.groupLabel}>Alarm metric</Text>
                    <MetricSelector
                      alarmMetrics={sensorConfig.alarmMetrics}
                      selectedMetric={formData.selectedMetric}
                      onMetricChange={handleMetricChange}
                      theme={theme}
                    />
                  </>
                ) : null}

                {/* Threshold Slider */}
                {alarmConfig && (
                  <View style={styles.sliderSection}>
                    <Text style={styles.groupLabel}>Threshold values</Text>
                    <View style={styles.sliderRow}>
                      <View style={styles.sliderMinMax}>
                        <Text style={[styles.minMaxText, { color: theme.textSecondary }]}>
                          {formatMetricValue(alarmConfig.min)} {unitSymbol}
                        </Text>
                      </View>

                      <View style={styles.sliderContainer}>
                        <AlarmThresholdSlider
                          min={alarmConfig.min}
                          max={alarmConfig.max}
                          step={alarmConfig.step}
                          warningValue={formData.warningValue}
                          criticalValue={formData.criticalValue}
                          alarmDirection={alarmConfig.direction}
                          formatValue={formatMetricValue}
                          unitSymbol={unitSymbol}
                          onWarningChange={(value) => {
                            const clamped = clampToRange(
                              value,
                              warningSliderRange.min,
                              warningSliderRange.max,
                            );
                            updateField('warningValue', clamped);
                          }}
                          onCriticalChange={(value) => {
                            const clamped = clampToRange(
                              value,
                              criticalSliderRange.min,
                              criticalSliderRange.max,
                            );
                            updateField('criticalValue', clamped);
                          }}
                          theme={theme}
                        />
                      </View>

                      <View style={styles.sliderMinMax}>
                        <Text style={[styles.minMaxText, { color: theme.textSecondary }]}>
                          {formatMetricValue(alarmConfig.max)} {unitSymbol}
                        </Text>
                      </View>
                    </View>

                    {alarmConfig.triggerHint && (
                      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                        {alarmConfig.triggerHint}
                      </Text>
                    )}
                  </View>
                )}

                {/* Sound Pattern Control */}
                <SoundPatternControl
                  criticalPattern={formData.criticalSoundPattern}
                  warningPattern={formData.warningSoundPattern}
                  soundPatternItems={soundPatternItems}
                  onCriticalChange={(pattern) => updateField('criticalSoundPattern', pattern)}
                  onWarningChange={(pattern) => updateField('warningSoundPattern', pattern)}
                  onTestSound={handleTestSound}
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

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: platformTokens.borderRadius.card,
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
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
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
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    settingGroup: {
      marginTop: 16,
    },
    groupLabel: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      marginBottom: 8,
      marginTop: 8,
    },
    inputWrapper: {
      flex: 1,
      marginLeft: 16,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 8,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: platformTokens.borderRadius.input,
      borderWidth: 1,
      fontSize: 16,
    },
    helpText: {
      fontSize: platformTokens.typography.hint.fontSize,
      fontWeight: platformTokens.typography.hint.fontWeight,
      lineHeight: platformTokens.typography.hint.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      fontStyle: platformTokens.typography.hint.fontStyle,
      color: theme.textSecondary,
      marginTop: 12,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sliderSection: {
      marginTop: 16,
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
      fontFamily: platformTokens.typography.fontFamily,
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
      fontFamily: platformTokens.typography.fontFamily,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      fontFamily: platformTokens.typography.fontFamily,
      marginTop: 8,
      textAlign: 'center',
    },
  });
