/**
 * Sensor Configuration Dialog - Per-Instance Configuration (Registry-Driven)
 *
 * Features:
 * - Sensor naming and context configuration
 * - Instance tab navigation for multi-instance sensors
 * - Alarm threshold configuration (warning + critical)
 * - Location-aware threshold defaults
 * - SI unit storage with presentation system conversion
 * - Real-time configuration updates to NMEA store
 * - Registry-driven dynamic form rendering
 * - Reusable ThresholdEditor components
 * - Explicit save timing (transitions only, no auto-save)
 * 
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal/header/footer structure
 * - BaseConfigDialog provides: pageSheet Modal, close button, title (no action button for this dialog)
 * - SensorConfigRegistry: Single source of truth for all sensor-specific requirements
 * - NMEA Store: Runtime source of truth (widgets read from here)
 * - AsyncStorage: Background persistence only
 * - FormData: In-memory editing state with explicit saves on transitions
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { z } from 'zod';
import Slider from '@react-native-community/slider';
import RangeSlider from 'rn-range-slider';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { useSensorConfigStore } from '../../store/sensorConfigStore';
import { SensorType, SensorAlarmThresholds } from '../../types/SensorData';
import { useDataPresentation } from '../../presentation/useDataPresentation';
import { DataCategory } from '../../presentation/categories';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker, PlatformPickerItem } from './inputs/PlatformPicker';
import { ThresholdEditor } from './inputs/ThresholdEditor';
import { getAlarmDirection, getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../../utils/sensorDisplayName';
import { SOUND_PATTERNS } from '../../services/alarms/MarineAudioAlertManager';
import { SENSOR_CONFIG_REGISTRY, getSensorConfig, getAlarmDefaults, shouldShowField } from '../../registry/SensorConfigRegistry';

/**
 * Sensor Configuration Dialog Props
 * 
 * @property visible - Controls modal visibility
 * @property onClose - Callback when dialog closes (via X button or backdrop)
 * @property sensorType - Optional sensor type filter (shows only that sensor)
 * 
 * **Component Behavior:**
 * - Opens modal with platform-specific presentation (pageSheet on iOS)
 * - Shows tabs for multi-instance sensors (e.g., multiple batteries)
 * - Supports multi-metric alarms (battery: voltage/SOC/temp/current)
 * - Explicit saves only on transitions (instance/sensor/close), NOT on field edits
 * - Converts display units ↔ SI units using presentation system
 * - Persists to NMEA store (immediate) then AsyncStorage (background)
 * 
 * **Save Timing (Explicit):**
 * ✅ Saves when: Switching instance, switching sensor type, closing dialog
 * ❌ Does NOT save: Field edits, metric selection changes, slider dragging
 * 
 * **Store Architecture:**
 * 1. **NMEA Store**: Runtime source of truth (widgets read from here)
 * 2. **AsyncStorage**: Background persistence (loaded on app startup)
 * 3. **FormData**: In-memory editing buffer (explicit saves on transitions)
 * 
 * **Registry-Driven Rendering:**
 * - All sensor-specific fields defined in SensorConfigRegistry
 * - Dynamic form rendering via renderConfigFields()
 * - Hardware-provided fields automatically show read-only
 * - New sensors work without component changes
 * 
 * **Limitations:**
 * - Requires at least one sensor instance to be available
 * - Threshold validation enforces warning < critical (or vice versa based on direction)
 * - Toggle/slider field types defined in registry but not yet implemented
 */
export interface SensorConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  sensorType?: SensorType;
}

// Hardcoded sensor configuration removed - now using SensorConfigRegistry as single source of truth

/**
 * Get metric-specific presentation for unit conversion
 * Uses registry to find metric category, then maps to appropriate presentation hook
 * 
 * @param sensorType - Sensor type to get metrics for
 * @param metricKey - Specific metric identifier (e.g., 'voltage', 'temperature')
 * @param presentation - Default presentation (used for single-metric sensors)
 * @param voltagePresentation - Pre-called voltage presentation hook
 * @param temperaturePresentation - Pre-called temperature presentation hook
 * @param currentPresentation - Pre-called current presentation hook
 * @param pressurePresentation - Pre-called pressure presentation hook
 * @param rpmPresentation - Pre-called RPM presentation hook
 * @param speedPresentation - Pre-called speed presentation hook
 * @returns Appropriate presentation hook for the metric
 */
function getMetricPresentation(
  sensorType: SensorType | null,
  metricKey: string | undefined,
  presentation: any,
  voltagePresentation: any,
  temperaturePresentation: any,
  currentPresentation: any,
  pressurePresentation: any,
  rpmPresentation: any,
  speedPresentation: any
): any {
  if (!sensorType || !metricKey) return presentation;
  
  const sensorConfig = getSensorConfig(sensorType);
  const metricInfo = sensorConfig.alarmMetrics?.find(m => m.key === metricKey);
  if (!metricInfo?.category) return presentation;
  
  const categoryMap: Partial<Record<DataCategory, any>> = {
    voltage: voltagePresentation,
    temperature: temperaturePresentation,
    current: currentPresentation,
    pressure: pressurePresentation,
    rpm: rpmPresentation,
    speed: speedPresentation,
  };
  
  return categoryMap[metricInfo.category] || presentation;
}

interface SensorInstance {
  instance: number;
  name?: string;
  location?: string;
  lastUpdate?: number;
}

// Zod schema for form validation with direction-aware threshold validation
const createSensorFormSchema = (direction?: 'above' | 'below') => z.object({
  name: z.string().optional(),
  enabled: z.boolean(),
  batteryChemistry: z.enum(['lead-acid', 'agm', 'lifepo4']).optional(),
  engineType: z.enum(['diesel', 'gasoline', 'outboard']).optional(),
  selectedMetric: z.string().optional(),
  criticalValue: z.number().optional(),
  warningValue: z.number().optional(),
  criticalSoundPattern: z.string(),
  warningSoundPattern: z.string(),
}).refine((data) => {
  // Validate threshold relationship based on alarm direction
  if (data.warningValue !== undefined && data.criticalValue !== undefined && direction) {
    if (direction === 'above') {
      // For 'above' alarms: warning must be less than critical
      return data.warningValue < data.criticalValue;
    } else {
      // For 'below' alarms: warning must be greater than critical
      return data.warningValue > data.criticalValue;
    }
  }
  return true;
}, {
  message: 'Warning threshold must be less severe than critical threshold',
});

type SensorFormData = z.infer<ReturnType<typeof createSensorFormSchema>>;

