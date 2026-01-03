/**
 * SmartAlarmManager - Main orchestrator for intelligent alarm management
 * Coordinates grouping, priority management, context detection, learning, and maintenance
 */

import { useAlarmStore, Alarm, AlarmLevel, AlarmThreshold } from '../../store/alarmStore';
import { AlarmGroupingEngine, AlarmGroup, MarineSystemCategory } from './AlarmGroupingEngine';
import {
  PriorityQueueManager,
  PriorityQueueEntry,
  VesselContext,
  QueueConfiguration,
} from './PriorityQueueManager';
import { VesselContextDetector, NmeaDataSnapshot } from './VesselContextDetector';
import { AdaptiveLearningEngine, AlarmInteraction, LearnedPattern } from './AdaptiveLearningEngine';
import { MaintenanceScheduler, MaintenanceAlarm, MaintenanceItem } from './MaintenanceScheduler';
import { CriticalAlarmType } from './types';

/**
 * Smart alarm system configuration
 */
export interface SmartAlarmConfiguration {
  // Feature toggles
  groupingEnabled: boolean;
  priorityQueueEnabled: boolean;
  contextDetectionEnabled: boolean;
  adaptiveLearningEnabled: boolean;
  maintenanceIntegrationEnabled: boolean;

  // Performance settings
  processAlarmsBatchSize: number;
  contextUpdateInterval: number; // milliseconds
  learningUpdateInterval: number; // milliseconds

  // Marine safety settings
  criticalAlarmBypass: boolean; // Critical alarms bypass all smart features
  marineSafetyCompliance: boolean; // Enforce marine safety standards
  maxResponseTime: number; // Maximum processing time for critical alarms (ms)

  // Integration settings
  nmeaDataSource?: string; // NMEA data integration endpoint
  maintenanceIntegration?: boolean;
  autopilotIntegration?: boolean;

  // User experience
  smartSuppression: boolean; // Suppress redundant/learned false alarms
  contextualFiltering: boolean; // Filter alarms based on vessel context
  intelligentGrouping: boolean; // Group related alarms for better UX

  // Monitoring and debugging
  performanceMonitoring: boolean;
  debugLogging: boolean;
  statisticsCollection: boolean;
}

/**
 * Processed alarm with smart enhancements
 */
export interface ProcessedAlarm extends Alarm {
  // Smart processing results
  smartSuppressed: boolean;
  suppressionReason?: string;
  suppressionConfidence?: number;

  // Grouping information
  groupId?: string;
  groupCategory?: MarineSystemCategory;
  isGroupRepresentative?: boolean; // Main alarm representing a group

  // Priority and queue information
  smartPriority: number;
  queuePosition?: number;
  estimatedDisplayTime?: number;

  // Context awareness
  contextRelevance: number; // 0-1 relevance to current context
  vesselContext: VesselContext;

  // Learning insights
  falseAlarmProbability?: number; // 0-1 probability this is a false alarm
  adaptiveThreshold?: number; // Adjusted threshold if learning applied

  // Maintenance correlation
  relatedMaintenance?: string[]; // IDs of related maintenance items

  // Processing metadata
  processingTime: number; // Milliseconds spent processing
  smartFeaturesApplied: string[]; // List of applied smart features
  originalAlarm: Alarm; // Reference to original alarm
}

/**
 * Smart alarm system statistics
 */
export interface SmartAlarmStats {
  // Processing statistics
  totalAlarms: number;
  processedAlarms: number;
  suppressedAlarms: number;
  groupedAlarms: number;

  // Performance metrics
  averageProcessingTime: number;
  maxProcessingTime: number;
  responseTimes: {
    critical: number;
    warning: number;
    info: number;
  };

  // Learning effectiveness
  falseAlarmReduction: number; // Percentage reduction
  learningAccuracy: number; // How accurate suppression predictions are
  userOverrideRate: number; // How often users override smart decisions

  // Context detection
  contextConfidence: number; // Average confidence in context detection
  contextChanges: number; // How often context changes

  // Maintenance integration
  maintenanceAlarmsGenerated: number;
  maintenanceCompleted: number;
  predictiveMaintenanceHits: number; // Successful predictions

  // System health
  lastUpdated: number;
  componentStatus: {
    groupingEngine: 'healthy' | 'degraded' | 'failed';
    priorityQueue: 'healthy' | 'degraded' | 'failed';
    contextDetection: 'healthy' | 'degraded' | 'failed';
    adaptiveLearning: 'healthy' | 'degraded' | 'failed';
    maintenance: 'healthy' | 'degraded' | 'failed';
  };
}

