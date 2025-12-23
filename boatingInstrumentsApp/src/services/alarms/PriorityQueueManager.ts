/**
 * PriorityQueueManager - Multi-level alarm queue with escalation and marine safety compliance
 * Manages alarm priorities, queuing, and escalation with context awareness
 */

import { Alarm, AlarmLevel } from '../../store/alarmStore';
import { CriticalAlarmType, AlarmEscalationLevel } from './types';
import { AlarmGroup, MarineSystemCategory } from './AlarmGroupingEngine';

/**
 * Priority queue entry with enhanced metadata
 */
export interface PriorityQueueEntry {
  id: string;
  alarm: Alarm;
  group?: AlarmGroup; // If part of a group
  priority: number; // Calculated priority score
  queuePosition: number;

  // Escalation tracking
  escalationLevel: AlarmEscalationLevel;
  originalLevel: AlarmLevel;
  escalatedAt?: number; // When escalation occurred
  escalationCount: number;
  nextEscalationAt?: number; // When next escalation will occur

  // Context and processing
  contextRelevance: number; // 0-1 score for current context relevance
  marineSafetyClassification: string;
  bypassGrouping: boolean; // True for critical safety alarms

  // Timing
  enqueuedAt: number;
  lastDisplayed?: number;
  acknowledgeDeadline?: number; // For critical alarms requiring timely acknowledgment

  // User interaction
  userInteracted: boolean;
  suppressedUntil?: number; // Temporary suppression
}

/**
 * Queue configuration for different contexts
 */
export interface QueueConfiguration {
  maxSize: number;
  autoEscalationEnabled: boolean;
  escalationIntervals: {
    // milliseconds for each level
    warning: number; // Warning -> Caution
    caution: number; // Caution -> Critical
    critical: number; // Critical -> Emergency
  };
  contextFiltering: boolean;
  marineSafetyBypass: boolean; // Allow critical safety alarms to bypass queue
  acknowledgmentTimeouts: {
    critical: number; // Max time to acknowledge critical alarms
    warning: number;
    info: number;
  };
}

/**
 * Current vessel context for context-aware filtering
 */
export interface VesselContext {
  state: 'anchored' | 'sailing' | 'motoring' | 'unknown';
  weather: 'calm' | 'moderate' | 'rough' | 'severe' | 'unknown';
  timeOfDay: 'day' | 'night' | 'dawn' | 'dusk';
  operatingMode: 'normal' | 'maintenance' | 'emergency' | 'unknown';
  crewOnWatch: boolean;
  confidence: number; // 0-1 confidence in context detection
}

/**
 * Multi-level priority queue manager with marine safety compliance
 */
export class PriorityQueueManager {
  private criticalQueue: PriorityQueueEntry[] = [];
  private warningQueue: PriorityQueueEntry[] = [];
  private infoQueue: PriorityQueueEntry[] = [];

  private configuration: QueueConfiguration;
  private currentContext: VesselContext;
  private escalationTimer?: NodeJS.Timeout;

  private priorityCalculator: PriorityCalculator;
  private contextFilter: ContextFilter;

  // Event callbacks
  private onAlarmEscalated?: (entry: PriorityQueueEntry, newLevel: AlarmEscalationLevel) => void;
  private onCriticalAlarmExpired?: (entry: PriorityQueueEntry) => void;
  private onQueueOverflow?: (droppedEntries: PriorityQueueEntry[]) => void;

  constructor(config?: Partial<QueueConfiguration>) {
    this.configuration = {
      maxSize: 100,
      autoEscalationEnabled: true,
      escalationIntervals: {
        warning: 2 * 60 * 1000, // 2 minutes
        caution: 1 * 60 * 1000, // 1 minute
        critical: 30 * 1000, // 30 seconds
      },
      contextFiltering: true,
      marineSafetyBypass: true,
      acknowledgmentTimeouts: {
        critical: 60 * 1000, // 1 minute
        warning: 5 * 60 * 1000, // 5 minutes
        info: 15 * 60 * 1000, // 15 minutes
      },
      ...config,
    };

    this.currentContext = {
      state: 'unknown',
      weather: 'unknown',
      timeOfDay: 'day',
      operatingMode: 'normal',
      crewOnWatch: true,
      confidence: 0.5,
    };

    this.priorityCalculator = new PriorityCalculator();
    this.contextFilter = new ContextFilter();

    this.startEscalationTimer();
  }

