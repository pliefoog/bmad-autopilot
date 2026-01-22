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

import { useCallback, useMemo, useEffect } from 'react';
import { useForm, useWatch, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Platform, Alert } from 'react-native';

import { useNmeaStore } from '../store/nmeaStore';
import { useSensorConfigStore } from '../store/sensorConfigStore';
import { usePresentationStore } from '../presentation/presentationStore';
import { ensureFormatFunction } from '../presentation/presentations';

import type { SensorType, SensorConfiguration } from '../types/SensorData';
import type { EnrichedThresholdInfo } from '../services/ThresholdPresentationService';

import { ThresholdPresentationService } from '../services/ThresholdPresentationService';
import { MarineAudioAlertManager } from '../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../services/alarms/types';
import { getSensorSchema, getAlarmDefaults } from '../registry';
import { SENSOR_SCHEMAS } from '../registry/sensorSchemas';
import { sensorRegistry } from '../services/SensorDataRegistry';
import { getAlarmDirection, getAlarmTriggerHint } from '../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../utils/sensorDisplayName';
import { getCriticalSliderRange, getWarningSliderRange } from '../utils/alarmSliderUtils';
import { SOUND_TEST_DURATION_MS } from '../constants/timings';
import { log } from '../utils/logging/logger';
import { useConfirmDialog, useClamped } from './forms';

/**
 * Form data structure for sensor configuration
 */
interface SensorFormData {
  name?: string;
  enabled: boolean;
  context?: string; // Generic context field (e.g., 'agm', 'diesel') - driven by schema.contextKey
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
      context: z.string().optional(), // Generic context (chemistry, engineType, etc.)
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
  currentMetricValue: string | undefined;
  handlers: {
    handleMetricChange: (newMetric: string) => void;
    handleEnabledChange: (value: boolean) => void;
    handleInstanceSwitch: (newInstance: number) => Promise<void>;
    handleSensorTypeSwitch: (newType: SensorType) => Promise<void>;
    handleClose: () => Promise<boolean>;
    handleTestSound: (soundPattern: string) => Promise<void>;
  };
  computed: {
    alarmConfig: { direction: 'above' | 'below'; triggerHint: string; min: number; max: number; step: number } | null;
    criticalSliderRange: { min: number; max: number };
    warningSliderRange: { min: number; max: number };
    unitSymbol: string;
    metricLabel: string;
    requiresMetricSelection: boolean;
    supportsAlarms: boolean;
    sliderPresentation: { format: (value: number) => string; symbol: string } | null;
    alarmFormula: string | undefined;
    sensorMetrics: Map<string, any> | undefined;
    ratioUnit: string | undefined;
  };
}

/**
 * useSensorConfigForm - Unified form management with React Hook Form
 *
 * Encapsulates all sensor configuration form state, validation, and business logic.
 * Follows maritime UX patterns: save-on-transition, one-handed operation, critical confirmations.
 *
 * @param sensorType - Currently selected sensor type (depth, engine, battery, etc.)
 * @param selectedInstance - Instance number for multi-sensor systems (0-based)
 * @param onSave - Async callback invoked on explicit save (form submission)
 *
 * @returns Object containing:
 *   - form: RHF UseFormReturn with all form state and methods
 *   - enrichedThresholds: Pre-enriched threshold data with display units (null if enrichment fails)
 *   - handlers: Memoized event handlers for all form interactions
 *   - computed: Derived values (alarm config, slider ranges, labels)
 *
 * @example
 * const { form, handlers, computed } = useSensorConfigForm(
 *   'depth',
 *   0,
 *   async (type, instance, data) => {
 *     await saveSensorConfig(type, instance, data);
 *   }
 * );
 *
 * @performance
 * - Uses useWatch for selective field subscriptions (not form.watch)
 * - Handlers memoized with tight dependency arrays
 * - Enrichment cached until unit system changes
 *
 * @maritime
 * - Confirmation dialogs for critical sensors (depth, engine)
 * - Glove-mode compatible (48x48px touch targets)
 * - Save-on-transition prevents data loss during emergency situations
 */
