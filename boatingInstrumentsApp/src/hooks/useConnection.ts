// useConnection Hook
// Custom hook for connection management, health monitoring, and network diagnostics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConnectionStore } from '../store/connectionStore';
import type { ConnectionConfig as StoreConnectionConfig, ConnectionMetrics as StoreConnectionMetrics } from '../store/connectionStore';
import type { 
  ConnectionStatus, 
  ConnectionHealth, 
  ConnectionDiagnostics
} from '../types';

export interface UseConnectionOptions {
  // Auto-connection settings
  autoConnect?: boolean;
  autoReconnect?: boolean;
  
  // Health monitoring
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
  
  // Performance monitoring
  enablePerformanceMonitoring?: boolean;
  performanceInterval?: number;
  
  // Notifications
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
  onHealthChange?: (health: ConnectionHealth) => void;
  
  // Retry configuration
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export interface UseConnectionReturn {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  config: StoreConnectionConfig;
  
  // Connection metrics
  metrics: StoreConnectionMetrics;
  uptime: number;
  packetLossRate: number;
  throughput: number;
  
  // Health monitoring
  health?: ConnectionHealth;
  healthScore: number;
  healthStatus: 'excellent' | 'good' | 'poor' | 'critical' | 'unknown';
  
  // Error information
  lastError?: string;
  errorHistory: string[];
  hasErrors: boolean;
  
  // Connection control
  connect: (config?: Partial<StoreConnectionConfig>) => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  
  // Configuration
  updateConfig: (config: Partial<StoreConnectionConfig>) => void;
  resetConfig: () => void;
  
  // Diagnostics
  runDiagnostics: () => Promise<ConnectionDiagnostics>;
  getConnectionInfo: () => string;
  
  // Metrics and monitoring
  resetMetrics: () => void;
  getPerformanceReport: () => {
    averageLatency: number;
    peakThroughput: number;
    stabilityScore: number;
    reliabilityScore: number;
  };
  
  // Utilities
  refresh: () => void;
  clearErrors: () => void;
}

export function useConnection(options: UseConnectionOptions = {}): UseConnectionReturn {
  const {
    autoConnect = false,
    autoReconnect = true,
    enableHealthMonitoring = true,
    healthCheckInterval = 10000,
    enablePerformanceMonitoring = true,
    performanceInterval = 5000,
    onStatusChange,
    onError,
    onHealthChange,
    maxRetries = 3,
    retryDelay = 2000,
    exponentialBackoff = true,
  } = options;

  // Store access
  const connectionStore = useConnectionStore();
  const { 
    status, 
    config, 
    metrics, 
    lastError, 
    isAutoConnecting,
    setStatus,
    setConfig,
    setLastError,
    updateMetrics,
    incrementReconnectAttempts,
    resetMetrics: storeResetMetrics,
    reset: storeReset
  } = connectionStore;

  // Local state
  const [health, setHealth] = useState<ConnectionHealth>();
  const [errorHistory, setErrorHistory] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [performanceData, setPerformanceData] = useState<{
    latencyHistory: number[];
    throughputHistory: number[];
    startTime: number;
  }>({
    latencyHistory: [],
    throughputHistory: [],
    startTime: Date.now(),
  });

  // Refs for intervals
  const healthCheckInterval_ref = useRef<NodeJS.Timeout | null>(null);
  const performanceInterval_ref = useRef<NodeJS.Timeout | null>(null);
  const retryTimeout_ref = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'reconnecting';
  const hasErrors = !!lastError || errorHistory.length > 0;
  
  const uptime = useMemo(() => {
    if (!metrics.connectedAt || !isConnected) return 0;
    return Date.now() - metrics.connectedAt;
  }, [metrics.connectedAt, isConnected]);

  const packetLossRate = useMemo(() => {
    const received = metrics.packetsReceived || 0;
    const dropped = metrics.packetsDropped || 0;
    const total = received + dropped;
    return total > 0 ? (dropped / total) * 100 : 0;
  }, [metrics.packetsReceived, metrics.packetsDropped]);

  const throughput = useMemo(() => {
    const bytes = metrics.bytesReceived || 0;
    const timeMs = uptime;
    return timeMs > 0 ? (bytes / timeMs) * 1000 : 0; // bytes per second
  }, [metrics.bytesReceived, uptime]);

  const healthScore = useMemo(() => {
    if (!health) return 0;
    return health.score;
  }, [health]);

  const healthStatus = useMemo((): 'excellent' | 'good' | 'poor' | 'critical' | 'unknown' => {
    if (!health) return 'unknown';
    if (health.status === 'disconnected') return 'critical';
    return health.status;
  }, [health]);

  // Health monitoring function
  const performHealthCheck = useCallback(async (): Promise<ConnectionHealth> => {
    const now = Date.now();
    const connectionAge = metrics.connectedAt ? now - metrics.connectedAt : 0;
    
    // Calculate health metrics
    const latency = performanceData.latencyHistory.length > 0 
      ? performanceData.latencyHistory.reduce((a, b) => a + b, 0) / performanceData.latencyHistory.length
      : 0;
    
    const stability = Math.max(0, 100 - (metrics.reconnectAttempts * 10));
    
    const healthMetrics = {
      packetLoss: packetLossRate,
      latency,
      throughput,
      stability,
      uptime: connectionAge,
    };
    
    // Calculate overall score
    const score = Math.round(
      (Math.max(0, 100 - healthMetrics.packetLoss * 2) * 0.3) +
      (Math.max(0, 100 - Math.min(100, healthMetrics.latency / 10)) * 0.2) +
      (Math.min(100, healthMetrics.throughput / 10) * 0.2) +
      (healthMetrics.stability * 0.2) +
      (Math.min(100, healthMetrics.uptime / 36000) * 0.1) // 10 minutes = 100%
    );
    
    // Determine status
    let healthStatus: ConnectionHealth['status'];
    if (score >= 90) healthStatus = 'excellent';
    else if (score >= 75) healthStatus = 'good';
    else if (score >= 50) healthStatus = 'poor';
    else if (score >= 25) healthStatus = 'critical';
    else healthStatus = 'disconnected';
    
    // Identify issues
    const issues: string[] = [];
    if (healthMetrics.packetLoss > 5) issues.push(`High packet loss: ${healthMetrics.packetLoss.toFixed(1)}%`);
    if (healthMetrics.latency > 100) issues.push(`High latency: ${healthMetrics.latency.toFixed(0)}ms`);
    if (healthMetrics.throughput < 1) issues.push(`Low throughput: ${healthMetrics.throughput.toFixed(1)} B/s`);
    if (!isConnected) issues.push('Not connected');
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (healthMetrics.packetLoss > 5) recommendations.push('Check network stability');
    if (healthMetrics.latency > 100) recommendations.push('Verify network path');
    if (issues.length === 0) recommendations.push('Connection is performing well');
    
    const newHealth: ConnectionHealth = {
      status: healthStatus,
      score,
      metrics: healthMetrics,
      issues,
      recommendations,
      lastCheck: now,
    };
    
    setHealth(newHealth);
    onHealthChange?.(newHealth);
    
    return newHealth;
  }, [metrics, performanceData, packetLossRate, throughput, isConnected, onHealthChange]);

  // Performance monitoring
  const updatePerformanceData = useCallback(() => {
    if (!isConnected) return;
    
    // Simulate latency measurement (in real app, this would be actual measurement)
    const simulatedLatency = Math.random() * 50 + 10; // 10-60ms
    const currentThroughput = throughput;
    
    setPerformanceData(prev => {
      const newLatencyHistory = [...prev.latencyHistory, simulatedLatency].slice(-100);
      const newThroughputHistory = [...prev.throughputHistory, currentThroughput].slice(-100);
      
      return {
        ...prev,
        latencyHistory: newLatencyHistory,
        throughputHistory: newThroughputHistory,
      };
    });
  }, [isConnected, throughput]);

  // Connection functions
  const connect = useCallback(async (newConfig?: Partial<StoreConnectionConfig>): Promise<boolean> => {
    try {
      if (newConfig) {
        setConfig(newConfig);
      }
      
      setStatus('connecting');
      setLastError(undefined);
      
      // Simulate connection attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success/failure
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        setStatus('connected');
        updateMetrics({ connectedAt: Date.now() });
        setRetryCount(0);
        setPerformanceData(prev => ({ ...prev, startTime: Date.now() }));
        return true;
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setStatus('error');
      setLastError(errorMessage);
      setErrorHistory(prev => [...prev, errorMessage].slice(-10));
      onError?.(errorMessage);
      
      // Auto-retry logic
      if (autoReconnect && retryCount < maxRetries) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, retryCount)
          : retryDelay;
        
        retryTimeout_ref.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          incrementReconnectAttempts();
          connect();
        }, delay);
      }
      
