import { useNmeaStore } from '../../store/nmeaStore';

/**
 * NMEA Instance Detection Service
 * 
 * Automatically detects and maps NMEA instances for multi-engine,
 * multi-battery, and multi-tank boat configurations.
 * 
 * Features:
 * - Engine detection from PGN 127488 source addresses
 * - Battery mapping with descriptive names (House, Thruster, etc.)
 * - Tank detection with fluid type identification
 * - Runtime instance monitoring with graceful additions/removals
 */

// Instance mapping tables based on NMEA standards
export const NMEA_BATTERY_INSTANCES = {
  0: { title: 'HOUSE', icon: '🔋', priority: 1 },
  1: { title: 'ENGINE', icon: '🔋', priority: 2 },
  2: { title: 'THRUSTER', icon: '🔋', priority: 3 },
  3: { title: 'GENERATOR', icon: '🔋', priority: 4 },
  4: { title: 'ENGINE 2', icon: '🔋', priority: 5 },
  5: { title: 'WINDLASS', icon: '🔋', priority: 6 },
  6: { title: 'BOW THRUSTER', icon: '🔋', priority: 7 },
  7: { title: 'STERN THRUSTER', icon: '🔋', priority: 8 },
  // Add more instances up to 252 as needed
} as const;

export const NMEA_TANK_INSTANCES = {
  fuel: { icon: '🛢️', positions: ['PORT', 'STBD', 'CENTER', 'MAIN'] },
  freshWater: { icon: '💧', positions: ['FRESH', 'POTABLE'] },
  grayWater: { icon: '💧', positions: ['GRAY', 'WASTE'] },
  blackWater: { icon: '💧', positions: ['BLACK', 'SEWAGE'] },
  liveWell: { icon: '🐠', positions: ['LIVE', 'BAIT'] },
  ballast: { icon: '⚖️', positions: ['BALLAST'] },
} as const;

// Types for detected instances
export interface DetectedInstance {
  id: string;
  type: 'engine' | 'battery' | 'tank';
  instance: number;
  title: string;
  icon: string;
  priority: number;
  lastSeen: number;
  sourceAddress?: number;
  fluidType?: keyof typeof NMEA_TANK_INSTANCES;
  position?: string;
}

export interface InstanceDetectionState {
  engines: Map<string, DetectedInstance>;
  batteries: Map<string, DetectedInstance>;
  tanks: Map<string, DetectedInstance>;
  isScanning: boolean;
  lastScanTime: number;
  scanInterval: number;
}

export interface RuntimeMetrics {
  totalInstances: number;
  activeEngines: number;
  activeBatteries: number;
  activeTanks: number;
  orphanedInstances: number;
  memoryUsageBytes: number;
  lastCleanupTime: number;
  cleanupCount: number;
}

class InstanceDetectionService {
  private state: InstanceDetectionState = {
    engines: new Map(),
    batteries: new Map(),
    tanks: new Map(),
    isScanning: false,
    lastScanTime: 0,
    scanInterval: 10000, // 10 seconds
  };

  private scanTimer: NodeJS.Timeout | null = null;
  private readonly MAX_INSTANCES_PER_TYPE = 16;
  private readonly INSTANCE_TIMEOUT = 30000; // 30 seconds

