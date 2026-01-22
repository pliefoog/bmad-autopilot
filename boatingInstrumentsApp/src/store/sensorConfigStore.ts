/**
 * Sensor Configuration Store - Persistent Storage for Sensor Settings
 *
 * Primary-Cache Pattern:
 * - This store is the SOURCE OF TRUTH for sensor configurations
 * - Uses Zustand persist middleware for AsyncStorage persistence
 * - nmeaStore is volatile cache that syncs from this store on app startup
 *
 * Stores per-sensor-instance configuration:
 * - Custom names
 * - Alarm thresholds (critical/warning)
 * - Hysteresis settings
 * - Context (battery chemistry, engine type, etc.)
 * - Sound patterns
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorType, SensorConfiguration } from '../types/SensorData';
import { useToastStore } from './toastStore';
import { log } from '../utils/logging/logger';
import { getSensorSchema } from '../registry';

/**
 * Unique sensor configuration key
 */
export interface SensorConfigKey {
  sensorType: SensorType;
  instance: number;
}

/**
 * Stored sensor configuration
 */
export interface StoredSensorConfig extends SensorConfiguration {
  // Inherited from SensorConfiguration:
  // name, context, critical, warning, direction,
  // criticalSoundPattern, warningSoundPattern,
  // criticalHysteresis, warningHysteresis, enabled, lastModified

  // Storage metadata
  createdAt?: number; // When this config was first created
  updatedAt?: number; // Last update timestamp
}

/**
 * Sensor configuration storage map
 * Key format: "sensorType:instance" (e.g., "battery:0", "engine:1")
 */
export type SensorConfigMap = Record<string, StoredSensorConfig>;

/**
 * Sensor Configuration Store State
 */
interface SensorConfigStoreState {
  // Configuration storage
  configs: SensorConfigMap;

  // Store metadata
  version: number; // Schema version for migrations
  lastSyncTimestamp?: number; // Last sync with nmeaStore
  _hydrated: boolean; // Hydration completion flag (prevents race conditions)

  // Actions
  getConfig: (sensorType: SensorType, instance: number) => StoredSensorConfig | undefined;
  setConfig: (
    sensorType: SensorType,
    instance: number,
    config: Partial<SensorConfiguration>,
  ) => void;
  deleteConfig: (sensorType: SensorType, instance: number) => void;
  getAllConfigs: () => SensorConfigMap;
  getMetricThresholds: (
    sensorType: SensorType,
    instance: number,
    metricKey: string,
  ) => any | undefined;
  clearAll: () => void;

  // Utility
  generateKey: (sensorType: SensorType, instance: number) => string;
}

/**
 * Generate storage key for sensor configuration
 */
const generateKey = (sensorType: SensorType, instance: number): string => {
  return `${sensorType}:${instance}`;
};

/**
 * Type guard for old context format
 * Old: { batteryChemistry: 'agm' } or { engineType: 'diesel' }
 * New: 'agm' or 'diesel'
 */
const isOldContextFormat = (context: any): context is Record<string, string> => {
  return (
    typeof context === 'object' &&
    context !== null &&
    !Array.isArray(context) &&
    Object.keys(context).length > 0 &&
    typeof Object.values(context)[0] === 'string'
  );
};

/**
 * Migrate old context format (object) to new format (string)
 * Also validates context values against schema and clears invalid ones
 * Silent migration during store initialization
 * 
 * Old format: { batteryChemistry: 'agm' }
 * New format: 'agm'
 * 
 * Extracts first property value from object context
 * Validates against schema.contextKey field options
 * Clears context if invalid (e.g., battery chemistry on engine sensor)
 */
