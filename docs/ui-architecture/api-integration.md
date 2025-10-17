# API Integration Architecture

## NMEA Service Layer

### Service Template

**NMEA Connection Service (`src/services/nmea/NMEAConnection.ts`)**

```typescript
import TcpSocket from 'react-native-tcp-socket';
import { useNMEAStore } from '@/store/nmeaStore';
import { useConnectionStore } from '@/store/connectionStore';
import { NMEAParser } from './NMEAParser';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * NMEAConnection - Manages TCP socket connection to WiFi bridge
 * Streams NMEA 0183/2000 data and updates nmeaStore
 */
export class NMEAConnection {
  private socket: any = null;
  private parser: NMEAParser;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]; // Exponential backoff

  constructor() {
    this.parser = new NMEAParser();
  }

  /**
   * Connect to WiFi bridge
   * @param host - IP address or hostname (e.g., '192.168.1.10')
   * @param port - TCP port (default: 10110 for NMEA)
   */
  async connect(host: string, port: number = 10110): Promise<void> {
    try {
      useConnectionStore.getState().setStatus('connecting');

      this.socket = TcpSocket.createConnection(
        { host, port, reuseAddress: true },
        () => {
          console.log(`[NMEA] Connected to ${host}:${port}`);
          useConnectionStore.getState().setStatus('connected');
          this.reconnectAttempts = 0; // Reset on successful connection
        }
      );

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        console.error('[NMEA] Socket error:', error);
        useConnectionStore.getState().setStatus('error');
        this.scheduleReconnect(host, port);
      });

      this.socket.on('close', () => {
        console.log('[NMEA] Connection closed');
        useConnectionStore.getState().setStatus('disconnected');
        this.scheduleReconnect(host, port);
      });
    } catch (error) {
      console.error('[NMEA] Connection failed:', error);
      useConnectionStore.getState().setStatus('error');
      throw error;
    }
  }

  /**
   * Disconnect from WiFi bridge
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    useConnectionStore.getState().setStatus('disconnected');
    useNMEAStore.getState().resetAllData();
  }

  /**
   * Handle incoming NMEA data
   */
  private handleData(data: Buffer): void {
    const sentences = data.toString('utf-8').split('\r\n');

    sentences.forEach((sentence) => {
      if (!sentence.trim()) return;

      try {
        const parsed = this.parser.parse(sentence);
        if (parsed) {
          this.updateStoreFromParsedData(parsed);
        }
      } catch (error) {
        console.warn('[NMEA] Parse error:', error);
      }
    });
  }

  /**
   * Update Zustand store based on parsed NMEA data
   */
  private updateStoreFromParsedData(data: any): void {
    const store = useNMEAStore.getState();

    switch (data.type) {
      case 'depth':
        store.updateDepth(data.value, data.unit);
        break;
      case 'speed':
        store.updateSpeed(data.sog, data.stw, data.unit);
        break;
      case 'wind':
        store.updateWind(data.awa, data.aws, data.twa, data.tws);
        break;
      case 'heading':
        store.updateHeading(data.heading, data.lat, data.lon, data.cog);
        break;
      case 'autopilot':
        store.updateAutopilot(data.mode, data.targetHeading);
        break;
      case 'engine':
        store.updateEngine(data.engineId, data.engineData);
        break;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(host: string, port: number): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[NMEA] Max reconnect attempts reached');
      return;
    }

    const delay = this.RECONNECT_DELAYS[
      Math.min(this.reconnectAttempts, this.RECONNECT_DELAYS.length - 1)
    ];

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`[NMEA] Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
      this.connect(host, port);
    }, delay);
  }
}
```

### Connection Management Hook

**useNMEAConnection Hook (`src/hooks/useNMEAConnection.ts`)**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useConnectionStore } from '@/store/connectionStore';
import { NMEAConnection } from '@/services/nmea/NMEAConnection';

export const useNMEAConnection = () => {
  const connectionRef = useRef<NMEAConnection | null>(null);
  const { status, lastHost, lastPort } = useConnectionStore();

  // Initialize connection instance
  useEffect(() => {
    connectionRef.current = new NMEAConnection();

    return () => {
      connectionRef.current?.disconnect();
    };
  }, []);

  // Auto-reconnect to last known good connection
  useEffect(() => {
    if (lastHost && lastPort && status === 'disconnected') {
      const timer = setTimeout(() => {
        connect(lastHost, lastPort);
      }, 2000); // 2-second delay before auto-reconnect

      return () => clearTimeout(timer);
    }
  }, [lastHost, lastPort, status]);

  const connect = useCallback(async (host: string, port: number = 10110) => {
    try {
      await connectionRef.current?.connect(host, port);
      useConnectionStore.getState().setLastConnection(host, port);
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect();
  }, []);

  return {
    connect,
    disconnect,
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  };
};
```

## Real-Time Data Handling

### Data Flow Architecture

```
WiFi Bridge (192.168.1.10:10110)
    ↓ TCP Socket Stream
NMEAConnection Service
    ↓ Parse & Validate
NMEAParser (nmea-simple library)  
    ↓ Type-Safe Data Objects
Zustand Store Updates
    ↓ Selective Subscriptions
React Components (Widgets)
    ↓ Optimized Re-renders
UI Updates (60 FPS)
```

### Data Parsing Service

**NMEA Parser Service (`src/services/nmea/NMEAParser.ts`)**

