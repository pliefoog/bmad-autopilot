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

// Track if we've already initialized to prevent duplicate listeners
let isInitialized = false;
let sensorUpdateHandler: ((event: any) => void) | null = null;

/**
 * Initialize event-driven instance detection
 * 
 * This replaces the old startScanning() method with a simpler event listener
 * that delegates widget creation to the registration service.
 */
export function initializeInstanceDetection(): void {
  if (isInitialized) {
    console.log('[InstanceDetection] ⚠️ Already initialized, skipping');
    return;
  }
  
  console.log('[InstanceDetection] 🚀 Initializing event-driven widget detection...');
  
  // Subscribe to real-time sensor update events from nmeaStore
  const store = useNmeaStore.getState();
  
  sensorUpdateHandler = (event: { 
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
      return; // Silently skip missing data
    }
    
    // Notify registration service about sensor update
    // It will handle widget detection and creation
    widgetRegistrationService.handleSensorUpdate(
      event.sensorType as any,
      event.instance,
      sensorData,
      allSensors
    );
  };
  
  store.sensorEventEmitter.on('sensorUpdate', sensorUpdateHandler);
  
  isInitialized = true;
  console.log('[InstanceDetection] ✅ Event-driven detection active');
  
  // Perform initial scan of existing sensor data
  performInitialScan();
}

/**
 * Cleanup event-driven detection (for factory reset)
 */
export function cleanupInstanceDetection(): void {
  if (!isInitialized || !sensorUpdateHandler) return;
  
  const store = useNmeaStore.getState();
  store.sensorEventEmitter.removeListener('sensorUpdate', sensorUpdateHandler);
  
  sensorUpdateHandler = null;
  isInitialized = false;
  console.log('[InstanceDetection] 🧹 Event-driven detection cleaned up');
}

/**
 * Scan existing sensor data on startup
 * This handles sensors that arrived before detection was initialized
 */
function performInitialScan(): void {
  const state = useNmeaStore.getState();
  const allSensors = state.nmeaData.sensors;
  
  // Scan all sensor categories
  const sensorCategories = Object.keys(allSensors) as Array<keyof typeof allSensors>;
  
  sensorCategories.forEach(category => {
    const categoryData = allSensors[category];
    if (!categoryData) return;
    
    // Scan all instances in this category
    Object.keys(categoryData).forEach(instanceKey => {
      const instance = parseInt(instanceKey, 10);
      const sensorData = (categoryData as any)[instance];
      
      if (sensorData && sensorData.timestamp) {
        // Notify registration service
        widgetRegistrationService.handleSensorUpdate(
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
 * Cleanup function for shutdown
 */
export function shutdownInstanceDetection(): void {
  console.log('[InstanceDetection] 🛑 Shutting down instance detection...');
  
  const store = useNmeaStore.getState();
  store.sensorEventEmitter.removeAllListeners('sensorUpdate');
  
  widgetRegistrationService.clearDetectedInstances();
  
  console.log('[InstanceDetection] ✅ Shutdown complete');
}
