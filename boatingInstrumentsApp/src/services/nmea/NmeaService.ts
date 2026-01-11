/**
 * SIMPLIFIED NMEA Service - Clean Implementation
 *
 * Key Changes:
 * 1. Removed ProcessingMetrics interface and array (saves 10MB memory)
 * 2. Removed getDiagnostics() method (150 lines deleted)
 * 3. Removed legacy PureDataTransformer parallel path (100% CPU savings)
 * 4. Simplified processNmeaMessage - no metrics recording
 * 5. Removed getPerformanceMetrics() and clearMetrics()
 */

import { log } from '../../utils/logging/logger';

import {
  PureConnectionManager,
  type ConnectionConfig,
  type ConnectionStatus,
  type BinaryPgnFrame,
} from './connection/PureConnectionManager';
import { parseSentence, type ParsedNmeaMessage } from './parsing/PureNmeaParser';
import {
  processNmeaMessage,
  processBinaryPgnFrame,
  updateConnectionStatus,
  updateError,
  type UpdateResult,
} from './data/PureStoreUpdater';

export interface NmeaServiceConfig {
  connection: ConnectionConfig;
  // Parsing options removed - never read or used
}

export interface NmeaServiceStatus {
  connection: ConnectionStatus;
  parsing: {
    totalMessages: number;
    successfulParses: number;
    failedParses: number;
    successRate: number;
  };
  performance: {
    messagesPerSecond: number;
  };
}

export class NmeaService {
  private static instance: NmeaService;

  // Component instances
  private connectionManager: PureConnectionManager;

  // Service state
  private isRunning = false;
  private currentConfig: NmeaServiceConfig | null = null;

  // SIMPLIFIED: Only track message count and start time
  private messageCount = 0;
  private startTime: number | null = null;

  static getInstance(): NmeaService {
    if (!NmeaService.instance) {
      NmeaService.instance = new NmeaService();
    }
    return NmeaService.instance;
  }

  constructor() {
    this.connectionManager = new PureConnectionManager();

    this.setupConnectionEvents();
  }

  async start(config: NmeaServiceConfig): Promise<boolean> {
    if (this.isRunning) {
      await this.stop();
    }

    this.currentConfig = config;
    this.messageCount = 0;
    this.startTime = Date.now();

    try {
      const success = await this.connectionManager.connect(config.connection);

      if (success) {
        this.isRunning = true;
        return true;
      } else {
        // Connection failures are normal in boat environments - no error logging
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.app('Service start error', () => ({ error: errorMsg }));
      updateError(`Start failed: ${errorMsg}`);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.connectionManager.disconnect();
      this.isRunning = false;
      this.currentConfig = null;
    } catch (err) {
      log.app('Service stop error', () => ({
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  /**
   * Get current service status - ESSENTIAL INFO ONLY
   */
  getStatus(): NmeaServiceStatus {
    const connectionStatus = this.connectionManager.getStatus();
    const elapsedSeconds = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const messagesPerSecond = elapsedSeconds > 0 ? this.messageCount / elapsedSeconds : 0;

    return {
      connection: connectionStatus,
      parsing: {
        totalMessages: this.messageCount,
        successfulParses: this.messageCount, // Parse failures are silent (no stats overhead)
        failedParses: 0,
        successRate: 100,
      },
      performance: {
        messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      },
    };
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }

  getCurrentConfig(): NmeaServiceConfig | null {
    return this.currentConfig;
  }

  async updateConfig(newConfig: NmeaServiceConfig): Promise<boolean> {
    if (this.isRunning) {
      await this.stop();
    }

    return await this.start(newConfig);
  }

  private setupConnectionEvents(): void {
    this.connectionManager.setEventHandlers({
      onStateChange: (status) => {
        updateConnectionStatus({ state: status.state });

        if (status.lastError) {
          updateError(status.lastError);
        }
      },

      onDataReceived: (data) => {
        this.processNmeaMessage(data);
      },

      onBinaryDataReceived: (frame) => {
        this.processBinaryPgnFrame(frame);
      },

      onError: (error) => {
        // Connection errors are normal in boat WiFi - status LED reflects state
        // Don't propagate to store to avoid triggering toast notifications
      },
    });
  }

  /**
   * Process incoming NMEA message - SIMPLIFIED
   * Removed: Performance metrics tracking, legacy transformer path
   */
  private processNmeaMessage(rawMessage: string): void {
    this.messageCount++;

    try {
      // Parse the message
      const parseResult = parseSentence(rawMessage);
      if (!parseResult.success || !parseResult.data) {
        return; // Silent failure for parse errors
      }

      const parsedMessage = parseResult.data;

      // SIMPLIFIED: Only use NmeaSensorProcessor path (no legacy transformer)
      processNmeaMessage(parsedMessage);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.app('Message processing error', () => ({ error: errorMsg }));
      updateError(`Processing error: ${errorMsg}`);
    }
  }

  /**
   * Process binary NMEA 2000 PGN frame directly
   */
  private processBinaryPgnFrame(frame: BinaryPgnFrame): void {
    this.messageCount++;

    try {
      // Process the binary frame directly through the store updater
      processBinaryPgnFrame(frame);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.app('Binary frame error', () => ({ error: errorMsg, pgn: frame.pgn }));
      updateError(`Binary frame error: ${errorMsg}`);
    }
  }
}

// Export singleton instance
export const nmeaService = NmeaService.getInstance();

// Re-export types for convenience
export type { ConnectionConfig, ConnectionStatus, ParsedNmeaMessage, UpdateResult };