/**
 * Main smart alarm management orchestrator
 */
export class SmartAlarmManager {
  private config: SmartAlarmConfiguration;
  private alarmStore = useAlarmStore.getState();

  // Smart components
  private groupingEngine!: AlarmGroupingEngine;
  private priorityQueue!: PriorityQueueManager;
  private contextDetector!: VesselContextDetector;
  private learningEngine!: AdaptiveLearningEngine;
  private maintenanceScheduler!: MaintenanceScheduler;

  // State management
  private isProcessing = false;
  private currentContext!: VesselContext;
  private lastNmeaData?: NmeaDataSnapshot;
  private pendingAlarms: Alarm[] = [];
  private processedAlarms: Map<string, ProcessedAlarm> = new Map();

  // Performance monitoring
  private stats!: SmartAlarmStats;
  private processingQueue: { alarm: Alarm; startTime: number }[] = [];

  // Timers and intervals
  private contextUpdateTimer?: NodeJS.Timeout;
  private learningUpdateTimer?: NodeJS.Timeout;
  private maintenanceCheckTimer?: NodeJS.Timeout;
  private statsUpdateTimer?: NodeJS.Timeout;

  // Event callbacks
  private onAlarmProcessed?: (processed: ProcessedAlarm) => void;
  private onGroupCreated?: (group: AlarmGroup) => void;
  private onMaintenanceAlarm?: (alarm: MaintenanceAlarm) => void;
  private onCriticalAlarmDelayed?: (alarm: Alarm, delay: number) => void;

  constructor(config?: Partial<SmartAlarmConfiguration>) {
    this.config = {
      // Feature flags
      groupingEnabled: true,
      priorityQueueEnabled: true,
      contextDetectionEnabled: true,
      adaptiveLearningEnabled: true,
      maintenanceIntegrationEnabled: true,

      // Performance
      processAlarmsBatchSize: 10,
      contextUpdateInterval: 5000, // 5 seconds
      learningUpdateInterval: 30000, // 30 seconds

      // Marine safety
      criticalAlarmBypass: true,
      marineSafetyCompliance: true,
      maxResponseTime: 500, // 500ms for critical alarms

      // Integration
      maintenanceIntegration: true,
      autopilotIntegration: false,

      // UX
      smartSuppression: true,
      contextualFiltering: true,
      intelligentGrouping: true,

      // Monitoring
      performanceMonitoring: true,
      debugLogging: false,
      statisticsCollection: true,

      ...config,
    };

    this.initializeComponents();
    this.initializeStats();
    this.startPeriodicTasks();
    this.subscribeToAlarmStore();
  }

  /**
   * Process new alarm through smart alarm system
   */
  public async processAlarm(alarm: Alarm): Promise<ProcessedAlarm> {
    const startTime = performance.now();

    try {
      // Critical alarm bypass for marine safety
      if (this.config.criticalAlarmBypass && alarm.level === 'critical') {
        return this.processCriticalAlarmFast(alarm, startTime);
      }

      // Add to processing queue
      this.processingQueue.push({ alarm, startTime });

      // Update statistics
      this.stats.totalAlarms++;

      // Initialize processed alarm
      const processed: ProcessedAlarm = {
        ...alarm,
        smartSuppressed: false,
        smartPriority: 0,
        contextRelevance: 1.0,
        vesselContext: this.currentContext,
        processingTime: 0,
        smartFeaturesApplied: [],
        originalAlarm: { ...alarm },
      };

      // Apply smart features in order
      await this.applySmartFeatures(processed);

      // Calculate final processing time
      processed.processingTime = performance.now() - startTime;

      // Update statistics
      this.updateProcessingStats(processed);

      // Store processed alarm
      this.processedAlarms.set(alarm.id, processed);

      // Trigger callbacks
      if (this.onAlarmProcessed) {
        this.onAlarmProcessed(processed);
      }

      this.log(`SmartAlarmManager: Processed alarm ${alarm.id}`, {
        processingTime: processed.processingTime,
        featuresApplied: processed.smartFeaturesApplied,
        suppressed: processed.smartSuppressed,
        priority: processed.smartPriority,
      });

      return processed;
    } catch (error) {
      console.error('SmartAlarmManager: Error processing alarm', {
        alarmId: alarm.id,
        error: error instanceof Error ? error.message : error,
      });

      // Return fallback processed alarm
      return this.createFallbackProcessedAlarm(alarm, startTime);
    }
  }