  /**
   * Enqueue alarm with priority calculation and context analysis
   */
  public enqueueAlarm(alarm: Alarm, group?: AlarmGroup): PriorityQueueEntry {
    // Create queue entry with priority calculation
    const entry = this.createQueueEntry(alarm, group);

    // Apply context filtering
    if (this.configuration.contextFiltering) {
      entry.contextRelevance = this.contextFilter.calculateRelevance(alarm, this.currentContext);

      // Skip queuing if not relevant to current context (unless critical)
      if (entry.contextRelevance < 0.3 && entry.alarm.level !== 'critical') {
        return entry;
      }
    }

    // Determine target queue and enqueue
    this.addToQueue(entry);

    // Update queue positions
    this.updateQueuePositions();

    return entry;
  }

  /**
   * Get next alarm to display based on priority and context
   */
  public getNextAlarm(): PriorityQueueEntry | null {
    // Always check critical queue first
    if (this.criticalQueue.length > 0) {
      return this.criticalQueue[0];
    }

    // Check warning queue
    if (this.warningQueue.length > 0) {
      const contextFiltered = this.configuration.contextFiltering
        ? this.warningQueue.filter((entry) => entry.contextRelevance > 0.5)
        : this.warningQueue;

      if (contextFiltered.length > 0) {
        return contextFiltered[0];
      }
    }

    // Check info queue
    if (this.infoQueue.length > 0) {
      const contextFiltered = this.configuration.contextFiltering
        ? this.infoQueue.filter((entry) => entry.contextRelevance > 0.6)
        : this.infoQueue;

      if (contextFiltered.length > 0) {
        return contextFiltered[0];
      }
    }

    return null;
  }

