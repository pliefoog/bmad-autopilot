/**
 * AlarmGroupingEngine - Smart alarm grouping based on marine system relationships
 * Provides intelligent grouping of related alarms to reduce cognitive overload
 */

import { CriticalAlarmType, AlarmEscalationLevel } from './types';
import { Alarm, AlarmLevel } from '../../store/alarmStore';

/**
 * Marine system categories for intelligent alarm grouping
 */
export enum MarineSystemCategory {
  ENGINE = 'ENGINE',
  ELECTRICAL = 'ELECTRICAL',
  NAVIGATION = 'NAVIGATION',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  SAFETY = 'SAFETY',
  COMMUNICATION = 'COMMUNICATION',
  PROPULSION = 'PROPULSION',
  STEERING = 'STEERING',
}

/**
 * Alarm group with priority-based organization
 */
export interface AlarmGroup {
  id: string;
  category: MarineSystemCategory;
  name: string;
  description: string;
  alarms: Alarm[];
  highestPriority: AlarmLevel;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
  primaryAlarm: Alarm | null; // Most critical alarm in the group
  collapsed: boolean;
  lastUpdated: number;
}

/**
 * Alarm relationship definition for smart grouping
 */
export interface AlarmRelationship {
  primarySystem: MarineSystemCategory;
  relatedSystems: MarineSystemCategory[];
  keywords: string[];
  dataPathPatterns: RegExp[];
  priority: number; // Higher priority relationships group first
  requiresSimultaneous: boolean; // True if alarms must be active simultaneously
}

/**
 * Grouping rule configuration
 */
export interface GroupingRule {
  id: string;
  name: string;
  category: MarineSystemCategory;
  patterns: {
    alarmSources: string[];
    dataPathPatterns: string[];
    messageKeywords: string[];
    thresholdIds: string[];
  };
  priority: number;
  enabled: boolean;
  marineSafetyExempt?: boolean; // If true, critical alarms bypass this grouping
}

/**
 * Smart alarm grouping engine with marine system intelligence
 */
export class AlarmGroupingEngine {
  private relationships: AlarmRelationship[];
  private groupingRules: GroupingRule[];
  private activeGroups: Map<string, AlarmGroup> = new Map();
  private groupingEnabled: boolean = true;

  constructor() {
    this.relationships = this.initializeMarineSystemRelationships();
    this.groupingRules = this.initializeGroupingRules();
  }

  /**
   * Process alarms and create intelligent groups
   */
  public processAlarms(alarms: Alarm[]): AlarmGroup[] {
    if (!this.groupingEnabled || alarms.length === 0) {
      return [];
    }

    // Clear existing groups
    this.activeGroups.clear();

    // Sort alarms by priority for processing
    const sortedAlarms = this.sortAlarmsByPriority(alarms);

    // Group alarms using marine system intelligence
    for (const alarm of sortedAlarms) {
      this.assignAlarmToGroup(alarm);
    }

    // Post-process groups (merge related, validate priorities)
    this.postProcessGroups();

    // Return groups sorted by priority
    return Array.from(this.activeGroups.values()).sort((a, b) => this.compareGroupPriority(a, b));
  }

  /**
   * Get ungrouped critical alarms (always bypass grouping for marine safety)
   */
  public getCriticalAlarms(alarms: Alarm[]): Alarm[] {
    return alarms.filter(
      (alarm) => alarm.level === 'critical' && this.isCriticalSafetyAlarm(alarm),
    );
  }

  /**
   * Update group collapse state
   */
  public toggleGroupCollapse(groupId: string): void {
    const group = this.activeGroups.get(groupId);
    if (group) {
      group.collapsed = !group.collapsed;
      group.lastUpdated = Date.now();
    }
  }

  /**
   * Get group by ID
   */
  public getGroup(groupId: string): AlarmGroup | undefined {
    return this.activeGroups.get(groupId);
  }

