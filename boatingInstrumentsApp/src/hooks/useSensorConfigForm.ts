/**
 * useSensorConfigForm - Simplified Form State Management
 *
 * SIMPLIFIED (Jan 2026): Reduced from 797 lines to ~150 lines.
 * 
 * Responsibilities (ONLY):
 * 1. Form state management (React Hook Form)
 * 2. Load/save from store
 * 3. Safety confirmations for critical sensors
 * 4. Auto-save on transitions
 *
 * Moved to Components:
 * - Enrichment → AlarmThresholdSlider (calls service directly)
 * - Slider range calculations → AlarmThresholdSlider
 * - UI calculations → MetricSelector, other components
 * - Live value display → MetricSelector (via sensorRegistry)
 *
 * Philosophy: Hook manages FORM STATE, components handle PRESENTATION.
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useNmeaStore } from '../store/nmeaStore';
import type { SensorType, SensorConfiguration } from '../types/SensorData';
import { getSensorSchema } from '../registry';
import { SENSOR_SCHEMAS } from '../registry/sensorSchemas';
import { ThresholdPresentationService } from '../services/ThresholdPresentationService';
import { MarineAudioAlertManager } from '../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../services/alarms/types';
import { SOUND_TEST_DURATION_MS } from '../constants/timings';
import { getSensorDisplayName } from '../utils/sensorDisplayName';
import { log } from '../utils/logging/logger';
import { useConfirmDialog } from './forms';

/**
 * Helper: Load threshold values for a metric (saved or default)
 */
const loadThresholdsForMetric = (
  sensorType: SensorType,
  selectedInstance: number,
  metricKey: string,
  savedConfig?: SensorConfiguration,
): { critical?: number; warning?: number; criticalSound: string; warningSound: string } => {
  const metricConfig = savedConfig?.metrics?.[metricKey];
  
  if (metricConfig) {
    // Load saved values (already in display units)
    return {
      critical: metricConfig.critical,
      warning: metricConfig.warning,
      criticalSound: metricConfig.criticalSoundPattern || 'rapid_pulse',
      warningSound: metricConfig.warningSoundPattern || 'warble',
    };
  }
  
  // No saved config - use enrichment service defaults
  const enriched = ThresholdPresentationService.getEnrichedThresholds(
    sensorType,
    selectedInstance,
    metricKey,
  );
  
  return {
    critical: enriched?.display.critical?.value,
    warning: enriched?.display.warning?.value,
    criticalSound: 'rapid_pulse',
    warningSound: 'warble',
  };
};

/**
 * Form data structure - simple, flat, maps 1:1 to store
 */
interface SensorFormData {
  name?: string;
  context?: string;
  selectedMetric?: string;
  criticalValue?: number;
  warningValue?: number;
  criticalSoundPattern: string;
  warningSoundPattern: string;
}

/**
 * Minimal validation - just ensure warning < critical (direction-aware)
 */
const createSensorFormSchema = (direction?: 'above' | 'below') =>
  z.object({
    name: z.string().optional(),
    context: z.string().optional(),
    selectedMetric: z.string().optional(),
    criticalValue: z.number().optional(),
    warningValue: z.number().optional(),
    criticalSoundPattern: z.string(),
    warningSoundPattern: z.string(),
  }).refine(
    (data) => {
      if (data.warningValue !== undefined && data.criticalValue !== undefined && direction) {
        return direction === 'above' 
          ? data.warningValue < data.criticalValue 
          : data.warningValue > data.criticalValue;
      }
      return true;
    },
    { message: 'Warning threshold must be less severe than critical threshold', path: ['warningValue'] }
  );

export interface UseSensorConfigFormReturn {
  form: UseFormReturn<SensorFormData>;
  handlers: {
    handleMetricChange: (newMetric: string) => void;
    handleMetricEnabledChange: (metricKey: string, value: boolean) => Promise<void>;
    handleInstanceSwitch: (newInstance: number) => Promise<void>;
    handleSensorTypeSwitch: (newType: SensorType) => Promise<void>;
    handleClose: () => Promise<boolean>;
    handleTestSound: (soundPattern: string) => Promise<void>;
    saveImmediately: () => Promise<void>;
  };
}

