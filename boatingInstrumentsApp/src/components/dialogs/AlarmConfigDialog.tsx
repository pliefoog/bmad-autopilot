/**
 * Alarm Configuration Dialog - Per-Instance Threshold Configuration
 * 
 * Features:
 * - Instance tab navigation for multi-instance sensors
 * - Location-aware threshold defaults
 * - SI unit storage with presentation system conversion
 * - Real-time threshold updates to NMEA store
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
import { Picker } from '@react-native-picker/picker';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { SensorType, SensorAlarmThresholds } from '../../types/SensorData';
import { logger } from '../../utils/logger';
import { useDataPresentation } from '../../presentation/useDataPresentation';
import { DataCategory } from '../../presentation/categories';

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
import { MarineAudioAlertManager, SOUND_PATTERNS } from '../../services/alarms/MarineAudioAlertManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../services/alarms/types';

interface AlarmConfigDialogProps {
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
 * Alarm Configuration Dialog
 * Allows per-instance threshold configuration with location-aware defaults
 */
export const AlarmConfigDialog: React.FC<AlarmConfigDialogProps> = ({
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
  
  // Get raw sensor data from store
  const rawSensorData = useNmeaStore((state) => state.nmeaData.sensors);
  
  // Detect available sensor types (dynamically discover from store)
  const availableSensorTypes = useMemo(() => {
    // Get all sensor types that exist in the store
    const sensorTypes = Object.keys(rawSensorData) as SensorType[];
    
    // Filter to only those with active instances (have timestamp data)
    const available = sensorTypes.filter(type => {
      const instances = getSensorInstances(type);
      return instances.length > 0;
    });
    
    return available;
  }, [getSensorInstances, rawSensorData]);
  
  // Selected sensor type - start with null to show placeholder
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType | null>(
    initialSensorType || null
  );
  
  // Get presentation system for unit conversion (always call hook, handle null case)
  const category = selectedSensorType ? sensorToCategory[selectedSensorType] : null;
  const rawPresentation = useDataPresentation(category || 'depth'); // Provide fallback DataCategory
  const presentation = useMemo(() => 
    category ? rawPresentation : { isValid: false, convert: (v: number) => v, convertBack: (v: number) => v, presentation: null },
    [category, rawPresentation]
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
    instances.length > 0 ? instances[0].instance : 0
  );
  
  // Get current thresholds for selected instance
  const currentThresholds = useMemo(() => {
    if (!selectedSensorType) {
      return {
        enabled: false,
        thresholdType: 'min' as const,
      };
    }
    const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
    return thresholds || {
      enabled: false,
      thresholdType: 'min' as const,
    };
  }, [selectedSensorType, selectedInstance, getSensorThresholds]);
  
  // Local state for form inputs (converted to display units)
  const [enabled, setEnabled] = useState(currentThresholds.enabled);
  const [thresholdType, setThresholdType] = useState<'min' | 'max'>(
    currentThresholds.thresholdType
  );
  const [minValue, setMinValue] = useState<string>(
    currentThresholds.min !== undefined && presentation.isValid
      ? presentation.convert(currentThresholds.min).toFixed(1)
      : ''
  );
  const [maxValue, setMaxValue] = useState<string>(
    currentThresholds.max !== undefined && presentation.isValid
      ? presentation.convert(currentThresholds.max).toFixed(1)
      : ''
  );
  const [warningValue, setWarningValue] = useState<string>(
    currentThresholds.warning !== undefined && presentation.isValid
      ? presentation.convert(currentThresholds.warning).toFixed(1)
      : ''
  );
  const [audioEnabled, setAudioEnabled] = useState(currentThresholds.audioEnabled ?? true);
  const [soundPattern, setSoundPattern] = useState<string>(currentThresholds.soundPattern || 'rapid_pulse');
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDisable, setPendingDisable] = useState(false);
  
  // Update local state when instance changes
  React.useEffect(() => {
    if (!selectedSensorType) return;
    const thresholds = getSensorThresholds(selectedSensorType, selectedInstance);
    if (thresholds) {
      setEnabled(thresholds.enabled);
      setThresholdType(thresholds.thresholdType);
      setMinValue(
        thresholds.min !== undefined && presentation.isValid
          ? presentation.convert(thresholds.min).toFixed(1)
          : ''
      );
      setMaxValue(
        thresholds.max !== undefined && presentation.isValid
          ? presentation.convert(thresholds.max).toFixed(1)
          : ''
      );
      setWarningValue(
        thresholds.warning !== undefined && presentation.isValid
          ? presentation.convert(thresholds.warning).toFixed(1)
          : ''
      );
      setAudioEnabled(thresholds.audioEnabled ?? true);
      setSoundPattern(thresholds.soundPattern || 'rapid_pulse');
    } else {
      // No thresholds - reset to defaults
      setEnabled(false);
      setThresholdType('min');
      setMinValue('');
      setMaxValue('');
      setWarningValue('');
      setAudioEnabled(true);
      setSoundPattern('rapid_pulse');
    }
  }, [selectedInstance, selectedSensorType, getSensorThresholds, presentation.isValid]);
  
  // Check if sensor type is critical (requires confirmation to disable)
  const isCriticalSensor = useCallback((sensorType: SensorType | null): boolean => {
    if (!sensorType) return false;
    // Critical sensors that require confirmation to disable
    return ['depth', 'battery', 'engine'].includes(sensorType);
  }, []);
  
  // Handle enable/disable with confirmation for critical sensors
  const handleEnabledChange = useCallback((value: boolean) => {
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
          ]
        );
      }
    } else {
      // Not critical or enabling - proceed directly
      setEnabled(value);
    }
  }, [selectedSensorType, isCriticalSensor]);
  
  // Confirm disable action from custom dialog
  const confirmDisable = useCallback(() => {
    setEnabled(false);
    setPendingDisable(false);
    setShowConfirmDialog(false);
  }, []);
  
  // Cancel disable action from custom dialog
  const cancelDisable = useCallback(() => {
    setPendingDisable(false);
    setShowConfirmDialog(false);
  }, []);
  
  // Initialize defaults button handler
  const handleInitializeDefaults = useCallback(() => {
    if (!selectedSensorType) return;
    const instance = instances.find((i) => i.instance === selectedInstance);
    initializeDefaultThresholds(selectedSensorType, selectedInstance, instance?.location);
  }, [selectedInstance, selectedSensorType, instances, initializeDefaultThresholds]);
  
  // Auto-save when values change
  React.useEffect(() => {
    if (!selectedSensorType) return;
    
    const updates: Partial<SensorAlarmThresholds> = {
      enabled,
      thresholdType,
      audioEnabled,
      soundPattern,
    };
    
    // Convert display values back to SI units
    if (minValue && presentation.isValid) {
      const displayValue = parseFloat(minValue);
      if (!isNaN(displayValue)) {
        updates.min = presentation.convertBack(displayValue);
      }
    }
    if (maxValue && presentation.isValid) {
      const displayValue = parseFloat(maxValue);
      if (!isNaN(displayValue)) {
        updates.max = presentation.convertBack(displayValue);
      }
    }
    if (warningValue && presentation.isValid) {
      const displayValue = parseFloat(warningValue);
      if (!isNaN(displayValue)) {
        updates.warning = presentation.convertBack(displayValue);
      }
    }
    
    updateSensorThresholds(selectedSensorType, selectedInstance, updates);
  }, [enabled, thresholdType, minValue, maxValue, warningValue, audioEnabled, soundPattern, selectedSensorType, selectedInstance, presentation.isValid, presentation.convert, presentation.convertBack, updateSensorThresholds]);
  
  // Test sound playback using MarineAudioAlertManager
  const handleTestSound = useCallback(async () => {
    if (isTestingSound) return;
    
    setIsTestingSound(true);
    
    try {
      const audioManager = MarineAudioAlertManager.getInstance();
      // Use a generic alarm type for testing, override with selected pattern
      await audioManager.testAlarmSound(
        CriticalAlarmType.SHALLOW_WATER,
        AlarmEscalationLevel.WARNING,
        3000,
        soundPattern
      );
      
      // Reset testing state after sound completes
      setTimeout(() => {
        setIsTestingSound(false);
      }, 3000);
      
    } catch (error) {
      logger.warn('AlarmConfigDialog', 'Failed to play test sound:', error);
      setIsTestingSound(false);
    }
  }, [isTestingSound, soundPattern]);

  // Save handler - convert from display units back to SI
  const handleSave = useCallback(() => {
    if (!selectedSensorType) return;
    
    const updates: Partial<SensorAlarmThresholds> = {
      enabled,
      thresholdType,
      audioEnabled,
      soundPattern,
    };
    
    // Convert display values back to SI units
    if (minValue && presentation.isValid) {
      const displayValue = parseFloat(minValue);
      updates.min = presentation.convertBack(displayValue);
    }
    if (maxValue && presentation.isValid) {
      const displayValue = parseFloat(maxValue);
      updates.max = presentation.convertBack(displayValue);
    }
    if (warningValue && presentation.isValid) {
      const displayValue = parseFloat(warningValue);
      updates.warning = presentation.convertBack(displayValue);
    }
    
    updateSensorThresholds(selectedSensorType, selectedInstance, updates);
    onClose();
  }, [
    enabled,
    thresholdType,
    minValue,
    maxValue,
    warningValue,
    audioEnabled,
    soundPattern,
    selectedSensorType,
    selectedInstance,
    presentation,
    updateSensorThresholds,
    onClose,
  ]);
  
  // Display unit symbol
  const unitSymbol = presentation.isValid
    ? presentation.presentation?.symbol || ''
    : '';
  
  // Render instance tabs using FlatList
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
                key={inst.instance}
                style={[
                  styles.tab,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setSelectedInstance(inst.instance)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? '#FFFFFF' : theme.text },
                  ]}
                >
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
    
    return (
      <View style={[styles.pickerContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>Sensor</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Picker
            selectedValue={selectedSensorType || ''}
            onValueChange={(value) => {
              if (value) {
                setSelectedSensorType(value as SensorType);
                const newInstances = getSensorInstances(value as SensorType);
                setSelectedInstance(newInstances.length > 0 ? newInstances[0].instance : 0);
              }
            }}
            style={[
              styles.picker,
              { color: theme.text },
              Platform.OS === 'web' && styles.pickerWeb,
            ]}
          >
            <Picker.Item
              label="Select a sensor..."
              value=""
            />
            {availableSensorTypes.map((type) => {
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              return (
                <Picker.Item
                  key={type}
                  label={label}
                  value={type}
                />
              );
            })}
          </Picker>
        </View>
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
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
          >
            <UniversalIcon name="arrow-back" size={24} color={theme.text} />
            <Text style={[styles.backButtonText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alarm Configuration</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* No sensors detected at all */}
        {availableSensorTypes.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <UniversalIcon name="alert-circle-outline" size={64} color={theme.textSecondary} />
              <Text style={styles.emptyText}>
                No Sensors Detected
              </Text>
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
                  <UniversalIcon name="alert-circle-outline" size={48} color={theme.textSecondary} />
                  <Text style={styles.emptyText}>
                    No {selectedSensorType} sensors detected
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Switch to another sensor type or start NMEA data stream
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
            
            {/* Configuration form - only show when sensor selected */}
            {selectedSensorType && instances.length > 0 && (
          <>
            {/* Enable/Disable Switch */}
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <PlatformToggle
                value={enabled}
                onValueChange={handleEnabledChange}
                label="Enable Alarms"
              />
              {isCriticalSensor(selectedSensorType) && (
                <Text style={[styles.hint, { color: theme.textSecondary, marginTop: 8 }]}>
                  Critical safety alarm - confirmation required to disable
                </Text>
              )}
              {thresholdType === 'min' && (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  Critical alarm triggers when value falls below threshold
                </Text>
              )}
              {thresholdType === 'max' && (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  Critical alarm triggers when value exceeds threshold
                </Text>
              )}
            </View>
            
            {/* Threshold Configuration */}
            {enabled && (
              <>
                {/* Threshold Type Selection */}
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Threshold Type</Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        { borderColor: theme.border },
                        thresholdType === 'min' && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => setThresholdType('min')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: theme.text },
                          thresholdType === 'min' && { color: '#FFFFFF' },
                        ]}
                      >
                        Minimum
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        { borderColor: theme.border },
                        thresholdType === 'max' && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => setThresholdType('max')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: theme.text },
                          thresholdType === 'max' && { color: '#FFFFFF' },
                        ]}
                      >
                        Maximum
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Threshold Values with +/- Controls */}
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Threshold Configuration</Text>
                  
                  {/* Minimum Value */}
                  {thresholdType === 'min' && (
                    <View style={styles.thresholdSection}>
                      <Text style={[styles.thresholdLabel, { color: theme.text }]}>
                        Critical Minimum ({unitSymbol})
                      </Text>
                      <View style={styles.thresholdControl}>
                        <Pressable
                          style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => {
                            const current = parseFloat(minValue) || 0;
                            setMinValue((current - 0.5).toFixed(1));
                          }}
                        >
                          <Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text>
                        </Pressable>
                        <TextInput
                          style={[styles.thresholdInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                          value={minValue}
                          onChangeText={setMinValue}
                          keyboardType="numeric"
                          placeholder="0.0"
                          placeholderTextColor={theme.textSecondary}
                        />
                        <Pressable
                          style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => {
                            const current = parseFloat(minValue) || 0;
                            setMinValue((current + 0.5).toFixed(1));
                          }}
                        >
                          <Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={[styles.hint, { color: theme.textSecondary }]}>
                        Alarm triggers when value drops below this threshold
                      </Text>
                    </View>
                  )}
                  
                  {/* Maximum Value */}
                  {thresholdType === 'max' && (
                    <View style={styles.thresholdSection}>
                      <Text style={[styles.thresholdLabel, { color: theme.text }]}>
                        Critical Maximum ({unitSymbol})
                      </Text>
                      <View style={styles.thresholdControl}>
                        <Pressable
                          style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => {
                            const current = parseFloat(maxValue) || 0;
                            setMaxValue((current - 0.5).toFixed(1));
                          }}
                        >
                          <Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text>
                        </Pressable>
                        <TextInput
                          style={[styles.thresholdInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                          value={maxValue}
                          onChangeText={setMaxValue}
                          keyboardType="numeric"
                          placeholder="0.0"
                          placeholderTextColor={theme.textSecondary}
                        />
                        <Pressable
                          style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                          onPress={() => {
                            const current = parseFloat(maxValue) || 0;
                            setMaxValue((current + 0.5).toFixed(1));
                          }}
                        >
                          <Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={[styles.hint, { color: theme.textSecondary }]}>
                        Alarm triggers when value exceeds this threshold
                      </Text>
                    </View>
                  )}
            
                  {/* Warning Value */}
                  <View style={styles.thresholdSection}>
                    <Text style={[styles.thresholdLabel, { color: theme.text }]}>
                      Warning Threshold ({unitSymbol})
                    </Text>
                    <View style={styles.thresholdControl}>
                      <Pressable
                        style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => {
                          const current = parseFloat(warningValue) || 0;
                          setWarningValue((current - 0.5).toFixed(1));
                        }}
                      >
                        <Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text>
                      </Pressable>
                      <TextInput
                        style={[styles.thresholdInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                        value={warningValue}
                        onChangeText={setWarningValue}
                        keyboardType="numeric"
                        placeholder="Optional"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <Pressable
                        style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => {
                          const current = parseFloat(warningValue) || 0;
                          setWarningValue((current + 0.5).toFixed(1));
                        }}
                      >
                        <Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>
                      Optional pre-warning before critical threshold
                    </Text>
                  </View>
                </View>

                {/* Audio Alerts */}
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <PlatformToggle
                    value={audioEnabled}
                    onValueChange={setAudioEnabled}
                    label="Audio Alerts"
                  />
                  <Text style={[styles.hint, { color: theme.textSecondary }]}>
                    Play sound when alarm triggers
                  </Text>
                </View>

                {/* Sound Pattern Selection */}
                {audioEnabled && (
                  <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Alarm Sound Pattern</Text>
                    
                    {SOUND_PATTERNS.map((pattern) => (
                      <TouchableOpacity
                        key={pattern.value}
                        style={styles.radioOption}
                        onPress={() => setSoundPattern(pattern.value)}
                      >
                        <View style={[styles.radioCircle, { borderColor: theme.border }]}>
                          {soundPattern === pattern.value && (
                            <View style={[styles.radioSelected, { backgroundColor: theme.primary }]} />
                          )}
                        </View>
                        <View style={styles.radioLabel}>
                          <Text style={[styles.radioText, { color: theme.text }]}>{pattern.label}</Text>
                          <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                            {pattern.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}

                    {/* Test Sound Button */}
                    <TouchableOpacity
                      style={[styles.testButton, { backgroundColor: theme.primary }]}
                      onPress={handleTestSound}
                      disabled={isTestingSound}
                    >
                      <UniversalIcon 
                        name={isTestingSound ? "volume-high" : "volume-medium-outline"} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.testButtonText}>
                        {isTestingSound ? 'Playing...' : 'Test Alarm Sound'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Initialize Defaults Button */}
                <TouchableOpacity
                  style={[styles.defaultsButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={handleInitializeDefaults}
                >
                  <UniversalIcon name="refresh-outline" size={20} color={theme.primary} />
                  <Text style={[styles.defaultsButtonText, { color: theme.primary }]}>Load Default Thresholds</Text>
                </TouchableOpacity>
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
        <Pressable
          style={styles.confirmBackdrop}
          onPress={cancelDisable}
        >
          <Pressable
            style={[styles.confirmDialog, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.confirmTitle, { color: theme.text }]}>
              Disable Critical Alarm?
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              {selectedSensorType?.toUpperCase()} alarms are critical for vessel safety. Disabling this alarm may put your vessel at risk.{' \n\n'}
              Are you sure you want to disable this alarm?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, styles.confirmButtonCancel, { backgroundColor: theme.border }]}
                onPress={cancelDisable}
              >
                <Text style={[styles.confirmButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, styles.confirmButtonDisable, { backgroundColor: theme.error }]}
                onPress={confirmDisable}
              >
                <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
                  Disable
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    )}
  </>);
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
    pickerWrapper: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 8,
      overflow: 'hidden',
    },
    picker: {
      height: 44,
    },
    pickerWeb: {
      // Web-specific picker styling for better appearance and theming
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      cursor: 'pointer',
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      backgroundColor: theme.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
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
      color: '#FFFFFF',
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
  });

export default AlarmConfigDialog;
