/**
 * WidgetRegistrationService - Event-Driven Widget Detection & Lifecycle Management
 *
 * Purpose:
 * - Central coordinator for widget registration and lifecycle management
 * - Bridge between sensor data (nmeaStore) and widget display (widgetStore)
 * - Delegates detection logic to WidgetDetector and expiration to WidgetExpirationManager
 *
 * Architecture (Jan 2026 Refactor):
 * - WidgetRegistrationService: Public API, event coordination, registration storage
 * - WidgetDetector: Sensor matching, value map construction, affected widget discovery
 * - WidgetExpirationManager: Freshness validation, expiration checks, timer management
 *
 * Key Features:
 * - Event-driven detection: Subscribes to nmeaStore sensor creation events (~0.01 Hz)
 * - Declarative dependencies: Widgets declare required/optional sensors
 * - Automatic lifecycle: Creation when sensors appear, removal when data becomes stale
 * - Multi-instance support: Handles multiple engines, batteries, tanks, etc.
 *
 * Related Files:
 * - WidgetDetector.ts: Sensor-to-widget matching logic
 * - WidgetExpirationManager.ts: Staleness checking and expiration management
 * - builtInWidgetRegistrations.ts: 12 built-in widget type definitions
 * - defaultCustomWidgets.ts: Custom widget definitions
 * - widgetStore.ts: Receives detected instances via updateInstanceWidgets()
 * - nmeaStore.ts: Emits 'sensorCreated' events via sensorEventEmitter
 */

import type { SensorType, SensorData, SensorsData } from '../types/SensorData';
import type { WidgetConfig } from '../types/widget.types';
import { log } from '../utils/logging/logger';
import { WidgetDetector } from './WidgetDetector';
import { WidgetExpirationManager } from './WidgetExpirationManager';

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
}

/**
 * Sensor created event from nmeaStore
 * Emitted when a new sensor instance first appears (~0.01 Hz frequency)
 * NOT emitted on data updates (those are handled by Zustand subscriptions)
 */
interface SensorCreatedEvent {
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

  // Helper classes for separation of concerns
  private detector: WidgetDetector = new WidgetDetector();
  private expirationManager: WidgetExpirationManager = new WidgetExpirationManager();

