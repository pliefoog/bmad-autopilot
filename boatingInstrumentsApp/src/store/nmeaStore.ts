/**
 * nmeaStore.ts - Minimal UI State for NMEA System (v4.0)
 * 
 * Purpose:
 * - Provide UI-facing state: connection status, alarms, message metadata
 * - Bridge threshold reads/writes to SensorInstance per-metric storage
 * 
 * Key Features:
 * - Registry-based architecture keeps SensorInstance out of Zustand
 * - DevTools enabled (no class serialization)
 * - Per-metric threshold APIs with backward compatibility
 * 
 * Critical Implementation Details:
 * - Thresholds accessed via sensorRegistry (Map<string, MetricThresholds>)
 * - Alarm evaluation triggered by SensorDataRegistry (debounced)
 * - Message metadata updated once per processed message batch
 * 
 * Dependencies:
 * - SensorDataRegistry: sensor access and threshold storage
 * - AlarmEvaluator: compile active alarms into store
 * - PureStoreUpdater: updates metadata and routes sensor updates
 * 
 * Related Files:
 * - SensorDataRegistry.ts, AlarmEvaluator.ts, PureStoreUpdater.ts
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { sensorRegistry } from '../services/SensorDataRegistry';
import { log } from '../utils/logging/logger';

import type { SensorType, SensorData } from '../types/SensorData';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data';
export type AlarmLevel = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  message: string;
  level: AlarmLevel;
  timestamp: number;
}

/**
 * NMEA Data Structure v4.0
 * Minimal UI state - sensors stored in SensorDataRegistry
 */
export interface NmeaData {
  timestamp: number;
  messageCount: number;
  messageFormat?: 'NMEA 0183' | 'NMEA 2000'; // Last detected message format
}

/**
 * NMEA Store Interface v4.0
 * Minimal UI state store
 */
interface NmeaStore {
  // Core UI state
  connectionStatus: ConnectionStatus;
  nmeaData: NmeaData;
  alarms: Alarm[];
  lastError?: string;
  debugMode: boolean;

  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLastError: (err?: string) => void;
  setDebugMode: (enabled: boolean) => void;

  // NMEA message metadata (for UI display)
  updateMessageMetadata: (messageFormat?: 'NMEA 0183' | 'NMEA 2000') => void;

  // Threshold management (delegates to SensorInstance)
  /**
   * Get thresholds for a sensor metric
   * 
   * Implementation Notes:
   * - Bridges directly to SensorInstance per-metric thresholds Map
   * - Supports multi-metric sensors via optional metricKey
   * - Backward compatible: defaults to first metric when metricKey omitted
   * 
   * @param sensorType - Sensor type identifier
   * @param instance - Sensor instance number
   * @param metricKey - Optional metric field name (e.g., 'voltage')
   * @returns Threshold object for the metric or undefined
   */
  getSensorThresholds: (sensorType: SensorType, instance: number, metricKey?: string) => any | undefined;

  /**
   * Update thresholds for a sensor metric
   * 
   * Implementation Notes:
   * - Validates metricKey exists on SensorInstance
   * - Logs informative errors for missing sensors/metrics
   * - Backward compatible: defaults to first metric when metricKey omitted
   * 
   * @param sensorType - Sensor type identifier
   * @param instance - Sensor instance number
   * @param thresholds - Threshold configuration object
   * @param metricKey - Optional metric field name (e.g., 'current')
   */
  updateSensorThresholds: (sensorType: SensorType, instance: number, thresholds: any, metricKey?: string) => void;

  // Alarm management
  updateAlarms: (alarms: Alarm[]) => void;

  // System methods
  performFactoryReset: () => void;
}

