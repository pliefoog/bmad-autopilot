import { AlarmNotificationData } from './NotificationManager';
import { VesselContextData } from './NotificationContentManager';

export interface SmartNotificationConfig {
  // Batching settings
  batchingEnabled: boolean;
  batchingDelay: number; // ms to wait before sending batch
  maxBatchSize: number;

  // Urgency and escalation
  urgencyLevels: UrgencyLevel[];
  escalationEnabled: boolean;
  escalationDelay: number; // ms between escalation levels

  // Sound customization
  customSoundsEnabled: boolean;
  soundProfiles: SoundProfile[];

  // Do Not Disturb override
  dndOverrideEnabled: boolean;
  dndCriticalOnly: boolean;
  quietHours?: {
    start: string; // HH:MM format
    end: string;
  };

  // Geofencing and context
  contextAwareEnabled: boolean;
  geofenceFiltering: boolean;

  // Machine learning features
  adaptiveBatching: boolean;
  responsePatternLearning: boolean;
}

export interface UrgencyLevel {
  id: string;
  name: string;
  priority: number; // 1-10, 10 being highest
  conditions: UrgencyCondition[];
  actions: UrgencyAction[];
}

export interface UrgencyCondition {
  type: 'alarm_level' | 'source_pattern' | 'value_threshold' | 'time_sensitive' | 'vessel_state';
  parameters: any;
}

export interface UrgencyAction {
  type: 'immediate_notify' | 'bypass_batch' | 'escalate' | 'repeat' | 'bypass_dnd';
  parameters?: any;
}

export interface SoundProfile {
  id: string;
  name: string;
  alarmLevel: 'critical' | 'warning' | 'info';
  soundFile: string;
  volume: number; // 0-100
  pattern?: 'single' | 'double' | 'triple' | 'continuous';
  customizable: boolean;
}

export interface NotificationBatch {
  id: string;
  notifications: AlarmNotificationData[];
  urgencyLevel: number;
  scheduledTime: number;
  vesselContext?: VesselContextData;
}

export interface EscalationState {
  alarmId: string;
  currentLevel: number;
  maxLevel: number;
  lastEscalation: number;
  acknowledged: boolean;
}

/**
 * Smart notification management system for marine alarms
 * Implements batching, urgency levels, escalation, and context-aware behavior
 */
class SmartNotificationManager {
  private static instance: SmartNotificationManager;

  private config: SmartNotificationConfig;

  // Batching system
  private pendingBatches: Map<string, NotificationBatch> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  // Escalation system
  private escalationStates: Map<string, EscalationState> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  // Learning system
  private responsePatterns: Map<string, UserResponsePattern> = new Map();

  // Context tracking
  private currentVesselContext?: VesselContextData;
  private geofences: Map<string, GeofenceConfig> = new Map();

  private constructor() {
    this.config = this.createDefaultConfig();
    this.initializeUrgencyLevels();
    this.initializeSoundProfiles();
  }

  public static getInstance(): SmartNotificationManager {
    if (!SmartNotificationManager.instance) {
      SmartNotificationManager.instance = new SmartNotificationManager();
    }
    return SmartNotificationManager.instance;
  }

  /**
   * Create default smart notification configuration
   */
  private createDefaultConfig(): SmartNotificationConfig {
    return {
      batchingEnabled: true,
      batchingDelay: 5000, // 5 seconds
      maxBatchSize: 5,

      urgencyLevels: [],
      escalationEnabled: true,
      escalationDelay: 30000, // 30 seconds

      customSoundsEnabled: true,
      soundProfiles: [],

      dndOverrideEnabled: true,
      dndCriticalOnly: true,
      quietHours: {
        start: '22:00',
        end: '06:00',
      },

      contextAwareEnabled: true,
      geofenceFiltering: true,

      adaptiveBatching: true,
      responsePatternLearning: true,
    };
  }