  /**
   * Enable or disable grouping functionality
   */
  public setGroupingEnabled(enabled: boolean): void {
    this.groupingEnabled = enabled;
    if (!enabled) {
      this.activeGroups.clear();
    }
  }

  /**
   * Get alarm relationship suggestions for configuration
   */
  public getRelationshipSuggestions(alarm: Alarm): MarineSystemCategory[] {
    const suggestions: MarineSystemCategory[] = [];

    for (const relationship of this.relationships) {
      if (this.matchesRelationship(alarm, relationship)) {
        suggestions.push(relationship.primarySystem);
        suggestions.push(...relationship.relatedSystems);
      }
    }

    return Array.from(new Set(suggestions));
  }

  // Private implementation methods

  private initializeMarineSystemRelationships(): AlarmRelationship[] {
    return [
      // Engine System Relationships
      {
        primarySystem: MarineSystemCategory.ENGINE,
        relatedSystems: [MarineSystemCategory.ELECTRICAL, MarineSystemCategory.PROPULSION],
        keywords: ['engine', 'motor', 'coolant', 'oil', 'temperature', 'pressure', 'rpm'],
        dataPathPatterns: [/^engine\./i, /coolant/i, /oil/i, /rpm/i],
        priority: 10,
        requiresSimultaneous: true,
      },

      // Electrical System Relationships
      {
        primarySystem: MarineSystemCategory.ELECTRICAL,
        relatedSystems: [MarineSystemCategory.ENGINE, MarineSystemCategory.NAVIGATION],
        keywords: ['battery', 'voltage', 'current', 'charging', 'power', 'electrical'],
        dataPathPatterns: [/^electrical\./i, /battery/i, /voltage/i, /current/i],
        priority: 9,
        requiresSimultaneous: false,
      },

      // Navigation System Relationships
      {
        primarySystem: MarineSystemCategory.NAVIGATION,
        relatedSystems: [MarineSystemCategory.SAFETY, MarineSystemCategory.COMMUNICATION],
        keywords: ['gps', 'depth', 'autopilot', 'position', 'navigation', 'compass'],
        dataPathPatterns: [/^navigation\./i, /^gps\./i, /depth/i, /position/i],
        priority: 10, // High priority for safety
        requiresSimultaneous: false,
      },

      // Safety System Relationships
      {
        primarySystem: MarineSystemCategory.SAFETY,
        relatedSystems: [MarineSystemCategory.NAVIGATION, MarineSystemCategory.COMMUNICATION],
        keywords: ['shallow', 'collision', 'man overboard', 'emergency', 'safety'],
        dataPathPatterns: [/shallow/i, /collision/i, /emergency/i, /safety/i],
        priority: 15, // Highest priority
        requiresSimultaneous: false,
      },

      // Environmental System Relationships
      {
        primarySystem: MarineSystemCategory.ENVIRONMENTAL,
        relatedSystems: [MarineSystemCategory.NAVIGATION, MarineSystemCategory.SAFETY],
        keywords: ['wind', 'weather', 'sea', 'temperature', 'humidity', 'pressure'],
        dataPathPatterns: [/^environment\./i, /wind/i, /weather/i, /pressure/i],
        priority: 5,
        requiresSimultaneous: false,
      },
    ];
  }

