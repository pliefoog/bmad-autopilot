# NMEA API Reference
**BMad Autopilot - Complete API Documentation**

*Version: 3.0 | Updated: October 22, 2025*

---

## Table of Contents

1. [NmeaService API](#nmeaservice-api)
2. [Connection Utilities API](#connection-utilities-api)
3. [Store API](#store-api)
4. [Pure Components API](#pure-components-api)
5. [Type Definitions](#type-definitions)
6. [Constants](#constants)

---

## NmeaService API

### Class: `NmeaService`
Main orchestrator for the NMEA processing pipeline.

#### Static Methods

##### `getInstance(): NmeaService`
Returns the singleton instance of NmeaService.

```typescript
const service = NmeaService.getInstance();
```

#### Instance Methods

##### `start(config: ServiceConfig): Promise<boolean>`
Starts the NMEA service with the given configuration.

**Parameters:**
- `config: ServiceConfig` - Service configuration object

**Returns:** `Promise<boolean>` - True if service started successfully

**Example:**
```typescript
const success = await service.start({
  connection: {
    ip: '192.168.1.100',
    port: 2000,
    protocol: 'tcp'
  }
});
```

##### `stop(): Promise<void>`
Stops the NMEA service and cleans up resources.

```typescript
await service.stop();
```

##### `getStatus(): ServiceStatus`
Returns the current status of the NMEA service.

**Returns:** `ServiceStatus` - Current service status

```typescript
const status = service.getStatus();
console.log('Connection state:', status.connection.state);
```

##### `processMessage(message: string): void`
Manually process an NMEA message through the pipeline.

**Parameters:**
- `message: string` - Raw NMEA message

```typescript
service.processMessage('$IIDBT,5.2,f,1.6,M,0.9,F*2C');
```

##### `getPerformanceMetrics(): PerformanceMetric[]`
Returns performance metrics for the service.

**Returns:** `PerformanceMetric[]` - Array of performance metrics

```typescript
const metrics = service.getPerformanceMetrics();
const avgTime = metrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / metrics.length;
```

##### `getDiagnostics(): ServiceDiagnostics`
Returns diagnostic information about the service.

**Returns:** `ServiceDiagnostics` - Service diagnostics

```typescript
const diagnostics = service.getDiagnostics();
console.log('Processed message types:', diagnostics.messageTypes);
```

---

## Connection Utilities API

### Function: `connectNmea(config: ConnectionConfig): Promise<boolean>`
Convenience function to connect to an NMEA source.

**Parameters:**
- `config: ConnectionConfig` - Connection configuration

**Returns:** `Promise<boolean>` - True if connection successful

```typescript
const success = await connectNmea({
  ip: '192.168.1.100',
  port: 2000,
  protocol: 'tcp'
});
```

### Function: `disconnectNmea(): void`
Disconnects from the current NMEA source.

```typescript
disconnectNmea();
```

### Function: `getCurrentConnectionConfig(): ConnectionConfig | null`
Returns the current connection configuration.

**Returns:** `ConnectionConfig | null` - Current config or null if not connected

```typescript
const config = getCurrentConnectionConfig();
if (config) {
  console.log('Connected to:', config.ip, ':', config.port);
}
```

### Function: `shouldEnableConnectButton(): boolean`
Determines if the connect button should be enabled based on current state.

**Returns:** `boolean` - True if connect button should be enabled

```typescript
const canConnect = shouldEnableConnectButton();
```

---

## Store API

### Hook: `useNmeaStore(): NmeaStoreState`
React hook to access the NMEA store state.

**Returns:** `NmeaStoreState` - Current store state

```typescript
const { nmeaData, connectionStatus, isConnected } = useNmeaStore();
```

### Store Properties

#### `nmeaData: NmeaData`
Current NMEA data values.

**Properties:**
```typescript
interface NmeaData {
  // Position
  latitude?: number;
  longitude?: number;
  heading?: number;
  
  // Speed & Course
  speed?: number;
  courseOverGround?: number;
  
  // Depth & Wind
  depth?: number;
  windSpeed?: number;
  windDirection?: number;
  
  // GPS
  gpsStatus?: string;
  satellites?: number;
  
  // Timestamps
  lastUpdate?: number;
}
```

#### `connectionStatus: ConnectionStatus`
Current connection status.

**Values:**
- `'disconnected'` - Not connected
- `'connecting'` - Attempting to connect
- `'connected'` - Successfully connected
- `'error'` - Connection error

#### `isConnected: boolean`
Convenience property for connection state.

```typescript
const { isConnected } = useNmeaStore();
if (isConnected) {
  // Show connected UI
}
```

### Store Actions

#### `setConnectionStatus(status: ConnectionStatus): void`
Updates the connection status.

```typescript
useNmeaStore.getState().setConnectionStatus('connected');
```

#### `updateNmeaData(data: Partial<NmeaData>): void`
Updates NMEA data with partial data.

```typescript
useNmeaStore.getState().updateNmeaData({
  speed: 12.5,
  heading: 180
});
```

#### `clearNmeaData(): void`
Clears all NMEA data.

```typescript
useNmeaStore.getState().clearNmeaData();
```

---

## Pure Components API

### Class: `PureConnectionManager`

#### Static Methods

##### `getInstance(): PureConnectionManager`
Returns singleton instance.

#### Instance Methods

##### `connect(config: ConnectionConfig): Promise<ConnectionResult>`
Establishes connection to NMEA source.

**Parameters:**
- `config: ConnectionConfig` - Connection configuration

**Returns:** `Promise<ConnectionResult>` - Connection result

##### `disconnect(): Promise<void>`
Disconnects from NMEA source.

##### `isConnected(): boolean`
Returns current connection state.

##### `getLastError(): string | null`
Returns last connection error.

---

### Class: `PureNmeaParser`

#### Static Methods

##### `getInstance(): PureNmeaParser`
Returns singleton instance.

#### Instance Methods

##### `parseSentence(sentence: string): ParseResult`
Parses a single NMEA sentence.

**Parameters:**
- `sentence: string` - Raw NMEA sentence

**Returns:** `ParseResult` - Parse result with success flag and data

```typescript
const parser = PureNmeaParser.getInstance();
const result = parser.parseSentence('$IIDBT,5.2,f,1.6,M,0.9,F*2C');

if (result.success) {
  console.log('Depth:', result.data.fields.depth);
}
```

##### `validateChecksum(sentence: string): boolean`
Validates NMEA sentence checksum.

**Parameters:**
- `sentence: string` - NMEA sentence with checksum

**Returns:** `boolean` - True if checksum is valid

---

### Class: `PureDataTransformer`

#### Static Methods

##### `getInstance(): PureDataTransformer`
Returns singleton instance.

#### Instance Methods

##### `transformMessage(message: ParsedNmeaMessage): TransformationResult`
Transforms parsed message to application data format.

**Parameters:**
- `message: ParsedNmeaMessage` - Parsed NMEA message

**Returns:** `TransformationResult` - Transformation result

---

### Class: `PureStoreUpdater`

#### Static Methods

##### `getInstance(): PureStoreUpdater`
Returns singleton instance.

#### Instance Methods

##### `updateStore(data: any): UpdateResult`
Updates the store with transformed data.

**Parameters:**
- `data: any` - Transformed data to store

**Returns:** `UpdateResult` - Update result

---

## Type Definitions

### Core Types

```typescript
interface ConnectionConfig {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
  timeout?: number;
  retryAttempts?: number;
}

interface ServiceConfig {
  connection: ConnectionConfig;
  parsing?: ParsingConfig;
  updates?: UpdateConfig;
}

interface ParsingConfig {
  enableFallback?: boolean;
  strictValidation?: boolean;
  supportedMessages?: string[];
}

interface UpdateConfig {
  throttleMs?: number;
  enableBatching?: boolean;
  maxBatchSize?: number;
}

interface ServiceStatus {
  isRunning: boolean;
  connection: {
    state: ConnectionStatus;
    lastError?: string;
    connectedAt?: number;
  };
  performance: {
    messagesProcessed: number;
    averageProcessingTime: number;
    lastMessageTime?: number;
  };
}

interface ParsedNmeaMessage {
  messageType: string;
  talkerID: string;
  fields: Record<string, any>;
  timestamp: number;
  checksum?: string;
}

interface TransformationResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface PerformanceMetric {
  messageType: string;
  processingTimeMs: number;
  timestamp: number;
}

interface ServiceDiagnostics {
  messageTypes: string[];
  errorTypes: string[];
  connectionHistory: ConnectionEvent[];
  performanceSummary: {
    totalMessages: number;
    averageLatency: number;
    errorRate: number;
  };
}
```

### Result Types

```typescript
interface ParseResult {
  success: boolean;
  data?: ParsedNmeaMessage;
  error?: string;
}

interface ConnectionResult {
  success: boolean;
  error?: string;
  metadata?: {
    connectedAt: number;
    endpoint: string;
  };
}

interface UpdateResult {
  success: boolean;
  updatedFields: string[];
  error?: string;
}
```

---

## Constants

### Message Types

```typescript
export const NMEA_MESSAGE_TYPES = {
  // Position & Navigation
  GGA: 'Global Positioning System Fix Data',
  RMC: 'Recommended Minimum',
  GLL: 'Geographic Position - Latitude/Longitude',
  
  // Depth
  DBT: 'Depth Below Transducer',
  DPT: 'Depth of Water',
  
  // Wind
  MWV: 'Wind Speed and Angle',
  VWR: 'Relative Wind Speed and Angle',
  
  // Speed
  VTG: 'Track Made Good and Ground Speed',
  VHW: 'Water Speed and Heading',
  
  // Heading
  HDG: 'Heading - Deviation & Variation',
  HDT: 'Heading - True',
  HDM: 'Heading - Magnetic'
} as const;
```

### Connection States

```typescript
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
} as const;

type ConnectionStatus = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];
```

### Default Configurations

```typescript
export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  ip: '192.168.1.100',
  port: 2000,
  protocol: 'tcp',
  timeout: 5000,
  retryAttempts: 3
};

export const DEFAULT_PARSING_CONFIG: ParsingConfig = {
  enableFallback: true,
  strictValidation: false,
  supportedMessages: Object.keys(NMEA_MESSAGE_TYPES)
};

export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  throttleMs: 100,
  enableBatching: true,
  maxBatchSize: 10
};
```

### Performance Thresholds

```typescript
export const PERFORMANCE_THRESHOLDS = {
  MAX_PROCESSING_TIME_MS: 50,
  MAX_MESSAGE_QUEUE_SIZE: 100,
  WARNING_ERROR_RATE: 0.05,
  CRITICAL_ERROR_RATE: 0.1
} as const;
```

---

## Error Codes

```typescript
export const NMEA_ERROR_CODES = {
  // Connection Errors
  CONNECTION_TIMEOUT: 'CONN_TIMEOUT',
  CONNECTION_REFUSED: 'CONN_REFUSED',
  CONNECTION_LOST: 'CONN_LOST',
  
  // Parsing Errors
  INVALID_CHECKSUM: 'INVALID_CHECKSUM',
  MALFORMED_MESSAGE: 'MALFORMED_MESSAGE',
  UNSUPPORTED_MESSAGE: 'UNSUPPORTED_MESSAGE',
  
  // Data Errors
  INVALID_DATA_RANGE: 'INVALID_DATA_RANGE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Service Errors
  SERVICE_NOT_STARTED: 'SERVICE_NOT_STARTED',
  SERVICE_ALREADY_RUNNING: 'SERVICE_ALREADY_RUNNING'
} as const;
```

---

## Usage Examples

### Complete Integration Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { connectNmea, disconnectNmea, shouldEnableConnectButton } from '../services/connectionDefaults';

const NmeaDisplay: React.FC = () => {
  const { nmeaData, connectionStatus, isConnected } = useNmeaStore();
  const [canConnect, setCanConnect] = useState(false);

  useEffect(() => {
    setCanConnect(shouldEnableConnectButton());
  }, [connectionStatus]);

  const handleConnect = async () => {
    const success = await connectNmea({
      ip: '192.168.1.100',
      port: 2000,
      protocol: 'tcp'
    });
    
    if (!success) {
      console.error('Failed to connect to NMEA source');
    }
  };

  const handleDisconnect = () => {
    disconnectNmea();
  };

  return (
    <View>
      <Text>Status: {connectionStatus}</Text>
      <Text>Speed: {nmeaData.speed || '--'} knots</Text>
      <Text>Depth: {nmeaData.depth || '--'} meters</Text>
      <Text>Heading: {nmeaData.heading || '--'}°</Text>
      
      <Button
        title={isConnected ? "Disconnect" : "Connect"}
        onPress={isConnected ? handleDisconnect : handleConnect}
        disabled={!canConnect && !isConnected}
      />
    </View>
  );
};

export default NmeaDisplay;
```

---

**For implementation details and architecture overview, see [NMEA Architecture](nmea-architecture.md) and [Developer Guide](nmea-developer-guide.md).**