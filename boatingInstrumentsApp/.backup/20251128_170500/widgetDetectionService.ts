/**
 * Widget Detection Service
 * 
 * Centralized service for detecting which widgets should be created based on NMEA data.
 * Replaces scattered detection logic in App.tsx with clean, testable, maintainable code.
 * 
 * Responsibilities:
 * - Analyze NMEA sensor data to determine required widgets
 * - Differentiate between single-instance and multi-instance widgets
 * - Validate data quality before widget creation
 * - Return structured widget creation/removal recommendations
 */

import { WidgetConfig } from '../store/widgetStore';

export interface WidgetToCreate {
  id: string;
  type: string;
  instance?: number;
  title?: string;
  metadata?: Record<string, any>;
}

export interface DetectionResult {
  toCreate: WidgetToCreate[];
  toRemove: string[];
}

export class WidgetDetectionService {
  
  /**
   * Main detection method - analyzes NMEA data and returns widget recommendations
   */
  static detectRequiredWidgets(
    nmeaData: any,
    existingWidgets: WidgetConfig[]
  ): DetectionResult {
    const toCreate: WidgetToCreate[] = [];
    const toRemove: string[] = [];
    const existingIds = new Set(existingWidgets.map(w => w.id));
    
    if (!nmeaData?.sensors) {
      console.log('[WidgetDetection] No NMEA sensor data available');
      return { toCreate, toRemove };
    }
    
    console.log('[WidgetDetection] 🔍 Analyzing NMEA data:', {
      availableSensors: Object.keys(nmeaData.sensors),
      existingWidgetCount: existingWidgets.length,
    });
    
    // Detect single-instance sensors
    this.detectSingleInstanceSensors(nmeaData, existingIds, toCreate);
    
    // Detect multi-instance equipment
    this.detectMultiInstanceEngines(nmeaData, existingIds, toCreate);
    this.detectMultiInstanceBatteries(nmeaData, existingIds, toCreate);
    this.detectMultiInstanceTanks(nmeaData, existingIds, toCreate);
    this.detectMultiInstanceTemperatures(nmeaData, existingIds, toCreate);
    
    console.log('[WidgetDetection] ✅ Detection complete:', {
      newWidgetsToCreate: toCreate.length,
      widgetIds: toCreate.map(w => w.id),
    });
    
    return { toCreate, toRemove };
  }
  
  /**
   * Detect single-instance navigation sensors: depth, gps, speed, wind, compass
   */
  private static detectSingleInstanceSensors(
    nmeaData: any,
    existingIds: Set<string>,
    toCreate: WidgetToCreate[]
  ): void {
    const sensorMap: Record<string, (data: any) => boolean> = {
      depth: (data: any) => data?.depth !== undefined,
      gps: (data: any) => data?.position?.latitude !== undefined && data?.position?.longitude !== undefined,
      speed: (data: any) => data?.throughWater !== undefined || data?.overGround !== undefined,
      wind: (data: any) => data?.speed !== undefined && data?.angle !== undefined,
      compass: (data: any) => data?.heading !== undefined,
    };
    
    Object.entries(sensorMap).forEach(([sensorType, validator]) => {
      const sensorData = nmeaData.sensors?.[sensorType];
      
      if (sensorData && Object.keys(sensorData).length > 0) {
        const firstInstance = Object.values(sensorData)[0] as any;
        
        if (validator(firstInstance) && !existingIds.has(sensorType)) {
          console.log(`[WidgetDetection] ➕ Detected ${sensorType} sensor with valid data`);
          toCreate.push({
            id: sensorType,
            type: sensorType,
          });
        }
      }
    });
  }
  
  /**
   * Detect multi-instance engine widgets
   */
  private static detectMultiInstanceEngines(
    nmeaData: any,
    existingIds: Set<string>,
    toCreate: WidgetToCreate[]
  ): void {
    const engineData = nmeaData.sensors?.engine;
    if (!engineData) return;
    
    Object.keys(engineData).forEach(instanceStr => {
      const instance = parseInt(instanceStr);
      const data = engineData[instance];
      
      if (data?.rpm !== undefined) {
        const widgetId = `engine-${instance}`;
        
        if (!existingIds.has(widgetId)) {
          console.log(`[WidgetDetection] ➕ Detected engine-${instance} with RPM data`);
          toCreate.push({
            id: widgetId,
            type: 'engine',
            instance,
            title: `Engine ${instance + 1}`,
          });
        }
      }
    });
  }
  