/**
 * Create NMEA Store with Zustand DevTools ENABLED
 * DevTools now works because sensors are stored in registry (no class instances in state)
 */
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    (set, get) => ({
      // Initial UI state
      connectionStatus: 'disconnected',
      nmeaData: {
        timestamp: Date.now(),
        messageCount: 0,
        messageFormat: undefined,
      },
      alarms: [],
      lastError: undefined,
      debugMode: false,

      // Connection management
      setConnectionStatus: (status: ConnectionStatus) =>
        set(
          (state) => {
            // Reset message counter when transitioning to 'connected'
            if (status === 'connected' && state.connectionStatus !== 'connected') {
              return {
                connectionStatus: status,
                nmeaData: {
                  ...state.nmeaData,
                  messageCount: 0,
                },
              };
            }
            return { connectionStatus: status };
          },
          false,
          'setConnectionStatus',
        ),

      setLastError: (err?: string) => set({ lastError: err }, false, 'setLastError'),
      setDebugMode: (enabled: boolean) => set({ debugMode: enabled }, false, 'setDebugMode'),

      /**
       * Update message metadata - called by PureStoreUpdater
       * Updates message count and format for UI display
       */
      updateMessageMetadata: (messageFormat?: 'NMEA 0183' | 'NMEA 2000') => {
        set(
          (state) => ({
            nmeaData: {
              ...state.nmeaData,
              timestamp: Date.now(),
              messageCount: state.nmeaData.messageCount + 1,
              messageFormat: messageFormat || state.nmeaData.messageFormat,
            },
          }),
          false,
          'updateMessageMetadata',
        );
      },

      // Alarm management - called by SensorDataRegistry
      updateAlarms: (alarms: Alarm[]) =>
        set({ alarms }, false, 'updateAlarms'),

      // Threshold management - bridges to SensorInstance
      getSensorThresholds: (sensorType: SensorType, instance: number, metricKey?: string) => {
        const sensorInstance = sensorRegistry.get(sensorType, instance);
        if (!sensorInstance) return undefined;

        // Get metric keys for this sensor (thresholds stored per-metric)
        const metricKeys = sensorInstance.getMetricKeys();
        if (metricKeys.length === 0) return undefined;

        // Support multi-metric threshold access
        // If metricKey provided, use it; otherwise default to first metric
        const targetMetricKey = metricKey || metricKeys[0];
        return (sensorInstance as any)._thresholds.get(targetMetricKey);
      },

      updateSensorThresholds: (sensorType: SensorType, instance: number, thresholds: any, metricKey?: string) => {
        const sensorInstance = sensorRegistry.get(sensorType, instance);
        if (!sensorInstance) {
          log.app('Cannot update thresholds - sensor instance not found', () => ({
            sensorType,
            instance,
            metricKey,
          }));
          return;
        }

        // Update sensor name if provided in thresholds configuration
        if (thresholds.name) {
          sensorInstance.name = thresholds.name;
        }

        // Extract actual threshold values from configuration object
        // (thresholds parameter is actually a SensorConfiguration update object)
        const hasThresholdValues = 
          thresholds.critical !== undefined || 
          thresholds.warning !== undefined ||
          thresholds.metrics !== undefined;

        // Only update thresholds if threshold values are present
        if (!hasThresholdValues) {
          log.app('No threshold values to update - skipping threshold update', () => ({
            sensorType,
            instance,
            hasName: !!thresholds.name,
            hasEnabled: thresholds.enabled !== undefined,
          }));
          return;
        }

        // Get metric key to update
        const metricKeys = sensorInstance.getMetricKeys();
        if (metricKeys.length === 0) {
          log.app('Cannot update thresholds - no metrics found', () => ({
            sensorType,
            instance,
          }));
          return;
        }

        // Use provided metricKey or default to first metric (backward compatibility)
        const targetMetricKey = metricKey || metricKeys[0];
        
        // Validate metric key exists
        if (!metricKeys.includes(targetMetricKey)) {
          log.app('Cannot update thresholds - metric key not found', () => ({
            sensorType,
            instance,
            requestedMetricKey: targetMetricKey,
            availableMetrics: metricKeys,
          }));
          return;
        }
        
        // Extract only threshold-specific properties for updateThresholds
        // (not the full configuration object with name, enabled, etc.)
        const metricThresholds = {
          critical: thresholds.critical,
          warning: thresholds.warning,
          min: thresholds.min,
          max: thresholds.max,
          direction: thresholds.direction,
          staleThresholdMs: thresholds.staleThresholdMs,
        };
        
        sensorInstance.updateThresholds(targetMetricKey, metricThresholds);
      },

      /**
       * Factory reset - Clear all data
       */
      performFactoryReset: () => {
        try {
          // Destroy registry (clears all sensors)
          sensorRegistry.destroy();

          // Reset UI state
          set(
            {
              connectionStatus: 'disconnected',
              nmeaData: {
                timestamp: Date.now(),
                messageCount: 0,
                messageFormat: undefined,
              },
              alarms: [],
              lastError: undefined,
            },
            false,
            'performFactoryReset',
          );

          log.app('Factory reset complete');
        } catch (error) {
          log.app('Error during factory reset', () => ({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      },
    }),
    {
      name: 'NmeaStore',
      enabled: true, // DevTools now enabled!
    },
  ),
);

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).useNmeaStore = useNmeaStore;
  (window as any).sensorRegistry = sensorRegistry;
}
