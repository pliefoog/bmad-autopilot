/**
 * Widget Registration Service
 * 
 * Event-driven widget registration system that replaces polling-based detection.
 * Widgets declare their sensor dependencies (required vs optional), and the service
 * automatically creates widget instances when sensor data becomes available.
 * 
 * Architecture:
 * - Widgets register with required/optional sensor dependencies
 * - Service subscribes directly to nmeaStore sensor update events
 * - Creates widget instances immediately when required sensors have data
 * - Directly updates widgetStore (no event forwarding)
 * - Supports custom widgets with user-defined sensor mappings
 * - Memoizes calculated fields for performance
 */

import { EventEmitter } from 'events';
import type { SensorType, SensorData } from '../types/SensorData';
import type { WidgetConfig } from '../types/widget.types';

// Direct console reference to bypass logger filtering for critical debug
const _console = typeof window !== 'undefined' && (window as any)._console 
  ? (window as any)._console 
  : console;

// Debug logging toggle - set to true to enable verbose widget registration logs
const DEBUG_WIDGET_REGISTRATION = false;

/**
 * Sensor dependency declaration
 * Describes which sensor data a widget requires or optionally uses
 */
export interface SensorDependency {
  /** Sensor category (e.g., 'depth', 'speed', 'engine') */
  category: SensorType;
  
  /** Specific measurement field (e.g., 'dbt', 'sog', 'rpm') */
  measurementType: string;
  
  /** Specific instance number, or undefined for any instance */
  instance?: number;
  
  /** Is this sensor required for widget creation? */
  required: boolean;
  
  /** Human-readable label for this sensor binding */
  label?: string;
}

/**
 * Calculated field definition for derived metrics
 * Example: VMG = SOG × cos(TWA)
 */
export interface CalculatedField {
  /** Unique field identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Calculation function - receives sensor values, returns calculated value */
  calculate: (sensors: SensorValueMap) => number | null;
  
  /** List of sensor dependencies that trigger recalculation */
  dependencies: Array<{ category: SensorType; measurementType: string }>;
  
  /** Cached value */
  cachedValue?: number | null;
  
  /** Timestamp of last calculation */
  lastCalculated?: number;
}

/**
 * Map of sensor values for calculation and binding
 */
export interface SensorValueMap {
  [key: string]: number | null; // key format: "category.instance.measurementType"
}

/**
 * Widget registration configuration
 */
export interface WidgetRegistration {
  /** Unique widget type identifier */
  widgetType: string;
  
  /** Human-readable name */
  displayName: string;
  
  /** Widget category for organization */
  category: 'navigation' | 'engine' | 'environment' | 'autopilot' | 'utility' | 'custom';
  
  /** Icon name (Ionicons) */
  icon: string;
  
  /** Sensors that MUST be present for widget to be created */
  requiredSensors: SensorDependency[];
  
  /** Sensors that are nice to have but not mandatory */
  optionalSensors: SensorDependency[];
  
  /** Calculated fields (derived metrics) */
  calculatedFields?: CalculatedField[];
  
  /** Function to create widget configuration when sensors available */
  createWidget: (instance: number, sensorData: SensorValueMap) => WidgetConfig;
  
  /** Optional validation function for additional checks */
  validateData?: (sensorData: SensorValueMap) => boolean;
  
  /** Priority for widget ordering (higher = shown first) */
  priority?: number;
  
  /** Is this a multi-instance widget type? */
  multiInstance: boolean;
  
  /** Maximum number of instances (-1 = unlimited) */
  maxInstances?: number;
  
  /** How long without data before widget expires (ms). If not specified, uses global default (5 minutes) */
  expirationTimeout?: number;
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
  calculatedFields?: Record<string, number | null>;
}

/**
 * Widget Registration Service
 * 
 * Central registry for widget types and event-driven widget detection/creation
 */
export class WidgetRegistrationService {
  private static instance: WidgetRegistrationService;
  private registrations: Map<string, WidgetRegistration> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private detectedInstances: Map<string, DetectedWidgetInstance> = new Map();
  private calculatedFieldCache: Map<string, CalculatedField> = new Map();
  
  // Memoization for calculated fields
  private lastSensorValues: Map<string, SensorValueMap> = new Map();
  
