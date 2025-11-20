/**
 * Alarm List Screen
 * Story 4.1: Critical Safety Alarms - List View
 * 
 * Clean list of all alarms with quick toggle and navigation to detail screens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/store/themeStore';
import { UniversalIcon } from '../../src/components/atoms/UniversalIcon';
import { CriticalAlarmConfiguration } from '../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType, CriticalAlarmConfig } from '../../src/services/alarms/types';

// Use shared singleton instance
const alarmConfig = CriticalAlarmConfiguration.getInstance();

// Alarm list configuration
const ALARM_LIST = [
  {
    type: CriticalAlarmType.SHALLOW_WATER,
    label: 'Shallow Water',
    iconName: 'arrow-down-outline',
    unit: 'm',
  },
  {
    type: CriticalAlarmType.ENGINE_OVERHEAT,
    label: 'Engine Overheat',
    iconName: 'thermometer-outline',
    unit: '°C',
  },
  {
    type: CriticalAlarmType.LOW_BATTERY,
    label: 'Low Battery',
    iconName: 'battery-charging-outline',
    unit: 'V',
  },
  {
    type: CriticalAlarmType.AUTOPILOT_FAILURE,
    label: 'Autopilot Failure',
    iconName: 'swap-horizontal-outline',
    unit: '',
  },
  {
    type: CriticalAlarmType.GPS_LOSS,
    label: 'GPS Signal Loss',
    iconName: 'navigate-outline',
    unit: 's',
  },
];

export default function AlarmListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Map<CriticalAlarmType, CriticalAlarmConfig>>(new Map());

  // Load all alarm configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  // Reload configurations when screen comes into focus (e.g., returning from detail screen)
  useFocusEffect(
    React.useCallback(() => {
      loadConfigurations();
    }, [])
  );

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const loadedConfigs = new Map<CriticalAlarmType, CriticalAlarmConfig>();

      for (const alarm of ALARM_LIST) {
        const config = alarmConfig.getAlarmConfig(alarm.type);
        if (config) {
          loadedConfigs.set(alarm.type, config);
        }
      }

      setConfigs(loadedConfigs);
    } catch (error) {
      console.error('[AlarmList] Failed to load configurations:', error);
      Alert.alert('Error', 'Failed to load alarm settings');
    } finally {
      setLoading(false);
    }
  };

  // Quick toggle from list view
  const handleQuickToggle = async (type: CriticalAlarmType, enabled: boolean) => {
    if (!enabled && type === CriticalAlarmType.SHALLOW_WATER) {
      Alert.alert(
        'Critical Safety Alarm',
        'This alarm cannot be disabled for safety compliance.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await alarmConfig.setAlarmEnabled(type, enabled);
      if (result.success) {
        setConfigs(prev => {
          const updated = new Map(prev);
          const config = updated.get(type);
          if (config) {
            updated.set(type, { ...config, enabled });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('[AlarmList] Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  // Navigate to detail screen
  const handleNavigateToDetail = (type: CriticalAlarmType) => {
    router.push({
      pathname: '/settings/alarm-detail',
      params: { type },
    });
  };

  // Reset all alarms to defaults
  const handleResetAll = () => {
    Alert.alert(
      'Reset All Alarms',
      'Are you sure you want to reset all alarm settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const alarm of ALARM_LIST) {
                await alarmConfig.resetToDefault(alarm.type);
              }
              await loadConfigurations();
              Alert.alert('Success', 'All alarms reset to defaults', [{ text: 'OK' }]);
            } catch (error) {
              console.error('[AlarmList] Failed to reset:', error);
              Alert.alert('Error', 'Failed to reset alarms');
            }
          },
        },
      ]
    );
  };

  // Get alarm summary text
  const getAlarmSummary = (type: CriticalAlarmType, config: CriticalAlarmConfig | undefined): string => {
    if (!config) return 'Not configured';
    if (!config.enabled) return ''; // Empty string - status shown by dot

    const alarm = ALARM_LIST.find(a => a.type === type);
    if (!alarm) return '';

    if (type === CriticalAlarmType.AUTOPILOT_FAILURE) {
      return '';
    }

    return `Alert: ${config.thresholds.critical}${alarm.unit}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alarms...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Alarms',
          headerBackTitle: 'Settings',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Description */}
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Tap any alarm to customize its settings.
        </Text>

        {/* Alarm List */}
        {ALARM_LIST.map((alarm) => {
          const config = configs.get(alarm.type);
          const summary = getAlarmSummary(alarm.type, config);

          return (
            <Pressable
              key={alarm.type}
              style={[styles.alarmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleNavigateToDetail(alarm.type)}
            >
              <View style={styles.alarmContent}>
                <UniversalIcon name={alarm.iconName} size={20} color={theme.textSecondary} style={styles.alarmIcon} />
                <View style={styles.alarmInfo}>
                  <Text style={[styles.alarmLabel, { color: theme.text }]}>
                    {alarm.label} <Text style={[styles.alarmSummary, { color: theme.textSecondary }]}>{summary}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.alarmActions}>
                {/* Status indicator: green=enabled, gray=disabled, red=alarm active */}
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: config?.enabled ? theme.success || '#10B981' : theme.textSecondary }
                  ]} 
                />
                <UniversalIcon name="chevron-forward-outline" size={20} color={theme.textSecondary} style={styles.chevron} />
              </View>
            </Pressable>
          );
        })}

        {/* Reset All Button */}
        <Pressable style={styles.resetButton} onPress={handleResetAll}>
          <Text style={[styles.resetButtonText, { color: theme.primary || '#007AFF' }]}>Reset</Text>
        </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alarmIcon: {
    marginRight: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  alarmSummary: {
    fontSize: 14,
    fontWeight: '400',
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chevron: {
    marginLeft: 4,
  },
  resetButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resetButtonText: {
    fontSize: 16,
  },
  notice: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