const migrateOldContextFormat = (configs: SensorConfigMap): {
  configs: SensorConfigMap;
  migrationCount: number;
} => {
  let migrationCount = 0;
  let invalidContextCount = 0;
  const migratedConfigs: SensorConfigMap = {};

  for (const [key, config] of Object.entries(configs)) {
    let newConfig = { ...config };
    let contextMigrated = false;
    
    // Step 1: Migrate object→string format
    if (config.context && isOldContextFormat(config.context)) {
      const contextValue = Object.values(config.context)[0];
      newConfig.context = contextValue;
      contextMigrated = true;
      migrationCount++;
      
      log.app('[SensorConfigStore] Migrated context format', () => ({
        key,
        oldContext: config.context,
        newContext: contextValue,
      }));
    }
    
    // Step 2: Validate context against schema
    if (newConfig.context && typeof newConfig.context === 'string') {
      try {
        // Parse sensorType from key (format: "sensorType-instance")
        const [sensorType] = key.split('-');
        const schema = getSensorSchema(sensorType as SensorType);
        
        // Clear "unknown" placeholder - never valid
        if (newConfig.context === 'unknown') {
          log.app('[SensorConfigStore] Clearing "unknown" placeholder context', () => ({
            key,
            sensorType,
          }));
          delete newConfig.context;
          invalidContextCount++;
          contextMigrated = true;
        } else if (schema.contextKey) {
          // Validate against schema options
          const contextField = schema.fields[schema.contextKey];
          const isValid = contextField?.options?.includes(newConfig.context);
          
          if (!isValid) {
            // Invalid context - clear it
            log.app('[SensorConfigStore] Clearing invalid context', () => ({
              key,
              sensorType,
              contextKey: schema.contextKey,
              invalidValue: newConfig.context,
              allowedValues: contextField?.options || [],
            }));
            
            delete newConfig.context;
            invalidContextCount++;
            contextMigrated = true; // Mark as migrated to trigger save
          }
        } else {
          // No contextKey in schema - sensor doesn't use context, clear it
          log.app('[SensorConfigStore] Clearing context from sensor without contextKey', () => ({
            key,
            sensorType,
            contextValue: newConfig.context,
          }));
          delete newConfig.context;
          invalidContextCount++;
          contextMigrated = true;
        }
      } catch (error) {
        // Schema lookup failed - keep context as-is
        log.app('[SensorConfigStore] Could not validate context (schema unavailable)', () => ({
          key,
          context: newConfig.context,
        }));
      }
    }
    
    migratedConfigs[key] = newConfig;
  }

  if (migrationCount > 0 || invalidContextCount > 0) {
    log.app('[SensorConfigStore] Context migration complete', () => ({
      total: Object.keys(configs).length,
      formatMigrated: migrationCount,
      invalidCleared: invalidContextCount,
    }));
  }

  return { configs: migratedConfigs, migrationCount };
};

/**
 * Sensor Configuration Store with AsyncStorage persistence
 */
