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

import { Platform } from 'react-native';

// Platform-specific imports - TCP/UDP don't work in Expo Go or web
let TcpSocket: any = null;
let UdpSocket: any = null;

// Only load native socket modules if not on web
if (Platform.OS !== 'web') {
  try {
    TcpSocket = require('react-native-tcp-socket');
    UdpSocket = require('react-native-udp');
  } catch (error) {
    console.warn('[ConnectionManager] Native socket modules not available. TCP/UDP connections disabled.');
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

export interface ConnectionEvents {
  onStateChange: (status: ConnectionStatus) => void;
  onDataReceived: (data: string) => void;
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
      switch (config.protocol) {
        case 'websocket':
          return await this.connectWebSocket(config);
        case 'tcp':
          return await this.connectTCP(config);
        case 'udp':
          return await this.connectUDP(config);
        default:
          throw new Error(`Unsupported protocol: ${config.protocol}`);
      }
    } catch (error) {
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
          this.handleDataReceived(event.data);
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
    if (!TcpSocket) {
      throw new Error('TCP not supported in this environment');
    }

    return new Promise((resolve, reject) => {
      try {
        const socket = TcpSocket.createConnection({
          port: config.port,
          host: config.ip,
          timeout: this.CONNECTION_TIMEOUT
        });

        socket.on('connect', () => {
          console.log('[ConnectionManager] TCP connected');
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