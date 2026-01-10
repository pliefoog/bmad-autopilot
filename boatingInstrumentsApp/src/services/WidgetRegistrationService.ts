/**
 * WidgetRegistrationService - Event-Driven Widget Detection & Lifecycle Management
 *
 * Purpose:
 * - Automatically detect and create widget instances when NMEA sensor data becomes available
 * - Manage widget lifecycle based on sensor data freshness
 * - Bridge between sensor data (nmeaStore) and widget display (widgetStore)
 *
 * Key Features:
 * - Event-driven detection: Subscribes to nmeaStore sensor update events (no polling)
 * - Declarative dependencies: Widgets declare required/optional sensors
 * - Automatic creation: Widgets appear instantly when required sensors have valid data
 * - Instance management: Supports multi-instance sensors (multiple engines, batteries, etc.)
 * - Direct store updates: No event forwarding - updates widgetStore directly
 *
 * Critical Implementation Details:
 * - SensorValueMap is ONLY for detection/validation, NOT rendering
 *   Widgets access data via useNmeaStore() → SensorInstance.getMetric() → MetricValue
 * - Null-value filtering: buildSensorValueMap() only adds valid (non-null) values
 *   Key existence in map = sensor exists AND has valid data (Jan 2026 fix)
 * - Private methods: handleSensorUpdate(), hasRequiredSensors() are internal only
 * - Dynamic imports: Avoid circular dependencies with nmeaStore/widgetStore
 * - Singleton pattern: Single instance manages all widget registrations
 *
 * Bug Fix History:
 * - Jan 2026: Fixed null-value handling - map now only contains valid entries
 * - Jan 2026: Removed unused CalculatedField system (300+ lines)
 * - Jan 2026: Removed unused EventEmitter subscription methods
 * - Jan 2026: Replaced debug flags with conditional logger
 *
 * Performance Considerations:
 * - Incremental updates: Only processes affected widgets on sensor change
 * - Set-based diffing: Efficient widget add/remove detection in widgetStore
 * - No unnecessary re-renders: Widgets use granular useNmeaStore selectors
 *
 * Dependencies:
 * - nmeaStore: Source of sensor data, provides sensorEventEmitter
 * - widgetStore: Target for detected widget instances
 * - SensorInstance: Type-safe sensor data access via getMetric()
 * - MetricValue: Enriched display values (formattedValue, unit, etc.)
 * - ConversionRegistry: SI unit conversion for detection validation
 * - log (conditional logger): Runtime-controllable debugging
 *
 * Related Files:
 * - builtInWidgetRegistrations.ts: Defines 12 built-in widget types with dependencies
 * - defaultCustomWidgets.ts: Defines custom widget definitions, converts to registrations
 * - widgetStore.ts: Receives detected instances via updateInstanceWidgets()
 * - nmeaStore.ts: Emits 'sensorUpdate' events via sensorEventEmitter
 * - SensorInstance.ts: Provides getMetric() for accessing enriched sensor data
 */

import type { SensorType, SensorData } from '../types/SensorData';
import type { WidgetConfig } from '../types/widget.types';
import { log } from '../utils/logging/logger';

/**
 * Sensor dependency declaration
 * Describes which sensor data a widget requires or optionally uses
 */
export interface SensorDependency {
  /** Sensor type (e.g., 'depth', 'speed', 'engine') */
  sensorType: SensorType;

  /** Specific metric name (e.g., 'dbt', 'sog', 'rpm') */
  metricName: string;

  /** Specific instance number, or undefined for any instance */
  instance?: number;

  /** Is this sensor required for widget creation? */
  required: boolean;

  /** Human-readable label for this sensor binding */
  label?: string;
}

/**
 * Map of sensor values for widget detection/validation
 *
 * USAGE: Detection only - checks if required sensors exist with valid data.
 * NOT used for rendering - widgets access SensorInstance directly via useNmeaStore().
 *
 * After null-value fix: Map only contains entries with valid (non-null) values.
 * Key existence = sensor exists AND has valid data.
 */
export interface SensorValueMap {
  [key: string]: number; // key format: "sensorType.instance.metricName" (always valid number)
}

/**
 * Widget registration configuration
 */