  /**
   * Update NMEA data for context detection
   */
  public updateNmeaData(nmeaData: Partial<NmeaDataSnapshot>): void {
    this.lastNmeaData = {
      ...this.lastNmeaData,
      ...nmeaData,
      timestamp: Date.now(),
    };

    // Update context if detection enabled
    if (this.config.contextDetectionEnabled) {
      this.currentContext = this.contextDetector.updateWithNmeaData(this.lastNmeaData);
    }

    // Update maintenance tracking
    if (this.config.maintenanceIntegrationEnabled) {
      this.maintenanceScheduler.updateEngineUsage(nmeaData, this.currentContext);
    }
  }

  /**
   * Record user interaction for learning
   */
  public recordUserInteraction(
    alarmId: string,
    action: 'acknowledged' | 'dismissed' | 'ignored' | 'escalated',
    responseTime: number,
    userFeedback?: string,
  ): void {
    const processedAlarm = this.processedAlarms.get(alarmId);

    if (!processedAlarm || !this.config.adaptiveLearningEnabled) {
      return;
    }

    // Record interaction for learning
    this.learningEngine.recordInteraction(
      processedAlarm.originalAlarm,
      action,
      responseTime,
      processedAlarm.vesselContext,
      this.lastNmeaData,
      userFeedback,
    );

    // Handle user overrides of smart decisions
    if (processedAlarm.smartSuppressed && action === 'escalated') {
      this.learningEngine.recordUserOverride(
        alarmId,
        'force_show',
        'User escalated suppressed alarm',
      );
      this.stats.userOverrideRate = (this.stats.userOverrideRate + 1) / 2; // Rolling average
    }

    this.log(`SmartAlarmManager: Recorded user interaction`, {
      alarmId,
      action,
      responseTime,
      wasSuppressed: processedAlarm.smartSuppressed,
    });
  }

  /**
   * Get current smart alarm statistics
   */
  public getStatistics(): SmartAlarmStats {
    return { ...this.stats };
  }

  /**
   * Get grouped alarms for display
   */
  public getGroupedAlarms(): AlarmGroup[] {
    if (!this.config.groupingEnabled) {
      return [];
    }

    const activeAlarms = Array.from(this.processedAlarms.values())
      .filter((alarm) => !alarm.smartSuppressed)
      .map((processed) => processed.originalAlarm);

    return this.groupingEngine.processAlarms(activeAlarms);
  }

  /**
   * Get priority queue for display
   */
  public getPriorityQueue(): {
    critical: PriorityQueueEntry[];
    warning: PriorityQueueEntry[];
    info: PriorityQueueEntry[];
  } {
    if (!this.config.priorityQueueEnabled) {
      return { critical: [], warning: [], info: [] };
    }

    // Return mock structure for now - would implement getQueueSnapshot method
    return { critical: [], warning: [], info: [] };
  }

  /**
   * Get maintenance alarms
   */
  public getMaintenanceAlarms(): MaintenanceAlarm[] {
    if (!this.config.maintenanceIntegrationEnabled) {
      return [];
    }

    return this.maintenanceScheduler.checkMaintenanceAlarms(this.currentContext);
  }

  /**
   * Complete maintenance task
   */
  public completeMaintenance(
    maintenanceId: string,
    actualTime?: number,
    notes?: string,
  ): { success: boolean; message: string } {
    if (!this.config.maintenanceIntegrationEnabled) {
      return { success: false, message: 'Maintenance integration disabled' };
    }

    return this.maintenanceScheduler.completeMaintenance(maintenanceId, actualTime, notes);
  }

