// Connection Types
// Centralized type definitions for network connections, health monitoring, and diagnostics

/**
 * Connection status and state types
 */
export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'no-data' 
  | 'error' 
  | 'reconnecting'
  | 'timeout';

export type ConnectionProtocol = 'tcp' | 'udp' | 'websocket' | 'serial' | 'bluetooth';

export type NetworkStatus = 'online' | 'offline' | 'limited' | 'unknown';

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  id?: string;
  name?: string;
  ip: string;
  port: number;
  protocol: ConnectionProtocol;
  timeout: number;
  autoConnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  retryBackoff: boolean;
  keepAlive: boolean;
  bufferSize?: number;
  encoding?: string;
}

/**
 * Connection metrics and statistics
 */
export interface ConnectionMetrics {
  connectedAt?: number;
  disconnectedAt?: number;
  totalConnections: number;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  packetsDropped: number;
  reconnectAttempts: number;
  lastErrorTime?: number;
  averageLatency?: number;
  throughput?: number; // bytes per second
  uptime?: number;
}

/**
 * Connection health monitoring
 */
export interface ConnectionHealth {
  status: 'excellent' | 'good' | 'poor' | 'critical' | 'disconnected';
  score: number; // 0-100
  metrics: {
    packetLoss: number;
    latency: number;
    throughput: number;
    stability: number;
    uptime: number;
  };
  issues: string[];
  recommendations: string[];
  lastCheck: number;
}

export interface ConnectionDiagnostics {
  networkReachable: boolean;
  dnsResolution: boolean;
  portAccessible: boolean;
  protocolHandshake: boolean;
  dataFlow: boolean;
  errorRate: number;
  reconnectAttempts: number;
  lastSuccessfulConnection?: number;
  diagnosticTimestamp: number;
}

/**
 * Connection events and callbacks
 */
export type ConnectionEventType = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'data'
  | 'timeout'
  | 'reconnecting'
  | 'health-check';

export interface ConnectionEvent {
  type: ConnectionEventType;
  timestamp: number;
  data?: any;
  error?: Error | string;
  metrics?: Partial<ConnectionMetrics>;
}

export type ConnectionEventCallback = (event: ConnectionEvent) => void;

/**
 * Connection state management
 */
export interface ConnectionState {
  status: ConnectionStatus;
  config: ConnectionConfig;
  metrics: ConnectionMetrics;
  health?: ConnectionHealth;
  lastError?: string;
  isAutoConnecting: boolean;
  debugMode: boolean;
  retryCount: number;
  lastActivity: number;
}

/**
 * Connection manager interfaces
 */
export interface ConnectionManager {
  connect(config: ConnectionConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  reconnect(): Promise<boolean>;
  getStatus(): ConnectionStatus;
  getMetrics(): ConnectionMetrics;
  isConnected(): boolean;
  sendData(data: any): Promise<boolean>;
  addEventListener(type: ConnectionEventType, callback: ConnectionEventCallback): void;
  removeEventListener(type: ConnectionEventType, callback: ConnectionEventCallback): void;
}

/**
 * Network discovery and scanning
 */
export interface NetworkDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  ports: number[];
  services: NetworkService[];
  lastSeen: number;
  responseTime: number;
}

export interface NetworkService {
  port: number;
  protocol: 'tcp' | 'udp';
  name?: string;
  version?: string;
  description?: string;
  isNmeaSource?: boolean;
}

export interface NetworkScanResult {
  devices: NetworkDevice[];
  scanDuration: number;
  timestamp: number;
  networkRange: string;
}

/**
 * Reconnection strategies
 */
export type ReconnectionStrategy = 
  | 'immediate'
  | 'linear'
  | 'exponential'
  | 'custom';

export interface ReconnectionOptions {
  strategy: ReconnectionStrategy;
  initialDelay: number;
  maxDelay: number;
  maxAttempts: number;
  multiplier: number; // for exponential backoff
  jitter: boolean;
  customDelayFunction?: (attempt: number) => number;
}

/**
 * Connection pool management
 */
export interface ConnectionPool {
  maxConnections: number;
  activeConnections: number;
  idleTimeout: number;
  healthCheckInterval: number;
  loadBalancing: 'round-robin' | 'least-connections' | 'random';
}

/**
 * Error types and handling
 */
export type ConnectionErrorType = 
  | 'network-error'
  | 'timeout'
  | 'authentication'
  | 'protocol-error'
  | 'configuration-error'
  | 'resource-exhausted'
  | 'unknown';

export interface ConnectionError {
  type: ConnectionErrorType;
  message: string;
  code?: number;
  timestamp: number;
  retryable: boolean;
  context?: Record<string, any>;
}

/**
 * Security and authentication
 */
export interface ConnectionSecurity {
  encrypted: boolean;
  certificateValidation: boolean;
  allowSelfSigned: boolean;
  authRequired: boolean;
  authMethod?: 'basic' | 'token' | 'certificate';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    certificate?: string;
  };
}

/**
 * Advanced connection features
 */
export interface ConnectionFeatures {
  compression: boolean;
  keepAlive: boolean;
  nodelay: boolean;
  multicast: boolean;
  broadcast: boolean;
  heartbeat: boolean;
  heartbeatInterval?: number;
}

/**
 * Data processing and filtering
 */
export interface DataFilter {
  enabled: boolean;
  messageTypes?: string[];
  rateLimit?: number; // messages per second
  duplicateFilter: boolean;
  validationLevel: 'none' | 'basic' | 'strict';
  customFilters?: ((data: any) => boolean)[];
}

/**
 * Connection monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  healthCheckInterval: number;
  metricsRetention: number; // milliseconds
  alertThresholds: {
    packetLoss: number;
    latency: number;
    errorRate: number;
    reconnectRate: number;
  };
  notifications: {
    onDisconnect: boolean;
    onError: boolean;
    onHealthDegraded: boolean;
  };
}

/**
 * Export utility types
 */
export type ConnectionId = string;
export type NetworkAddress = string;
export type PortNumber = number;