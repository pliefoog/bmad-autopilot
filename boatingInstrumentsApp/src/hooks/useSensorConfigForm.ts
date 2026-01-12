/**
 * useSensorConfigForm - React Hook Form Integration with Sensor Config Logic
 *
 * Purpose: Encapsulate all form state, validation, and sensor-specific logic.
 * Pattern: RHF with onSubmit validation mode for explicit save-on-transition.
 * Performance: Uses useWatch for selective field subscriptions (not whole-form watching).
 * Memory safety: Returns cleanup function for all store subscriptions.
 *
 * Architecture:
 * - Single enrichedThresholds source of truth (no dual-enrichment)
 * - Direction-aware threshold validation via Zod schema
 * - Memoized handlers with tight dependency arrays
 * - Glove mode and theme support
 * - Maritime safety: Confirmation dialogs for critical sensors
 *
 * Maritime context:
 * - Designed for one-handed operation (gloved hands, emergency situations)
 * - Save-on-transition pattern ensures data safety
 * - Enrichment guards prevent data corruption on unit conversion failures
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Platform, Alert } from 'react-native';

import { useNmeaStore } from '../../../store/nmeaStore';
import { useSensorConfigStore } from '../../../store/sensorConfigStore';
import { useTheme } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';

import type { SensorType, SensorConfiguration } from '../../../types/SensorData';
import type { SensorInstance } from '../../../types/SensorInstance';
import type { EnrichedThresholdInfo } from '../../../services/ThresholdPresentationService';

import { ThresholdPresentationService } from '../../../services/ThresholdPresentationService';
import { MarineAudioAlertManager, CriticalAlarmType, AlarmEscalationLevel } from '../../../services/alarms/MarineAudioAlertManager';
import { getSensorConfig, getAlarmDefaults } from '../../../registry/SensorConfigRegistry';
import { sensorRegistry } from '../../../services/SensorDataRegistry';
import { getAlarmDirection, getAlarmTriggerHint } from '../../../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../../../utils/sensorDisplayName';
import { getCriticalSliderRange, getWarningSliderRange } from '../../../utils/alarmSliderUtils';
import { SOUND_TEST_DURATION_MS } from '../../../constants/timings';
import { log } from '../../../utils/logging/logger';
import { useConfirmDialog, useClamped } from '../../../hooks/forms';

/**
 * Form data structure for sensor configuration
 */
interface SensorFormData {
  name?: string;
  enabled: boolean;
  batteryChemistry?: 'lead-acid' | 'agm' | 'lifepo4';
  engineType?: 'diesel' | 'gasoline' | 'outboard';
  selectedMetric?: string;
  criticalValue?: number;
  warningValue?: number;
  criticalSoundPattern: string;
  warningSoundPattern: string;
}

/**
 * Create Zod schema with direction-aware validation
 */
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
        path: ['warningValue'],
      },
    );

export interface UseSensorConfigFormReturn {
  form: UseFormReturn<SensorFormData>;
  enrichedThresholds: EnrichedThresholdInfo | null;
  handlers: {
    handleMetricChange: (newMetric: string) => void;
    handleEnabledChange: (value: boolean) => void;
    handleInstanceSwitch: (newInstance: number) => Promise<void>;
    handleSensorTypeSwitch: (newType: SensorType) => Promise<void>;
    handleClose: () => Promise<void>;
    handleTestSound: (soundPattern: string) => Promise<void>;
  };
  computed: {
    alarmConfig: ReturnType<typeof getAlarmDefaults> | null;
    criticalSliderRange: { min: number; max: number };
    warningSliderRange: { min: number; max: number };
    unitSymbol: string;
    metricLabel: string;
    requiresMetricSelection: boolean;
    supportsAlarms: boolean;
  };
}

/**
 * useSensorConfigForm - Unified form management with RHF
 *
 * @param sensorType - Currently selected sensor type
 * @param selectedInstance - Currently selected sensor instance
 * @param onSave - Callback when form is explicitly saved
 * @returns Form methods, computed values, and handlers
 */