  /**
   * Get learning insights and recommendations
   */
  public getLearningInsights(): {
    stats: ReturnType<AdaptiveLearningEngine['getLearningStats']>;
    patterns: LearnedPattern[];
    recommendations: string[];
  } {
    if (!this.config.adaptiveLearningEnabled) {
      return {
        stats: {
          totalInteractions: 0,
          totalPatterns: 0,
          totalAdjustments: 0,
          falsePositiveReduction: 0,
          patternConfidence: 0,
          lastAnalysis: 0,
        },
        patterns: [],
        recommendations: [],
      };
    }

    const stats = this.learningEngine.getLearningStats();
    const exportData = this.learningEngine.exportLearningData();

    // Generate recommendations based on learning
    const recommendations: string[] = [];

    if (stats.falsePositiveReduction > 0.2) {
      recommendations.push(
        `Smart learning has reduced false alarms by ${Math.round(
          stats.falsePositiveReduction * 100,
        )}%`,
      );
    }

    if (stats.patternConfidence > 0.8 && stats.totalPatterns > 5) {
      recommendations.push(
        `${stats.totalPatterns} learned patterns are helping optimize alarm management`,
      );
    }

    if (stats.totalInteractions > 50 && stats.falsePositiveReduction < 0.1) {
      recommendations.push(
        'Consider reviewing alarm thresholds - learning system may need more training data',
      );
    }

    return {
      stats,
      patterns: exportData.patterns,
      recommendations,
    };
  }

  /**
   * Configure smart alarm system
   */
  public updateConfiguration(updates: Partial<SmartAlarmConfiguration>): void {
    this.config = { ...this.config, ...updates };

    // Reinitialize components if needed
    if (updates.groupingEnabled !== undefined) {
      this.groupingEngine = new AlarmGroupingEngine();
    }

    if (updates.priorityQueueEnabled !== undefined) {
      // Reinitialize priority queue with new config
      this.priorityQueue = new PriorityQueueManager({
        contextFiltering: this.config.contextualFiltering,
        marineSafetyBypass: this.config.criticalAlarmBypass,
        maxSize: 100,
      } as Partial<QueueConfiguration>);
    }

    this.log('SmartAlarmManager: Configuration updated', updates);
  }

