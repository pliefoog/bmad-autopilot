/**
 * AdaptiveLearningEngine - Pattern recognition and adaptive threshold learning for smart alarm management
 * Learns from user behavior and environmental patterns to reduce false alarms
 */

import { Alarm, AlarmLevel, AlarmThreshold } from '../../store/alarmStore';
import { VesselContext } from './PriorityQueueManager';
import { NmeaDataSnapshot } from './VesselContextDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/logging/logger';

/**
 * Alarm interaction pattern for learning
 */
export interface AlarmInteraction {
  alarmId: string;
  alarmType: string; // threshold ID or alarm source
  message: string;
  level: AlarmLevel;
  value: number;
  threshold: number;

  // Context when alarm occurred
  context: VesselContext;
  environmentalData: Partial<NmeaDataSnapshot>;

  // User response
  userAction: 'acknowledged' | 'dismissed' | 'ignored' | 'escalated';
  responseTime: number; // milliseconds to respond
  timestamp: number;

  // Classification
  falsePositive?: boolean; // User-indicated or system-determined
  userFeedback?: string; // Optional user comments
}

/**
 * Learned pattern for alarm behavior
 */
export interface LearnedPattern {
  id: string;
  patternType: 'false_alarm' | 'transient' | 'contextual' | 'environmental';

  // Pattern matching criteria
  alarmTypes: string[];
  contextConditions: Partial<VesselContext>;
  environmentalConditions: {
    speedRange?: { min: number; max: number };
    windRange?: { min: number; max: number };
    timeOfDay?: ('day' | 'night' | 'dawn' | 'dusk')[];
    weatherConditions?: ('calm' | 'moderate' | 'rough' | 'severe')[];
  };

  // Pattern statistics
  occurrenceCount: number;
  falsePositiveRate: number; // 0-1
  avgResponseTime: number;
  confidence: number; // 0-1

  // Learning metadata
  firstSeen: number;
  lastSeen: number;
  lastUpdated: number;

  // Recommended action
  recommendedAction: 'suppress' | 'adjust_threshold' | 'delay_notification' | 'context_filter';
  suppressionScore: number; // 0-1, how strongly to suppress
}

/**
 * Adaptive threshold adjustment
 */
export interface ThresholdAdjustment {
  thresholdId: string;
  originalValue: number;
  adjustedValue: number;
  adjustmentFactor: number; // multiplier applied

  // Context-specific adjustments
  contextConditions: Partial<VesselContext>;
  environmentalTriggers: Partial<NmeaDataSnapshot>;

  // Safety constraints
  safetyLimited: boolean; // If adjustment was limited by safety rules
  minAllowedValue: number;
  maxAllowedValue: number;

  // Learning statistics
  successRate: number; // How often this adjustment prevents false alarms
  reversions: number; // How many times user overrode this adjustment
  confidence: number;

  // Metadata
  createdAt: number;
  lastApplied: number;
  applicationCount: number;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  enabled: boolean;

  // Pattern detection parameters
  minOccurrences: number; // Minimum occurrences to establish pattern
  falsePositiveThreshold: number; // Rate to consider pattern as false positive
  confidenceThreshold: number; // Minimum confidence to apply learning

  // Threshold adjustment limits
  maxThresholdAdjustment: number; // Maximum % change to threshold
  safetyMargin: number; // % margin to maintain for safety

  // Learning persistence
  maxStoredPatterns: number;
  maxStoredAdjustments: number;
  patternRetentionDays: number;

  // Context sensitivity
  contextSensitivity: number; // How much context matters (0-1)
  environmentalSensitivity: number; // How much environment matters (0-1)

  // Safety overrides
  criticalAlarmLearningDisabled: boolean; // Disable learning for critical alarms
  navigationAlarmProtection: boolean; // Extra protection for navigation alarms
  userOverrideAuthority: boolean; // User can override learned patterns
}

