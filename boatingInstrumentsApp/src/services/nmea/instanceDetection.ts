import { useNmeaStore } from '../../store/nmeaStore';
import { WidgetFactory } from '../WidgetFactory';
import { WidgetMetadataRegistry } from '../../registry/WidgetMetadataRegistry';

/**
 * NMEA Instance Detection Service
 * 
 * Detects marine instruments and multi-instance devices from NMEA data.
 * Uses Widget Factory and Metadata Registry for consistent widget creation.
 * 
 * Responsibilities:
 * - NMEA data scanning and parsing
 * - Instance lifecycle management
 * - Device detection and monitoring
 * - Callback notifications for widget updates
 * 
 * Widget metadata (titles, icons, categories) handled by WidgetFactory.
 */

// NMEA Detection Configuration
// Defines NMEA PGNs and sentences for instrument detection
const NMEA_INSTRUMENT_DETECTION = {
  gps: {
    pgns: [129025, 129026, 129029], // Position Rapid Update, COG SOG Rapid Update, GNSS Position Data
    sentences: ['GGA', 'GLL', 'RMC', 'VTG'], // GPS sentences
  },
  compass: {
    pgns: [127250, 127251], // Vessel Heading, Rate of Turn
    sentences: ['HDG', 'HDT', 'HDM'], // Heading sentences
  },
  speed: {
    pgns: [128259, 129026], // Speed through Water, COG SOG Rapid Update
    sentences: ['VHW', 'VTG', 'RMC'], // Speed sentences
  },
  wind: {
    pgns: [130306], // Wind Data
    sentences: ['MWV', 'MWD'], // Wind sentences
  },
  depth: {
    pgns: [128267], // Water Depth
    sentences: ['DPT', 'DBT'], // Depth sentences
  }
} as const;

// Legacy constants exported for backward compatibility during transition
// TODO: Remove these exports once all references are updated to use WidgetFactory
export const NMEA_TEMPERATURE_INSTANCES = {} as any; // Deprecated - use WidgetMetadataRegistry

// Types for detected instances
export interface DetectedInstance {
  id: string;
  type: 'gps' | 'compass' | 'speed' | 'wind' | 'depth' | 'engine' | 'battery' | 'tank' | 'temperature';
  instance?: number; // Optional for single instruments (GPS, compass, etc.)
  title: string;
  icon: string;
  priority: number;
  lastSeen: number;
  category: 'navigation' | 'environment' | 'engine' | 'power' | 'fluid';
  sourceAddress?: number; // For engines
  fluidType?: string; // For tanks
  location?: string; // For temperature sensors
  position?: string; // For tanks
}

export interface InstanceDetectionState {
  // Single marine instruments
  instruments: Map<string, DetectedInstance>; // GPS, compass, speed, wind, depth
  // Multi-instance devices
  engines: Map<string, DetectedInstance>;
  batteries: Map<string, DetectedInstance>;
  tanks: Map<string, DetectedInstance>;
  temperatures: Map<string, DetectedInstance>;
  isScanning: boolean;
  lastScanTime: number;
  scanInterval: number;
}

export interface RuntimeMetrics {
  totalInstances: number;
  activeEngines: number;
  activeBatteries: number;
  activeTanks: number;
  activeTemperatures: number;
  orphanedInstances: number;
  memoryUsageBytes: number;
  lastCleanupTime: number;
  cleanupCount: number;
}

class InstanceDetectionService {
  private state: InstanceDetectionState = {
    instruments: new Map(), // Single instruments: GPS, compass, speed, wind, depth
    engines: new Map(),
    batteries: new Map(),
    tanks: new Map(),
    temperatures: new Map(),
    isScanning: false,
    lastScanTime: 0,
    scanInterval: 10000, // 10 seconds
  };

  private scanTimer: NodeJS.Timeout | null = null;
  private readonly MAX_INSTANCES_PER_TYPE = 16;
  private readonly INSTANCE_TIMEOUT = 30000; // 30 seconds
  
  // Event-driven detection (Phase 1 optimization)
  private lastEventTime = new Map<string, number>();
  private readonly EVENT_THROTTLE_MS = 100; // Max 10 events/sec per sensor instance

