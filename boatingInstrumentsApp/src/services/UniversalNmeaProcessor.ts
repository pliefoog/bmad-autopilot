/**
 * Universal NMEA Processor v2.0
 * 
 * Processes both NMEA 0183 and NMEA 2000 messages and maps them to clean sensor data.
 * Abstracts protocol differences and provides unified data to the NMEA store.
 */

import { useNmeaStore } from '../store/nmeaStore';
import type { 
  TankSensorData, 
  EngineSensorData, 
  BatterySensorData,
  TemperatureSensorData,
  SpeedSensorData,
  WindSensorData,
  GpsSensorData,
  DepthSensorData,
  CompassSensorData,
  AutopilotSensorData
} from '../types/SensorData';

export interface XdrData {
  type: string;          // 'V', 'C', 'P' etc.
  value: string;         // Numeric value as string
  units: string;         // 'L', 'C', 'bar', etc.
  identifier: string;    // 'FUEL_01', 'WATR_01', etc.
}

export interface PgnData {
  pgn: number;
  instance?: number;
  sourceAddress?: number;
  data: any;
  timestamp: number;
}

export class UniversalNmeaProcessor {
  private store = useNmeaStore.getState();

  constructor() {
    // Subscribe to store updates
    useNmeaStore.subscribe((state) => {
      this.store = state;
    });
  }

  /**
   * Process NMEA 0183 XDR sentence for tank data
   * Format: $IIXDR,V,1.5,L,FUEL_01*XX
   */
  processXdrSentence(xdr: XdrData): void {
    // Tank level data from XDR identifiers (enhanced Yacht Devices compatibility)
    const tankMatch = xdr.identifier.match(/^(FUEL|WATR|WAST|BALL|BWAT|LIVE|OIL|HFUEL|DFUEL)_(\d+)$/);
    if (tankMatch && xdr.type === 'V' && (xdr.units === 'L' || xdr.units === 'P')) {
      const [, tankTypeStr, instanceStr] = tankMatch;
      const instance = parseInt(instanceStr, 10);
      let level = parseFloat(xdr.value);
      
      // Convert percentage (0-1) to percentage (0-100) if needed
      if (xdr.units === 'P' && level <= 1.0) {
        level = level * 100;
      }

      // Enhanced XDR tank type mapping for Yacht Devices and other manufacturers
      const tankTypeMap: Record<string, TankSensorData['type']> = {
        'FUEL': 'fuel',       // Generic Fuel
        'HFUEL': 'fuel',      // Gasoline/Petrol 
        'DFUEL': 'fuel',      // Diesel Fuel
        'WATR': 'water',      // Fresh/Potable Water
        'WAST': 'waste',      // Gray/Waste Water
        'BWAT': 'blackwater', // Black/Sewage Water
        'BALL': 'ballast',    // Ballast Water
        'LIVE': 'water',      // Live Well (treated as water)
        'OIL': 'fuel'         // Engine Oil (treated as fuel type)
      };

      const tankType = tankTypeMap[tankTypeStr];
      if (tankType) {
        // Enhanced instance names with proper numbering (1-based for user display)
        const instanceNames: Record<string, string> = {
          'fuel': `Fuel Tank ${instance + 1}`,
          'water': `Fresh Water Tank ${instance + 1}`,
          'waste': `Gray Water Tank ${instance + 1}`,
          'ballast': `Ballast Tank ${instance + 1}`,
          'blackwater': `Black Water Tank ${instance + 1}`
        };

        useNmeaStore.getState().updateSensorData('tank', instance, {
          name: instanceNames[tankType] || `Tank ${instance + 1}`,
          type: tankType,
          level,
          timestamp: Date.now()
        });
      }
      return;
    }

    // Temperature data from XDR
    const tempMatch = xdr.identifier.match(/^(TEMP|SEAW|AIRX|ENGR)_(\d+)$/);
    if (tempMatch && xdr.type === 'C' && xdr.units === 'C') {
      const [, locationStr, instanceStr] = tempMatch;
      const instance = parseInt(instanceStr, 10);
      const temperature = parseFloat(xdr.value);

      // Map XDR location codes to sensor locations
      const locationMap: Record<string, TemperatureSensorData['location']> = {
        'SEAW': 'seawater',
        'AIRX': 'outside',
        'ENGR': 'engine',
        'TEMP': 'cabin'
      };

      const location = locationMap[locationStr] || 'cabin';
      const locationNames: Record<string, string> = {
        'seawater': 'Sea Water',
        'outside': 'Outside Air',
        'engine': 'Engine Room',
        'cabin': 'Main Cabin'
      };

      const tempSensorData = {
        name: locationNames[location] || `Temperature ${instance}`,
        location,
        value: temperature,
        units: 'C',
        timestamp: Date.now()
      };
      
      useNmeaStore.getState().updateSensorData('temperature', instance, tempSensorData);
    }
  }