/**
 * Simplified hook - JUST form state + save logic
 */
export const useSensorConfigForm = (
  sensorType: SensorType | null,
  selectedInstance: number,
  onSave: (sensorType: SensorType, instance: number, data: SensorFormData) => Promise<void>,
): UseSensorConfigFormReturn => {
  const { confirm } = useConfirmDialog();

  // Auto-save timeout ref - useRef maintains reference across renders
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved config from store
  const savedConfig = useNmeaStore(
    (state) => sensorType ? state.getSensorConfig(sensorType, selectedInstance) : undefined
  );

  const sensorConfig = sensorType ? getSensorSchema(sensorType) : null;
  
  // Get alarm fields for metric selection
  const alarmFieldKeys = useMemo(() => {
    if (!sensorConfig) return [];
    return Object.entries(sensorConfig.fields)
      .filter(([_, field]) => field.alarm !== undefined)
      .map(([key, _]) => key);
  }, [sensorConfig]);

  // Determine alarm direction for validation
  const direction = useMemo(() => {
    const defaultMetric = alarmFieldKeys[0];
    if (!sensorType || !defaultMetric) return undefined;
    const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
    const fieldDef = schema?.fields[defaultMetric as keyof typeof schema.fields];
    if (!fieldDef || !('alarm' in fieldDef)) return undefined;
    return (fieldDef.alarm as any)?.direction || 'above';
  }, [sensorType, alarmFieldKeys]);

  // Initialize form data from store
  const initialFormData: SensorFormData = useMemo(() => {
    if (!sensorType) {
      return {
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'warble',
      };
    }

    const displayName = getSensorDisplayName(sensorType, selectedInstance, savedConfig as SensorConfiguration | undefined);
    const firstMetric = alarmFieldKeys[0] || '';
    const thresholds = firstMetric
      ? loadThresholdsForMetric(sensorType, selectedInstance, firstMetric, savedConfig as SensorConfiguration | undefined)
      : { criticalSound: 'rapid_pulse', warningSound: 'warble' };

    const contextValue = typeof (savedConfig as any)?.context === 'string' 
      ? (savedConfig as any).context 
      : undefined;

    return {
      name: displayName,
      context: contextValue,
      selectedMetric: firstMetric,
      criticalValue: thresholds.critical,
      warningValue: thresholds.warning,
      criticalSoundPattern: thresholds.criticalSound,
      warningSoundPattern: thresholds.warningSound,
    };
  }, [sensorType, selectedInstance, savedConfig, alarmFieldKeys]);

  // Initialize React Hook Form
  const form = useForm<SensorFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(createSensorFormSchema(direction)),
    defaultValues: initialFormData,
  });

  // Reset form when sensor type/instance changes
  // NOTE: Do NOT include initialFormData in deps - it changes when savedConfig updates,
  // causing infinite loop (save → config update → formData recompute → reset → save...)
  useEffect(() => {
    form.reset(initialFormData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorType, selectedInstance, form.reset]);

  // Cleanup: Clear auto-save timeout on state change or unmount
  // CRITICAL: Prevents race condition where timeout fires after instance/type switch
  // Cleanup function runs both when deps change AND on component unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [sensorType, selectedInstance]);

  // Internal: Save current form state (consolidates all save pathways)
  const saveCurrentState = useCallback(
    async (requireValidation: boolean = true): Promise<boolean> => {
      if (!sensorType) return false;
      
      try {
        if (requireValidation) {
          // Use handleSubmit for validation
          await form.handleSubmit(async (data) => {
            await onSave(sensorType, selectedInstance, data);
          })();
        } else {
          // Direct save without validation
          const formData = form.getValues();
          await onSave(sensorType, selectedInstance, formData);
        }
        return true;
      } catch (error) {
        log.app('useSensorConfigForm: Save failed', () => ({
          error: error instanceof Error ? error.message : String(error),
        }));
        return false;
      }
    },
    [sensorType, selectedInstance, form, onSave],
  );

  // Handler: Metric change - load new thresholds
  const handleMetricChange = useCallback(
    (newMetric: string) => {
      if (!sensorType) return;

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
        return;
      }

      form.setValue('selectedMetric', newMetric, { shouldDirty: false });
      if (enriched.display.critical?.value !== undefined) {
        form.setValue('criticalValue', enriched.display.critical.value, { shouldDirty: false });
      }
      if (enriched.display.warning?.value !== undefined) {
        form.setValue('warningValue', enriched.display.warning.value, { shouldDirty: false });
      }
    },
    [sensorType, selectedInstance, form],
  );

  // Handler: Per-metric alarm enable with safety confirmation
  const handleMetricEnabledChange = useCallback(
    async (metricKey: string, value: boolean) => {
      if (!sensorType) return;

      // Check if metric is safety-critical
      const schema = SENSOR_SCHEMAS[sensorType as keyof typeof SENSOR_SCHEMAS];
      const fieldDef = schema?.fields[metricKey as keyof typeof schema.fields];
      const isCritical = fieldDef && 'alarm' in fieldDef && (fieldDef.alarm as any)?.safetyRequired === true;

      if (!value && isCritical) {
        const ok = await confirm(
          'Disable Critical Alarm?',
          `${metricKey.toUpperCase()} alarm is critical for vessel safety. Disable?`
        );
        if (!ok) return;
      }

      // Update store directly (per-metric enabled state not in form)
      const currentConfig = useNmeaStore.getState().getSensorConfig(sensorType, selectedInstance);
      const existingMetric = currentConfig?.metrics?.[metricKey];
      
      await useNmeaStore.getState().setSensorConfig(sensorType, selectedInstance, {
        ...currentConfig,
        metrics: {
          ...currentConfig?.metrics,
          [metricKey]: {
            critical: existingMetric?.critical ?? 0,
            warning: existingMetric?.warning ?? 0,
            ...existingMetric,
            enabled: value,
          },
        },
        lastModified: Date.now(),
      });
    },
    [sensorType, selectedInstance, confirm],
  );

  // Handler: Instance switch - auto-save before switching
  // NOTE: newInstance param unused - parent component handles state update after this returns
  const handleInstanceSwitch = useCallback(
    async (_newInstance: number) => {
      if (!sensorType) return;
      
      // CRITICAL: Clear pending auto-save to prevent race condition
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      // Always save on instance switch (with validation)
      await saveCurrentState(true);
      await new Promise(resolve => setTimeout(resolve, 0)); // Microtask for store sync
      
      // Reset form to prevent stale data
      form.reset({}, { keepDefaultValues: false });
    },
    [sensorType, form, saveCurrentState],
  );

  // Handler: Sensor type switch - save if dirty
  // NOTE: newType param unused - parent component handles state update after this returns
  const handleSensorTypeSwitch = useCallback(
    async (_newType: SensorType) => {
      // CRITICAL: Clear pending auto-save to prevent race condition
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      if (form.formState.isDirty) {
        await saveCurrentState(true);
      }
    },
    [form.formState.isDirty, saveCurrentState],
  );

  // Handler: Close - save if dirty
  const handleClose = useCallback(async (): Promise<boolean> => {
    if (form.formState.isDirty) {
      return await saveCurrentState(true);
    }
    return true; // No changes, allow close
  }, [form.formState.isDirty, saveCurrentState]);

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

  // Handler: Immediate save - no debouncing for maritime safety
  const saveImmediately = useCallback(async () => {
    if (!sensorType) return;
    
    // Guard: Don't save if critical values are undefined (enrichment failed or not loaded yet)
    const formData = form.getValues();
    if (formData.criticalValue === undefined || formData.warningValue === undefined) {
      log.app('useSensorConfigForm: Skipping save - threshold values not loaded yet', () => ({
        sensorType,
        selectedInstance,
        criticalValue: formData.criticalValue,
        warningValue: formData.warningValue,
      }));
      return;
    }
    
    // Clear any pending timeout (cleanup)
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    // Save immediately without validation
    await saveCurrentState(false);
  }, [sensorType, selectedInstance, form, saveCurrentState]);

  return {
    form,
    handlers: {
      handleMetricChange,
      handleMetricEnabledChange,
      handleInstanceSwitch,
      handleSensorTypeSwitch,
      handleClose,
      handleTestSound,
      saveImmediately,
    },
  };
};