  /**
   * Initialize default urgency levels for marine environments
   */
  private initializeUrgencyLevels(): void {
    this.config.urgencyLevels = [
      {
        id: 'immediate_danger',
        name: 'Immediate Danger',
        priority: 10,
        conditions: [
          {
            type: 'alarm_level',
            parameters: { level: 'critical' },
          },
          {
            type: 'source_pattern',
            parameters: { patterns: ['collision', 'fire', 'flooding', 'man_overboard'] },
          },
        ],
        actions: [
          { type: 'immediate_notify' },
          { type: 'bypass_batch' },
          { type: 'bypass_dnd' },
          { type: 'repeat', parameters: { interval: 10000, maxRepeats: 5 } },
        ],
      },
      {
        id: 'critical_safety',
        name: 'Critical Safety',
        priority: 9,
        conditions: [
          {
            type: 'alarm_level',
            parameters: { level: 'critical' },
          },
        ],
        actions: [
          { type: 'immediate_notify' },
          { type: 'bypass_batch' },
          { type: 'escalate', parameters: { delay: 60000 } },
        ],
      },
      {
        id: 'navigation_critical',
        name: 'Navigation Critical',
        priority: 8,
        conditions: [
          {
            type: 'source_pattern',
            parameters: { patterns: ['shallow', 'gps', 'autopilot', 'collision_avoidance'] },
          },
          {
            type: 'vessel_state',
            parameters: { conditions: ['underway', 'anchored_shallow'] },
          },
        ],
        actions: [{ type: 'immediate_notify' }, { type: 'bypass_dnd' }],
      },
      {
        id: 'engine_critical',
        name: 'Engine Critical',
        priority: 7,
        conditions: [
          {
            type: 'source_pattern',
            parameters: { patterns: ['engine', 'transmission', 'cooling'] },
          },
          {
            type: 'alarm_level',
            parameters: { level: 'critical' },
          },
        ],
        actions: [
          { type: 'immediate_notify' },
          { type: 'escalate', parameters: { delay: 120000 } },
        ],
      },
      {
        id: 'standard_warning',
        name: 'Standard Warning',
        priority: 5,
        conditions: [
          {
            type: 'alarm_level',
            parameters: { level: 'warning' },
          },
        ],
        actions: [],
      },
      {
        id: 'information',
        name: 'Information',
        priority: 3,
        conditions: [
          {
            type: 'alarm_level',
            parameters: { level: 'info' },
          },
        ],
        actions: [],
      },
    ];
  }

  /**
   * Initialize default sound profiles for marine alarms
   */
  private initializeSoundProfiles(): void {
    this.config.soundProfiles = [
      {
        id: 'critical_general_alarm',
        name: 'General Alarm (Critical)',
        alarmLevel: 'critical',
        soundFile: 'marine_general_alarm.wav',
        volume: 100,
        pattern: 'continuous',
        customizable: false,
      },
      {
        id: 'critical_collision',
        name: 'Collision Alarm',
        alarmLevel: 'critical',
        soundFile: 'marine_collision_alarm.wav',
        volume: 100,
        pattern: 'triple',
        customizable: false,
      },
      {
        id: 'critical_fire',
        name: 'Fire Alarm',
        alarmLevel: 'critical',
        soundFile: 'marine_fire_alarm.wav',
        volume: 100,
        pattern: 'continuous',
        customizable: false,
      },
      {
        id: 'warning_navigation',
        name: 'Navigation Warning',
        alarmLevel: 'warning',
        soundFile: 'marine_navigation_warning.wav',
        volume: 80,
        pattern: 'double',
        customizable: true,
      },
      {
        id: 'warning_engine',
        name: 'Engine Warning',
        alarmLevel: 'warning',
        soundFile: 'marine_engine_warning.wav',
        volume: 75,
        pattern: 'single',
        customizable: true,
      },
      {
        id: 'info_chime',
        name: 'Information Chime',
        alarmLevel: 'info',
        soundFile: 'marine_info_chime.wav',
        volume: 60,
        pattern: 'single',
        customizable: true,
      },
    ];
  }

