# NMEA Store Architecture v2.0

## Overview

The NMEA Store provides a clean, widget-centric data structure that abstracts away NMEA protocol differences (0183 vs 2000) and presents a unified interface to marine instrument widgets.

## Design Principles

1. **Widget-Centric**: Each widget type has a single, predictable entry point in the data structure
2. **Protocol Agnostic**: Widgets don't know or care about NMEA 0183 vs NMEA 2000 differences
3. **Instance-Based**: Natural support for multiple instances of each sensor type
4. **Metric-Focused**: Data structure matches exactly what widgets need to display
5. **Clean Separation**: System data vs sensor data clearly separated

## Core Data Structure

```typescript
interface NmeaData {
  // Widget-centric sensor data - single entry point per widget type
  sensors: {
    wind: { [instance: number]: WindSensorData };
    speed: { [instance: number]: SpeedSensorData }; 
    gps: { [instance: number]: GpsSensorData };
    compass: { [instance: number]: CompassSensorData };
    temperature: { [instance: number]: TemperatureSensorData };
    depth: { [instance: number]: DepthSensorData };
    tank: { [instance: number]: TankSensorData };
    battery: { [instance: number]: BatterySensorData };
    engine: { [instance: number]: EngineSensorData };
    autopilot: { [instance: number]: AutopilotSensorData };
  };
  
  // System-level metadata (non-widget specific)
  timestamp: number;
  messageCount: number;
}
```

## Sensor Data Interfaces

Each sensor type has a clean interface matching widget requirements:

### TankSensorData
```typescript
interface TankSensorData {
  name: string;           // "Fuel Port", "Fresh Water", "Ballast Starboard"
  type: 'fuel' | 'water' | 'waste' | 'ballast' | 'blackwater';
  level: number;          // 0.0 to 1.0 ratio - PRIMARY metric
  capacity?: number;      // Liters - secondary metric
  temperature?: number;   // Optional additional metric
  timestamp: number;
}
```

### EngineSensorData  
```typescript
interface EngineSensorData {
  name: string;           // "Main Engine", "Generator", "Port Engine"
  rpm?: number;           // PRIMARY metric
  coolantTemp?: number;   // PRIMARY metric  
  oilPressure?: number;   // PRIMARY metric
  voltage?: number;       // Secondary metric
  fuelRate?: number;      // Secondary metric
  hours?: number;         // Secondary metric
  timestamp: number;
}
```

### BatterySensorData
```typescript
interface BatterySensorData {
  name: string;           // "House", "Start", "Bow Thruster"
  voltage?: number;       // PRIMARY metric
  current?: number;       // PRIMARY metric
  stateOfCharge?: number; // PRIMARY metric (0-100%)
  temperature?: number;   // Secondary metric
  timestamp: number;
}
```

### WindSensorData
```typescript
interface WindSensorData {
  name: string;           // "Masthead", "Apparent"
  angle?: number;         // PRIMARY metric (0-360°)
  speed?: number;         // PRIMARY metric
  direction?: number;     // Secondary metric (true wind direction)
  timestamp: number;
}
```

### SpeedSensorData
```typescript
interface SpeedSensorData {
  name: string;           // "Log", "GPS"
  throughWater?: number;  // Speed through water (STW)
  overGround?: number;    // Speed over ground (SOG)
  timestamp: number;
}
```

### GpsSensorData
```typescript
interface GpsSensorData {
  name: string;           // "Primary GPS", "Backup GPS"
  position?: { latitude: number; longitude: number };
  courseOverGround?: number;
  speedOverGround?: number;
  quality?: {
    fixType: number;      // 0=no fix, 1=GPS, 2=DGPS, 3=PPS
    satellites: number;
    hdop: number;         // Horizontal dilution of precision
  };
  timestamp: number;
}
```

### TemperatureSensorData
```typescript
interface TemperatureSensorData {
  name: string;           // "Sea Water", "Engine Room", "Main Cabin"
  location: 'seawater' | 'engine' | 'cabin' | 'outside' | 'exhaust' | 'refrigeration';
  value: number;          // Temperature in Celsius
  timestamp: number;
}
```

### DepthSensorData
```typescript
interface DepthSensorData {
  name: string;           // "Transducer", "Forward Sonar"
  depth?: number;         // PRIMARY metric
  referencePoint: 'transducer' | 'waterline' | 'keel';
  timestamp: number;
}
```

### CompassSensorData
```typescript
interface CompassSensorData {
  name: string;           // "Magnetic", "GPS"
  heading?: number;       // PRIMARY metric (0-360°)
  variation?: number;     // Magnetic variation
  deviation?: number;     // Compass deviation
  timestamp: number;
}
```

