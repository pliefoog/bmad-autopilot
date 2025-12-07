/**
 * Alarm Configuration Dialog - MINIMAL DEBUG VERSION
 * Incrementally add functionality to isolate text node issues
 */

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { ThemedSwitch } from '../atoms/ThemedSwitch';
import { CriticalAlarmType, CriticalAlarmConfig } from '../../services/alarms/types';
import { CriticalAlarmConfiguration } from '../../services/alarms/CriticalAlarmConfiguration';
import { useDataPresentation } from '../../presentation/useDataPresentation';
import { MarineAudioAlertManager } from '../../services/alarms/MarineAudioAlertManager';

// Use shared singleton instance
const alarmConfig = CriticalAlarmConfiguration.getInstance();
const audioManager = MarineAudioAlertManager.getInstance();

type ViewMode = 'list' | 'detail';

interface AlarmMetadata {
  label: string;
  description: string;
  iconName: string;
  baseUnit: string;
  hasMin: boolean;
  hasMax: boolean;
  hasWarning: boolean;
  minLabel?: string;
  maxLabel?: string;
  warningLabel?: string;
  minRange: { min: number; max: number; default: number };
  maxRange: { min: number; max: number; default: number };
  warningRange: { min: number; max: number; default: number };
  defaultPattern: 'rapid_pulse' | 'warble' | 'intermittent' | 'triple_blast' | 'morse_u' | 'continuous_descending';
  patternDescription: string;
  allowDecimals?: boolean;
}