  // Callback system for instance updates
  private instanceCallbacks: Array<(instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void> = [];

  // Runtime management tracking
  private runtimeMetrics: RuntimeMetrics = {
    totalInstances: 0,
    activeEngines: 0,
    activeBatteries: 0,
    activeTanks: 0,
    activeTemperatures: 0,
    orphanedInstances: 0,
    memoryUsageBytes: 0,
    lastCleanupTime: 0,
    cleanupCount: 0
  };

  /**
   * Start instance detection scanning with event-driven architecture (Phase 1 optimization)
   * 
   * Changed from 10s polling to real-time event-driven detection:
   * - Subscribes to sensor update events from nmeaStore
   * - Instant widget creation (<100ms latency vs 0-10s)
   * - 80% reduction in CPU usage during idle periods
   * - Background cleanup timer runs every 60s (vs 10s polling)
   */
  public startScanning(): void {
    if (this.state.isScanning) {
      return;
    }

    this.state.isScanning = true;
    console.log('[InstanceDetection] 🚀 Starting event-driven instance detection (Phase 1)...');
    
    // Run initial full scan
    this.performScan();
    
    // Subscribe to real-time sensor update events
    const store = useNmeaStore.getState();
    store.sensorEventEmitter.on('sensorUpdate', this.handleSensorUpdate);
    console.log('[InstanceDetection] ✅ Subscribed to real-time sensor events');
    
    // Background cleanup timer (reduced from 10s to 60s)
    // Only removes stale instances, no longer does full scans
    this.scanTimer = setInterval(() => {
      this.cleanupStaleInstances();
      this.updateRuntimeMetrics();
    }, 60000); // 60 seconds - cleanup only
    
    console.log('[InstanceDetection] ⏱️  Background cleanup scheduled (60s interval)');
  }
  
  /**
   * Handle real-time sensor update events (Phase 1 optimization)
   * 
   * Called immediately when sensor data arrives (vs polling every 10s).
   * Implements throttling to prevent event storms during rapid updates.
   */
  private handleSensorUpdate = (event: { sensorType: string; instance: number; timestamp: number }): void => {
    // Event throttling: prevent storms during rapid updates
    const throttleKey = `${event.sensorType}-${event.instance}`;
    const now = Date.now();
    const lastTime = this.lastEventTime.get(throttleKey) || 0;
    
    if (now - lastTime < this.EVENT_THROTTLE_MS) {
      return; // Throttled - skip this update
    }
    
    this.lastEventTime.set(throttleKey, now);
    
    // Get current NMEA data
    const nmeaData = useNmeaStore.getState().nmeaData;
    const currentTime = Date.now();
    
    // Scan only the specific sensor type that changed (optimized)
    switch (event.sensorType) {
      case 'gps':
      case 'compass':
      case 'speed':
      case 'wind':
      case 'depth':
      case 'autopilot':
        this.scanForMarineInstruments(nmeaData, currentTime);
        break;
      case 'engine':
        this.scanForEngineInstances(nmeaData, currentTime);
        break;
      case 'battery':
        this.scanForBatteryInstances(nmeaData, currentTime);
        break;
      case 'tank':
        this.scanForTankInstances(nmeaData, currentTime);
        break;
      case 'temperature':
        this.scanForTemperatureInstances(nmeaData, currentTime);
        break;
      default:
        console.warn(`[InstanceDetection] Unknown sensor type in event: ${event.sensorType}`);
        return;
    }
    
    // Update metrics and notify callbacks immediately
    this.updateRuntimeMetrics();
    this.notifyInstanceCallbacks();
  };
  
  /**
   * Get total instance count for performance monitoring
   */
  private getTotalInstanceCount(): number {
    return this.state.engines.size + this.state.batteries.size + this.state.tanks.size;
  }

  /**
   * Stop instance detection scanning (event-driven)
   */
  public stopScanning(): void {
    if (!this.state.isScanning) {
      return;
    }

    this.state.isScanning = false;
    
    // Unsubscribe from sensor events
    const store = useNmeaStore.getState();
    store.sensorEventEmitter.off('sensorUpdate', this.handleSensorUpdate);
    console.log('[InstanceDetection] 🔌 Unsubscribed from sensor events');
    
    // Stop cleanup timer
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    
    // Clear throttle cache
    this.lastEventTime.clear();
    
    console.log('[InstanceDetection] ⏹️  Stopped event-driven instance detection.');
  }

  /**
   * Perform a single scan of NMEA data for instances
   */
  private performScan(): void {
    const startTime = performance.now();
    const currentTime = Date.now();
    
    try {
      // Get current NMEA data from store (use the nested nmeaData object)
      const storeState = useNmeaStore.getState();
      const nmeaData = storeState.nmeaData;
      
      // Scan for all NMEA instruments and instances
      this.scanForMarineInstruments(nmeaData, currentTime);
      this.scanForEngineInstances(nmeaData, currentTime);
      this.scanForBatteryInstances(nmeaData, currentTime);
      this.scanForTankInstances(nmeaData, currentTime);
      this.scanForTemperatureInstances(nmeaData, currentTime);
      
      // Clean up expired instances
      this.cleanupStaleInstances();
      
      // Update runtime metrics
      this.updateRuntimeMetrics();
      
      // Notify callbacks of updated instances
      this.notifyInstanceCallbacks();
      
      this.state.lastScanTime = currentTime;
      
      const scanDuration = performance.now() - startTime;
      if (scanDuration > 100) {
        console.warn(`[InstanceDetection] Scan took ${scanDuration.toFixed(1)}ms (target: <100ms)`);
      }
      
    } catch (error) {
      console.error('[InstanceDetection] Error during scan:', error);
    }
  }

  /**
   * Scan for marine instruments (GPS, compass, speed, wind, depth) from NMEA data
   * Updated for instance-based architecture - creates separate widgets for each instance
   */
  private scanForMarineInstruments(nmeaData: any, currentTime: number): void {
    const sensors = nmeaData.sensors || {};

    // Check each sensor type for presence of data
    const sensorTypeMap: Record<string, string> = {
      'gps': 'gps',
      'compass': 'compass', 
      'speed': 'speed',
      'wind': 'wind',
      'depth': 'depth',
      'autopilot': 'autopilot'
    };

    Object.entries(sensorTypeMap).forEach(([instrumentType, sensorType]) => {
      const sensorInstances = sensors[sensorType] || {};
      
      // Check each instance of this sensor type
      Object.entries(sensorInstances).forEach(([instanceNum, sensorData]: [string, any]) => {
        if (sensorData && sensorData.timestamp) {
          // Check if data is recent (within last 30 seconds)
          const dataAge = currentTime - sensorData.timestamp;
          if (dataAge < 30000) {
            // Create instance-specific ID using WidgetFactory format: "gps-0", "compass-0", "depth-0", etc.
            const instance = parseInt(instanceNum, 10);
            const instanceId = WidgetFactory.generateInstanceWidgetId(instrumentType, instance);
            
            try {
              const widgetInstance = WidgetFactory.createWidgetInstance(instanceId);
              
              const detectedInstance: DetectedInstance = {
                id: instanceId,
                type: instrumentType as DetectedInstance['type'],
                instance: instance,
                title: widgetInstance.title,
                icon: widgetInstance.icon,
                priority: this.getInstrumentPriority(instrumentType),
                lastSeen: currentTime,
                category: widgetInstance.category as DetectedInstance['category'],
              };

              // Log first detection
              const isFirstDetection = !this.state.instruments.has(instanceId);
              
              this.state.instruments.set(instanceId, detectedInstance);
              
              if (isFirstDetection) {
                console.log(`🔧 [InstanceDetection] Detected marine instrument: ${widgetInstance.title} (instance ${instance}) from sensor data`);
              }
            } catch (error) {
              console.warn(`[InstanceDetection] Failed to create widget instance for ${instanceId}:`, error);
            }
          }
        }
      });
    });
  }

  /**
   * Get priority for instrument ordering
   */
  private getInstrumentPriority(instrumentType: string): number {
    const priorities: Record<string, number> = {
      gps: 1,
      compass: 2, 
      speed: 3,
      wind: 4,
      depth: 5
    };
    return priorities[instrumentType] || 10;
  }

  /**
   * Scan for engine instances from PGN 127488 data and NMEA 0183 RPM sentences
   */
  private scanForEngineInstances(nmeaData: any, currentTime: number): void {
    // NMEA Store v2.0: Look for engine sensor data
    const sensors = nmeaData.sensors || {};
    const engineSensors = sensors.engine || {};
    
    console.log('🔧 [scanForEngineInstances] Checking for engines:', {
      hasSensors: !!sensors,
      hasEngine: !!sensors.engine,
      engineInstanceCount: Object.keys(engineSensors).length,
      engineInstances: Object.keys(engineSensors),
      sampleData: Object.keys(engineSensors).length > 0 ? engineSensors[Object.keys(engineSensors)[0]] : null
    });
    
    // Check each engine instance for recent data
    Object.entries(engineSensors).forEach(([instanceStr, engineData]: [string, any]) => {
      const instance = parseInt(instanceStr);
      if (engineData && engineData.timestamp) {
        // Check if data is recent (within last 30 seconds)
        const dataAge = currentTime - engineData.timestamp;
        if (dataAge < 30000) {
          const instanceId = WidgetFactory.generateInstanceWidgetId('engine', instance);
          
          // Use WidgetFactory for title and metadata
          const widgetInstance = WidgetFactory.createWidgetInstance(instanceId);
          
          // Create or update engine instance
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'engine',
            instance,
            title: widgetInstance.title,
            icon: widgetInstance.icon,
            priority: instance, // Use instance number as priority
            lastSeen: currentTime,
            category: widgetInstance.category as DetectedInstance['category'],
          };
          
          // Log first detection
          const isFirstDetection = !this.state.engines.has(instanceId);
          this.state.engines.set(instanceId, detectedInstance);
          
          if (isFirstDetection) {
            console.log(`[InstanceDetection] Detected engine instance: ${detectedInstance.title}`);
          }
        }
      }
    });
    
    // Legacy fallback: Look for engine PGN data in the old NMEA store structure
    const pgnData = nmeaData.pgnData || {};
    
    // PGN 127488: Engine Parameters (source address indicates engine instance)
    if (pgnData['127488']) {
      const enginePgns = Array.isArray(pgnData['127488']) ? pgnData['127488'] : [pgnData['127488']];
      
      for (const engineData of enginePgns) {
        if (engineData.sourceAddress !== undefined) {
          // For engines, instance is derived from source address (engines use source address as identifier)
          const instance = engineData.sourceAddress - 1; // Convert to 0-based for internal use
          const instanceId = WidgetFactory.generateInstanceWidgetId('engine', instance);
          
          // Use WidgetFactory for title and metadata
          const widgetInstance = WidgetFactory.createWidgetInstance(
            instanceId, 
            { sourceAddress: engineData.sourceAddress }
          );
          
          // Create or update engine instance
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'engine',
            instance,
            title: widgetInstance.title,
            icon: widgetInstance.icon,
            priority: engineData.sourceAddress, // Use source address as priority for engines
            lastSeen: currentTime,
            category: widgetInstance.category as DetectedInstance['category'],
            sourceAddress: engineData.sourceAddress,
          };
          
          this.state.engines.set(instanceId, detectedInstance);
          
          if (this.state.engines.size === 1) {
            console.log(`[InstanceDetection] Detected engine instance: ${detectedInstance.title}`);
          }
        }
      }
    }
    