/**
 * Adaptive learning engine for smart alarm management
 */
export class AdaptiveLearningEngine {
  private config: LearningConfig;
  private interactions: AlarmInteraction[] = [];
  private patterns: LearnedPattern[] = [];
  private adjustments: ThresholdAdjustment[] = [];

  private readonly storageKey = 'adaptive-alarm-learning';
  private saveScheduled = false;

  // Pattern analysis
  private patternAnalysisTimer?: NodeJS.Timeout;
  private lastAnalysis: number = 0;

  constructor(config?: Partial<LearningConfig>) {
    this.config = {
      enabled: true,

      // Pattern detection
      minOccurrences: 3,
      falsePositiveThreshold: 0.7, // 70% false positive rate
      confidenceThreshold: 0.8,

      // Threshold adjustments
      maxThresholdAdjustment: 0.3, // 30% max change
      safetyMargin: 0.15, // 15% safety margin

      // Storage limits
      maxStoredPatterns: 100,
      maxStoredAdjustments: 50,
      patternRetentionDays: 30,

      // Context sensitivity
      contextSensitivity: 0.8,
      environmentalSensitivity: 0.6,

      // Safety
      criticalAlarmLearningDisabled: true,
      navigationAlarmProtection: true,
      userOverrideAuthority: true,

      ...config,
    };

    this.loadFromStorage();
    this.startPatternAnalysis();
  }

  /**
   * Record user interaction with alarm for learning
   */
  public recordInteraction(
    alarm: Alarm,
    userAction: AlarmInteraction['userAction'],
    responseTime: number,
    context: VesselContext,
    environmentalData?: Partial<NmeaDataSnapshot>,
    userFeedback?: string,
  ): void {
    if (!this.config.enabled) return;

    // Skip learning for critical alarms if disabled
    if (this.config.criticalAlarmLearningDisabled && alarm.level === 'critical') {
      return;
    }

    const interaction: AlarmInteraction = {
      alarmId: alarm.id,
      alarmType: alarm.source || 'unknown',
      message: alarm.message,
      level: alarm.level,
      value: alarm.value || 0,
      threshold: alarm.threshold || 0,

      context: { ...context },
      environmentalData: environmentalData || {},

      userAction,
      responseTime,
      timestamp: Date.now(),

      falsePositive: this.classifyFalsePositive(userAction, responseTime),
      userFeedback,
    };

    this.interactions.push(interaction);

    // Limit stored interactions
    if (this.interactions.length > this.config.maxStoredPatterns * 10) {
      this.interactions = this.interactions.slice(-this.config.maxStoredPatterns * 5);
    }

    this.schedulePatternAnalysis();
    this.scheduleSave();
  }

  /**
   * Check if alarm should be suppressed based on learned patterns
   */
  public shouldSuppressAlarm(
    alarm: Alarm,
    context: VesselContext,
    environmentalData?: Partial<NmeaDataSnapshot>,
  ): { suppress: boolean; confidence: number; reason?: string } {
    if (!this.config.enabled) {
      return { suppress: false, confidence: 0 };
    }

    // Never suppress critical alarms if protection is enabled
    if (alarm.level === 'critical' && this.config.criticalAlarmLearningDisabled) {
      return { suppress: false, confidence: 1, reason: 'Critical alarm protection' };
    }

    // Find matching patterns
    const matchingPatterns = this.findMatchingPatterns(alarm, context, environmentalData);

    if (matchingPatterns.length === 0) {
      return { suppress: false, confidence: 0 };
    }

    // Calculate suppression recommendation
    let suppressionScore = 0;
    let totalConfidence = 0;
    let bestReason = '';

    for (const pattern of matchingPatterns) {
      const patternWeight = pattern.confidence * pattern.suppressionScore;
      suppressionScore += patternWeight;
      totalConfidence += pattern.confidence;

      if (pattern.confidence > 0.8) {
        bestReason = `Pattern: ${pattern.patternType} (${Math.round(
          pattern.falsePositiveRate * 100,
        )}% false positive rate)`;
      }
    }

    const avgConfidence = totalConfidence / matchingPatterns.length;
    const avgSuppression = suppressionScore / matchingPatterns.length;

    // Apply confidence threshold
    const shouldSuppress = avgConfidence >= this.config.confidenceThreshold && avgSuppression > 0.5;

    return {
      suppress: shouldSuppress,
      confidence: avgConfidence,
      reason: bestReason || `${matchingPatterns.length} matching patterns`,
    };
  }

