/**
 * Pure Connection Manager Component
 * 
 * Dedicated network connection handling with no parsing logic.
 * Supports WebSocket, TCP, and UDP protocols with clean separation.
 * 
 * Key Principles:
 * - Pure connection management - no data parsing
 * - Protocol-agnostic interface
 * - Event-driven architecture
 * - Clean state management
 */

import { Platform, NativeModules } from 'react-native';

/**
 * Lazy-load TCP socket module
 * Returns the Socket class, not the module
 */
function getTcpSocket() {
  console.log('[getTcpSocket] Platform.OS:', Platform.OS);
  
  if (Platform.OS === 'web') {
    console.log('[getTcpSocket] Web platform - returning null');
    return null;
  }
  
  // Check if native module is available
  console.log('[getTcpSocket] Checking native modules:', {
    hasTcpSockets: !!NativeModules.TcpSockets,
    hasTcpSocket: !!NativeModules.TcpSocket,
    availableModules: Object.keys(NativeModules).filter(k => k.toLowerCase().includes('tcp'))
  });
  
  if (!NativeModules.TcpSockets && !NativeModules.TcpSocket) {
    console.error('[getTcpSocket] ⚠️ Native TCP socket module not found! The library may not be properly linked.');
    // Continue anyway - the JS module might still work
  }
  
  try {
    console.log('[getTcpSocket] Attempting to require react-native-tcp-socket...');
    const TcpSocketModule = require('react-native-tcp-socket');
    console.log('[getTcpSocket] Module loaded:', {
      type: typeof TcpSocketModule,
      keys: Object.keys(TcpSocketModule || {}).slice(0, 20),
      hasSocket: !!(TcpSocketModule && TcpSocketModule.Socket),
      hasDefault: !!(TcpSocketModule && TcpSocketModule.default),
      socketType: TcpSocketModule?.Socket ? typeof TcpSocketModule.Socket : 'undefined',
      defaultType: TcpSocketModule?.default ? typeof TcpSocketModule.default : 'undefined'
    });
    
    // Try multiple export patterns
    if (TcpSocketModule.Socket) {
      console.log('[getTcpSocket] Using TcpSocketModule.Socket');
      return TcpSocketModule.Socket;
    } else if (TcpSocketModule.default && TcpSocketModule.default.Socket) {
      console.log('[getTcpSocket] Using TcpSocketModule.default.Socket');
      return TcpSocketModule.default.Socket;
    } else if (typeof TcpSocketModule === 'function') {
      console.log('[getTcpSocket] Module itself is a function');
      return TcpSocketModule;
    } else if (TcpSocketModule.default && typeof TcpSocketModule.default === 'function') {
      console.log('[getTcpSocket] Using TcpSocketModule.default as constructor');
      return TcpSocketModule.default;
    } else {
      console.error('[getTcpSocket] Could not find Socket constructor in module exports');
      return null;
    }
  } catch (error) {
    console.error('[getTcpSocket] Error loading TCP socket module:', error);
    return null;
  }
}

/**
 * Lazy-load UDP socket module
 */
function getUdpSocket() {
  if (Platform.OS === 'web') return null;
  
  try {
    const UdpSocketModule = require('react-native-udp');
    return UdpSocketModule.default || UdpSocketModule;
  } catch (error) {
    console.warn('[ConnectionManager] UDP socket module not available:', error);
    return null;
  }
}

export interface ConnectionConfig {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  config: ConnectionConfig | null;
  connectedAt?: Date;
  lastError?: string;
  bytesReceived: number;
  messagesReceived: number;
}

export interface BinaryPgnFrame {
  pgn: number;
  source: number;
  priority: number;
  data: Uint8Array;
}

export interface ConnectionEvents {
  onStateChange: (status: ConnectionStatus) => void;
  onDataReceived: (data: string) => void;
  onBinaryDataReceived?: (frame: BinaryPgnFrame) => void;
  onError: (error: string) => void;
}