  private initializeGroupingRules(): GroupingRule[] {
    return [
      // Engine System Rules
      {
        id: 'engine-temperature-group',
        name: 'Engine Temperature & Cooling',
        category: MarineSystemCategory.ENGINE,
        patterns: {
          alarmSources: ['engine', 'coolant', 'temperature'],
          dataPathPatterns: ['engine.coolantTemp', 'engine.oilTemp', 'engine.exhaustTemp'],
          messageKeywords: ['engine', 'temperature', 'coolant', 'overheat', 'hot'],
          thresholdIds: ['engine-temp-high', 'engine-temp-critical', 'coolant-level-low'],
        },
        priority: 10,
        enabled: true,
      },

      {
        id: 'engine-pressure-group',
        name: 'Engine Pressure & Fluids',
        category: MarineSystemCategory.ENGINE,
        patterns: {
          alarmSources: ['engine', 'oil', 'fuel'],
          dataPathPatterns: ['engine.oilPressure', 'engine.fuelPressure', 'engine.oilLevel'],
          messageKeywords: ['oil', 'pressure', 'fuel', 'lubrication', 'fluid'],
          thresholdIds: ['oil-pressure-low', 'fuel-pressure-low', 'oil-level-low'],
        },
        priority: 10,
        enabled: true,
      },

      // Electrical System Rules
      {
        id: 'electrical-battery-group',
        name: 'Battery & Charging System',
        category: MarineSystemCategory.ELECTRICAL,
        patterns: {
          alarmSources: ['battery', 'electrical', 'charging'],
          dataPathPatterns: [
            'electrical.batteryVoltage',
            'electrical.chargingCurrent',
            'electrical.alternatorOutput',
          ],
          messageKeywords: ['battery', 'voltage', 'charging', 'electrical', 'power'],
          thresholdIds: ['battery-low-warning', 'battery-low-critical', 'charging-failure'],
        },
        priority: 9,
        enabled: true,
      },

      // Navigation System Rules
      {
        id: 'navigation-gps-group',
        name: 'GPS & Positioning',
        category: MarineSystemCategory.NAVIGATION,
        patterns: {
          alarmSources: ['gps', 'position', 'navigation'],
          dataPathPatterns: ['navigation.position', 'gps.fix', 'navigation.accuracy'],
          messageKeywords: ['gps', 'position', 'navigation', 'fix', 'satellite'],
          thresholdIds: ['gps-loss', 'position-accuracy-poor'],
        },
        priority: 10,
        enabled: true,
        marineSafetyExempt: false, // GPS critical for safety
      },

      {
        id: 'navigation-depth-group',
        name: 'Depth & Shallow Water',
        category: MarineSystemCategory.NAVIGATION,
        patterns: {
          alarmSources: ['depth', 'sonar', 'echo'],
          dataPathPatterns: ['depth', 'navigation.depth', 'sonar.depth'],
          messageKeywords: ['depth', 'shallow', 'water', 'bottom', 'sonar'],
          thresholdIds: ['shallow-water', 'critical-depth'],
        },
        priority: 15, // Critical for safety
        enabled: true,
        marineSafetyExempt: false,
      },

      // Safety System Rules
      {
        id: 'safety-autopilot-group',
        name: 'Autopilot & Steering',
        category: MarineSystemCategory.SAFETY,
        patterns: {
          alarmSources: ['autopilot', 'steering', 'rudder'],
          dataPathPatterns: ['autopilot.status', 'steering.position', 'rudder.position'],
          messageKeywords: ['autopilot', 'steering', 'rudder', 'course', 'heading'],
          thresholdIds: ['autopilot-failure', 'steering-failure', 'rudder-stuck'],
        },
        priority: 15,
        enabled: true,
        marineSafetyExempt: false,
      },
    ];
  }

  private sortAlarmsByPriority(alarms: Alarm[]): Alarm[] {
    const priorityOrder = { critical: 3, warning: 2, info: 1 };

    return [...alarms].sort((a, b) => {
      const aPriority = priorityOrder[a.level] || 0;
      const bPriority = priorityOrder[b.level] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by timestamp (newer first)
      return b.timestamp - a.timestamp;
    });
  }

  private assignAlarmToGroup(alarm: Alarm): void {
    // Check if this is a critical safety alarm that should bypass grouping
    if (this.shouldBypassGrouping(alarm)) {
      return;
    }

    // Find the best matching group
    const matchingRule = this.findBestMatchingRule(alarm);

    if (matchingRule) {
      const groupId = `group-${matchingRule.category.toLowerCase()}`;
      let group = this.activeGroups.get(groupId);

      if (!group) {
        group = this.createGroup(groupId, matchingRule);
      }

      // Add alarm to group
      group.alarms.push(alarm);
      this.updateGroupMetrics(group);

      this.activeGroups.set(groupId, group);
    }
  }