  /**
   * Get adaptive threshold adjustment for current conditions
   */
  public getThresholdAdjustment(
    thresholdId: string,
    context: VesselContext,
    environmentalData?: Partial<NmeaDataSnapshot>,
  ): { adjustment: number; confidence: number; reason?: string } {
    if (!this.config.enabled) {
      return { adjustment: 1.0, confidence: 0 };
    }

    // Skip adjustment for navigation alarms if protection enabled
    if (this.config.navigationAlarmProtection && this.isNavigationAlarm(thresholdId)) {
      return { adjustment: 1.0, confidence: 1, reason: 'Navigation alarm protection' };
    }

    const matchingAdjustments = this.adjustments.filter(
      (adj) =>
        adj.thresholdId === thresholdId &&
        this.matchesContext(adj.contextConditions, context) &&
        this.matchesEnvironmentalTriggers(adj.environmentalTriggers, environmentalData),
    );
    if (matchingAdjustments.length === 0) {
      return { adjustment: 1.0, confidence: 0 };
    }

    // Find best adjustment based on success rate and confidence
    const bestAdjustment = matchingAdjustments.reduce((best, current) =>
      current.confidence * current.successRate > best.confidence * best.successRate
        ? current
        : best,
    );

    return {
      adjustment: bestAdjustment.adjustmentFactor,
      confidence: bestAdjustment.confidence,
      reason: `Adaptive threshold based on ${bestAdjustment.applicationCount} applications`,
    };
  }

  /**
   * Mark user override of learned behavior
   */
  public recordUserOverride(
    alarmId: string,
    overrideType: 'force_show' | 'force_suppress' | 'threshold_manual',
    reason?: string,
  ): void {
    if (!this.config.userOverrideAuthority) return;

    // Find related patterns and adjustments
    const relatedPatterns = this.patterns.filter((pattern) => pattern.alarmTypes.includes(alarmId));

    // Reduce confidence in overridden patterns
    for (const pattern of relatedPatterns) {
      pattern.confidence *= 0.9; // 10% confidence penalty
      pattern.lastUpdated = Date.now();
    }

    // Record override for analysis

    this.scheduleSave();
  }

  /**
   * Get learning statistics for monitoring
   */
  public getLearningStats(): {
    totalInteractions: number;
    totalPatterns: number;
    totalAdjustments: number;
    falsePositiveReduction: number;
    patternConfidence: number;
    lastAnalysis: number;
  } {
    const avgPatternConfidence =
      this.patterns.length > 0
        ? this.patterns.reduce((sum, p) => sum + p.confidence, 0) / this.patterns.length
        : 0;

    // Calculate false positive reduction (simplified)
    const recentInteractions = this.interactions.filter(
      (i) => Date.now() - i.timestamp < 7 * 24 * 60 * 60 * 1000, // Last 7 days
    );

    const falsePositives = recentInteractions.filter((i) => i.falsePositive).length;
    const totalInteractions = recentInteractions.length;
    const falsePositiveRate = totalInteractions > 0 ? falsePositives / totalInteractions : 0;
    const falsePositiveReduction = Math.max(0, 1 - falsePositiveRate);

    return {
      totalInteractions: this.interactions.length,
      totalPatterns: this.patterns.length,
      totalAdjustments: this.adjustments.length,
      falsePositiveReduction,
      patternConfidence: avgPatternConfidence,
      lastAnalysis: this.lastAnalysis,
    };
  }