  /**
   * Process alarm notification with smart management
   */
  public async processAlarmNotification(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): Promise<{
    action: 'immediate' | 'batched' | 'suppressed' | 'escalated';
    urgencyLevel: UrgencyLevel;
    reasoning: string;
  }> {
    // Update vessel context
    if (vesselContext) {
      this.currentVesselContext = vesselContext;
    }

    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(alarm, vesselContext);

    // Check if notification should be suppressed
    if (this.shouldSuppressNotification(alarm, urgencyLevel)) {
      return {
        action: 'suppressed',
        urgencyLevel,
        reasoning: 'Notification suppressed due to Do Not Disturb or quiet hours',
      };
    }

    // Check for immediate actions
    const immediateActions = urgencyLevel.actions.filter(
      (action) => action.type === 'immediate_notify' || action.type === 'bypass_batch',
    );

    if (immediateActions.length > 0) {
      // Send immediately
      await this.sendImmediateNotification(alarm, urgencyLevel, vesselContext);

      // Setup escalation if needed
      this.setupEscalation(alarm, urgencyLevel);

      return {
        action: 'immediate',
        urgencyLevel,
        reasoning: 'High priority alarm requires immediate notification',
      };
    }

    // Check if batching is enabled and appropriate
    if (this.config.batchingEnabled && this.shouldBatchNotification(alarm, urgencyLevel)) {
      await this.addToBatch(alarm, urgencyLevel, vesselContext);

      return {
        action: 'batched',
        urgencyLevel,
        reasoning: 'Notification added to batch to prevent spam',
      };
    }

    // Default: send immediately but with standard processing
    await this.sendImmediateNotification(alarm, urgencyLevel, vesselContext);

    return {
      action: 'immediate',
      urgencyLevel,
      reasoning: 'Standard notification processing',
    };
  }

  /**
   * Determine urgency level for alarm
   */
  private determineUrgencyLevel(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): UrgencyLevel {
    let matchedLevel = this.config.urgencyLevels.find((level) => level.id === 'information'); // Default
    let highestPriority = 0;

    for (const level of this.config.urgencyLevels) {
      if (this.matchesUrgencyConditions(alarm, level.conditions, vesselContext)) {
        if (level.priority > highestPriority) {
          highestPriority = level.priority;
          matchedLevel = level;
        }
      }
    }

    return matchedLevel || this.config.urgencyLevels[this.config.urgencyLevels.length - 1];
  }

  /**
   * Check if alarm matches urgency conditions
   */
  private matchesUrgencyConditions(
    alarm: AlarmNotificationData,
    conditions: UrgencyCondition[],
    vesselContext?: VesselContextData,
  ): boolean {
    return conditions.every((condition) => {
      switch (condition.type) {
        case 'alarm_level':
          return alarm.level === condition.parameters.level;

        case 'source_pattern':
          const patterns = condition.parameters.patterns as string[];
          const source = (alarm.source || '').toLowerCase();
          return patterns.some((pattern) => source.includes(pattern.toLowerCase()));

        case 'value_threshold':
          if (alarm.value === undefined) return false;
          const { operator, threshold } = condition.parameters;
          switch (operator) {
            case 'gt':
              return alarm.value > threshold;
            case 'lt':
              return alarm.value < threshold;
            case 'eq':
              return alarm.value === threshold;
            default:
              return false;
          }

        case 'time_sensitive':
          const { timeWindow } = condition.parameters;
          return Date.now() - alarm.timestamp < timeWindow;

        case 'vessel_state':
          if (!vesselContext) return false;
          const { conditions: stateConditions } = condition.parameters;
          return this.checkVesselState(vesselContext, stateConditions);

        default:
          return false;
      }
    });
  }

  /**
   * Check vessel state conditions
   */
  private checkVesselState(vesselContext: VesselContextData, conditions: string[]): boolean {
    return conditions.some((condition) => {
      switch (condition) {
        case 'underway':
          return (vesselContext.speed || 0) > 1.0; // Moving > 1 knot
        case 'anchored':
          return (vesselContext.speed || 0) < 0.5; // Stationary
        case 'anchored_shallow':
          return (vesselContext.speed || 0) < 0.5 && (vesselContext.depth || 100) < 10;
        case 'deep_water':
          return (vesselContext.depth || 0) > 50;
        case 'shallow_water':
          return (vesselContext.depth || 0) < 10;
        default:
          return false;
      }
    });
  }