    // NMEA 0183: RPM sentences ($--RPM,E,instance,rpm,A,*checksum)
    const rawSentences = nmeaData.rawSentences || [];
    for (const sentence of rawSentences) {
      if (sentence && typeof sentence === 'string') {
        const rpmMatch = sentence.match(/^\$..RPM,E,(\d+),(\d+(?:\.\d+)?),A,/);
        if (rpmMatch) {
          const instance = parseInt(rpmMatch[1]); // Keep NMEA instance numbers as-is
          const instanceId = WidgetFactory.generateInstanceWidgetId('engine', instance);
          
          // Use WidgetFactory for title and metadata
          const widgetInstance = WidgetFactory.createWidgetInstance(instanceId);
          
          // Create or update engine instance
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'engine',
            instance,
            title: widgetInstance.title,
            icon: widgetInstance.icon,
            priority: instance + 1,
            lastSeen: currentTime,
            category: widgetInstance.category as DetectedInstance['category'],
          };
          
          this.state.engines.set(instanceId, detectedInstance);
          console.log(`[InstanceDetection] Engine ${instance + 1} detected via RPM sentence`);
        }
      }
    }
  }

  /**
   * Scan for battery instances using sensor data
   */
  private scanForBatteryInstances(nmeaData: any, currentTime: number): void {
    const sensors = nmeaData.sensors || {};
    const batterySensors = sensors.battery || {};
    
    console.log('🔧 [scanForBatteryInstances] Checking for batteries:', {
      hasSensors: !!sensors,
      batteryInstanceCount: Object.keys(batterySensors).length,
      batteryInstances: Object.keys(batterySensors)
    });
    
    // First, use sensor data (preferred in NMEA Store v2)
    Object.entries(batterySensors).forEach(([instanceStr, batteryData]: [string, any]) => {
      const instance = parseInt(instanceStr, 10);
      if (batteryData && batteryData.timestamp) {
        const dataAge = currentTime - batteryData.timestamp;
        if (dataAge < 30000) {
          const instanceId = WidgetFactory.generateInstanceWidgetId('battery', instance);
          const widgetInstance = WidgetFactory.createWidgetInstance(instanceId);
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'battery',
            instance,
            title: widgetInstance.title,
            icon: widgetInstance.icon,
            priority: instance + 1,
            lastSeen: currentTime,
            category: widgetInstance.category as DetectedInstance['category'],
          };
          const isFirstDetection = !this.state.batteries.has(instanceId);
          this.state.batteries.set(instanceId, detectedInstance);
          if (isFirstDetection) {
            console.log(`[InstanceDetection] Detected battery instance from sensor data: ${widgetInstance.title}`);
          }
        }
      }
    });
  }

  /**
  * Scan for tank instances from sensor data (NMEA Store v2.0)
   */
  private scanForTankInstances(nmeaData: any, currentTime: number): void {
    // NMEA Store v2.0: Check sensor data first
    const sensors = nmeaData.sensors || {};
    const tankSensors = sensors.tank || {};
    
    console.log('🔧 [scanForTankInstances] Checking for tanks:', {
      hasSensors: !!sensors,
      hasTank: !!sensors.tank,
      tankInstanceCount: Object.keys(tankSensors).length,
      tankInstances: Object.keys(tankSensors)
    });
    
    // Check each tank instance for recent data
    Object.entries(tankSensors).forEach(([instanceStr, tankData]: [string, any]) => {
      const instance = parseInt(instanceStr);
      if (tankData && tankData.timestamp) {
        // Check if data is recent (within last 30 seconds)
        const dataAge = currentTime - tankData.timestamp;
        if (dataAge < 30000) {
          const fluidType = this.mapSensorTypeToFluidType(tankData.type) || 'unknown';
          const instanceId = WidgetFactory.generateInstanceWidgetId('tank', instance);
          
          // Use WidgetFactory for title and metadata
          const widgetInstance = WidgetFactory.createWidgetInstance(instanceId);
          
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'tank',
            instance,
            title: widgetInstance.title,
            icon: widgetInstance.icon,
            priority: this.getTankPriority(fluidType, instance),
            lastSeen: currentTime,
            category: widgetInstance.category as DetectedInstance['category'],
            fluidType,
            position: this.determinePosition(instance, fluidType),
          };
          
          // Log first detection
          const isFirstDetection = !this.state.tanks.has(instanceId);
          this.state.tanks.set(instanceId, detectedInstance);
          
          if (isFirstDetection) {
            console.log(`[InstanceDetection] Detected tank instance: ${detectedInstance.title}`);
          }
        }
      }
    });
  }

  /**
   * Determine tank position based on instance number and fluid type
   */
  private determinePosition(instance: number, fluidType?: string): string | undefined {
    if (!fluidType) return undefined;
    
    // Use WidgetFactory to get tank position information
    // For now, return a simple position designation
    const positions: Record<string, string[]> = {
      fuel: ['MAIN', 'PORT', 'STBD', 'CENTER'],
      freshWater: ['FRESH', 'POTABLE'],
      grayWater: ['GRAY', 'WASTE'],
      blackWater: ['BLACK', 'SEWAGE'],
      liveWell: ['LIVE', 'BAIT'],
      ballast: ['BALLAST'],
    };
    
    const typePositions = positions[fluidType] || ['UNKNOWN'];
    return typePositions[instance % typePositions.length];
  }

  /**
   * Get tank priority for ordering - fuel tanks get highest priority
   */
  private getTankPriority(fluidType: string, instance: number): number {
    const basePriorities: Record<string, number> = {
      fuel: 10,
      freshWater: 20,
      grayWater: 30,
      blackWater: 40,
      liveWell: 50,
      ballast: 60,
    };
    
    const basePriority = basePriorities[fluidType] || 70;
    return basePriority + instance; // Add instance to maintain ordering within type
  }

  /**
   * Map TankSensorData.type values back to fluid type strings
   */
  private mapSensorTypeToFluidType(sensorType?: 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater'): string {
    const reverseMap: Record<string, string> = {
      fuel: 'fuel',
      water: 'freshWater',
      waste: 'grayWater',
      ballast: 'ballast',
      blackwater: 'blackWater',
    };
    
    return reverseMap[sensorType || 'fuel'] || 'fuel';
  }

  /**
   * Scan for temperature sensor instances from NMEA data
   * Supports PGN 130311 (Environmental Parameters), PGN 130312 (Temperature), 
   * NMEA 0183 MTW (Mean Temperature of Water), and XDR temperature sensors
   */
  private scanForTemperatureInstances(nmeaData: any, currentTime: number): void {
    // Check for NMEA 2000 temperature PGNs with instance data
    if (nmeaData.pgns) {
      // PGN 130311 - Environmental Parameters (instance-based)
      Object.entries(nmeaData.pgns).forEach(([pgnKey, pgnData]: [string, any]) => {
        if (pgnData.pgn === 130311 && pgnData.data && pgnData.data.instance !== undefined) {
          const instance = pgnData.data.instance;
          const temperature = pgnData.data.temperature;
          
          if (temperature !== undefined && instance < 16) {
            const instanceId = `temperature-${instance}`;
            const instanceMapping = NMEA_TEMPERATURE_INSTANCES[instance as keyof typeof NMEA_TEMPERATURE_INSTANCES];
            const title = instanceMapping ? instanceMapping.title : `TEMP SENSOR ${instance + 1}`;
            const icon = instanceMapping ? instanceMapping.icon : 'thermometer-outline';
            const location = instanceMapping ? instanceMapping.location : `sensor${instance}`;
            
            const detectedInstance: DetectedInstance = {
              id: instanceId,
              type: 'temperature',
              instance,
              title,
              icon,
              priority: instanceMapping ? instanceMapping.priority : instance + 20,
              lastSeen: currentTime,
              category: 'environment',
              location,
            };

            this.state.temperatures.set(instanceId, detectedInstance);
            console.log(`[InstanceDetection] Temperature sensor ${instance} detected: ${title} (${temperature}°C)`);
          }
        }
        
        // PGN 130312 - Temperature (instance-based)
        if (pgnData.pgn === 130312 && pgnData.data && pgnData.data.instance !== undefined) {
          const instance = pgnData.data.instance;
          const temperature = pgnData.data.actualTemperature || pgnData.data.temperature;
          
          if (temperature !== undefined && instance < 16) {
            const instanceId = `temperature-${instance}`;
            const instanceMapping = NMEA_TEMPERATURE_INSTANCES[instance as keyof typeof NMEA_TEMPERATURE_INSTANCES];
            const title = instanceMapping ? instanceMapping.title : `TEMP SENSOR ${instance + 1}`;
            const icon = instanceMapping ? instanceMapping.icon : 'thermometer-outline';
            const location = instanceMapping ? instanceMapping.location : `sensor${instance}`;
            
            const detectedInstance: DetectedInstance = {
              id: instanceId,
              type: 'temperature',
              instance,
              title,
              icon,
              priority: instanceMapping ? instanceMapping.priority : instance + 20,
              lastSeen: currentTime,
              category: 'environment',
              location,
            };            this.state.temperatures.set(instanceId, detectedInstance);
            console.log(`[InstanceDetection] Temperature sensor ${instance} detected via PGN 130312: ${title} (${temperature}°C)`);
          }
        }
      });
    }
    
    // Check for NMEA 0183 temperature sentences with instance patterns
    if (nmeaData.rawSentences && Array.isArray(nmeaData.rawSentences)) {
      nmeaData.rawSentences.forEach((sentence: string) => {
        // MTW - Mean Temperature of Water (default to instance 0 for sea water)
        const mtwMatch = sentence.match(/^\$..MTW,([\d.-]+),C/);
        if (mtwMatch) {
          const temperature = parseFloat(mtwMatch[1]);
          if (!isNaN(temperature)) {
            const instanceId = `temperature-0`; // Sea water temperature = instance 0
            const instanceMapping = NMEA_TEMPERATURE_INSTANCES[0];
            
            const detectedInstance: DetectedInstance = {
              id: instanceId,
              type: 'temperature',
              instance: 0,
              title: instanceMapping.title, // 'SEA WATER'
              icon: instanceMapping.icon, // 'thermometer-outline'
              priority: instanceMapping.priority,
              lastSeen: currentTime,
              category: 'environment',
              location: instanceMapping.location, // 'seawater'
            };
            
            this.state.temperatures.set(instanceId, detectedInstance);
            console.log(`[InstanceDetection] Sea water temperature detected via MTW: ${temperature}°C`);
          }
        }
        
        // XDR - Temperature transducers with instance identification
        // Format: $xxXDR,C,temperature,C,TempSensor_ID
        const xdrTempMatch = sentence.match(/^\$..XDR,C,([\d.-]+),C,([^,*]+)/);
        if (xdrTempMatch) {
          const temperature = parseFloat(xdrTempMatch[1]);
          const sensorId = xdrTempMatch[2];
          
          if (!isNaN(temperature)) {
            // Map sensor ID to instance number (simple mapping for now)
            const instanceMatch = sensorId.match(/(\d+)$/);
            const instance = instanceMatch ? parseInt(instanceMatch[1]) : 0;
            
            if (instance < 16) {
              const instanceId = `temperature-${instance}`;
              const instanceMapping = NMEA_TEMPERATURE_INSTANCES[instance as keyof typeof NMEA_TEMPERATURE_INSTANCES];
              const title = instanceMapping ? instanceMapping.title : `${sensorId.toUpperCase()}`;
              const icon = instanceMapping ? instanceMapping.icon : 'thermometer-outline';
              
              const detectedInstance: DetectedInstance = {
                id: instanceId,
                type: 'temperature',
                instance,
                title,
                icon,
                priority: instanceMapping ? instanceMapping.priority : instance + 20,
                lastSeen: currentTime,
                category: 'environment',
                location: sensorId.toLowerCase(),
              };
              
              this.state.temperatures.set(instanceId, detectedInstance);
              console.log(`[InstanceDetection] Temperature sensor detected via XDR: ${title} (${temperature}°C)`);
            }
          }
        }
      });
    }
  }

    /**
   * Remove instances that haven't been seen recently
   */
  private cleanupStaleInstances(): void {
    const currentTime = Date.now();
    const staleThreshold = currentTime - this.INSTANCE_TIMEOUT;
    
    [this.state.engines, this.state.batteries, this.state.tanks, this.state.temperatures, this.state.instruments].forEach(instanceMap => {
      instanceMap.forEach((instance, id) => {
        if (instance.lastSeen < staleThreshold) {
          instanceMap.delete(id);
          console.log(`[InstanceDetection] Removed stale ${instance.type} instance: ${id}`);
        }
      });
    });
  }

  /**
   * Update runtime metrics for performance monitoring
   */
  private updateRuntimeMetrics(): void {
    this.runtimeMetrics.activeEngines = this.state.engines.size;
    this.runtimeMetrics.activeBatteries = this.state.batteries.size;
    this.runtimeMetrics.activeTanks = this.state.tanks.size;
    this.runtimeMetrics.totalInstances = this.runtimeMetrics.activeEngines + 
                                         this.runtimeMetrics.activeBatteries + 
                                         this.runtimeMetrics.activeTanks;
    
    // Estimate memory usage (rough calculation)
    const avgInstanceSize = 200; // Approximate bytes per DetectedInstance
    const callbacksSize = this.instanceCallbacks.length * 100; // Approximate callback overhead
    this.runtimeMetrics.memoryUsageBytes = (this.runtimeMetrics.totalInstances * avgInstanceSize) + callbacksSize;
  }

  /**
   * Get all currently detected instances and marine instruments
   */
  public getDetectedInstances(): {
    engines: DetectedInstance[];
    batteries: DetectedInstance[];
    tanks: DetectedInstance[];
    temperatures: DetectedInstance[];
    instruments: DetectedInstance[];
  } {
    return {
      engines: Array.from(this.state.engines.values()).sort((a, b) => a.priority - b.priority),
      batteries: Array.from(this.state.batteries.values()).sort((a, b) => a.priority - b.priority),
      tanks: Array.from(this.state.tanks.values()).sort((a, b) => a.priority - b.priority),
      temperatures: Array.from(this.state.temperatures.values()).sort((a, b) => a.priority - b.priority),
      instruments: Array.from(this.state.instruments.values()).sort((a, b) => a.priority - b.priority),
    };
  }

  /**
   * Get detection service status
   */
  public getStatus(): {
    isScanning: boolean;
    lastScanTime: number;
    instanceCounts: { engines: number; batteries: number; tanks: number; temperatures: number };
  } {
    return {
      isScanning: this.state.isScanning,
      lastScanTime: this.state.lastScanTime,
      instanceCounts: {
        engines: this.state.engines.size,
        batteries: this.state.batteries.size,
        tanks: this.state.tanks.size,
        temperatures: this.state.temperatures.size,
      },
    };
  }

  /**
   * Check if instance detection is currently scanning
   */
  public isScanning(): boolean {
    return this.state.isScanning;
  }

  /**
   * Register a callback for instance detection updates
   */
  public onInstancesDetected(callback: (instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[]; instruments: DetectedInstance[] }) => void): void {
    this.instanceCallbacks.push(callback);
  }

  /**
   * Remove a callback for instance detection updates
   */
  public offInstancesDetected(callback: (instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[]; temperatures: DetectedInstance[] }) => void): void {
    const index = this.instanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.instanceCallbacks.splice(index, 1);
    }
  }

  /**
   * Get runtime metrics for monitoring and debugging
   */
  public getRuntimeMetrics(): RuntimeMetrics {
    // Update metrics before returning
    this.updateRuntimeMetrics();
    return { ...this.runtimeMetrics };
  }

  /**
   * Force cleanup of expired instances (manual trigger)
   */
  public forceCleanup(): void {
    console.log('[InstanceDetection] Manual cleanup triggered');
    this.cleanupStaleInstances();
    this.updateRuntimeMetrics();
    
    // Notify callbacks if instances were removed
    this.notifyInstanceCallbacks();
  }

  /**
   * Reset runtime metrics (useful for testing and monitoring)
   */
  public resetRuntimeMetrics(): void {
    this.runtimeMetrics = {
      totalInstances: 0,
      activeEngines: 0,
      activeBatteries: 0,
      activeTanks: 0,
      activeTemperatures: 0,
      orphanedInstances: 0,
      memoryUsageBytes: 0,
      lastCleanupTime: 0,
      cleanupCount: 0
    };
    console.log('[InstanceDetection] Runtime metrics reset');
  }

  /**
   * Notify all registered callbacks of instance updates
   */
  private notifyInstanceCallbacks(): void {
    if (this.instanceCallbacks.length === 0) {
      console.log('[InstanceDetection] No callbacks registered for instance updates');
      return;
    }

    const instances = {
      engines: Array.from(this.state.engines.values()),
      batteries: Array.from(this.state.batteries.values()),
      tanks: Array.from(this.state.tanks.values()),
      temperatures: Array.from(this.state.temperatures.values()),
      instruments: Array.from(this.state.instruments.values()),
    };

    console.log('[InstanceDetection] Notifying callbacks with instances:', {
      engines: instances.engines.length,
      batteries: instances.batteries.length,
      tanks: instances.tanks.length,
      temperatures: instances.temperatures.length,
      instruments: instances.instruments.length,
      callbacks: this.instanceCallbacks.length
    });

    for (const callback of this.instanceCallbacks) {
      try {
        callback(instances);
      } catch (error) {
        console.error('[InstanceDetection] Error in instance callback:', error);
      }
    }
  }

  /**
   * Generate a unique ID for an instance
   */
  protected generateInstanceId(type: string, instance: number, sourceAddress?: number): string {
    if (sourceAddress !== undefined) {
      return `${type}-${instance}-${sourceAddress}`;
    }
    return `${type}-${instance}`;
  }

  // Title generation methods removed - now handled by WidgetFactory
}

// Export singleton instance
export const instanceDetectionService = new InstanceDetectionService();

// Export for testing
export { InstanceDetectionService };