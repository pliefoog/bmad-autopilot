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
} from 'react-native';
import { z } from 'zod';
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
import { FormSection } from './components/FormSection';
import { useFormState } from '../../hooks/useFormState';
import { getAlarmDirection, getAlarmTriggerHint } from '../../utils/sensorAlarmUtils';
import { getSensorDisplayName } from '../../utils/sensorDisplayName';
import { getSmartDefaults } from '../../registry/AlarmThresholdDefaults';
import { SOUND_PATTERNS } from '../../services/alarms/MarineAudioAlertManager';

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

interface SensorInstance {
  instance: number;
  name?: string;
  location?: string;
  lastUpdate?: number;
}

// Zod schema for form validation
const sensorFormSchema = z.object({
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
  // Validate warning < critical for 'above' direction
  if (data.warningValue !== undefined && data.criticalValue !== undefined) {
    // Direction-aware validation will be handled by ThresholdEditor
    return true;
  }
  return true;
}, {
  message: 'Invalid threshold configuration',
});

type SensorFormData = z.infer<typeof sensorFormSchema>;

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
  
  // Memoize sound pattern picker items (avoid re-mapping on every render)
  const soundPatternItems = useMemo(
    () => SOUND_PATTERNS.map((p) => ({ label: p.label, value: p.value })),
    []
  );

  // Get current thresholds
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

  /**
   * Save handler - persists form data to stores
   * 
   * Converts display units → SI units, updates sensor name/enabled/sound patterns,
   * saves battery chemistry or engine type context, and writes to both NMEA store
   * and sensor config store.
   */
  const handleSave = useCallback(async (data: SensorFormData) => {
    if (!selectedSensorType) return;

    const updates: Partial<SensorAlarmThresholds> = {
      name: data.name?.trim() || undefined,
      enabled: data.enabled,
      direction: getAlarmDirection(selectedSensorType).direction,
      criticalSoundPattern: data.criticalSoundPattern,
      warningSoundPattern: data.warningSoundPattern,
    };

    // Add context
    if (selectedSensorType === 'battery' && !sensorProvidedChemistry) {
      updates.context = { batteryChemistry: data.batteryChemistry as any };
    } else if (selectedSensorType === 'engine') {
      updates.context = { engineType: data.engineType as any };
    }

    // Convert thresholds back to SI units
    if (requiresMetricSelection && data.selectedMetric) {
      updates.metrics = { ...currentThresholds.metrics };
      updates.metrics[data.selectedMetric] = {
        enabled: true,
        direction: getAlarmDirection(selectedSensorType, data.selectedMetric).direction,
        critical: data.criticalValue !== undefined ? presentation.convertBack(data.criticalValue) : undefined,
        warning: data.warningValue !== undefined ? presentation.convertBack(data.warningValue) : undefined,
        criticalSoundPattern: data.criticalSoundPattern,
        warningSoundPattern: data.warningSoundPattern,
      };
    } else {
      if (data.criticalValue !== undefined && presentation.isValid) {
        updates.critical = presentation.convertBack(data.criticalValue);
      }
      if (data.warningValue !== undefined && presentation.isValid) {
        updates.warning = presentation.convertBack(data.warningValue);
      }
    }

    // Save to stores
    setConfig(selectedSensorType, selectedInstance, updates);
    updateSensorThresholds(selectedSensorType, selectedInstance, updates);
  }, [selectedSensorType, selectedInstance, presentation, requiresMetricSelection, currentThresholds, setConfig, updateSensorThresholds, sensorProvidedChemistry]);

  // Form state management
  const {
    formData,
    updateField,
    updateFields,
    saveNow,
    isDirty,
  } = useFormState<SensorFormData>(initialFormData, {
    onSave: handleSave,
    debounceMs: 300,
    validationSchema: sensorFormSchema,
  });

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
   * Saves current form before switching to avoid data loss.
   */
  const handleInstanceSwitch = useCallback((newInstance: number) => {
    saveNow();
    setSelectedInstance(newInstance);
  }, [saveNow]);

  /**
   * Handle sensor type switch (e.g., Battery → Engine)
   * Saves current form, switches sensor type, and resets to first available instance.
   */
  const handleSensorTypeSwitch = useCallback((value: string) => {
    if (value && value !== '') {
      saveNow();
      setSelectedSensorType(value as SensorType);
      const newInstances = getSensorInstances(value as SensorType);
      setSelectedInstance(newInstances.length > 0 ? newInstances[0].instance : 0);
    }
  }, [saveNow, getSensorInstances]);

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

  // Initialize defaults
  const handleInitializeDefaults = useCallback(() => {
    if (!selectedSensorType) return;

    const context: any = {};
    if (selectedSensorType === 'battery') {
      context.batteryChemistry = sensorProvidedChemistry || formData.batteryChemistry;
    } else if (selectedSensorType === 'engine') {
      context.engineType = formData.engineType;
    }

    const instance = instances.find(i => i.instance === selectedInstance);
    const defaults = getSmartDefaults(selectedSensorType, context, instance?.location);

    if (!defaults) return;

    updateSensorThresholds(selectedSensorType, selectedInstance, {
      ...defaults,
      lastModified: Date.now(),
    });

    if (Object.keys(context).length > 0) {
      setConfig(selectedSensorType, selectedInstance, { context });
    }

    // Reload form with defaults
    const newFormData: Partial<SensorFormData> = {
      criticalValue: defaults.critical !== undefined && presentation.isValid
        ? presentation.convert(defaults.critical)
        : undefined,
      warningValue: defaults.warning !== undefined && presentation.isValid
        ? presentation.convert(defaults.warning)
        : undefined,
      criticalSoundPattern: defaults.criticalSoundPattern || 'rapid_pulse',
      warningSoundPattern: defaults.warningSoundPattern || 'warble',
    };

    updateFields(newFormData);
  }, [selectedSensorType, selectedInstance, instances, formData, sensorProvidedChemistry, presentation, updateSensorThresholds, setConfig, updateFields]);

  // Close handler
  const handleClose = useCallback(() => {
    saveNow();
    onClose();
  }, [saveNow, onClose]);

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
                Alarm configuration will be available once NMEA sensor data is received
              </Text>
            </View>
          )}

          {/* Sensor selection and configuration */}
          {availableSensorTypes.length > 0 && (
            <>
              {/* Sensor Type Picker */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Sensor Selection</Text>
              <View style={styles.field}>
                <PlatformPicker
                  label="Sensor Type"
                  value={selectedSensorType || ''}
                  onValueChange={(value) => handleSensorTypeSwitch(String(value))}
                  items={[
                    { label: 'Select a sensor...', value: '' },
                    ...availableSensorTypes.map((type) => ({
                      label: type.charAt(0).toUpperCase() + type.slice(1),
                      value: type,
                    })),
                  ]}
                  placeholder="Select a sensor..."
                />
              </View>

              {/* Instance tabs */}
              {renderInstanceTabs()}

              {/* Configuration form */}
              {selectedSensorType && instances.length > 0 && (
                <>
                  {/* Basic Information */}
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Basic Information</Text>
                  
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={formData.name}
                      onChangeText={(text: string) => updateField('name', text)}
                      onBlur={saveNow}
                      placeholder="e.g., House Battery"
                      placeholderTextColor={theme.textSecondary}
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
                    <FormSection
                      sectionId="alarm-config"
                      dialogId="sensor-config"
                      title="Alarm Configuration"
                      subtitle={formData.enabled ? getAlarmTriggerHint(selectedSensorType) : undefined}
                      defaultCollapsed={false}
                    >
                      {/* Enable/Disable Toggle */}
                      <PlatformToggle
                        value={formData.enabled}
                        onValueChange={handleEnabledChange}
                        label="Enable Alarms"
                      />

                      {/* All alarm configuration controls (shown when enabled) */}
                      {formData.enabled && (
                        <>
                          {/* Metric Selection */}
                          {requiresMetricSelection && alarmConfig?.metrics && (
                            <View style={[styles.field, { marginTop: 20 }]}>
                              <Text style={[styles.label, { color: theme.text }]}>Alarm Metric</Text>
                              <PlatformPicker
                                label="Metric"
                                value={formData.selectedMetric || ''}
                                onValueChange={(value) => updateField('selectedMetric', String(value))}
                                items={alarmConfig.metrics.map((m) => ({
                                  label: `${m.label} (${m.unit})`,
                                  value: m.key,
                                }))}
                              />
                            </View>
                          )}

                          {/* Threshold Configuration */}
                          <View style={[styles.subsectionHeader, { marginTop: 24 }]}>
                            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
                              Thresholds - {metricLabel}
                            </Text>
                          </View>

                          {/* Critical Threshold */}
                          <ThresholdEditor
                            label={`Critical ${metricLabel}`}
                            value={formData.criticalValue || 0}
                            direction={getAlarmDirection(selectedSensorType, formData.selectedMetric).direction}
                            formatSpec={(metricPresentation as any).formatSpec || { decimals: 1, testCases: { min: 0, max: 100 } }}
                            minValue={(metricPresentation as any).formatSpec?.testCases.min}
                            maxValue={(metricPresentation as any).formatSpec?.testCases.max}
                            otherThreshold={formData.warningValue}
                            unitSymbol={unitSymbol}
                            onChange={(value) => updateField('criticalValue', value)}
                            onBlur={saveNow}
                            testID="critical-threshold"
                          />

                          {/* Warning Threshold */}
                          <ThresholdEditor
                            label={`Warning ${metricLabel}`}
                            value={formData.warningValue || 0}
                            direction={getAlarmDirection(selectedSensorType, formData.selectedMetric).direction}
                            formatSpec={(metricPresentation as any).formatSpec || { decimals: 1, testCases: { min: 0, max: 100 } }}
                            minValue={(metricPresentation as any).formatSpec?.testCases.min}
                            maxValue={(metricPresentation as any).formatSpec?.testCases.max}
                            otherThreshold={formData.criticalValue}
                            unitSymbol={unitSymbol}
                            onChange={(value) => updateField('warningValue', value)}
                            onBlur={saveNow}
                            testID="warning-threshold"
                          />

                          {/* Sound Configuration */}
                          <View style={[styles.subsectionHeader, { marginTop: 24 }]}>
                            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
                              Alarm Sounds
                            </Text>
                          </View>

                          <View style={styles.field}>
                            <Text style={[styles.label, { color: theme.text }]}>Critical Alarm Sound</Text>
                            <PlatformPicker
                              value={formData.criticalSoundPattern}
                              onValueChange={(value) => updateField('criticalSoundPattern', String(value))}
                              items={soundPatternItems}
                            />
                          </View>

                          <View style={styles.field}>
                            <Text style={[styles.label, { color: theme.text }]}>Warning Alarm Sound</Text>
                            <PlatformPicker
                              value={formData.warningSoundPattern}
                              onValueChange={(value) => updateField('warningSoundPattern', String(value))}
                              items={soundPatternItems}
                            />
                          </View>

                          {/* Reset Defaults Button */}
                          <TouchableOpacity
                            style={[styles.defaultsButton, { backgroundColor: theme.primary, marginTop: 20 }]}
                            onPress={handleInitializeDefaults}
                          >
                            <UniversalIcon name="refresh-outline" size={22} color={theme.background} />
                            <Text style={[styles.defaultsButtonText, { color: theme.background }]}>
                              Reset to Smart Defaults
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </FormSection>
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
      paddingVertical: 12,
      paddingHorizontal: 16,
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
    subsectionHeader: {
      marginBottom: 12,
    },
    subsectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 8,
    },
    input: {
      height: 44,
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
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 14,
      fontFamily: 'sans-serif',
      textAlign: 'center',
      lineHeight: 20,
    },
    defaultsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 10,
      marginVertical: 16,
      gap: 8,
    },
    defaultsButtonText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
  });

export default SensorConfigDialog;
