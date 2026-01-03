import { AlarmNotificationData } from './NotificationManager';

export interface NotificationTemplate {
  id: string;
  alarmLevel: 'critical' | 'warning' | 'info';
  title: string;
  bodyTemplate: string;
  richContent?: {
    expandedTitle?: string;
    expandedBody?: string;
    imageUrl?: string;
    actions: NotificationActionTemplate[];
  };
  sound?: {
    default: string;
    critical?: string;
    customizable: boolean;
  };
  vibration?: {
    pattern: number[];
    customizable: boolean;
  };
  visual?: {
    icon: string;
    color: string;
    lightColor?: string; // Android only
    badge?: boolean;
  };
}

export interface NotificationActionTemplate {
  id: string;
  title: string;
  type: 'acknowledge' | 'snooze' | 'silence' | 'open_app' | 'navigate' | 'quick_action';
  icon?: string;
  destructive?: boolean;
  requiresAuth?: boolean;
  shortcut?: string; // Keyboard shortcut for desktop
  parameters?: {
    snooze_duration?: number; // minutes
    navigation_target?: string;
    action_command?: string;
  };
}

export interface VesselContextData {
  position?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  heading?: number;
  speed?: number;
  depth?: number;
  windSpeed?: number;
  windDirection?: number;
  engineStatus?: string;
  autopilotStatus?: string;
  timestamp: number;
}

export interface NotificationHistory {
  id: string;
  alarmId: string;
  notificationId: string;
  timestamp: number;
  action?: string;
  response?: 'acknowledged' | 'snoozed' | 'dismissed' | 'opened';
  responseTime?: number; // ms from notification to response
  vesselContext?: VesselContextData;
}

/**
 * Marine-specific notification content manager
 * Handles rich notification templates, actions, and persistence
 */
export class NotificationContentManager {
  private static instance: NotificationContentManager;

  private templates: Map<string, NotificationTemplate> = new Map();
  private history: NotificationHistory[] = [];
  private maxHistorySize = 1000;