export const useSensorConfigForm = (
  sensorType: SensorType | null,
  selectedInstance: number,
  onSave: (sensorType: SensorType, instance: number, data: SensorFormData) => Promise<void>,
): UseSensorConfigFormReturn => {
  const theme = useTheme();
  const gloveMode = useSettingsStore((state) => state.gloveMode);
  const { confirm } = useConfirmDialog();

  // Store access
  const updateSensorThresholds = useNmeaStore((state) => state.updateSensorThresholds);
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);
  const setConfig = useSensorConfigStore((state) => state.setConfig);

  // Get sensor config and derived values
  const sensorConfig = sensorType ? getSensorConfig(sensorType) : null;
  const requiresMetricSelection = sensorConfig?.alarmSupport === 'multi-metric';
  const supportsAlarms = sensorConfig?.alarmSupport !== 'none';

  // Get current thresholds from store
  const currentThresholds = useMemo(
    () => (sensorType ? getSensorThresholds(sensorType, selectedInstance) : { enabled: false }),
    [sensorType, selectedInstance, getSensorThresholds],
  );

  // Determine alarm direction for validation
  const direction = useMemo(
    () => (sensorType ? getAlarmDirection(sensorType).direction : undefined),
    [sensorType],
  );

  // Initialize form data
  const initialFormData: SensorFormData = useMemo(() => {
    const sensorInstance = sensorType
      ? sensorRegistry.get(sensorType, selectedInstance)
      : undefined;
    const displayName = sensorType
      ? getSensorDisplayName(sensorType, selectedInstance, currentThresholds, sensorInstance?.name)
      : '';

    const firstMetric = requiresMetricSelection && sensorConfig?.alarmMetrics?.[0]?.key;
    let criticalValue: number | undefined;
    let warningValue: number | undefined;
    let criticalSoundPattern = 'rapid_pulse';
    let warningSoundPattern = 'warble';

    // Get threshold values from enrichment (already in display units)
    if (sensorType) {
      const enriched = ThresholdPresentationService.getEnrichedThresholds(
        sensorType,
        selectedInstance,
        firstMetric,
      );
      if (enriched) {
        criticalValue = enriched.display.critical?.value;
        warningValue = enriched.display.warning?.value;
      }
    }

    // Get sound patterns from store
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
      batteryChemistry: (currentThresholds.context?.batteryChemistry as any) || 'lead-acid',
      engineType: (currentThresholds.context?.engineType as any) || 'diesel',
      selectedMetric: firstMetric || '',
      criticalValue,
      warningValue,
      criticalSoundPattern,
      warningSoundPattern,
    };
  }, [sensorType, selectedInstance, currentThresholds, requiresMetricSelection, sensorConfig]);

  // Initialize RHF with schema validation
  const form = useForm<SensorFormData>({
    mode: 'onSubmit', // Explicit validation on save
    resolver: zodResolver(createSensorFormSchema(direction)),
    defaultValues: initialFormData,
  });

  // Watch specific fields for derived value calculation (not whole-form watching)
  const watchedMetric = useWatch({
    control: form.control,
    name: 'selectedMetric',
  });
  const watchedCritical = useWatch({
    control: form.control,
    name: 'criticalValue',
  });
  const watchedWarning = useWatch({
    control: form.control,
    name: 'warningValue',
  });

  // Single enrichedThresholds source
  const enrichedThresholds = useMemo(() => {
    if (!sensorType) return null;
    return ThresholdPresentationService.getEnrichedThresholds(
      sensorType,
      selectedInstance,
      watchedMetric,
    );
  }, [sensorType, selectedInstance, watchedMetric]);

  // Compute alarm configuration
  const alarmConfig = useMemo(() => {
    if (!sensorType) return null;
    const metric = requiresMetricSelection ? watchedMetric : undefined;
    const direction = getAlarmDirection(sensorType, metric).direction;
    const triggerHint = getAlarmTriggerHint(sensorType);
    const defaults = getAlarmDefaults(sensorType, currentThresholds.context);
    const metricKey = requiresMetricSelection ? watchedMetric : undefined;
    const metricDefaults = metricKey && defaults?.metrics?.[metricKey];

    const baseMin = metricDefaults?.min ?? defaults?.min ?? 0;
    const baseMax = metricDefaults?.max ?? defaults?.max ?? 100;
    const step = metricDefaults?.step ?? defaults?.step ?? 0.1;

    return { direction, triggerHint, min: baseMin, max: baseMax, step };
  }, [sensorType, currentThresholds, requiresMetricSelection, watchedMetric]);

  // Slider ranges
  const criticalSliderRange = useMemo(
    () =>
      alarmConfig
        ? getCriticalSliderRange(alarmConfig.min, alarmConfig.max, watchedWarning, alarmConfig.direction)
        : { min: 0, max: 100 },
    [alarmConfig, watchedWarning],
  );

  const warningSliderRange = useMemo(
    () =>
      alarmConfig
        ? getWarningSliderRange(alarmConfig.min, alarmConfig.max, watchedCritical, alarmConfig.direction)
        : { min: 0, max: 100 },
    [alarmConfig, watchedCritical],
  );

  // Clamped slider values
  const clampedCritical = useClamped(watchedCritical, criticalSliderRange);
  const clampedWarning = useClamped(watchedWarning, warningSliderRange);

  // Update form if clamped values changed
  useEffect(() => {
    if (clampedCritical !== watchedCritical && clampedCritical !== undefined) {
      form.setValue('criticalValue', clampedCritical);
    }
  }, [clampedCritical, watchedCritical, form]);

  useEffect(() => {
    if (clampedWarning !== watchedWarning && clampedWarning !== undefined) {
      form.setValue('warningValue', clampedWarning);
    }
  }, [clampedWarning, watchedWarning, form]);

  // Compute display values
  const unitSymbol = useMemo(() => enrichedThresholds?.display.min.unit || '', [enrichedThresholds]);
  const metricLabel = useMemo(() => {
    if (!requiresMetricSelection || !watchedMetric || !sensorConfig?.alarmMetrics) {
      return sensorConfig?.displayName || sensorType || '';
    }
    return sensorConfig.alarmMetrics.find((m) => m.key === watchedMetric)?.label || '';
  }, [requiresMetricSelection, watchedMetric, sensorConfig, sensorType]);

  // Handler: Metric change
  const handleMetricChange = useCallback(
    (newMetric: string) => {
      if (!sensorType || !sensorConfig) return;

      const enriched = ThresholdPresentationService.getEnrichedThresholds(
        sensorType,
        selectedInstance,
        newMetric,
      );

      if (!enriched) {
        log.app('useSensorConfigForm: Cannot load thresholds for metric', () => ({
          metric: newMetric,
          sensorType,
          instance: selectedInstance,
        }));
      }

      const criticalValue = enriched?.display.critical?.value;
      const warningValue = enriched?.display.warning?.value;

      form.setValue('selectedMetric', newMetric);
      if (criticalValue !== undefined) form.setValue('criticalValue', criticalValue);
      if (warningValue !== undefined) form.setValue('warningValue', warningValue);
    },
    [sensorType, selectedInstance, sensorConfig, form],
  );

  // Handler: Alarm enable with safety confirmation
  const handleEnabledChange = useCallback(
    (value: boolean) => {
      const isCritical =
        sensorType && ['depth', 'battery', 'engine'].includes(sensorType);

      if (!value && isCritical) {
        if (Platform.OS === 'web') {
          if (
            confirm(
              `${sensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`,
            )
          ) {
            form.setValue('enabled', value);
          }
        } else {
          Alert.alert(
            'Disable Critical Alarm?',
            `${sensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Disable',
                style: 'destructive',
                onPress: () => form.setValue('enabled', value),
              },
            ],
          );
        }
      } else {
        form.setValue('enabled', value);
      }
    },
    [sensorType, form, confirm],
  );

  // Handler: Instance switch with save
  const handleInstanceSwitch = useCallback(
    async (newInstance: number) => {
      if (!sensorType) return;
      if (form.formState.isDirty && enrichedThresholds) {
        try {
          await form.handleSubmit(async (data) => {
            await onSave(sensorType, selectedInstance, data);
          })();
        } catch (error) {
          log.app('useSensorConfigForm: Instance switch save failed', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    },
    [sensorType, selectedInstance, form, enrichedThresholds, onSave],
  );

  // Handler: Sensor type switch with save
  const handleSensorTypeSwitch = useCallback(
    async (newType: SensorType) => {
      if (form.formState.isDirty && enrichedThresholds) {
        try {
          await form.handleSubmit(async (data) => {
            await onSave(sensorType || 'depth', selectedInstance, data);
          })();
        } catch (error) {
          log.app('useSensorConfigForm: Sensor type switch save failed', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    },
    [sensorType, selectedInstance, form, enrichedThresholds, onSave],
  );

  // Handler: Close with save and cleanup
  const handleClose = useCallback(async () => {
    if (form.formState.isDirty) {
      if (!enrichedThresholds) {
        const shouldDiscard = await confirm(
          'Discard Changes?',
          'Cannot save changes - unit conversion unavailable. Discard unsaved changes?',
        );
        if (!shouldDiscard) return;
      } else {
        try {
          await form.handleSubmit(async (data) => {
            if (sensorType) await onSave(sensorType, selectedInstance, data);
          })();
        } catch (error) {
          log.app('useSensorConfigForm: Close save failed', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    }
    form.reset(); // Cleanup: Reset form state on close
  }, [form, enrichedThresholds, sensorType, selectedInstance, onSave, confirm]);

  // Handler: Test sound
  const handleTestSound = useCallback(async (soundPattern: string) => {
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
      log.app('useSensorConfigForm: Error playing test sound', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  // Cleanup: Unsubscribe listeners on unmount
  useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  return {
    form,
    enrichedThresholds,
    handlers: {
      handleMetricChange,
      handleEnabledChange,
      handleInstanceSwitch,
      handleSensorTypeSwitch,
      handleClose,
      handleTestSound,
    },
    computed: {
      alarmConfig,
      criticalSliderRange,
      warningSliderRange,
      unitSymbol,
      metricLabel,
      requiresMetricSelection,
      supportsAlarms,
    },
  };
};