      return false;
    }
  }, [setConfig, setStatus, setLastError, updateMetrics, autoReconnect, retryCount, maxRetries, retryDelay, exponentialBackoff, onError, incrementReconnectAttempts]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (retryTimeout_ref.current) {
      clearTimeout(retryTimeout_ref.current);
    }
    
    setStatus('disconnected');
    updateMetrics({ disconnectedAt: Date.now() });
    setRetryCount(0);
  }, [setStatus, updateMetrics]);

  const reconnect = useCallback(async (): Promise<boolean> => {
    await disconnect();
    return connect();
  }, [disconnect, connect]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 500));
      return Math.random() > 0.05; // 95% success rate
    } catch {
      return false;
    }
  }, [isConnected]);

  // Configuration functions
  const updateConfig = useCallback((newConfig: Partial<StoreConnectionConfig>) => {
    setConfig(newConfig);
  }, [setConfig]);

  const resetConfig = useCallback(() => {
    // Reset to default config
    setConfig({
      ip: '192.168.1.100',
      port: 10110,
      protocol: 'tcp',
      autoConnect: false,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
    });
  }, [setConfig]);

  // Diagnostics
  const runDiagnostics = useCallback(async (): Promise<ConnectionDiagnostics> => {
    const diagnostics: ConnectionDiagnostics = {
      networkReachable: navigator.onLine,
      dnsResolution: true, // Simplified
      portAccessible: isConnected,
      protocolHandshake: isConnected,
      dataFlow: isConnected && throughput > 0,
      errorRate: packetLossRate,
      reconnectAttempts: metrics.reconnectAttempts,
      lastSuccessfulConnection: metrics.connectedAt,
      diagnosticTimestamp: Date.now(),
    };
    
    return diagnostics;
  }, [isConnected, throughput, packetLossRate, metrics]);

  const getConnectionInfo = useCallback((): string => {
    if (!isConnected) return 'Disconnected';
    return `Connected to ${config.ip}:${config.port} via ${config.protocol.toUpperCase()}`;
  }, [isConnected, config]);

  // Metrics and reports
  const resetMetrics = useCallback(() => {
    storeResetMetrics();
    setPerformanceData({
      latencyHistory: [],
      throughputHistory: [],
      startTime: Date.now(),
    });
  }, [storeResetMetrics]);

  const getPerformanceReport = useCallback(() => {
    const { latencyHistory, throughputHistory } = performanceData;
    
    const averageLatency = latencyHistory.length > 0
      ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
      : 0;
    
    const peakThroughput = throughputHistory.length > 0
      ? Math.max(...throughputHistory)
      : 0;
    
    const stabilityScore = Math.max(0, 100 - (metrics.reconnectAttempts * 10));
    const reliabilityScore = Math.max(0, 100 - packetLossRate * 2);
    
    return {
      averageLatency,
      peakThroughput,
      stabilityScore,
      reliabilityScore,
    };
  }, [performanceData, metrics.reconnectAttempts, packetLossRate]);

  // Utilities
  const refresh = useCallback(() => {
    if (enableHealthMonitoring) {
      performHealthCheck();
    }
  }, [enableHealthMonitoring, performHealthCheck]);

  const clearErrors = useCallback(() => {
    setLastError(undefined);
    setErrorHistory([]);
  }, [setLastError]);

  // Status change effect
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && status === 'disconnected' && !isAutoConnecting) {
      connect();
    }
  }, [autoConnect, status, isAutoConnecting, connect]);

  // Health monitoring effect
  useEffect(() => {
    if (!enableHealthMonitoring) return;
    
    healthCheckInterval_ref.current = setInterval(performHealthCheck, healthCheckInterval);
    
    return () => {
      if (healthCheckInterval_ref.current) {
        clearInterval(healthCheckInterval_ref.current);
      }
    };
  }, [enableHealthMonitoring, healthCheckInterval, performHealthCheck]);

  // Performance monitoring effect
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;
    
    performanceInterval_ref.current = setInterval(updatePerformanceData, performanceInterval);
    
    return () => {
      if (performanceInterval_ref.current) {
        clearInterval(performanceInterval_ref.current);
      }
    };
  }, [enablePerformanceMonitoring, performanceInterval, updatePerformanceData]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (healthCheckInterval_ref.current) clearInterval(healthCheckInterval_ref.current);
      if (performanceInterval_ref.current) clearInterval(performanceInterval_ref.current);
      if (retryTimeout_ref.current) clearTimeout(retryTimeout_ref.current);
    };
  }, []);

  return {
    // Connection state
    status,
    isConnected,
    isConnecting,
    config,
    
    // Connection metrics
    metrics,
    uptime,
    packetLossRate,
    throughput,
    
    // Health monitoring
    health,
    healthScore,
    healthStatus,
    
    // Error information
    lastError,
    errorHistory,
    hasErrors,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    testConnection,
    
    // Configuration
    updateConfig,
    resetConfig,
    
    // Diagnostics
    runDiagnostics,
    getConnectionInfo,
    
    // Metrics and monitoring
    resetMetrics,
    getPerformanceReport,
    
    // Utilities
    refresh,
    clearErrors,
  };
}