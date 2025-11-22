import { autopilotSafetyManager, SystemHealthMetrics } from './autopilotSafetyManager';
import { AutopilotErrorManager } from './autopilotErrorManager';
import { autopilotCommandQueue } from './autopilotCommandQueue';
import { useNmeaStore } from '../../store/nmeaStore';

/**
 * System degradation levels
 */
export enum DegradationLevel {
  NORMAL = 'normal',           // All systems operational
  DEGRADED = 'degraded',       // Some systems affected but operational
  CRITICAL = 'critical',       // Major systems failing, limited functionality
  EMERGENCY = 'emergency'      // System failure, emergency procedures active
}

/**
 * Service availability states
 */
export enum ServiceState {
  AVAILABLE = 'available',
  DEGRADED = 'degraded',
  UNAVAILABLE = 'unavailable'
}

/**
 * System component health status
 */
export interface ComponentHealth {
  autopilot: ServiceState;
  connection: ServiceState;
  gps: ServiceState;
  compass: ServiceState;
  sensors: ServiceState;
}

/**
 * Degradation response configuration
 */
export interface DegradationResponse {
  level: DegradationLevel;
  allowedOperations: string[];
  disabledFeatures: string[];
  userMessage: string;
  automaticActions: string[];
}

/**
 * AutopilotGracefulDegradationService - Manages system degradation and recovery
 * Story 3.3 AC6: Graceful degradation when autopilot becomes unavailable
 */
export class AutopilotGracefulDegradationService {
  private currentDegradationLevel = DegradationLevel.NORMAL;
  private componentHealth: ComponentHealth = {
    autopilot: ServiceState.AVAILABLE,
    connection: ServiceState.AVAILABLE,
    gps: ServiceState.AVAILABLE,
    compass: ServiceState.AVAILABLE,
    sensors: ServiceState.AVAILABLE
  };
  
  private degradationResponses: { [key in DegradationLevel]: DegradationResponse } = {
    [DegradationLevel.NORMAL]: {
      level: DegradationLevel.NORMAL,
      allowedOperations: ['all'],
      disabledFeatures: [],
      userMessage: 'All systems operational',
      automaticActions: []
    },
    [DegradationLevel.DEGRADED]: {
      level: DegradationLevel.DEGRADED,
      allowedOperations: ['engage', 'disengage', 'heading_small_adjustments'],
      disabledFeatures: ['auto_nav', 'wind_mode'],
      userMessage: 'Some systems degraded - Basic autopilot available',
      automaticActions: ['disable_advanced_modes', 'increase_monitoring']
    },
    [DegradationLevel.CRITICAL]: {
      level: DegradationLevel.CRITICAL,
      allowedOperations: ['disengage', 'emergency_stop'],
      disabledFeatures: ['engage', 'heading_adjustments', 'mode_changes'],
      userMessage: 'Critical system issues - Limited to emergency operations',
      automaticActions: ['auto_disengage', 'clear_command_queue', 'activate_alarms']
    },
    [DegradationLevel.EMERGENCY]: {
      level: DegradationLevel.EMERGENCY,
      allowedOperations: ['emergency_stop'],
      disabledFeatures: ['all_except_emergency'],
      userMessage: 'EMERGENCY: System failure - Manual steering only',
      automaticActions: ['force_disengage', 'emergency_alerts', 'log_incident']
    }
  };

