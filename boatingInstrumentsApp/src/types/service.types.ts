// Service Types
// Centralized type definitions for service layer architecture and domain services

/**
 * Service lifecycle and state
 */
export type ServiceStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'restarting';

export type ServicePriority = 'low' | 'normal' | 'high' | 'critical';

export interface ServiceState {
  status: ServiceStatus;
  startTime?: number;
  lastActivity?: number;
  errorCount: number;
  restartCount: number;
  healthCheck: ServiceHealthCheck;
}

/**
 * Service configuration and metadata
 */
export interface ServiceConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  priority: ServicePriority;
  dependencies: string[];
  autoStart: boolean;
  restartOnFailure: boolean;
  maxRestarts: number;
  healthCheckInterval: number;
  timeout: number;
  environment?: Record<string, string>;
}

/**
 * Service health monitoring
 */
export interface ServiceHealthCheck {
  enabled: boolean;
  lastCheck: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: {
    connectivity: boolean;
    performance: boolean;
    resources: boolean;
    dependencies: boolean;
  };
  metrics: ServiceMetrics;
  issues: string[];
}

export interface ServiceMetrics {
  uptime: number;
  requests: number;
  errors: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
}

/**
 * Service events and lifecycle
 */
export type ServiceEventType = 
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'health-check'
  | 'dependency-failure'
  | 'resource-warning';

export interface ServiceEvent {
  type: ServiceEventType;
  serviceId: string;
  timestamp: number;
  data?: any;
  error?: Error | string;
  context?: Record<string, any>;
}

export type ServiceEventCallback = (event: ServiceEvent) => void;

/**
 * Base service interface
 */
export interface BaseService {
  readonly id: string;
  readonly name: string;
  readonly config: ServiceConfig;
  readonly state: ServiceState;

  // Lifecycle methods
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;

  // Health and monitoring
  healthCheck(): Promise<ServiceHealthCheck>;
  getMetrics(): ServiceMetrics;
  getStatus(): ServiceStatus;

  // Event handling
  addEventListener(type: ServiceEventType, callback: ServiceEventCallback): void;
  removeEventListener(type: ServiceEventType, callback: ServiceEventCallback): void;

  // Configuration
  updateConfig(config: Partial<ServiceConfig>): Promise<void>;
  validateConfig(config: ServiceConfig): boolean;
}

/**
 * Service manager and registry
 */
export interface ServiceManager {
  // Service lifecycle
  registerService(service: BaseService): Promise<void>;
  unregisterService(serviceId: string): Promise<void>;
  startService(serviceId: string): Promise<void>;
  stopService(serviceId: string): Promise<void>;
  restartService(serviceId: string): Promise<void>;

  // Service discovery
  getService<T extends BaseService>(serviceId: string): T | undefined;
  getAllServices(): BaseService[];
  getServicesByStatus(status: ServiceStatus): BaseService[];
  getServicesByPriority(priority: ServicePriority): BaseService[];

  // Health monitoring
  checkAllServices(): Promise<Record<string, ServiceHealthCheck>>;
  getSystemHealth(): Promise<SystemHealthReport>;

  // Dependency management
  resolveDependencies(serviceId: string): string[];
  startDependencies(serviceId: string): Promise<void>;
  stopDependents(serviceId: string): Promise<void>;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealthCheck>;
  timestamp: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Domain-specific service types
 */
export interface NmeaService extends BaseService {
  // NMEA-specific methods
  parseMessage(message: string): any;
  validateMessage(message: string): boolean;
  getMessageTypes(): string[];
  getDataFreshness(): Record<string, number>;
}

export interface ConnectionService extends BaseService {
  // Connection-specific methods
  connect(config: any): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionMetrics(): any;
  testConnection(): Promise<boolean>;
}

export interface AutopilotService extends BaseService {
  // Autopilot-specific methods
  sendCommand(command: any): Promise<boolean>;
  getStatus(): any;
  engage(): Promise<void>;
  disengage(): Promise<void>;
  setHeading(heading: number): Promise<void>;
}

/**
 * Service factory and dependency injection
 */
export interface ServiceFactory {
  createService<T extends BaseService>(
    type: string, 
    config: ServiceConfig
  ): Promise<T>;
  
  registerServiceType<T extends BaseService>(
    type: string, 
    constructor: new (config: ServiceConfig) => T
  ): void;
  
  getSupportedTypes(): string[];
}

export interface ServiceContainer {
  register<T extends BaseService>(
    identifier: string, 
    service: T
  ): void;
  
  resolve<T extends BaseService>(
    identifier: string
  ): T;
  
  inject(target: any): void;
}

/**
 * Service monitoring and observability
 */
export interface ServiceLogger {
  debug(serviceId: string, message: string, context?: any): void;
  info(serviceId: string, message: string, context?: any): void;
  warn(serviceId: string, message: string, context?: any): void;
  error(serviceId: string, message: string, error?: Error, context?: any): void;
  
  getLogs(serviceId?: string, level?: string, limit?: number): ServiceLogEntry[];
}

export interface ServiceLogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  serviceId: string;
  message: string;
  context?: any;
  error?: Error;
}

/**
 * Service configuration management
 */
export interface ServiceConfigManager {
  loadConfig(serviceId: string): Promise<ServiceConfig>;
  saveConfig(serviceId: string, config: ServiceConfig): Promise<void>;
  validateConfig(config: ServiceConfig): ValidationResult;
  getDefaultConfig(serviceType: string): ServiceConfig;
  migrateConfig(oldConfig: any, version: string): ServiceConfig;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service performance and optimization
 */
export interface ServicePerformanceMonitor {
  startMonitoring(serviceId: string): void;
  stopMonitoring(serviceId: string): void;
  getPerformanceData(serviceId: string): PerformanceData;
  optimizationRecommendations(serviceId: string): string[];
}

export interface PerformanceData {
  serviceId: string;
  period: { start: number; end: number };
  metrics: {
    responseTime: number[];
    throughput: number[];
    errorRate: number[];
    resourceUsage: {
      memory: number[];
      cpu: number[];
    };
  };
  statistics: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };
}

/**
 * Service security and access control
 */
export interface ServiceSecurity {
  authenticate(credentials: any): Promise<boolean>;
  authorize(action: string, resource: string): Promise<boolean>;
  encryptData(data: any): string;
  decryptData(encryptedData: string): any;
  generateToken(payload: any): string;
  validateToken(token: string): any;
}

/**
 * Error handling and resilience
 */
export interface ServiceErrorHandler {
  handleError(serviceId: string, error: Error): Promise<void>;
  shouldRetry(error: Error, attemptCount: number): boolean;
  getRetryDelay(attemptCount: number): number;
  circuitBreakerStatus(serviceId: string): 'closed' | 'open' | 'half-open';
}

export interface ServiceResilience {
  retryPolicy: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBackoff: boolean;
  };
  
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenMaxCalls: number;
  };
  
  bulkhead: {
    enabled: boolean;
    maxConcurrentCalls: number;
    queueSize: number;
  };
  
  timeout: {
    enabled: boolean;
    duration: number;
  };
}

/**
 * Export utility types
 */
export type ServiceId = string;
export type ServiceType = string;
export type ServiceDependency = string;