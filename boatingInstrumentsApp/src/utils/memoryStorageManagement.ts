/**
 * Memory & Storage Management Optimization
 * 
 * Efficient memory patterns and storage management for extended marine operation.
 * Prevents memory leaks, manages log files, and monitors storage usage.
 * 
 * Key Principles:
 * - Memory leak prevention (cleanup subscriptions, timers, listeners)
 * - Log rotation (automatic cleanup of old logs)
 * - Data structure optimization (minimize allocations, reuse objects)
 * - Storage monitoring (track usage, alert when low)
 * - Efficient serialization (minimize storage footprint)
 * 
 * Marine-Specific Optimizations:
 * - Long-term data retention (voyage logs, recordings)
 * - Efficient historical data storage
 * - Automatic cleanup of temporary files
 * - Storage quota management for multi-day passages
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Memory management thresholds
 */
export const MEMORY_THRESHOLDS = {
  /** Warning threshold (MB) */
  WARNING: 150,
  
  /** Critical threshold (MB) */
  CRITICAL: 180,
  
  /** Maximum threshold (MB) */
  MAX: 200,
  
  /** Baseline target (MB) */
  BASELINE: 100,
} as const;

/**
 * Log rotation configuration
 */
export const LOG_CONFIG = {
  /** Maximum log file size (MB) */
  MAX_FILE_SIZE: 10,
  
  /** Maximum number of log files to keep */
  MAX_FILES: 5,
  
  /** Log retention period (days) */
  RETENTION_DAYS: 7,
  
  /** Auto-cleanup interval (hours) */
  CLEANUP_INTERVAL: 24,
} as const;

/**
 * Storage monitoring configuration
 */
export const STORAGE_CONFIG = {
  /** Warning threshold (% of total) */
  WARNING_PERCENT: 0.80, // 80%
  
  /** Critical threshold (% of total) */
  CRITICAL_PERCENT: 0.90, // 90%
  
  /** Minimum free space (MB) */
  MIN_FREE_SPACE: 100,
  
  /** Check interval (minutes) */
  CHECK_INTERVAL: 30,
} as const;

// ============================================================================
// Memory Leak Prevention
// ============================================================================

/**
 * Cleanup tracker to prevent memory leaks
 * 
 * Tracks subscriptions, timers, and listeners for automatic cleanup
 * Use in components that create long-lived subscriptions
 */
export class CleanupTracker {
  private cleanupFunctions: Array<() => void> = [];
  
  /**
   * Register cleanup function
   */
  add(cleanup: () => void): void {
    this.cleanupFunctions.push(cleanup);
  }
  
  /**
   * Register timer for cleanup
   */
  addTimer(timerId: NodeJS.Timeout): void {
    this.add(() => clearTimeout(timerId));
  }
  
  /**
   * Register interval for cleanup
   */
  addInterval(intervalId: NodeJS.Timeout): void {
    this.add(() => clearInterval(intervalId));
  }
  
  /**
   * Register animation frame for cleanup
   */
  addAnimationFrame(frameId: number): void {
    this.add(() => cancelAnimationFrame(frameId));
  }
  
  /**
   * Register event listener for cleanup
   */
  addEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener
  ): void {
    target.addEventListener(event, handler);
    this.add(() => target.removeEventListener(event, handler));
  }
  
  /**
   * Execute all cleanup functions
   */
  cleanup(): void {
    for (const cleanup of this.cleanupFunctions) {
      try {
        cleanup();
      } catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
      }
    }
    this.cleanupFunctions = [];
  }
  
  /**
   * Get number of tracked items
   */
  getTrackedCount(): number {
    return this.cleanupFunctions.length;
  }
}

/**
 * Hook for automatic cleanup tracking
 * 
 * Returns tracker that automatically cleans up on unmount
 * 
 * @returns Cleanup tracker instance
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const cleanup = useCleanupTracker();
 *   
 *   useEffect(() => {
 *     const timer = setInterval(() => {}, 1000);
 *     cleanup.addInterval(timer);
 *     
 *     const subscription = store.subscribe(() => {});
 *     cleanup.add(subscription);
 *   }, []);
 * }
 * ```
 */