  private monitoringInterval?: ReturnType<typeof setInterval>;
  private lastHealthCheck = 0;

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Start continuous system health monitoring
   */
  private startHealthMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.assessSystemHealth();
    }, 2000); // Check every 2 seconds
  }

  /**
   * Assess overall system health and determine degradation level
   */
  private assessSystemHealth(): void {
    this.lastHealthCheck = Date.now();
    
    // Get health metrics from safety manager
    const healthMetrics = autopilotSafetyManager.getHealthMetrics();
    const safetyEvents = autopilotSafetyManager.getSafetyEvents(false); // Unresolved events
    
    // Update component health
    this.updateComponentHealth(healthMetrics);
    
    // Calculate degradation level
    const newDegradationLevel = this.calculateDegradationLevel(healthMetrics, safetyEvents);
    
    // Handle degradation level changes
    if (newDegradationLevel !== this.currentDegradationLevel) {
      this.handleDegradationChange(this.currentDegradationLevel, newDegradationLevel);
      this.currentDegradationLevel = newDegradationLevel;
    }
  }

  /**
   * Update component health status based on metrics
   */
  private updateComponentHealth(healthMetrics: SystemHealthMetrics): void {
    this.componentHealth.connection = this.mapHealthToServiceState(healthMetrics.connectionStatus);
    this.componentHealth.autopilot = this.mapHealthToServiceState(healthMetrics.autopilotStatus);
    this.componentHealth.gps = this.mapHealthToServiceState(healthMetrics.gpsStatus);
    this.componentHealth.compass = this.mapHealthToServiceState(healthMetrics.compassStatus);
    
    // Sensors health based on data freshness and accuracy
    const timeSinceData = Date.now() - healthMetrics.lastDataReceived;
    if (timeSinceData > 10000) { // 10 seconds
      this.componentHealth.sensors = ServiceState.UNAVAILABLE;
    } else if (timeSinceData > 5000) { // 5 seconds
      this.componentHealth.sensors = ServiceState.DEGRADED;
    } else {
      this.componentHealth.sensors = ServiceState.AVAILABLE;
    }
  }

  /**
   * Calculate appropriate degradation level based on system health
   */
  private calculateDegradationLevel(
    healthMetrics: SystemHealthMetrics, 
    safetyEvents: any[]
  ): DegradationLevel {
    
    // Count critical failures
    let criticalFailures = 0;
    let majorFailures = 0;
    
    // Connection failures are critical
    if (this.componentHealth.connection === ServiceState.UNAVAILABLE) {
      criticalFailures++;
    }
    
    // Autopilot failures
    if (this.componentHealth.autopilot === ServiceState.UNAVAILABLE) {
      criticalFailures++;
    } else if (this.componentHealth.autopilot === ServiceState.DEGRADED) {
      majorFailures++;
    }
    
    // Navigation system failures
    if (this.componentHealth.gps === ServiceState.UNAVAILABLE && 
        this.componentHealth.compass === ServiceState.UNAVAILABLE) {
      criticalFailures++;
    } else if (this.componentHealth.gps === ServiceState.UNAVAILABLE || 
               this.componentHealth.compass === ServiceState.UNAVAILABLE) {
      majorFailures++;
    }
    
    // Command success rate degradation
    if (healthMetrics.commandSuccessRate < 50) {
      criticalFailures++;
    } else if (healthMetrics.commandSuccessRate < 80) {
      majorFailures++;
    }
    
    // Critical safety events
    const criticalEvents = safetyEvents.filter(event => event.level === 'critical');
    if (criticalEvents.length > 0) {
      criticalFailures += criticalEvents.length;
    }
    
    // Determine degradation level
    if (criticalFailures >= 2) {
      return DegradationLevel.EMERGENCY;
    } else if (criticalFailures >= 1) {
      return DegradationLevel.CRITICAL;
    } else if (majorFailures >= 2) {
      return DegradationLevel.CRITICAL;
    } else if (majorFailures >= 1) {
      return DegradationLevel.DEGRADED;
    } else {
      return DegradationLevel.NORMAL;
    }
  }

  /**
   * Handle degradation level changes
   */
  private handleDegradationChange(
    fromLevel: DegradationLevel, 
    toLevel: DegradationLevel
  ): void {
    
    console.warn(`[GracefulDegradation] Level changed from ${fromLevel} to ${toLevel}`);
    
    const response = this.degradationResponses[toLevel];
    
    // Execute automatic actions
    response.automaticActions.forEach(action => {
      this.executeAutomaticAction(action);
    });
    
    // Update user interface
    this.notifyUserOfDegradation(response);
    
    // Log degradation event
    const errorMessage = AutopilotErrorManager.createError('SYS_002', {
      fromLevel,
      toLevel,
      response,
      timestamp: Date.now()
    });
    
    AutopilotErrorManager.formatErrorForUser(errorMessage);
  }

  /**
   * Execute automatic actions in response to degradation
   */
  private executeAutomaticAction(action: string): void {
    switch (action) {
      case 'disable_advanced_modes':
        this.disableAdvancedModes();
        break;
        
      case 'auto_disengage':
        this.performAutoDisengage();
        break;
        
      case 'force_disengage':
        this.performForceDisengage();
        break;
        
      case 'clear_command_queue':
        autopilotCommandQueue.clearNonEmergencyCommands();
        break;
        
      case 'increase_monitoring':
        this.increaseMonitoringFrequency();
        break;
        
      case 'activate_alarms':
        this.activateEmergencyAlarms();
        break;
        
      case 'emergency_alerts':
        this.sendEmergencyAlerts();
        break;
        
      case 'log_incident':
        this.logIncident();
        break;
        
      default:
        console.warn(`[GracefulDegradation] Unknown automatic action: ${action}`);
    }
  }

  /**
   * Disable advanced autopilot modes for safety
   */
  private disableAdvancedModes(): void {
    const store = useNmeaStore.getState();
    const autopilotData = store.nmeaData.autopilot;
    
    if (autopilotData && autopilotData.mode && autopilotData.mode !== 'COMPASS') {
      // Switch to basic compass mode
      store.setNmeaData({
        autopilot: {
          ...autopilotData,
          mode: 'COMPASS',
          commandMessage: 'Advanced modes disabled due to system degradation'
        }
      });
    }
  }

  /**
   * Perform automatic autopilot disengagement
   */
  private performAutoDisengage(): void {
    const store = useNmeaStore.getState();
    
    store.setNmeaData({
      autopilot: {
        ...store.nmeaData.autopilot,
        active: false,
        commandStatus: 'error',
        commandMessage: 'Autopilot auto-disengaged due to system degradation'
      }
    });
  }

  /**
   * Perform forced emergency disengagement
   */
  private performForceDisengage(): void {
    const store = useNmeaStore.getState();
    
    store.setNmeaData({
      autopilot: {
        active: false,
        mode: 'STANDBY',
        commandStatus: 'error',
        commandMessage: 'EMERGENCY: Autopilot force-disengaged - Switch to manual steering'
      }
    });
  }

  /**
   * Increase monitoring frequency during degraded conditions
   */
  private increaseMonitoringFrequency(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Check every second during degraded conditions
    this.monitoringInterval = setInterval(() => {
      this.assessSystemHealth();
    }, 1000);
  }

  /**
   * Activate emergency alarm system
   */
  private activateEmergencyAlarms(): void {
    const store = useNmeaStore.getState();
    
    store.updateAlarms([{
      id: `emergency_degradation_${Date.now()}`,
      message: 'CRITICAL SYSTEM DEGRADATION - Check systems immediately',
      level: 'critical',
      timestamp: Date.now()
    }]);
  }

  /**
   * Send emergency alerts to user
   */
  private sendEmergencyAlerts(): void {
    // This would integrate with notification systems
    console.error('[EMERGENCY] Critical autopilot system failure - Switch to manual steering immediately');
  }

  /**
   * Log incident for analysis
   */
  private logIncident(): void {
    const healthMetrics = autopilotSafetyManager.getHealthMetrics();
    const safetyEvents = autopilotSafetyManager.getSafetyEvents(false);
    
    console.error('[INCIDENT LOG]', {
      timestamp: Date.now(),
      degradationLevel: this.currentDegradationLevel,
      componentHealth: this.componentHealth,
      healthMetrics,
      safetyEvents,
      systemUptime: Date.now() - this.lastHealthCheck
    });
  }

  /**
   * Notify user of system degradation
   */
  private notifyUserOfDegradation(response: DegradationResponse): void {
    const store = useNmeaStore.getState();
    
    store.updateAlarms([{
      id: `degradation_${Date.now()}`,
      message: response.userMessage,
      level: response.level === DegradationLevel.EMERGENCY ? 'critical' : 'warning',
      timestamp: Date.now()
    }]);
  }

  /**
   * Map health status to service state
   */
  private mapHealthToServiceState(status: string): ServiceState {
    switch (status) {
      case 'healthy':
      case 'operational':
        return ServiceState.AVAILABLE;
      case 'degraded':
        return ServiceState.DEGRADED;
      case 'failed':
      case 'fault':
        return ServiceState.UNAVAILABLE;
      default:
        return ServiceState.DEGRADED;
    }
  }

  /**
   * Public API: Check if operation is allowed in current degradation state
   */
  isOperationAllowed(operation: string): boolean {
    const response = this.degradationResponses[this.currentDegradationLevel];
    
    if (response.allowedOperations.includes('all')) {
      return true;
    }
    
    if (response.allowedOperations.includes(operation)) {
      return true;
    }
    
    if (response.disabledFeatures.includes('all_except_emergency') && 
        operation !== 'emergency_stop') {
      return false;
    }
    
    return !response.disabledFeatures.includes(operation);
  }

  /**
   * Public API: Get current system status
   */
  getSystemStatus(): {
    degradationLevel: DegradationLevel;
    componentHealth: ComponentHealth;
    allowedOperations: string[];
    disabledFeatures: string[];
    userMessage: string;
    lastHealthCheck: number;
  } {
    const response = this.degradationResponses[this.currentDegradationLevel];
    
    return {
      degradationLevel: this.currentDegradationLevel,
      componentHealth: { ...this.componentHealth },
      allowedOperations: [...response.allowedOperations],
      disabledFeatures: [...response.disabledFeatures],
      userMessage: response.userMessage,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Public API: Force degradation level (for testing or manual override)
   */
  forceDegradationLevel(level: DegradationLevel): void {
    const previousLevel = this.currentDegradationLevel;
    this.handleDegradationChange(previousLevel, level);
    this.currentDegradationLevel = level;
  }

  /**
   * Public API: Attempt system recovery
   */
  attemptRecovery(): boolean {
    // Reset component health and reassess
    this.componentHealth = {
      autopilot: ServiceState.AVAILABLE,
      connection: ServiceState.AVAILABLE,
      gps: ServiceState.AVAILABLE,
      compass: ServiceState.AVAILABLE,
      sensors: ServiceState.AVAILABLE
    };
    
    // Force health assessment
    this.assessSystemHealth();
    
    // Return true if we've recovered to normal or degraded
    return this.currentDegradationLevel === DegradationLevel.NORMAL || 
           this.currentDegradationLevel === DegradationLevel.DEGRADED;
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}

// Singleton instance for global use
export const gracefulDegradationService = new AutopilotGracefulDegradationService();