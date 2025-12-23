// useAlarmThreshold Hook
// Custom hook for managing alarm thresholds with dynamic configuration and real-time monitoring

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlarmStore } from '../store/alarmStore';
import { useNMEAData } from './useNMEAData';

export interface AlarmThreshold {
  id: string;
  dataType: string;
  name: string;
  minValue?: number;
  maxValue?: number;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  soundEnabled: boolean;
  soundFile?: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  conditions?: {
    duration?: number; // seconds before triggering
    hysteresis?: number; // percent for avoiding rapid toggling
    dependencies?: string[]; // other alarms that must be active
  };
  lastTriggered?: number;
  triggerCount: number;
  isActive: boolean;
}

export interface UseAlarmThresholdOptions {
  // Threshold selection
  thresholdId?: string;
  dataType?: string;

  // Monitoring behavior
  enableRealTimeMonitoring?: boolean;
  monitoringInterval?: number;

  // Validation
  validateThresholds?: boolean;
  autoSave?: boolean;
  saveDelay?: number;

  // Callbacks
  onThresholdTriggered?: (threshold: AlarmThreshold, value: number) => void;
  onThresholdCleared?: (threshold: AlarmThreshold) => void;
  onThresholdUpdated?: (threshold: AlarmThreshold) => void;
  onError?: (error: string) => void;
}

export interface UseAlarmThresholdReturn {
  // Threshold data
  threshold?: AlarmThreshold;
  allThresholds: AlarmThreshold[];
  activeThresholds: AlarmThreshold[];

  // Threshold status
  exists: boolean;
  isActive: boolean;
  isEnabled: boolean;
  isValid: boolean;
  validationErrors: string[];

  // Current monitoring
  currentValue?: number;
  timeUntilTrigger?: number;
  withinThreshold: boolean;
  proximityToThreshold: number; // 0-1, 1 being at threshold

  // Threshold management
  createThreshold: (config: Partial<AlarmThreshold>) => string;
  updateThreshold: (updates: Partial<AlarmThreshold>) => void;
  deleteThreshold: () => void;
  duplicateThreshold: (namePrefix?: string) => string | null;

  // Threshold configuration
  setMinValue: (value: number | undefined) => void;
  setMaxValue: (value: number | undefined) => void;
  setRange: (min?: number, max?: number) => void;
  setPriority: (priority: AlarmThreshold['priority']) => void;
  setMessage: (message: string) => void;

  // Threshold state
  enableThreshold: () => void;
  disableThreshold: () => void;
  toggleThreshold: () => void;
  acknowledgeAlarm: () => void;
  snoozeAlarm: (minutes: number) => void;

  // Sound and notification settings
  toggleSound: () => void;
  setSoundFile: (filename: string) => void;
  toggleEmail: () => void;
  togglePush: () => void;
  testNotifications: () => void;

  // Monitoring and validation
  validateConfiguration: () => { valid: boolean; errors: string[] };
  testThreshold: (testValue: number) => boolean;
  getThresholdHistory: () => Array<{ timestamp: number; value: number; triggered: boolean }>;
  resetStatistics: () => void;

  // Presets and templates
  saveAsPreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  getAvailablePresets: () => Array<{
    id: string;
    name: string;
    description?: string;
    dataType: string;
  }>;

  // Utilities
  getThresholdSummary: () => {
    name: string;
    dataType: string;
    range: string;
    status: string;
    triggerCount: number;
  };

  // Data binding
  getAvailableDataTypes: () => string[];
  getDataTypeInfo: (dataType: string) => {
    unit: string;
    range: { min: number; max: number };
    precision: number;
    label: string;
  };
}