export function useCleanupTracker(): CleanupTracker {
  const tracker = useRef(new CleanupTracker());
  
  useEffect(() => {
    return () => tracker.current.cleanup();
  }, []);
  
  return tracker.current;
}

// ============================================================================
// Log Rotation & Cleanup
// ============================================================================

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

/**
 * Log file manager with automatic rotation
 * 
 * Manages log files with size limits and automatic cleanup
 * Rotates logs when size exceeds threshold
 * Deletes old logs beyond retention period
 */
export class LogFileManager {
  private currentLogSize: number = 0;
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  /**
   * Add log entry
   */
  log(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Estimate size (rough approximation)
    this.currentLogSize += JSON.stringify(entry).length;
    
    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 5000);
    }
    
    // Check if rotation needed
    if (this.currentLogSize > LOG_CONFIG.MAX_FILE_SIZE * 1024 * 1024) {
      this.rotate();
    }
  }
  
  /**
   * Flush log buffer to storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const entries = [...this.logBuffer];
    this.logBuffer = [];
    
    // TODO: Write to AsyncStorage or File System
    // Platform-specific implementation needed
    
    if (__DEV__) {
      console.log(`[LogManager] Flushed ${entries.length} log entries`);
    }
    
    this.flushTimer = null;
  }
  
  /**
   * Rotate log file (create new, archive old)
   */
  private async rotate(): Promise<void> {
    await this.flush();
    
    // TODO: Rename current log file with timestamp
    // TODO: Check number of log files and delete oldest if > MAX_FILES
    
    this.currentLogSize = 0;
    
    if (__DEV__) {
      console.log('[LogManager] Log file rotated');
    }
  }
  
  /**
   * Clean up old log files beyond retention period
   */
  async cleanup(): Promise<void> {
    const cutoffTime = Date.now() - (LOG_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // TODO: List log files and delete those older than cutoff
    
    if (__DEV__) {
      console.log('[LogManager] Cleaned up old log files');
    }
  }
  
  /**
   * Force immediate flush
   */
  async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
  
  /**
   * Get log statistics
   */
  getStats() {
    return {
      currentLogSize: this.currentLogSize,
      bufferedEntries: this.logBuffer.length,
    };
  }
}

/**
 * Global log manager instance
 */
export const logManager = new LogFileManager();

/**
 * Schedule automatic log cleanup
 */
export function scheduleLogCleanup(): NodeJS.Timeout {
  const cleanup = async () => {
    await logManager.cleanup();
  };
  
  // Run cleanup every 24 hours
  const interval = setInterval(cleanup, LOG_CONFIG.CLEANUP_INTERVAL * 60 * 60 * 1000);
  
  // Run initial cleanup
  cleanup();
  
  return interval;
}

// ============================================================================
// Data Structure Optimization
// ============================================================================

/**
 * Ring buffer for efficient FIFO storage
 * 
 * Fixed-size circular buffer that overwrites old data
 * More memory-efficient than array push/shift
 * 
 * @example
 * ```ts
 * const buffer = new RingBuffer<number>(100);
 * buffer.push(1);
 * buffer.push(2);
 * const latest = buffer.getLast(); // 2
 * const all = buffer.toArray(); // [1, 2]
 * ```
 */