### AutopilotSensorData
```typescript
interface AutopilotSensorData {
  name: string;           // "Main Autopilot"
  engaged: boolean;       // PRIMARY status
  mode?: string;          // "compass", "gps", "wind"
  targetHeading?: number; // Target heading
  currentHeading?: number;// Current heading
  rudderAngle?: number;   // Current rudder position
  timestamp: number;
}
```

## Widget Data Access Pattern

Widgets access sensor data through a consistent pattern:

```typescript
// TanksWidget example
const TanksWidget: React.FC<{ instance: number }> = ({ instance }) => {
  const tankData = useNmeaStore(state => state.nmeaData.sensors.tank[instance]);
  
  const level = tankData?.level;        // 0.75 (75%)
  const capacity = tankData?.capacity;  // 200 (liters)
  const name = tankData?.name;          // "Fuel Port"
  const type = tankData?.type;          // "fuel"
  
  return (
    <PrimaryMetricCell 
      mnemonic="FUEL"
      value={level ? level * 100 : undefined}
      unit="%"
    />
  );
};
```

## Universal NMEA Processor

The processor maps both NMEA 0183 and 2000 protocols to clean sensor data:

```typescript
class UniversalNmeaProcessor {
  // NMEA 0183 XDR sentence: $IIXDR,V,1.5,L,FUEL_01*XX
  processXdrSentence(xdr: XdrData) {
    const match = xdr.identifier.match(/^(FUEL|WATR|WAST|BALL)_(\d+)$/);
    if (match) {
      const [, type, instanceStr] = match;
      const instance = parseInt(instanceStr, 10);
      
      this.updateSensorData('tank', instance, {
        type: type.toLowerCase(),
        level: parseFloat(xdr.value),
        timestamp: Date.now()
      });
    }
  }
  
  // NMEA 2000 PGN: Tank level data
  processPgn127505(pgn: PgnData) {
    this.updateSensorData('tank', pgn.instance, {
      type: this.mapFluidType(pgn.fluidType),
      level: pgn.level / 100, // Convert percentage to ratio
      capacity: pgn.capacity,
      timestamp: Date.now()
    });
  }
}
```

## Store Interface

The store provides simple, consistent methods:

```typescript
interface NmeaStore {
  nmeaData: NmeaData;
  
  // Update sensor data
  updateSensorData: (sensorType: SensorType, instance: number, data: Partial<SensorData>) => void;
  
  // Get sensor data  
  getSensorData: (sensorType: SensorType, instance: number) => SensorData | undefined;
  
  // Get all instances of a sensor type
  getSensorInstances: (sensorType: SensorType) => Array<{ instance: number; data: SensorData }>;
  
  // System methods
  reset: () => void;
  setTimestamp: (timestamp: number) => void;
}
```

## Benefits

1. **Predictable Widget Interface**: Every widget follows the same data access pattern
2. **Protocol Independence**: Widgets work with any NMEA protocol version
3. **Instance Clarity**: Natural multi-instance support (Port/Starboard engines, multiple tanks)
4. **Performance**: Direct field access, no complex lookups or conversions
5. **Maintainability**: Adding new widget types follows established patterns
6. **Type Safety**: Full TypeScript support with proper interfaces

## Migration from Legacy

The legacy approach mixed protocols and data structures:
- ❌ `nmeaData.pgnData['127505'][0].data.level`
- ❌ `nmeaData.tanks?.fuel`
- ❌ Complex PGN parsing in widgets

The new approach is clean and consistent:
- ✅ `nmeaData.sensors.tank[instance].level`
- ✅ Protocol abstracted away
- ✅ Widget-centric design

## Widget Integration Examples

### Tank Widget
```typescript
const tankData = useNmeaStore(state => state.nmeaData.sensors.tank[instance]);
return (
  <PrimaryMetricCell 
    mnemonic={tankData?.type?.toUpperCase() || "TANK"}
    value={tankData?.level ? tankData.level * 100 : undefined}
    unit="%"
  />
);
```

### Engine Widget  
```typescript
const engineData = useNmeaStore(state => state.nmeaData.sensors.engine[instance]);
return (
  <>
    <PrimaryMetricCell mnemonic="RPM" value={engineData?.rpm} />
    <SecondaryMetricCell mnemonic="TEMP" value={engineData?.coolantTemp} unit="°C" />
  </>
);
```

### Battery Widget
```typescript
const batteryData = useNmeaStore(state => state.nmeaData.sensors.battery[instance]);
return (
  <PrimaryMetricCell 
    mnemonic="VOLTS" 
    value={batteryData?.voltage} 
    unit="V"
  />
);
```

This architecture provides a clean foundation for marine instrument widgets with consistent data access patterns and protocol independence.