  /**
   * Process NMEA 2000 PGN 127505 - Fluid Level (Tanks)
   */
  processPgn127505(pgn: PgnData): void {
    if (!pgn.data || pgn.instance === undefined) return;

    // Map NMEA 2000 fluid types to sensor types (PGN 127505 standard)
    const fluidTypeMap: Record<number, TankSensorData['type']> = {
      0: 'fuel',        // Fuel (Gasoline/Diesel)
      1: 'water',       // Fresh/Potable Water  
      2: 'waste',       // Gray/Waste Water
      3: 'blackwater',  // Black/Sewage Water
      4: 'water',       // Live Well (treated as water type)
      5: 'ballast',     // Ballast Water
      6: 'fuel',        // Gasoline (specific type, mapped to fuel)
      7: 'fuel',        // Diesel (specific type, mapped to fuel)
      8: 'fuel',        // Oil (engine oil, treated as fuel type)
      9: 'water',       // Fresh Water (duplicate, but explicit)
      // Additional types may be added by manufacturers
    };

    const tankType = fluidTypeMap[pgn.data.fluidType] || 'fuel';
    
    // Enhanced instance names with proper type differentiation
    const instanceNames: Record<string, string> = {
      'fuel': `Fuel Tank ${pgn.instance + 1}`,
      'water': `Fresh Water Tank ${pgn.instance + 1}`, 
      'waste': `Gray Water Tank ${pgn.instance + 1}`,
      'blackwater': `Black Water Tank ${pgn.instance + 1}`,
      'ballast': `Ballast Tank ${pgn.instance + 1}`
    };

    useNmeaStore.getState().updateSensorData('tank', pgn.instance, {
      name: instanceNames[tankType] || `Tank ${pgn.instance}`,
      type: tankType,
      level: (pgn.data.level || 0) / 100, // Convert percentage to ratio
      capacity: pgn.data.capacity,
      timestamp: Date.now()
    });
  }

  /**
   * Process NMEA 2000 PGN 127488 - Engine Parameters
   */
  processPgn127488(pgn: PgnData): void {
    if (!pgn.data || !pgn.sourceAddress) return;

    const instance = pgn.sourceAddress - 1; // Convert source address to instance
    const instanceNames: Record<number, string> = {
      0: 'Main Engine',
      1: 'Port Engine', 
      2: 'Starboard Engine',
      3: 'Generator'
    };

    useNmeaStore.getState().updateSensorData('engine', instance, {
      name: instanceNames[instance] || `Engine ${instance + 1}`,
      rpm: pgn.data.engineSpeed,
      coolantTemp: pgn.data.coolantTemperature,
      oilPressure: pgn.data.oilPressure,
      voltage: pgn.data.alternatorVoltage,
      hours: pgn.data.totalEngineHours,
      timestamp: Date.now()
    });
  }

  /**
   * Process NMEA 2000 PGN 127508 - Battery Status
   */
  processPgn127508(pgn: PgnData): void {
    if (!pgn.data || pgn.instance === undefined) return;

    const instanceNames: Record<number, string> = {
      0: 'House Battery',
      1: 'Start Battery',
      2: 'Thruster Battery'
    };

    useNmeaStore.getState().updateSensorData('battery', pgn.instance, {
      name: instanceNames[pgn.instance] || `Battery ${pgn.instance}`,
      voltage: pgn.data.batteryVoltage,
      current: pgn.data.batteryCurrent,
      stateOfCharge: pgn.data.stateOfCharge,
      temperature: pgn.data.batteryTemperature,
      timestamp: Date.now()
    });
  }