  /**
   * Check if notification should be suppressed
   */
  private shouldSuppressNotification(
    alarm: AlarmNotificationData,
    urgencyLevel: UrgencyLevel,
  ): boolean {
    // Check DND bypass
    const hasDndBypass = urgencyLevel.actions.some((action) => action.type === 'bypass_dnd');

    if (hasDndBypass) {
      return false; // Never suppress if has DND bypass
    }

    // Check quiet hours
    if (this.config.quietHours && this.isQuietHours()) {
      if (this.config.dndCriticalOnly && alarm.level === 'critical') {
        return false; // Allow critical alarms during quiet hours
      }
      return true; // Suppress non-critical during quiet hours
    }

    return false;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.config.quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const start = this.parseTimeString(this.config.quietHours.start);
    const end = this.parseTimeString(this.config.quietHours.end);

    if (start <= end) {
      // Same day (e.g., 09:00 - 17:00)
      return currentTime >= start && currentTime <= end;
    } else {
      // Crosses midnight (e.g., 22:00 - 06:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Parse time string to numeric format (HHMM)
   */
  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Check if notification should be batched
   */
  private shouldBatchNotification(
    alarm: AlarmNotificationData,
    urgencyLevel: UrgencyLevel,
  ): boolean {
    // Never batch if explicitly marked for immediate delivery
    if (urgencyLevel.actions.some((action) => action.type === 'bypass_batch')) {
      return false;
    }

    // Never batch critical alarms
    if (alarm.level === 'critical') {
      return false;
    }

    // Use adaptive batching based on user response patterns
    if (this.config.adaptiveBatching && this.config.responsePatternLearning) {
      const pattern = this.responsePatterns.get(alarm.source || 'unknown');
      if (pattern && pattern.averageResponseTime > 60000) {
        // > 1 minute response time
        return true; // User typically responds slowly, safe to batch
      }
    }

    return true; // Default to batching for non-critical alarms
  }

  /**
   * Send immediate notification
   */
  private async sendImmediateNotification(
    alarm: AlarmNotificationData,
    urgencyLevel: UrgencyLevel,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    // This would integrate with the main NotificationManager

    // Apply sound profile based on urgency
    const soundProfile = this.getSoundProfile(alarm, urgencyLevel);
    if (soundProfile) {
      // Sound profile would be applied during actual notification sending
    }

    // Record for response pattern learning
    this.recordNotificationSent(alarm, urgencyLevel);
  }

  /**
   * Add notification to batch
   */
  private async addToBatch(
    alarm: AlarmNotificationData,
    urgencyLevel: UrgencyLevel,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    const batchKey = this.getBatchKey(urgencyLevel);

    let batch = this.pendingBatches.get(batchKey);
    if (!batch) {
      batch = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notifications: [],
        urgencyLevel: urgencyLevel.priority,
        scheduledTime: Date.now() + this.config.batchingDelay,
        vesselContext,
      };
      this.pendingBatches.set(batchKey, batch);
    }

    batch.notifications.push(alarm);

    // Update vessel context with latest
    if (vesselContext) {
      batch.vesselContext = vesselContext;
    }

    // Clear existing timer and set new one
    const existingTimer = this.batchTimers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.sendBatchNotification(batchKey);
    }, this.config.batchingDelay);

    this.batchTimers.set(batchKey, timer);