export class RingBuffer<T> {
  private buffer: T[];
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private size: number = 0;
  private readonly capacity: number;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }
  
  /**
   * Add item to buffer (overwrites oldest if full)
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Buffer full, advance read index
      this.readIndex = (this.readIndex + 1) % this.capacity;
    }
  }
  
  /**
   * Get most recent item
   */
  getLast(): T | undefined {
    if (this.size === 0) return undefined;
    const lastIndex = (this.writeIndex - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }
  
  /**
   * Get oldest item
   */
  getFirst(): T | undefined {
    if (this.size === 0) return undefined;
    return this.buffer[this.readIndex];
  }
  
  /**
   * Get item at index (0 = oldest)
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.size) return undefined;
    const actualIndex = (this.readIndex + index) % this.capacity;
    return this.buffer[actualIndex];
  }
  
  /**
   * Convert to array (oldest to newest)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i)!);
    }
    return result;
  }
  
  /**
   * Clear buffer
   */
  clear(): void {
    this.size = 0;
    this.readIndex = 0;
    this.writeIndex = 0;
  }
  
  /**
   * Get current size
   */
  getSize(): number {
    return this.size;
  }
  
  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }
}

/**
 * Efficient time-series data storage with automatic decimation
 * 
 * Stores high-resolution recent data, automatically reduces resolution for older data
 * Useful for storing sensor data (NMEA history) without unbounded growth
 */
export class TimeSeriesBuffer<T> {
  private recentData: RingBuffer<{ timestamp: number; value: T }>;
  private oldData: RingBuffer<{ timestamp: number; value: T }>;
  private decimationFactor: number;
  private recentThresholdMs: number;
  
  constructor(
    recentCapacity: number,
    oldCapacity: number,
    recentThresholdMs: number = 60000, // 1 minute
    decimationFactor: number = 10
  ) {
    this.recentData = new RingBuffer(recentCapacity);
    this.oldData = new RingBuffer(oldCapacity);
    this.recentThresholdMs = recentThresholdMs;
    this.decimationFactor = decimationFactor;
  }
  
  /**
   * Add data point
   */
  add(value: T, timestamp: number = Date.now()): void {
    this.recentData.push({ timestamp, value });
    
    // Check if we need to move old data
    this.decimateOldData();
  }
  
  /**
   * Move old data to decimated storage
   */
  private decimateOldData(): void {
    const now = Date.now();
    const first = this.recentData.getFirst();
    
    if (!first || now - first.timestamp < this.recentThresholdMs) {
      return; // Data not old enough yet
    }
    
    // Move every Nth point to old storage
    const recentArray = this.recentData.toArray();
    for (let i = 0; i < recentArray.length; i += this.decimationFactor) {
      const point = recentArray[i];
      if (now - point.timestamp >= this.recentThresholdMs) {
        this.oldData.push(point);
      }
    }
    
    // Remove old data from recent buffer
    this.recentData.clear();
  }
  
  /**
   * Get all data points (recent + old)
   */
  getAll(): Array<{ timestamp: number; value: T }> {
    return [...this.oldData.toArray(), ...this.recentData.toArray()];
  }
  
  /**
   * Get data in time range
   */
  getRange(startTime: number, endTime: number): Array<{ timestamp: number; value: T }> {
    return this.getAll().filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    );
  }
  
  /**
   * Get most recent value
   */
  getLatest(): T | undefined {
    return this.recentData.getLast()?.value;
  }
  
  /**
   * Get storage statistics
   */
  getStats() {
    return {
      recentCount: this.recentData.getSize(),
      oldCount: this.oldData.getSize(),
      totalCount: this.recentData.getSize() + this.oldData.getSize(),
    };
  }
}

// ============================================================================
// Storage Monitoring
// ============================================================================

/**
 * Storage usage information
 */
export interface StorageInfo {
  /** Total storage capacity (bytes) */
  total: number;
  
  /** Used storage (bytes) */
  used: number;
  
  /** Free storage (bytes) */
  free: number;
  
  /** Usage percentage (0.0 - 1.0) */
  usagePercent: number;
  
  /** Is storage usage critical */
  isCritical: boolean;
  
  /** Is storage usage at warning level */
  isWarning: boolean;
}

/**
 * Storage monitoring service
 * 
 * Tracks storage usage and alerts when low
 * Provides cleanup recommendations
 */