  /**
   * Process NMEA 2000 PGN 130312 - Temperature
   */
  processPgn130312(pgn: PgnData): void {
    if (!pgn.data || pgn.instance === undefined) return;

    // Map NMEA 2000 temperature source to location
    const sourceMap: Record<number, TemperatureSensorData['location']> = {
      0: 'seawater',
      1: 'outside', 
      2: 'cabin',
      3: 'engine',
      4: 'exhaust'
    };

    const location = sourceMap[pgn.data.temperatureSource] || 'cabin';
    const locationNames: Record<string, string> = {
      'seawater': 'Sea Water',
      'outside': 'Outside Air', 
      'cabin': 'Main Cabin',
      'engine': 'Engine Room',
      'exhaust': 'Exhaust Gas'
    };

    useNmeaStore.getState().updateSensorData('temperature', pgn.instance, {
      name: locationNames[location] || `Temperature ${pgn.instance}`,
      location,
      value: pgn.data.actualTemperature,
      units: 'C',
      timestamp: Date.now()
    });
  }

  /**
   * Process NMEA 0183 VHW sentence for speed through water
   */
  processVhwSentence(data: any): void {
    if (data.speedThroughWaterKnots !== undefined) {
      useNmeaStore.getState().updateSensorData('speed', 0, {
        name: 'Log Speed',
        throughWater: data.speedThroughWaterKnots,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NMEA 0183 VTG sentence for speed over ground
   */
  processVtgSentence(data: any): void {
    if (data.speedOverGroundKnots !== undefined) {
      useNmeaStore.getState().updateSensorData('speed', 0, {
        name: 'GPS Speed',
        overGround: data.speedOverGroundKnots,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NMEA 0183 VWR sentence for relative wind
   */
  processVwrSentence(data: any): void {
    if (data.windDirectionMagnitude !== undefined && data.windSpeedKnots !== undefined) {
      useNmeaStore.getState().updateSensorData('wind', 0, {
        name: 'Apparent Wind',
        angle: data.windDirectionMagnitude,
        speed: data.windSpeedKnots,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NMEA 0183 GGA sentence for GPS position
   */
  processGgaSentence(data: any): void {
    if (data.latitude !== undefined && data.longitude !== undefined) {
      useNmeaStore.getState().updateSensorData('gps', 0, {
        name: 'Primary GPS',
        position: {
          latitude: data.latitude,
          longitude: data.longitude
        },
        quality: {
          fixType: data.gpsQuality || 0,
          satellites: data.satellitesInUse || 0,
          hdop: data.hdop || 0
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NMEA 0183 DBT sentence for depth
   */
  processDbtSentence(data: any): void {
    if (data.depthMeters !== undefined) {
      useNmeaStore.getState().updateSensorData('depth', 0, {
        name: 'Depth Sounder',
        depth: data.depthMeters,
        referencePoint: 'transducer',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Process NMEA 0183 HDG sentence for compass heading
   */
  processHdgSentence(data: any): void {
    if (data.heading !== undefined) {
      useNmeaStore.getState().updateSensorData('compass', 0, {
        name: 'Magnetic Compass',
        heading: data.heading,
        variation: data.magneticVariation,
        deviation: data.magneticDeviation,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Main processing method - routes messages to appropriate handlers
   */
  processNmeaMessage(messageType: string, data: any): void {
    // NMEA 0183 sentences
    if (messageType.startsWith('$') && messageType.includes('XDR')) {
      // Parse XDR data and process
      if (data && typeof data === 'object') {
        this.processXdrSentence(data);
      }
      return;
    }

    // Handle specific NMEA 0183 sentence types
    switch (messageType) {
      case 'VHW': this.processVhwSentence(data); break;
      case 'VTG': this.processVtgSentence(data); break;
      case 'VWR': this.processVwrSentence(data); break;
      case 'GGA': this.processGgaSentence(data); break;
      case 'DBT': this.processDbtSentence(data); break;
      case 'HDG': this.processHdgSentence(data); break;
    }

    // NMEA 2000 PGNs
    if (typeof messageType === 'number' || !isNaN(parseInt(messageType))) {
      const pgn = parseInt(messageType.toString());
      switch (pgn) {
        case 127505: this.processPgn127505(data); break;
        case 127488: this.processPgn127488(data); break;
        case 127508: this.processPgn127508(data); break;
        case 130312: this.processPgn130312(data); break;
      }
    }
  }
}

// Export singleton instance
export const nmeaProcessor = new UniversalNmeaProcessor();