  // Initialization state
  private isInitialized = false;
  private sensorCreatedHandler: ((event: SensorCreatedEvent) => void) | null = null;
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
   * Set sensor data staleness threshold
   * Widgets will be removed if their required sensor data hasn't been updated within this time
   * 
   * @param thresholdMs - Staleness threshold in milliseconds
   */
  public setSensorDataStalenessThreshold(thresholdMs: number): void {
    this.expirationManager.setStalenessThreshold(thresholdMs);
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

      // Subscribe to sensor creation events
      this.sensorCreatedHandler = (event: SensorCreatedEvent) => {
        const currentState = useNmeaStore.getState();
        const allSensors = currentState.nmeaData.sensors;
        const sensorData = allSensors[event.sensorType as SensorType]?.[event.instance];

        if (!sensorData) return;

        this.handleSensorCreated(event.sensorType as SensorType, event.instance, sensorData, allSensors);
      };

      store.sensorEventEmitter.on('sensorCreated', this.sensorCreatedHandler);

      // Perform initial scan of existing sensor data
      this.performInitialScan(useNmeaStore.getState().nmeaData.sensors);

      this.isInitialized = true;
      // console.log('[WidgetRegistrationService] ✅ Initialized successfully');

      // Import widgetStore to sync staleness threshold setting
      import('../store/widgetStore').then(({ useWidgetStore }) => {
        const widgetStoreState = useWidgetStore.getState();
        this.expirationManager.setStalenessThreshold(widgetStoreState.widgetExpirationTimeout);

        // Start expiration check timer
        this.expirationManager.startTimer(() => this.checkExpiredWidgets());

        log.widgetRegistration('Expiration monitoring started', () => ({
          stalenessThresholdMs: this.expirationManager.getStalenessThreshold(),
        }));
      });
    });
  }

  /**
   * Perform initial scan of existing sensor data
   * 
   * Implementation Notes:
   * - Called once at initialization before event subscription
   * - Skips timestamp freshness validation for persisted data
   * - This allows widgets to appear immediately on app restart
   * - Expiration timer will remove stale widgets after startup
   */
  private performInitialScan(allSensors: SensorsData): void {
    const sensorCategories = Object.keys(allSensors) as SensorType[];

    sensorCategories.forEach((category) => {
      const categoryData = allSensors[category];
      if (!categoryData) return;

      Object.keys(categoryData).forEach((instanceKey) => {
        const instance = parseInt(instanceKey, 10);
        const sensorData = categoryData[instance];

        if (sensorData && sensorData.timestamp) {
          this.handleSensorCreated(category, instance, sensorData, allSensors, true);
        }
      });
    });
  }

  /**
   * Cleanup subscription (for factory reset)
   */
  public cleanup(): void {
    if (!this.isInitialized || !this.sensorCreatedHandler) return;

    // Set flag to prevent store updates during cleanup
    this.isCleaningUp = true;

    // Save handler reference before clearing it
    const handler = this.sensorCreatedHandler;

    import('../store/nmeaStore').then(({ useNmeaStore }) => {
      const store = useNmeaStore.getState();
      store.sensorEventEmitter.removeListener('sensorCreated', handler);
    });

    this.sensorCreatedHandler = null;
    this.isInitialized = false;

    // Stop expiration check timer
    this.expirationManager.stopTimer();

    this.clearDetectedInstances();
    // console.log('[WidgetRegistrationService] 🧹 Cleaned up');
  }

  /**
   * Handle sensor created event from nmeaStore
   *
   * Implementation Notes:
   * - Called when new sensor instances first appear (~0.01 Hz frequency)
   * - NOT called on data updates (those are handled by Zustand subscriptions at ~2Hz)
   * - Finds affected widgets using sensor type/instance matching
   * - Builds lightweight SensorValueMap for detection (not rendering)
   * - Creates/updates/removes DetectedWidgetInstance entries
   * - Updates widgetStore only when instance list changes (optimization)
   *
   * Event Semantics:
   * - Emitted ONLY when isNewInstance === true in nmeaStore
   * - Typically 12-20 events at connection time (one per sensor type/instance)
   * - Frequency: ~0.01 Hz (once per sensor per session)
   *
   * Performance:
   * - Early exit if no affected widgets (most events)
   * - Set-based change detection prevents unnecessary store updates
   * - Typical execution: <1ms for 3-5 registered widget types
   *
   * Data Flow:
   * 1. nmeaStore emits 'sensorCreated' event (topology change)
   * 2. This method receives event with sensorType/instance
   * 3. Finds widget registrations depending on this sensor
   * 4. Builds SensorValueMap for validation
   * 5. Checks if all required sensors have valid data
   * 6. Adds/updates/removes from detectedInstances Map
   * 7. Calls updateWidgetStore() if changes detected
   *
   * Bug Fix History:
   * - Jan 2026: Renamed from handleSensorUpdate - fixed misleading name
   * - Jan 2026: Corrected documentation - event is ~0.01 Hz, not 2Hz
   * - Jan 2026: Replaced debug flags with conditional logger
   * - Jan 2026: Simplified detection after null-value filtering fix
   * - Jan 2026: Added skipFreshnessCheck for initial scan of persisted data
   *
   * @internal Called only by event subscription in initialize()
   * @param sensorType - Type of sensor that was created (e.g., 'depth', 'engine')
   * @param instance - Instance number of the sensor (0-based)
   * @param sensorData - Partial sensor data from the creation event
   * @param allSensors - Full sensor state for multi-sensor widgets
   * @param skipFreshnessCheck - If true, skip timestamp validation (initial scan only)
   */
  private handleSensorCreated(
    sensorType: SensorType,
    instance: number,
    sensorData: Partial<SensorData>,
    allSensors: SensorsData,
    skipFreshnessCheck: boolean = false,
  ): void {
    log.widgetRegistration('handleSensorCreated', () => ({
      sensorType,
      instance,
      hasData: !!sensorData,
      dataKeys: sensorData ? Object.keys(sensorData) : [],
    }));

    // Find all widget types that depend on this sensor
    const affectedWidgets = this.detector.findAffectedWidgets(sensorType, instance, this.registrations);

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
      const sensorValueMap = this.detector.buildSensorValueMap(registration, instance, allSensors);

      // Check if all required sensors have valid data AND fresh timestamps
      // This prevents creating widgets with stale data that would be immediately removed
      const hasRequiredData = this.detector.hasRequiredSensors(registration, sensorValueMap);
      const allSensorsFresh = this.expirationManager.areRequiredSensorsFresh(
        registration,
        instance,
        allSensors,
        skipFreshnessCheck
      );
      
      const canCreate = hasRequiredData && allSensorsFresh;

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
   * Periodically check for expired widgets and remove them
   * 
   * Implementation Notes:
   * - Called by timer set up in initialize()
   * - Respects enableWidgetAutoRemoval flag from widgetStore
   * - Uses same freshness criteria as widget creation (prevents race condition)
   * - Checks all required sensors for each detected widget
   * - Removes widgets whose sensor data has become stale
   * 
   * Performance:
   * - Early exit if auto-removal disabled or no widgets exist
   * - Frequency: staleness threshold / 4 (e.g., 75s for 5min threshold)
   * - Typical execution: <5ms for 10-20 widgets
   * 
   * Bug Fix History:
   * - Jan 2026: Created to fix race condition between creation and expiration
   * - Jan 2026: Added enableWidgetAutoRemoval flag check
   * - Jan 2026: Unified freshness logic with areRequiredSensorsFresh() helper
   * 
   * @internal Called by expiration check timer
   */
  private checkExpiredWidgets(): void {
    if (this.detectedInstances.size === 0) return; // No widgets to check

    // Import stores to access sensor data and user preferences
    Promise.all([
      import('../store/nmeaStore'),
      import('../store/widgetStore')
    ])
      .then(([{ useNmeaStore }, { useWidgetStore }]) => {
        // Check if auto-removal is enabled
        const enableWidgetAutoRemoval = useWidgetStore.getState().enableWidgetAutoRemoval;
        if (!enableWidgetAutoRemoval) {
          log.widgetRegistration('Widget auto-removal disabled, skipping expiration check');
          return; // User disabled auto-removal
        }

        const allSensors = useNmeaStore.getState().nmeaData.sensors;
        const expiredKeys: string[] = [];

        this.detectedInstances.forEach((detectedInstance, instanceKey) => {
          const registration = this.registrations.get(detectedInstance.widgetType);
          if (!registration) {
            expiredKeys.push(instanceKey); // No registration = expired
            return;
          }

          // Use unified freshness check (same as creation logic)
          const allSensorsFresh = this.expirationManager.areRequiredSensorsFresh(
            registration,
            detectedInstance.instance,
            allSensors,
            false // Don't skip freshness check for expiration
          );

          if (!allSensorsFresh) {
            expiredKeys.push(instanceKey);
          }
        });

        // Remove expired widgets
        if (expiredKeys.length > 0) {
          expiredKeys.forEach(key => {
            const instance = this.detectedInstances.get(key);
            this.detectedInstances.delete(key);
            log.widgetRegistration('Widget expired (stale sensor data)', () => ({
              instanceKey: key,
              widgetType: instance?.widgetType,
            }));
          });

          // Update widget store to reflect removals
          this.updateWidgetStore();

          log.widgetRegistration('Expired widgets removed', () => ({
            count: expiredKeys.length,
            remainingWidgets: this.detectedInstances.size,
          }));
        }
      })
      .catch((error) => {
        log.widgetRegistration('Error in checkExpiredWidgets', () => ({ error }));
      });
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
          store.updateInstanceWidgets(instances);
        }
      })
      .catch((error) => {
        log.widgetRegistration('Error importing widgetStore', () => ({ error }));
      });
  }

  /**
   * Clear all detected instances
   * 
   * @internal Called only by cleanup()
   */
  private clearDetectedInstances(): void {
    this.detectedInstances.clear();
    this.updateWidgetStore();
  }
}

// Export singleton instance
export const widgetRegistrationService = WidgetRegistrationService.getInstance();
