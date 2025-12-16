/**
 * Sensor Configuration Dialog - Per-Instance Configuration
 *
 * Features:
 * - Sensor naming and context configuration
 * - Instance tab navigation for multi-instance sensors
 * - Alarm threshold configuration (warning + critical)
 * - Location-aware threshold defaults
 * - SI unit storage with presentation system conversion
 * - Real-time configuration updates to NMEA store
 * - iOS-style modal with auto-save behavior
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { useSensorConfigStore } from '../../store/sensorConfigStore';
import { SensorType, SensorAlarmThresholds } from '../../types/SensorData';
import { logger } from '../../utils/logger';
import { useDataPresentation } from '../../presentation/useDataPresentation';
import { DataCategory } from '../../presentation/categories';

// Sensor alarm capability classification
type SensorAlarmType = 'multi-metric' | 'single-metric' | 'no-alarms';

const SENSOR_ALARM_CONFIG: Record<SensorType, {
  type: SensorAlarmType;
  metrics?: Array<{ key: string; label: string; unit: string }>;
}> = {
  // Multi-metric sensors - require metric selection
  battery: {
    type: 'multi-metric',
    metrics: [
      { key: 'voltage', label: 'Voltage', unit: 'V' },
      { key: 'soc', label: 'State of Charge', unit: '%' },
      { key: 'temperature', label: 'Temperature', unit: '°C' },
      { key: 'current', label: 'Current', unit: 'A' },
    ],
  },
  engine: {
    type: 'multi-metric',
    metrics: [
      { key: 'coolantTemp', label: 'Coolant Temperature', unit: '°C' },
      { key: 'oilPressure', label: 'Oil Pressure', unit: 'Pa' },
      { key: 'rpm', label: 'RPM', unit: 'RPM' },
    ],
  },
  // Single-metric sensors - one alarm per instance
  depth: { type: 'single-metric' },
  tank: { type: 'single-metric' },
  wind: { type: 'single-metric' },
  speed: { type: 'single-metric' }, // Speed Through Water (STW) from paddlewheel
  temperature: { type: 'single-metric' },
  // GPS sensor - multi-metric for SOG alarm capability
  gps: {
    type: 'multi-metric',
    metrics: [
      { key: 'speedOverGround', label: 'Speed Over Ground (SOG)', unit: 'kts' },
    ],
  },
  // Informational sensors - no alarms needed
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
  engine: 'temperature', // Engine temps use temperature presentation
  battery: 'voltage',
  tank: null, // Tanks use ratio/percentage
  gps: 'coordinates',
  compass: 'angle',
  autopilot: null,
  navigation: null,
};
import { UniversalIcon } from '../atoms/UniversalIcon';
import { PlatformToggle } from './inputs/PlatformToggle';
import { PlatformPicker, PlatformPickerItem } from './inputs/PlatformPicker';
import {
  MarineAudioAlertManager,
  SOUND_PATTERNS,
} from '../../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../services/alarms/types';
import { getSensorDisplayName } from '../../utils/sensorDisplayName';
import { getSmartDefaults } from '../../registry/AlarmThresholdDefaults';

interface SensorConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  sensorType?: SensorType; // Optional - defaults to first available sensor
}

interface SensorInstance {
  instance: number;
  name?: string;
  location?: string;
  lastUpdate?: number;
}

/**
 * Sensor Configuration Dialog
 * Allows per-instance sensor configuration including naming and alarm thresholds
 */
