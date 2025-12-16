/**
 * Sensor Configuration Dialog - Per-Instance Configuration (Refactored)
 *
 * Features:
 * - Sensor naming and context configuration
 * - Instance tab navigation for multi-instance sensors
 * - Alarm threshold configuration (warning + critical)
 * - Location-aware threshold defaults
 * - SI unit storage with presentation system conversion
 * - Real-time configuration updates to NMEA store
 * - Unified form state management with useFormState
 * - Reusable ThresholdEditor components
 * - Collapsible FormSection ONLY for conditional alarm configuration sections
 * 
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal/header/footer structure
 * - BaseConfigDialog provides: pageSheet Modal, close button, title (no action button for this dialog)
 * - Eliminates duplicate Modal boilerplate (~80 lines removed vs manual implementation)
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
import { useFormState } from '../../hooks/useFormState';
import { getAlarmDirection, getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../../utils/sensorDisplayName';
import { getSmartDefaults } from '../../registry/AlarmThresholdDefaults';
import { SOUND_PATTERNS } from '../../services/alarms/MarineAudioAlertManager';
import { SENSOR_CONFIG_REGISTRY, getSensorConfig } from '../../registry/SensorConfigRegistry';

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
 * - Auto-saves on field change with 300ms debounce
 * - Converts display units ↔ SI units using presentation system
 * - Persists to both NMEA store and sensor config store
 * 
 * **Limitations:**
 * - Requires at least one sensor instance to be available
 * - Chemistry/engine type dropdowns show only if not provided by hardware
 * - Threshold validation enforces warning < critical (or vice versa based on direction)
 * - Cannot configure sensors with 'no-alarms' type
 */
export interface SensorConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  sensorType?: SensorType;
}

// Sensor alarm capability classification
type SensorAlarmType = 'multi-metric' | 'single-metric' | 'no-alarms';

/**
 * Sensor Alarm Configuration Map
 * 
 * Defines alarm capabilities for each sensor type:
 * - **multi-metric**: Sensors with multiple alarm points (e.g., battery: voltage, current, SOC, temp)
 * - **single-metric**: Sensors with one alarm point (e.g., depth, wind, speed)
 * - **no-alarms**: Sensors without alarm support (e.g., compass, autopilot)
 * 
 * For multi-metric sensors, each metric includes:
 * - key: Internal identifier (camelCase)
 * - label: User-facing display name
 * - unit: SI unit for the metric
 * - category: DataCategory for presentation system (determines formatting/conversion)
 * 
 * **Usage Notes:**
 * - Metrics array defines the order of display in the dialog
 * - Each metric can have independent warning/critical thresholds
 * - Alarm direction (above/below) determined by sensorAlarmUtils
 */
const SENSOR_ALARM_CONFIG: Record<SensorType, {
  type: SensorAlarmType;
  metrics?: Array<{ key: string; label: string; unit: string; category?: DataCategory }>;
}> = {
  battery: {
    type: 'multi-metric',
    metrics: [
      { key: 'voltage', label: 'Voltage', unit: 'V', category: 'voltage' },
      { key: 'soc', label: 'State of Charge', unit: '%' },
      { key: 'temperature', label: 'Temperature', unit: '°C', category: 'temperature' },
      { key: 'current', label: 'Current', unit: 'A', category: 'current' },
    ],
  },
  engine: {
    type: 'multi-metric',
    metrics: [
      { key: 'coolantTemp', label: 'Coolant Temperature', unit: '°C', category: 'temperature' },
      { key: 'oilPressure', label: 'Oil Pressure', unit: 'Pa', category: 'pressure' },
      { key: 'rpm', label: 'RPM', unit: 'RPM', category: 'rpm' },
    ],
  },
  gps: {
    type: 'multi-metric',
    metrics: [
      { key: 'speedOverGround', label: 'Speed Over Ground (SOG)', unit: 'kts', category: 'speed' },
    ],
  },
  depth: { type: 'single-metric' },
  tank: { type: 'single-metric' },
  wind: { type: 'single-metric' },
  speed: { type: 'single-metric' },
  temperature: { type: 'single-metric' },
  compass: { type: 'no-alarms' },
  autopilot: { type: 'no-alarms' },
  navigation: { type: 'no-alarms' },
};