export interface WidgetRegistration {
  /** Unique widget type identifier */
  widgetType: string;

  /** Human-readable name */
  displayName: string;

  /** Icon name (Ionicons) */
  icon: string;

  /** Sensors that MUST be present for widget to be created */
  requiredSensors: SensorDependency[];

  /** Sensors that are nice to have but not mandatory */
  optionalSensors: SensorDependency[];

  /** Function to create widget configuration when sensors available */
  createWidget: (instance: number, sensorData: SensorValueMap) => WidgetConfig;

  /** Priority for widget ordering (higher = shown first) */
  priority?: number;

  /** Is this a multi-instance widget type? */
  multiInstance: boolean;

  /** Maximum number of instances (-1 = unlimited) */
  maxInstances?: number;

  /**
   * Reference timeout value for widget expiration (ms)
   * 
   * NOTE: This is a REFERENCE VALUE only. Actual expiration handled by
   * widgetStore.cleanupExpiredWidgetsWithConfig() using global widgetExpirationTimeout.
   * Used for documentation purposes to indicate expected data frequency.
   */
  expirationTimeout?: number;
}

/**
 * Sensor update event from nmeaStore
 */
interface SensorUpdateEvent {
  sensorType: string;
  instance: number;
  timestamp: number;
}

/**
 * Detected widget instance ready to be created
 */
export interface DetectedWidgetInstance {
  id: string; // Widget ID in format: widgetType-instance
  widgetType: string;
  instance: number;
  title: string;
  icon: string;
  priority: number;
  sensorData: SensorValueMap;
  widgetConfig?: WidgetConfig; // Full widget config from registration.createWidget() - preserves custom settings
}

/**
 * Widget Registration Service
 *
 * Central registry for widget types and event-driven widget detection/creation
 */
export class WidgetRegistrationService {
  private static instance: WidgetRegistrationService;
  private registrations: Map<string, WidgetRegistration> = new Map();
  private detectedInstances: Map<string, DetectedWidgetInstance> = new Map();

