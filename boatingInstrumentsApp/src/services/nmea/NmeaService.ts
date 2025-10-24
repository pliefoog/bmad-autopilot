/**
 * NMEA Service Orchestrator
 * 
 * Composes all NMEA processing components into a clean, unified API.
 * Handles the complete NMEA pipeline from connection to store updates.
 * 
 * Key Principles:
 * - Clean composition of modular components
 * - Single entry point for NMEA operations
 * - Comprehensive error handling and recovery
 * - Performance monitoring and statistics
 */

import { PureConnectionManager, type ConnectionConfig, type ConnectionStatus } from './connection/PureConnectionManager';
import { PureNmeaParser, type ParsedNmeaMessage } from './parsing/PureNmeaParser';
import { PureDataTransformer, type TransformedNmeaData } from './data/PureDataTransformer';
import { PureStoreUpdater, type UpdateResult } from './data/PureStoreUpdater';

export interface NmeaServiceConfig {
  connection: ConnectionConfig;
  parsing?: {
    enableFallback?: boolean;
    strictValidation?: boolean;
  };
  updates?: {
    throttleMs?: number;
    enableBatching?: boolean;
    skipThrottling?: boolean;
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
  updates: {
    totalUpdates: number;
    throttledUpdates: number;
    batchedUpdates: number;
    throttleRate: number;
  };
  performance: {
    messagesPerSecond: number;
    averageProcessingTimeMs: number;
  };
}

export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  processingTimeMs: number;
  messageType: string;
  success: boolean;
}

export class NmeaService {
  private static instance: NmeaService;
  
  // Component instances
  private connectionManager: PureConnectionManager;
  private parser: PureNmeaParser;
  private transformer: PureDataTransformer;
  private storeUpdater: PureStoreUpdater;
  
  // Service state
  private isRunning = false;
  private currentConfig: NmeaServiceConfig | null = null;
  
  // Performance tracking
  private processingMetrics: ProcessingMetrics[] = [];
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
    this.transformer = PureDataTransformer.getInstance();
    this.storeUpdater = PureStoreUpdater.getInstance();
    