    // Send immediately if batch is full
    if (batch.notifications.length >= this.config.maxBatchSize) {
      this.sendBatchNotification(batchKey);
    }
  }

  /**
   * Get batch key for grouping notifications
   */
  private getBatchKey(urgencyLevel: UrgencyLevel): string {
    return `urgency_${urgencyLevel.priority}`;
  }

  /**
   * Send batched notifications
   */
  private async sendBatchNotification(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.notifications.length === 0) {
      return;
    }

    // Clear timers and remove from pending
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
    this.pendingBatches.delete(batchKey);

    // This would integrate with the main NotificationManager to send the batch
    // For now, just log the batch summary

    // Record batch sent for learning
    this.recordBatchSent(batch);
  }

  /**
   * Setup escalation for critical alarms
   */
  private setupEscalation(alarm: AlarmNotificationData, urgencyLevel: UrgencyLevel): void {
    const escalateAction = urgencyLevel.actions.find((action) => action.type === 'escalate');
    if (!escalateAction || !this.config.escalationEnabled) {
      return;
    }

    const escalationState: EscalationState = {
      alarmId: alarm.id,
      currentLevel: 1,
      maxLevel: 3, // Default max escalation levels
      lastEscalation: Date.now(),
      acknowledged: false,
    };

    this.escalationStates.set(alarm.id, escalationState);

    const delay = escalateAction.parameters?.delay || this.config.escalationDelay;

    const timer = setTimeout(() => {
      this.escalateAlarm(alarm.id);
    }, delay);

    this.escalationTimers.set(alarm.id, timer);
  }

  /**
   * Escalate alarm to higher urgency level
   */
  private async escalateAlarm(alarmId: string): Promise<void> {
    const escalationState = this.escalationStates.get(alarmId);
    if (
      !escalationState ||
      escalationState.acknowledged ||
      escalationState.currentLevel >= escalationState.maxLevel
    ) {
      return;
    }

    escalationState.currentLevel++;
    escalationState.lastEscalation = Date.now();

    // This would resend the notification with higher urgency
    // and potentially different sound/vibration patterns

    // Setup next escalation if not at max level
    if (escalationState.currentLevel < escalationState.maxLevel) {
      const timer = setTimeout(() => {
        this.escalateAlarm(alarmId);
      }, this.config.escalationDelay);

      this.escalationTimers.set(alarmId, timer);
    }
  }

  /**
   * Acknowledge alarm and stop escalation
   */
  public acknowledgeAlarm(alarmId: string): void {
    const escalationState = this.escalationStates.get(alarmId);
    if (escalationState) {
      escalationState.acknowledged = true;
    }

    const timer = this.escalationTimers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alarmId);
    }
  }

  /**
   * Get appropriate sound profile for alarm
   */
  private getSoundProfile(
    alarm: AlarmNotificationData,
    urgencyLevel: UrgencyLevel,
  ): SoundProfile | null {
    if (!this.config.customSoundsEnabled) {
      return null;
    }

    // Find specific sound profile based on alarm characteristics
    const source = (alarm.source || '').toLowerCase();

    if (source.includes('collision')) {
      return (
        this.config.soundProfiles.find((profile) => profile.id === 'critical_collision') || null
      );
    }

    if (source.includes('fire')) {
      return this.config.soundProfiles.find((profile) => profile.id === 'critical_fire') || null;
    }

    // Default by alarm level
    return this.config.soundProfiles.find((profile) => profile.alarmLevel === alarm.level) || null;
  }

  /**
   * Record notification sent for learning
   */
  private recordNotificationSent(alarm: AlarmNotificationData, urgencyLevel: UrgencyLevel): void {
    if (!this.config.responsePatternLearning) {
      return;
    }

    const source = alarm.source || 'unknown';
    let pattern = this.responsePatterns.get(source);

    if (!pattern) {
      pattern = {
        source,
        totalNotifications: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        responseCount: 0,
        lastNotification: Date.now(),
      };
      this.responsePatterns.set(source, pattern);
    }

    pattern.totalNotifications++;
    pattern.lastNotification = Date.now();
  }

  /**
   * Record batch sent for analysis
   */
  private recordBatchSent(batch: NotificationBatch): void {}

  /**
   * Update smart notification configuration
   */
  public updateConfig(newConfig: Partial<SmartNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get smart notification status and statistics
   */
  public getSmartNotificationStatus(): {
    config: SmartNotificationConfig;
    pendingBatches: number;
    activeEscalations: number;
    responsePatterns: UserResponsePattern[];
  } {
    return {
      config: this.config,
      pendingBatches: this.pendingBatches.size,
      activeEscalations: this.escalationStates.size,
      responsePatterns: Array.from(this.responsePatterns.values()),
    };
  }

  /**
   * Clear all pending notifications and reset state
   */
  public clearPendingNotifications(): void {
    // Clear batch timers
    this.batchTimers.forEach((timer) => clearTimeout(timer));
    this.batchTimers.clear();
    this.pendingBatches.clear();

    // Clear escalation timers
    this.escalationTimers.forEach((timer) => clearTimeout(timer));
    this.escalationTimers.clear();
    this.escalationStates.clear();
  }
}

// Supporting interfaces
interface UserResponsePattern {
  source: string;
  totalNotifications: number;
  totalResponseTime: number;
  averageResponseTime: number;
  responseCount: number;
  lastNotification: number;
}

interface GeofenceConfig {
  id: string;
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  radius?: number; // For circular geofences
  suppressionRules: {
    alarmTypes: string[];
    urgencyLevels: number[];
  };
}

export { SmartNotificationManager };