  // Action handlers
  private actionHandlers: Map<string, (actionId: string, data: any) => Promise<void>> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
    this.setupActionHandlers();
  }

  public static getInstance(): NotificationContentManager {
    if (!NotificationContentManager.instance) {
      NotificationContentManager.instance = new NotificationContentManager();
    }
    return NotificationContentManager.instance;
  }

  /**
   * Initialize default marine notification templates
   */
  private initializeDefaultTemplates(): void {
    // Critical depth alarm template
    this.templates.set('shallow_water', {
      id: 'shallow_water',
      alarmLevel: 'critical',
      title: '🚨 SHALLOW WATER ALARM',
      bodyTemplate: 'Depth: {value}m - Below threshold {threshold}m',
      richContent: {
        expandedTitle: '⚠️ CRITICAL: Shallow Water Detected',
        expandedBody:
          'Current depth: {value}m is below safe threshold of {threshold}m\\n\\nPosition: {position}\\nTime: {timestamp}\\n\\nIMEDIATE ACTION REQUIRED',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
            icon: 'check',
          },
          {
            id: 'navigate_to_depth',
            title: 'View Depth',
            type: 'navigate',
            icon: 'depth',
            parameters: { navigation_target: 'depth_screen' },
          },
          {
            id: 'silence_5',
            title: 'Silence 5min',
            type: 'silence',
            icon: 'volume_off',
            destructive: true,
            parameters: { snooze_duration: 5 },
          },
        ],
      },
      sound: {
        default: 'marine_depth_alarm.wav',
        critical: 'marine_critical_depth.wav',
        customizable: true,
      },
      vibration: {
        pattern: [0, 500, 200, 500, 200, 500], // Urgent triple burst
        customizable: true,
      },
      visual: {
        icon: 'marine_depth_warning',
        color: '#FF0000',
        lightColor: '#FF0000',
        badge: true,
      },
    });

    // Engine temperature warning template
    this.templates.set('engine_temperature', {
      id: 'engine_temperature',
      alarmLevel: 'warning',
      title: '🌡️ Engine Temperature Warning',
      bodyTemplate: 'Engine temp: {value}°C - Threshold: {threshold}°C',
      richContent: {
        expandedTitle: 'Engine Overheating Warning',
        expandedBody:
          'Engine temperature {value}°C exceeds normal operating threshold of {threshold}°C\\n\\nEngine: {engine_name}\\nCoolant Temp: {coolant_temp}°C\\nOil Pressure: {oil_pressure} psi\\n\\nMonitor engine systems closely.',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
            icon: 'check',
          },
          {
            id: 'view_engine',
            title: 'Engine Details',
            type: 'navigate',
            icon: 'engine',
            parameters: { navigation_target: 'engine_screen' },
          },
          {
            id: 'snooze_10',
            title: 'Snooze 10min',
            type: 'snooze',
            icon: 'snooze',
            parameters: { snooze_duration: 10 },
          },
        ],
      },
      sound: {
        default: 'marine_engine_warning.wav',
        customizable: true,
      },
      vibration: {
        pattern: [0, 300, 150, 300], // Double pulse
        customizable: true,
      },
      visual: {
        icon: 'marine_engine_warning',
        color: '#FF8C00',
        lightColor: '#FF8C00',
        badge: true,
      },
    });

    // GPS/Navigation warning template
    this.templates.set('gps_signal_loss', {
      id: 'gps_signal_loss',
      alarmLevel: 'warning',
      title: '📡 GPS Signal Lost',
      bodyTemplate: 'GPS signal lost - Last fix: {last_fix_time}',
      richContent: {
        expandedTitle: 'Navigation Warning: GPS Signal Lost',
        expandedBody:
          'GPS signal lost at {timestamp}\\n\\nLast known position:\\n{last_position}\\nLast fix: {last_fix_time}\\nSatellites: {satellite_count}\\n\\nEnsure clear sky view and check antenna connection.',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
            icon: 'check',
          },
          {
            id: 'view_gps',
            title: 'GPS Status',
            type: 'navigate',
            icon: 'gps',
            parameters: { navigation_target: 'gps_screen' },
          },
          {
            id: 'retry_gps',
            title: 'Retry GPS',
            type: 'quick_action',
            icon: 'refresh',
            parameters: { action_command: 'restart_gps' },
          },
        ],
      },
      sound: {
        default: 'marine_gps_warning.wav',
        customizable: true,
      },
      vibration: {
        pattern: [0, 200, 100, 200, 100, 200], // Triple short pulse
        customizable: true,
      },
      visual: {
        icon: 'marine_gps_warning',
        color: '#FFA500',
        lightColor: '#FFA500',
        badge: true,
      },
    });

    // Battery low warning template
    this.templates.set('battery_low', {
      id: 'battery_low',
      alarmLevel: 'info',
      title: '🔋 Battery Low Warning',
      bodyTemplate: 'Battery: {value}V - Threshold: {threshold}V',
      richContent: {
        expandedTitle: 'Electrical System Alert',
        expandedBody:
          'Battery voltage {value}V is below recommended threshold of {threshold}V\\n\\nBattery Bank: {bank_name}\\nCharge Rate: {charge_rate}A\\nLoad: {current_load}A\\n\\nConsider reducing electrical load or starting engine to charge.',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
            icon: 'check',
          },
          {
            id: 'view_electrical',
            title: 'Electrical',
            type: 'navigate',
            icon: 'battery',
            parameters: { navigation_target: 'electrical_screen' },
          },
          {
            id: 'dismiss',
            title: 'Dismiss',
            type: 'acknowledge',
            icon: 'dismiss',
          },
        ],
      },
      sound: {
        default: 'marine_battery_warning.wav',
        customizable: true,
      },
      vibration: {
        pattern: [0, 150], // Single gentle pulse
        customizable: true,
      },
      visual: {
        icon: 'marine_battery_warning',
        color: '#FFD700',
        lightColor: '#FFD700',
        badge: false,
      },
    });

    // System info template
    this.templates.set('system_info', {
      id: 'system_info',
      alarmLevel: 'info',
      title: 'ℹ️ Marine System Info',
      bodyTemplate: '{message}',
      richContent: {
        expandedTitle: 'Marine Instruments Information',
        expandedBody: '{message}\\n\\nTime: {timestamp}\\nSystem Status: Normal',
        actions: [
          {
            id: 'dismiss',
            title: 'Dismiss',
            type: 'acknowledge',
            icon: 'dismiss',
          },
          {
            id: 'open_app',
            title: 'Open App',
            type: 'open_app',
            icon: 'launch',
          },
        ],
      },
      sound: {
        default: 'marine_info_chime.wav',
        customizable: true,
      },
      vibration: {
        pattern: [0, 100], // Very gentle pulse
        customizable: false,
      },
      visual: {
        icon: 'marine_info',
        color: '#0080FF',
        lightColor: '#0080FF',
        badge: false,
      },
    });
  }

  /**
   * Setup notification action handlers
   */
  private setupActionHandlers(): void {
    this.actionHandlers.set('acknowledge', this.handleAcknowledge.bind(this));
    this.actionHandlers.set('snooze', this.handleSnooze.bind(this));
    this.actionHandlers.set('silence', this.handleSilence.bind(this));
    this.actionHandlers.set('navigate', this.handleNavigate.bind(this));
    this.actionHandlers.set('open_app', this.handleOpenApp.bind(this));
    this.actionHandlers.set('quick_action', this.handleQuickAction.bind(this));
  }

  /**
   * Generate rich notification content for alarm
   */
  public generateNotificationContent(
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): {
    title: string;
    body: string;
    richContent?: any;
    template: NotificationTemplate;
  } {
    // Find appropriate template based on alarm source or create generic
    const template = this.findTemplate(alarm) || this.createGenericTemplate(alarm);

    // Generate title and body with dynamic content
    const title = this.processTemplate(template.title, alarm, vesselContext);
    const body = this.processTemplate(template.bodyTemplate, alarm, vesselContext);

    // Generate rich content if supported
    let richContent;
    if (template.richContent) {
      richContent = {
        expandedTitle: this.processTemplate(
          template.richContent.expandedTitle || template.title,
          alarm,
          vesselContext,
        ),
        expandedBody: this.processTemplate(
          template.richContent.expandedBody || template.bodyTemplate,
          alarm,
          vesselContext,
        ),
        imageUrl: template.richContent.imageUrl,
        actions: template.richContent.actions.map((action) => ({
          ...action,
          title: this.processTemplate(action.title, alarm, vesselContext),
        })),
      };
    }

    return {
      title,
      body,
      richContent,
      template,
    };
  }

  /**
   * Find appropriate template for alarm
   */
  private findTemplate(alarm: AlarmNotificationData): NotificationTemplate | null {
    // Match by source/type patterns
    const source = (alarm.source || '').toLowerCase();

    if (source.includes('depth') || source.includes('shallow')) {
      return this.templates.get('shallow_water') || null;
    }

    if (source.includes('engine') && source.includes('temp')) {
      return this.templates.get('engine_temperature') || null;
    }

    if (source.includes('gps') || source.includes('navigation')) {
      return this.templates.get('gps_signal_loss') || null;
    }

    if (source.includes('battery') || source.includes('voltage')) {
      return this.templates.get('battery_low') || null;
    }

    // Default by alarm level
    if (alarm.level === 'info') {
      return this.templates.get('system_info') || null;
    }

    return null;
  }

  /**
   * Create generic template for unknown alarm types
   */
  private createGenericTemplate(alarm: AlarmNotificationData): NotificationTemplate {
    const levelEmoji = alarm.level === 'critical' ? '🚨' : alarm.level === 'warning' ? '⚠️' : 'ℹ️';

    return {
      id: 'generic_' + alarm.level,
      alarmLevel: alarm.level,
      title: `${levelEmoji} Marine ${alarm.level.toUpperCase()} Alarm`,
      bodyTemplate: '{message}',
      richContent: {
        expandedTitle: `Marine ${alarm.level.charAt(0).toUpperCase() + alarm.level.slice(1)} Alert`,
        expandedBody: '{message}\\n\\nSource: {source}\\nTime: {timestamp}',
        actions: [
          {
            id: 'acknowledge',
            title: 'Acknowledge',
            type: 'acknowledge',
            icon: 'check',
          },
          {
            id: 'open_app',
            title: 'Open App',
            type: 'open_app',
            icon: 'launch',
          },
        ],
      },
      sound: {
        default: `marine_${alarm.level}_alarm.wav`,
        customizable: true,
      },
      vibration: {
        pattern: alarm.level === 'critical' ? [0, 500, 200, 500] : [0, 300],
        customizable: true,
      },
      visual: {
        icon: 'marine_generic_alarm',
        color:
          alarm.level === 'critical'
            ? '#FF0000'
            : alarm.level === 'warning'
            ? '#FFA500'
            : '#0080FF',
        badge: alarm.level !== 'info',
      },
    };
  }

  /**
   * Process template strings with dynamic data
   */
  private processTemplate(
    template: string,
    alarm: AlarmNotificationData,
    vesselContext?: VesselContextData,
  ): string {
    let processed = template;

    // Replace alarm data placeholders
    processed = processed.replace(/{message}/g, alarm.message);
    processed = processed.replace(/{value}/g, alarm.value?.toString() || 'N/A');
    processed = processed.replace(/{threshold}/g, alarm.threshold?.toString() || 'N/A');
    processed = processed.replace(/{source}/g, alarm.source || 'Unknown');
    processed = processed.replace(/{timestamp}/g, new Date(alarm.timestamp).toLocaleString());

    // Replace vessel context placeholders
    if (vesselContext) {
      if (vesselContext.position) {
        const position = `${vesselContext.position.latitude.toFixed(
          5,
        )}, ${vesselContext.position.longitude.toFixed(5)}`;
        processed = processed.replace(/{position}/g, position);
      }

      processed = processed.replace(/{heading}/g, vesselContext.heading?.toFixed(0) || 'N/A');
      processed = processed.replace(/{speed}/g, vesselContext.speed?.toFixed(1) || 'N/A');
      processed = processed.replace(/{depth}/g, vesselContext.depth?.toFixed(1) || 'N/A');
      processed = processed.replace(/{wind_speed}/g, vesselContext.windSpeed?.toFixed(1) || 'N/A');
      processed = processed.replace(
        /{wind_direction}/g,
        vesselContext.windDirection?.toFixed(0) || 'N/A',
      );
      processed = processed.replace(/{engine_status}/g, vesselContext.engineStatus || 'N/A');
      processed = processed.replace(/{autopilot_status}/g, vesselContext.autopilotStatus || 'N/A');
    }

    // Replace any remaining placeholders with fallback
    processed = processed.replace(/{[^}]+}/g, 'N/A');

    return processed;
  }

  /**
   * Handle notification action responses
   */
  public async handleNotificationAction(
    actionId: string,
    notificationData: any,
    vesselContext?: VesselContextData,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Find action handler
      const actionType = this.getActionType(actionId);
      const handler = this.actionHandlers.get(actionType);

      if (!handler) {
        console.warn(`[Notification Content] No handler for action: ${actionId}`);
        return;
      }

      // Execute action handler
      await handler(actionId, notificationData);

      // Record action in history
      this.recordActionHistory(actionId, notificationData, startTime, vesselContext);
    } catch (error) {
      console.error(`[Notification Content] Action handler error for ${actionId}:`, error);
    }
  }

  /**
   * Get action type from action ID
   */
  private getActionType(actionId: string): string {
    if (actionId.startsWith('acknowledge')) return 'acknowledge';
    if (actionId.startsWith('snooze') || actionId.startsWith('silence')) return 'snooze';
    if (actionId.startsWith('navigate') || actionId.startsWith('view')) return 'navigate';
    if (actionId === 'open_app' || actionId === 'open') return 'open_app';
    if (actionId.startsWith('retry') || actionId.startsWith('restart')) return 'quick_action';

    return 'acknowledge'; // Default fallback
  }

  /**
   * Handle acknowledge action
   */
  private async handleAcknowledge(actionId: string, data: any): Promise<void> {
    const alarmId = data.alarmId || data.alarm_id;

    if (alarmId) {
      // TODO: Integrate with alarm store to acknowledge alarm
      // Placeholder for alarm store integration:
      // const alarmStore = useAlarmStore.getState();
      // alarmStore.acknowledgeAlarm(alarmId, 'notification_action');
    }
  }

  /**
   * Handle snooze/silence action
   */
  private async handleSnooze(actionId: string, data: any): Promise<void> {
    const duration = this.getSnoozeDuration(actionId);
    const alarmId = data.alarmId || data.alarm_id;

    // TODO: Implement snooze functionality in alarm system
    // This would temporarily suppress the alarm for the specified duration
  }

  /**
   * Handle silence action (alias for snooze)
   */
  private async handleSilence(actionId: string, data: any): Promise<void> {
    await this.handleSnooze(actionId, data);
  }

  /**
   * Handle navigation action
   */
  private async handleNavigate(actionId: string, data: any): Promise<void> {
    const target = this.getNavigationTarget(actionId, data);

    // TODO: Implement navigation routing
    // This would use React Navigation to navigate to the specified screen
    // Example: navigation.navigate(target);
  }

  /**
   * Handle open app action
   */
  private async handleOpenApp(actionId: string, data: any): Promise<void> {
    // TODO: Implement deep linking to appropriate screen
    // This would bring the app to foreground and navigate to relevant screen
  }

  /**
   * Handle quick action
   */
  private async handleQuickAction(actionId: string, data: any): Promise<void> {
    if (actionId.includes('restart_gps')) {
      // TODO: Implement GPS restart
    }

    // Add other quick actions as needed
  }

  /**
   * Get snooze duration from action ID
   */
  private getSnoozeDuration(actionId: string): number {
    const match = actionId.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5; // Default 5 minutes
  }

  /**
   * Get navigation target from action
   */
  private getNavigationTarget(actionId: string, data: any): string {
    // Check for explicit navigation target in data
    if (data.navigation_target) {
      return data.navigation_target;
    }

    // Infer from action ID
    if (actionId.includes('depth')) return 'depth_screen';
    if (actionId.includes('engine')) return 'engine_screen';
    if (actionId.includes('gps')) return 'gps_screen';
    if (actionId.includes('electrical') || actionId.includes('battery')) return 'electrical_screen';

    return 'dashboard'; // Default fallback
  }

  /**
   * Record action in notification history
   */
  private recordActionHistory(
    actionId: string,
    notificationData: any,
    startTime: number,
    vesselContext?: VesselContextData,
  ): void {
    const historyEntry: NotificationHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alarmId: notificationData.alarmId || notificationData.alarm_id,
      notificationId: notificationData.notificationId || 'unknown',
      timestamp: Date.now(),
      action: actionId,
      response: this.mapActionToResponse(actionId),
      responseTime: Date.now() - startTime,
      vesselContext,
    };

    this.history.push(historyEntry);

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Map action ID to response type
   */
  private mapActionToResponse(
    actionId: string,
  ): 'acknowledged' | 'snoozed' | 'dismissed' | 'opened' {
    if (actionId.includes('acknowledge')) return 'acknowledged';
    if (actionId.includes('snooze') || actionId.includes('silence')) return 'snoozed';
    if (actionId.includes('dismiss')) return 'dismissed';
    if (actionId.includes('open') || actionId.includes('navigate')) return 'opened';

    return 'acknowledged'; // Default
  }

  /**
   * Get notification history for analysis
   */
  public getNotificationHistory(limit?: number): NotificationHistory[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get notification response analytics
   */
  public getResponseAnalytics(): {
    totalNotifications: number;
    averageResponseTime: number;
    responseTypeDistribution: Record<string, number>;
    mostCommonActions: { action: string; count: number }[];
  } {
    const totalNotifications = this.history.length;

    if (totalNotifications === 0) {
      return {
        totalNotifications: 0,
        averageResponseTime: 0,
        responseTypeDistribution: {},
        mostCommonActions: [],
      };
    }

    const responseTimes = this.history.filter((h) => h.responseTime).map((h) => h.responseTime!);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const responseTypeDistribution: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    this.history.forEach((entry) => {
      if (entry.response) {
        responseTypeDistribution[entry.response] =
          (responseTypeDistribution[entry.response] || 0) + 1;
      }
      if (entry.action) {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      }
    });

    const mostCommonActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      totalNotifications,
      averageResponseTime: Math.round(averageResponseTime),
      responseTypeDistribution,
      mostCommonActions,
    };
  }

  /**
   * Add custom notification template
   */
  public addCustomTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Clear notification history
   */
  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Export notification history for analysis
   */
  public exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }
}