export const SensorConfigDialog: React.FC<SensorConfigDialogProps> = ({
  visible,
  onClose,
  sensorType: initialSensorType,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // NMEA store access
  const getSensorInstances = useNmeaStore((state) => state.getSensorInstances);
  const updateSensorThresholds = useNmeaStore((state) => state.updateSensorThresholds);
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);
  const rawSensorData = useNmeaStore((state) => state.nmeaData.sensors);
  const setConfig = useSensorConfigStore((state) => state.setConfig);

  // Available sensor types
  const availableSensorTypes = useMemo(() => {
    const sensorTypes = Object.keys(rawSensorData) as SensorType[];
    return sensorTypes.filter((type) => getSensorInstances(type).length > 0);
  }, [getSensorInstances, rawSensorData]);

  // Selected sensor and instance
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType | null>(
    initialSensorType || null
  );
  const [selectedInstance, setSelectedInstance] = useState<number>(0);

  // Get instances for selected sensor
  const instances = useMemo(() => {
    if (!selectedSensorType) return [];
    const detected = getSensorInstances(selectedSensorType);
    return detected.map(({ instance, data }) => ({
      instance,
      name: data.name,
      location: (data as any).location,
      lastUpdate: data.timestamp,
    })) as SensorInstance[];
  }, [selectedSensorType, getSensorInstances]);

  // Initialize selected sensor type when dialog opens (if not provided by prop)
  useEffect(() => {
    if (visible && !initialSensorType && !selectedSensorType && availableSensorTypes.length > 0) {
      // Auto-select first available sensor when dialog opens without a specific sensor
      setSelectedSensorType(availableSensorTypes[0]);
    }
  }, [visible, initialSensorType, selectedSensorType, availableSensorTypes]);

  // Reset to initialSensorType when dialog visibility changes (handles re-opening)
  useEffect(() => {
    if (visible && initialSensorType && initialSensorType !== selectedSensorType) {
      setSelectedSensorType(initialSensorType);
    }
  }, [visible, initialSensorType]);

  // Update selected instance when instances change
  useEffect(() => {
    if (instances.length > 0 && !instances.find(i => i.instance === selectedInstance)) {
      setSelectedInstance(instances[0].instance);
    }
  }, [instances, selectedInstance]);

  // Get presentation for selected sensor - derive category from registry
  const category = useMemo(() => {
    if (!selectedSensorType) return null;
    const sensorConfig = getSensorConfig(selectedSensorType);
    
    // Multi-metric: use first metric's category
    if (sensorConfig.alarmMetrics && sensorConfig.alarmMetrics.length > 0) {
      return sensorConfig.alarmMetrics[0].category || null;
    }
    
    // Single-metric: infer category from sensor type
    const categoryMap: Partial<Record<SensorType, DataCategory>> = {
      depth: 'depth',
      speed: 'speed',
      wind: 'wind',
      temperature: 'temperature',
    };
    
    return categoryMap[selectedSensorType] || null;
  }, [selectedSensorType]);
  
  const rawPresentation = useDataPresentation(category || 'depth');
  
  // Pre-call all possible metric presentation hooks (React hooks must be called unconditionally)
  const voltagePresentation = useDataPresentation('voltage');
  const temperaturePresentation = useDataPresentation('temperature');
  const currentPresentation = useDataPresentation('current');
  const pressurePresentation = useDataPresentation('pressure');
  const rpmPresentation = useDataPresentation('rpm');
  const speedPresentation = useDataPresentation('speed');
  
  const presentation = useMemo(
    () => category ? rawPresentation : {
      isValid: false,
      convert: (v: number) => v,
      convertBack: (v: number) => v,
      presentation: null,
      formatSpec: { decimals: 1, testCases: { min: 0, max: 100 } },
    },
    [category, rawPresentation]
  );

  // Get alarm configuration from registry
  const sensorConfig = selectedSensorType ? getSensorConfig(selectedSensorType) : null;
  const requiresMetricSelection = sensorConfig?.alarmSupport === 'multi-metric';
  const supportsAlarms = sensorConfig?.alarmSupport !== 'none';
  
  // Memoize sound pattern picker items (include "None" option)
  const soundPatternItems = useMemo(
    () => [
      { label: 'None', value: 'none' },
      ...SOUND_PATTERNS.map((p) => ({ label: p.label, value: p.value }))
    ],
    []
  );

  // Get current thresholds from NMEA store (single source of truth at runtime)
  const currentThresholds = useMemo(() => {
    if (!selectedSensorType) return { enabled: false };
    return getSensorThresholds(selectedSensorType, selectedInstance) || { enabled: false };
  }, [selectedSensorType, selectedInstance, getSensorThresholds]);

  // Get sensor-provided chemistry (read-only for safety)
  const sensorProvidedChemistry = useMemo(() => {
    if (selectedSensorType !== 'battery') return undefined;
    const sensorData = rawSensorData.battery?.[selectedInstance];
    return sensorData && typeof sensorData === 'object' && 'chemistry' in sensorData
      ? (sensorData as { chemistry?: string }).chemistry
      : undefined;
  }, [selectedSensorType, selectedInstance, rawSensorData]);

  // Initialize form data
  const initialFormData: SensorFormData = useMemo(() => {
    const currentSensorData = selectedSensorType ? rawSensorData[selectedSensorType]?.[selectedInstance] : undefined;
    const displayName = selectedSensorType
      ? getSensorDisplayName(selectedSensorType, selectedInstance, currentThresholds, currentSensorData?.name)
      : '';

    // For multi-metric sensors, get the first metric key and load its thresholds
    const firstMetric = requiresMetricSelection && sensorConfig?.alarmMetrics?.[0]?.key;
    let criticalValue: number | undefined;
    let warningValue: number | undefined;
    let criticalSoundPattern = 'rapid_pulse';
    let warningSoundPattern = 'warble';

    if (requiresMetricSelection && firstMetric && currentThresholds.metrics?.[firstMetric]) {
      // Load stored thresholds for first metric
      const metricConfig = currentThresholds.metrics[firstMetric];
      
      // Get metric-specific presentation
      const metricPres = getMetricPresentation(
        selectedSensorType,
        firstMetric,
        presentation,
        voltagePresentation,
        temperaturePresentation,
        currentPresentation,
        pressurePresentation,
        rpmPresentation,
        speedPresentation
      );
      
      criticalValue = metricConfig.critical !== undefined && metricPres.isValid
        ? metricPres.convert(metricConfig.critical)
        : undefined;
      warningValue = metricConfig.warning !== undefined && metricPres.isValid
        ? metricPres.convert(metricConfig.warning)
        : undefined;
      criticalSoundPattern = metricConfig.criticalSoundPattern || 'rapid_pulse';
      warningSoundPattern = metricConfig.warningSoundPattern || 'warble';
    } else if (requiresMetricSelection && firstMetric && !currentThresholds.metrics?.[firstMetric]) {
      // No saved config - use defaults for first metric
      const defaults = getAlarmDefaults(selectedSensorType!, currentThresholds.context);
      if (defaults?.metrics?.[firstMetric]) {
        const metricDefaults = defaults.metrics[firstMetric];
        const metricPres = getMetricPresentation(
          selectedSensorType,
          firstMetric,
          presentation,
          voltagePresentation,
          temperaturePresentation,
          currentPresentation,
          pressurePresentation,
          rpmPresentation,
          speedPresentation
        );
        
        criticalValue = metricDefaults.critical !== undefined && metricPres.isValid
          ? metricPres.convert(metricDefaults.critical)
          : undefined;
        warningValue = metricDefaults.warning !== undefined && metricPres.isValid
          ? metricPres.convert(metricDefaults.warning)
          : undefined;
      }
    } else {
      // Single-metric sensor - use simple thresholds
      criticalValue = currentThresholds.critical !== undefined && presentation.isValid
        ? presentation.convert(currentThresholds.critical)
        : undefined;
      warningValue = currentThresholds.warning !== undefined && presentation.isValid
        ? presentation.convert(currentThresholds.warning)
        : undefined;
      criticalSoundPattern = currentThresholds.criticalSoundPattern || 'rapid_pulse';
      warningSoundPattern = currentThresholds.warningSoundPattern || 'warble';
    }

    return {
      name: displayName,
      enabled: currentThresholds.enabled || false,
      batteryChemistry: (currentThresholds.context?.batteryChemistry as 'lead-acid' | 'agm' | 'lifepo4') || 'lead-acid',
      engineType: (currentThresholds.context?.engineType as 'diesel' | 'gasoline' | 'outboard') || 'diesel',
      selectedMetric: firstMetric || '',
      criticalValue,
      warningValue,
      criticalSoundPattern,
      warningSoundPattern,
    };
  }, [selectedSensorType, selectedInstance, currentThresholds, presentation, requiresMetricSelection, sensorConfig, rawSensorData, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation]);

  // Form state - simple useState, no auto-save
  const [formData, setFormData] = useState<SensorFormData>(initialFormData);
  
  // For multi-metric sensors, get the currently selected metric's threshold config
  // For single-metric sensors, return the top-level threshold
  const currentMetricThresholds = useMemo(() => {
    if (!selectedSensorType) return currentThresholds;
    
    const sensorConfig = getSensorConfig(selectedSensorType);
    if (sensorConfig.alarmSupport === 'multi-metric' && formData.selectedMetric) {
      const metricThresholds = currentThresholds.metrics?.[formData.selectedMetric] || currentThresholds;
      console.log(`[SensorConfigDialog] currentMetricThresholds for ${selectedSensorType}[${selectedInstance}].${formData.selectedMetric}:`, {
        currentThresholds,
        metricThresholds,
        hasMin: 'min' in metricThresholds,
        hasMax: 'max' in metricThresholds,
        min: metricThresholds.min,
        max: metricThresholds.max
      });
      return metricThresholds;
    }
    
    return currentThresholds;
  }, [selectedSensorType, selectedInstance, currentThresholds, formData.selectedMetric]);
  
  // Update single field
  const updateField = useCallback(<K extends keyof SensorFormData>(
    field: K,
    value: SensorFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<SensorFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);
  
  /**
   * Save current FormData to stores
   * 
   * **Architecture:**
   * This function implements the explicit save pattern - changes are NOT auto-saved
   * on every field edit. Instead, saves occur only on explicit user transitions.
   * 
   * **When Called:**
   * 1. User switches to different sensor instance → handleInstanceSwitch()
   * 2. User switches to different sensor type → handleSensorTypeSwitch()
   * 3. User closes dialog → handleClose()
   * 
   * **NOT Called When:**
   * - User edits a field (just updates FormData state)
   * - User switches between alarm metrics (voltage → current)
   * - User drags a slider (updates FormData, no save)
   * 
   * **Save Flow:**
   * ```
   * FormData (in-memory)
   *     ↓
   * Convert display units → SI units (presentation.convertBack)
   *     ↓
   * Build SensorAlarmThresholds object
   *     ↓
   * 1. updateSensorThresholds(NMEA store)    ← Widgets see immediately
   *     ↓
   * 2. setConfig(AsyncStorage)                ← Background persistence
   * ```
   * 
   * **Error Handling:**
   * - Try/catch wraps entire save operation
   * - User gets alert on failure (platform-specific)
   * - Console error logged for debugging
   * - Partial saves are possible (NMEA succeeds, AsyncStorage fails)
   * 
   * **Unit Conversion:**
   * - Multi-metric sensors: Uses metric-specific presentation (voltagePresentation, etc.)
   * - Single-metric sensors: Uses main presentation hook
   * - Raw values (SOC %): No conversion, stored as-is
   * 
   * @async Waits for save completion before resolving
   */
  const saveCurrentForm = useCallback(async () => {
    if (!selectedSensorType) return;

    const updates: Partial<SensorAlarmThresholds> = {
      name: formData.name?.trim() || undefined,
      enabled: formData.enabled,
      direction: getAlarmDirection(selectedSensorType).direction,
      criticalSoundPattern: formData.criticalSoundPattern,
      warningSoundPattern: formData.warningSoundPattern,
    };

    // Add context from form fields
    if (selectedSensorType === 'battery' && formData.batteryChemistry) {
      updates.context = { batteryChemistry: formData.batteryChemistry };
    } else if (selectedSensorType === 'engine' && formData.engineType) {
      updates.context = { engineType: formData.engineType };
    }

    // Convert thresholds back to SI units
    if (requiresMetricSelection && formData.selectedMetric) {
      // Use shared helper to get metric-specific presentation
      const metricPres = getMetricPresentation(
        selectedSensorType,
        formData.selectedMetric,
        presentation,
        voltagePresentation,
        temperaturePresentation,
        currentPresentation,
        pressurePresentation,
        rpmPresentation,
        speedPresentation
      );
      
      updates.metrics = { ...currentThresholds.metrics };
      if (!updates.metrics) updates.metrics = {};
      updates.metrics[formData.selectedMetric] = {
        enabled: true,
        direction: getAlarmDirection(selectedSensorType, formData.selectedMetric).direction,
        critical: formData.criticalValue !== undefined && metricPres.isValid ? metricPres.convertBack(formData.criticalValue) : undefined,
        warning: formData.warningValue !== undefined && metricPres.isValid ? metricPres.convertBack(formData.warningValue) : undefined,
        criticalSoundPattern: formData.criticalSoundPattern,
        warningSoundPattern: formData.warningSoundPattern,
      };
    } else {
      if (formData.criticalValue !== undefined && presentation.isValid) {
        updates.critical = presentation.convertBack(formData.criticalValue);
      }
      if (formData.warningValue !== undefined && presentation.isValid) {
        updates.warning = presentation.convertBack(formData.warningValue);
      }
    }

    // Save to stores with error handling
    try {
      // 1. Write to NMEA store FIRST (immediate, widgets see changes)
      updateSensorThresholds(selectedSensorType, selectedInstance, updates);
      
      // 2. Write to AsyncStorage in background (persistence)
      setConfig(selectedSensorType, selectedInstance, updates);
      
      console.log(`[SensorConfigDialog] Saved ${selectedSensorType}:${selectedInstance}`);
    } catch (error) {
      console.error('[SensorConfigDialog] Save failed:', error);
      if (Platform.OS === 'web') {
        alert('Failed to save sensor configuration. Please try again.');
      } else {
        Alert.alert('Save Failed', 'Could not save sensor configuration. Please try again.');
      }
    }
  }, [selectedSensorType, selectedInstance, formData, presentation, requiresMetricSelection, currentThresholds, setConfig, updateSensorThresholds, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation]);
  
  // Get alarm direction for validation
  const alarmDirection = useMemo(() => {
    if (!selectedSensorType) return undefined;
    const metric = requiresMetricSelection ? formData.selectedMetric : undefined;
    return getAlarmDirection(selectedSensorType, metric).direction;
  }, [selectedSensorType, requiresMetricSelection, formData.selectedMetric]);

  // Load instance data when sensor type or instance changes
  // NOTE: Only trigger on sensor type/instance change, NOT when initialFormData changes
  // This prevents the bug where enabling alarms causes formData to reset
  useEffect(() => {
    if (selectedSensorType && selectedInstance !== undefined) {
      setFormData(initialFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSensorType, selectedInstance]);

  // Ensure selectedMetric defaults to first metric for multi-metric sensors
  useEffect(() => {
    if (requiresMetricSelection && sensorConfig?.alarmMetrics && (!formData.selectedMetric || formData.selectedMetric === '')) {
      const firstMetric = sensorConfig.alarmMetrics[0]?.key;
      if (firstMetric) {
        updateField('selectedMetric', firstMetric);
      }
    }
  }, [requiresMetricSelection, sensorConfig, formData.selectedMetric, updateField]);

  // Handle metric switching - load thresholds for selected metric
  useEffect(() => {
    if (formData.selectedMetric) {
      
      if (requiresMetricSelection && formData.selectedMetric && currentThresholds.metrics) {
        const metricConfig = currentThresholds.metrics[formData.selectedMetric];
        
        // Get metric-specific presentation using shared helper
        const metricPres = getMetricPresentation(
          selectedSensorType,
          formData.selectedMetric,
          presentation,
          voltagePresentation,
          temperaturePresentation,
          currentPresentation,
          pressurePresentation,
          rpmPresentation,
          speedPresentation
        );
        
        if (metricConfig) {
          // Load stored thresholds for this metric
          updateFields({
            criticalValue: metricConfig.critical !== undefined && metricPres.isValid
              ? metricPres.convert(metricConfig.critical)
              : undefined,
            warningValue: metricConfig.warning !== undefined && metricPres.isValid
              ? metricPres.convert(metricConfig.warning)
              : undefined,
            criticalSoundPattern: metricConfig.criticalSoundPattern || 'rapid_pulse',
            warningSoundPattern: metricConfig.warningSoundPattern || 'warble',
          });
        } else if (selectedSensorType && formData.selectedMetric) {
          // No saved config for this metric - use smart defaults
          const defaults = getAlarmDefaults(selectedSensorType, currentThresholds.context);

          // Extract metric-specific defaults from multi-metric structure
          if (defaults?.metrics?.[formData.selectedMetric]) {
            const metricDefaults = defaults.metrics[formData.selectedMetric];
            updateFields({
              criticalValue: metricDefaults.critical !== undefined && metricPres.isValid
                ? metricPres.convert(metricDefaults.critical)
                : undefined,
              warningValue: metricDefaults.warning !== undefined && metricPres.isValid
                ? metricPres.convert(metricDefaults.warning)
                : undefined,
              criticalSoundPattern: 'rapid_pulse',
              warningSoundPattern: 'warble',
            });
          }
        }
      }
    }
  }, [formData.selectedMetric, requiresMetricSelection, currentThresholds.metrics, selectedSensorType, currentThresholds.context, presentation, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation, updateFields]);

  /**
   * Get metric-specific presentation for multi-metric sensors
   * 
   * Maps the currently selected metric's category to the appropriate pre-called presentation hook.
   * Returns default presentation for single-metric sensors or when no metric is selected.
   * 
   * **Why this approach:**
   * - Cannot call useDataPresentation() conditionally (violates React Rules of Hooks)
   * - Pre-call all needed presentations at top level, then select in this memo
   * - Category map only includes categories actually used by multi-metric sensors
   */
  const metricPresentation = useMemo(() => {
    if (!requiresMetricSelection || !formData.selectedMetric || !sensorConfig?.alarmMetrics) {
      return presentation;
    }
    
    const metricInfo = sensorConfig.alarmMetrics.find(m => m.key === formData.selectedMetric);
    if (metricInfo?.category) {
      // Map category to pre-called presentation hook (avoids conditional hook calls)
      // Only map categories actually used by multi-metric sensors
      const categoryPresentationMap: Partial<Record<DataCategory, any>> = {
        voltage: voltagePresentation,
        temperature: temperaturePresentation,
        current: currentPresentation,
        pressure: pressurePresentation,
        rpm: rpmPresentation,
        speed: speedPresentation,
      };
      return categoryPresentationMap[metricInfo.category] || presentation;
    }
    
    return presentation;
  }, [requiresMetricSelection, formData.selectedMetric, sensorConfig, presentation, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation]);

  // Compute constrained slider ranges based on alarm direction and other slider's value
  const criticalSliderRange = useMemo(() => {
    const baseMin = (currentMetricThresholds as any).min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0;
    const baseMax = (currentMetricThresholds as any).max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100;
    
    return {
      min: alarmDirection === 'above' ? (formData.warningValue ?? baseMin) : baseMin,
      max: alarmDirection === 'below' ? (formData.warningValue ?? baseMax) : baseMax
    };
  }, [currentMetricThresholds, metricPresentation, alarmDirection, formData.warningValue]);
  
  const warningSliderRange = useMemo(() => {
    const baseMin = (currentMetricThresholds as any).min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0;
    const baseMax = (currentMetricThresholds as any).max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100;
    
    return {
      min: alarmDirection === 'below' ? (formData.criticalValue ?? baseMin) : baseMin,
      max: alarmDirection === 'above' ? (formData.criticalValue ?? baseMax) : baseMax
    };
  }, [currentMetricThresholds, metricPresentation, alarmDirection, formData.criticalValue]);

  // Auto-clamp slider values when their allowed range changes due to other slider movement
  useEffect(() => {
    // Clamp critical value to its allowed range
    if (formData.criticalValue !== undefined) {
      const clampedCritical = Math.max(criticalSliderRange.min, Math.min(criticalSliderRange.max, formData.criticalValue));
      if (clampedCritical !== formData.criticalValue) {
        setFormData(prev => ({ ...prev, criticalValue: clampedCritical }));
      }
    }
    
    // Clamp warning value to its allowed range
    if (formData.warningValue !== undefined) {
      const clampedWarning = Math.max(warningSliderRange.min, Math.min(warningSliderRange.max, formData.warningValue));
      if (clampedWarning !== formData.warningValue) {
        setFormData(prev => ({ ...prev, warningValue: clampedWarning }));
      }
    }
  }, [criticalSliderRange.min, criticalSliderRange.max, warningSliderRange.min, warningSliderRange.max, formData.criticalValue, formData.warningValue]);

  /**
   * Handle instance switch (e.g., Battery 1 → Battery 2)
   * Saves current form, then switches instance (form auto-reloads via useEffect)
   */
  const handleInstanceSwitch = useCallback(async (newInstance: number) => {
    await saveCurrentForm();
    setSelectedInstance(newInstance);
  }, [saveCurrentForm]);

  /**
   * Handle sensor type switch (e.g., Battery → Engine)
   * Saves current form, switches sensor type, resets to first instance
   */
  const handleSensorTypeSwitch = useCallback(async (value: string) => {
    if (value && value !== '') {
      await saveCurrentForm();
      setSelectedSensorType(value as SensorType);
      const newInstances = getSensorInstances(value as SensorType);
      setSelectedInstance(newInstances.length > 0 ? newInstances[0].instance : 0);
    }
  }, [saveCurrentForm, getSensorInstances]);

  /**
   * Handle metric change - NO SAVE, just switch metric
   * useEffect will load thresholds for new metric from NMEA store
   */
  const handleMetricChange = useCallback((newMetric: string) => {
    updateField('selectedMetric', newMetric);
  }, [updateField]);

  /**
   * Handle alarm enable/disable with safety confirmation
   * Shows confirmation dialog for critical sensors (depth, battery, engine).
   */
  const handleEnabledChange = useCallback((value: boolean) => {
    const isCritical = selectedSensorType && ['depth', 'battery', 'engine'].includes(selectedSensorType);
    
    if (!value && isCritical) {
      if (Platform.OS === 'web') {
        if (confirm(`${selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`)) {
          updateField('enabled', value);
        }
      } else {
        Alert.alert(
          'Disable Critical Alarm?',
          `${selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disable this alarm?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disable', style: 'destructive', onPress: () => updateField('enabled', value) },
          ]
        );
      }
    } else {
      updateField('enabled', value);
    }
  }, [selectedSensorType, updateField]);

  /**
   * Handle dialog close - always save current form before closing
   */
  const handleClose = useCallback(async () => {
    await saveCurrentForm();
    onClose();
  }, [saveCurrentForm, onClose]);

  /**
   * Reset to defaults - loads app defaults into FormData (NOT saved yet)
   * User can review defaults and edit before saving by switching instance/sensor/closing
   */
  const handleMasterReset = useCallback(() => {
    if (!selectedSensorType) return;

    const sensorConfig = getSensorConfig(selectedSensorType);
    
    const performReset = () => {
      // Build context from current FormData
      const context: Record<string, string> = {};
      if (selectedSensorType === 'battery') {
        context.batteryChemistry = formData.batteryChemistry || 'lead-acid';
      } else if (selectedSensorType === 'engine') {
        context.engineType = formData.engineType || 'diesel';
      }

      // Get defaults from registry
      const defaults = getAlarmDefaults(selectedSensorType, context);

      if (defaults) {
        // Build reset FormData
        const resetData: Partial<SensorFormData> = {
          name: getSensorDisplayName(selectedSensorType, selectedInstance),
          enabled: defaults.enabled || false,
        };

        // Handle single-metric vs multi-metric
        if (sensorConfig.alarmSupport === 'single-metric') {
          resetData.criticalValue = defaults.critical !== undefined && presentation.isValid
            ? presentation.convert(defaults.critical)
            : undefined;
          resetData.warningValue = defaults.warning !== undefined && presentation.isValid
            ? presentation.convert(defaults.warning)
            : undefined;
        } else if (sensorConfig.alarmSupport === 'multi-metric' && formData.selectedMetric) {
          // Reset current metric's thresholds
          const metricDefaults = defaults.metrics?.[formData.selectedMetric];
          if (metricDefaults) {
            resetData.criticalValue = metricDefaults.critical !== undefined && metricPresentation.isValid
              ? metricPresentation.convert(metricDefaults.critical)
              : undefined;
            resetData.warningValue = metricDefaults.warning !== undefined && metricPresentation.isValid
              ? metricPresentation.convert(metricDefaults.warning)
              : undefined;
          }
        }

        // Reset sound patterns
        resetData.criticalSoundPattern = defaults.criticalSoundPattern || 'rapid_pulse';
        resetData.warningSoundPattern = defaults.warningSoundPattern || 'warble';

        // Reset context fields
        resetData.batteryChemistry = context.batteryChemistry || formData.batteryChemistry;
        resetData.engineType = context.engineType || formData.engineType;

        // Update FormData with defaults (NOT saved yet - user can edit)
        updateFields(resetData);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Reset ${sensorConfig.displayName} to application defaults?`)) {
        performReset();
      }
    } else {
      Alert.alert(
        'Reset to Defaults?',
        `Reset ${sensorConfig.displayName} to application defaults? You can edit before saving.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: performReset },
        ]
      );
    }
  }, [selectedSensorType, selectedInstance, formData, presentation, metricPresentation, updateFields]);

  // Test alarm sound
  const handleTestSound = useCallback((soundPattern: string) => {
    if (soundPattern === 'none') return;
    // TODO: Integrate with MarineAudioAlertManager to play sound
    console.log(`Testing sound: ${soundPattern}`);
  }, []);

  // Close handler (already defined earlier with async save completion)

  // Get display unit and label from registry (using presentation system for units)
  const { unitSymbol, metricLabel } = useMemo(() => {
    if (requiresMetricSelection && formData.selectedMetric && sensorConfig?.alarmMetrics) {
      const metricInfo = sensorConfig.alarmMetrics.find(m => m.key === formData.selectedMetric);
      // Get unit from presentation system via category (SI values stored, presentation converts)
      const metricCategory = metricInfo?.category;
      let symbol = '';
      if (metricCategory === 'voltage') symbol = voltagePresentation.presentation?.symbol || 'V';
      else if (metricCategory === 'current') symbol = currentPresentation.presentation?.symbol || 'A';
      else if (metricCategory === 'temperature') symbol = temperaturePresentation.presentation?.symbol || '°C';
      else if (metricCategory === 'pressure') symbol = pressurePresentation.presentation?.symbol || 'kPa';
      else if (metricCategory === 'rpm') symbol = rpmPresentation.presentation?.symbol || 'RPM';
      else if (metricInfo?.key === 'soc') symbol = '%';  // SOC has no category (raw %)
      
      return {
        unitSymbol: symbol,
        metricLabel: metricInfo?.label || '',
      };
    }

    // Single-metric sensors: use registry displayName
    return {
      unitSymbol: presentation.isValid ? presentation.presentation?.symbol || '' : '',
      metricLabel: selectedSensorType ? sensorConfig?.displayName || selectedSensorType : '',
    };
  }, [requiresMetricSelection, formData.selectedMetric, sensorConfig, selectedSensorType, presentation, 
      voltagePresentation, currentPresentation, temperaturePresentation, pressurePresentation, rpmPresentation]);

  /**
   * Render sensor-specific configuration fields dynamically from registry
   * 
   * **Architecture:**
   * This function eliminates hardcoded sensor-specific UI logic by reading
   * field definitions from SensorConfigRegistry and rendering them generically.
   * 
   * **Before Refactoring (Hardcoded):**
   * ```tsx
   * {selectedSensorType === 'battery' && (
   *   <View>
   *     <Text>Battery Chemistry</Text>
   *     <Picker ... />
   *   </View>
   * )}
   * {selectedSensorType === 'engine' && (
   *   <View>
   *     <Text>Engine Type</Text>
   *     <Picker ... />
   *   </View>
   * )}
   * ```
   * 
   * **After Refactoring (Registry-Driven):**
   * ```tsx
   * {renderConfigFields()}
   * ```
   * 
   * **Supported Field Types:**
   * - `text`: String input (TextInput)
   * - `number`: Numeric input (TextInput with numeric keyboard)
   * - `picker`: Dropdown selection (PlatformPicker)
   * - `toggle`: Boolean switch (TODO: not yet implemented)
   * - `slider`: Range selector (TODO: not yet implemented)
   * 
   * **Hardware Integration:**
   * Fields with `readOnly: true` and `hardwareField` check sensor data first:
   * - If hardware provides value → Show read-only with "(Provided by sensor hardware)"
   * - If no hardware value → Show editable input
   * 
   * **Example - Battery Chemistry:**
   * ```typescript
   * // Registry definition:
   * {
   *   key: 'batteryChemistry',
   *   type: 'picker',
   *   readOnly: true,
   *   hardwareField: 'chemistry'
   * }
   * 
   * // If BMS provides chemistry → Read-only: "LiFePO4 (sensor provided)"
   * // If no BMS → Editable picker: [Lead Acid, AGM, Gel, LiFePO4, ...]
   * ```
   * 
   * **Extensibility:**
   * New sensors automatically render their fields without code changes:
   * 1. Add sensor to registry with fields array
   * 2. Fields render automatically in dialog
   * 3. No conditional logic needed in component
   * 
   * @returns React elements for all configured fields, or null if no sensor selected
   */
  const renderConfigFields = useCallback(() => {
    if (!selectedSensorType) return null;
    
    const sensorConfig = getSensorConfig(selectedSensorType);
    
    return sensorConfig.fields.map((field) => {
      // Check field dependencies - hide field if dependency not satisfied
      if (!shouldShowField(field, formData)) {
        return null;
      }
      
      // Check iostate and hardware value
      const sensorData = rawSensorData[selectedSensorType]?.[selectedInstance];
      const hardwareValue = field.hardwareField ? sensorData?.[field.hardwareField] : undefined;
      
      // Determine if field is read-only based on iostate
      const isReadOnly = 
        field.iostate === 'readOnly' || 
        (field.iostate === 'readOnlyIfValue' && hardwareValue !== undefined);
      
      // Use hardware value if available, otherwise use form data or default
      const currentValue = hardwareValue !== undefined ? hardwareValue : 
        (formData[field.key as keyof SensorFormData] ?? field.default);
      
      switch (field.type) {
        case 'text':
          return (
            <View key={field.key} style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={String(currentValue || '')}
                onChangeText={(text) => updateField(field.key, text)}
                placeholder={field.helpText}
                placeholderTextColor={theme.textSecondary}
                editable={!isReadOnly}
                accessibilityLabel={field.label}
                accessibilityHint={field.helpText}
                accessibilityRole="text"
                accessibilityState={{ disabled: isReadOnly }}
              />
              {field.helpText && (
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  {field.helpText}
                </Text>
              )}
              {isReadOnly && hardwareValue !== undefined && (
                <Text style={{ color: theme.primary, fontSize: 11, marginTop: 2, fontWeight: '500' }}>
                  ✓ Value from sensor hardware
                </Text>
              )}
            </View>
          );
          
        case 'number':
          return (
            <View key={field.key} style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                {field.label}
                {field.min !== undefined && field.max !== undefined && 
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {` (${field.min}-${field.max})`}
                  </Text>
                }
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={String(currentValue ?? '')}
                onChangeText={(text) => {
                  let num = parseFloat(text);
                  // Validate against min/max if defined
                  if (!isNaN(num)) {
                    if (field.min !== undefined && num < field.min) num = field.min;
                    if (field.max !== undefined && num > field.max) num = field.max;
                  }
                  updateField(field.key, isNaN(num) ? undefined : num);
                }}
                placeholder={field.helpText}
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                editable={!isReadOnly}
                accessibilityLabel={field.label}
                accessibilityHint={field.helpText}
                accessibilityRole="none"
                accessibilityState={{ disabled: isReadOnly }}
              />
              {field.helpText && (
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  {field.helpText}
                </Text>
              )}
              {isReadOnly && hardwareValue !== undefined && (
                <Text style={{ color: theme.primary, fontSize: 11, marginTop: 2, fontWeight: '500' }}>
                  ✓ Value from sensor hardware
                </Text>
              )}
            </View>
          );
          
        case 'picker':
          // Find default option if no value is set
          const defaultOption = field.options?.find(opt => opt.default)?.value;
          const pickerValue = String(currentValue ?? defaultOption ?? '');
          
          if (isReadOnly && hardwareValue !== undefined) {
            return (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
                <View style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.7 }]}>
                  <Text style={[styles.readonlyText, { color: theme.text }]}>
                    {field.options?.find(opt => opt.value === hardwareValue)?.label || hardwareValue}
                  </Text>
                </View>
                <Text style={{ color: theme.primary, fontSize: 11, marginTop: 2, fontWeight: '500' }}>
                  ✓ Value from sensor hardware
                </Text>
                {field.helpText && (
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                    {field.helpText}
                  </Text>
                )}
              </View>
            );
          }
          
          return (
            <View key={field.key} style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
              <PlatformPicker
                value={pickerValue}
                onValueChange={(value) => updateField(field.key, value)}
                items={field.options || []}
                accessibilityLabel={field.label}
                accessibilityHint={field.helpText}
              />
              {field.helpText && (
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  {field.helpText}
                </Text>
              )}
            </View>
          );
          
        default:
          return null;
      }
    });
    // NOTE: formData IS needed in dependencies because currentValue accesses it
    // Performance concern: This causes re-render on every keystroke
    // TODO: Optimize by extracting individual field components with React.memo
  }, [selectedSensorType, selectedInstance, formData, rawSensorData, theme, updateField]);

  // Render instance tabs
  const renderInstanceTabs = () => {
    if (instances.length <= 1) return null;

    return (
      <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <FlatList
          data={instances}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.instance.toString()}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item: inst }) => {
            const isSelected = inst.instance === selectedInstance;
            const displayName = inst.name || inst.location || `Instance ${inst.instance}`;

            return (
              <TouchableOpacity
                style={[
                  styles.tab,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => handleInstanceSwitch(inst.instance)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: isSelected ? theme.textInverse : theme.text }]}>
                  {displayName}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // Get responsive layout breakpoints
  const { width } = useWindowDimensions();
  const isNarrow = width < 600; // Mobile
  const isTablet = width >= 600 && width < 1024; // Tablet
  const isWide = width >= 1024; // Desktop/Web

  return (
    <BaseConfigDialog
      visible={visible}
      title="Sensor Configuration"
      onClose={handleClose}
      testID="sensor-config-dialog"
    >
          {/* No sensors detected */}
          {availableSensorTypes.length === 0 && (
            <View style={styles.emptyState}>
              <UniversalIcon name="alert-circle-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.text }]}>No Sensors Detected</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Sensor configuration will be available once NMEA sensor data is received
              </Text>
            </View>
          )}

          {/* Sensor selection and configuration */}
          {availableSensorTypes.length > 0 && (
            <>
              {/* Sensor Type Picker */}
                <View style={[styles.field, { marginTop: 20, marginBottom: 0, zIndex: 200, elevation: 200 }]}>
                <PlatformPicker
                  label=""
                  value={selectedSensorType || availableSensorTypes[0] || ''}
                  onValueChange={(value) => handleSensorTypeSwitch(String(value))}
                  items={availableSensorTypes.map((type) => ({
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                  value: type,
                  }))}
                />
                </View>

              {/* Instance tabs */}
              {renderInstanceTabs()}

              {/* Configuration form */}
              {selectedSensorType && instances.length > 0 && (
                <>
                  {/* Dynamic fields from registry */}
                  <View style={{ marginTop: 16 }}>
                    {renderConfigFields()}
                  </View>

                  {/* No alarms message */}
                  {!supportsAlarms && (
                    <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        ℹ️ {selectedSensorType?.charAt(0).toUpperCase()}{selectedSensorType?.slice(1)} sensors provide informational data only. No alarm thresholds are needed.
                      </Text>
                    </View>
                  )}

                  {/* Alarm Configuration */}
                  {supportsAlarms && (
                    <>
                      {/* Alarms Toggle - Inline */}
                      <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Alarms</Text>
                        <PlatformToggle
                          value={formData.enabled}
                          onValueChange={handleEnabledChange}
                          label=""
                        />
                      </View>

                      {/* Alarm Configuration (shown when enabled) */}
                      {formData.enabled && (
                        <View style={[styles.alarmRowsContainer, { backgroundColor: `${theme.surface}88`, borderColor: theme.border }]}>
                          {/* Metric Selection (multi-metric sensors only) */}
                          {requiresMetricSelection && sensorConfig?.alarmMetrics && (
                            <View style={[styles.field, styles.metricPickerField, { marginBottom: 12 }]}>
                              <Text style={[styles.label, { color: theme.text }]}>Metric</Text>
                              <PlatformPicker
                                value={formData.selectedMetric || ''}
                                onValueChange={(value) => handleMetricChange(String(value))}
                                items={sensorConfig.alarmMetrics.map((m) => {
                                  // Get unit from presentation system via category
                                  let unit = '';
                                  if (m.category === 'voltage') unit = voltagePresentation.presentation?.symbol || 'V';
                                  else if (m.category === 'current') unit = currentPresentation.presentation?.symbol || 'A';
                                  else if (m.category === 'temperature') unit = temperaturePresentation.presentation?.symbol || '°C';
                                  else if (m.category === 'pressure') unit = pressurePresentation.presentation?.symbol || 'kPa';
                                  else if (m.category === 'rpm') unit = rpmPresentation.presentation?.symbol || 'RPM';
                                  else if (m.key === 'soc') unit = '%';
                                  
                                  return {
                                    label: `${m.label}${unit ? ` (${unit})` : ''}`,
                                    value: m.key,
                                  };
                                })}
                              />
                            </View>
                          )}

                          {/* Alarm Thresholds - Combined Multi-Slider */}
                          <View>
                            <View style={[styles.alarmRow, { borderColor: theme.border, paddingBottom: 16 }]}>
                              {/* Threshold Labels */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.error }} />
                                  <Text style={[styles.alarmRowTitle, { color: theme.error }]}>
                                    Critical: {((metricPresentation as any).formatSpec?.decimals !== undefined
                                      ? (formData.criticalValue || 0).toFixed((metricPresentation as any).formatSpec.decimals)
                                      : (formData.criticalValue || 0).toFixed(1))}{unitSymbol}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.warning }} />
                                  <Text style={[styles.alarmRowTitle, { color: theme.warning }]}>
                                    Warning: {((metricPresentation as any).formatSpec?.decimals !== undefined
                                      ? (formData.warningValue || 0).toFixed((metricPresentation as any).formatSpec.decimals)
                                      : (formData.warningValue || 0).toFixed(1))}{unitSymbol}
                                  </Text>
                                </View>
                              </View>

                              {/* Range Slider */}
                              <View style={{ alignItems: 'center', paddingHorizontal: 8, width: isNarrow ? 280 : 400 }}>
                                <RangeSlider
                                  style={{ width: '100%', height: 40 }}
                                  min={(currentMetricThresholds as any).min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0}
                                  max={(currentMetricThresholds as any).max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100}
                                  step={Math.pow(10, -((metricPresentation as any).formatSpec?.decimals ?? 1))}
                                  low={alarmDirection === 'above' ? (formData.warningValue || 0) : (formData.criticalValue || 0)}
                                  high={alarmDirection === 'above' ? (formData.criticalValue || 0) : (formData.warningValue || 0)}
                                  onValueChanged={(low, high) => {
                                    if (alarmDirection === 'above') {
                                      // For 'above': warning < critical
                                      updateField('warningValue', low);
                                      updateField('criticalValue', high);
                                    } else {
                                      // For 'below': critical < warning
                                      updateField('criticalValue', low);
                                      updateField('warningValue', high);
                                    }
                                  }}
                                  renderThumb={(name) => (
                                    <View style={{
                                      height: 18,
                                      width: 18,
                                      borderRadius: 14,
                                      backgroundColor: (() => {
                                        // Left thumb (low value)
                                        if (name === 'low') {
                                          return alarmDirection === 'above' ? theme.warning : theme.error;
                                        }
                                        // Right thumb (high value)
                                        return alarmDirection === 'above' ? theme.error : theme.warning;
                                      })(),
                                      borderWidth: 3,
                                      borderColor: (() => {
                                        // Left thumb (low value)
                                        if (name === 'low') {
                                          return alarmDirection === 'above' ? theme.warning : theme.error;
                                        }
                                        // Right thumb (high value)
                                        return alarmDirection === 'above' ? theme.error : theme.warning;
                                      })(),
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 2 },
                                      shadowOpacity: 0.25,
                                      shadowRadius: 3.84,
                                      elevation: 5,
                                    }} />
                                  )}
                                  renderRail={() => {
                                    const min = (currentMetricThresholds as any).min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0;
                                    const max = (currentMetricThresholds as any).max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100;
                                    const range = max - min;
                                    
                                    // Get threshold values
                                    const warning = formData.warningValue ?? 0;
                                    const critical = formData.criticalValue ?? 0;
                                    
                                    // Calculate percentages for each zone
                                    // For 'above' direction: safe < warning < critical
                                    // For 'below' direction: critical < warning < safe
                                    let safePercent, warningPercent, criticalPercent;
                                    
                                    if (alarmDirection === 'above') {
                                      // Values increase left to right: [0%...warning...critical...100%]
                                      warningPercent = Math.max(0, Math.min(100, ((warning - min) / range) * 100));
                                      criticalPercent = Math.max(0, Math.min(100, ((critical - min) / range) * 100));
                                      safePercent = warningPercent;
                                      
                                      return (
                                        <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                                          {/* Safe zone (left - green) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: 0,
                                            width: `${safePercent}%`,
                                            height: 6,
                                            backgroundColor: theme.success || '#22C55E',
                                          }} />
                                          
                                          {/* Warning zone (middle - yellow/orange) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: `${warningPercent}%`,
                                            width: `${Math.max(0, criticalPercent - warningPercent)}%`,
                                            height: 6,
                                            backgroundColor: theme.warning || '#F59E0B',
                                          }} />
                                          
                                          {/* Critical zone (right - red) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: `${criticalPercent}%`,
                                            width: `${Math.max(0, 100 - criticalPercent)}%`,
                                            height: 6,
                                            backgroundColor: theme.error || '#EF4444',
                                          }} />
                                        </View>
                                      );
                                    } else {
                                      // 'below' direction: Values decrease left to right: [critical...warning...safe]
                                      criticalPercent = Math.max(0, Math.min(100, ((critical - min) / range) * 100));
                                      warningPercent = Math.max(0, Math.min(100, ((warning - min) / range) * 100));
                                      
                                      return (
                                        <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                                          {/* Critical zone (left - red) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: 0,
                                            width: `${criticalPercent}%`,
                                            height: 6,
                                            backgroundColor: theme.error || '#EF4444',
                                          }} />
                                          
                                          {/* Warning zone (middle - yellow/orange) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: `${criticalPercent}%`,
                                            width: `${Math.max(0, warningPercent - criticalPercent)}%`,
                                            height: 6,
                                            backgroundColor: theme.warning || '#F59E0B',
                                          }} />
                                          
                                          {/* Safe zone (right - green) */}
                                          <View style={{
                                            position: 'absolute',
                                            left: `${warningPercent}%`,
                                            width: `${Math.max(0, 100 - warningPercent)}%`,
                                            height: 6,
                                            backgroundColor: theme.success || '#22C55E',
                                          }} />
                                        </View>
                                      );
                                    }
                                  }}
                                  renderRailSelected={() => (
                                    // Make the selected rail transparent since we're showing zones in the base rail
                                    <View style={{ flex: 1, height: 6, backgroundColor: 'transparent' }} />
                                  )}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: isNarrow ? 280 : 400, marginTop: 8 }}>
                                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                    {((currentMetricThresholds as any).min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0).toFixed((metricPresentation as any).formatSpec?.decimals ?? 1)}{unitSymbol}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                                    {((currentMetricThresholds as any).max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100).toFixed((metricPresentation as any).formatSpec?.decimals ?? 1)}{unitSymbol}
                                  </Text>
                                </View>
                              </View>

                              {/* Sound Controls */}
                              {isNarrow ? (
                                // Mobile: Stacked sound controls
                                <View style={{ marginTop: 16, gap: 12 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ flex: 0, minWidth: 80, color: theme.error, fontWeight: '600' }}>Critical:</Text>
                                    <View style={{ flex: 1 }}>
                                      <PlatformPicker
                                        label=""
                                        value={formData.criticalSoundPattern || 'none'}
                                        onValueChange={(value) => updateField('criticalSoundPattern', String(value))}
                                        items={soundPatternItems}
                                      />
                                    </View>
                                    <TouchableOpacity
                                      style={[
                                        styles.alarmRowTestButton,
                                        { backgroundColor: theme.error, borderColor: theme.error },
                                        formData.criticalSoundPattern === 'none' && { opacity: 0.3 }
                                      ]}
                                      onPress={() => handleTestSound(formData.criticalSoundPattern || 'none')}
                                      disabled={formData.criticalSoundPattern === 'none'}
                                    >
                                      <UniversalIcon 
                                        name="volume-high-outline" 
                                        size={20} 
                                        color={formData.criticalSoundPattern === 'none' ? theme.textSecondary : '#FFFFFF'} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ flex: 0, minWidth: 80, color: theme.warning, fontWeight: '600' }}>Warning:</Text>
                                    <View style={{ flex: 1 }}>
                                      <PlatformPicker
                                        label=""
                                        value={formData.warningSoundPattern || 'none'}
                                        onValueChange={(value) => updateField('warningSoundPattern', String(value))}
                                        items={soundPatternItems}
                                      />
                                    </View>
                                    <TouchableOpacity
                                      style={[
                                        styles.alarmRowTestButton,
                                        { backgroundColor: theme.warning, borderColor: theme.warning },
                                        formData.warningSoundPattern === 'none' && { opacity: 0.3 }
                                      ]}
                                      onPress={() => handleTestSound(formData.warningSoundPattern || 'none')}
                                      disabled={formData.warningSoundPattern === 'none'}
                                    >
                                      <UniversalIcon 
                                        name="volume-high-outline" 
                                        size={20} 
                                        color={formData.warningSoundPattern === 'none' ? theme.textSecondary : '#FFFFFF'} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                // Desktop: Horizontal sound controls
                                <View style={{ marginTop: 16, flexDirection: 'row', gap: 16 }}>
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ minWidth: 80, color: theme.error, fontWeight: '600' }}>Critical:</Text>
                                    <View style={{ flex: 1 }}>
                                      <PlatformPicker
                                        label=""
                                        value={formData.criticalSoundPattern || 'none'}
                                        onValueChange={(value) => updateField('criticalSoundPattern', String(value))}
                                        items={soundPatternItems}
                                      />
                                    </View>
                                    <TouchableOpacity
                                      style={[
                                        styles.alarmRowTestButton,
                                        { backgroundColor: theme.error, borderColor: theme.error },
                                        formData.criticalSoundPattern === 'none' && { opacity: 0.3 }
                                      ]}
                                      onPress={() => handleTestSound(formData.criticalSoundPattern || 'none')}
                                      disabled={formData.criticalSoundPattern === 'none'}
                                    >
                                      <UniversalIcon 
                                        name="volume-high-outline" 
                                        size={20} 
                                        color={formData.criticalSoundPattern === 'none' ? theme.textSecondary : '#FFFFFF'} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ minWidth: 80, color: theme.warning, fontWeight: '600' }}>Warning:</Text>
                                    <View style={{ flex: 1 }}>
                                      <PlatformPicker
                                        label=""
                                        value={formData.warningSoundPattern || 'none'}
                                        onValueChange={(value) => updateField('warningSoundPattern', String(value))}
                                        items={soundPatternItems}
                                      />
                                    </View>
                                    <TouchableOpacity
                                      style={[
                                        styles.alarmRowTestButton,
                                        { backgroundColor: theme.warning, borderColor: theme.warning },
                                        formData.warningSoundPattern === 'none' && { opacity: 0.3 }
                                      ]}
                                      onPress={() => handleTestSound(formData.warningSoundPattern || 'none')}
                                      disabled={formData.warningSoundPattern === 'none'}
                                    >
                                      <UniversalIcon 
                                        name="volume-high-outline" 
                                        size={20} 
                                        color={formData.warningSoundPattern === 'none' ? theme.textSecondary : '#FFFFFF'} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {/* Master Reset Button - Global */}
                  {selectedSensorType && (
                    <TouchableOpacity
                      style={styles.resetButtonLink}
                      onPress={handleMasterReset}
                    >
                      <UniversalIcon name="refresh-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.resetButtonLinkText, { color: theme.textSecondary }]}>Reset to Defaults</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
    </BaseConfigDialog>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 17,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'sans-serif',
      marginTop: 8,
      textAlign: 'center',
    },
    tabContainer: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 8,
      paddingHorizontal: 0,
      marginTop: 20,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginRight: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      minHeight: 36,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: 'sans-serif',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 12,
    },
    field: {
      marginBottom: 12,
    },
    metricPickerField: {
      zIndex: 100,
      elevation: 100, // Android
    },
    alarmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 16,
      marginBottom: 0,
    },
    alarmHeaderLeft: {
      flex: 1,
    },
    alarmHeaderTitle: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    alarmHeaderHint: {
      fontSize: 13,
      fontFamily: 'sans-serif',
      lineHeight: 18,
    },
    alarmContent: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    alarmRowsContainer: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 12,
    },
    alarmRow: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    alarmRowHeader: {
      marginBottom: 8,
    },
    alarmRowTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    // Desktop/Tablet horizontal layout
    alarmRowControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    alarmRowSlider: {
      flex: 1,
    },
    alarmRowSound: {
      width: 140,
    },
    alarmRowTestButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Mobile stacked layout
    alarmRowMobile: {
      gap: 10,
    },
    alarmRowMobileThreshold: {
      width: '100%',
    },
    alarmRowMobileSoundControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 6,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: 'sans-serif',
      justifyContent: 'center',
    },
    readonlyText: {
      fontSize: 15,
      fontFamily: 'sans-serif',
    },
    infoBox: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      fontFamily: 'sans-serif',
      textAlign: 'center',
      lineHeight: 20,
    },
    resetButtonLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 6,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    resetButtonLinkText: {
      fontSize: 14,
      fontFamily: 'sans-serif',
    },
  });

export default SensorConfigDialog;