  // Initialization state
  private isInitialized = false;
  private sensorUpdateHandler: ((event: any) => void) | null = null;
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
   */
  public registerWidget(registration: WidgetRegistration): void {
    console.log(`📋 Registering widget: ${registration.widgetType}`);
    this.registrations.set(registration.widgetType, registration);
    
    // Initialize calculated field cache
    if (registration.calculatedFields) {
      registration.calculatedFields.forEach(field => {
        const cacheKey = `${registration.widgetType}.${field.id}`;
        this.calculatedFieldCache.set(cacheKey, field);
      });
    }
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
    instancesToRemove.forEach(key => this.detectedInstances.delete(key));
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
   * Check if a widget type can be created with available sensor data
   */
  public canCreateWidget(
    widgetType: string,
    sensorData: SensorValueMap
  ): boolean {
    const registration = this.registrations.get(widgetType);
    if (!registration) return false;

    // Check all required sensors are present
    // Note: We check for key existence, not value !== null, because:
    // 1. Speed can legitimately be 0 (boat stopped)
    // 2. If the key exists in sensorData, it means sensor data was received
    const hasRequiredSensors = registration.requiredSensors.every(dep => {
      // For multi-instance widgets with no specific instance requirement,
      // check if ANY instance of this sensor type/measurement exists in the map
      if (dep.instance === undefined) {
        // Look for any key matching the pattern: category.*.measurementType
        const pattern = new RegExp(`^${dep.category}\\.\\d+\\.${dep.measurementType}$`);
        const matchingKey = Object.keys(sensorData).find(key => pattern.test(key));
        if (matchingKey) {
          // Key exists = sensor data available (value can be 0, null is OK if sensor exists)
          return matchingKey in sensorData;
        }
        return false;
      } else {
        // Specific instance required
        const key = this.buildSensorKey(dep.category, dep.instance, dep.measurementType);
        // Check if key exists in map (sensor data available)
        return key in sensorData;
      }
    });

    if (!hasRequiredSensors) return false;

    // Run custom validation if provided
    if (registration.validateData) {
      return registration.validateData(sensorData);
    }

    return true;
  }

  /**
   * Initialize the service by subscribing to nmeaStore events
   * Call this once during app startup after registering all widget types
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('[WidgetRegistrationService] ⚠️ Already initialized');
      return;
    }
    
    // Reset cleanup flag at the START of initialization
    this.isCleaningUp = false;
    
    console.log('[WidgetRegistrationService] 🚀 Initializing...');
    
    // Import dynamically to avoid circular dependency
    import('../store/nmeaStore').then(({ useNmeaStore }) => {
      const store = useNmeaStore.getState();
      
      // Subscribe to real-time sensor updates
      this.sensorUpdateHandler = (event: { 
        sensorType: string; 
        instance: number; 
        timestamp: number;
      }) => {
        const currentState = useNmeaStore.getState();
        const allSensors = currentState.nmeaData.sensors;
        const sensorData = (allSensors as any)[event.sensorType]?.[event.instance];
        
        if (!sensorData) return;
        
        this.handleSensorUpdate(
          event.sensorType as any,
          event.instance,
          sensorData,
          allSensors
        );
      };
      
      store.sensorEventEmitter.on('sensorUpdate', this.sensorUpdateHandler);
      
      // Perform initial scan of existing sensor data
      this.performInitialScan(useNmeaStore.getState().nmeaData.sensors);
      
      this.isInitialized = true;
      console.log('[WidgetRegistrationService] ✅ Initialized successfully');
    });
  }
  
  /**
   * Perform initial scan of existing sensor data
   */
  private performInitialScan(allSensors: any): void {
    const sensorCategories = Object.keys(allSensors);
    
    sensorCategories.forEach(category => {
      const categoryData = allSensors[category];
      if (!categoryData) return;
      
      Object.keys(categoryData).forEach(instanceKey => {
        const instance = parseInt(instanceKey, 10);
        const sensorData = categoryData[instance];
        
        if (sensorData && sensorData.timestamp) {
          this.handleSensorUpdate(
            category as any,
            instance,
            sensorData,
            allSensors
          );
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
    
    import('../store/nmeaStore').then(({ useNmeaStore }) => {
      const store = useNmeaStore.getState();
      store.sensorEventEmitter.removeListener('sensorUpdate', this.sensorUpdateHandler);
    });
    
    this.sensorUpdateHandler = null;
    this.isInitialized = false;
    this.clearDetectedInstances();
    console.log('[WidgetRegistrationService] 🧹 Cleaned up');
  }

  /**
   * Handle sensor update event from nmeaStore
   * This is called whenever sensor data changes
   */
  public handleSensorUpdate(
    sensorType: SensorType,
    instance: number,
    sensorData: Partial<SensorData>,
    allSensors: any // Full sensor state from nmeaStore
  ): void {
    if (DEBUG_WIDGET_REGISTRATION) console.log(`🔧 [WidgetRegistrationService] handleSensorUpdate called: ${sensorType}-${instance}`);
    
    // Find all widget types that depend on this sensor
    const affectedWidgets = this.findAffectedWidgets(sensorType, instance);
    if (DEBUG_WIDGET_REGISTRATION) console.log(`🔧 [WidgetRegistrationService] Found ${affectedWidgets.length} affected widgets`);

    affectedWidgets.forEach(registration => {
      const instanceKey = `${registration.widgetType}-${instance}`;
      
      // Early exit: If widget already detected, just update sensor data
      if (this.detectedInstances.has(instanceKey)) {
        const existingInstance = this.detectedInstances.get(instanceKey)!;
        // Update sensor data
        this.detectedInstances.set(instanceKey, {
          ...existingInstance,
          sensorData: this.buildSensorValueMap(registration, instance, allSensors),
        });
        return; // Skip validation for already-detected widgets
      }
      // Build sensor value map for this widget type
      const sensorValueMap = this.buildSensorValueMap(
        registration,
        instance,
        allSensors
      );
      
      // Debug logging for custom widgets
      if (registration.widgetType === 'customT1') {
        console.log(`🔍 [CUSTOM WIDGET DEBUG] customT1 sensor map:`, sensorValueMap);
        console.log(`🔍 [CUSTOM WIDGET DEBUG] Required sensors:`, registration.requiredSensors);
      }
      
      // Check if widget can be created
      const canCreate = this.canCreateWidget(registration.widgetType, sensorValueMap);
      
      if (registration.widgetType === 'customT1') {
        console.log(`🔍 [CUSTOM WIDGET DEBUG] Can create customT1? ${canCreate}`);
      }
      
      if (canCreate) {
        // Calculate any derived fields
        const calculatedFields = this.calculateFields(registration, sensorValueMap);

        // Create or update detected instance
        const instanceKey = `${registration.widgetType}-${instance}`;
        const detectedInstance: DetectedWidgetInstance = {
          id: instanceKey, // Add id field: widgetType-instance
          widgetType: registration.widgetType,
          instance,
          title: registration.displayName,
          icon: registration.icon,
          priority: registration.priority ?? 100,
          sensorData: sensorValueMap,
          calculatedFields,
        };

        const isNewInstance = !this.detectedInstances.has(instanceKey);
        this.detectedInstances.set(instanceKey, detectedInstance);

        if (isNewInstance) {
          console.log(`✅ Detected new widget instance: ${instanceKey}`);
        }
      }
    });

    // Directly update widgetStore with all detected instances
    if (DEBUG_WIDGET_REGISTRATION) console.log(`🔧 [WidgetRegistrationService] handleSensorUpdate complete, calling updateWidgetStore()`);
    this.updateWidgetStore();
  }

  /**
   * Find widget types affected by a sensor update
   */
  private findAffectedWidgets(
    sensorType: SensorType,
    instance: number
  ): WidgetRegistration[] {
    const affected: WidgetRegistration[] = [];

    this.registrations.forEach(registration => {
      // Check if any required or optional sensors match this update
      const isAffected = [...registration.requiredSensors, ...registration.optionalSensors]
        .some(dep => {
          if (dep.category !== sensorType) return false;
          if (dep.instance !== undefined && dep.instance !== instance) return false;
          return true;
        });

      if (isAffected) {
        affected.push(registration);
      }
    });

    return affected;
  }

  /**
   * Build sensor value map for a widget registration
   */
  private buildSensorValueMap(
    registration: WidgetRegistration,
    instance: number,
    allSensors: any
  ): SensorValueMap {
    const valueMap: SensorValueMap = {};
    const allDependencies = [
      ...registration.requiredSensors,
      ...registration.optionalSensors,
    ];

    allDependencies.forEach(dep => {
      const targetInstance = dep.instance ?? instance;
      const sensorData = allSensors[dep.category]?.[targetInstance];
      
      if (sensorData) {
        const value = (sensorData as any)[dep.measurementType];
        const key = this.buildSensorKey(dep.category, targetInstance, dep.measurementType);
        valueMap[key] = value ?? null;
      }
    });

    return valueMap;
  }

  /**
   * Build standardized sensor key for value map
   */
  private buildSensorKey(
    category: SensorType,
    instance: number,
    measurementType: string
  ): string {
    return `${category}.${instance}.${measurementType}`;
  }

  /**
   * Calculate derived fields for a widget
   * Uses memoization to avoid unnecessary recalculations
   */
  private calculateFields(
    registration: WidgetRegistration,
    sensorValueMap: SensorValueMap
  ): Record<string, number | null> | undefined {
    if (!registration.calculatedFields || registration.calculatedFields.length === 0) {
      return undefined;
    }

    const results: Record<string, number | null> = {};
    const cacheKey = registration.widgetType;
    const previousValues = this.lastSensorValues.get(cacheKey);

    registration.calculatedFields.forEach(field => {
      // Check if dependencies have changed (simple memoization)
      let needsRecalculation = true;
      
      if (previousValues && field.cachedValue !== undefined) {
        // Check if any dependency values changed
        const dependenciesChanged = field.dependencies.some(dep => {
          const key = this.buildSensorKey(dep.category, 0, dep.measurementType);
          return sensorValueMap[key] !== previousValues[key];
        });
        
        if (!dependenciesChanged) {
          // Use cached value
          results[field.id] = field.cachedValue ?? null;
          needsRecalculation = false;
        }
      }

      if (needsRecalculation) {
        // Calculate new value
        const calculatedValue = field.calculate(sensorValueMap);
        results[field.id] = calculatedValue;
        
        // Update cache
        field.cachedValue = calculatedValue;
        field.lastCalculated = Date.now();
      }
    });

    // Store current values for next comparison
    this.lastSensorValues.set(cacheKey, { ...sensorValueMap });

    return results;
  }

  /**
   * Get all currently detected widget instances
   */
  public getDetectedInstances(): DetectedWidgetInstance[] {
    return Array.from(this.detectedInstances.values());
  }

  /**
   * Get detected instances grouped by widget type
   */
  public getDetectedInstancesByType(): Record<string, DetectedWidgetInstance[]> {
    const grouped: Record<string, DetectedWidgetInstance[]> = {};

    this.detectedInstances.forEach(instance => {
      if (!grouped[instance.widgetType]) {
        grouped[instance.widgetType] = [];
      }
      grouped[instance.widgetType].push(instance);
    });

    return grouped;
  }

  /**
   * Subscribe to widget detection events
   */
  public onWidgetDetected(callback: (instance: DetectedWidgetInstance) => void): void {
    this.eventEmitter.on('widgetDetected', callback);
  }

  /**
   * Subscribe to widget update events
   */
  public onWidgetUpdated(callback: (instance: DetectedWidgetInstance) => void): void {
    this.eventEmitter.on('widgetUpdated', callback);
  }

  /**
   * Subscribe to aggregate detected instances updates
   */
  public onDetectedInstancesChanged(
    callback: (instances: DetectedWidgetInstance[]) => void
  ): void {
    this.eventEmitter.on('detectedInstancesChanged', callback);
  }

  /**
   * Unsubscribe from events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Update widgetStore with current detected instances
   */
  private updateWidgetStore(): void {
    // Don't update store during cleanup to prevent race conditions
    if (this.isCleaningUp) {
      console.log('⚠️ [WidgetRegistrationService] Skipping store update - cleaning up');
      return;
    }
    
    const instances = this.getDetectedInstances();
    if (DEBUG_WIDGET_REGISTRATION) console.log(`🔧 [WidgetRegistrationService] Updating store with ${instances.length} instances`);
    
    // Import dynamically to avoid circular dependency
    import('../store/widgetStore').then(({ useWidgetStore }) => {
      const store = useWidgetStore.getState();
      if (store.updateInstanceWidgets) {
        if (DEBUG_WIDGET_REGISTRATION) console.log(`🔧 [WidgetRegistrationService] Calling store.updateInstanceWidgets with ${instances.length} instances`);
        store.updateInstanceWidgets(instances as any);
      } else {
        console.log('⚠️ [WidgetRegistrationService] store.updateInstanceWidgets not available');
      }
    }).catch(error => {
      console.log('❌ [WidgetRegistrationService] Error importing widgetStore:', error);
    });
  }

  /**
   * Clear all detected instances (useful for reconnection scenarios)
   */
  public clearDetectedInstances(): void {
    this.detectedInstances.clear();
    this.lastSensorValues.clear();
    this.updateWidgetStore();
  }

  /**
   * Reset service (for testing)
   */
  public reset(): void {
    this.registrations.clear();
    this.detectedInstances.clear();
    this.calculatedFieldCache.clear();
    this.lastSensorValues.clear();
    this.eventEmitter.removeAllListeners();
    this.isCleaningUp = false;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const widgetRegistrationService = WidgetRegistrationService.getInstance();