  /**
   * Export smart alarm data for analysis
   */
  public exportSmartData(): {
    configuration: SmartAlarmConfiguration;
    statistics: SmartAlarmStats;
    learningData: ReturnType<AdaptiveLearningEngine['exportLearningData']>;
    maintenanceData: ReturnType<MaintenanceScheduler['exportMaintenanceData']>;
    processedAlarms: ProcessedAlarm[];
    exportTimestamp: string;
  } {
    return {
      configuration: { ...this.config },
      statistics: { ...this.stats },
      learningData: this.learningEngine.exportLearningData(),
      maintenanceData: this.maintenanceScheduler.exportMaintenanceData(),
      processedAlarms: Array.from(this.processedAlarms.values()),
      exportTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset smart alarm learning (for debugging/fresh start)
   */
  public async resetLearning(): Promise<void> {
    if (this.config.adaptiveLearningEnabled) {
      await this.learningEngine.resetLearning();
      this.log('SmartAlarmManager: Learning data reset');
    }
  }

  // Private implementation methods

  private initializeComponents(): void {
    // Initialize all smart components
    this.groupingEngine = new AlarmGroupingEngine();

    this.priorityQueue = new PriorityQueueManager({
      contextFiltering: this.config.contextualFiltering,
      marineSafetyBypass: this.config.criticalAlarmBypass,
      maxSize: 100,
    } as Partial<QueueConfiguration>);

    this.contextDetector = new VesselContextDetector();

    this.learningEngine = new AdaptiveLearningEngine({
      enabled: this.config.adaptiveLearningEnabled,
    });

    this.maintenanceScheduler = new MaintenanceScheduler({
      enabled: this.config.maintenanceIntegrationEnabled,
    });

    // Initialize current context
    this.currentContext = {
      state: 'unknown',
      weather: 'unknown',
      timeOfDay: 'day',
      operatingMode: 'normal',
      crewOnWatch: true,
      confidence: 0.5,
    };
  }

  private initializeStats(): void {
    this.stats = {
      totalAlarms: 0,
      processedAlarms: 0,
      suppressedAlarms: 0,
      groupedAlarms: 0,

      averageProcessingTime: 0,
      maxProcessingTime: 0,
      responseTimes: {
        critical: 0,
        warning: 0,
        info: 0,
      },

      falseAlarmReduction: 0,
      learningAccuracy: 0,
      userOverrideRate: 0,

      contextConfidence: 0.5,
      contextChanges: 0,

      maintenanceAlarmsGenerated: 0,
      maintenanceCompleted: 0,
      predictiveMaintenanceHits: 0,

      lastUpdated: Date.now(),
      componentStatus: {
        groupingEngine: 'healthy',
        priorityQueue: 'healthy',
        contextDetection: 'healthy',
        adaptiveLearning: 'healthy',
        maintenance: 'healthy',
      },
    };
  }

  private async applySmartFeatures(processed: ProcessedAlarm): Promise<void> {
    const startTime = performance.now();

    // 1. Context Detection (if enabled)
    if (this.config.contextDetectionEnabled && this.lastNmeaData) {
      processed.vesselContext = this.contextDetector.updateWithNmeaData(this.lastNmeaData);
      processed.contextRelevance = this.calculateContextRelevance(processed);
      processed.smartFeaturesApplied.push('contextDetection');
    }

    // 2. Adaptive Learning - Check for suppression (if enabled)
    if (this.config.adaptiveLearningEnabled && this.config.smartSuppression) {
      const suppressionResult = this.learningEngine.shouldSuppressAlarm(
        processed.originalAlarm,
        processed.vesselContext,
        this.lastNmeaData,
      );

      if (suppressionResult.suppress) {
        processed.smartSuppressed = true;
        processed.suppressionReason = suppressionResult.reason;
        processed.suppressionConfidence = suppressionResult.confidence;
        processed.smartFeaturesApplied.push('adaptiveSuppression');

        this.stats.suppressedAlarms++;
      }

      // Get adaptive threshold adjustment
      const thresholdAdjustment = this.learningEngine.getThresholdAdjustment(
        processed.source || processed.message,
        processed.vesselContext,
        this.lastNmeaData,
      );

      if (thresholdAdjustment.adjustment !== 1.0) {
        processed.adaptiveThreshold = (processed.threshold || 0) * thresholdAdjustment.adjustment;
        processed.smartFeaturesApplied.push('adaptiveThreshold');
      }

      // Set false alarm probability
      processed.falseAlarmProbability = suppressionResult.suppress
        ? suppressionResult.confidence
        : 0;
    }

    // 3. Priority Calculation (if enabled and not suppressed)
    if (this.config.priorityQueueEnabled && !processed.smartSuppressed) {
      processed.smartPriority = this.calculateSmartPriority(processed);

      // Priority queue integration would be implemented with proper API
      // For now, just log that priority processing would occur

      processed.smartFeaturesApplied.push('priorityQueue');
    }

    // 4. Grouping (if enabled and not suppressed)
    if (
      this.config.groupingEnabled &&
      this.config.intelligentGrouping &&
      !processed.smartSuppressed
    ) {
      // Group processing happens at display level, just mark for grouping
      processed.smartFeaturesApplied.push('groupingReady');
    }

    // 5. Maintenance Correlation (if enabled)
    if (this.config.maintenanceIntegrationEnabled) {
      processed.relatedMaintenance = this.findRelatedMaintenance(processed);

      if (processed.relatedMaintenance && processed.relatedMaintenance.length > 0) {
        processed.smartFeaturesApplied.push('maintenanceCorrelation');

        // Update maintenance condition tracking
        this.maintenanceScheduler.updateMaintenanceConditions(processed.originalAlarm);
      }
    }

    // 6. Performance validation
    const processingTime = performance.now() - startTime;

    if (processed.level === 'critical' && processingTime > this.config.maxResponseTime) {
      console.warn('SmartAlarmManager: Critical alarm processing exceeded max response time', {
        alarmId: processed.id,
        processingTime,
        maxResponseTime: this.config.maxResponseTime,
      });

      if (this.onCriticalAlarmDelayed) {
        this.onCriticalAlarmDelayed(processed.originalAlarm, processingTime);
      }
    }
  }

  private processCriticalAlarmFast(alarm: Alarm, startTime: number): ProcessedAlarm {
    // Fast path for critical alarms - minimal processing
    const processed: ProcessedAlarm = {
      ...alarm,
      smartSuppressed: false,
      smartPriority: 1000, // Maximum priority
      contextRelevance: 1.0,
      vesselContext: this.currentContext,
      processingTime: performance.now() - startTime,
      smartFeaturesApplied: ['criticalBypass'],
      originalAlarm: { ...alarm },
    };

    // Only apply essential features for critical alarms
    if (this.config.priorityQueueEnabled) {
    }

    this.stats.processedAlarms++;
    this.processedAlarms.set(alarm.id, processed);

    return processed;
  }

  private calculateContextRelevance(processed: ProcessedAlarm): number {
    let relevance = 1.0;

    // Reduce relevance for alarms not relevant to current context
    const context = processed.vesselContext;
    const alarmSource = processed.source || processed.message.toLowerCase();

    // Engine alarms less relevant when not motoring
    if (alarmSource.includes('engine') && context.state !== 'motoring') {
      relevance *= 0.7;
    }

    // Navigation alarms more relevant when moving
    if (alarmSource.includes('navigation') || alarmSource.includes('gps')) {
      if (context.state === 'sailing' || context.state === 'motoring') {
        relevance *= 1.2;
      } else {
        relevance *= 0.8;
      }
    }

    // Weather-related alarms more relevant in bad weather
    if (alarmSource.includes('wind') || alarmSource.includes('weather')) {
      if (context.weather === 'rough' || context.weather === 'severe') {
        relevance *= 1.3;
      }
    }

    // Adjust for time of day
    if (context.timeOfDay === 'night') {
      // Safety alarms more critical at night
      if (processed.level === 'critical' || alarmSource.includes('safety')) {
        relevance *= 1.1;
      }
    }

    return Math.max(0.1, Math.min(2.0, relevance));
  }

  private calculateSmartPriority(processed: ProcessedAlarm): number {
    let priority = 0;

    // Base priority from alarm level
    switch (processed.level) {
      case 'critical':
        priority = 1000;
        break;
      case 'warning':
        priority = 500;
        break;
      case 'info':
        priority = 100;
        break;
      default:
        priority = 50;
    }

    // Adjust for context relevance
    priority *= processed.contextRelevance;

    // Boost priority for marine safety
    const safetyClassification = this.classifyMarineSafety(processed);
    if (safetyClassification === 'critical_safety') {
      priority *= 1.5;
    }

    // Reduce priority if likely false alarm
    if (processed.falseAlarmProbability && processed.falseAlarmProbability > 0.7) {
      priority *= 0.5;
    }

    // Boost priority for maintenance-related alarms that could indicate problems
    if (processed.relatedMaintenance && processed.relatedMaintenance.length > 0) {
      priority *= 1.1;
    }

    return Math.round(priority);
  }

  private classifyMarineSafety(processed: ProcessedAlarm): string {
    const source = (processed.source || processed.message).toLowerCase();

    // Critical safety systems
    if (source.includes('collision') || source.includes('fire') || source.includes('flooding')) {
      return 'critical_safety';
    }

    if (source.includes('navigation') || source.includes('gps') || source.includes('autopilot')) {
      return 'navigation_safety';
    }

    if (source.includes('engine') || source.includes('fuel') || source.includes('oil')) {
      return 'propulsion_safety';
    }

    if (source.includes('battery') || source.includes('electrical') || source.includes('power')) {
      return 'electrical_safety';
    }

    return 'general';
  }

  private findRelatedMaintenance(processed: ProcessedAlarm): string[] | undefined {
    const source = (processed.source || processed.message).toLowerCase();
    const maintenanceStats = this.maintenanceScheduler.getMaintenanceStats();

    // Simple correlation - would be enhanced with better maintenance item analysis
    const related: string[] = [];

    if (source.includes('oil') && maintenanceStats.overdueItems > 0) {
      related.push('oil_change_due');
    }

    if (source.includes('temperature') || source.includes('overheat')) {
      related.push('cooling_system_check');
    }

    if (source.includes('fuel') || source.includes('filter')) {
      related.push('fuel_filter_replacement');
    }

    return related.length > 0 ? related : undefined;
  }

  private updateProcessingStats(processed: ProcessedAlarm): void {
    this.stats.processedAlarms++;

    // Update processing time statistics
    const processingTime = processed.processingTime;
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime + processingTime) / 2;
    this.stats.maxProcessingTime = Math.max(this.stats.maxProcessingTime, processingTime);

    // Update level-specific response times
    this.stats.responseTimes[processed.level] =
      (this.stats.responseTimes[processed.level] + processingTime) / 2;

    // Update context confidence
    this.stats.contextConfidence =
      (this.stats.contextConfidence + processed.vesselContext.confidence) / 2;

    // Update learning effectiveness
    if (this.config.adaptiveLearningEnabled) {
      const learningStats = this.learningEngine.getLearningStats();
      this.stats.falseAlarmReduction = learningStats.falsePositiveReduction;
      this.stats.learningAccuracy = learningStats.patternConfidence;
    }

    // Update maintenance stats
    if (this.config.maintenanceIntegrationEnabled) {
      const maintenanceStats = this.maintenanceScheduler.getMaintenanceStats();
      this.stats.maintenanceCompleted = maintenanceStats.completedThisMonth;
    }

    this.stats.lastUpdated = Date.now();
  }

  private createFallbackProcessedAlarm(alarm: Alarm, startTime: number): ProcessedAlarm {
    return {
      ...alarm,
      smartSuppressed: false,
      smartPriority: alarm.level === 'critical' ? 1000 : 100,
      contextRelevance: 1.0,
      vesselContext: this.currentContext,
      processingTime: performance.now() - startTime,
      smartFeaturesApplied: ['fallback'],
      originalAlarm: { ...alarm },
    };
  }

  private getEnabledFeatures(): string[] {
    const enabled: string[] = [];

    if (this.config.groupingEnabled) enabled.push('grouping');
    if (this.config.priorityQueueEnabled) enabled.push('priorityQueue');
    if (this.config.contextDetectionEnabled) enabled.push('contextDetection');
    if (this.config.adaptiveLearningEnabled) enabled.push('adaptiveLearning');
    if (this.config.maintenanceIntegrationEnabled) enabled.push('maintenanceIntegration');

    return enabled;
  }

  private startPeriodicTasks(): void {
    // Context updates
    if (this.config.contextDetectionEnabled) {
      this.contextUpdateTimer = setInterval(() => {
        if (this.lastNmeaData) {
          const newContext = this.contextDetector.updateWithNmeaData(this.lastNmeaData);

          if (JSON.stringify(newContext) !== JSON.stringify(this.currentContext)) {
            this.currentContext = newContext;
            this.stats.contextChanges++;
          }
        }
      }, this.config.contextUpdateInterval);
    }

    // Learning updates
    if (this.config.adaptiveLearningEnabled) {
      this.learningUpdateTimer = setInterval(() => {
        const learningStats = this.learningEngine.getLearningStats();
        this.stats.falseAlarmReduction = learningStats.falsePositiveReduction;
        this.stats.learningAccuracy = learningStats.patternConfidence;
      }, this.config.learningUpdateInterval);
    }

    // Maintenance checks
    if (this.config.maintenanceIntegrationEnabled) {
      this.maintenanceCheckTimer = setInterval(() => {
        const maintenanceAlarms = this.maintenanceScheduler.checkMaintenanceAlarms(
          this.currentContext,
        );

        for (const alarm of maintenanceAlarms) {
          if (this.onMaintenanceAlarm) {
            this.onMaintenanceAlarm(alarm);
          }
        }

        this.stats.maintenanceAlarmsGenerated += maintenanceAlarms.length;
      }, 60000); // Check every minute
    }

    // Statistics updates
    if (this.config.statisticsCollection) {
      this.statsUpdateTimer = setInterval(() => {
        this.stats.lastUpdated = Date.now();

        // Monitor component health
        this.stats.componentStatus = {
          groupingEngine: 'healthy', // Would implement actual health checks
          priorityQueue: 'healthy',
          contextDetection: this.lastNmeaData ? 'healthy' : 'degraded',
          adaptiveLearning: 'healthy',
          maintenance: 'healthy',
        };
      }, 30000); // Update every 30 seconds
    }
  }

  private subscribeToAlarmStore(): void {
    // Subscribe to alarm store changes
    useAlarmStore.subscribe((state) => {
      // Process any new alarms
      for (const alarm of state.activeAlarms) {
        if (!this.processedAlarms.has(alarm.id)) {
          this.processAlarm(alarm).catch((error) => {
            console.error('SmartAlarmManager: Failed to process alarm from store', {
              alarmId: alarm.id,
              error: error instanceof Error ? error.message : error,
            });
          });
        }
      }
    });
  }

  private log(message: string, data?: any): void {
    if (this.config.debugLogging) {
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Clear timers
    if (this.contextUpdateTimer) clearInterval(this.contextUpdateTimer);
    if (this.learningUpdateTimer) clearInterval(this.learningUpdateTimer);
    if (this.maintenanceCheckTimer) clearInterval(this.maintenanceCheckTimer);
    if (this.statsUpdateTimer) clearInterval(this.statsUpdateTimer);

    // Cleanup components
    // Note: cleanup methods would be implemented in each component
    if (this.contextDetector.cleanup) this.contextDetector.cleanup();
    if (this.learningEngine.cleanup) this.learningEngine.cleanup();
    if (this.maintenanceScheduler.cleanup) this.maintenanceScheduler.cleanup();
  }
}