const ALARM_METADATA: Record<string, AlarmMetadata> = {
  [CriticalAlarmType.SHALLOW_WATER]: { label: 'Shallow Water', description: 'Alert when depth falls below configured threshold. Critical for preventing grounding in shallow waters.', iconName: 'arrow-down-outline', baseUnit: 'm', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Critical Minimum Depth', warningLabel: 'Warning Depth', minRange: { min: 0.5, max: 10.0, default: 2.0 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 1.0, max: 15.0, default: 2.5 }, defaultPattern: 'rapid_pulse', patternDescription: 'Rapid pulse - ISO Priority 1 immediate danger', allowDecimals: true },
  [CriticalAlarmType.DEEP_WATER]: { label: 'Deep Water', description: 'Alert when depth exceeds configured threshold. Useful for inland/coastal navigation.', iconName: 'arrow-up-outline', baseUnit: 'm', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Depth', warningLabel: 'Warning Depth', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 20.0, max: 100.0, default: 50.0 }, warningRange: { min: 15.0, max: 80.0, default: 30.0 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Information alert', allowDecimals: true },
  [CriticalAlarmType.HIGH_SPEED]: { label: 'High Speed', description: 'Alert when vessel speed exceeds safe operating limit.', iconName: 'speedometer-outline', baseUnit: 'm/s', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Speed', warningLabel: 'Warning Speed', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 10.0, max: 50.0, default: 25.0 }, warningRange: { min: 8.0, max: 45.0, default: 20.0 }, defaultPattern: 'warble', patternDescription: 'Warble - Equipment warning', allowDecimals: true },
  [CriticalAlarmType.ENGINE_OVERHEAT]: { label: 'Engine Overheat', description: 'Alert when engine temperature exceeds safe operating limits. Prevents engine damage from overheating.', iconName: 'thermometer-outline', baseUnit: '°C', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Temperature', warningLabel: 'Warning Temperature', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 80, max: 120, default: 95 }, warningRange: { min: 75, max: 110, default: 85 }, defaultPattern: 'warble', patternDescription: 'Warble - ISO Priority 3 equipment warning', allowDecimals: false },
  [CriticalAlarmType.ENGINE_LOW_TEMP]: { label: 'Engine Low Temperature', description: 'Alert when engine temperature is below normal operating range.', iconName: 'thermometer-outline', baseUnit: '°C', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Minimum Temperature', warningLabel: 'Warning Temperature', minRange: { min: 20, max: 60, default: 40 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 30, max: 70, default: 50 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Information', allowDecimals: false },
  [CriticalAlarmType.ENGINE_HIGH_RPM]: { label: 'Engine High RPM', description: 'Alert when engine RPM exceeds safe operating limit.', iconName: 'speedometer-outline', baseUnit: 'rpm', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum RPM', warningLabel: 'Warning RPM', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 2000, max: 5000, default: 3600 }, warningRange: { min: 1800, max: 4500, default: 3300 }, defaultPattern: 'rapid_pulse', patternDescription: 'Rapid pulse - Machinery protection', allowDecimals: false },
  [CriticalAlarmType.ENGINE_LOW_OIL_PRESSURE]: { label: 'Low Oil Pressure', description: 'Critical alert for low engine oil pressure. Immediate attention required.', iconName: 'water-outline', baseUnit: 'PSI', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Critical Minimum Pressure', warningLabel: 'Warning Pressure', minRange: { min: 10, max: 40, default: 20 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 15, max: 50, default: 30 }, defaultPattern: 'rapid_pulse', patternDescription: 'Rapid pulse - Critical machinery alarm', allowDecimals: false },
  [CriticalAlarmType.LOW_BATTERY]: { label: 'Low Battery', description: 'Alert when battery voltage drops below safe level. Ensures sufficient power for critical systems.', iconName: 'battery-dead-outline', baseUnit: 'V', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Critical Minimum Voltage', warningLabel: 'Warning Voltage', minRange: { min: 10.0, max: 12.5, default: 11.0 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 11.0, max: 13.0, default: 12.0 }, defaultPattern: 'triple_blast', patternDescription: 'Triple blast - General alert pattern', allowDecimals: true },
  [CriticalAlarmType.HIGH_BATTERY]: { label: 'High Battery', description: 'Alert when battery voltage exceeds safe limit. Indicates overcharging.', iconName: 'battery-charging-outline', baseUnit: 'V', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Voltage', warningLabel: 'Warning Voltage', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 14.0, max: 16.0, default: 15.0 }, warningRange: { min: 13.5, max: 15.5, default: 14.5 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Equipment warning', allowDecimals: true },
  [CriticalAlarmType.LOW_ALTERNATOR]: { label: 'Low Alternator Output', description: 'Alert when alternator output voltage is below expected charging level.', iconName: 'flash-outline', baseUnit: 'V', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Minimum Alternator Voltage', warningLabel: 'Warning Voltage', minRange: { min: 12.5, max: 14.0, default: 13.0 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 13.0, max: 14.5, default: 13.5 }, defaultPattern: 'triple_blast', patternDescription: 'Triple blast - Charging system alert', allowDecimals: true },
  [CriticalAlarmType.HIGH_CURRENT]: { label: 'High Current Draw', description: 'Alert when electrical current draw exceeds safe limit.', iconName: 'flash-outline', baseUnit: 'A', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Current', warningLabel: 'Warning Current', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 50, max: 300, default: 150 }, warningRange: { min: 40, max: 250, default: 120 }, defaultPattern: 'warble', patternDescription: 'Warble - Electrical system warning', allowDecimals: false },
  [CriticalAlarmType.HIGH_WIND]: { label: 'High Wind Speed', description: 'Alert when wind speed exceeds safe operating conditions.', iconName: 'cloudy-outline', baseUnit: 'm/s', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Wind Speed', warningLabel: 'Warning Wind Speed', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 20, max: 60, default: 35 }, warningRange: { min: 15, max: 50, default: 25 }, defaultPattern: 'warble', patternDescription: 'Warble - Weather warning', allowDecimals: true },
  [CriticalAlarmType.WIND_GUST]: { label: 'Wind Gust', description: 'Alert on sudden wind gusts that may affect vessel stability.', iconName: 'cloudy-outline', baseUnit: 'm/s', hasMin: false, hasMax: true, hasWarning: false, maxLabel: 'Maximum Gust Speed', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 25, max: 70, default: 45 }, warningRange: { min: 0, max: 0, default: 9999 }, defaultPattern: 'rapid_pulse', patternDescription: 'Rapid pulse - Immediate weather threat', allowDecimals: false },
  [CriticalAlarmType.AUTOPILOT_FAILURE]: { label: 'Autopilot Failure', description: 'Alert on autopilot disconnection or malfunction. Critical for safe navigation when using autopilot.', iconName: 'swap-horizontal-outline', baseUnit: '', hasMin: false, hasMax: false, hasWarning: false, minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 0, max: 0, default: 9999 }, defaultPattern: 'morse_u', patternDescription: 'Morse "U" - Maritime standard for "You are in danger"', allowDecimals: false },
  [CriticalAlarmType.GPS_LOSS]: { label: 'GPS Signal Loss', description: 'Alert when GPS signal quality degrades or is lost. Essential for navigation safety.', iconName: 'navigate-outline', baseUnit: 's', hasMin: false, hasMax: true, hasWarning: false, maxLabel: 'Signal Loss Timeout', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 5, max: 60, default: 10 }, warningRange: { min: 0, max: 0, default: 9999 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Navigation system alert', allowDecimals: false },
  [CriticalAlarmType.LOW_FUEL]: { label: 'Low Fuel Level', description: 'Alert when fuel level drops below safe reserve.', iconName: 'beaker-outline', baseUnit: '%', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Critical Minimum Level', warningLabel: 'Warning Level', minRange: { min: 5, max: 30, default: 10 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 10, max: 40, default: 25 }, defaultPattern: 'triple_blast', patternDescription: 'Triple blast - Fuel system alert', allowDecimals: false },
  [CriticalAlarmType.LOW_WATER]: { label: 'Low Fresh Water', description: 'Alert when fresh water tank level is low.', iconName: 'water-outline', baseUnit: '%', hasMin: true, hasMax: false, hasWarning: true, minLabel: 'Critical Minimum Level', warningLabel: 'Warning Level', minRange: { min: 5, max: 30, default: 10 }, maxRange: { min: 0, max: 0, default: 9999 }, warningRange: { min: 10, max: 40, default: 25 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Tank level alert', allowDecimals: false },
  [CriticalAlarmType.HIGH_WASTE_WATER]: { label: 'High Waste Water', description: 'Alert when waste water tank is approaching full capacity.', iconName: 'warning-outline', baseUnit: '%', hasMin: false, hasMax: true, hasWarning: true, maxLabel: 'Maximum Level', warningLabel: 'Warning Level', minRange: { min: 0, max: 0, default: 9999 }, maxRange: { min: 70, max: 95, default: 90 }, warningRange: { min: 60, max: 90, default: 75 }, defaultPattern: 'intermittent', patternDescription: 'Intermittent - Tank level alert', allowDecimals: false },
};

// Alarm list configuration - ALL 19 alarm types organized by category
const ALARM_CATEGORIES = [
  {
    title: 'Navigation',
    alarms: [
      { type: CriticalAlarmType.SHALLOW_WATER, label: 'Shallow Water', iconName: 'arrow-down-outline' },
      { type: CriticalAlarmType.DEEP_WATER, label: 'Deep Water', iconName: 'arrow-up-outline' },
      { type: CriticalAlarmType.HIGH_SPEED, label: 'High Speed', iconName: 'speedometer-outline' },
    ],
  },
  {
    title: 'Engine',
    alarms: [
      { type: CriticalAlarmType.ENGINE_OVERHEAT, label: 'Engine Overheat', iconName: 'thermometer-outline' },
      { type: CriticalAlarmType.ENGINE_LOW_TEMP, label: 'Engine Low Temp', iconName: 'thermometer-outline' },
      { type: CriticalAlarmType.ENGINE_HIGH_RPM, label: 'Engine High RPM', iconName: 'speedometer-outline' },
      { type: CriticalAlarmType.ENGINE_LOW_OIL_PRESSURE, label: 'Low Oil Pressure', iconName: 'water-outline' },
    ],
  },
  {
    title: 'Electrical',
    alarms: [
      { type: CriticalAlarmType.LOW_BATTERY, label: 'Low Battery', iconName: 'battery-dead-outline' },
      { type: CriticalAlarmType.HIGH_BATTERY, label: 'High Battery', iconName: 'battery-charging-outline' },
      { type: CriticalAlarmType.LOW_ALTERNATOR, label: 'Low Alternator', iconName: 'flash-outline' },
      { type: CriticalAlarmType.HIGH_CURRENT, label: 'High Current', iconName: 'flash-outline' },
    ],
  },
  {
    title: 'Wind',
    alarms: [
      { type: CriticalAlarmType.HIGH_WIND, label: 'High Wind', iconName: 'cloudy-outline' },
      { type: CriticalAlarmType.WIND_GUST, label: 'Wind Gust', iconName: 'cloudy-outline' },
    ],
  },
  {
    title: 'System',
    alarms: [
      { type: CriticalAlarmType.AUTOPILOT_FAILURE, label: 'Autopilot Failure', iconName: 'swap-horizontal-outline' },
      { type: CriticalAlarmType.GPS_LOSS, label: 'GPS Signal Loss', iconName: 'navigate-outline' },
    ],
  },
  {
    title: 'Tanks',
    alarms: [
      { type: CriticalAlarmType.LOW_FUEL, label: 'Low Fuel', iconName: 'beaker-outline' },
      { type: CriticalAlarmType.LOW_WATER, label: 'Low Fresh Water', iconName: 'water-outline' },
      { type: CriticalAlarmType.HIGH_WASTE_WATER, label: 'High Waste Water', iconName: 'warning-outline' },
    ],
  },
];

// Critical alarms that require confirmation before disabling
const CRITICAL_ALARMS: CriticalAlarmType[] = [
  CriticalAlarmType.SHALLOW_WATER,
  CriticalAlarmType.ENGINE_OVERHEAT,
  CriticalAlarmType.ENGINE_LOW_OIL_PRESSURE,
  CriticalAlarmType.LOW_BATTERY,
  CriticalAlarmType.AUTOPILOT_FAILURE,
  CriticalAlarmType.GPS_LOSS,
];

interface AlarmConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const AlarmConfigDialog: React.FC<AlarmConfigDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const depthPresentation = useDataPresentation('depth');
  const speedPresentation = useDataPresentation('speed');
  const tempPresentation = useDataPresentation('temperature');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAlarmType, setSelectedAlarmType] = useState<CriticalAlarmType | null>(null);
  const [configs, setConfigs] = useState<Map<CriticalAlarmType, CriticalAlarmConfig>>(new Map());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDisableCriticalConfirm, setShowDisableCriticalConfirm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<CriticalAlarmConfig | null>(null);

  // Convert value from base unit to display unit
  const convertToDisplayUnit = (value: number | undefined, baseUnit: string): { value: string; unit: string } => {
    if (value === undefined) return { value: 'N/A', unit: baseUnit };
    
    switch (baseUnit) {
      case 'm':
        const converted = depthPresentation.convert(value);
        return { value: converted.toFixed(1), unit: depthPresentation.presentation?.symbol || 'm' };
      case 'm/s':
        const convertedSpeed = speedPresentation.convert(value);
        return { value: convertedSpeed.toFixed(1), unit: speedPresentation.presentation?.symbol || 'kts' };
      case '°C':
        const convertedTemp = tempPresentation.convert(value);
        return { value: convertedTemp.toFixed(0), unit: tempPresentation.presentation?.symbol || '°C' };
      case 'V':
        return { value: value.toFixed(1), unit: 'V' };
      case 'A':
        return { value: value.toFixed(0), unit: 'A' };
      case 'PSI':
        return { value: value.toFixed(0), unit: 'PSI' };
      case 'rpm':
        return { value: value.toFixed(0), unit: 'rpm' };
      case '%':
        return { value: value.toFixed(0), unit: '%' };
      case 's':
        return { value: value.toFixed(0), unit: 's' };
      default:
        return { value: value.toString(), unit: baseUnit };
    }
  };

  // Load all alarm configurations
  useEffect(() => {
    if (visible) {
      loadConfigurations();
    }
  }, [visible]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const loadedConfigs = new Map<CriticalAlarmType, CriticalAlarmConfig>();
      
      // Flatten all alarms from categories
      const allAlarms = ALARM_CATEGORIES.flatMap(cat => cat.alarms);
      
      for (const alarm of allAlarms) {
        const config = alarmConfig.getAlarmConfig(alarm.type);
        if (config) {
          loadedConfigs.set(alarm.type, config);
        }
      }

      setConfigs(loadedConfigs);
      console.log(`Loaded ${loadedConfigs.size} alarm configurations`);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlarmClick = (alarmType: CriticalAlarmType, label: string) => {
    const alarmCfg = configs.get(alarmType);
    if (alarmCfg) {
      setSelectedAlarmType(alarmType);
      setCurrentConfig(alarmCfg);
      setViewMode('detail');
      console.log('Navigating to detail view for:', label, alarmCfg);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAlarmType(null);
    setCurrentConfig(null);
  };

  const handleToggleEnabled = async (value: boolean) => {
    if (!selectedAlarmType || !currentConfig) return;
    
    // Check if disabling a critical alarm
    if (!value && CRITICAL_ALARMS.includes(selectedAlarmType)) {
      setShowDisableCriticalConfirm(true);
      return;
    }
    
    try {
      const updatedConfig = { ...currentConfig, enabled: value };
      await alarmConfig.updateAlarmConfig(selectedAlarmType, updatedConfig);
      setCurrentConfig(updatedConfig);
      const updatedConfigs = new Map(configs);
      updatedConfigs.set(selectedAlarmType, updatedConfig);
      setConfigs(updatedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to toggle alarm:', error);
    }
  };

  const handleThresholdChange = async (type: 'min' | 'max' | 'warning', value: number) => {
    if (!selectedAlarmType || !currentConfig) return;
    try {
      const updatedThresholds = { ...currentConfig.thresholds, [type]: value };
      
      // Validate warning is between min and max
      const metadata = ALARM_METADATA[selectedAlarmType];
      if (metadata.hasWarning && metadata.hasMin && metadata.hasMax) {
        const min = updatedThresholds.min ?? metadata.minRange.default;
        const max = updatedThresholds.max ?? metadata.maxRange.default;
        const warning = updatedThresholds.warning ?? metadata.warningRange.default;
        
        if (warning < min || warning > max) {
          if (Platform.OS === 'web') {
            window.alert(`Warning threshold must be between minimum (${min}) and maximum (${max})`);
          } else {
            Alert.alert('Invalid Threshold', `Warning threshold must be between minimum (${min}) and maximum (${max})`);
          }
          return;
        }
      }
      
      const updatedConfig = { ...currentConfig, thresholds: updatedThresholds };
      await alarmConfig.updateAlarmConfig(selectedAlarmType, updatedConfig);
      setCurrentConfig(updatedConfig);
      const updatedConfigs = new Map(configs);
      updatedConfigs.set(selectedAlarmType, updatedConfig);
      setConfigs(updatedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to update threshold:', error);
    }
  };

  const adjustThreshold = (type: 'min' | 'max' | 'warning', delta: number) => {
    if (!selectedAlarmType || !currentConfig) return;
    const metadata = ALARM_METADATA[selectedAlarmType];
    const currentValue = currentConfig.thresholds?.[type] ?? metadata[`${type}Range`].default;
    const range = metadata[`${type}Range`];
    const newValue = Math.max(range.min, Math.min(range.max, currentValue + delta));
    handleThresholdChange(type, newValue);
  };

  const handleToggleAudio = async (value: boolean) => {
    if (!selectedAlarmType || !currentConfig) return;
    try {
      const updatedConfig = { ...currentConfig, audioEnabled: value };
      await alarmConfig.updateAlarmConfig(selectedAlarmType, updatedConfig);
      setCurrentConfig(updatedConfig);
      const updatedConfigs = new Map(configs);
      updatedConfigs.set(selectedAlarmType, updatedConfig);
      setConfigs(updatedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to toggle audio:', error);
    }
  };

  const handlePatternChange = async (pattern: string) => {
    if (!selectedAlarmType || !currentConfig) return;
    try {
      const updatedConfig = { ...currentConfig, audioPattern: pattern as any };
      await alarmConfig.updateAlarmConfig(selectedAlarmType, updatedConfig);
      setCurrentConfig(updatedConfig);
      const updatedConfigs = new Map(configs);
      updatedConfigs.set(selectedAlarmType, updatedConfig);
      setConfigs(updatedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to update pattern:', error);
    }
  };

  const handleTestSound = async () => {
    if (!selectedAlarmType || !currentConfig) return;
    try {
      await audioManager.testAlarmSound(selectedAlarmType, 1, 3000, currentConfig.audioPattern);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to test sound:', error);
    }
  };

  const handleClose = () => {
    if (viewMode === 'detail') {
      handleBackToList();
    } else {
      onClose();
    }
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    try {
      const allAlarms = ALARM_CATEGORIES.flatMap(cat => cat.alarms);
      for (const alarm of allAlarms) {
        await alarmConfig.resetToDefault(alarm.type);
      }
      await loadConfigurations();
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to reset:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to reset alarms');
      } else {
        Alert.alert('Error', 'Failed to reset alarms');
      }
    }
  };

  const confirmDisableCritical = async () => {
    setShowDisableCriticalConfirm(false);
    if (!selectedAlarmType || !currentConfig) return;
    try {
      const updatedConfig = { ...currentConfig, enabled: false };
      await alarmConfig.updateAlarmConfig(selectedAlarmType, updatedConfig);
      setCurrentConfig(updatedConfig);
      const updatedConfigs = new Map(configs);
      updatedConfigs.set(selectedAlarmType, updatedConfig);
      setConfigs(updatedConfigs);
    } catch (error) {
      console.error('[AlarmConfigDialog] Failed to disable critical alarm:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={viewMode === 'detail' ? handleBackToList : handleClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>{viewMode === 'detail' ? 'Back' : 'Done'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{viewMode === 'detail' && selectedAlarmType && ALARM_METADATA[selectedAlarmType] ? ALARM_METADATA[selectedAlarmType].label : 'Alarm Configuration'}</Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {viewMode === 'detail' ? (
            <View style={styles.detailView}>
              {currentConfig && selectedAlarmType && ALARM_METADATA[selectedAlarmType] && (
                <>
                  <View style={[styles.detailHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.detailIconContainer, { backgroundColor: theme.primary }]}><UniversalIcon name={ALARM_METADATA[selectedAlarmType].iconName} size={32} color={theme.background} /></View>
                    <View style={styles.detailHeaderTextContainer}>
                      <Text style={[styles.detailHeaderTitle, { color: theme.text }]}>{ALARM_METADATA[selectedAlarmType].label}</Text>
                      <Text style={[styles.detailHeaderDescription, { color: theme.textSecondary }]}>{ALARM_METADATA[selectedAlarmType].description}</Text>
                    </View>
                  </View>
                  <View style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 12 }]}>
                    <Text style={[styles.alarmLabel, { color: theme.text }]}>Alarm Enabled</Text>
                    <ThemedSwitch value={currentConfig.enabled} onValueChange={handleToggleEnabled} />
                  </View>
                  {currentConfig.enabled && (
                    <>
                      <View style={[styles.thresholdSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Alarm Thresholds</Text>
                        {ALARM_METADATA[selectedAlarmType].hasMin && (() => {
                          const converted = convertToDisplayUnit(currentConfig.thresholds?.min, ALARM_METADATA[selectedAlarmType].baseUnit);
                          const step = ALARM_METADATA[selectedAlarmType].allowDecimals === false ? 1 : 0.1;
                          return (
                            <View style={styles.thresholdRow}>
                              <Text style={[styles.thresholdLabel, { color: theme.text }]}>{ALARM_METADATA[selectedAlarmType].minLabel || 'Minimum'}</Text>
                              <View style={styles.thresholdInputContainer}>
                                <Pressable onPress={() => adjustThreshold('min', -step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text></Pressable>
                                <Text style={[styles.thresholdValue, { color: theme.text }]}>{converted.value}</Text>
                                <Text style={[styles.thresholdUnit, { color: theme.textSecondary }]}>{converted.unit}</Text>
                                <Pressable onPress={() => adjustThreshold('min', step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text></Pressable>
                              </View>
                            </View>
                          );
                        })()}
                        {ALARM_METADATA[selectedAlarmType].hasMax && (() => {
                          const converted = convertToDisplayUnit(currentConfig.thresholds?.max, ALARM_METADATA[selectedAlarmType].baseUnit);
                          const step = ALARM_METADATA[selectedAlarmType].allowDecimals === false ? 1 : 0.1;
                          return (
                            <View style={styles.thresholdRow}>
                              <Text style={[styles.thresholdLabel, { color: theme.text }]}>{ALARM_METADATA[selectedAlarmType].maxLabel || 'Maximum'}</Text>
                              <View style={styles.thresholdInputContainer}>
                                <Pressable onPress={() => adjustThreshold('max', -step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text></Pressable>
                                <Text style={[styles.thresholdValue, { color: theme.text }]}>{converted.value}</Text>
                                <Text style={[styles.thresholdUnit, { color: theme.textSecondary }]}>{converted.unit}</Text>
                                <Pressable onPress={() => adjustThreshold('max', step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text></Pressable>
                              </View>
                            </View>
                          );
                        })()}
                        {ALARM_METADATA[selectedAlarmType].hasWarning && (() => {
                          const converted = convertToDisplayUnit(currentConfig.thresholds?.warning, ALARM_METADATA[selectedAlarmType].baseUnit);
                          const step = ALARM_METADATA[selectedAlarmType].allowDecimals === false ? 1 : 0.1;
                          return (
                            <View style={styles.thresholdRow}>
                              <Text style={[styles.thresholdLabel, { color: theme.text }]}>{ALARM_METADATA[selectedAlarmType].warningLabel || 'Warning'}</Text>
                              <View style={styles.thresholdInputContainer}>
                                <Pressable onPress={() => adjustThreshold('warning', -step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>−</Text></Pressable>
                                <Text style={[styles.thresholdValue, { color: theme.text }]}>{converted.value}</Text>
                                <Text style={[styles.thresholdUnit, { color: theme.textSecondary }]}>{converted.unit}</Text>
                                <Pressable onPress={() => adjustThreshold('warning', step)} style={[styles.adjustButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.adjustButtonText, { color: theme.text }]}>+</Text></Pressable>
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                      <View style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 12 }]}>
                        <Text style={[styles.alarmLabel, { color: theme.text }]}>Audio Alerts</Text>
                        <ThemedSwitch value={currentConfig.audioEnabled} onValueChange={handleToggleAudio} />
                      </View>
                      {currentConfig.audioEnabled && (
                        <View style={[styles.patternSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound Pattern</Text>
                          {['rapid_pulse', 'morse_u', 'warble', 'triple_blast', 'intermittent', 'continuous_descending'].map((pattern) => {
                            const isDefault = pattern === ALARM_METADATA[selectedAlarmType].defaultPattern;
                            const displayName = pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + (isDefault ? ' (Default)' : '');
                            return (
                              <Pressable key={pattern} onPress={() => handlePatternChange(pattern)} style={[styles.patternOption, { borderColor: theme.border }]}>
                                <View style={[styles.radioButton, { borderColor: theme.text }]}>{currentConfig.audioPattern === pattern && <View style={[styles.radioButtonInner, { backgroundColor: theme.primary }]} />}</View>
                                <Text style={[styles.patternLabel, { color: theme.text }]}>{displayName}</Text>
                              </Pressable>
                            );
                          })}
                          <Pressable onPress={handleTestSound} style={[styles.testSoundButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                            <UniversalIcon name="volume-high-outline" size={20} color={theme.background} />
                            <Text style={[styles.testSoundButtonText, { color: theme.background }]}>Test Sound (3s)</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.text} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alarms...</Text>
            </View>
          ) : (
            <>
              {ALARM_CATEGORIES.map((category) => (
                <View key={category.title} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
                  {category.alarms.map((alarm) => {
                    const alarmCfg = configs.get(alarm.type);
                    const isEnabled = alarmCfg?.enabled ?? false;
                    return (
                      <Pressable key={alarm.type} style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => handleAlarmClick(alarm.type, alarm.label)}>
                        <View style={styles.alarmIcon}><UniversalIcon name={alarm.iconName} size={28} color={theme.text} /></View>
                        <View style={styles.alarmInfo}><Text style={[styles.alarmLabel, { color: theme.text }]}>{alarm.label}</Text></View>
                        <View style={[styles.statusDot, { backgroundColor: isEnabled ? theme.text : theme.textSecondary, opacity: isEnabled ? 1 : 0.4 }]} />
                        <UniversalIcon name="chevron-forward-outline" size={20} color={theme.textSecondary} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <Pressable style={[styles.resetButton, { borderColor: theme.border }]} onPress={handleResetAll}>
                <UniversalIcon name="refresh-outline" size={20} color={theme.error} /><Text style={[styles.resetButtonText, { color: theme.error }]}>Reset All to Defaults</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
      
      {showResetConfirm && (
        <View style={styles.confirmDialogOverlay}><View style={[styles.confirmDialog, { backgroundColor: theme.surface }]}><Text style={[styles.confirmDialogTitle, { color: theme.text }]}>Reset All Alarms</Text><Text style={[styles.confirmDialogMessage, { color: theme.textSecondary }]}>Are you sure you want to reset all alarm settings to their default values?</Text><View style={styles.confirmDialogButtons}><Pressable style={[styles.confirmDialogButton, { backgroundColor: theme.border }]} onPress={() => setShowResetConfirm(false)}><Text style={[styles.confirmDialogButtonText, { color: theme.text }]}>Cancel</Text></Pressable><Pressable style={[styles.confirmDialogButton, { backgroundColor: theme.error }]} onPress={confirmReset}><Text style={[styles.confirmDialogButtonText, { color: '#FFFFFF' }]}>Reset</Text></Pressable></View></View></View>
      )}

      {/* Critical Alarm Disable Confirmation Dialog */}
      {showDisableCriticalConfirm && selectedAlarmType && (
        <View style={styles.confirmDialogOverlay}><View style={[styles.confirmDialog, { backgroundColor: theme.surface }]}><Text style={[styles.confirmDialogTitle, { color: theme.text }]}>Disable Critical Alarm?</Text><Text style={[styles.confirmDialogMessage, { color: theme.textSecondary }]}>This is a critical safety alarm. Disabling it may put your vessel at risk. Are you sure you want to continue?</Text><View style={styles.confirmDialogButtons}><Pressable style={[styles.confirmDialogButton, { backgroundColor: theme.border }]} onPress={() => setShowDisableCriticalConfirm(false)}><Text style={[styles.confirmDialogButtonText, { color: theme.text }]}>Cancel</Text></Pressable><Pressable style={[styles.confirmDialogButton, { backgroundColor: theme.error }]} onPress={confirmDisableCritical}><Text style={[styles.confirmDialogButtonText, { color: '#FFFFFF' }]}>Disable</Text></Pressable></View></View></View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  headerButton: { width: 80, alignItems: 'center' },
  headerButtonText: { fontSize: 17, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  loadingText: { marginTop: 12, fontSize: 16 },
  description: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  alarmCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  alarmIcon: { marginRight: 16 },
  alarmInfo: { flex: 1 },
  alarmLabel: { fontSize: 17, fontWeight: '600' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 10, borderWidth: 1, marginTop: 8, gap: 8 },
  resetButtonText: { fontSize: 16, fontWeight: '500' },
  detailView: { padding: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  detailIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailHeaderTextContainer: { flex: 1 },
  detailHeaderTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  detailHeaderDescription: { fontSize: 15, lineHeight: 22 },
  testText: { fontSize: 14 },
  patternSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  patternDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  patternOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  radioButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  radioButtonInner: { width: 12, height: 12, borderRadius: 6 },
  patternLabel: { fontSize: 16 },
  testSoundButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 16, gap: 8 },
  testSoundButtonText: { fontSize: 16, fontWeight: '600' },
  thresholdSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(128, 128, 128, 0.2)' },
  thresholdLabel: { fontSize: 16, fontWeight: '500', flex: 1 },
  thresholdInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thresholdValue: { fontSize: 16, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  thresholdUnit: { fontSize: 14, minWidth: 40 },
  adjustButton: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  adjustButtonText: { fontSize: 20, fontWeight: '600', lineHeight: 24 },
  confirmDialogOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  confirmDialog: { width: '85%', maxWidth: 400, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  confirmDialogTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  confirmDialogMessage: { fontSize: 16, lineHeight: 24, marginBottom: 24, textAlign: 'center' },
  confirmDialogButtons: { flexDirection: 'row', gap: 12 },
  confirmDialogButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmDialogButtonText: { fontSize: 16, fontWeight: '600' },
});