  /**
   * Get all visible alarms for current context
   */
  public getVisibleAlarms(limit?: number): PriorityQueueEntry[] {
    const allAlarms = [...this.criticalQueue, ...this.warningQueue, ...this.infoQueue];

    // Apply context filtering
    const filtered = this.configuration.contextFiltering
      ? allAlarms.filter(
          (entry) =>
            entry.alarm.level === 'critical' || // Always show critical
            entry.contextRelevance > 0.4,
        )
      : allAlarms;

    // Sort by priority and return limited set
    const sorted = filtered.sort((a, b) => b.priority - a.priority);

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Remove alarm from queue (after acknowledgment)
   */
  public removeAlarm(alarmId: string): boolean {
    const queues = [this.criticalQueue, this.warningQueue, this.infoQueue];

    for (const queue of queues) {
      const index = queue.findIndex((entry) => entry.alarm.id === alarmId);
      if (index >= 0) {
        queue.splice(index, 1);
        this.updateQueuePositions();
        return true;
      }
    }

    return false;
  }

  /**
   * Update vessel context for context-aware filtering
   */
  public updateContext(context: Partial<VesselContext>): void {
    this.currentContext = { ...this.currentContext, ...context };

    // Recalculate context relevance for all queued alarms
    this.recalculateContextRelevance();
  }

  /**
   * Force escalation of specific alarm
   */
  public escalateAlarm(alarmId: string): boolean {
    const entry = this.findQueueEntry(alarmId);
    if (!entry) return false;

    return this.performEscalation(entry);
  }

  /**
   * Suppress alarm temporarily (user action)
   */
  public suppressAlarm(alarmId: string, durationMs: number): boolean {
    const entry = this.findQueueEntry(alarmId);
    if (!entry) return false;

    // Can't suppress critical safety alarms
    if (entry.bypassGrouping && entry.alarm.level === 'critical') {
      return false;
    }

    entry.suppressedUntil = Date.now() + durationMs;
    return true;
  }

  /**
   * Get queue statistics for monitoring
   */
  public getQueueStats(): {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    totalCount: number;
    oldestAlarm?: PriorityQueueEntry;
    avgContextRelevance: number;
    escalationsPending: number;
  } {
    const allEntries = [...this.criticalQueue, ...this.warningQueue, ...this.infoQueue];

    const oldestAlarm = allEntries.reduce(
      (oldest, entry) => (!oldest || entry.enqueuedAt < oldest.enqueuedAt ? entry : oldest),
      undefined as PriorityQueueEntry | undefined,
    );

    const avgRelevance =
      allEntries.length > 0
        ? allEntries.reduce((sum, entry) => sum + entry.contextRelevance, 0) / allEntries.length
        : 0;

    const escalationsPending = allEntries.filter(
      (entry) => entry.nextEscalationAt && entry.nextEscalationAt <= Date.now(),
    ).length;

    return {
      criticalCount: this.criticalQueue.length,
      warningCount: this.warningQueue.length,
      infoCount: this.infoQueue.length,
      totalCount: allEntries.length,
      oldestAlarm,
      avgContextRelevance: avgRelevance,
      escalationsPending,
    };
  }

  /**
   * Set event callbacks
   */
  public setCallbacks(callbacks: {
    onAlarmEscalated?: (entry: PriorityQueueEntry, newLevel: AlarmEscalationLevel) => void;
    onCriticalAlarmExpired?: (entry: PriorityQueueEntry) => void;
    onQueueOverflow?: (droppedEntries: PriorityQueueEntry[]) => void;
  }): void {
    this.onAlarmEscalated = callbacks.onAlarmEscalated;
    this.onCriticalAlarmExpired = callbacks.onCriticalAlarmExpired;
    this.onQueueOverflow = callbacks.onQueueOverflow;
  }

  // Private implementation methods

  private createQueueEntry(alarm: Alarm, group?: AlarmGroup): PriorityQueueEntry {
    const now = Date.now();
    const priority = this.priorityCalculator.calculatePriority(alarm, group, this.currentContext);

    // Determine marine safety classification
    const marineSafety = this.classifyMarineSafety(alarm);

    // Check if should bypass grouping
    const bypassGrouping = this.shouldBypassGrouping(alarm);

    // Calculate acknowledgment deadline for critical alarms
    const acknowledgeDeadline =
      alarm.level === 'critical'
        ? now + this.configuration.acknowledgmentTimeouts.critical
        : undefined;

    return {
      id: `queue-${now}-${Math.random().toString(36).substr(2, 9)}`,
      alarm,
      group,
      priority,
      queuePosition: -1, // Will be set when added to queue

      // Escalation
      escalationLevel: this.mapAlarmLevelToEscalation(alarm.level),
      originalLevel: alarm.level,
      escalationCount: 0,
      nextEscalationAt: this.configuration.autoEscalationEnabled
        ? this.calculateNextEscalation(alarm.level, now)
        : undefined,

      // Context
      contextRelevance: 1.0, // Will be calculated by context filter
      marineSafetyClassification: marineSafety,
      bypassGrouping,

      // Timing
      enqueuedAt: now,
      acknowledgeDeadline,

      // User interaction
      userInteracted: false,
    };
  }

  private addToQueue(entry: PriorityQueueEntry): void {
    const targetQueue = this.getTargetQueue(entry.alarm.level);

    // Insert in priority order
    const insertIndex = targetQueue.findIndex((existing) => existing.priority < entry.priority);

    if (insertIndex >= 0) {
      targetQueue.splice(insertIndex, 0, entry);
    } else {
      targetQueue.push(entry);
    }

    // Check for queue overflow
    this.handleQueueOverflow(targetQueue);
  }

  private getTargetQueue(level: AlarmLevel): PriorityQueueEntry[] {
    switch (level) {
      case 'critical':
        return this.criticalQueue;
      case 'warning':
        return this.warningQueue;
      case 'info':
        return this.infoQueue;
      default:
        return this.infoQueue;
    }
  }

  private handleQueueOverflow(queue: PriorityQueueEntry[]): void {
    if (queue.length > this.configuration.maxSize) {
      // Remove lowest priority items (from end of queue)
      const dropped = queue.splice(this.configuration.maxSize);

      if (this.onQueueOverflow && dropped.length > 0) {
        this.onQueueOverflow(dropped);
      }
    }
  }

  private updateQueuePositions(): void {
    const updatePositions = (queue: PriorityQueueEntry[]) => {
      queue.forEach((entry, index) => {
        entry.queuePosition = index;
      });
    };

    updatePositions(this.criticalQueue);
    updatePositions(this.warningQueue);
    updatePositions(this.infoQueue);
  }

  private startEscalationTimer(): void {
    if (this.escalationTimer) {
      clearInterval(this.escalationTimer);
    }

    // Check for escalations every 10 seconds
    this.escalationTimer = setInterval(() => {
      this.processEscalations();
    }, 10000);
  }

  private processEscalations(): void {
    if (!this.configuration.autoEscalationEnabled) return;

    const now = Date.now();
    const allEntries = [...this.criticalQueue, ...this.warningQueue, ...this.infoQueue];

    for (const entry of allEntries) {
      // Check for escalation
      if (entry.nextEscalationAt && entry.nextEscalationAt <= now) {
        this.performEscalation(entry);
      }

      // Check for critical alarm acknowledgment deadline
      if (entry.acknowledgeDeadline && entry.acknowledgeDeadline <= now && !entry.userInteracted) {
        if (this.onCriticalAlarmExpired) {
          this.onCriticalAlarmExpired(entry);
        }
      }
    }
  }

  private performEscalation(entry: PriorityQueueEntry): boolean {
    const currentLevel = entry.escalationLevel;
    let newLevel: AlarmEscalationLevel;

    // Determine next escalation level
    switch (currentLevel) {
      case AlarmEscalationLevel.INFO:
        newLevel = AlarmEscalationLevel.WARNING;
        break;
      case AlarmEscalationLevel.WARNING:
        newLevel = AlarmEscalationLevel.CAUTION;
        break;
      case AlarmEscalationLevel.CAUTION:
        newLevel = AlarmEscalationLevel.CRITICAL;
        break;
      case AlarmEscalationLevel.CRITICAL:
        newLevel = AlarmEscalationLevel.EMERGENCY;
        break;
      case AlarmEscalationLevel.EMERGENCY:
        // Can't escalate beyond emergency
        return false;
      default:
        return false;
    }

    // Update entry
    entry.escalationLevel = newLevel;
    entry.escalatedAt = Date.now();
    entry.escalationCount++;

    // Calculate next escalation time
    entry.nextEscalationAt = this.calculateNextEscalation(
      this.mapEscalationToAlarmLevel(newLevel),
      entry.escalatedAt,
    );

    // Recalculate priority with new level
    entry.priority = this.priorityCalculator.calculatePriority(
      entry.alarm,
      entry.group,
      this.currentContext,
      newLevel,
    );

    // Move to appropriate queue if level changed
    this.rebalanceQueues(entry);

    // Notify callback
    if (this.onAlarmEscalated) {
      this.onAlarmEscalated(entry, newLevel);
    }

    return true;
  }

  private rebalanceQueues(entry: PriorityQueueEntry): void {
    // Remove from current queue
    const queues = [this.criticalQueue, this.warningQueue, this.infoQueue];
    for (const queue of queues) {
      const index = queue.findIndex((e) => e.id === entry.id);
      if (index >= 0) {
        queue.splice(index, 1);
        break;
      }
    }

    // Add to new queue based on escalated level
    const targetLevel = this.mapEscalationToAlarmLevel(entry.escalationLevel);
    const targetQueue = this.getTargetQueue(targetLevel);

    // Insert in priority order
    const insertIndex = targetQueue.findIndex((existing) => existing.priority < entry.priority);

    if (insertIndex >= 0) {
      targetQueue.splice(insertIndex, 0, entry);
    } else {
      targetQueue.push(entry);
    }

    this.updateQueuePositions();
  }

  private findQueueEntry(alarmId: string): PriorityQueueEntry | null {
    const allEntries = [...this.criticalQueue, ...this.warningQueue, ...this.infoQueue];

    return allEntries.find((entry) => entry.alarm.id === alarmId) || null;
  }

  private recalculateContextRelevance(): void {
    const allEntries = [...this.criticalQueue, ...this.warningQueue, ...this.infoQueue];

    for (const entry of allEntries) {
      entry.contextRelevance = this.contextFilter.calculateRelevance(
        entry.alarm,
        this.currentContext,
      );
    }
  }

  private classifyMarineSafety(alarm: Alarm): string {
    if (alarm.level === 'critical') {
      // Check if navigation or safety related
      const safetyKeywords = ['shallow', 'depth', 'gps', 'autopilot', 'collision'];
      const isNavSafety = safetyKeywords.some((keyword) =>
        alarm.message.toLowerCase().includes(keyword),
      );

      return isNavSafety ? 'NAVIGATION_CRITICAL' : 'SYSTEM_CRITICAL';
    }

    return 'STANDARD';
  }

  private shouldBypassGrouping(alarm: Alarm): boolean {
    if (!this.configuration.marineSafetyBypass) return false;

    // Critical navigation and safety alarms bypass grouping
    const bypassKeywords = ['shallow', 'depth', 'collision', 'gps', 'autopilot', 'emergency'];

    return (
      alarm.level === 'critical' &&
      bypassKeywords.some(
        (keyword) =>
          alarm.message.toLowerCase().includes(keyword) ||
          alarm.source?.toLowerCase().includes(keyword),
      )
    );
  }

  private mapAlarmLevelToEscalation(level: AlarmLevel): AlarmEscalationLevel {
    switch (level) {
      case 'info':
        return AlarmEscalationLevel.INFO;
      case 'warning':
        return AlarmEscalationLevel.WARNING;
      case 'critical':
        return AlarmEscalationLevel.CRITICAL;
      default:
        return AlarmEscalationLevel.INFO;
    }
  }

  private mapEscalationToAlarmLevel(escalation: AlarmEscalationLevel): AlarmLevel {
    switch (escalation) {
      case AlarmEscalationLevel.EMERGENCY:
      case AlarmEscalationLevel.CRITICAL:
        return 'critical';
      case AlarmEscalationLevel.CAUTION:
      case AlarmEscalationLevel.WARNING:
        return 'warning';
      case AlarmEscalationLevel.INFO:
      default:
        return 'info';
    }
  }

  private calculateNextEscalation(level: AlarmLevel, timestamp: number): number | undefined {
    const intervalMap: Record<AlarmLevel, keyof typeof this.configuration.escalationIntervals> = {
      warning: 'warning',
      critical: 'critical',
      info: 'warning', // Info escalates using warning interval
    };

    const intervalKey = intervalMap[level];
    const interval = intervalKey ? this.configuration.escalationIntervals[intervalKey] : undefined;
    return interval ? timestamp + interval : undefined;
  }

  public cleanup(): void {
    if (this.escalationTimer) {
      clearInterval(this.escalationTimer);
      this.escalationTimer = undefined;
    }
  }
}

/**
 * Priority calculator for alarm queue ordering
 */
class PriorityCalculator {
  public calculatePriority(
    alarm: Alarm,
    group?: AlarmGroup,
    context?: VesselContext,
    escalationLevel?: AlarmEscalationLevel,
  ): number {
    let priority = 0;

    // Base priority from alarm level
    const levelPriority = {
      critical: 1000,
      warning: 500,
      info: 100,
    };
    priority += levelPriority[alarm.level] || 0;

    // Escalation bonus
    if (escalationLevel) {
      const escalationBonus = {
        [AlarmEscalationLevel.EMERGENCY]: 500,
        [AlarmEscalationLevel.CRITICAL]: 300,
        [AlarmEscalationLevel.CAUTION]: 200,
        [AlarmEscalationLevel.WARNING]: 100,
        [AlarmEscalationLevel.INFO]: 0,
      };
      priority += escalationBonus[escalationLevel] || 0;
    }

    // Marine system category bonus
    if (group) {
      const categoryBonus: Record<MarineSystemCategory, number> = {
        [MarineSystemCategory.SAFETY]: 300,
        [MarineSystemCategory.NAVIGATION]: 250,
        [MarineSystemCategory.ENGINE]: 200,
        [MarineSystemCategory.ELECTRICAL]: 150,
        [MarineSystemCategory.PROPULSION]: 100,
        [MarineSystemCategory.STEERING]: 80,
        [MarineSystemCategory.COMMUNICATION]: 60,
        [MarineSystemCategory.ENVIRONMENTAL]: 40,
      };
      priority += categoryBonus[group.category] || 50;
    }

    // Time-based priority (older alarms get slight priority boost)
    const age = Date.now() - alarm.timestamp;
    const ageBonus = Math.min(age / (60 * 1000), 50); // Max 50 points for age
    priority += ageBonus;

    // Context relevance (if provided)
    if (context) {
      // Boost priority for relevant alarms in current context
      if (context.state === 'anchored') {
        // Boost anchor-related alarms
        if (
          alarm.message.toLowerCase().includes('anchor') ||
          alarm.message.toLowerCase().includes('drag')
        ) {
          priority += 200;
        }
      } else if (context.state === 'sailing' || context.state === 'motoring') {
        // Boost navigation and engine alarms
        if (
          alarm.message.toLowerCase().includes('navigation') ||
          alarm.message.toLowerCase().includes('engine')
        ) {
          priority += 150;
        }
      }
    }

    return Math.round(priority);
  }
}

/**
 * Context filter for alarm relevance calculation
 */
class ContextFilter {
  public calculateRelevance(alarm: Alarm, context: VesselContext): number {
    let relevance = 0.5; // Base relevance

    // State-based relevance
    if (context.state === 'anchored') {
      // Anchor-specific alarms are more relevant
      if (this.isAnchorRelated(alarm)) {
        relevance += 0.4;
      }
      // Engine alarms less relevant when anchored
      if (this.isEngineRelated(alarm)) {
        relevance -= 0.2;
      }
    } else if (context.state === 'sailing' || context.state === 'motoring') {
      // Navigation and engine alarms more relevant when underway
      if (this.isNavigationRelated(alarm) || this.isEngineRelated(alarm)) {
        relevance += 0.3;
      }
    }

    // Weather-based relevance
    if (context.weather === 'severe' || context.weather === 'rough') {
      // All safety alarms more relevant in bad weather
      if (this.isSafetyRelated(alarm)) {
        relevance += 0.2;
      }
    }

    // Time-based relevance
    if (context.timeOfDay === 'night') {
      // Visual alarms less effective at night
      if (this.isVisualAlarm(alarm)) {
        relevance -= 0.1;
      }
      // Navigation alarms more critical at night
      if (this.isNavigationRelated(alarm)) {
        relevance += 0.1;
      }
    }

    // Crew watch relevance
    if (!context.crewOnWatch) {
      // All alarms more critical when no crew on watch
      relevance += 0.2;
    }

    // Apply confidence scaling
    const confidenceAdjustment = (context.confidence - 0.5) * 0.2;
    relevance += confidenceAdjustment;

    // Clamp to valid range
    return Math.max(0, Math.min(1, relevance));
  }

