/**
 * Unified NMEA Connection Manager
 * Single parametrized connection handler for WebSocket, TCP, and UDP
 * Handles connection state transitions and data flow detection
 */

import { Platform } from 'react-native';
import { parseNmeaSentence } from 'nmea-simple';
import { nmeaParser } from './nmea/nmeaParser';
import { useNmeaStore } from '../core/nmeaStore';
import { FromPgn } from '@canboat/canboatjs';

// Platform-specific imports - TCP/UDP don't work in Expo Go or web
let TcpSocket: any = null;
let UdpSocket: any = null;

// Only load native socket modules if not on web
// Note: These will be null in Expo Go even on native platforms
if (Platform.OS !== 'web') {
  try {
    TcpSocket = require('react-native-tcp-socket');
    UdpSocket = require('react-native-udp');
  } catch (error) {
    console.warn('[Connection] Native socket modules not available. TCP/UDP connections disabled.');
  }
}

export interface NmeaConnectionConfig {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'receiving_data';

export interface ConnectionStatus {
  state: ConnectionState;
  hasDataFlow: boolean;
  lastDataReceived?: Date;
  currentConfig: NmeaConnectionConfig | null;
  errorMessage?: string;
}

export class UnifiedConnectionManager {
  // Single connection handler - only one active at a time
  private activeConnection: any = null;
  private connectionType: 'tcp' | 'udp' | 'websocket' | null = null;
  
  // Timers
  private connectionTimeout: any = null;
  private dataFlowTimeout: any = null;
  
  // Current state
  private currentConfig: NmeaConnectionConfig | null = null;
  private connectionStatus: ConnectionStatus = {
    state: 'disconnected',
    hasDataFlow: false,
    currentConfig: null
  };
  private lastDataTime: Date | null = null;
  
  // Store bindings
  private setConnectionStatus = useNmeaStore.getState().setConnectionStatus;
  private setNmeaData = useNmeaStore.getState().setNmeaData;
  private setLastError = useNmeaStore.getState().setLastError;
  private addRawSentence = useNmeaStore.getState().addRawSentence;
  
  // Data processing throttling
  private lastUpdateTimes: Map<string, number> = new Map();
  private readonly THROTTLE_INTERVAL = 1000; // 1 second
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly DATA_FLOW_TIMEOUT = 30000; // 30 seconds to detect no data flow

  // Sentence buffering for handling incomplete packets
  private sentenceBuffer: string = '';

  constructor() {
    // Start with clean state
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Connect with configuration - the main entry point
   * Returns true if connection attempt started, false if no change needed
   */
  async connect(config: NmeaConnectionConfig): Promise<boolean> {
    console.log(`[Connection] Connect requested: ${config.protocol}://${config.ip}:${config.port}`);
    
    // Check if configuration has changed
    if (!this.hasConfigChanged(config)) {
      console.log('[Connection] Same configuration, no action needed');
      return false; // No change needed
    }

    // Clean disconnect any existing connection
    this.disconnect();
    
    // Update configuration and start connecting
    this.currentConfig = { ...config };
    this.connectionStatus.currentConfig = { ...config };
    this.updateStatus('connecting');
    
    try {
      await this.establishConnection(config);
      return true;
    } catch (error) {
      console.error('[Connection] Failed to establish connection:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Disconnect current connection
   */
  disconnect(): void {
    console.log('[Connection] Disconnecting...');
    
    // Clear all timers
    this.clearTimers();
    
    // Close active connection
    if (this.activeConnection) {
      try {
        if (this.connectionType === 'websocket') {
          this.activeConnection.close();
        } else if (this.connectionType === 'tcp') {
          this.activeConnection.destroy();
        } else if (this.connectionType === 'udp') {
          this.activeConnection.close();
        }
      } catch (error) {
        console.warn('[Connection] Error during disconnect:', error);
      }
      
      this.activeConnection = null;
      this.connectionType = null;
    }

    // Clear sentence buffer
    this.sentenceBuffer = '';

    // Reset state
    this.updateStatus('disconnected');
    this.lastDataTime = null;
  }

  /**
   * Check if the connection is effectively the same
   */
  private hasConfigChanged(newConfig: NmeaConnectionConfig): boolean {
    if (!this.currentConfig) return true;
    
    return (
      this.currentConfig.ip !== newConfig.ip ||
      this.currentConfig.port !== newConfig.port ||
      this.currentConfig.protocol !== newConfig.protocol
    );
  }

  /**
   * Establish connection based on protocol
   */
  private async establishConnection(config: NmeaConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        const error = `Failed to connect. Check connection settings.`;
        reject(new Error(error));
      }, this.CONNECTION_TIMEOUT);

      // Create connection based on protocol
      switch (config.protocol) {
        case 'websocket':
          this.createWebSocketConnection(config, resolve, reject);
          break;
        case 'tcp':
          this.createTcpConnection(config, resolve, reject);
          break;
        case 'udp':
          this.createUdpConnection(config, resolve, reject);
          break;
        default:
          reject(new Error(`Unsupported protocol: ${config.protocol}`));
      }
    });
  }

