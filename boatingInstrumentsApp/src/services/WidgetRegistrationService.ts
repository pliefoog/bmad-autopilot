/**
 * Widget Registration Service
 * 
 * Event-driven widget registration system that replaces polling-based detection.
 * Widgets declare their sensor dependencies (required vs optional), and the service
 * automatically creates widget instances when sensor data becomes available.
 * 
 * Architecture:
 * - Widgets register with required/optional sensor dependencies
 * - Service listens to nmeaStore sensor update events
 * - Creates widget instances immediately when required sensors have data
 * - Supports custom widgets with user-defined sensor mappings
 * - Memoizes calculated fields for performance
 */

import { EventEmitter } from 'events';
import type { SensorType, SensorData } from '../types/SensorData';
import type { WidgetConfig } from '../types/widget.types';

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
}

/**
 * Detected widget instance ready to be created
 */
export interface DetectedWidgetInstance {
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

    // Check all required sensors are present with valid data
    const hasRequiredSensors = registration.requiredSensors.every(dep => {
      const key = this.buildSensorKey(dep.category, dep.instance ?? 0, dep.measurementType);
      const value = sensorData[key];
      return value !== null && value !== undefined;
    });

    if (!hasRequiredSensors) return false;

    // Run custom validation if provided
    if (registration.validateData) {
      return registration.validateData(sensorData);
    }

    return true;
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
    // Find all widget types that depend on this sensor
    const affectedWidgets = this.findAffectedWidgets(sensorType, instance);

    affectedWidgets.forEach(registration => {
      // Build sensor value map for this widget type
      const sensorValueMap = this.buildSensorValueMap(
        registration,
        instance,
        allSensors
      );

      // Check if widget can be created
      if (this.canCreateWidget(registration.widgetType, sensorValueMap)) {
        // Calculate any derived fields
        const calculatedFields = this.calculateFields(registration, sensorValueMap);

        // Create or update detected instance
        const instanceKey = `${registration.widgetType}-${instance}`;
        const detectedInstance: DetectedWidgetInstance = {
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

        // Emit event for widget store to handle
        if (isNewInstance) {
          console.log(`✅ Detected new widget instance: ${instanceKey}`);
          this.eventEmitter.emit('widgetDetected', detectedInstance);
        } else {
          this.eventEmitter.emit('widgetUpdated', detectedInstance);
        }
      }
    });

    // Emit aggregate event with all detected instances
    this.emitDetectedInstances();
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
   * Emit aggregate detected instances event
   */
  private emitDetectedInstances(): void {
    const instances = this.getDetectedInstances();
    this.eventEmitter.emit('detectedInstancesChanged', instances);
  }

  /**
   * Clear all detected instances (useful for reconnection scenarios)
   */
  public clearDetectedInstances(): void {
    this.detectedInstances.clear();
    this.lastSensorValues.clear();
    this.emitDetectedInstances();
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
  }
}

// Export singleton instance
export const widgetRegistrationService = WidgetRegistrationService.getInstance();