    this.setupConnectionEvents();
  }

  /**
   * Start NMEA service with configuration
   */
  async start(config: NmeaServiceConfig): Promise<boolean> {
    console.log('[NmeaService] Starting with config:', config);
    
    if (this.isRunning) {
      console.log('[NmeaService] Already running, stopping first...');
      await this.stop();
    }

    this.currentConfig = config;
    this.startTime = Date.now();
    this.resetMetrics();

    try {
      const connected = await this.connectionManager.connect(config.connection);
      if (connected) {
        this.isRunning = true;
        console.log('[NmeaService] Started successfully');
        return true;
      } else {
        console.error('[NmeaService] Failed to connect');
        return false;
      }
    } catch (error) {
      console.error('[NmeaService] Start failed:', error);
      return false;
    }
  }

  /**
   * Stop NMEA service
   */
  async stop(): Promise<void> {
    console.log('[NmeaService] Stopping...');
    
    this.isRunning = false;
    this.connectionManager.disconnect();
    this.storeUpdater.flushBatch();
    
    console.log('[NmeaService] Stopped');
  }

  /**
   * Get current service status
   */
  getStatus(): NmeaServiceStatus {
    const connectionStatus = this.connectionManager.getStatus();
    const parsingStats = this.parser.getStats();
    const updateStats = this.storeUpdater.getStats();
    
    const elapsedSeconds = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const messagesPerSecond = elapsedSeconds > 0 ? this.messageCount / elapsedSeconds : 0;
    
    const avgProcessingTime = this.processingMetrics.length > 0
      ? this.processingMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / this.processingMetrics.length
      : 0;

    return {
      connection: connectionStatus,
      parsing: {
        totalMessages: parsingStats.parseCount,
        successfulParses: parsingStats.parseCount - parsingStats.errorCount,
        failedParses: parsingStats.errorCount,
        successRate: parsingStats.successRate
      },
      updates: {
        totalUpdates: updateStats.updateCount,
        throttledUpdates: updateStats.throttledCount,
        batchedUpdates: updateStats.batchedCount,
        throttleRate: updateStats.throttleRate
      },
      performance: {
        messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
        averageProcessingTimeMs: Math.round(avgProcessingTime * 100) / 100
      }
    };
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): NmeaServiceConfig | null {
    return this.currentConfig;
  }

  /**
   * Update configuration (restarts service)
   */
  async updateConfig(newConfig: NmeaServiceConfig): Promise<boolean> {
    console.log('[NmeaService] Updating configuration...');
    
    if (this.isRunning) {
      await this.stop();
    }
    
    return await this.start(newConfig);
  }

  /**
   * Get processing performance metrics
   */
  getPerformanceMetrics(): ProcessingMetrics[] {
    return [...this.processingMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.processingMetrics = [];
    this.messageCount = 0;
    this.parser.resetStats();
    this.storeUpdater.resetStats();
    this.connectionManager.resetStats();
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionEvents(): void {
    this.connectionManager.setEventHandlers({
      onStateChange: (status) => {
        console.log('[NmeaService] Connection state changed:', status.state);
        this.storeUpdater.updateConnectionStatus(status);
      },
      
      onDataReceived: (data) => {
        this.processNmeaMessage(data);
      },
      
      onError: (error) => {
        console.error('[NmeaService] Connection error:', error);
        this.storeUpdater.updateError(error);
      }
    });
  }

  /**
   * Process incoming NMEA message through the pipeline
   */
  private processNmeaMessage(rawMessage: string): void {
    const startTime = performance.now();
    this.messageCount++;
    
    let messageType = 'unknown';
    let success = false;

    try {
      // Add raw message to store
      this.storeUpdater.addRawMessage(rawMessage);

      // Parse the message
      const parseResult = this.parser.parseSentence(rawMessage);
      if (!parseResult.success || !parseResult.data) {
        console.debug('[NmeaService] Parse failed:', parseResult.errors);
        return;
      }

      const parsedMessage = parseResult.data;
      messageType = parsedMessage.messageType;

      // Transform to store format
      const transformResult = this.transformer.transformMessage(parsedMessage);
      if (!transformResult.success || !transformResult.data) {
        console.debug('[NmeaService] Transform failed:', transformResult.errors);
        return;
      }

      // Update store with throttling/batching based on config
      const updateOptions = this.currentConfig?.updates || {};
      const updateResult = this.storeUpdater.updateStore(transformResult.data, updateOptions);
      
      if (updateResult.updated) {
        success = true;
      } else if (updateResult.throttled) {
        // Throttling is normal, not an error
        success = true;
      }

    } catch (error) {
      console.error('[NmeaService] Processing error:', error);
      this.storeUpdater.updateError(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record performance metrics
    const endTime = performance.now();
    const processingTimeMs = endTime - startTime;
    
    this.recordMetrics({
      startTime,
      endTime,
      processingTimeMs,
      messageType,
      success
    });
  }

  /**
   * Record processing metrics
   */
  private recordMetrics(metrics: ProcessingMetrics): void {
    this.processingMetrics.push(metrics);
    
    // Keep only recent metrics (last 1000 messages)
    if (this.processingMetrics.length > 1000) {
      this.processingMetrics = this.processingMetrics.slice(-500);
    }
  }

  /**
   * Reset all metrics
   */
  private resetMetrics(): void {
    this.processingMetrics = [];
    this.messageCount = 0;
    this.parser.resetStats();
    this.storeUpdater.resetStats();
    this.connectionManager.resetStats();
  }

  /**
   * Get detailed diagnostic information
   */
  getDiagnostics(): {
    messageTypes: Record<string, number>;
    errorTypes: Record<string, number>;
    performance: {
      slowestMessage: ProcessingMetrics | null;
      fastestMessage: ProcessingMetrics | null;
      averageByType: Record<string, number>;
    };
  } {
    const messageTypes: Record<string, number> = {};
    const errorTypes: Record<string, number> = {};
    const performanceByType: Record<string, number[]> = {};

    let slowestMessage: ProcessingMetrics | null = null;
    let fastestMessage: ProcessingMetrics | null = null;

    for (const metric of this.processingMetrics) {
      // Count message types
      messageTypes[metric.messageType] = (messageTypes[metric.messageType] || 0) + 1;
      
      // Track performance by type
      if (!performanceByType[metric.messageType]) {
        performanceByType[metric.messageType] = [];
      }
      performanceByType[metric.messageType].push(metric.processingTimeMs);
      
      // Find slowest/fastest
      if (!slowestMessage || metric.processingTimeMs > slowestMessage.processingTimeMs) {
        slowestMessage = metric;
      }
      if (!fastestMessage || metric.processingTimeMs < fastestMessage.processingTimeMs) {
        fastestMessage = metric;
      }
      
      // Count errors
      if (!metric.success) {
        errorTypes[metric.messageType] = (errorTypes[metric.messageType] || 0) + 1;
      }
    }

    // Calculate averages by type
    const averageByType: Record<string, number> = {};
    for (const [type, times] of Object.entries(performanceByType)) {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      averageByType[type] = Math.round(average * 100) / 100;
    }

    return {
      messageTypes,
      errorTypes,
      performance: {
        slowestMessage,
        fastestMessage,
        averageByType
      }
    };
  }
}

// Export singleton instance
export const nmeaService = NmeaService.getInstance();

// Re-export types for convenience
export type { ConnectionConfig, ConnectionStatus, ParsedNmeaMessage, TransformedNmeaData, UpdateResult };