  /**
   * Create WebSocket connection
   */
  private createWebSocketConnection(
    config: NmeaConnectionConfig, 
    resolve: (value?: any) => void, 
    reject: (reason?: any) => void
  ): void {
    const wsUrl = `ws://${config.ip}:${config.port}`;
    console.log('[Connection] Creating WebSocket connection to:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      this.activeConnection = ws;
      this.connectionType = 'websocket';
      
      ws.onopen = () => {
        console.log('[Connection] WebSocket connected');
        this.clearConnectionTimeout();
        this.updateStatus('connected');
        this.startDataFlowMonitoring();
        resolve();
      };
      
      ws.onmessage = (event: MessageEvent) => {
        this.handleIncomingData(event.data);
      };
      
      ws.onerror = (error: Event) => {
        console.error('[Connection] WebSocket error:', error);
        const errorMsg = `WebSocket connection failed to ${config.ip}:${config.port}`;
        reject(new Error(errorMsg));
      };
      
      ws.onclose = () => {
        console.log('[Connection] WebSocket closed');
        this.handleConnectionLost();
      };
      
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Create TCP connection
   */
  private createTcpConnection(
    config: NmeaConnectionConfig,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
  ): void {
    console.log('[Connection] Creating TCP connection to:', `${config.ip}:${config.port}`);

    // Check if TCP is available
    if (!TcpSocket) {
      const message = Platform.OS === 'web'
        ? 'TCP connections are not supported on web. Please use WebSocket instead.'
        : 'TCP connections require a development build. Expo Go does not support native TCP sockets. Please use WebSocket instead.';
      reject(new Error(message));
      return;
    }

    try {
      const socket = TcpSocket.createConnection({
        port: config.port,
        host: config.ip,
      }, () => {
        console.log('[Connection] TCP connection established');
      });
      
      this.activeConnection = socket;
      this.connectionType = 'tcp';
      
      socket.on('connect', () => {
        console.log('[Connection] TCP connected');
        this.clearConnectionTimeout();
        this.updateStatus('connected');
        this.startDataFlowMonitoring();
        resolve();
      });
      
      socket.on('data', (data: any) => {
        this.handleIncomingData(data);
      });
      
      socket.on('error', (error: any) => {
        console.error('[Connection] TCP error:', error);
        reject(error);
      });
      
      socket.on('close', () => {
        console.log('[Connection] TCP connection closed');
        this.handleConnectionLost();
      });
      
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Create UDP connection
   */
  private createUdpConnection(
    config: NmeaConnectionConfig,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
  ): void {
    console.log('[Connection] Creating UDP connection on port:', config.port);

    // Check if UDP is available
    if (!UdpSocket) {
      const message = Platform.OS === 'web'
        ? 'UDP connections are not supported on web. Please use WebSocket instead.'
        : 'UDP connections require a development build. Expo Go does not support native UDP sockets. Please use WebSocket instead.';
      reject(new Error(message));
      return;
    }

    try {
      const socket = UdpSocket.createSocket({ type: 'udp4' });
      this.activeConnection = socket;
      this.connectionType = 'udp';
      
      socket.bind(config.port, () => {
        console.log('[Connection] UDP bound to port', config.port);
        this.clearConnectionTimeout();
        this.updateStatus('connected');
        this.startDataFlowMonitoring();
        resolve();
      });
      
      socket.on('message', (data: any) => {
        this.handleIncomingData(data);
      });
      
      socket.on('error', (error: any) => {
        console.error('[Connection] UDP error:', error);
        reject(error);
      });
      
      socket.on('close', () => {
        console.log('[Connection] UDP connection closed');
        this.handleConnectionLost();
      });
      
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Handle incoming data from any connection type
   */
  private handleIncomingData(data: any): void {
    this.lastDataTime = new Date();
    
    // Update to receiving_data state if we're just connected
    if (this.connectionStatus.state === 'connected') {
      this.updateStatus('receiving_data');
    }
    
    // Reset data flow timeout
    this.resetDataFlowTimeout();
    
    // Process the data
    this.processNmeaData(data);
  }

  /**
   * Process NMEA data (unified for all connection types)
   * Handles buffering for incomplete sentences that may arrive in separate TCP packets
   */
  private processNmeaData(data: any): void {
    try {
      let rawData = '';

      // Normalize data to string
      if (typeof data === 'string') {
        rawData = data;
      } else if (data?.toString) {
        rawData = data.toString();
      } else if (data?.msg) {
        rawData = data.msg.toString();
      } else {
        console.warn('[Connection] Received data in unexpected format:', typeof data);
        return;
      }

      // Add new data to buffer
      this.sentenceBuffer += rawData;

      // Process complete sentences (those ending with newline or CR/LF)
      // Keep incomplete sentence in buffer for next packet
      const lines = this.sentenceBuffer.split(/\r?\n/);

      // Last element might be incomplete sentence - keep it in buffer
      this.sentenceBuffer = lines.pop() || '';

      // Process all complete sentences
      for (const sentence of lines) {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence) {
          this.processSingleSentence(trimmedSentence);
        }
      }

      // Prevent buffer overflow from malformed data
      // If buffer exceeds reasonable size without newline, clear it
      if (this.sentenceBuffer.length > 500) {
        console.warn('[Connection] Sentence buffer overflow, clearing:', this.sentenceBuffer.substring(0, 50));
        this.sentenceBuffer = '';
      }

    } catch (error) {
      console.error('[Connection] Error processing NMEA data:', error);
    }
  }

  /**
   * Process a single NMEA sentence
   */
  private processSingleSentence(sentence: string): void {
    try {
      // Add to raw sentence log
      this.addRawSentence(sentence);

      // Parse using custom parser with extended sentence support
      const parsed = nmeaParser.parseNmeaSentence(sentence);
      if (parsed && parsed.valid) {
        this.updateNmeaStore(parsed);
      } else if (parsed && !parsed.valid) {
        // Try fallback to nmea-simple for compatibility
        try {
          const fallbackParsed = parseNmeaSentence(sentence);
          if (fallbackParsed) {
            this.updateNmeaStore(fallbackParsed);
          }
        } catch {
          // Both parsers failed - only log at debug level
          console.debug('[Connection] Failed to parse NMEA sentence:', sentence);
        }
      }

    } catch (error) {
      // Don't log parse errors for every sentence - too noisy
      if (sentence.startsWith('$') || sentence.startsWith('!')) {
        console.debug('[Connection] Failed to parse NMEA sentence:', sentence);
      }
    }
  }

  /**
   * Update NMEA store with parsed data (with throttling)
   */
  private updateNmeaStore(parsed: any): void {
    // Implement throttling logic here
    const now = Date.now();
    const key = parsed.sentenceId || 'unknown';
    
    const lastUpdate = this.lastUpdateTimes.get(key) || 0;
    if (now - lastUpdate >= this.THROTTLE_INTERVAL) {
      this.lastUpdateTimes.set(key, now);
      
      // Update the store
      const currentData = useNmeaStore.getState().nmeaData;
      const updatedData = { ...currentData };
      
      // Process different sentence types
      // (This would contain the existing NMEA parsing logic)
      // TODO: Implement proper NMEA data processing based on sentence types
      // For now, just trigger store update to indicate data is flowing
      if (parsed) {
        // Data is being received and parsed successfully
        // The actual data processing will be handled by existing logic
      }
      
      this.setNmeaData(updatedData);
    }
  }

  /**
   * Start monitoring for data flow
   */
  private startDataFlowMonitoring(): void {
    this.resetDataFlowTimeout();
  }

  /**
   * Reset the data flow timeout
   */
  private resetDataFlowTimeout(): void {
    if (this.dataFlowTimeout) {
      clearTimeout(this.dataFlowTimeout);
    }
    
    this.dataFlowTimeout = setTimeout(() => {
      console.warn('[Connection] No data received for 30 seconds');
      // Could transition back to 'connected' state here if desired
      this.connectionStatus.hasDataFlow = false;
      this.updateLegacyStore();
    }, this.DATA_FLOW_TIMEOUT);
  }

  /**
   * Handle connection lost
   */
  private handleConnectionLost(): void {
    console.log('[Connection] Connection lost');
    this.updateStatus('disconnected');
    this.activeConnection = null;
    this.connectionType = null;
  }

  /**
   * Handle connection errors
   */
  private handleError(error: any): void {
    let errorMessage = 'Failed to connect. Check connection settings.';
    
    if (error?.message) {
      // Check if it's already a user-friendly message
      if (error.message.includes('Failed to connect') || error.message.includes('Check connection settings')) {
        errorMessage = error.message;
      } else {
        // Convert technical messages to user-friendly ones
        errorMessage = 'Failed to connect. Check connection settings.';
      }
    } else if (error?.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
        case 'ETIMEDOUT':
          errorMessage = 'Failed to connect. Check connection settings.';
          break;
        default:
          errorMessage = 'Failed to connect. Check connection settings.';
      }
    }
    
    // Log technical details for debugging but show user-friendly message
    console.error('[Connection] Technical error:', error);
    console.error('[Connection] User message:', errorMessage);
    this.connectionStatus.errorMessage = errorMessage;
    this.updateStatus('disconnected', errorMessage);
  }

  /**
   * Update connection status
   */
  private updateStatus(state: ConnectionState, errorMessage?: string): void {
    this.connectionStatus.state = state;
    this.connectionStatus.hasDataFlow = (state === 'receiving_data');
    
    if (errorMessage) {
      this.connectionStatus.errorMessage = errorMessage;
    } else if (state === 'connected' || state === 'receiving_data') {
      this.connectionStatus.errorMessage = undefined;
    }
    
    this.updateLegacyStore();
  }

  /**
   * Update legacy store for compatibility
   */
  private updateLegacyStore(): void {
    // Map new states to legacy states
    const legacyStatus = this.connectionStatus.state === 'disconnected' ? 'disconnected' :
                        this.connectionStatus.state === 'connecting' ? 'connecting' : 'connected';
    
    this.setConnectionStatus(legacyStatus);
    
    if (this.connectionStatus.errorMessage) {
      this.setLastError(this.connectionStatus.errorMessage);
    } else if (this.connectionStatus.state === 'connected' || this.connectionStatus.state === 'receiving_data') {
      this.setLastError(undefined);
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

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearConnectionTimeout();
    
    if (this.dataFlowTimeout) {
      clearTimeout(this.dataFlowTimeout);
      this.dataFlowTimeout = null;
    }
  }

  /**
   * Check if connection parameters are the same as current
   * Used to determine if Connect button should be enabled
   */
  isConfigSameAsCurrent(config: NmeaConnectionConfig): boolean {
    return !this.hasConfigChanged(config);
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus.state === 'connected' || this.connectionStatus.state === 'receiving_data';
  }

  /**
   * Check if receiving data
   */
  isReceivingData(): boolean {
    return this.connectionStatus.state === 'receiving_data';
  }
}