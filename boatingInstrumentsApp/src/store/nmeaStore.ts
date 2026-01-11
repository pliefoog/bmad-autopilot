/**
 * NMEA Store v4.0 - Registry Architecture
 *
 * Minimal UI state store:
 * - Alarms (UI display)
 * - Connection status (UI indicators)
 * - Message metadata (count, format)
 *
 * Sensor data moved to SensorDataRegistry (outside Zustand).
 * This enables:
 * - ✅ Zustand DevTools (no class instances in state)
 * - ✅ Targeted subscriptions (registry notifies changed metrics)
 * - ✅ Clean separation (UI state vs data storage)
 *
 * Key changes from v3:
 * - sensors removed from state (use sensorRegistry.get() instead)
 * - updateSensorData delegates to sensorRegistry.update()
 * - DevTools re-enabled (no serialization issues)
 * - No ReEnrichmentCoordinator (raw SI values don't need re-enrichment)
 * - No SensorConfigCoordinator (handled elsewhere)
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

  // Sensor data management (delegates to sensorRegistry)
  updateSensorData: <T extends SensorType>(
    sensorType: T,
    instance: number,
    data: Partial<SensorData>,
    messageFormat?: 'NMEA 0183' | 'NMEA 2000',
  ) => void;

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
       * Update sensor data - DELEGATED to SensorDataRegistry
       *
       * Key simplification from v3:
       * - No SensorInstance creation/management here
       * - No coordinator registration here
       * - Registry handles everything
       * - Store only updates UI state (message count, timestamp)
       */
      updateSensorData: <T extends SensorType>(
        sensorType: T,
        instance: number,
        data: Partial<SensorData>,
        messageFormat?: 'NMEA 0183' | 'NMEA 2000',
      ) => {
        const now = Date.now();

        // Skip empty updates
        if (!data || Object.keys(data).length === 0) {
          return;
        }

        // DEBUG: Log incoming battery updates
        if (sensorType === 'battery') {
          log.battery(`📥 updateSensorData called`, () => ({
            instance,
            fields: Object.keys(data),
            data: { ...data },
          }));
        }

        // Delegate sensor update to registry
        // Registry handles: creation, metrics update, alarm evaluation, notifications
        sensorRegistry.update(sensorType, instance, data);

        // Update UI state only (message metadata)
        set(
          (state) => ({
            nmeaData: {
              ...state.nmeaData,
              timestamp: now,
              messageCount: state.nmeaData.messageCount + 1,
              messageFormat: messageFormat || state.nmeaData.messageFormat,
            },
          }),
          false,
          `updateSensorData/${sensorType}/${instance}`,
        );
      },

      // Alarm management - called by SensorDataRegistry
      updateAlarms: (alarms: Alarm[]) =>
        set({ alarms }, false, 'updateAlarms'),

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