export const SensorConfigDialog: React.FC<SensorConfigDialogProps> = ({
  visible,
  onClose,
  sensorType: initialSensorType,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Get sensor instances from NMEA store
  const getSensorInstances = useNmeaStore((state) => state.getSensorInstances);
  const updateSensorThresholds = useNmeaStore((state) => state.updateSensorThresholds);
  const getSensorThresholds = useNmeaStore((state) => state.getSensorThresholds);
  const initializeDefaultThresholds = useNmeaStore((state) => state.initializeDefaultThresholds);

  // Get sensor config store actions
  const setConfig = useSensorConfigStore((state) => state.setConfig);

  // Get raw sensor data from store
  const rawSensorData = useNmeaStore((state) => state.nmeaData.sensors);

  // Detect available sensor types (dynamically discover from store)
  const availableSensorTypes = useMemo(() => {
    // Get all sensor types that exist in the store
    const sensorTypes = Object.keys(rawSensorData) as SensorType[];

    // Filter to only those with active instances (have timestamp data)
    const available = sensorTypes.filter((type) => {
      const instances = getSensorInstances(type);
      return instances.length > 0;
    });

    return available;
  }, [getSensorInstances, rawSensorData]);

  // Selected sensor type - start with null to show placeholder
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType | null>(
    initialSensorType || null,
  );

  // Get presentation system for unit conversion (always call hook, handle null case)
  const category = selectedSensorType ? sensorToCategory[selectedSensorType] : null;
  const rawPresentation = useDataPresentation(category || 'depth'); // Provide fallback DataCategory
  const presentation = useMemo(
    () =>
      category
        ? rawPresentation
        : {
            isValid: false,
            convert: (v: number) => v,
            convertBack: (v: number) => v,
            presentation: null,
          },
    [category, rawPresentation],
  );

  // Detect available instances for currently selected sensor type
  const instances = useMemo(() => {
    if (!selectedSensorType) return [];
    const detected = getSensorInstances(selectedSensorType);
    return detected.map(({ instance, data }) => ({
      instance,
      name: data.name,
      location: (data as any).location, // Location exists on some sensor types
      lastUpdate: data.timestamp,
    })) as SensorInstance[];
  }, [selectedSensorType, getSensorInstances]);

  // Selected instance tab
  const [selectedInstance, setSelectedInstance] = useState<number>(
    instances.length > 0 ? instances[0].instance : 0,
  );

  // Auto-determine alarm direction based on sensor type
  const getAlarmDirection = useCallback((sensorType: SensorType | null): 'above' | 'below' => {
    if (!sensorType) return 'below';
    
    // Sensors that alarm when value goes BELOW threshold (danger = too low)
    const belowSensors = ['battery', 'depth'];
    
    // All other sensors alarm when value goes ABOVE threshold (danger = too high)
    return belowSensors.includes(sensorType) ? 'below' : 'above';
  }, []);

  // Get contextual hint for alarm trigger behavior
  const getAlarmTriggerHint = useCallback((sensorType: SensorType | null): string => {
    if (!sensorType) return '';
    
    const direction = getAlarmDirection(sensorType);
    const sensorLabels: Record<string, string> = {
      battery: 'voltage drops below',
      depth: 'depth becomes shallower than',
      engine: 'RPM exceeds',
      temperature: 'temperature rises above',
      wind: 'wind speed exceeds',
      tank: 'level crosses',
    };
    
    const action = sensorLabels[sensorType] || (direction === 'below' ? 'drops below' : 'exceeds');
    return `Triggers when ${action} threshold`;
  }, [getAlarmDirection]);

  // Get current thresholds for selected instance
  const currentThresholds = useMemo(() => {
    if (!selectedSensorType) {
      return {
        enabled: false,
      };
    }
    const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
    return (
      thresholds || {
        enabled: false,
      }
    );
  }, [selectedSensorType, selectedInstance, getSensorThresholds]);

  // Local state for form inputs (converted to display units)
  const [enabled, setEnabled] = useState(currentThresholds.enabled);
  
  // Direction is auto-determined based on sensor type (not user-configurable)
  const direction = getAlarmDirection(selectedSensorType);
  const [criticalValue, setCriticalValue] = useState<string>(
    currentThresholds.critical !== undefined && presentation.isValid
      ? presentation.convert(currentThresholds.critical).toFixed(1)
      : '',
  );
  const [warningValue, setWarningValue] = useState<string>(
    currentThresholds.warning !== undefined && presentation.isValid
      ? presentation.convert(currentThresholds.warning).toFixed(1)
      : '',
  );
  
  // Get display name using priority chain: config.name → nmeaData.name → "Type Instance"
  const currentSensorData = selectedSensorType ? rawSensorData[selectedSensorType]?.[selectedInstance] : undefined;
  const initialDisplayName = selectedSensorType
    ? getSensorDisplayName(
        selectedSensorType,
        selectedInstance,
        currentThresholds,
        currentSensorData?.name
      )
    : '';
  
  const [name, setName] = useState<string>(initialDisplayName);
  const [batteryChemistry, setBatteryChemistry] = useState<string>(
    currentThresholds.context?.batteryChemistry || 'lead-acid',
  );
  const [engineType, setEngineType] = useState<string>(
    currentThresholds.context?.engineType || 'diesel',
  );
  const [criticalSoundPattern, setCriticalSoundPattern] = useState<string>(
    currentThresholds.criticalSoundPattern || 'rapid_pulse',
  );
  const [warningSoundPattern, setWarningSoundPattern] = useState<string>(
    currentThresholds.warningSoundPattern || 'warble',
  );
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDisable, setPendingDisable] = useState(false);

  // Check if battery chemistry is provided by the sensor (read-only for safety)
  const sensorProvidedChemistry = React.useMemo(() => {
    if (selectedSensorType !== 'battery') return undefined;
    const sensorData = rawSensorData.battery?.[selectedInstance] as any;
    return sensorData?.chemistry;
  }, [selectedSensorType, selectedInstance, rawSensorData]);

  // Determine alarm capability type for current sensor
  const alarmConfig = selectedSensorType ? SENSOR_ALARM_CONFIG[selectedSensorType] : null;
  const requiresMetricSelection = alarmConfig?.type === 'multi-metric';
  const supportsAlarms = alarmConfig?.type !== 'no-alarms';

  // Selected metric for multi-metric sensors (battery, engine)
  const [selectedMetric, setSelectedMetric] = useState<string>('');

  // Auto-select first metric when sensor type changes to a multi-metric sensor
  React.useEffect(() => {
    if (requiresMetricSelection && alarmConfig?.metrics?.[0]?.key) {
      setSelectedMetric(alarmConfig.metrics[0].key);
    } else if (!requiresMetricSelection) {
      setSelectedMetric('');
    }
  }, [requiresMetricSelection, alarmConfig, selectedSensorType]);

  // Helper function to load metric-specific alarm values
  const loadMetricValues = useCallback((metric: string, thresholds: SensorAlarmThresholds | null) => {
    if (!thresholds) {
      setCriticalValue('');
      setWarningValue('');
      setCriticalSoundPattern('rapid_pulse');
      setWarningSoundPattern('warble');
      return;
    }

    // For multi-metric sensors, require metric to be specified
    if (requiresMetricSelection && !metric) {
      setCriticalValue('');
      setWarningValue('');
      setCriticalSoundPattern('rapid_pulse');
      setWarningSoundPattern('warble');
      return;
    }

    // For multi-metric sensors, read from metrics.{metricKey}
    if (requiresMetricSelection && thresholds.metrics?.[metric]) {
      const metricData = thresholds.metrics[metric];
      setCriticalValue(
        metricData.critical !== undefined && presentation.isValid
          ? presentation.convert(metricData.critical).toFixed(1)
          : ''
      );
      setWarningValue(
        metricData.warning !== undefined && presentation.isValid
          ? presentation.convert(metricData.warning).toFixed(1)
          : ''
      );
      setCriticalSoundPattern(metricData.criticalSoundPattern || 'rapid_pulse');
      setWarningSoundPattern(metricData.warningSoundPattern || 'warble');
    } else {
      // For single-metric sensors, read from root level
      setCriticalValue(
        thresholds.critical !== undefined && presentation.isValid
          ? presentation.convert(thresholds.critical).toFixed(1)
          : ''
      );
      setWarningValue(
        thresholds.warning !== undefined && presentation.isValid
          ? presentation.convert(thresholds.warning).toFixed(1)
          : ''
      );
      setCriticalSoundPattern(thresholds.criticalSoundPattern || 'rapid_pulse');
      setWarningSoundPattern(thresholds.warningSoundPattern || 'warble');
    }
  }, [requiresMetricSelection, presentation]);

  // Update local state when instance changes or dialog becomes visible
  React.useEffect(() => {
    if (!selectedSensorType || !visible) return;
    const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
    if (thresholds) {
      setEnabled(thresholds.enabled);
      
      // Get display name using priority chain: config.name → nmeaData.name → "Type Instance"
      const sensorData = rawSensorData[selectedSensorType]?.[selectedInstance];
      const displayName = getSensorDisplayName(
        selectedSensorType,
        selectedInstance,
        thresholds,
        sensorData?.name
      );
      setName(displayName);
      
      setBatteryChemistry(thresholds.context?.batteryChemistry || 'lead-acid');
      setEngineType(thresholds.context?.engineType || 'diesel');
      
      // Load metric-specific values (handles both multi-metric and single-metric)
      loadMetricValues(selectedMetric, thresholds);
    } else {
      // No thresholds - reset to defaults
      setEnabled(false);
      loadMetricValues('', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance, selectedSensorType, visible]);

  // Update alarm values when selected metric changes (for multi-metric sensors)
  React.useEffect(() => {
    if (!requiresMetricSelection || !selectedMetric || !selectedSensorType) return;
    
    const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
    if (!thresholds) {
      setCriticalValue('');
      setWarningValue('');
      setCriticalSoundPattern('rapid_pulse');
      setWarningSoundPattern('warble');
      return;
    }

    // Read from metrics.{metricKey} for multi-metric sensors
    if (thresholds.metrics?.[selectedMetric]) {
      const metricData = thresholds.metrics[selectedMetric];
      setCriticalValue(
        metricData.critical !== undefined && presentation.isValid
          ? presentation.convert(metricData.critical).toFixed(1)
          : ''
      );
      setWarningValue(
        metricData.warning !== undefined && presentation.isValid
          ? presentation.convert(metricData.warning).toFixed(1)
          : ''
      );
      setCriticalSoundPattern(metricData.criticalSoundPattern || 'rapid_pulse');
      setWarningSoundPattern(metricData.warningSoundPattern || 'warble');
    } else {
      // No data for this metric yet - try to load smart defaults
      const context = {
        batteryChemistry: batteryChemistry as any,
        engineType: engineType as any,
      };
      const instance = instances.find((i) => i.instance === selectedInstance);
      const defaults = getSmartDefaults(selectedSensorType, context, instance?.location);
      
      if (defaults?.metrics?.[selectedMetric]) {
        const metricDefaults = defaults.metrics[selectedMetric];
        setCriticalValue(
          metricDefaults.critical !== undefined && presentation.isValid
            ? presentation.convert(metricDefaults.critical).toFixed(1)
            : ''
        );
        setWarningValue(
          metricDefaults.warning !== undefined && presentation.isValid
            ? presentation.convert(metricDefaults.warning).toFixed(1)
            : ''
        );
        setCriticalSoundPattern(metricDefaults.criticalSoundPattern || 'rapid_pulse');
        setWarningSoundPattern(metricDefaults.warningSoundPattern || 'warble');
      } else {
        // No defaults available - reset to empty
        setCriticalValue('');
        setWarningValue('');
        setCriticalSoundPattern('rapid_pulse');
        setWarningSoundPattern('warble');
      }
    }
  }, [selectedMetric, selectedSensorType, selectedInstance, requiresMetricSelection, getSensorThresholds, presentation, batteryChemistry, engineType, instances]);

  // Check if sensor type is critical (requires confirmation to disable)
  const isCriticalSensor = useCallback((sensorType: SensorType | null): boolean => {
    if (!sensorType) return false;
    // Critical sensors that require confirmation to disable
    return ['depth', 'battery', 'engine'].includes(sensorType);
  }, []);

  // Handle enable/disable with confirmation for critical sensors
  const handleEnabledChange = useCallback(
    (value: boolean) => {
      if (!value && isCriticalSensor(selectedSensorType)) {
        // Disabling a critical alarm - show confirmation
        if (Platform.OS === 'web') {
          // Web: use custom dialog
          setPendingDisable(true);
          setShowConfirmDialog(true);
        } else {
          // Native: use Alert.alert
          Alert.alert(
            'Disable Critical Alarm?',
            `${selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disabling this alarm may put your vessel at risk.\n\nAre you sure you want to disable this alarm?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Disable',
                style: 'destructive',
                onPress: () => setEnabled(false),
              },
            ],
          );
        }
      } else {
        // Not critical or enabling - proceed directly
        setEnabled(value);
      }
    },
    [selectedSensorType, isCriticalSensor],
  );

  // Confirm disable action from custom dialog
  const confirmDisable = useCallback(() => {
    setEnabled(false);
    setPendingDisable(false);
    setShowConfirmDialog(false);
    // Need to save after this - will be handled by handleSave dependency in handleEnabledChange
  }, []);

  // Cancel disable action from custom dialog
  const cancelDisable = useCallback(() => {
    setPendingDisable(false);
    setShowConfirmDialog(false);
  }, []);

  // Auto-save when enabled state changes (after user toggles)
  const enabledRef = React.useRef(enabled);
  React.useEffect(() => {
    // Only save if this is a change from user interaction, not initial load
    if (enabledRef.current !== enabled && selectedSensorType) {
      enabledRef.current = enabled;
      // Delay to let state settle
      const timer = setTimeout(() => {
        // Re-read current state and save
        if (!selectedSensorType) return;
        const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
        if (thresholds && thresholds.enabled !== enabled) {
          // Only save if actually different
          updateSensorThresholds(selectedSensorType, selectedInstance, { enabled });
          setConfig(selectedSensorType, selectedInstance, { enabled });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [enabled, selectedSensorType, selectedInstance, getSensorThresholds, updateSensorThresholds, setConfig]);

  // Initialize defaults button handler - loads context-aware defaults
  const handleInitializeDefaults = useCallback(() => {
    if (!selectedSensorType) return;

    // Build context for smart defaults
    const context: any = {};
    if (selectedSensorType === 'battery') {
      // Prioritize NMEA-detected chemistry over user selection
      context.batteryChemistry = sensorProvidedChemistry || batteryChemistry;
    } else if (selectedSensorType === 'engine') {
      context.engineType = engineType;
    }

    // Get smart defaults directly
    const instance = instances.find((i) => i.instance === selectedInstance);
    const defaults = getSmartDefaults(selectedSensorType, context, instance?.location);

    if (!defaults) {
      console.warn('No defaults available for', selectedSensorType);
      return;
    }

    // Force update the thresholds with defaults (overwrite existing)
    updateSensorThresholds(selectedSensorType, selectedInstance, {
      ...defaults,
      lastModified: Date.now(),
    });

    // Also update persistent config
    if (Object.keys(context).length > 0) {
      setConfig(selectedSensorType, selectedInstance, { context });
    }

    // Reload the dialog to show new defaults
    if (requiresMetricSelection && selectedMetric) {
      // For multi-metric sensors, load the currently selected metric
      loadMetricValues(selectedMetric, defaults);
    } else if (presentation.isValid) {
      // For single-metric sensors, load from root level
      setCriticalValue(
        defaults.critical !== undefined
          ? presentation.convert(defaults.critical).toFixed(1)
          : '',
      );
      setWarningValue(
        defaults.warning !== undefined ? presentation.convert(defaults.warning).toFixed(1) : '',
      );
      setCriticalSoundPattern(defaults.criticalSoundPattern || 'rapid_pulse');
      setWarningSoundPattern(defaults.warningSoundPattern || 'warble');
    }
  }, [
    selectedSensorType,
    selectedInstance,
    batteryChemistry,
    engineType,
    instances,
    updateSensorThresholds,
    setConfig,
    presentation,
    requiresMetricSelection,
    selectedMetric,
    loadMetricValues,
  ]);

  // Save handler - convert from display units back to SI (does NOT close dialog)
  const doSave = useCallback(() => {
    if (!selectedSensorType) return;

    const updates: Partial<SensorAlarmThresholds> = {
      name: name.trim() || undefined, // Only save if not empty
      enabled,
      direction,
      criticalSoundPattern,
      warningSoundPattern,
    };

    // Add context fields based on sensor type
    // Only save battery chemistry if not provided by sensor (for safety)
    if (selectedSensorType === 'battery' && !sensorProvidedChemistry) {
      updates.context = { batteryChemistry: batteryChemistry as any };
    } else if (selectedSensorType === 'engine') {
      updates.context = { engineType: engineType as any };
    }

    // For multi-metric sensors, save to metrics.{selectedMetric} path
    if (requiresMetricSelection && selectedMetric) {
      // Initialize metrics object if it doesn't exist
      if (!currentThresholds.metrics) {
        updates.metrics = {};
      } else {
        // Preserve existing metric configurations
        updates.metrics = { ...currentThresholds.metrics };
      }

      // Convert display values back to SI units for this metric
      const metricData: any = {
        enabled: true, // Individual metric is enabled when user configures it
        direction,
        criticalSoundPattern,
        warningSoundPattern,
      };

      if (criticalValue && presentation.isValid) {
        const displayValue = parseFloat(criticalValue);
        metricData.critical = presentation.convertBack(displayValue);
      }
      if (warningValue && presentation.isValid) {
        const displayValue = parseFloat(warningValue);
        metricData.warning = presentation.convertBack(displayValue);
      }

      // Hysteresis: preserve existing values for this metric or use defaults
      const existingMetric = currentThresholds.metrics?.[selectedMetric];
      if (existingMetric?.criticalHysteresis !== undefined) {
        metricData.criticalHysteresis = existingMetric.criticalHysteresis;
      }
      if (existingMetric?.warningHysteresis !== undefined) {
        metricData.warningHysteresis = existingMetric.warningHysteresis;
      }

      updates.metrics[selectedMetric] = metricData;
    } else {
      // For single-metric sensors, save to root level (backward compatible)
      if (criticalValue && presentation.isValid) {
        const displayValue = parseFloat(criticalValue);
        updates.critical = presentation.convertBack(displayValue);
      }
      if (warningValue && presentation.isValid) {
        const displayValue = parseFloat(warningValue);
        updates.warning = presentation.convertBack(displayValue);
      }

      // Hysteresis: preserve existing values or use defaults
      if (currentThresholds.criticalHysteresis !== undefined) {
        updates.criticalHysteresis = currentThresholds.criticalHysteresis;
      }
      if (currentThresholds.warningHysteresis !== undefined) {
        updates.warningHysteresis = currentThresholds.warningHysteresis;
      }
    }

    // Save to persistent storage first
    setConfig(selectedSensorType, selectedInstance, updates);
    
    // Update volatile cache (nmeaStore)
    updateSensorThresholds(selectedSensorType, selectedInstance, updates);
  }, [
    name,
    batteryChemistry,
    engineType,
    enabled,
    direction,
    criticalValue,
    warningValue,
    criticalSoundPattern,
    warningSoundPattern,
    direction,
    selectedSensorType,
    selectedInstance,
    presentation,
    setConfig,
    updateSensorThresholds,
    getAlarmDirection,
    sensorProvidedChemistry,
    currentThresholds.criticalHysteresis,
    currentThresholds.warningHysteresis,
    currentThresholds.metrics,
    requiresMetricSelection,
    selectedMetric,
  ]);

  // Wrapper that saves and closes (for onBlur and explicit save actions)
  const handleSave = useCallback(() => {
    doSave();
  }, [doSave]);

  // Close handler that saves before closing
  const handleClose = useCallback(() => {
    doSave();
    onClose();
  }, [doSave, onClose]);

  // Display unit symbol - use metric-specific unit for multi-metric sensors
  const unitSymbol = useMemo(() => {
    if (requiresMetricSelection && selectedMetric && alarmConfig?.metrics) {
      const metricInfo = alarmConfig.metrics.find(m => m.key === selectedMetric);
      return metricInfo?.unit || '';
    }
    return presentation.isValid ? presentation.presentation?.symbol || '' : '';
  }, [requiresMetricSelection, selectedMetric, alarmConfig, presentation]);

  // Get metric-specific label for threshold display
  const metricLabel = useMemo(() => {
    if (requiresMetricSelection && selectedMetric && alarmConfig?.metrics) {
      const metricInfo = alarmConfig.metrics.find(m => m.key === selectedMetric);
      return metricInfo?.label || '';
    }
    // For single-metric sensors, use sensor type name
    if (selectedSensorType) {
      const labels: Record<string, string> = {
        depth: 'Depth',
        tank: 'Tank Level',
        wind: 'Wind Speed',
        speed: 'Speed',
        temperature: 'Temperature',
      };
      return labels[selectedSensorType] || selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1);
    }
    return '';
  }, [requiresMetricSelection, selectedMetric, alarmConfig, selectedSensorType]);

  // Render instance tabs using FlatList
  const renderInstanceTabs = () => {
    if (instances.length <= 1) return null;

    return (
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
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
                key={inst.instance}
                style={[
                  styles.tab,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => {
                  // Save current instance before switching
                  doSave();
                  setSelectedInstance(inst.instance);
                }}
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

  // Render sensor type picker
  const renderSensorTypePicker = () => {
    if (availableSensorTypes.length === 0) return null;

    // Build picker items with placeholder
    const pickerItems: PlatformPickerItem[] = [
      { label: 'Select a sensor...', value: '' },
      ...availableSensorTypes.map((type) => ({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value: type,
      })),
    ];

    return (
      <View
        style={[
          styles.pickerContainer,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <PlatformPicker
          label="Sensor"
          value={selectedSensorType || ''}
          onValueChange={(value) => {
            if (value && value !== '') {
              setSelectedSensorType(value as SensorType);
              const newInstances = getSensorInstances(value as SensorType);
              setSelectedInstance(newInstances.length > 0 ? newInstances[0].instance : 0);
            }
          }}
          items={pickerItems}
          placeholder="Select a sensor..."
        />
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header with Back Button */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.surface, borderBottomColor: theme.border },
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <UniversalIcon name="arrow-back" size={24} color={theme.text} />
              <Text style={[styles.backButtonText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Sensor Configuration</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* No sensors detected at all */}
            {availableSensorTypes.length === 0 && (
              <View style={styles.section}>
                <View style={styles.emptyState}>
                  <UniversalIcon
                    name="alert-circle-outline"
                    size={64}
                    color={theme.textSecondary}
                  />
                  <Text style={styles.emptyText}>No Sensors Detected</Text>
                  <Text style={styles.emptySubtext}>
                    Alarm configuration will be available once NMEA sensor data is received
                  </Text>
                </View>
              </View>
            )}

            {/* Show picker and form only when sensors exist */}
            {availableSensorTypes.length > 0 && (
              <>
                {/* Sensor Type Picker */}
                {renderSensorTypePicker()}

                {/* Instance tabs */}
                {renderInstanceTabs()}

                {/* No instances for selected sensor type */}
                {selectedSensorType && instances.length === 0 && (
                  <View style={styles.section}>
                    <View style={styles.emptyState}>
                      <UniversalIcon
                        name="alert-circle-outline"
                        size={48}
                        color={theme.textSecondary}
                      />
                      <Text style={styles.emptyText}>No {selectedSensorType} sensors detected</Text>
                      <Text style={styles.emptySubtext}>
                        Switch to another sensor type or start NMEA data stream
                      </Text>
                    </View>
                  </View>
                )}

                {/* Configuration form - only show when sensor selected */}
                {selectedSensorType && instances.length > 0 && (
                  <>
                {/* Instance Information */}
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.surface, borderColor: theme.border, zIndex: 100 },
                  ]}
                >
                  <View style={styles.inlineField}>
                    <Text style={[styles.inlineLabel, { color: theme.text }]}>Name:</Text>
                    <TextInput
                      style={[
                        styles.inlineInput,
                        {
                          backgroundColor: theme.background,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g., House Battery"
                      placeholderTextColor={theme.textSecondary}
                      onBlur={handleSave}
                    />
                  </View>

                  {/* Battery Chemistry Picker - Only for battery sensors */}
                  {selectedSensorType === 'battery' && (
                    <View style={styles.inlineField}>
                      <Text style={[styles.inlineLabel, { color: theme.text }]}>Chemistry:</Text>
                      {sensorProvidedChemistry ? (
                        <View style={[
                          styles.inlineInput,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            justifyContent: 'center',
                            opacity: 0.6,
                          }
                        ]}>
                          <Text style={{ 
                            color: theme.textSecondary,
                            fontSize: 15,
                            fontFamily: 'sans-serif',
                          }}>
                            {sensorProvidedChemistry === 'lead-acid' && 'Lead Acid'}
                            {sensorProvidedChemistry === 'agm' && 'AGM'}
                            {sensorProvidedChemistry === 'lifepo4' && 'LiFePO4'}
                            {!['lead-acid', 'agm', 'lifepo4'].includes(sensorProvidedChemistry) && sensorProvidedChemistry}
                            {' (sensor provided)'}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flex: 1 }}>
                          <PlatformPicker
                            value={batteryChemistry}
                            onValueChange={(value) => setBatteryChemistry(value as string)}
                            items={[
                              { label: 'Lead Acid', value: 'lead-acid' },
                              { label: 'AGM', value: 'agm' },
                              { label: 'LiFePO4', value: 'lifepo4' },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Engine Type Picker - Only for engine sensors */}
                  {selectedSensorType === 'engine' && (
                    <View style={styles.inlineField}>
                      <Text style={[styles.inlineLabel, { color: theme.text }]}>Type:</Text>
                      <View style={{ flex: 1 }}>
                        <PlatformPicker
                          value={engineType}
                          onValueChange={(value) => setEngineType(value as string)}
                          items={[
                            { label: 'Diesel', value: 'diesel' },
                            { label: 'Gasoline', value: 'gasoline' },
                            { label: 'Outboard', value: 'outboard' },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Informational message for sensors without alarms */}
                  {!supportsAlarms && (
                    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.7 }]}>
                      <Text style={[styles.hint, { color: theme.textSecondary, fontSize: 14, textAlign: 'center' }]}>
                        ℹ️ {selectedSensorType?.charAt(0).toUpperCase()}{selectedSensorType?.slice(1)} sensors provide informational data only.{'\n'}
                        No alarm thresholds are needed for this sensor type.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Enable/Disable Switch - Only show for sensors that support alarms */}
                {supportsAlarms && (
                  <View
                    style={[
                      styles.section,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <PlatformToggle
                      value={enabled}
                      onValueChange={handleEnabledChange}
                      label="Enable Alarms"
                    />
                  </View>
                )}

                {/* Alarm Configuration - Only show for sensors that support alarms and when enabled */}
                {supportsAlarms && enabled && (
                  <>
                    {/* Metric Selector - Only for multi-metric sensors (battery, engine) */}
                    {requiresMetricSelection && alarmConfig?.metrics && (
                      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, zIndex: 100 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                          Alarm Metric
                        </Text>
                        <View style={styles.inlineField}>
                          <Text style={[styles.inlineLabel, { color: theme.text }]}>Metric:</Text>
                          <View style={{ flex: 1 }}>
                            <PlatformPicker
                              value={selectedMetric}
                              onValueChange={(value) => setSelectedMetric(value as string)}
                              items={alarmConfig.metrics.map((m) => ({
                                label: `${m.label} (${m.unit})`,
                                value: m.key,
                              }))}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Critical Alarm Configuration */}
                    <View
                      style={[
                        styles.section,
                        { 
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderLeftWidth: 4,
                          borderLeftColor: theme.error || '#dc2626',
                          zIndex: 50,
                          paddingVertical: 12,
                        },
                      ]}
                    >
                      {/* Section Title */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.errorLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ fontSize: 16 }}>🔴</Text>
                        </View>
                        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 0 }]}>
                          Critical - {metricLabel} ({unitSymbol})
                        </Text>
                      </View>
                      
                      {/* Compact Threshold Control */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[styles.compactLabel, { color: theme.textSecondary, width: 70 }]}>Threshold</Text>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            style={[styles.compactButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => {
                              const current = parseFloat(criticalValue) || 0;
                              setCriticalValue((current - 0.5).toFixed(1));
                            }}
                          >
                            <Text style={[styles.compactButtonText, { color: theme.text }]}>−</Text>
                          </Pressable>
                          <TextInput
                            style={[
                              styles.compactInput,
                              { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                            ]}
                            value={criticalValue}
                            onChangeText={setCriticalValue}
                            onBlur={handleSave}
                            keyboardType="numeric"
                            placeholder="0.0"
                            placeholderTextColor={theme.textSecondary}
                          />
                          <Pressable
                            style={[styles.compactButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => {
                              const current = parseFloat(criticalValue) || 0;
                              setCriticalValue((current + 0.5).toFixed(1));
                            }}
                          >
                            <Text style={[styles.compactButtonText, { color: theme.text }]}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                      
                      {/* Compact Sound Picker */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.compactLabel, { color: theme.textSecondary, width: 70 }]}>Sound</Text>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ flex: 1 }}>
                            <PlatformPicker
                              value={criticalSoundPattern}
                              onValueChange={(value) => setCriticalSoundPattern(value as string)}
                              items={SOUND_PATTERNS.map((pattern) => ({
                                label: pattern.label,
                                value: pattern.value,
                              }))}
                            />
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.compactTestButton,
                              { backgroundColor: theme.error || '#dc2626', borderColor: theme.error || '#dc2626' },
                            ]}
                            onPress={async () => {
                              try {
                                const audioManager = MarineAudioAlertManager.getInstance();
                                await audioManager.testAlarmSound(
                                  CriticalAlarmType.SHALLOW_WATER,
                                  AlarmEscalationLevel.CRITICAL,
                                  3000,
                                  criticalSoundPattern
                                );
                              } catch (error) {
                                console.error('Failed to test critical sound:', error);
                              }
                            }}
                          >
                            <UniversalIcon name="volume-high-outline" size={18} color={theme.background} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Warning Alarm Configuration */}
                    <View
                      style={[
                        styles.section,
                        { 
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          borderLeftWidth: 4,
                          borderLeftColor: theme.warning || '#f59e0b',
                          zIndex: 40,
                          paddingVertical: 12,
                        },
                      ]}
                    >
                      {/* Section Title */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.warningLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ fontSize: 16 }}>🟡</Text>
                        </View>
                        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 0 }]}>
                          Warning - {metricLabel} ({unitSymbol})
                        </Text>
                      </View>
                      
                      {/* Compact Threshold Control */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: warningValue ? 8 : 0 }}>
                        <Text style={[styles.compactLabel, { color: theme.textSecondary, width: 70 }]}>Threshold</Text>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            style={[styles.compactButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => {
                              const current = parseFloat(warningValue) || 0;
                              setWarningValue((current - 0.5).toFixed(1));
                            }}
                          >
                            <Text style={[styles.compactButtonText, { color: theme.text }]}>−</Text>
                          </Pressable>
                          <TextInput
                            style={[
                              styles.compactInput,
                              { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                            ]}
                            value={warningValue}
                            onChangeText={setWarningValue}
                            onBlur={handleSave}
                            keyboardType="numeric"
                            placeholder="Optional"
                            placeholderTextColor={theme.textSecondary}
                          />
                          <Pressable
                            style={[styles.compactButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => {
                              const current = parseFloat(warningValue) || 0;
                              setWarningValue((current + 0.5).toFixed(1));
                            }}
                          >
                            <Text style={[styles.compactButtonText, { color: theme.text }]}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                      
                      {/* Compact Sound Picker - Only show when warning value is set */}
                      {warningValue && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.compactLabel, { color: theme.textSecondary, width: 70 }]}>Sound</Text>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ flex: 1 }}>
                              <PlatformPicker
                                value={warningSoundPattern}
                                onValueChange={(value) =>
                                  setWarningSoundPattern(value as string)
                                }
                                items={SOUND_PATTERNS.map((pattern) => ({
                                  label: pattern.label,
                                  value: pattern.value,
                                }))}
                              />
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.compactTestButton,
                                { backgroundColor: theme.warning || '#f59e0b', borderColor: theme.warning || '#f59e0b' },
                              ]}
                              onPress={async () => {
                                try {
                                  const audioManager = MarineAudioAlertManager.getInstance();
                                  await audioManager.testAlarmSound(
                                    CriticalAlarmType.SHALLOW_WATER,
                                    AlarmEscalationLevel.WARNING,
                                    3000,
                                    warningSoundPattern
                                  );
                                } catch (error) {
                                  console.error('Failed to test warning sound:', error);
                                }
                              }}
                            >
                              <UniversalIcon name="volume-high-outline" size={18} color={theme.background} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Initialize Defaults Button */}
                    <TouchableOpacity
                      style={[
                        styles.defaultsButton,
                        { 
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                          paddingVertical: 14,
                          borderRadius: 10,
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        },
                      ]}
                      onPress={handleInitializeDefaults}
                    >
                      <UniversalIcon name="refresh-outline" size={22} color={theme.background} />
                      <Text style={[styles.defaultsButtonText, { color: theme.background, fontSize: 16, fontWeight: '600' }]}>
                        Reset Defaults
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                </>
              )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Confirmation Dialog for Disabling Critical Alarms (Web) */}
      {Platform.OS === 'web' && showConfirmDialog && (
        <Modal
          visible={showConfirmDialog}
          transparent
          animationType="fade"
          onRequestClose={cancelDisable}
        >
          <Pressable style={styles.confirmBackdrop} onPress={cancelDisable}>
            <Pressable
              style={[styles.confirmDialog, { backgroundColor: theme.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.confirmTitle, { color: theme.text }]}>
                Disable Critical Alarm?
              </Text>
              <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
                {selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disabling
                this alarm may put your vessel at risk.{' \n\n'}
                Are you sure you want to disable this alarm?
              </Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  style={[
                    styles.confirmButton,
                    styles.confirmButtonCancel,
                    { backgroundColor: theme.border },
                  ]}
                  onPress={cancelDisable}
                >
                  <Text style={[styles.confirmButtonText, { color: theme.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmButton,
                    styles.confirmButtonDisable,
                    { backgroundColor: theme.error },
                  ]}
                  onPress={confirmDisable}
                >
                  <Text style={[styles.confirmButtonText, { color: theme.textInverse }]}>Disable</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 16,
      borderBottomWidth: 1,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backButtonText: {
      fontSize: 17,
      fontWeight: '400',
      fontFamily: 'sans-serif',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      pointerEvents: 'none',
    },
    headerSpacer: {
      width: 80,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    pickerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      zIndex: 1000,
      elevation: 1000,
      position: 'relative',
    },
    pickerLabel: {
      fontSize: 13,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      opacity: 0.6,
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      zIndex: 1,
      position: 'relative',
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    content: {
      flex: 1,
    },
    tabContainer: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 12,
      paddingHorizontal: 16,
      zIndex: 1,
      position: 'relative',
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
      color: theme.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: 'sans-serif',
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    segmentedControl: {
      flexDirection: 'row',
      borderRadius: 8,
      overflow: 'hidden',
      gap: 8,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'sans-serif',
    },
    defaultsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginVertical: 16,
      marginHorizontal: 16,
    },
    defaultsButtonText: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginLeft: 8,
    },
    // Threshold Control Styles
    thresholdSection: {
      marginVertical: 12,
    },
    thresholdLabel: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 8,
    },
    thresholdControl: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginVertical: 8,
    },
    adjustButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    adjustButtonText: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    thresholdInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: 'sans-serif',
      textAlign: 'center',
    },
    hint: {
      fontSize: 13,
      fontFamily: 'sans-serif',
      marginTop: 4,
      lineHeight: 18,
    },
    inputGroup: {
      marginTop: 16,
      zIndex: 10,
      position: 'relative',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 8,
    },
    textInput: {
      height: 44,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: 'sans-serif',
    },
    inlineField: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    inlineLabel: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      minWidth: 80,
    },
    inlineInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: 'sans-serif',
    },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 12,
    },
    // Radio Button Styles
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    radioSelected: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    radioLabel: {
      flex: 1,
    },
    radioText: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: 'sans-serif',
      marginBottom: 2,
    },
    radioDescription: {
      fontSize: 13,
      fontFamily: 'sans-serif',
      lineHeight: 18,
    },
    // Test Sound Button
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 8,
      marginTop: 16,
      gap: 8,
    },
    testButtonText: {
      fontSize: 15,
      fontFamily: 'sans-serif',
      fontWeight: '600',
      // Note: color should be set inline with theme.textInverse
    },
    testSoundButton: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    // Compact UI Styles
    compactLabel: {
      fontSize: 13,
      fontFamily: 'sans-serif',
      fontWeight: '500',
    },
    compactButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactButtonText: {
      fontSize: 18,
      fontWeight: '600',
    },
    compactInput: {
      flex: 1,
      height: 36,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 12,
      fontSize: 15,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    },
    compactTestButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    // Confirmation Dialog Styles
    confirmBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmDialog: {
      width: '90%',
      maxWidth: 400,
      padding: 24,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 12,
    },
    confirmMessage: {
      fontSize: 15,
      fontFamily: 'sans-serif',
      lineHeight: 22,
      marginBottom: 24,
    },
    confirmButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    confirmButtonCancel: {
      // Uses theme.border backgroundColor
    },
    confirmButtonDisable: {
      // Uses theme.error backgroundColor
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'sans-serif',
    },
    inputGroup: {
      marginTop: 8,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'sans-serif',
      marginBottom: 8,
    },
    textInput: {
      height: 44,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      fontFamily: 'sans-serif',
    },
  });

export default SensorConfigDialog;
