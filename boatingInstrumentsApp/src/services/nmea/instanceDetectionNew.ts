/**
 * NMEA Instance Detection Service - Event-Driven Architecture
 * 
 * NEW: Uses WidgetRegistrationService for event-driven widget creation.
 * Replaces polling-based scanning with real-time sensor event listeners.
 * 
 * Architecture:
 * 1. Subscribe to nmeaStore sensor update events
 * 2. When sensor data arrives, notify WidgetRegistrationService
 * 3. Registration service checks which widgets need those sensors
 * 4. Widgets created immediately when all required sensors available
 * 
 * Benefits:
 * - Instant widget creation (<100ms vs 0-10s)
 * - No CPU overhead during idle periods
 * - Decoupled widget logic from detection logic
 * - Extensible for custom widgets
 */

import { useNmeaStore } from '../../store/nmeaStore';
import { widgetRegistrationService } from '../WidgetRegistrationService';
import type { DetectedWidgetInstance } from '../WidgetRegistrationService';

/**
 * Initialize event-driven instance detection
 * 
 * This replaces the old startScanning() method with a simpler event listener
 * that delegates widget creation to the registration service.
 */
export function initializeInstanceDetection(): void {
  console.log('[InstanceDetection] 🚀 Initializing event-driven widget detection...');
  
  // Subscribe to real-time sensor update events from nmeaStore
  const store = useNmeaStore.getState();
  
  store.sensorEventEmitter.on('sensorUpdate', (event: { 
    sensorType: string; 
    instance: number; 
    timestamp: number;
  }) => {
    // Get full sensor state
    const currentState = useNmeaStore.getState();
    const allSensors = currentState.nmeaData.sensors;
    
    // Get the specific sensor data that triggered this event
    const sensorData = (allSensors as any)[event.sensorType]?.[event.instance];
    
    if (!sensorData) {
      console.warn(`[InstanceDetection] ⚠️ Sensor data not found for ${event.sensorType}.${event.instance}`);
      return;
    }
    
    // Notify registration service about sensor update
    // It will handle widget detection and creation
    widgetRegistrationService.handleSensorUpdate(
      event.sensorType as any,
      event.instance,
      sensorData,
      allSensors
    );
  });
  
  console.log('[InstanceDetection] ✅ Event-driven detection active');
  
  // Perform initial scan of existing sensor data
  performInitialScan();
}

/**
 * Scan existing sensor data on startup
 * This handles sensors that arrived before detection was initialized
 */
function performInitialScan(): void {
  console.log('[InstanceDetection] 🔍 Performing initial sensor scan...');
  
  const state = useNmeaStore.getState();
  const allSensors = state.nmeaData.sensors;
  
  // Scan all sensor categories
  const sensorCategories = Object.keys(allSensors) as Array<keyof typeof allSensors>;
  console.log('[InstanceDetection] 📋 Sensor categories:', sensorCategories);
  
  sensorCategories.forEach(category => {
    const categoryData = allSensors[category];
    if (!categoryData) return;
    
    const instances = Object.keys(categoryData);
    console.log(`[InstanceDetection] 📊 ${category}: ${instances.length} instance(s) [${instances.join(', ')}]`);
    
    // Scan all instances in this category
    instances.forEach(instanceKey => {
      const instance = parseInt(instanceKey, 10);
      const sensorData = (categoryData as any)[instance];
      
      if (sensorData && sensorData.timestamp) {
        console.log(`[InstanceDetection] ✅ Notifying registration service: ${category}.${instance}`);
        // Notify registration service
        widgetRegistrationService.handleSensorUpdate(
          category as any,
          instance,
          sensorData,
          allSensors
        );
      } else {
        console.log(`[InstanceDetection] ⚠️ Skipping ${category}.${instance}: no timestamp`);
      }
    });
  });
  
  console.log('[InstanceDetection] ✅ Initial scan complete');
}

/**
 * Subscribe to widget detection events
 * Callback receives detected widget instances ready for creation
 */
export function onWidgetInstancesDetected(
  callback: (instances: DetectedWidgetInstance[]) => void
): void {
  widgetRegistrationService.onDetectedInstancesChanged(callback);
}

/**
 * Get currently detected widget instances
 */
export function getDetectedInstances(): DetectedWidgetInstance[] {
  return widgetRegistrationService.getDetectedInstances();
}

/**
 * Clear all detected instances (useful for reconnection scenarios)
 */
export function clearDetectedInstances(): void {
  widgetRegistrationService.clearDetectedInstances();
}

/**
 * Legacy compatibility: Get detected instances grouped by type
 * This maintains backward compatibility with existing code that expects
 * the old { engines, batteries, tanks, temperatures, instruments } format
 */
export function getDetectedInstancesByType(): {
  engines: DetectedWidgetInstance[];
  batteries: DetectedWidgetInstance[];
  tanks: DetectedWidgetInstance[];
  temperatures: DetectedWidgetInstance[];
  instruments: DetectedWidgetInstance[]; // GPS, compass, speed, wind, depth, autopilot
  custom: DetectedWidgetInstance[];
} {
  const grouped = widgetRegistrationService.getDetectedInstancesByType();
  
  // Map navigation widgets to "instruments" for backward compatibility
  const instruments = [
    ...(grouped['depth'] || []),
    ...(grouped['speed'] || []),
    ...(grouped['wind'] || []),
    ...(grouped['compass'] || []),
    ...(grouped['gps'] || []),
    ...(grouped['autopilot'] || []),
  ];
  
  return {
    engines: grouped['engine'] || [],
    batteries: grouped['battery'] || [],
    tanks: grouped['tank'] || [],
    temperatures: grouped['temperature'] || [],
    instruments,
    custom: grouped['sailing-dashboard'] || [], // Default custom widget
  };
}

/**
 * Legacy export for backward compatibility
 * TODO: Remove once all references updated
 */
export const NMEA_TEMPERATURE_INSTANCES = {} as any;

/**
 * Cleanup function for shutdown
 */
export function shutdownInstanceDetection(): void {
  console.log('[InstanceDetection] 🛑 Shutting down instance detection...');
  
  const store = useNmeaStore.getState();
  store.sensorEventEmitter.removeAllListeners('sensorUpdate');
  
  widgetRegistrationService.clearDetectedInstances();
  
  console.log('[InstanceDetection] ✅ Shutdown complete');
}