  // Initialization state
  private isInitialized = false;
  private sensorUpdateHandler: ((event: SensorUpdateEvent) => void) | null = null;
  private isCleaningUp = false;

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): WidgetRegistrationService {
    if (!WidgetRegistrationService.instance) {
      WidgetRegistrationService.instance = new WidgetRegistrationService();
    }
    return WidgetRegistrationService.instance;
  }

  /**
   * Register a widget type with its sensor dependencies
   *
   * Implementation Notes:
   * - Stores registration in Map for O(1) lookup during sensor updates
   * - Called during app initialization for built-in widgets
   * - Called dynamically for custom widgets when definitions change
   * - No validation - assumes registration is well-formed
   *
   * @param registration - Widget registration with sensor dependencies and factory function
   */
  public registerWidget(registration: WidgetRegistration): void {
    log.widgetRegistration('Registering widget', () => ({
      widgetType: registration.widgetType,
    }));
    this.registrations.set(registration.widgetType, registration);
  }

  /**
   * Unregister a widget type (useful for cleanup or dynamic widget types)
   */
  public unregisterWidget(widgetType: string): void {
    this.registrations.delete(widgetType);

    // Clean up detected instances
    const instancesToRemove: string[] = [];
    this.detectedInstances.forEach((instance, key) => {
      if (instance.widgetType === widgetType) {
        instancesToRemove.push(key);
      }
    });
    instancesToRemove.forEach((key) => this.detectedInstances.delete(key));
  }

  /**
   * Get all registered widget types
   */
  public getRegisteredWidgets(): WidgetRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Get specific widget registration
   */
  public getWidgetRegistration(widgetType: string): WidgetRegistration | undefined {
    return this.registrations.get(widgetType);
  }

  /**
   * Check if all required sensors are present in the sensor value map
   *
   * Implementation Notes:
   * - SIMPLIFIED after Jan 2026 null-value fix: map only contains valid entries
   * - Key existence = sensor exists AND has valid (non-null) data
   * - Supports multi-instance widgets with regex pattern matching
   * - O(n) complexity where n = number of required sensors
   *
   * Performance:
   * - Typical case: 1-3 required sensors, <0.01ms per check
   * - Regex compilation cached by JavaScript engine
   *
   * Bug Fix History:
   * - Jan 2026: Simplified logic after buildSensorValueMap null filtering
   *   No longer needs to check value !== null, only key existence
   *
   * @internal Used only by handleSensorUpdate()
   * @param registration - Widget registration with required sensor list
   * @param sensorData - Map of sensor values (only contains valid entries)
   * @returns true if all required sensors have valid data
   */
  private hasRequiredSensors(
    registration: WidgetRegistration,
    sensorData: SensorValueMap,
  ): boolean {
    return registration.requiredSensors.every((dep) => {
      // For multi-instance widgets with no specific instance requirement,
      // check if ANY instance of this sensor type/measurement exists in the map
      if (dep.instance === undefined) {
        // Look for any key matching the pattern: sensorType.*.metricName
        const pattern = new RegExp(`^${dep.sensorType}\\.\\d+\\.${dep.metricName}$`);
        return Object.keys(sensorData).some((key) => pattern.test(key));
      } else {
        // Specific instance required - check key existence
        const key = this.buildSensorKey(dep.sensorType, dep.instance, dep.metricName);
        return key in sensorData;
      }
    });
  }

  /**
   * Initialize the service by subscribing to nmeaStore events
   * Call this once during app startup after registering all widget types
   */
  public initialize(): void {
    if (this.isInitialized) {
      // console.log('[WidgetRegistrationService] ⚠️ Already initialized');
      return;
    }

    // Reset cleanup flag at the START of initialization
    this.isCleaningUp = false;

    // console.log('[WidgetRegistrationService] 🚀 Initializing...');

    // Import dynamically to avoid circular dependency
    import('../store/nmeaStore').then(({ useNmeaStore }) => {
      const store = useNmeaStore.getState();

      // Subscribe to real-time sensor updates
      this.sensorUpdateHandler = (event: SensorUpdateEvent) => {
        const currentState = useNmeaStore.getState();
        const allSensors = currentState.nmeaData.sensors;
        const sensorData = (allSensors as any)[event.sensorType]?.[event.instance];

        if (!sensorData) return;

        this.handleSensorUpdate(event.sensorType as any, event.instance, sensorData, allSensors);
      };

      store.sensorEventEmitter.on('sensorUpdate', this.sensorUpdateHandler);

      // Perform initial scan of existing sensor data
      this.performInitialScan(useNmeaStore.getState().nmeaData.sensors);

      this.isInitialized = true;
      // console.log('[WidgetRegistrationService] ✅ Initialized successfully');
    });
  }

  /**
   * Perform initial scan of existing sensor data
   */
  private performInitialScan(allSensors: any): void {
    const sensorCategories = Object.keys(allSensors);

    sensorCategories.forEach((category) => {
      const categoryData = allSensors[category];
      if (!categoryData) return;

      Object.keys(categoryData).forEach((instanceKey) => {
        const instance = parseInt(instanceKey, 10);
        const sensorData = categoryData[instance];

        if (sensorData && sensorData.timestamp) {
          this.handleSensorUpdate(category as any, instance, sensorData, allSensors);
        }
      });
    });
  }

  /**
   * Cleanup subscription (for factory reset)
   */
  public cleanup(): void {
    if (!this.isInitialized || !this.sensorUpdateHandler) return;

    // Set flag to prevent store updates during cleanup
    this.isCleaningUp = true;

    // Save handler reference before clearing it
    const handler = this.sensorUpdateHandler;

    import('../store/nmeaStore').then(({ useNmeaStore }) => {
      const store = useNmeaStore.getState();
      store.sensorEventEmitter.removeListener('sensorUpdate', handler);
    });

    this.sensorUpdateHandler = null;
    this.isInitialized = false;
    this.clearDetectedInstances();
    // console.log('[WidgetRegistrationService] 🧹 Cleaned up');
  }

  /**
   * Handle sensor update event from nmeaStore
   *
   * Implementation Notes:
   * - Called on every sensor update at ~2Hz for active sensors
   * - Finds affected widgets using sensor type/instance matching
   * - Builds lightweight SensorValueMap for detection (not rendering)
   * - Creates/updates/removes DetectedWidgetInstance entries
   * - Updates widgetStore only when instance list changes (optimization)
   *
   * Performance:
   * - Early exit if no affected widgets (most updates)
   * - Set-based change detection prevents unnecessary store updates
   * - Typical execution: <1ms for 3-5 registered widget types
   *
   * Data Flow:
   * 1. nmeaStore emits 'sensorUpdate' event
   * 2. This method receives event with sensorType/instance
   * 3. Finds widget registrations depending on this sensor
   * 4. Builds SensorValueMap for validation
   * 5. Checks if all required sensors have valid data
   * 6. Adds/updates/removes from detectedInstances Map
   * 7. Calls updateWidgetStore() if changes detected
   *
   * Bug Fix History:
   * - Jan 2026: Replaced debug flags with conditional logger
   * - Jan 2026: Simplified detection after null-value filtering fix
   *
   * @internal Called only by event subscription in initialize()
   * @param sensorType - Type of sensor that was updated (e.g., 'depth', 'engine')
   * @param instance - Instance number of the sensor (0-based)
   * @param sensorData - Partial sensor data from the update event
   * @param allSensors - Full sensor state for multi-sensor widgets
   */
  private handleSensorUpdate(
    sensorType: SensorType,
    instance: number,
    sensorData: Partial<SensorData>,
    allSensors: any, // Full sensor state from nmeaStore
  ): void {
    log.widgetRegistration('handleSensorUpdate', () => ({
      sensorType,
      instance,
      hasData: !!sensorData,
      dataKeys: sensorData ? Object.keys(sensorData) : [],
    }));

    // Find all widget types that depend on this sensor
    const affectedWidgets = this.findAffectedWidgets(sensorType, instance);
    
    log.widgetRegistration('findAffectedWidgets', () => ({
      sensorType,
      instance,
      affectedCount: affectedWidgets.length,
    }));

    // Track whether any NEW widgets were detected (not just updates)
    let hasNewInstances = false;

    affectedWidgets.forEach((registration) => {
      const instanceKey = `${registration.widgetType}-${instance}`;

      // Build sensor value map for this widget type
      const sensorValueMap = this.buildSensorValueMap(registration, instance, allSensors);

      // Check if all required sensors have valid data
      // Note: After null-value fix, sensorValueMap only contains valid entries
      const canCreate = this.hasRequiredSensors(registration, sensorValueMap);

      if (canCreate) {
        // Check if this is a new instance (not already in detectedInstances)
        const isNewInstance = !this.detectedInstances.has(instanceKey);

        // Always update detected instance (even if already exists)
        // This ensures widgetStore always has the complete list of active widgets
        const widgetConfig = registration.createWidget(instance, sensorValueMap);

        const detectedInstance: DetectedWidgetInstance = {
          id: instanceKey,
          widgetType: registration.widgetType,
          instance,
          title: registration.displayName,
          icon: registration.icon,
          priority: registration.priority ?? 100,
          sensorData: sensorValueMap,
          widgetConfig,
        };

        this.detectedInstances.set(instanceKey, detectedInstance);

        if (isNewInstance) {
          hasNewInstances = true;
          log.widgetRegistration('Detected new widget instance', () => ({
            instanceKey,
            sensorType,
          }));
        }
      } else if (this.detectedInstances.has(instanceKey)) {
        // Widget no longer meets requirements - remove from detection
        this.detectedInstances.delete(instanceKey);
        hasNewInstances = true; // Trigger store update to remove widget
        log.widgetRegistration('Widget removed (requirements not met)', () => ({
          instanceKey,
        }));
      }
    });

    // Update widgetStore whenever instances change (new widgets OR requirements change)
    if (hasNewInstances) {
      this.updateWidgetStore();
    }
  }

  /**
   * Find widget types affected by a sensor update
   */
  private findAffectedWidgets(sensorType: SensorType, instance: number): WidgetRegistration[] {
    const affected: WidgetRegistration[] = [];

    this.registrations.forEach((registration) => {
      // Check if any required or optional sensors match this update
      const isAffected = [...registration.requiredSensors, ...registration.optionalSensors].some(
        (dep) => {
          if (dep.sensorType !== sensorType) return false;
          if (dep.instance !== undefined && dep.instance !== instance) return false;
          return true;
        },
      );

      if (isAffected) {
        affected.push(registration);
      }
    });

    return affected;
  }

  /**
   * Build sensor value map for a widget registration
   *
   * Implementation Notes:
   * - Extracts metric values from SensorInstance using getMetric() (unified API)
   * - CRITICAL: Only adds entries with valid (non-null/undefined) values
   * - Falls back to legacy direct property access if getMetric() unavailable
   * - Processes both required and optional sensors
   *
   * Why Only Non-Null Values:
   * 1. Widgets should only appear when sensor has actual data (not just exists)
   * 2. Key existence in map = valid data (simplifies detection logic)
   * 3. Eliminates need for separate validateData hook in custom widgets
   *
   * Performance:
   * - O(n) where n = total dependencies (required + optional)
   * - Typical: 2-5 dependencies, <0.1ms per call
   * - Uses MetricValue.si_value for detection (not formatted strings)
   *
   * Bug Fix History:
   * - Jan 2026: Changed from adding null values to filtering them out
   *   Old: valueMap[key] = value ?? null (always adds key)
   *   New: Only adds if value !== null && value !== undefined
   *
   * @param registration - Widget registration with sensor dependencies
   * @param instance - Sensor instance number to fetch data for
   * @param allSensors - Full sensor state from nmeaStore
   * @returns Map of sensor values (only valid entries, no nulls)
   */
  private buildSensorValueMap(
    registration: WidgetRegistration,
    instance: number,
    allSensors: any,
  ): SensorValueMap {
    const valueMap: SensorValueMap = {};
    const allDependencies = [...registration.requiredSensors, ...registration.optionalSensors];

    allDependencies.forEach((dep) => {
      const targetInstance = dep.instance ?? instance;
      const sensorData = allSensors[dep.sensorType]?.[targetInstance];

      if (sensorData) {
        // Access metric via getMetric() (unified MetricValue access)
        let value: any = null;
        if (sensorData.getMetric) {
          // SensorInstance - use getMetric()
          const metric = sensorData.getMetric(dep.metricName);
          value = metric?.si_value ?? null;
        } else {
          // Legacy direct access (fallback)
          value = (sensorData as any)[dep.metricName];
        }

        // CRITICAL: Only add to map if value is valid (non-null/undefined)
        // This ensures:
        // 1. Widgets only appear when sensor has actual data (not just exists)
        // 2. Key existence in map = valid data (simplifies detection logic)
        // 3. No need for separate validateData hook
        if (value !== null && value !== undefined) {
          const key = this.buildSensorKey(dep.sensorType, targetInstance, dep.metricName);
          valueMap[key] = value;
        }
      }
    });

    return valueMap;
  }

  /**
   * Build standardized sensor key for value map
   */
  private buildSensorKey(sensorType: SensorType, instance: number, metricName: string): string {
    return `${sensorType}.${instance}.${metricName}`;
  }



  /**
   * Get all currently detected widget instances
   */
  public getDetectedInstances(): DetectedWidgetInstance[] {
    return Array.from(this.detectedInstances.values());
  }





  /**
   * Update widgetStore with current detected instances
   */
  private updateWidgetStore(): void {
    // Don't update store during cleanup to prevent race conditions
    if (this.isCleaningUp) {
      return;
    }

    const instances = this.getDetectedInstances();
    log.widgetRegistration('updateWidgetStore', () => ({
      instanceCount: instances.length,
    }));

    // Import dynamically to avoid circular dependency
    import('../store/widgetStore')
      .then(({ useWidgetStore }) => {
        const store = useWidgetStore.getState();
        if (store.updateInstanceWidgets) {
          store.updateInstanceWidgets(instances as any);
        }
      })
      .catch((error) => {
        log.widgetRegistration('Error importing widgetStore', () => ({ error }));
      });
  }

  /**
   * Clear all detected instances (useful for reconnection scenarios)
   */
  public clearDetectedInstances(): void {
    this.detectedInstances.clear();
    this.updateWidgetStore();
  }

  /**
   * Reset service (for testing)
   */
  public reset(): void {
    this.registrations.clear();
    this.detectedInstances.clear();
    this.isCleaningUp = false;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const widgetRegistrationService = WidgetRegistrationService.getInstance();