  /**
   * Detect multi-instance battery widgets
   */
  private static detectMultiInstanceBatteries(
    nmeaData: any,
    existingIds: Set<string>,
    toCreate: WidgetToCreate[]
  ): void {
    const batteryData = nmeaData.sensors?.battery;
    if (!batteryData) return;
    
    Object.keys(batteryData).forEach(instanceStr => {
      const instance = parseInt(instanceStr);
      const data = batteryData[instance];
      
      if (data?.voltage !== undefined) {
        const widgetId = `battery-${instance}`;
        
        if (!existingIds.has(widgetId)) {
          console.log(`[WidgetDetection] ➕ Detected battery-${instance} with voltage data`);
          toCreate.push({
            id: widgetId,
            type: 'battery',
            instance,
            title: `Battery ${instance + 1}`,
          });
        }
      }
    });
  }
  
  /**
   * Detect multi-instance tank widgets
   */
  private static detectMultiInstanceTanks(
    nmeaData: any,
    existingIds: Set<string>,
    toCreate: WidgetToCreate[]
  ): void {
    const tankData = nmeaData.sensors?.tank;
    if (!tankData) return;
    
    Object.keys(tankData).forEach(instanceStr => {
      const instance = parseInt(instanceStr);
      const data = tankData[instance];
      
      if (data?.level !== undefined && data?.type) {
        const widgetId = `tank-${instance}`;
        
        if (!existingIds.has(widgetId)) {
          const tankType = data.type?.toUpperCase() || 'UNKNOWN';
          console.log(`[WidgetDetection] ➕ Detected tank-${instance} (${tankType}) with level data`);
          toCreate.push({
            id: widgetId,
            type: 'tank',
            instance,
            title: `${tankType} Tank ${instance + 1}`,
            metadata: { tankType: data.type },
          });
        }
      }
    });
  }
  
  /**
   * Detect multi-instance temperature widgets
   */
  private static detectMultiInstanceTemperatures(
    nmeaData: any,
    existingIds: Set<string>,
    toCreate: WidgetToCreate[]
  ): void {
    const tempData = nmeaData.sensors?.temperature;
    if (!tempData) return;
    
    Object.keys(tempData).forEach(instanceStr => {
      const instance = parseInt(instanceStr);
      const data = tempData[instance];
      
      if (data?.value !== undefined) {
        const widgetId = `temp-${instance}`;
        
        if (!existingIds.has(widgetId)) {
          const location = data.location || 'Unknown';
          console.log(`[WidgetDetection] ➕ Detected temp-${instance} (${location}) with temperature data`);
          toCreate.push({
            id: widgetId,
            type: 'temperature',
            instance,
            title: `Temperature ${location}`,
            metadata: { location: data.location },
          });
        }
      }
    });
  }
  
  /**
   * Validate that a widget has required data fields
   * Useful for filtering out incomplete/invalid widget data
   */
  static validateWidgetData(widgetType: string, data: any): boolean {
    const validators: Record<string, (d: any) => boolean> = {
      depth: (d) => d?.depth !== undefined,
      gps: (d) => d?.position?.latitude !== undefined,
      speed: (d) => d?.throughWater !== undefined || d?.overGround !== undefined,
      wind: (d) => d?.speed !== undefined && d?.angle !== undefined,
      compass: (d) => d?.heading !== undefined,
      engine: (d) => d?.rpm !== undefined,
      battery: (d) => d?.voltage !== undefined,
      tank: (d) => d?.level !== undefined && d?.type !== undefined,
      temperature: (d) => d?.value !== undefined,
    };
    
    const validator = validators[widgetType];
    return validator ? validator(data) : false;
  }
}