// Map sensor types to presentation categories
const sensorToCategory: Record<SensorType, DataCategory | null> = {
  depth: 'depth',
  speed: 'speed',
  wind: 'wind',
  temperature: 'temperature',
  engine: 'temperature',
  battery: 'voltage',
  tank: null,
  gps: 'coordinates',
  compass: 'angle',
  autopilot: null,
  navigation: null,
};

/**
 * Get metric-specific presentation for unit conversion
 * Eliminates code duplication across save/load logic
 */
function getMetricPresentation(
  metricKey: string | undefined,
  alarmConfig: typeof SENSOR_ALARM_CONFIG[SensorType] | null,
  presentation: any,
  voltagePresentation: any,
  temperaturePresentation: any,
  currentPresentation: any,
  pressurePresentation: any,
  rpmPresentation: any,
  speedPresentation: any
): any {
  if (!metricKey || !alarmConfig?.metrics) return presentation;
  
  const metricInfo = alarmConfig.metrics.find(m => m.key === metricKey);
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

  // Update selected instance when instances change
  useEffect(() => {
    if (instances.length > 0 && !instances.find(i => i.instance === selectedInstance)) {
      setSelectedInstance(instances[0].instance);
    }
  }, [instances, selectedInstance]);

  // Get presentation for selected sensor
  const category = selectedSensorType ? sensorToCategory[selectedSensorType] : null;
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

  // Get alarm configuration
  const alarmConfig = selectedSensorType ? SENSOR_ALARM_CONFIG[selectedSensorType] : null;
  const requiresMetricSelection = alarmConfig?.type === 'multi-metric';
  const supportsAlarms = alarmConfig?.type !== 'no-alarms';
  
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
    const sensorData = rawSensorData.battery?.[selectedInstance] as any;
    return sensorData?.chemistry;
  }, [selectedSensorType, selectedInstance, rawSensorData]);

  // Initialize form data
  const initialFormData: SensorFormData = useMemo(() => {
    const currentSensorData = selectedSensorType ? rawSensorData[selectedSensorType]?.[selectedInstance] : undefined;
    const displayName = selectedSensorType
      ? getSensorDisplayName(selectedSensorType, selectedInstance, currentThresholds, currentSensorData?.name)
      : '';

    return {
      name: displayName,
      enabled: currentThresholds.enabled || false,
      batteryChemistry: (currentThresholds.context?.batteryChemistry as any) || 'lead-acid',
      engineType: (currentThresholds.context?.engineType as any) || 'diesel',
      selectedMetric: requiresMetricSelection && alarmConfig?.metrics?.[0]?.key || '',
      criticalValue: currentThresholds.critical !== undefined && presentation.isValid
        ? presentation.convert(currentThresholds.critical)
        : undefined,
      warningValue: currentThresholds.warning !== undefined && presentation.isValid
        ? presentation.convert(currentThresholds.warning)
        : undefined,
      criticalSoundPattern: currentThresholds.criticalSoundPattern || 'rapid_pulse',
      warningSoundPattern: currentThresholds.warningSoundPattern || 'warble',
    };
  }, [selectedSensorType, selectedInstance, currentThresholds, presentation, requiresMetricSelection, alarmConfig, rawSensorData]);

  // Form state - simple useState, no auto-save
  const [formData, setFormData] = useState<SensorFormData>(initialFormData);
  
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
   * Explicit save function - saves current FormData to stores
   * Called only on explicit transitions: instance switch, sensor switch, dialog close
   * 
   * Writes to NMEA store FIRST (immediate, widgets see changes)
   * Then AsyncStorage in background (persistence for next launch)
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

    // Add context
    if (selectedSensorType === 'battery' && !sensorProvidedChemistry) {
      updates.context = { batteryChemistry: formData.batteryChemistry as any };
    } else if (selectedSensorType === 'engine') {
      updates.context = { engineType: formData.engineType as any };
    }

    // Convert thresholds back to SI units
    if (requiresMetricSelection && formData.selectedMetric) {
      // Use shared helper to get metric-specific presentation
      const metricPres = getMetricPresentation(
        formData.selectedMetric,
        alarmConfig,
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
  }, [selectedSensorType, selectedInstance, formData, presentation, requiresMetricSelection, currentThresholds, setConfig, updateSensorThresholds, sensorProvidedChemistry, alarmConfig, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation]);
  
  // Get alarm direction for validation
  const alarmDirection = useMemo(() => {
    if (!selectedSensorType) return undefined;
    const metric = requiresMetricSelection ? formData.selectedMetric : undefined;
    return getAlarmDirection(selectedSensorType, metric).direction;
  }, [selectedSensorType, requiresMetricSelection, formData.selectedMetric]);

  // Load instance data when sensor type or instance changes
  useEffect(() => {
    if (selectedSensorType && selectedInstance !== undefined) {
      setFormData(initialFormData);
    }
  }, [selectedSensorType, selectedInstance, initialFormData]);

  // Ensure selectedMetric defaults to first metric for multi-metric sensors
  useEffect(() => {
    if (requiresMetricSelection && alarmConfig?.metrics && (!formData.selectedMetric || formData.selectedMetric === '')) {
      const firstMetric = alarmConfig.metrics[0]?.key;
      if (firstMetric) {
        updateField('selectedMetric', firstMetric);
      }
    }
  }, [requiresMetricSelection, alarmConfig, formData.selectedMetric, updateField]);

  // Handle metric switching - load thresholds for selected metric
  useEffect(() => {
    if (formData.selectedMetric) {
      
      if (requiresMetricSelection && formData.selectedMetric && currentThresholds.metrics) {
        const metricConfig = currentThresholds.metrics[formData.selectedMetric];
        
        // Get metric-specific presentation using shared helper
        const metricPres = getMetricPresentation(
          formData.selectedMetric,
          alarmConfig,
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
          const defaults = getSmartDefaults(selectedSensorType, currentThresholds.context);

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
  }, [formData.selectedMetric, requiresMetricSelection, currentThresholds.metrics, alarmConfig, selectedSensorType, currentThresholds.context, presentation, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation, updateFields]);

  /**
   * Get metric-specific presentation for multi-metric sensors
   * 
   * Maps the currently selected metric's category to the appropriate pre-called presentation hook.
   * Returns default presentation for single-metric sensors or when no metric is selected.
   * 
   * **Why this approach:**
   * - Cannot call useDataPresentation() conditionally (violates React Rules of Hooks)
   * - Pre-call all needed presentations at top level, then select in this memo
   * - Category map only includes categories actually used by SENSOR_ALARM_CONFIG
   */
  const metricPresentation = useMemo(() => {
    if (!requiresMetricSelection || !formData.selectedMetric || !alarmConfig?.metrics) {
      return presentation;
    }
    
    const metricInfo = alarmConfig.metrics.find(m => m.key === formData.selectedMetric);
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
  }, [requiresMetricSelection, formData.selectedMetric, alarmConfig, presentation, voltagePresentation, temperaturePresentation, currentPresentation, pressurePresentation, rpmPresentation, speedPresentation]);

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
      const context: any = {};
      if (selectedSensorType === 'battery') {
        context.batteryChemistry = sensorProvidedChemistry || formData.batteryChemistry || 'lead-acid';
      } else if (selectedSensorType === 'engine') {
        context.engineType = formData.engineType || 'diesel';
      }

      // Get defaults from registry
      const defaults = sensorConfig.getDefaults?.(context) || getSmartDefaults(selectedSensorType, context);

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
  }, [selectedSensorType, selectedInstance, formData, sensorProvidedChemistry, presentation, metricPresentation, updateFields]);

  // Test alarm sound
  const handleTestSound = useCallback((soundPattern: string) => {
    if (soundPattern === 'none') return;
    // TODO: Integrate with MarineAudioAlertManager to play sound
    console.log(`Testing sound: ${soundPattern}`);
  }, []);

  // Close handler (already defined earlier with async save completion)

  // Get display unit and label
  const { unitSymbol, metricLabel } = useMemo(() => {
    if (requiresMetricSelection && formData.selectedMetric && alarmConfig?.metrics) {
      const metricInfo = alarmConfig.metrics.find(m => m.key === formData.selectedMetric);
      return {
        unitSymbol: metricInfo?.unit || '',
        metricLabel: metricInfo?.label || '',
      };
    }

    const labels: Record<string, string> = {
      depth: 'Depth',
      tank: 'Tank Level',
      wind: 'Wind Speed',
      speed: 'Speed',
      temperature: 'Temperature',
    };

    return {
      unitSymbol: presentation.isValid ? presentation.presentation?.symbol || '' : '',
      metricLabel: selectedSensorType ? labels[selectedSensorType] || selectedSensorType : '',
    };
  }, [requiresMetricSelection, formData.selectedMetric, alarmConfig, selectedSensorType, presentation]);

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
                    <View style={[styles.field, { marginTop: 16 }]}>
                    <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={formData.name}
                      onChangeText={(text: string) => updateField('name', text)}
                      placeholder="e.g., House Battery"
                      placeholderTextColor={theme.textSecondary}
                      key={`${selectedSensorType}-${selectedInstance}`}
                    />
                    </View>

                  {/* Battery Chemistry */}
                  {selectedSensorType === 'battery' && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: theme.text }]}>Chemistry</Text>
                      {sensorProvidedChemistry ? (
                        <View style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.6 }]}>
                          <Text style={[styles.readonlyText, { color: theme.textSecondary }]}>
                            {sensorProvidedChemistry} (sensor provided)
                          </Text>
                        </View>
                      ) : (
                        <PlatformPicker
                          value={formData.batteryChemistry || 'lead-acid'}
                          onValueChange={(value) => updateField('batteryChemistry', value as any)}
                          items={[
                            { label: 'Lead Acid', value: 'lead-acid' },
                            { label: 'AGM', value: 'agm' },
                            { label: 'LiFePO4', value: 'lifepo4' },
                          ]}
                        />
                      )}
                    </View>
                  )}

                  {/* Engine Type */}
                  {selectedSensorType === 'engine' && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: theme.text }]}>Engine Type</Text>
                      <PlatformPicker
                        value={formData.engineType || 'diesel'}
                        onValueChange={(value) => updateField('engineType', value as any)}
                        items={[
                          { label: 'Diesel', value: 'diesel' },
                          { label: 'Gasoline', value: 'gasoline' },
                          { label: 'Outboard', value: 'outboard' },
                        ]}
                      />
                    </View>
                  )}

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
                          {requiresMetricSelection && alarmConfig?.metrics && (
                            <View style={[styles.field, styles.metricPickerField, { marginBottom: 12 }]}>
                              <Text style={[styles.label, { color: theme.text }]}>Metric</Text>
                              <PlatformPicker
                                value={formData.selectedMetric || ''}
                                onValueChange={(value) => handleMetricChange(String(value))}
                                items={alarmConfig.metrics.map((m) => ({
                                  label: `${m.label} (${m.unit})`,
                                  value: m.key,
                                }))}
                              />
                            </View>
                          )}

                          {/* Alarm Rows - Critical and Warning */}
                          <View>
                            {/* Critical Row */}
                            <View style={[styles.alarmRow, { borderColor: theme.border }]}>
                              <View style={styles.alarmRowHeader}>
                                <Text style={[styles.alarmRowTitle, { color: theme.error }]}>
                                  Critical: {((metricPresentation as any).formatSpec?.decimals !== undefined
                                    ? (formData.criticalValue || 0).toFixed((metricPresentation as any).formatSpec.decimals)
                                    : (formData.criticalValue || 0).toFixed(1))}{unitSymbol}
                                </Text>
                              </View>
                            {isNarrow ? (
                              // Mobile: Stacked layout
                              <View style={styles.alarmRowMobile}>
                                <View style={styles.alarmRowMobileThreshold}>
                                  <Slider
                                    style={{ width: '100%', height: 40 }}
                                    value={formData.criticalValue || 0}
                                    minimumValue={
                                      alarmDirection === 'below' 
                                        ? (formData.warningValue || 0)
                                        : ((metricPresentation as any).formatSpec?.rangeSpec?.min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0)
                                    }
                                    maximumValue={
                                      alarmDirection === 'above'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100)
                                        : (formData.warningValue || 100)
                                    }
                                    step={0.1}
                                    onValueChange={(value) => updateField('criticalValue', value)}
                                    minimumTrackTintColor={theme.error}
                                    maximumTrackTintColor={theme.border}
                                    thumbTintColor={theme.error}
                                    testID="critical-threshold"
                                  />
                                </View>
                                <View style={styles.alarmRowMobileSoundControls}>
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
                              </View>
                            ) : (
                              // Tablet/Desktop: Horizontal layout
                              <View style={styles.alarmRowControls}>
                                <View style={styles.alarmRowSlider}>
                                  <Slider
                                    style={{ width: '100%', height: 40 }}
                                    value={formData.criticalValue || 0}
                                    minimumValue={
                                      alarmDirection === 'below' 
                                        ? (formData.warningValue || 0)
                                        : ((metricPresentation as any).formatSpec?.rangeSpec?.min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0)
                                    }
                                    maximumValue={
                                      alarmDirection === 'above'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100)
                                        : (formData.warningValue || 100)
                                    }
                                    step={0.1}
                                    onValueChange={(value) => updateField('criticalValue', value)}
                                    minimumTrackTintColor={theme.error}
                                    maximumTrackTintColor={theme.border}
                                    thumbTintColor={theme.error}
                                    testID="critical-threshold"
                                  />
                                </View>
                                <View style={[styles.alarmRowSound, isWide && { width: 180 }]}>
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
                                    color={formData.criticalSoundPattern === 'none' ? theme.textSecondary : theme.background} 
                                  />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>

                            {/* Warning Row - Always shown */}
                            <View style={[styles.alarmRow, { borderColor: theme.border, marginBottom: 0, borderBottomWidth: 0 }]}>
                              <View style={styles.alarmRowHeader}>
                                <Text style={[styles.alarmRowTitle, { color: theme.warning }]}>
                                  Warning: {((metricPresentation as any).formatSpec?.decimals !== undefined
                                    ? (formData.warningValue || 0).toFixed((metricPresentation as any).formatSpec.decimals)
                                    : (formData.warningValue || 0).toFixed(1))}{unitSymbol}
                                </Text>
                              </View>
                            {isNarrow ? (
                              // Mobile: Stacked layout
                              <View style={styles.alarmRowMobile}>
                                <View style={styles.alarmRowMobileThreshold}>
                                  <Slider
                                    style={{ width: '100%', height: 40 }}
                                    value={formData.warningValue || 0}
                                    minimumValue={
                                      alarmDirection === 'above'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0)
                                        : (formData.criticalValue || 0)
                                    }
                                    maximumValue={
                                      alarmDirection === 'below'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100)
                                        : (formData.criticalValue || 100)
                                    }
                                    step={0.1}
                                    onValueChange={(value) => updateField('warningValue', value)}
                                    minimumTrackTintColor={theme.warning}
                                    maximumTrackTintColor={theme.border}
                                    thumbTintColor={theme.warning}
                                    testID="warning-threshold"
                                  />
                                </View>
                                <View style={styles.alarmRowMobileSoundControls}>
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
                              // Tablet/Desktop: Horizontal layout
                              <View style={styles.alarmRowControls}>
                                <View style={styles.alarmRowSlider}>
                                  <Slider
                                    style={{ width: '100%', height: 40 }}
                                    value={formData.warningValue || 0}
                                    minimumValue={
                                      alarmDirection === 'above'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.min ?? (metricPresentation as any).formatSpec?.testCases?.min ?? 0)
                                        : (formData.criticalValue || 0)
                                    }
                                    maximumValue={
                                      alarmDirection === 'below'
                                        ? ((metricPresentation as any).formatSpec?.rangeSpec?.max ?? (metricPresentation as any).formatSpec?.testCases?.max ?? 100)
                                        : (formData.criticalValue || 100)
                                    }
                                    step={0.1}
                                    onValueChange={(value) => updateField('warningValue', value)}
                                    minimumTrackTintColor={theme.warning}
                                    maximumTrackTintColor={theme.border}
                                    thumbTintColor={theme.warning}
                                    testID="warning-threshold"
                                  />
                                </View>
                                <View style={[styles.alarmRowSound, isWide && { width: 180 }]}>
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