export function useAlarmThreshold(options: UseAlarmThresholdOptions = {}): UseAlarmThresholdReturn {
  const {
    thresholdId,
    dataType,
    enableRealTimeMonitoring = true,
    monitoringInterval = 1000,
    validateThresholds = true,
    autoSave = true,
    saveDelay = 500,
    onThresholdTriggered,
    onThresholdCleared,
    onThresholdUpdated,
    onError,
  } = options;

  // Store access
  const alarmStore = useAlarmStore();
  const {
    activeAlarms,
    thresholds,
    addAlarm,
    addThreshold,
    updateThreshold: storeUpdateThreshold,
    removeThreshold,
    acknowledgeAlarm: storeAcknowledgeAlarm,
  } = alarmStore;

  // NMEA data access for real-time monitoring
  const { data: nmeaData, isValid: nmeaDataValid } = useNMEAData({
    enableRealTimeUpdates: enableRealTimeMonitoring,
    updateInterval: monitoringInterval,
  });

  // Local state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<AlarmThreshold>>({});
  const [lastValues, setLastValues] = useState<Record<string, number>>({});
  const [thresholdHistory, setThresholdHistory] = useState<
    Array<{ timestamp: number; value: number; triggered: boolean }>
  >([]);

  // Convert alarm thresholds to our format and merge with active alarms
  const allThresholds = useMemo((): AlarmThreshold[] => {
    return thresholds.map((threshold, index) => {
      // Find related active alarm
      const activeAlarm = activeAlarms.find((alarm) => alarm.source === threshold.dataPath);

      return {
        id: threshold.id,
        dataType: threshold.dataPath,
        name: threshold.name,
        minValue:
          threshold.type === 'min' || threshold.type === 'range' ? threshold.value : undefined,
        maxValue:
          threshold.type === 'max'
            ? threshold.value
            : threshold.type === 'range'
            ? threshold.maxValue
            : undefined,
        enabled: threshold.enabled,
        priority: threshold.level as AlarmThreshold['priority'],
        message: threshold.name,
        soundEnabled: true, // Default from store settings
        emailEnabled: false,
        pushEnabled: false,
        conditions: {
          hysteresis: threshold.hysteresis,
        },
        lastTriggered: activeAlarm?.timestamp,
        triggerCount: 0, // Would need to track this separately
        isActive: !!activeAlarm && !activeAlarm.acknowledged,
      };
    });
  }, [thresholds, activeAlarms]);

  // Find specific threshold
  const threshold = useMemo(() => {
    if (thresholdId) {
      return allThresholds.find((t) => t.id === thresholdId);
    }
    if (dataType) {
      return allThresholds.find((t) => t.dataType === dataType);
    }
    return undefined;
  }, [allThresholds, thresholdId, dataType]);

  // Active thresholds
  const activeThresholds = useMemo(() => {
    return allThresholds.filter((t) => t.isActive);
  }, [allThresholds]);

  // Threshold status
  const exists = !!threshold;
  const isActive = threshold?.isActive ?? false;
  const isEnabled = threshold?.enabled ?? false;

  // Current value monitoring
  const currentValue = useMemo(() => {
    if (!threshold?.dataType || !nmeaData) return undefined;

    const dataType = threshold.dataType.toLowerCase();

    // Map threshold data types to NMEA data fields
    switch (dataType) {
      case 'depth':
        return nmeaData.depth;
      case 'speed':
        return nmeaData.speed;
      case 'windspeed':
        return nmeaData.windSpeed;
      case 'winddirection':
        return nmeaData.windDirection;
      case 'battery':
        return nmeaData.batteryVoltage;
      case 'temperature':
        return nmeaData.waterTemperature;
      case 'heading':
        return nmeaData.heading;
      default:
        return undefined;
    }
  }, [threshold, nmeaData]);

  // Threshold validation
  const validateThresholdConfig = useCallback(
    (config: Partial<AlarmThreshold>): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!config.dataType) {
        errors.push('Data type is required');
      }

      if (!config.name || config.name.trim().length === 0) {
        errors.push('Threshold name is required');
      }

      if (
        config.minValue !== undefined &&
        config.maxValue !== undefined &&
        config.minValue >= config.maxValue
      ) {
        errors.push('Minimum value must be less than maximum value');
      }

      if (!config.message || config.message.trim().length === 0) {
        errors.push('Alarm message is required');
      }

      if (config.conditions?.duration !== undefined && config.conditions.duration < 0) {
        errors.push('Duration must be non-negative');
      }

      if (
        config.conditions?.hysteresis !== undefined &&
        (config.conditions.hysteresis < 0 || config.conditions.hysteresis > 100)
      ) {
        errors.push('Hysteresis must be between 0 and 100 percent');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
    [],
  );

  const isValid = useMemo(() => {
    if (!threshold || !validateThresholds) return true;
    return validateThresholdConfig(threshold).valid;
  }, [threshold, validateThresholds, validateThresholdConfig]);

  // Threshold proximity calculation
  const proximityToThreshold = useMemo(() => {
    if (!threshold || currentValue === undefined) return 0;

    const { minValue, maxValue } = threshold;

    if (minValue !== undefined && maxValue !== undefined) {
      // Range threshold
      const range = maxValue - minValue;
      if (currentValue < minValue) {
        return Math.abs(currentValue - minValue) / range;
      } else if (currentValue > maxValue) {
        return Math.abs(currentValue - maxValue) / range;
      } else {
        // Inside range - calculate distance to nearest boundary
        const distToMin = Math.abs(currentValue - minValue);
        const distToMax = Math.abs(currentValue - maxValue);
        return 1 - Math.min(distToMin, distToMax) / range;
      }
    } else if (minValue !== undefined) {
      // Minimum threshold
      return currentValue < minValue ? Math.abs(currentValue - minValue) / minValue : 0;
    } else if (maxValue !== undefined) {
      // Maximum threshold
      return currentValue > maxValue ? Math.abs(currentValue - maxValue) / maxValue : 0;
    }

    return 0;
  }, [threshold, currentValue]);

  const withinThreshold = useMemo(() => {
    if (!threshold || currentValue === undefined) return true;

    const { minValue, maxValue } = threshold;

    if (minValue !== undefined && currentValue < minValue) return false;
    if (maxValue !== undefined && currentValue > maxValue) return false;

    return true;
  }, [threshold, currentValue]);

  // Threshold management
  const createThreshold = useCallback(
    (config: Partial<AlarmThreshold>): string => {
      // Map priority to alarm level
      const priorityToLevel = (priority?: string) => {
        switch (priority) {
          case 'low':
            return 'info' as const;
          case 'medium':
            return 'warning' as const;
          case 'high':
            return 'warning' as const;
          case 'critical':
            return 'critical' as const;
          default:
            return 'warning' as const;
        }
      };

      const newThreshold = {
        name: config.name || 'New Threshold',
        dataPath: config.dataType || 'depth',
        type:
          config.minValue !== undefined && config.maxValue !== undefined
            ? ('range' as const)
            : config.minValue !== undefined
            ? ('min' as const)
            : ('max' as const),
        value: config.minValue ?? config.maxValue ?? 0,
        maxValue: config.maxValue,
        level: priorityToLevel(config.priority),
        enabled: config.enabled ?? true,
        hysteresis: config.conditions?.hysteresis,
      };

      addThreshold(newThreshold);
      return `threshold-${Date.now()}`;
    },
    [addThreshold],
  );

  const updateThreshold = useCallback(
    (updates: Partial<AlarmThreshold>) => {
      if (!threshold) return;

      setPendingUpdates((prev) => ({ ...prev, ...updates }));

      if (validateThresholds) {
        const mergedConfig = { ...threshold, ...pendingUpdates, ...updates };
        const validation = validateThresholdConfig(mergedConfig);
        setValidationErrors(validation.errors);

        if (!validation.valid) {
          onError?.(validation.errors.join(', '));
          return;
        }
      }

      // Map our format back to store format and update
      const storeUpdate = {
        name: updates.name,
        dataPath: updates.dataType,
        type:
          updates.minValue !== undefined && updates.maxValue !== undefined
            ? ('range' as const)
            : updates.minValue !== undefined
            ? ('min' as const)
            : updates.maxValue !== undefined
            ? ('max' as const)
            : undefined,
        value: updates.minValue ?? updates.maxValue,
        maxValue: updates.maxValue,
        level:
          updates.priority === 'low'
            ? ('info' as const)
            : updates.priority === 'critical'
            ? ('critical' as const)
            : ('warning' as const),
        enabled: updates.enabled,
        hysteresis: updates.conditions?.hysteresis,
      };

      // Filter out undefined values
      const cleanUpdate = Object.fromEntries(
        Object.entries(storeUpdate).filter(([_, value]) => value !== undefined),
      );

      storeUpdateThreshold(threshold.id, cleanUpdate);
      onThresholdUpdated?.({ ...threshold, ...updates } as AlarmThreshold);

      if (autoSave) {
        setTimeout(() => {
          setPendingUpdates({});
        }, saveDelay);
      }
    },
    [
      threshold,
      pendingUpdates,
      validateThresholds,
      validateThresholdConfig,
      storeUpdateThreshold,
      onThresholdUpdated,
      autoSave,
      saveDelay,
      onError,
    ],
  );

  const deleteThreshold = useCallback(() => {
    if (!threshold) return;
    removeThreshold(threshold.id);
  }, [threshold, removeThreshold]);

  const duplicateThreshold = useCallback(
    (namePrefix = 'Copy of '): string | null => {
      if (!threshold) return null;

      return createThreshold({
        ...threshold,
        name: namePrefix + threshold.name,
      });
    },
    [threshold, createThreshold],
  );

  // Configuration shortcuts
  const setMinValue = useCallback(
    (value: number | undefined) => {
      updateThreshold({ minValue: value });
    },
    [updateThreshold],
  );

  const setMaxValue = useCallback(
    (value: number | undefined) => {
      updateThreshold({ maxValue: value });
    },
    [updateThreshold],
  );

  const setRange = useCallback(
    (min?: number, max?: number) => {
      updateThreshold({ minValue: min, maxValue: max });
    },
    [updateThreshold],
  );

  const setPriority = useCallback(
    (priority: AlarmThreshold['priority']) => {
      updateThreshold({ priority });
    },
    [updateThreshold],
  );

  const setMessage = useCallback(
    (message: string) => {
      updateThreshold({ message });
    },
    [updateThreshold],
  );

  // State management
  const enableThreshold = useCallback(() => {
    updateThreshold({ enabled: true });
  }, [updateThreshold]);

  const disableThreshold = useCallback(() => {
    updateThreshold({ enabled: false });
  }, [updateThreshold]);

  const toggleThreshold = useCallback(() => {
    updateThreshold({ enabled: !isEnabled });
  }, [updateThreshold, isEnabled]);

  const acknowledgeAlarm = useCallback(() => {
    if (!threshold) return;
    storeAcknowledgeAlarm(threshold.id);
  }, [threshold, storeAcknowledgeAlarm]);

  const snoozeAlarm = useCallback(
    (minutes: number) => {
      if (!threshold) return;
      // Use the alarm store's muteAlarmsFor function as a snooze equivalent
      alarmStore.muteAlarmsFor(minutes);
    },
    [threshold, alarmStore],
  );

  // Notification settings
  const toggleSound = useCallback(() => {
    updateThreshold({ soundEnabled: !threshold?.soundEnabled });
  }, [updateThreshold, threshold]);

  const setSoundFile = useCallback(
    (filename: string) => {
      updateThreshold({ soundFile: filename });
    },
    [updateThreshold],
  );

  const toggleEmail = useCallback(() => {
    updateThreshold({ emailEnabled: !threshold?.emailEnabled });
  }, [updateThreshold, threshold]);

  const togglePush = useCallback(() => {
    updateThreshold({ pushEnabled: !threshold?.pushEnabled });
  }, [updateThreshold, threshold]);

  const testNotifications = useCallback(() => {
    if (!threshold) return;

    // In a real implementation, this would trigger test notifications
  }, [threshold]);

  // Validation and testing
  const validateConfiguration = useCallback(() => {
    if (!threshold) return { valid: false, errors: ['No threshold selected'] };

    return validateThresholdConfig(threshold);
  }, [threshold, validateThresholdConfig]);

  const testThreshold = useCallback(
    (testValue: number): boolean => {
      if (!threshold) return false;

      const { minValue, maxValue } = threshold;

      if (minValue !== undefined && testValue < minValue) return true;
      if (maxValue !== undefined && testValue > maxValue) return true;

      return false;
    },
    [threshold],
  );

  const getThresholdHistory = useCallback(() => {
    return thresholdHistory;
  }, [thresholdHistory]);

  const resetStatistics = useCallback(() => {
    if (!threshold) return;

    updateThreshold({ triggerCount: 0, lastTriggered: undefined });
    setThresholdHistory([]);
  }, [threshold, updateThreshold]);

  // Presets (simplified implementation)
  const saveAsPreset = useCallback(
    (name: string, description?: string) => {
      if (!threshold) return;
    },
    [threshold],
  );

  const loadPreset = useCallback((presetId: string) => {}, []);

  const getAvailablePresets = useCallback(() => {
    return [
      {
        id: 'depth-shallow',
        name: 'Shallow Water',
        description: 'Alert when depth < 2m',
        dataType: 'depth',
      },
      {
        id: 'speed-fast',
        name: 'High Speed',
        description: 'Alert when speed > 10 knots',
        dataType: 'speed',
      },
      {
        id: 'battery-low',
        name: 'Low Battery',
        description: 'Alert when battery < 12V',
        dataType: 'battery',
      },
    ];
  }, []);

  // Utilities
  const getThresholdSummary = useCallback(() => {
    if (!threshold) {
      return {
        name: 'None',
        dataType: 'None',
        range: 'N/A',
        status: 'Not configured',
        triggerCount: 0,
      };
    }

    let range = 'N/A';
    if (threshold.minValue !== undefined && threshold.maxValue !== undefined) {
      range = `${threshold.minValue} - ${threshold.maxValue}`;
    } else if (threshold.minValue !== undefined) {
      range = `> ${threshold.minValue}`;
    } else if (threshold.maxValue !== undefined) {
      range = `< ${threshold.maxValue}`;
    }

    const status = !threshold.enabled ? 'Disabled' : threshold.isActive ? 'Active' : 'Normal';

    return {
      name: threshold.name,
      dataType: threshold.dataType,
      range,
      status,
      triggerCount: threshold.triggerCount,
    };
  }, [threshold]);

  // Data type utilities
  const getAvailableDataTypes = useCallback(() => {
    return ['depth', 'speed', 'windspeed', 'winddirection', 'battery', 'temperature', 'heading'];
  }, []);

  const getDataTypeInfo = useCallback((dataType: string) => {
    const dataTypeMap: Record<
      string,
      { unit: string; range: { min: number; max: number }; precision: number; label: string }
    > = {
      depth: { unit: 'm', range: { min: 0, max: 100 }, precision: 1, label: 'Depth' },
      speed: { unit: 'kts', range: { min: 0, max: 50 }, precision: 1, label: 'Speed' },
      windspeed: { unit: 'kts', range: { min: 0, max: 100 }, precision: 1, label: 'Wind Speed' },
      winddirection: {
        unit: '°',
        range: { min: 0, max: 360 },
        precision: 0,
        label: 'Wind Direction',
      },
      battery: { unit: 'V', range: { min: 10, max: 15 }, precision: 1, label: 'Battery Voltage' },
      temperature: {
        unit: '°C',
        range: { min: -10, max: 50 },
        precision: 1,
        label: 'Water Temperature',
      },
      heading: { unit: '°', range: { min: 0, max: 360 }, precision: 0, label: 'Heading' },
    };

    return (
      dataTypeMap[dataType] || {
        unit: '',
        range: { min: 0, max: 100 },
        precision: 0,
        label: 'Unknown',
      }
    );
  }, []);

  // Real-time monitoring effect
  useEffect(() => {
    if (
      !enableRealTimeMonitoring ||
      !threshold ||
      !threshold.enabled ||
      currentValue === undefined
    ) {
      return;
    }

    const shouldTrigger = !withinThreshold;
    const wasActive = threshold.isActive;

    // Record history
    setThresholdHistory((prev) => [
      ...prev.slice(-99),
      {
        timestamp: Date.now(),
        value: currentValue,
        triggered: shouldTrigger,
      },
    ]);

    // Handle threshold state changes
    if (shouldTrigger && !wasActive) {
      updateThreshold({
        isActive: true,
        lastTriggered: Date.now(),
        triggerCount: threshold.triggerCount + 1,
      });
      onThresholdTriggered?.(threshold, currentValue);
    } else if (!shouldTrigger && wasActive) {
      updateThreshold({ isActive: false });
      onThresholdCleared?.(threshold);
    }
  }, [
    currentValue,
    withinThreshold,
    threshold,
    enableRealTimeMonitoring,
    updateThreshold,
    onThresholdTriggered,
    onThresholdCleared,
  ]);

  return {
    // Threshold data
    threshold,
    allThresholds,
    activeThresholds,

    // Threshold status
    exists,
    isActive,
    isEnabled,
    isValid,
    validationErrors,

    // Current monitoring
    currentValue,
    timeUntilTrigger: undefined, // Could be implemented based on rate of change
    withinThreshold,
    proximityToThreshold,

    // Threshold management
    createThreshold,
    updateThreshold,
    deleteThreshold,
    duplicateThreshold,

    // Threshold configuration
    setMinValue,
    setMaxValue,
    setRange,
    setPriority,
    setMessage,

    // Threshold state
    enableThreshold,
    disableThreshold,
    toggleThreshold,
    acknowledgeAlarm,
    snoozeAlarm,

    // Sound and notification settings
    toggleSound,
    setSoundFile,
    toggleEmail,
    togglePush,
    testNotifications,

    // Monitoring and validation
    validateConfiguration,
    testThreshold,
    getThresholdHistory,
    resetStatistics,

    // Presets and templates
    saveAsPreset,
    loadPreset,
    getAvailablePresets,

    // Utilities
    getThresholdSummary,

    // Data binding
    getAvailableDataTypes,
    getDataTypeInfo,
  };
}