export class PureConnectionManager {
  private activeConnection: any = null;
  private connectionType: 'tcp' | 'udp' | 'websocket' | null = null;
  private currentConfig: ConnectionConfig | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private events: Partial<ConnectionEvents> = {};
  
  // Connection management
  private connectionTimeout: any = null;
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  
  // Statistics
  private bytesReceived = 0;
  private messagesReceived = 0;
  private connectedAt: Date | null = null;
  
  // Data buffering for incomplete packets
  private dataBuffer = '';

  constructor() {
    // Initialize with clean state
  }

  /**
   * Set event handlers
   */
  setEventHandlers(events: Partial<ConnectionEvents>): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Connect to NMEA source
   */
  async connect(config: ConnectionConfig): Promise<boolean> {
    console.log(`[ConnectionManager] Connecting to ${config.protocol}://${config.ip}:${config.port}`);
    console.log('[ConnectionManager] Platform:', Platform.OS);
    
    // Disconnect any existing connection
    if (this.activeConnection) {
      this.disconnect();
    }

    this.currentConfig = config;
    this.updateState('connecting');

    try {
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.handleError('Connection timeout');
        }
      }, this.CONNECTION_TIMEOUT);

      // Create protocol-specific connection
      console.log('[ConnectionManager] About to switch on protocol:', config.protocol);
      switch (config.protocol) {
        case 'websocket':
          console.log('[ConnectionManager] Calling connectWebSocket...');
          return await this.connectWebSocket(config);
        case 'tcp':
          console.log('[ConnectionManager] Calling connectTCP...');
          return await this.connectTCP(config);
        case 'udp':
          console.log('[ConnectionManager] Calling connectUDP...');
          return await this.connectUDP(config);
        default:
          throw new Error(`Unsupported protocol: ${config.protocol}`);
      }
    } catch (error) {
      console.error('[ConnectionManager] Connection attempt caught error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      this.handleError(errorMessage);
      return false;
    }
  }

  /**
   * Disconnect from NMEA source
   */
  disconnect(): void {
    console.log('[ConnectionManager] Disconnecting...');
    
    // Clear timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Close connection based on type
    if (this.activeConnection) {
      try {
        switch (this.connectionType) {
          case 'websocket':
            if (this.activeConnection.readyState === WebSocket.OPEN) {
              this.activeConnection.close();
            }
            break;
          case 'tcp':
          case 'udp':
            if (this.activeConnection.destroy) {
              this.activeConnection.destroy();
            }
            break;
        }
      } catch (error) {
        console.warn('[ConnectionManager] Error during disconnect:', error);
      }
      
      this.activeConnection = null;
      this.connectionType = null;
    }

    // Reset state
    this.dataBuffer = '';
    this.connectedAt = null;
    this.updateState('disconnected');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return {
      state: this.connectionState,
      config: this.currentConfig,
      connectedAt: this.connectedAt || undefined,
      bytesReceived: this.bytesReceived,
      messagesReceived: this.messagesReceived
    };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.bytesReceived = 0;
    this.messagesReceived = 0;
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(config: ConnectionConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${config.ip}:${config.port}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('[ConnectionManager] WebSocket connected');
          this.activeConnection = ws;
          this.connectionType = 'websocket';
          this.connectedAt = new Date();
          this.clearConnectionTimeout();
          this.updateState('connected');
          resolve(true);
        };

        ws.onmessage = (event) => {
          // Handle both text (NMEA 0183) and binary (NMEA 2000) frames
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            this.handleBinaryDataReceived(event.data);
          } else {
            this.handleDataReceived(event.data);
          }
        };

        ws.onerror = (error) => {
          console.error('[ConnectionManager] WebSocket error:', error);
          this.handleError('WebSocket connection failed');
          reject(new Error('WebSocket connection failed'));
        };

        ws.onclose = () => {
          console.log('[ConnectionManager] WebSocket closed');
          if (this.connectionState === 'connected') {
            this.updateState('disconnected');
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect via TCP
   */
  private async connectTCP(config: ConnectionConfig): Promise<boolean> {
    const TcpSocket = getTcpSocket();
    
    if (!TcpSocket) {
      console.error('[ConnectionManager] TCP Socket is null - not available on this platform');
      throw new Error('TCP not supported in this environment');
    }

    console.log('[ConnectionManager] TCP Socket loaded:', {
      type: typeof TcpSocket,
      isClass: typeof TcpSocket === 'function',
      keys: TcpSocket ? Object.keys(TcpSocket).slice(0, 10) : [],
      hasCreateConnection: !!(TcpSocket.createConnection),
      hasConnect: !!(TcpSocket.connect)
    });
    
    // Also try to get the full module for static methods
    let TcpModule: any = null;
    try {
      TcpModule = require('react-native-tcp-socket');
      console.log('[ConnectionManager] Full TCP module:', {
        hasCreateConnection: !!(TcpModule && TcpModule.createConnection),
        hasConnect: !!(TcpModule && TcpModule.connect),
        createConnectionType: TcpModule?.createConnection ? typeof TcpModule.createConnection : 'undefined'
      });
    } catch (e) {
      console.warn('[ConnectionManager] Could not require full module:', e);
    }

    return new Promise((resolve, reject) => {
      try {
        // Create TCP socket instance
        let socket: any = null;
        let connectionMethod = 'unknown';
        
        // Try module-level connect function (simpler than createConnection)
        if (TcpModule && TcpModule.connect && typeof TcpModule.connect === 'function') {
          console.log('[ConnectionManager] Using TcpModule.connect (module-level function)...');
          connectionMethod = 'TcpModule.connect';
          try {
            socket = TcpModule.connect({
              port: config.port,
              host: config.ip
            });
            console.log('[ConnectionManager] connect() returned:', {
              socketType: typeof socket,
              isNull: socket === null,
              hasOn: socket && typeof socket.on === 'function'
            });
          } catch (connectError: any) {
            console.error('[ConnectionManager] TcpModule.connect() threw error:', {
              message: connectError?.message,
              type: connectError?.constructor?.name,
              nativeModuleAvailable: !!NativeModules.TcpSockets || !!NativeModules.TcpSocket
            });
            throw new Error(`Native TCP module not properly linked. Error: ${connectError?.message || 'unknown'}. Try rebuilding the Android app with 'npx expo prebuild --clean' then 'npx expo run:android'`);
          }
        } else if (TcpModule && TcpModule.createConnection && typeof TcpModule.createConnection === 'function') {
          console.log('[ConnectionManager] Using TcpModule.createConnection (module-level static method)...');
          connectionMethod = 'TcpModule.createConnection';
          try {
            socket = TcpModule.createConnection({
              port: config.port,
              host: config.ip,
              timeout: this.CONNECTION_TIMEOUT
            });
            console.log('[ConnectionManager] createConnection returned:', {
              socketType: typeof socket,
              isNull: socket === null
            });
          } catch (createError: any) {
            console.error('[ConnectionManager] TcpModule.createConnection() threw error:', {
              message: createError?.message,
              type: createError?.constructor?.name
            });
            throw new Error(`Native TCP module not properly linked. Error: ${createError?.message || 'unknown'}`);
          }
        } else if (TcpSocket.createConnection && typeof TcpSocket.createConnection === 'function') {
          console.log('[ConnectionManager] Using TcpSocket.createConnection (Socket class static method)...');
          socket = TcpSocket.createConnection({
            port: config.port,
            host: config.ip,
            timeout: this.CONNECTION_TIMEOUT
          });
          console.log('[ConnectionManager] createConnection returned:', {
            socketType: typeof socket,
            isNull: socket === null
          });
        } else if (typeof TcpSocket === 'function') {
          // TcpSocket is the Socket class constructor
          console.log('[ConnectionManager] Creating new TcpSocket instance...');
          try {
            socket = new TcpSocket();
            console.log('[ConnectionManager] Socket instance created:', {
              isNull: socket === null,
              isUndefined: socket === undefined,
              type: typeof socket,
              hasConnect: socket && typeof socket.connect === 'function',
              socketKeys: socket ? Object.keys(socket).slice(0, 10) : []
            });
          } catch (constructorError) {
            console.error('[ConnectionManager] Error calling TcpSocket constructor:', constructorError);
            throw new Error('Failed to create TCP socket instance: ' + (constructorError instanceof Error ? constructorError.message : 'unknown error'));
          }
          
          if (!socket) {
            throw new Error('Failed to create TCP socket instance - constructor returned null/undefined');
          }
          
          if (typeof socket.connect !== 'function') {
            console.error('[ConnectionManager] Socket methods:', socket ? Object.getOwnPropertyNames(socket) : []);
            console.error('[ConnectionManager] Socket prototype:', socket ? Object.getOwnPropertyNames(Object.getPrototypeOf(socket)) : []);
            throw new Error('TCP socket instance has no connect method');
          }
          
          console.log('[ConnectionManager] About to call socket.connect');
          console.log('[ConnectionManager] Config object:', config);
          console.log('[ConnectionManager] Config.ip:', config ? config.ip : 'CONFIG IS NULL');
          console.log('[ConnectionManager] Config.port:', config ? config.port : 'CONFIG IS NULL');
          
          // Build options object separately to debug
          const connectOptions = {
            port: config.port,
            host: config.ip,
          };
          console.log('[ConnectionManager] Connect options:', connectOptions);
          
          // Call connect
          const connectResult = socket.connect(connectOptions);
          
          console.log('[ConnectionManager] socket.connect() called, result:', connectResult);
        } else if (TcpSocket.connect) {
          console.log('[ConnectionManager] Using TcpSocket.connect (static method)...');
          socket = TcpSocket.connect({
            port: config.port,
            host: config.ip,
            timeout: this.CONNECTION_TIMEOUT
          });
        } else {
          throw new Error('Unknown TCP socket API. Available methods: ' + Object.keys(TcpSocket).join(', '));
        }

        if (!socket) {
          throw new Error('Failed to create socket - all connection methods returned null');
        }

        socket.on('connect', () => {
          console.log('[ConnectionManager] TCP connected to', config.ip, ':', config.port);
          this.activeConnection = socket;
          this.connectionType = 'tcp';
          this.connectedAt = new Date();
          this.clearConnectionTimeout();
          this.updateState('connected');
          resolve(true);
        });

        socket.on('data', (data: Buffer) => {
          this.handleDataReceived(data.toString());
        });

        socket.on('error', (error: Error) => {
          console.error('[ConnectionManager] TCP error:', error);
          this.handleError(`TCP connection failed: ${error.message}`);
          reject(error);
        });

        socket.on('close', () => {
          console.log('[ConnectionManager] TCP closed');
          if (this.connectionState === 'connected') {
            this.updateState('disconnected');
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect via UDP
   */
  private async connectUDP(config: ConnectionConfig): Promise<boolean> {
    const UdpSocket = getUdpSocket();
    
    if (!UdpSocket) {
      throw new Error('UDP not supported in this environment');
    }

    return new Promise((resolve, reject) => {
      try {
        const socket = UdpSocket.createSocket('udp4');

        socket.bind(config.port, (err: Error) => {
          if (err) {
            console.error('[ConnectionManager] UDP bind error:', err);
            this.handleError(`UDP bind failed: ${err.message}`);
            reject(err);
            return;
          }

          console.log('[ConnectionManager] UDP bound');
          this.activeConnection = socket;
          this.connectionType = 'udp';
          this.connectedAt = new Date();
          this.clearConnectionTimeout();
          this.updateState('connected');
          resolve(true);
        });

        socket.on('message', (data: Buffer) => {
          this.handleDataReceived(data.toString());
        });

        socket.on('error', (error: Error) => {
          console.error('[ConnectionManager] UDP error:', error);
          this.handleError(`UDP error: ${error.message}`);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle received data
   */
  private handleDataReceived(data: string): void {
    this.bytesReceived += data.length;
    
    // Buffer incomplete sentences
    this.dataBuffer += data;
    
    // Process complete sentences
    const sentences = this.extractCompleteSentences();
    sentences.forEach(sentence => {
      this.messagesReceived++;
      if (this.events.onDataReceived) {
        this.events.onDataReceived(sentence);
      }
    });
  }

  /**
   * Handle received binary data (NMEA 2000 PGN frames)
   */
  private async handleBinaryDataReceived(data: ArrayBuffer | Blob): Promise<void> {
    try {
      // Convert Blob to ArrayBuffer if needed
      let arrayBuffer: ArrayBuffer;
      if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer();
      } else {
        arrayBuffer = data;
      }

      this.bytesReceived += arrayBuffer.byteLength;

      // Parse binary NMEA 2000 frame
      const frame = this.parseBinaryFrame(arrayBuffer);
      if (frame) {
        this.messagesReceived++;
        
        console.log(`[ConnectionManager] 📦 Binary PGN ${frame.pgn} (0x${frame.pgn.toString(16).toUpperCase()})`);
        
        // Process binary frame directly (bypass text sentence parsing)
        if (this.events.onBinaryDataReceived) {
          this.events.onBinaryDataReceived(frame);
        }
      }
    } catch (error) {
      console.error('[ConnectionManager] Error processing binary data:', error);
    }
  }

  /**
   * Parse binary NMEA 2000 frame
   * Frame format: [CAN_ID(4 bytes BE), LENGTH(1 byte), DATA(0-8 bytes)]
   */
  private parseBinaryFrame(buffer: ArrayBuffer): BinaryPgnFrame | null {
    try {
      const view = new DataView(buffer);
      if (buffer.byteLength < 5) {
        console.warn('[ConnectionManager] Binary frame too short:', buffer.byteLength);
        return null;
      }

      // Extract CAN ID (29-bit, stored in 32-bit big-endian)
      const canId = view.getUint32(0, false); // Big-endian
      
      // Extract fields from CAN ID
      const priority = (canId >> 26) & 0x07;
      const dataPage = (canId >> 24) & 0x01;
      const pduFormat = (canId >> 16) & 0xFF;
      const pduSpecific = (canId >> 8) & 0xFF;
      const source = canId & 0xFF;
      
      // Reconstruct PGN from CAN ID
      const pgn = (dataPage << 16) | (pduFormat << 8) | pduSpecific;
      
      // Extract data length and payload
      const dataLength = view.getUint8(4);
      if (buffer.byteLength < 5 + dataLength) {
        console.warn('[ConnectionManager] Binary frame data truncated');
        return null;
      }
      
      const data = new Uint8Array(buffer, 5, dataLength);
      
      return { pgn, source, priority, data };
    } catch (error) {
      console.error('[ConnectionManager] Error parsing binary frame:', error);
      return null;
    }
  }

  /**
   * Extract complete NMEA sentences from buffer
   */
  private extractCompleteSentences(): string[] {
    const sentences: string[] = [];
    const lines = this.dataBuffer.split('\n');
    
    // Process all complete lines (all but the last)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line && (line.startsWith('$') || line.startsWith('!'))) {
        sentences.push(line);
      }
    }
    
    // Keep the last incomplete line in buffer
    this.dataBuffer = lines[lines.length - 1];
    
    return sentences;
  }

  /**
   * Update connection state
   */
  private updateState(newState: ConnectionState, error?: string): void {
    this.connectionState = newState;
    
    const status: ConnectionStatus = {
      state: newState,
      config: this.currentConfig,
      connectedAt: this.connectedAt || undefined,
      lastError: error,
      bytesReceived: this.bytesReceived,
      messagesReceived: this.messagesReceived
    };

    if (this.events.onStateChange) {
      this.events.onStateChange(status);
    }
  }

  /**
   * Handle connection errors
   */
  private handleError(errorMessage: string): void {
    console.error('[ConnectionManager] Error:', errorMessage);
    this.updateState('error', errorMessage);
    
    if (this.events.onError) {
      this.events.onError(errorMessage);
    }
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}