  // Callback system for instance updates
  private instanceCallbacks: Array<(instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[] }) => void> = [];

  // Runtime management tracking
  private runtimeMetrics: RuntimeMetrics = {
    totalInstances: 0,
    activeEngines: 0,
    activeBatteries: 0,
    activeTanks: 0,
    orphanedInstances: 0,
    memoryUsageBytes: 0,
    lastCleanupTime: 0,
    cleanupCount: 0
  };

  /**
   * Start instance detection scanning with optimized performance
   */
  public startScanning(): void {
    if (this.state.isScanning) {
      return;
    }

    this.state.isScanning = true;
    console.log('[InstanceDetection] Starting NMEA instance scanning...');
    
    // Run initial scan immediately
    this.performScan();
    
    // Set up recurring scans with performance optimization
    // Use shorter intervals initially, then back off if no changes detected
    let consecutiveUnchangedScans = 0;
    this.scanTimer = setInterval(() => {
      const scanStartTime = performance.now();
      const currentInstanceCount = this.getTotalInstanceCount();
      
      this.performScan();
      
      const newInstanceCount = this.getTotalInstanceCount();
      const scanDuration = performance.now() - scanStartTime;
      
      // Adaptive scanning: reduce frequency if no changes
      if (newInstanceCount === currentInstanceCount) {
        consecutiveUnchangedScans++;
      } else {
        consecutiveUnchangedScans = 0;
      }
      
      // Performance monitoring: warn if scans are too slow
      if (scanDuration > 100) {
        console.warn(`[InstanceDetection] Slow scan detected: ${scanDuration.toFixed(2)}ms`);
      }
      
    }, this.state.scanInterval);
  }
  
  /**
   * Get total instance count for performance monitoring
   */
  private getTotalInstanceCount(): number {
    return this.state.engines.size + this.state.batteries.size + this.state.tanks.size;
  }

  /**
   * Stop instance detection scanning
   */
  public stopScanning(): void {
    if (!this.state.isScanning) {
      return;
    }

    this.state.isScanning = false;
    
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    
    console.log('[InstanceDetection] Stopped NMEA instance scanning.');
  }

  /**
   * Perform a single scan of NMEA data for instances
   */
  private performScan(): void {
    const startTime = performance.now();
    const currentTime = Date.now();
    
    try {
      // Get current NMEA data from store
      const nmeaData = useNmeaStore.getState();
      
      // Scan for instances in NMEA data
      this.scanForEngineInstances(nmeaData, currentTime);
      this.scanForBatteryInstances(nmeaData, currentTime);
      this.scanForTankInstances(nmeaData, currentTime);
      
      // Clean up expired instances
      this.cleanupExpiredInstances(currentTime);
      
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
   * Scan for engine instances from PGN 127488 data
   */
  private scanForEngineInstances(nmeaData: any, currentTime: number): void {
    // Look for engine PGN data in the NMEA store
    const pgnData = nmeaData.pgnData || {};
    
    // PGN 127488: Engine Parameters (source address indicates engine instance)
    if (pgnData['127488']) {
      const enginePgns = Array.isArray(pgnData['127488']) ? pgnData['127488'] : [pgnData['127488']];
      
      for (const engineData of enginePgns) {
        if (engineData.sourceAddress !== undefined) {
          // For engines, instance is derived from source address (engines use source address as identifier)
          const instance = engineData.sourceAddress - 1; // Convert to 0-based for internal use
          const instanceId = this.generateInstanceId('engine', instance, engineData.sourceAddress);
          const title = this.generateEngineTitle(instance, engineData.sourceAddress);
          
          // Create or update engine instance
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'engine',
            instance,
            title,
            icon: '⚙️',
            priority: engineData.sourceAddress, // Use source address as priority for engines
            lastSeen: currentTime,
            sourceAddress: engineData.sourceAddress,
          };
          
          this.state.engines.set(instanceId, detectedInstance);
          
          if (this.state.engines.size === 1) {
            console.log(`[InstanceDetection] Detected engine instance: ${title}`);
          }
        }
      }
    }
  }

  /**
   * Scan for battery instances from PGN 127508/127513 data  
   */
  private scanForBatteryInstances(nmeaData: any, currentTime: number): void {
    const pgnData = nmeaData.pgnData || {};
    
    // PGN 127508: Battery Status
    // PGN 127513: Battery Configuration Status
    const batteryPgns = ['127508', '127513'];
    
    for (const pgn of batteryPgns) {
      if (pgnData[pgn]) {
        const batteryDataArray = Array.isArray(pgnData[pgn]) ? pgnData[pgn] : [pgnData[pgn]];
        
        for (const batteryData of batteryDataArray) {
          // Check for instance in the batteryData object or its data property
          const dataObject = batteryData.data || batteryData;
          const instance = batteryData.instance !== undefined ? batteryData.instance : dataObject.instance;
          
          if (instance !== undefined) {
            const instanceId = this.generateInstanceId('battery', instance);
            const title = this.generateBatteryTitle(instance);
            
            // Get priority from mapping table
            const mapping = NMEA_BATTERY_INSTANCES[instance as keyof typeof NMEA_BATTERY_INSTANCES];
            const priority = mapping?.priority || instance + 1;
            
            const detectedInstance: DetectedInstance = {
              id: instanceId,
              type: 'battery',
              instance,
              title,
              icon: '🔋',
              priority,
              lastSeen: currentTime,
            };
            
            this.state.batteries.set(instanceId, detectedInstance);
            
            if (this.state.batteries.size === 1) {
              console.log(`[InstanceDetection] Detected battery instance: ${title}`);
            }
          }
        }
      }
    }
  }

  /**
   * Scan for tank instances from PGN 127505 data
   */
  private scanForTankInstances(nmeaData: any, currentTime: number): void {
    const pgnData = nmeaData.pgnData || {};
    
    // PGN 127505: Fluid Level
    if (pgnData['127505']) {
      const tankDataArray = Array.isArray(pgnData['127505']) ? pgnData['127505'] : [pgnData['127505']];
      
      for (const tankData of tankDataArray) {
        // Check if we have the required data in the tankData.data object
        const dataObject = tankData.data || tankData;
        if (dataObject.instance !== undefined && dataObject.fluidType !== undefined) {
          const instance = dataObject.instance;
          const fluidType = this.mapFluidTypeFromPgn(dataObject.fluidType);
          const position = this.determinePosition(instance, fluidType);
          const instanceId = this.generateInstanceId('tank', instance);
          const title = this.generateTankTitle(instance, fluidType, position);
          
          const detectedInstance: DetectedInstance = {
            id: instanceId,
            type: 'tank',
            instance,
            title,
            icon: fluidType ? NMEA_TANK_INSTANCES[fluidType].icon : '🛢️',
            priority: instance + 1,
            lastSeen: currentTime,
            fluidType,
            position,
          };
          
          this.state.tanks.set(instanceId, detectedInstance);
          
          if (this.state.tanks.size === 1) {
            console.log(`[InstanceDetection] Detected tank instance: ${title}`);
          }
        }
      }
    }
  }

  /**
   * Map NMEA fluid type codes to our fluid type names
   */
  private mapFluidTypeFromPgn(fluidTypeCode: number): keyof typeof NMEA_TANK_INSTANCES | undefined {
    // NMEA 2000 fluid type mapping (based on standard)
    const fluidTypeMap: Record<number, keyof typeof NMEA_TANK_INSTANCES> = {
      0: 'fuel',
      1: 'freshWater',
      2: 'grayWater', 
      3: 'blackWater',
      4: 'liveWell',
      5: 'ballast',
    };
    
    return fluidTypeMap[fluidTypeCode];
  }

  /**
   * Determine tank position based on instance number and fluid type
   */
  private determinePosition(instance: number, fluidType?: keyof typeof NMEA_TANK_INSTANCES): string | undefined {
    if (!fluidType) return undefined;
    
    const positions = NMEA_TANK_INSTANCES[fluidType].positions;
    
    // Simple mapping: instance 0 = first position, instance 1 = second position, etc.
    return positions[instance % positions.length];
  }

  /**
   * Remove instances that haven't been seen recently
   */
  private cleanupExpiredInstances(currentTime: number): void {
    const expireThreshold = currentTime - this.INSTANCE_TIMEOUT;
    let cleanedCount = 0;
    
    // Clean up expired engines
    for (const [id, instance] of this.state.engines) {
      if (instance.lastSeen < expireThreshold) {
        console.log(`[InstanceDetection] Removing expired engine instance: ${instance.title} (idle for ${Math.round((currentTime - instance.lastSeen) / 1000)}s)`);
        this.state.engines.delete(id);
        cleanedCount++;
      }
    }
    
    // Clean up expired batteries
    for (const [id, instance] of this.state.batteries) {
      if (instance.lastSeen < expireThreshold) {
        console.log(`[InstanceDetection] Removing expired battery instance: ${instance.title} (idle for ${Math.round((currentTime - instance.lastSeen) / 1000)}s)`);
        this.state.batteries.delete(id);
        cleanedCount++;
      }
    }
    
    // Clean up expired tanks
    for (const [id, instance] of this.state.tanks) {
      if (instance.lastSeen < expireThreshold) {
        console.log(`[InstanceDetection] Removing expired tank instance: ${instance.title} (idle for ${Math.round((currentTime - instance.lastSeen) / 1000)}s)`);
        this.state.tanks.delete(id);
        cleanedCount++;
      }
    }
    
    // Update runtime metrics if cleanup occurred
    if (cleanedCount > 0) {
      this.runtimeMetrics.lastCleanupTime = currentTime;
      this.runtimeMetrics.cleanupCount += cleanedCount;
      this.runtimeMetrics.orphanedInstances += cleanedCount;
      console.log(`[InstanceDetection] Runtime cleanup: ${cleanedCount} orphaned instances removed`);
    }
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
   * Get all currently detected instances
   */
  public getDetectedInstances(): {
    engines: DetectedInstance[];
    batteries: DetectedInstance[];
    tanks: DetectedInstance[];
  } {
    return {
      engines: Array.from(this.state.engines.values()).sort((a, b) => a.priority - b.priority),
      batteries: Array.from(this.state.batteries.values()).sort((a, b) => a.priority - b.priority),
      tanks: Array.from(this.state.tanks.values()).sort((a, b) => a.priority - b.priority),
    };
  }

  /**
   * Get detection service status
   */
  public getStatus(): {
    isScanning: boolean;
    lastScanTime: number;
    instanceCounts: { engines: number; batteries: number; tanks: number };
  } {
    return {
      isScanning: this.state.isScanning,
      lastScanTime: this.state.lastScanTime,
      instanceCounts: {
        engines: this.state.engines.size,
        batteries: this.state.batteries.size,
        tanks: this.state.tanks.size,
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
  public onInstancesDetected(callback: (instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[] }) => void): void {
    this.instanceCallbacks.push(callback);
  }

  /**
   * Remove a callback for instance detection updates
   */
  public offInstancesDetected(callback: (instances: { engines: DetectedInstance[]; batteries: DetectedInstance[]; tanks: DetectedInstance[] }) => void): void {
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
    const currentTime = Date.now();
    console.log('[InstanceDetection] Manual cleanup triggered');
    this.cleanupExpiredInstances(currentTime);
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
    if (this.instanceCallbacks.length === 0) return;

    const instances = {
      engines: Array.from(this.state.engines.values()),
      batteries: Array.from(this.state.batteries.values()),
      tanks: Array.from(this.state.tanks.values()),
    };

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

  /**
   * Generate display title for engine instances
   */
  protected generateEngineTitle(instance: number, sourceAddress?: number): string {
    // For engines, the source address is the engine number
    const engineNumber = sourceAddress || (instance + 1); // Use source address as engine number
    return `⚙️ ENGINE #${engineNumber}`;
  }

  /**
   * Generate display title for battery instances
   */
  protected generateBatteryTitle(instance: number): string {
    const mapping = NMEA_BATTERY_INSTANCES[instance as keyof typeof NMEA_BATTERY_INSTANCES];
    if (mapping) {
      return `${mapping.icon} ${mapping.title}`;
    }
    // Fallback for unknown instances
    return `🔋 BATTERY #${instance + 1}`;
  }

  /**
   * Generate display title for tank instances
   */
  protected generateTankTitle(instance: number, fluidType?: keyof typeof NMEA_TANK_INSTANCES, position?: string): string {
    const typeConfig = fluidType ? NMEA_TANK_INSTANCES[fluidType] : null;
    const icon = typeConfig?.icon || '🛢️';
    
    if (fluidType && position) {
      return `${icon} ${fluidType.toUpperCase()} ${position}`;
    }
    
    if (fluidType) {
      const fluidName = fluidType.toUpperCase();
      // For freshWater, use "FRESHWATER" as single word
      const displayName = fluidType === 'freshWater' ? 'FRESHWATER' : fluidName;
      // Only add position if explicitly provided
      return position ? `${icon} ${displayName} ${position}` : `${icon} ${displayName}`;
    }
    
    // Fallback for unknown tank types
    return `${icon} TANK #${instance + 1}`;
  }
}

// Export singleton instance
export const instanceDetectionService = new InstanceDetectionService();

// Export for testing
export { InstanceDetectionService };