```typescript
import * as nmea from 'nmea-simple';

export interface ParsedNMEAData {
  type: 'depth' | 'speed' | 'wind' | 'heading' | 'autopilot' | 'engine';
  timestamp: Date;
  raw: string;
  [key: string]: any;
}

export class NMEAParser {
  private lastSentences: string[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Parse NMEA sentence and return typed data object
   */
  parse(sentence: string): ParsedNMEAData | null {
    try {
      // Store raw sentence for debugging
      this.lastSentences.push(sentence);
      if (this.lastSentences.length > this.MAX_HISTORY) {
        this.lastSentences.shift();
      }

      const parsed = nmea.parseNmeaSentence(sentence);
      
      return this.convertToTypedData(parsed, sentence);
    } catch (error) {
      console.warn('[Parser] Invalid NMEA sentence:', sentence, error);
      return null;
    }
  }

  /**
   * Convert nmea-simple output to our typed data format
   */
  private convertToTypedData(parsed: any, raw: string): ParsedNMEAData | null {
    const base = {
      timestamp: new Date(),
      raw,
    };

    switch (parsed.sentenceId) {
      // Depth - DPT, DBT, DBK
      case 'DPT':
      case 'DBT':
        return {
          ...base,
          type: 'depth',
          value: parsed.depth,
          unit: parsed.unit || 'm',
        };

      // Speed - VTG, VHW
      case 'VTG':
        return {
          ...base,
          type: 'speed',
          sog: parsed.speedKnots,
          cog: parsed.trackTrue,
          unit: 'kts',
        };

      case 'VHW':
        return {
          ...base,
          type: 'speed',
          stw: parsed.speedKnots,
          heading: parsed.headingTrue,
          unit: 'kts',
        };

      // Wind - MWV, MWD
      case 'MWV':
        return {
          ...base,
          type: 'wind',
          awa: parsed.windAngle,
          aws: parsed.windSpeed,
          reference: parsed.reference, // 'R' = relative, 'T' = true
        };

      // Heading/Position - HDG, HDT, GLL, RMC
      case 'HDG':
      case 'HDT':
        return {
          ...base,
          type: 'heading',
          heading: parsed.heading,
        };

      case 'RMC':
        return {
          ...base,
          type: 'heading',
          lat: parsed.latitude,
          lon: parsed.longitude,
          sog: parsed.speedKnots,
          cog: parsed.trackTrue,
        };

      // Engine - Custom or proprietary sentences
      case 'RPM':
        return {
          ...base,
          type: 'engine',
          engineId: parsed.source || 'main',
          engineData: {
            rpm: parsed.rpm,
          },
        };

      default:
        return null;
    }
  }

  /**
   * Get recent sentence history for debugging
   */
  getRecentSentences(count: number = 10): string[] {
    return this.lastSentences.slice(-count);
  }
}
```

## Error Handling & Reliability

### Connection State Management

```typescript
// Connection Store for managing network state
interface ConnectionStore {
  status: ConnectionStatus;
  lastHost: string | null;
  lastPort: number | null;
  errorMessage: string | null;
  connectAttempts: number;
  
  setStatus: (status: ConnectionStatus) => void;
  setError: (message: string) => void;
  setLastConnection: (host: string, port: number) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: 'disconnected',
  lastHost: null,
  lastPort: null,
  errorMessage: null,
  connectAttempts: 0,

  setStatus: (status) => set({ status, errorMessage: null }),
  setError: (errorMessage) => set({ errorMessage, status: 'error' }),
  setLastConnection: (lastHost, lastPort) => set({ lastHost, lastPort }),
  incrementAttempts: () => set((state) => ({ 
    connectAttempts: state.connectAttempts + 1 
  })),
  resetAttempts: () => set({ connectAttempts: 0 }),
}));
```

### Data Validation & Safety

```typescript
/**
 * Validate NMEA data before updating store
 */
function validateDepth(depth: number): boolean {
  return (
    typeof depth === 'number' &&
    !isNaN(depth) &&
    depth >= 0 &&
    depth < 1000 // Reasonable max depth for recreational boats
  );
}

function validateSpeed(speed: number): boolean {
  return (
    typeof speed === 'number' &&
    !isNaN(speed) &&
    speed >= 0 &&
    speed < 100 // Max reasonable boat speed in knots
  );
}

function validateWind(angle: number, speed: number): boolean {
  return (
    validateSpeed(speed) &&
    typeof angle === 'number' &&
    !isNaN(angle) &&
    angle >= 0 &&
    angle < 360
  );
}
```

## Service Integration Patterns

### Background Service (Future Enhancement)

```typescript
// For React Native background processing
import BackgroundTimer from 'react-native-background-timer';

export class BackgroundNMEAService {
  private connection: NMEAConnection;
  private backgroundTimer: number | null = null;

  startBackground(): void {
    this.backgroundTimer = BackgroundTimer.setInterval(() => {
      // Keep connection alive, handle reconnections
      this.connection.ping();
    }, 30000); // 30-second keepalive
  }

  stopBackground(): void {
    if (this.backgroundTimer) {
      BackgroundTimer.clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
}
```

### Testing Integration

```typescript
// Mock service for testing
export class MockNMEAConnection implements NMEAConnection {
  private dataInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    // Start generating mock data
    this.dataInterval = setInterval(() => {
      const mockData = {
        type: 'depth',
        value: Math.random() * 20 + 5, // 5-25 feet
        unit: 'ft',
      };
      
      this.updateStoreFromParsedData(mockData);
    }, 1000);
    
    useConnectionStore.getState().setStatus('connected');
  }

  disconnect(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
    
    useConnectionStore.getState().setStatus('disconnected');
  }
}
```