  private isAnchorRelated(alarm: Alarm): boolean {
    const anchorKeywords = ['anchor', 'drag', 'position', 'drift'];
    return anchorKeywords.some((keyword) => alarm.message.toLowerCase().includes(keyword));
  }

  private isEngineRelated(alarm: Alarm): boolean {
    const engineKeywords = ['engine', 'motor', 'oil', 'coolant', 'temperature', 'pressure'];
    return engineKeywords.some((keyword) => alarm.message.toLowerCase().includes(keyword));
  }

  private isNavigationRelated(alarm: Alarm): boolean {
    const navKeywords = ['navigation', 'gps', 'depth', 'course', 'position', 'autopilot'];
    return navKeywords.some((keyword) => alarm.message.toLowerCase().includes(keyword));
  }

  private isSafetyRelated(alarm: Alarm): boolean {
    const safetyKeywords = ['safety', 'emergency', 'collision', 'shallow', 'critical'];
    return safetyKeywords.some((keyword) => alarm.message.toLowerCase().includes(keyword));
  }

  private isVisualAlarm(alarm: Alarm): boolean {
    // Assume visual alarms are those that rely primarily on visual cues
    return (
      !alarm.message.toLowerCase().includes('audio') &&
      !alarm.message.toLowerCase().includes('sound')
    );
  }
}
