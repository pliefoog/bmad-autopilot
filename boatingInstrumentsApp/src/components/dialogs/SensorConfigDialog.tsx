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
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { useSensorConfigStore } from '../../store/sensorConfigStore';
import { SensorType, SensorConfiguration } from '../../types/SensorData';
import { DataCategory } from '../../presentation/categories';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker, PlatformPickerItem } from './inputs/PlatformPicker';
import { getAlarmDirection, getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../../utils/sensorDisplayName';
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
  shouldShowField,
} from '../../registry/SensorConfigRegistry';
import { ThresholdPresentationService } from '../../services/ThresholdPresentationService';

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
      console.warn(
        `[SensorConfigDialog] Failed to get initial enriched thresholds for ${selectedSensorType} instance ${selectedInstance}${
          initialMetric ? ` metric ${initialMetric}` : ''
        }`,
      );
    }

    return enriched;
  }, [selectedSensorType, selectedInstance, initialMetric]);

  /* Initialize Form Data */
  const initialFormData: SensorFormData = useMemo(() => {
    const currentSensorData = selectedSensorType
      ? rawSensorData[selectedSensorType]?.[selectedInstance]
      : undefined;
    const displayName = selectedSensorType
      ? getSensorDisplayName(
          selectedSensorType,
          selectedInstance,
          currentThresholds,
          currentSensorData?.name,
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
    rawSensorData,
    initialEnrichedThresholds,
  ]);

  const [formData, setFormData] = useState<SensorFormData>(initialFormData);

  /* Update form when sensor/instance changes */
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  /* Update Field */
  const updateField = useCallback(
    <K extends keyof SensorFormData>(field: K, value: SensorFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

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
      console.warn(
        `[SensorConfigDialog] Failed to get enriched thresholds for ${selectedSensorType} instance ${selectedInstance}${
          currentMetricForEnrichment ? ` metric ${currentMetricForEnrichment}` : ''
        }`,
      );
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
        console.warn(`[SensorConfigDialog] Cannot format value - enriched thresholds unavailable`);
        return siValue.toFixed(1);
      }

      {
        /* Convert SI to display and format using memoized enriched data */
      }
      return enrichedThresholds.formatValue(enrichedThresholds.convertFromSI(siValue));
    },
    [enrichedThresholds],
  );

  /* Save Current Form */
  const saveCurrentForm = useCallback(async () => {
    if (!selectedSensorType) return;

    const updates: Partial<SensorConfiguration> = {
      name: formData.name?.trim() || undefined,
      enabled: formData.enabled,
      direction: getAlarmDirection(
        selectedSensorType,
        requiresMetricSelection ? formData.selectedMetric : undefined,
      ).direction,
      criticalSoundPattern: formData.criticalSoundPattern,
      warningSoundPattern: formData.warningSoundPattern,
    };

    {
      /* Validate enriched thresholds available before saving */
    }
    if (!enrichedThresholds) {
      const errorMsg =
        'Cannot save thresholds - unit conversion unavailable. This would corrupt data.';
      console.error(`[SensorConfigDialog] ${errorMsg}`);
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Configuration Error', errorMsg);
      }
      return;
    }

    if (requiresMetricSelection && formData.selectedMetric) {
      {
        /* Multi-metric: convert display values to SI */
      }
      const criticalSI =
        formData.criticalValue !== undefined
          ? enrichedThresholds.convertToSI(formData.criticalValue)
          : undefined;
      const warningSI =
        formData.warningValue !== undefined
          ? enrichedThresholds.convertToSI(formData.warningValue)
          : undefined;

      updates.metrics = {
        [formData.selectedMetric]: {
          critical: criticalSI,
          warning: warningSI,
          criticalSoundPattern: formData.criticalSoundPattern,
          warningSoundPattern: formData.warningSoundPattern,
          enabled: formData.enabled,
        },
      };
    } else {
      {
        /* Single-metric: convert display values to SI */
      }
      updates.critical =
        formData.criticalValue !== undefined
          ? enrichedThresholds.convertToSI(formData.criticalValue)
          : undefined;
      updates.warning =
        formData.warningValue !== undefined
          ? enrichedThresholds.convertToSI(formData.warningValue)
          : undefined;
    }

    if (formData.batteryChemistry) {
      updates.context = { ...updates.context, batteryChemistry: formData.batteryChemistry };
    }
    if (formData.engineType) {
      updates.context = { ...updates.context, engineType: formData.engineType };
    }

    try {
      updateSensorThresholds(selectedSensorType, selectedInstance, updates);
      await setConfig(selectedSensorType, selectedInstance, updates);
    } catch (error) {
      console.error('Error saving sensor config:', error);
      if (Platform.OS === 'web') {
        alert('Failed to save configuration. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save configuration. Please try again.');
      }
    }
  }, [
    selectedSensorType,
    selectedInstance,
    formData,
    requiresMetricSelection,
    enrichedThresholds,
    updateSensorThresholds,
    setConfig,
  ]);

  /* Handle Instance Switch */
  const handleInstanceSwitch = useCallback(
    async (newInstance: number) => {
      await saveCurrentForm();
      setSelectedInstance(newInstance);
    },
    [saveCurrentForm],
  );

  /* Handle Sensor Type Switch */
  const handleSensorTypeSwitch = useCallback(
    async (newType: SensorType) => {
      await saveCurrentForm();
      setSelectedSensorType(newType);
      setSelectedInstance(0);
    },
    [saveCurrentForm],
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
        console.warn(`[SensorConfigDialog] Cannot load thresholds for metric ${newMetric}`);
      }

      const criticalValue = enriched?.display.critical?.value;
      const warningValue = enriched?.display.warning?.value;

      setFormData((prev) => ({
        ...prev,
        selectedMetric: newMetric,
        criticalValue,
        warningValue,
      }));
    },
    [selectedSensorType, selectedInstance, sensorConfig],
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
    await saveCurrentForm();
    onClose();
  }, [saveCurrentForm, onClose]);

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
      console.error('Error playing test sound:', error);
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
        setFormData((prev) => ({ ...prev, criticalValue: clampedCritical }));
      }
    }

    if (formData.warningValue !== undefined) {
      const clampedWarning = clampToRange(
        formData.warningValue,
        warningSliderRange.min,
        warningSliderRange.max,
      );
      if (clampedWarning !== formData.warningValue) {
        setFormData((prev) => ({ ...prev, warningValue: clampedWarning }));
      }
    }
  }, [
    criticalSliderRange.min,
    criticalSliderRange.max,
    warningSliderRange.min,
    warningSliderRange.max,
    formData.criticalValue,
    formData.warningValue,
  ]);

  /* Render Config Fields */
  const renderConfigFields = useCallback(() => {
    if (!selectedSensorType) return null;

    const config = getSensorConfig(selectedSensorType);

    return config.fields
      .filter((field) => field.iostate !== 'readOnly')
      .map((field) => {
        if (!shouldShowField(field, formData)) {
          return null;
        }

        const sensorData = rawSensorData[selectedSensorType]?.[selectedInstance];
        const hardwareValue = field.hardwareField
          ? (sensorData as any)?.[field.hardwareField]
          : undefined;
        const isReadOnly =
          field.iostate === 'readOnly' ||
          (field.iostate === 'readOnlyIfValue' && hardwareValue !== undefined);
        const currentValue =
          hardwareValue !== undefined
            ? hardwareValue
            : formData[field.key as keyof SensorFormData] ?? field.default;

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
                {field.helpText ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                    {field.helpText}
                  </Text>
                ) : null}
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
                {field.helpText ? (
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                    {field.helpText}
                  </Text>
                ) : null}
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
                        console.error(
                          `[SensorConfigDialog] Invalid enum value '${value}' for ${field.key}`,
                        );
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
                        console.error(
                          `[SensorConfigDialog] Invalid boolean value for ${field.key}`,
                        );
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
            console.warn(`[SensorConfigDialog] Unknown uiType: ${field.uiType} for ${field.key}`);
            return null;
        }
      });
  }, [selectedSensorType, formData, rawSensorData, selectedInstance, theme, updateField]);

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
          <View style={[styles.field, styles.sensorPickerField]}>
            <Text style={[styles.label, { color: theme.text }]}>Sensor Type</Text>
            <PlatformPicker
              value={selectedSensorType}
              onValueChange={(value) => handleSensorTypeSwitch(value as SensorType)}
              items={availableSensorTypes.map((type) => ({
                label: getSensorConfig(type).displayName,
                value: type,
              }))}
            />
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
        {renderConfigFields()}

        {/* Alarm Configuration */}
        {supportsAlarms && (
          <View style={styles.alarmSection}>
            <View style={styles.alarmHeader}>
              <Text style={[styles.alarmTitle, { color: theme.text }]}>Alarm Configuration</Text>
              <PlatformToggle
                label=""
                value={formData.enabled}
                onValueChange={handleEnabledChange}
                scale={0.75}
              />
            </View>

            {formData.enabled && (
              <View>
                {/* Metric Selector */}
                {requiresMetricSelection && sensorConfig?.alarmMetrics ? (
                  <MetricSelector
                    alarmMetrics={sensorConfig.alarmMetrics}
                    selectedMetric={formData.selectedMetric}
                    onMetricChange={handleMetricChange}
                    theme={theme}
                  />
                ) : null}

                {/* Threshold Slider */}
                {alarmConfig && (
                  <View style={styles.sliderSection}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  sensorPickerField: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  helpText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alarmSection: {
    marginTop: 24,
    paddingTop: 24,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmTitle: {
    fontSize: 18,
    fontWeight: '600',
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
});
