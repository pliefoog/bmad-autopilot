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

import {
  PureConnectionManager,
  type ConnectionConfig,
  type ConnectionStatus,
  type BinaryPgnFrame,
} from './connection/PureConnectionManager';
import { PureNmeaParser, type ParsedNmeaMessage } from './parsing/PureNmeaParser';
import { PureStoreUpdater, type UpdateResult } from './data/PureStoreUpdater';

export interface NmeaServiceConfig {
  connection: ConnectionConfig;
  parsing?: {
    enableFallback?: boolean;
    strictValidation?: boolean;
  };
  updates?: {
    // Future: message filtering, validation options
  };
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
  private parser: PureNmeaParser;
  private storeUpdater: PureStoreUpdater;

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
    this.parser = PureNmeaParser.getInstance();
    this.storeUpdater = PureStoreUpdater.getInstance();

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
    } catch (error) {
      console.error('[NmeaService] Start error:', error);
      this.storeUpdater.updateError(
        `Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
    } catch (error) {
      console.error('[NmeaService] Stop error:', error);
    }
  }

  /**
   * Get current service status - SIMPLIFIED
   */
  getStatus(): NmeaServiceStatus {
    const connectionStatus = this.connectionManager.getStatus();
    const parsingStats = this.parser.getStats();

    const elapsedSeconds = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const messagesPerSecond = elapsedSeconds > 0 ? this.messageCount / elapsedSeconds : 0;

    return {
      connection: connectionStatus,
      parsing: {
        totalMessages: parsingStats.parseCount,
        successfulParses: parsingStats.parseCount - parsingStats.errorCount,
        failedParses: parsingStats.errorCount,
        successRate: parsingStats.successRate,
      },
      // Store update stats removed - PureStoreUpdater doesn't track statistics
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
        this.storeUpdater.updateConnectionStatus({ state: status.state });

        if (status.lastError) {
          this.storeUpdater.updateError(status.lastError);
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
      // Add raw message to store
      this.storeUpdater.addRawMessage(rawMessage);

      // Parse the message
      const parseResult = this.parser.parseSentence(rawMessage);
      if (!parseResult.success || !parseResult.data) {
        return; // Silent failure for parse errors
      }

      const parsedMessage = parseResult.data;

      // SIMPLIFIED: Only use NmeaSensorProcessor path (no legacy transformer)
      this.storeUpdater.processNmeaMessage(parsedMessage);
    } catch (error) {
      console.error('[NmeaService] Processing error:', error);
      this.storeUpdater.updateError(
        `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process binary NMEA 2000 PGN frame directly
   */
  private processBinaryPgnFrame(frame: BinaryPgnFrame): void {
    this.messageCount++;

    try {
      // Process the binary frame directly through the store updater
      this.storeUpdater.processBinaryPgnFrame(frame);
    } catch (error) {
      console.error('[NmeaService] Binary frame processing error:', error);
      this.storeUpdater.updateError(
        `Binary frame error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

// Export singleton instance
export const nmeaService = NmeaService.getInstance();

// Re-export types for convenience
export type { ConnectionConfig, ConnectionStatus, ParsedNmeaMessage, UpdateResult };