export class StorageMonitor {
  private storageInfo: StorageInfo | null = null;
  private listeners: Array<(info: StorageInfo) => void> = [];
  
  /**
   * Check storage usage
   */
  async checkStorage(): Promise<StorageInfo> {
    // TODO: Integrate with platform-specific storage APIs
    // iOS: Use react-native-fs to get document directory size
    // Android: StatFs for storage information
    // Web: navigator.storage.estimate()
    
    // Mock implementation
    const mockInfo: StorageInfo = {
      total: 1000 * 1024 * 1024, // 1GB
      used: 500 * 1024 * 1024,   // 500MB
      free: 500 * 1024 * 1024,   // 500MB
      usagePercent: 0.5,
      isCritical: false,
      isWarning: false,
    };
    
    mockInfo.isCritical = mockInfo.usagePercent >= STORAGE_CONFIG.CRITICAL_PERCENT;
    mockInfo.isWarning = mockInfo.usagePercent >= STORAGE_CONFIG.WARNING_PERCENT;
    
    this.storageInfo = mockInfo;
    this.notifyListeners(mockInfo);
    
    return mockInfo;
  }
  
  /**
   * Subscribe to storage updates
   */
  subscribe(listener: (info: StorageInfo) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all listeners of storage update
   */
  private notifyListeners(info: StorageInfo): void {
    for (const listener of this.listeners) {
      try {
        listener(info);
      } catch (error) {
        console.error('[StorageMonitor] Error in listener:', error);
      }
    }
  }
  
  /**
   * Get current storage info (cached)
   */
  getStorageInfo(): StorageInfo | null {
    return this.storageInfo;
  }
  
  /**
   * Get cleanup recommendations
   */
  getCleanupRecommendations(): string[] {
    if (!this.storageInfo) return [];
    
    const recommendations: string[] = [];
    
    if (this.storageInfo.isCritical) {
      recommendations.push('Delete old log files');
      recommendations.push('Remove old voyage recordings');
      recommendations.push('Clear cached map tiles');
    } else if (this.storageInfo.isWarning) {
      recommendations.push('Consider removing old logs');
      recommendations.push('Archive completed voyages to external storage');
    }
    
    return recommendations;
  }
}

/**
 * Global storage monitor instance
 */
export const storageMonitor = new StorageMonitor();

/**
 * Schedule automatic storage monitoring
 */
export function scheduleStorageMonitoring(): NodeJS.Timeout {
  const check = async () => {
    const info = await storageMonitor.checkStorage();
    
    if (info.isCritical) {
      console.error(
        `[Storage] Critical storage usage: ${(info.usagePercent * 100).toFixed(1)}%`
      );
    } else if (info.isWarning) {
      console.warn(
        `[Storage] High storage usage: ${(info.usagePercent * 100).toFixed(1)}%`
      );
    }
  };
  
  // Check every 30 minutes
  const interval = setInterval(check, STORAGE_CONFIG.CHECK_INTERVAL * 60 * 1000);
  
  // Run initial check
  check();
  
  return interval;
}

/**
 * Hook for storage monitoring
 * 
 * @returns Current storage information
 * 
 * @example
 * ```tsx
 * function StorageIndicator() {
 *   const storage = useStorageMonitor();
 *   
 *   if (!storage) return null;
 *   
 *   return (
 *     <View>
 *       <Text>Storage: {(storage.usagePercent * 100).toFixed(0)}%</Text>
 *       {storage.isWarning && <Text>⚠️ Storage running low</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useStorageMonitor(): StorageInfo | null {
  const [storageInfo, setStorageInfo] = React.useState<StorageInfo | null>(null);
  
  useEffect(() => {
    // Initial check
    storageMonitor.checkStorage().then(setStorageInfo);
    
    // Subscribe to updates
    const unsubscribe = storageMonitor.subscribe(setStorageInfo);
    
    return unsubscribe;
  }, []);
  
  return storageInfo;
}

// Import React for hooks
import React from 'react';