export const useSensorConfigStore = create<SensorConfigStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        configs: {},
        version: 4, // Schema version v4: Unified metrics object (single + multi-metric) // v3: category→unitType refactor // v2: MetricValue/SensorInstance refactor - clean slate
        lastSyncTimestamp: undefined,
        _hydrated: false, // Set to true after AsyncStorage hydration completes

        // Generate storage key
        generateKey,

        // Get configuration for specific sensor instance
        getConfig: (sensorType: SensorType, instance: number) => {
          const key = generateKey(sensorType, instance);
          return get().configs[key];
        },

        // Set/update configuration for sensor instance
        setConfig: (
          sensorType: SensorType,
          instance: number,
          config: Partial<SensorConfiguration>,
        ) => {
          const key = generateKey(sensorType, instance);
          const now = Date.now();
          const existingConfig = get().configs[key];

          console.log(`[sensorConfigStore] setConfig: key=${key}, config.name="${config.name}", existingConfig.name="${existingConfig?.name}"`);

          const updatedConfig: StoredSensorConfig = {
            ...existingConfig,
            ...config,
            updatedAt: now,
            createdAt: existingConfig?.createdAt || now,
            lastModified: now,
          };

          console.log(`[sensorConfigStore] updatedConfig: name="${updatedConfig.name}"`);

          set((state) => ({
            configs: {
              ...state.configs,
              [key]: updatedConfig,
            },
          }));
          
          console.log(`[sensorConfigStore] After set, stored config name="${get().configs[key]?.name}"`);
        },

        // Delete configuration for sensor instance
        deleteConfig: (sensorType: SensorType, instance: number) => {
          const key = generateKey(sensorType, instance);

          set((state) => {
            const newConfigs = { ...state.configs };
            delete newConfigs[key];
            return { configs: newConfigs };
          });
        },

        // Get all configurations
        getAllConfigs: () => {
          return get().configs;
        },

        // Get metric-specific thresholds (for new MetricThresholds interface)
        getMetricThresholds: (sensorType: SensorType, instance: number, metricKey: string) => {
          const config = get().getConfig(sensorType, instance);
          if (!config) return undefined;

          // Extract metric-specific thresholds from sensor config
          // This will be enhanced when we add per-metric threshold storage
          return {
            critical: config.critical || {},
            warning: config.warning || {},
            hysteresis: config.criticalHysteresis || config.warningHysteresis,
            criticalSoundPattern: config.criticalSoundPattern,
            warningSoundPattern: config.warningSoundPattern,
            staleThresholdMs: 5000, // Default 5s, will be made configurable
            enabled: config.enabled ?? true,
          };
        },

        // Clear all configurations (for reset/testing)
        clearAll: () => {
          set({ configs: {}, lastSyncTimestamp: undefined });
        },
      }),
      {
        name: 'sensor-config-storage', // AsyncStorage key
        storage: createJSONStorage(() => AsyncStorage),
        version: 4, // Bumped 3→4 for unified metrics object (Jan 2026)

        // Partial persistence - only persist configs, not derived state
        partialize: (state) => ({
          configs: state.configs,
          version: state.version,
          lastSyncTimestamp: state.lastSyncTimestamp,
        }),

        // Migration strategy: V3→V4 preserves data, older versions clear
        migrate: (persistedState: any, version: number) => {
          // V3→V4: Migrate single-metric sensors to unified metrics object
          if (version === 3) {
            log.app('[SensorConfigStore] Migration: V3→V4 unified metrics schema', () => ({
              storedVersion: version,
              targetVersion: 4,
            }));

            const migratedConfigs: SensorConfigMap = {};
            let migratedCount = 0;
            let skippedCount = 0;

            for (const [key, config] of Object.entries(persistedState.configs || {})) {
              // Parse sensor type from key (format: "sensorType:instance")
              const [sensorType] = key.split(':');
              
              try {
                const schema = getSensorSchema(sensorType as SensorType);
                const alarmFields = Object.entries(schema.fields)
                  .filter(([_, field]) => 'alarm' in field && field.alarm !== undefined)
                  .map(([fieldKey, _]) => fieldKey);

                // Check if already V4 format (has metrics, no top-level thresholds)
                if (config.metrics && !config.critical && !config.warning) {
                  migratedConfigs[key] = config;
                  skippedCount++;
                  continue;
                }

                // Determine migration path
                if (alarmFields.length === 1) {
                  // Single-metric: Wrap top-level thresholds in metrics object
                  const fieldName = alarmFields[0];
                  migratedConfigs[key] = {
                    name: config.name,
                    context: config.context,
                    metrics: {
                      [fieldName]: {
                        critical: config.critical,
                        warning: config.warning,
                        direction: config.direction || 'below',
                        criticalSoundPattern: config.criticalSoundPattern,
                        warningSoundPattern: config.warningSoundPattern,
                        criticalHysteresis: config.criticalHysteresis,
                        warningHysteresis: config.warningHysteresis,
                        enabled: config.enabled ?? true,
                      }
                    },
                    audioEnabled: config.audioEnabled,
                    lastModified: config.lastModified,
                    createdAt: config.createdAt,
                    updatedAt: config.updatedAt,
                  };
                  migratedCount++;
                } else {
                  // Multi-metric: Already correct, just ensure no top-level fields
                  migratedConfigs[key] = {
                    name: config.name,
                    context: config.context,
                    metrics: config.metrics || {},
                    audioEnabled: config.audioEnabled,
                    lastModified: config.lastModified,
                    createdAt: config.createdAt,
                    updatedAt: config.updatedAt,
                  };
                  skippedCount++;
                }
              } catch (error) {
                // Schema lookup failed - preserve as-is with empty metrics
                log.app('[SensorConfigStore] Migration warning: Could not migrate config', () => ({
                  key,
                  error: error instanceof Error ? error.message : String(error),
                }));
                migratedConfigs[key] = {
                  ...config,
                  metrics: config.metrics || {},
                };
                skippedCount++;
              }
            }

            log.app('[SensorConfigStore] Migration complete', () => ({
              migratedCount,
              skippedCount,
              totalCount: Object.keys(migratedConfigs).length,
            }));

            if (migratedCount > 0) {
              useToastStore.getState().addToast({
                type: 'success',
                message: `Upgraded ${migratedCount} sensor configuration${migratedCount > 1 ? 's' : ''}`,
                duration: 5000,
              });
            }

            return {
              configs: migratedConfigs,
              version: 4,
              lastSyncTimestamp: persistedState.lastSyncTimestamp,
            };
          }

          // V0-V2: Clean slate (too old, incompatible schema)
          if (version < 3) {
            log.app('[SensorConfigStore] Migration: Clearing configs due to old schema version', () => ({
              storedVersion: version,
              expectedVersion: 4,
              reason: 'Schema too old, data incompatible',
            }));

            useToastStore.getState().addToast({
              type: 'info',
              message:
                'Sensor configurations cleared due to app update. Please reconfigure sensors.',
              duration: 8000,
              priority: 'high',
            });

            return {
              configs: {},
              version: 4,
              lastSyncTimestamp: undefined,
            };
          }

          // Unknown version (future version?)
          return persistedState;
        },

        // Handle storage errors gracefully
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              log.app('[SensorConfigStore] Hydration error', () => ({
                error: error instanceof Error ? error.message : String(error),
              }));
              // Set hydrated even on error to prevent infinite waiting
              useSensorConfigStore.setState({ _hydrated: true });
            } else {
              // Migrate old context format if needed
              const { configs, migrationCount } = migrateOldContextFormat(state?.configs || {});
              
              if (migrationCount > 0) {
                // Update store with migrated configs
                useSensorConfigStore.setState({ configs });
              }
              
              const configCount = Object.keys(configs).length;
              log.app('[SensorConfigStore] Hydration complete', () => ({ 
                configCount,
                contextMigrations: migrationCount,
              }));
              
              // CRITICAL: Mark store as hydrated
              useSensorConfigStore.setState({ _hydrated: true });
              
              // Emit global event for waiting sensors
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sensorConfigStoreHydrated'));
              }
            }
          };
        },
      },
    ),
    { name: 'Sensor Config Store', enabled: __DEV__ },
  ),
);

/**
 * Export store and utility functions
 */