  private shouldBypassGrouping(alarm: Alarm): boolean {
    // Critical alarms with navigation or safety implications bypass grouping
    if (alarm.level === 'critical') {
      const safetyKeywords = ['shallow', 'depth', 'collision', 'emergency', 'gps', 'autopilot'];
      return safetyKeywords.some(
        (keyword) =>
          alarm.message.toLowerCase().includes(keyword) ||
          alarm.source?.toLowerCase().includes(keyword),
      );
    }

    return false;
  }

  private findBestMatchingRule(alarm: Alarm): GroupingRule | null {
    let bestMatch: GroupingRule | null = null;
    let bestScore = 0;

    for (const rule of this.groupingRules) {
      if (!rule.enabled) continue;

      const score = this.calculateMatchScore(alarm, rule);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  private calculateMatchScore(alarm: Alarm, rule: GroupingRule): number {
    let score = 0;

    // Check alarm source matches
    if (alarm.source) {
      const sourceMatch = rule.patterns.alarmSources.some((source) =>
        alarm.source!.toLowerCase().includes(source.toLowerCase()),
      );
      if (sourceMatch) score += 3;
    }

    // Check message keyword matches
    const messageMatch = rule.patterns.messageKeywords.some((keyword) =>
      alarm.message.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (messageMatch) score += 2;

    // Check threshold ID matches (if available in alarm metadata)
    if (alarm.source && rule.patterns.thresholdIds.includes(alarm.source)) {
      score += 4; // High score for exact threshold match
    }

    // Bonus for rule priority
    score += rule.priority * 0.1;

    return score;
  }

  private createGroup(groupId: string, rule: GroupingRule): AlarmGroup {
    return {
      id: groupId,
      category: rule.category,
      name: rule.name,
      description: `Grouped alarms for ${rule.category.toLowerCase()} system`,
      alarms: [],
      highestPriority: 'info',
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalCount: 0,
      primaryAlarm: null,
      collapsed: false, // Start expanded
      lastUpdated: Date.now(),
    };
  }

  private updateGroupMetrics(group: AlarmGroup): void {
    // Reset counters
    group.criticalCount = 0;
    group.warningCount = 0;
    group.infoCount = 0;

    // Count alarms by level and find primary alarm
    let highestPriorityLevel = 'info' as AlarmLevel;
    let primaryAlarm: Alarm | null = null;

    for (const alarm of group.alarms) {
      switch (alarm.level) {
        case 'critical':
          group.criticalCount++;
          if (highestPriorityLevel !== 'critical') {
            highestPriorityLevel = 'critical';
            primaryAlarm = alarm;
          }
          break;
        case 'warning':
          group.warningCount++;
          if (highestPriorityLevel === 'info') {
            highestPriorityLevel = 'warning';
            primaryAlarm = alarm;
          }
          break;
        case 'info':
          group.infoCount++;
          if (!primaryAlarm) {
            primaryAlarm = alarm;
          }
          break;
      }
    }

    group.totalCount = group.alarms.length;
    group.highestPriority = highestPriorityLevel;
    group.primaryAlarm = primaryAlarm;
    group.lastUpdated = Date.now();
  }

  private postProcessGroups(): void {
    // Merge related groups if they have simultaneous alarms
    this.mergeRelatedGroups();

    // Validate group priorities and reorder if necessary
    this.validateGroupPriorities();
  }

  private mergeRelatedGroups(): void {
    const groups = Array.from(this.activeGroups.values());

    for (const relationship of this.relationships) {
      if (!relationship.requiresSimultaneous) continue;

      const primaryGroup = groups.find((g) => g.category === relationship.primarySystem);
      const relatedGroups = groups.filter((g) => relationship.relatedSystems.includes(g.category));

      if (primaryGroup && relatedGroups.length > 0) {
        // Check if alarms occurred within a reasonable time window (5 minutes)
        const timeWindow = 5 * 60 * 1000; // 5 minutes
        const hasSimultaneousAlarms = this.checkSimultaneousAlarms(
          primaryGroup,
          relatedGroups,
          timeWindow,
        );

        if (hasSimultaneousAlarms) {
          // Merge related groups into primary group
          for (const relatedGroup of relatedGroups) {
            primaryGroup.alarms.push(...relatedGroup.alarms);
            this.activeGroups.delete(relatedGroup.id);
          }

          // Update primary group name and metrics
          primaryGroup.name = `${relationship.primarySystem} System Complex`;
          this.updateGroupMetrics(primaryGroup);
        }
      }
    }
  }

  private checkSimultaneousAlarms(
    primaryGroup: AlarmGroup,
    relatedGroups: AlarmGroup[],
    timeWindow: number,
  ): boolean {
    const primaryTimes = primaryGroup.alarms.map((a) => a.timestamp);

    for (const relatedGroup of relatedGroups) {
      for (const alarm of relatedGroup.alarms) {
        const hasNearbyPrimary = primaryTimes.some(
          (time) => Math.abs(alarm.timestamp - time) <= timeWindow,
        );

        if (hasNearbyPrimary) {
          return true;
        }
      }
    }

    return false;
  }

  private validateGroupPriorities(): void {
    // Ensure safety and navigation groups have highest priority
    const groups = Array.from(this.activeGroups.values());

    for (const group of groups) {
      if (
        group.category === MarineSystemCategory.SAFETY ||
        group.category === MarineSystemCategory.NAVIGATION
      ) {
        // These groups should never be auto-collapsed
        group.collapsed = false;
      }
    }
  }

  private compareGroupPriority(a: AlarmGroup, b: AlarmGroup): number {
    // Priority order: Safety > Navigation > Engine > Electrical > Others
    const categoryPriority = {
      [MarineSystemCategory.SAFETY]: 10,
      [MarineSystemCategory.NAVIGATION]: 9,
      [MarineSystemCategory.ENGINE]: 8,
      [MarineSystemCategory.ELECTRICAL]: 7,
      [MarineSystemCategory.PROPULSION]: 6,
      [MarineSystemCategory.STEERING]: 5,
      [MarineSystemCategory.COMMUNICATION]: 4,
      [MarineSystemCategory.ENVIRONMENTAL]: 3,
    };

    const aPriority = categoryPriority[a.category] || 0;
    const bPriority = categoryPriority[b.category] || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // If same category priority, compare by alarm levels
    const levelPriority = { critical: 3, warning: 2, info: 1 };
    const aLevel = levelPriority[a.highestPriority] || 0;
    const bLevel = levelPriority[b.highestPriority] || 0;

    if (aLevel !== bLevel) {
      return bLevel - aLevel;
    }

    // Finally, sort by last updated (most recent first)
    return b.lastUpdated - a.lastUpdated;
  }

  private matchesRelationship(alarm: Alarm, relationship: AlarmRelationship): boolean {
    // Check keyword matches
    const keywordMatch = relationship.keywords.some(
      (keyword) =>
        alarm.message.toLowerCase().includes(keyword.toLowerCase()) ||
        alarm.source?.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (keywordMatch) return true;

    // Check data path pattern matches
    if (alarm.source) {
      const pathMatch = relationship.dataPathPatterns.some((pattern) =>
        pattern.test(alarm.source!),
      );

      if (pathMatch) return true;
    }

    return false;
  }

  private isCriticalSafetyAlarm(alarm: Alarm): boolean {
    const criticalSafetySources = [
      CriticalAlarmType.SHALLOW_WATER,
      CriticalAlarmType.AUTOPILOT_FAILURE,
      CriticalAlarmType.GPS_LOSS,
    ];

    return criticalSafetySources.some(
      (type) =>
        alarm.source?.includes(type) || alarm.message.toLowerCase().includes(type.toLowerCase()),
    );
  }
}