  /**
   * Export learned patterns for backup or analysis
   */
  public exportLearningData(): {
    patterns: LearnedPattern[];
    adjustments: ThresholdAdjustment[];
    interactions: AlarmInteraction[];
    config: LearningConfig;
    exportDate: string;
  } {
    return {
      patterns: [...this.patterns],
      adjustments: [...this.adjustments],
      interactions: this.interactions.slice(-100), // Last 100 interactions only
      config: { ...this.config },
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Import learning data (with validation)
   */
  public async importLearningData(
    data: ReturnType<AdaptiveLearningEngine['exportLearningData']>,
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: false, errors: [] as string[] };

    try {
      // Validate data structure
      if (!data.patterns || !data.adjustments) {
        result.errors.push('Invalid learning data structure');
        return result;
      }

      // Import patterns (with confidence validation)
      const validPatterns = data.patterns.filter(
        (pattern) => pattern.confidence >= 0.1 && pattern.occurrenceCount >= 1,
      );

      // Import adjustments (with safety validation)
      const validAdjustments = data.adjustments.filter(
        (adj) =>
          adj.adjustmentFactor >= 0.5 &&
          adj.adjustmentFactor <= 2.0 && // 50%-200% range
          adj.confidence >= 0.1,
      );

      // Merge with existing data (keep highest confidence versions)
      this.patterns = this.mergePatterns([...this.patterns, ...validPatterns]);
      this.adjustments = this.mergeAdjustments([...this.adjustments, ...validAdjustments]);

      // Save imported data
      await this.saveToStorage();

      result.success = true;
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : error}`);
    }

    return result;
  }

  /**
   * Reset all learned patterns (for debugging or fresh start)
   */
  public async resetLearning(): Promise<void> {
    this.interactions = [];
    this.patterns = [];
    this.adjustments = [];

    await this.saveToStorage();
  }

  // Private implementation methods

  private classifyFalsePositive(
    userAction: AlarmInteraction['userAction'],
    responseTime: number,
  ): boolean {
    // Quick dismissal or ignore suggests false positive
    if (userAction === 'dismissed' && responseTime < 5000) {
      // < 5 seconds
      return true;
    }

    if (userAction === 'ignored') {
      return true;
    }

    // Long response time to acknowledge suggests not urgent
    if (userAction === 'acknowledged' && responseTime > 60000) {
      // > 1 minute
      return true;
    }

    return false;
  }

  private findMatchingPatterns(
    alarm: Alarm,
    context: VesselContext,
    environmentalData?: Partial<NmeaDataSnapshot>,
  ): LearnedPattern[] {
    return this.patterns.filter((pattern) => {
      // Check alarm type match
      if (!pattern.alarmTypes.includes(alarm.source || alarm.message)) {
        return false;
      }

      // Check context match
      if (!this.matchesContext(pattern.contextConditions, context)) {
        return false;
      }

      // Check environmental conditions
      if (!this.matchesEnvironmentalData(pattern.environmentalConditions, environmentalData)) {
        return false;
      }

      // Check pattern confidence and recency
      if (pattern.confidence < this.config.confidenceThreshold * 0.5) {
        return false;
      }

      return true;
    });
  }

  private matchesContext(
    patternContext: Partial<VesselContext>,
    currentContext: VesselContext,
  ): boolean {
    // Apply context sensitivity weighting
    const sensitivity = this.config.contextSensitivity;

    let matches = 0;
    let totalChecks = 0;

    for (const [key, value] of Object.entries(patternContext)) {
      totalChecks++;

      if (currentContext[key as keyof VesselContext] === value) {
        matches++;
      }
    }

    // Require match percentage based on sensitivity
    const requiredMatchRate = 0.5 + sensitivity * 0.4; // 50%-90% based on sensitivity
    const matchRate = totalChecks > 0 ? matches / totalChecks : 1;

    return matchRate >= requiredMatchRate;
  }

  private matchesEnvironmentalData(
    patternConditions: LearnedPattern['environmentalConditions'],
    currentData?: Partial<NmeaDataSnapshot>,
  ): boolean {
    if (!currentData) return true; // No environmental data to compare

    // Check speed range
    if (patternConditions.speedRange && currentData.speed !== undefined) {
      if (
        currentData.speed < patternConditions.speedRange.min ||
        currentData.speed > patternConditions.speedRange.max
      ) {
        return false;
      }
    }

    // Check wind range
    if (patternConditions.windRange && currentData.windSpeed !== undefined) {
      if (
        currentData.windSpeed < patternConditions.windRange.min ||
        currentData.windSpeed > patternConditions.windRange.max
      ) {
        return false;
      }
    }

    return true;
  }

  // Method for matching adjustment triggers (different data structure)
  private matchesEnvironmentalTriggers(
    triggers: Partial<NmeaDataSnapshot>,
    currentData?: Partial<NmeaDataSnapshot>,
  ): boolean {
    if (!currentData) return true;

    // Simple matching - could be enhanced with ranges/tolerances
    for (const [key, value] of Object.entries(triggers)) {
      if (currentData[key as keyof NmeaDataSnapshot] !== value) {
        return false;
      }
    }

    return true;
  }

  private isNavigationAlarm(thresholdId: string): boolean {
    const navigationKeywords = ['depth', 'shallow', 'gps', 'position', 'navigation', 'autopilot'];
    return navigationKeywords.some((keyword) => thresholdId.toLowerCase().includes(keyword));
  }

  private schedulePatternAnalysis(): void {
    if (!this.patternAnalysisTimer) {
      // Analyze patterns every 5 minutes
      this.patternAnalysisTimer = setTimeout(() => {
        this.analyzePatterns();
        this.patternAnalysisTimer = undefined;
      }, 5 * 60 * 1000);
    }
  }

  private analyzePatterns(): void {
    const now = Date.now();

    // Group interactions by alarm type and context
    const grouped = this.groupInteractionsByPattern();

    // Analyze each group for patterns
    for (const [patternKey, interactions] of grouped.entries()) {
      if (interactions.length >= this.config.minOccurrences) {
        this.analyzeInteractionGroup(patternKey, interactions);
      }
    }

    // Clean old patterns
    this.cleanOldPatterns();

    // Generate threshold adjustments
    this.generateThresholdAdjustments();

    this.lastAnalysis = now;
    this.scheduleSave();
  }

  private groupInteractionsByPattern(): Map<string, AlarmInteraction[]> {
    const groups = new Map<string, AlarmInteraction[]>();

    for (const interaction of this.interactions) {
      // Create pattern key based on alarm type and context
      const contextKey = this.createContextKey(interaction.context);
      const patternKey = `${interaction.alarmType}:${contextKey}`;

      if (!groups.has(patternKey)) {
        groups.set(patternKey, []);
      }

      groups.get(patternKey)!.push(interaction);
    }

    return groups;
  }

  private createContextKey(context: VesselContext): string {
    // Create a simplified key for context matching
    return `${context.state}:${context.weather}:${context.timeOfDay}`;
  }

  private analyzeInteractionGroup(patternKey: string, interactions: AlarmInteraction[]): void {
    const [alarmType, contextKey] = patternKey.split(':');

    // Calculate pattern statistics
    const falsePositives = interactions.filter((i) => i.falsePositive).length;
    const falsePositiveRate = falsePositives / interactions.length;

    const avgResponseTime =
      interactions.reduce((sum, i) => sum + i.responseTime, 0) / interactions.length;

    // Determine pattern type
    let patternType: LearnedPattern['patternType'] = 'false_alarm';

    if (falsePositiveRate >= this.config.falsePositiveThreshold) {
      patternType = 'false_alarm';
    } else if (avgResponseTime > 30000) {
      // > 30 seconds
      patternType = 'transient';
    } else {
      patternType = 'contextual';
    }

    // Extract context and environmental conditions
    const contextConditions = this.extractContextConditions(interactions);
    const environmentalConditions = this.extractEnvironmentalConditions(interactions);

    // Calculate confidence
    const confidence = this.calculatePatternConfidence(interactions, falsePositiveRate);

    // Create or update pattern
    const existingPattern = this.patterns.find(
      (p) =>
        p.alarmTypes.includes(alarmType) &&
        this.matchesContext(p.contextConditions, contextConditions as VesselContext),
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.occurrenceCount += interactions.length;
      existingPattern.falsePositiveRate = falsePositiveRate;
      existingPattern.avgResponseTime = avgResponseTime;
      existingPattern.confidence = Math.max(existingPattern.confidence, confidence);
      existingPattern.lastSeen = Math.max(...interactions.map((i) => i.timestamp));
      existingPattern.lastUpdated = Date.now();
      existingPattern.suppressionScore = this.calculateSuppressionScore(
        falsePositiveRate,
        avgResponseTime,
      );
    } else if (confidence >= this.config.confidenceThreshold * 0.5) {
      // Create new pattern
      const newPattern: LearnedPattern = {
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patternType,
        alarmTypes: [alarmType],
        contextConditions,
        environmentalConditions,
        occurrenceCount: interactions.length,
        falsePositiveRate,
        avgResponseTime,
        confidence,
        firstSeen: Math.min(...interactions.map((i) => i.timestamp)),
        lastSeen: Math.max(...interactions.map((i) => i.timestamp)),
        lastUpdated: Date.now(),
        recommendedAction: this.determineRecommendedAction(patternType, falsePositiveRate),
        suppressionScore: this.calculateSuppressionScore(falsePositiveRate, avgResponseTime),
      };

      this.patterns.push(newPattern);
    }
  }

  private extractContextConditions(interactions: AlarmInteraction[]): Partial<VesselContext> {
    // Find most common context values
    const contexts = interactions.map((i) => i.context);

    return {
      state: this.getMostCommon(contexts.map((c) => c.state)),
      weather: this.getMostCommon(contexts.map((c) => c.weather)),
      timeOfDay: this.getMostCommon(contexts.map((c) => c.timeOfDay)),
      operatingMode: this.getMostCommon(contexts.map((c) => c.operatingMode)),
    };
  }

  private extractEnvironmentalConditions(
    interactions: AlarmInteraction[],
  ): LearnedPattern['environmentalConditions'] {
    const envData = interactions.map((i) => i.environmentalData).filter((d) => d);

    if (envData.length === 0) return {};

    // Calculate ranges for numeric values
    const speeds = envData.map((d) => d.speed).filter((s) => s !== undefined) as number[];
    const windSpeeds = envData.map((d) => d.windSpeed).filter((w) => w !== undefined) as number[];

    const result: LearnedPattern['environmentalConditions'] = {};

    if (speeds.length > 0) {
      result.speedRange = {
        min: Math.min(...speeds),
        max: Math.max(...speeds),
      };
    }

    if (windSpeeds.length > 0) {
      result.windRange = {
        min: Math.min(...windSpeeds),
        max: Math.max(...windSpeeds),
      };
    }

    return result;
  }

  private getMostCommon<T>(values: T[]): T {
    const counts = new Map<T, number>();

    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    let mostCommon = values[0];
    let maxCount = 0;

    for (const [value, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  private calculatePatternConfidence(
    interactions: AlarmInteraction[],
    falsePositiveRate: number,
  ): number {
    let confidence = 0;

    // Base confidence from occurrence count
    const occurrenceScore = Math.min(interactions.length / (this.config.minOccurrences * 2), 1);
    confidence += occurrenceScore * 0.4;

    // Confidence from false positive consistency
    const consistencyScore = falsePositiveRate > 0.8 || falsePositiveRate < 0.2 ? 1 : 0.5;
    confidence += consistencyScore * 0.3;

    // Confidence from recency
    const latestInteraction = Math.max(...interactions.map((i) => i.timestamp));
    const age = Date.now() - latestInteraction;
    const recencyScore = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000)); // Decay over 7 days
    confidence += recencyScore * 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  private determineRecommendedAction(
    patternType: LearnedPattern['patternType'],
    falsePositiveRate: number,
  ): LearnedPattern['recommendedAction'] {
    if (falsePositiveRate >= 0.8) {
      return 'suppress';
    } else if (falsePositiveRate >= 0.6) {
      return 'adjust_threshold';
    } else if (patternType === 'contextual') {
      return 'context_filter';
    } else {
      return 'delay_notification';
    }
  }

  private calculateSuppressionScore(falsePositiveRate: number, avgResponseTime: number): number {
    let score = 0;

    // Base score from false positive rate
    score += falsePositiveRate * 0.7;

    // Bonus for slow response (indicates low urgency)
    const responseScore = Math.min(avgResponseTime / 60000, 1); // Normalize to 1 minute
    score += responseScore * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private generateThresholdAdjustments(): void {
    // Analyze interactions for threshold adjustments
    const thresholdGroups = new Map<string, AlarmInteraction[]>();

    for (const interaction of this.interactions) {
      if (interaction.threshold > 0 && interaction.value > 0) {
        const key = interaction.alarmType;

        if (!thresholdGroups.has(key)) {
          thresholdGroups.set(key, []);
        }

        thresholdGroups.get(key)!.push(interaction);
      }
    }

    for (const [thresholdId, interactions] of thresholdGroups.entries()) {
      if (interactions.length >= this.config.minOccurrences) {
        this.analyzeThresholdAdjustment(thresholdId, interactions);
      }
    }
  }

  private analyzeThresholdAdjustment(thresholdId: string, interactions: AlarmInteraction[]): void {
    // Skip if navigation alarm protection is enabled
    if (this.config.navigationAlarmProtection && this.isNavigationAlarm(thresholdId)) {
      return;
    }

    const falsePositives = interactions.filter((i) => i.falsePositive);

    if (falsePositives.length < this.config.minOccurrences) {
      return;
    }

    // Calculate suggested adjustment
    const values = falsePositives.map((i) => i.value);
    const thresholds = falsePositives.map((i) => i.threshold);

    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const avgThreshold = thresholds.reduce((sum, t) => sum + t, 0) / thresholds.length;

    // Suggest threshold that would avoid most false positives
    const adjustmentFactor = Math.max(avgValue / avgThreshold, 1.1); // At least 10% increase

    // Apply safety limits
    const limitedAdjustment = Math.min(adjustmentFactor, 1 + this.config.maxThresholdAdjustment);

    // Check if adjustment already exists
    const existingAdjustment = this.adjustments.find((adj) => adj.thresholdId === thresholdId);

    if (existingAdjustment) {
      // Update existing adjustment
      existingAdjustment.adjustmentFactor = limitedAdjustment;
      existingAdjustment.applicationCount++;
      existingAdjustment.lastApplied = Date.now();

      // Update success rate based on recent performance
      const recentInteractions = interactions.filter(
        (i) => i.timestamp > existingAdjustment.lastApplied - 7 * 24 * 60 * 60 * 1000,
      );

      if (recentInteractions.length > 0) {
        const recentFalsePositives = recentInteractions.filter((i) => i.falsePositive).length;
        const recentSuccessRate = 1 - recentFalsePositives / recentInteractions.length;
        existingAdjustment.successRate = (existingAdjustment.successRate + recentSuccessRate) / 2;
      }
    } else {
      // Create new adjustment
      const newAdjustment: ThresholdAdjustment = {
        thresholdId,
        originalValue: avgThreshold,
        adjustedValue: avgThreshold * limitedAdjustment,
        adjustmentFactor: limitedAdjustment,

        contextConditions: this.extractContextConditions(interactions),
        environmentalTriggers: {},

        safetyLimited: adjustmentFactor > limitedAdjustment,
        minAllowedValue: avgThreshold * (1 - this.config.safetyMargin),
        maxAllowedValue: avgThreshold * (1 + this.config.maxThresholdAdjustment),

        successRate: 0.8, // Optimistic initial success rate
        reversions: 0,
        confidence: this.calculatePatternConfidence(
          interactions,
          falsePositives.length / interactions.length,
        ),

        createdAt: Date.now(),
        lastApplied: Date.now(),
        applicationCount: 1,
      };

      this.adjustments.push(newAdjustment);
    }
  }

  private mergePatterns(patterns: LearnedPattern[]): LearnedPattern[] {
    const merged = new Map<string, LearnedPattern>();

    for (const pattern of patterns) {
      const key = `${pattern.alarmTypes.join(',')}:${this.createContextKey(
        pattern.contextConditions as VesselContext,
      )}`;

      if (merged.has(key)) {
        const existing = merged.get(key)!;

        // Keep the one with higher confidence
        if (pattern.confidence > existing.confidence) {
          merged.set(key, pattern);
        }
      } else {
        merged.set(key, pattern);
      }
    }

    return Array.from(merged.values()).slice(0, this.config.maxStoredPatterns);
  }

  private mergeAdjustments(adjustments: ThresholdAdjustment[]): ThresholdAdjustment[] {
    const merged = new Map<string, ThresholdAdjustment>();

    for (const adjustment of adjustments) {
      const key = adjustment.thresholdId;

      if (merged.has(key)) {
        const existing = merged.get(key)!;

        // Keep the one with higher success rate
        if (adjustment.successRate > existing.successRate) {
          merged.set(key, adjustment);
        }
      } else {
        merged.set(key, adjustment);
      }
    }

    return Array.from(merged.values()).slice(0, this.config.maxStoredAdjustments);
  }

  private cleanOldPatterns(): void {
    const cutoff = Date.now() - this.config.patternRetentionDays * 24 * 60 * 60 * 1000;

    this.patterns = this.patterns.filter(
      (pattern) => pattern.lastSeen >= cutoff && pattern.confidence >= 0.1,
    );

    this.adjustments = this.adjustments.filter(
      (adjustment) => adjustment.lastApplied >= cutoff && adjustment.confidence >= 0.1,
    );
  }

  private startPatternAnalysis(): void {
    // Analyze patterns every hour
    setInterval(() => {
      if (this.interactions.length >= this.config.minOccurrences) {
        this.analyzePatterns();
      }
    }, 60 * 60 * 1000);
  }

  private scheduleSave(): void {
    if (!this.saveScheduled) {
      this.saveScheduled = true;

      setTimeout(() => {
        this.saveToStorage();
        this.saveScheduled = false;
      }, 5000); // Save after 5 seconds
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);

      if (stored) {
        const data = JSON.parse(stored);

        this.interactions = data.interactions || [];
        this.patterns = data.patterns || [];
        this.adjustments = data.adjustments || [];
      }
    } catch (error) {
      log.app('AdaptiveLearningEngine: Failed to load from storage', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        interactions: this.interactions.slice(-1000), // Keep last 1000 interactions
        patterns: this.patterns,
        adjustments: this.adjustments,
        lastSaved: Date.now(),
      };

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      log.app('AdaptiveLearningEngine: Failed to save to storage', () => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  public cleanup(): void {
    if (this.patternAnalysisTimer) {
      clearTimeout(this.patternAnalysisTimer);
      this.patternAnalysisTimer = undefined;
    }
  }
}