export const useSensorConfigForm = (
  sensorType: SensorType | null,
  selectedInstance: number,
  onSave: (sensorType: SensorType, instance: number, data: SensorFormData) => Promise<void>,
): UseSensorConfigFormReturn => {
  const { confirm } = useConfirmDialog();

  // Store access - only getSensorThresholds needed here
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);

  // Watch sensorConfigStore for changes to trigger form re-initialization
  const savedConfig = useSensorConfigStore(
    (state) => sensorType ? state.getConfig(sensorType, selectedInstance) : undefined,
    (a, b) => {
      // Deep equality check for config changes
      if (!a && !b) return true;
      if (!a || !b) return false;
      const isEqual = (
        a.name === b.name &&
        a.enabled === b.enabled &&
        JSON.stringify(a.context) === JSON.stringify(b.context) &&
        JSON.stringify(a.critical) === JSON.stringify(b.critical) &&
        JSON.stringify(a.warning) === JSON.stringify(b.warning)
      );

      // Debug: Log equality checks
      console.log(`[useSensorConfigForm] savedConfig equality check: isEqual=${isEqual}, a.name="${a.name}", b.name="${b.name}"`);
      if (!isEqual) {
        console.log(`[useSensorConfigForm] savedConfig CHANGED: old="${b.name}" → new="${a.name}"`);
        log.app('useSensorConfigForm: savedConfig changed', () => ({
          sensorType,
          instance: selectedInstance,
          oldName: b.name,
          newName: a.name,
          nameChanged: a.name !== b.name,
        }));
      }

      return isEqual;
    }
  );

  // Get sensor config and derived values
  const sensorConfig = sensorType ? getSensorSchema(sensorType) : null;

  // Compute alarm fields from schema (fields with alarm property)
  const alarmFieldKeys = useMemo(() => {
    if (!sensorConfig) return [];
    return Object.entries(sensorConfig.fields)
      .filter(([_, field]) => field.alarm !== undefined)
      .map(([key, _]) => key);
  }, [sensorConfig]);

  // Determine if sensor requires metric selection (multi-alarm)
  const requiresMetricSelection = alarmFieldKeys.length > 1;
  const supportsAlarms = alarmFieldKeys.length > 0;
  
  // ✅ UNIFIED: Always use first alarm field as default (single-metric only has 1 option)
  const defaultMetric = alarmFieldKeys[0];

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

    // Priority: savedConfig.name → sensorInstance.name → default format
    const displayName = sensorType
      ? getSensorDisplayName(sensorType, selectedInstance, savedConfig, sensorInstance?.name)
      : '';

    log.app('useSensorConfigForm: Initializing form data', () => ({
      sensorType,
      instance: selectedInstance,
      savedConfigName: savedConfig?.name,
      nmeaName: sensorInstance?.name,
      resolvedDisplayName: displayName,
    }));

    // ✅ UNIFIED: Always use first alarm field as default (works for single and multi-metric)
    const firstMetric = alarmFieldKeys[0];
    let criticalValue: number | undefined;
    let warningValue: number | undefined;
    let criticalSoundPattern = 'rapid_pulse';
    let warningSoundPattern = 'warble';

    // SIMPLIFIED: SensorInstance already has correct values (from AsyncStorage or schema defaults)
    // ThresholdPresentationService reads from SensorInstance and enriches for display
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

    // ✅ UNIFIED: Schema V4 always uses metrics object (single + multi-metric)
    // Get sound patterns from sensor instance thresholds via metrics object
    if (firstMetric && currentThresholds?.metrics?.[firstMetric]) {
      const metricConfig = currentThresholds.metrics[firstMetric];
      criticalSoundPattern = metricConfig.criticalSoundPattern || 'rapid_pulse';
      warningSoundPattern = metricConfig.warningSoundPattern || 'warble';
    }

    // Extract context from saved config (user-selected, e.g., 'agm', 'diesel')
    // Context is a configuration choice, not a sensor reading
    // Context is now always a string (e.g., 'agm', 'diesel')
    const contextValue = typeof savedConfig?.context === 'string' ? savedConfig.context : undefined;

    return {
      name: displayName,
      enabled: savedConfig?.enabled ?? currentThresholds?.enabled ?? false,
      context: contextValue,
      selectedMetric: firstMetric || '',
      criticalValue,
      warningValue,
      criticalSoundPattern,
      warningSoundPattern,
    };
  }, [sensorType, selectedInstance, savedConfig, currentThresholds, sensorConfig, alarmFieldKeys, defaultMetric]);

  // Initialize RHF with schema validation
  const form = useForm<SensorFormData>({
    mode: 'onSubmit', // Explicit validation on save
    resolver: zodResolver(createSensorFormSchema(direction)),
    defaultValues: initialFormData,
  });

  // CRITICAL: Reset form when sensor type or instance changes
  // Without this, switching sensors shows stale data from previous sensor
  useEffect(() => {
    console.log(`[useSensorConfigForm] form.reset called with initialFormData.name="${initialFormData.name}"`);
    form.reset(initialFormData);
    console.log(`[useSensorConfigForm] After reset, form.getValues('name')="${form.getValues('name')}"`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorType, selectedInstance, initialFormData]); // initialFormData stable via useMemo

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
  
  // Watch context field if sensor has contextKey (battery/engine chemistry/engineType)
  // For non-context sensors (depth), contextKey is undefined and watchedContext will be undefined
  // We use a dummy field name to satisfy React Hook rules (hooks must be called unconditionally)
  const contextKey = sensorConfig?.contextKey;
  const watchedContext = useWatch({
    control: form.control,
    name: (contextKey || '__unused__') as any, // Dummy field for non-context sensors
  });
  
  // For sensors with contextKey, use the watched value; otherwise undefined
  const contextValue = contextKey ? (typeof watchedContext === 'string' ? watchedContext : undefined) : undefined;

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

    // Check if this sensor type has alarm definitions for ANY field - if not, return null early
    const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
    const hasAnyAlarm = schema && Object.values(schema.fields).some(
      (field): field is any => 'alarm' in field && !!field.alarm
    );
    if (!hasAnyAlarm) {
      return null;
    }

    // ✅ UNIFIED: Always use metric (watchedMetric || defaultMetric)
    const metric = watchedMetric || defaultMetric;
    const direction = getAlarmDirection(sensorType, metric).direction;
    const triggerHint = getAlarmTriggerHint(sensorType);

    // Get first alarm field for sensors without metric selection
    const fieldKey = metric || alarmFieldKeys[0];
    if (!fieldKey) return null; // No alarm fields

    // contextValue is already defined in outer scope (from watchedContext)
    // For sensors with contextKey: actual context value (e.g., 'agm', 'diesel')
    // For non-context sensors: undefined → uses alarm.defaultContext
    const defaults = getAlarmDefaults(sensorType, fieldKey, contextValue);

    // Validate thresholdRange exists - no fallbacks allowed
    if (!defaults?.thresholdRange) {
      throw new Error(
        `No thresholdRange found for ${sensorType}.${fieldKey}${contextValue ? ` with context "${contextValue}"` : ''}. ` +
        `Check sensorSchemas.ts for missing context or thresholdRange definition.`
      );
    }

    const baseMin = defaults.thresholdRange.min;
    const baseMax = defaults.thresholdRange.max;
    const step = 0.1;

    return { direction, triggerHint, min: baseMin, max: baseMax, step };
  }, [sensorType, selectedInstance, watchedMetric, contextValue, alarmFieldKeys, defaultMetric]);

  // Compute slider presentation data (for new simplified slider)
  const sliderPresentation = useMemo(() => {
    if (!sensorType) return null;
    
    // ✅ UNIFIED: Always use watchedMetric || defaultMetric
    const metricKey = watchedMetric || defaultMetric;
    if (!metricKey) return null;
    
    const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[metricKey as keyof typeof schema.fields];
    if (!fieldDef || !('unitType' in fieldDef) || typeof fieldDef.unitType !== 'string') return null;
    
    const presentation = usePresentationStore.getState().getPresentationForCategory(fieldDef.unitType as any);
    if (!presentation) return null;
    
    return {
      format: ensureFormatFunction(presentation),
      symbol: presentation.symbol,
    };
  }, [sensorType, watchedMetric, alarmFieldKeys, defaultMetric]);
  
  // Get alarm formula (ratio mode detection)
  const alarmFormula = useMemo(() => {
    if (!sensorType) return undefined;
    
    // ✅ UNIFIED: Always use watchedMetric || defaultMetric
    const metricKey = watchedMetric || defaultMetric;
    if (!metricKey) return undefined;
    
    const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[metricKey as keyof typeof schema.fields];
    if (!fieldDef || !('alarm' in fieldDef) || !fieldDef.alarm) return undefined;
    
    return (fieldDef.alarm as any)?.formula as string | undefined;
  }, [sensorType, watchedMetric, alarmFieldKeys, defaultMetric]);
  
  // Get sensor metrics for formula evaluation
  const sensorMetrics = useMemo(() => {
    if (!sensorType) return undefined;
    
    const nmeaData = useNmeaStore.getState().nmeaData as any;
    const sensorInstance = nmeaData?.sensors?.[sensorType]?.[selectedInstance];
    return sensorInstance?.getAllMetrics();
  }, [sensorType, selectedInstance]);
  
  // Get ratio unit for ratio mode
  const ratioUnit = useMemo(() => {
    if (!sensorType || !alarmFormula) return undefined;
    
    // ✅ UNIFIED: Always use watchedMetric || defaultMetric
    const metricKey = watchedMetric || defaultMetric;
    if (!metricKey) return undefined;
    
    const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[metricKey as keyof typeof schema.fields];
    if (!fieldDef || !('alarm' in fieldDef) || !fieldDef.alarm) return undefined;
    
    const alarm = fieldDef.alarm as any;
    // Get first context's indirectThresholdUnit
    const firstContext = Object.keys(alarm.contexts || {})[0];
    const contextDef = firstContext ? alarm.contexts[firstContext] : null;
    return contextDef?.critical?.indirectThresholdUnit;
  }, [sensorType, watchedMetric, alarmFormula, alarmFieldKeys, defaultMetric]);

  // Get current metric value for display (reactive to store changes)
  const currentMetricValue = useNmeaStore(
    (state) => {
      if (!sensorType) return undefined;
      
      // ✅ UNIFIED: Always use watchedMetric || defaultMetric (computed inside selector for reactivity)
      const metricKey = watchedMetric || defaultMetric;
      if (!metricKey) return undefined;
      
      const sensorInstance = (state.nmeaData as any)?.sensors?.[sensorType]?.[selectedInstance];
      if (!sensorInstance) return undefined;
      
      const metricValue = sensorInstance.getMetric(metricKey);
      if (!metricValue) return undefined;
      
      // Return formatted value with unit
      return metricValue.formattedValueWithUnit;
    },
    (a, b) => a === b
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedCritical, watchedCritical]); // form.setValue is stable, omit form object

  useEffect(() => {
    if (clampedWarning !== watchedWarning && clampedWarning !== undefined) {
      form.setValue('warningValue', clampedWarning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedWarning, watchedWarning]); // form.setValue is stable, omit form object

  // Compute display values
  const unitSymbol = useMemo(() => enrichedThresholds?.display.min.unit || '', [enrichedThresholds]);
  const metricLabel = useMemo(() => {
    if (!sensorConfig) return sensorType || '';
    
    // ✅ UNIFIED: Always use watchedMetric || defaultMetric
    const metricKey = watchedMetric || defaultMetric;
    if (metricKey) {
      return sensorConfig.fields[metricKey]?.label || '';
    }
    
    return sensorConfig?.displayName || sensorType || '';
  }, [watchedMetric, sensorConfig, sensorType, defaultMetric]);

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
    async (value: boolean) => {
      // Check if sensor has any alarm with safetyRequired: true
      const schema = sensorType ? SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS] : null;
      const isCritical = schema && Object.values(schema.fields).some(
        (field): boolean => {
          if (!('alarm' in field) || !field.alarm) return false;
          return field.alarm.safetyRequired === true;
        }
      );

      if (!value && isCritical) {
        const title = 'Disable Critical Alarm?';
        const message = `${sensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`;
        const ok = await confirm(title, message);
        if (ok) {
          form.setValue('enabled', value);
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
            await onSave(sensorType || newType, selectedInstance, data);
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
  const handleClose = useCallback(async (): Promise<boolean> => {
    console.log(`[useSensorConfigForm] handleClose: isDirty=${form.formState.isDirty}, name="${form.getValues('name')}"`);

    if (form.formState.isDirty) {
      console.log('[useSensorConfigForm] Form is dirty, attempting save...');
      // For name-only changes (no thresholds), enrichment isn't needed
      const hasThresholdChanges =
        form.getValues('criticalValue') !== undefined ||
        form.getValues('warningValue') !== undefined;

      if (hasThresholdChanges && !enrichedThresholds) {
        const shouldDiscard = await confirm(
          'Discard Changes?',
          'Cannot save threshold changes - unit conversion unavailable. Discard unsaved changes?',
        );
        if (!shouldDiscard) return false; // User cancelled - don't close
        form.reset(); // Reset to discard changes
      } else {
        console.log('[useSensorConfigForm] Proceeding with save (no threshold issues)');
        try {
          await form.handleSubmit(
            async (data) => {
              console.log(`[useSensorConfigForm] handleSubmit executing with data.name="${data.name}"`);
              if (sensorType) await onSave(sensorType, selectedInstance, data);
            },
            (errors) => {
              // Log validation errors
              log.app('Form validation failed', () => ({
                errors,
                values: form.getValues(),
              }));
            }
          )();
          // DON'T reset after successful save - it causes form to revert to old initialFormData
          // The form will reset when dialog actually closes (component unmount or next open)
        } catch (error) {
          console.log(`[useSensorConfigForm] Save failed:`, error);
          log.app('useSensorConfigForm: Close save failed', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
          return false; // Save failed - don't close
        }
      }
    } else {
      console.log('[useSensorConfigForm] Form NOT dirty, skipping save');
    }
    return true; // Success - allow close
  }, [form, enrichedThresholds, sensorType, selectedInstance, onSave, confirm]);

  // Handler: Test sound
  const handleTestSound = useCallback(async (soundPattern: string): Promise<void> => {
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

  // Note: form.reset() called in handleClose() - no additional cleanup needed

  return {
    form,
    enrichedThresholds,
    currentMetricValue,
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
      enrichedThresholds,
      criticalSliderRange,
      warningSliderRange,
      unitSymbol,
      metricLabel,
      requiresMetricSelection,
      supportsAlarms,
      sliderPresentation,
      alarmFormula,
      sensorMetrics,
      ratioUnit,
      currentMetricValue,
    },
  };
};
