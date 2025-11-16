/**
 * CriticalAlarmConfiguration - User threshold configuration with marine safety validation
 * Manages user-configurable thresholds with marine safety standards compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CriticalAlarmType, 
  CriticalAlarmConfig, 
  CriticalAlarmThreshold, 
  AlarmSnoozeConfig,
  AlarmTestConfig 
} from './types';

export interface AlarmConfigurationOptions {
  storageKey: string;
  validateMarineStandards: boolean;
  allowUserOverrides: boolean;
  requireConfirmationForCritical: boolean;
  autoSaveDelay: number; // milliseconds
}

export class CriticalAlarmConfiguration {
  private config: AlarmConfigurationOptions;
  private alarmConfigs: Map<CriticalAlarmType, CriticalAlarmConfig> = new Map();
  private thresholds: Map<string, CriticalAlarmThreshold> = new Map();
  private snoozeConfig: AlarmSnoozeConfig;
  private testConfig: AlarmTestConfig;
  
  private saveTimeout?: NodeJS.Timeout;
  private configChangedCallback?: (type: CriticalAlarmType, config: CriticalAlarmConfig) => void;
  
  constructor(options?: Partial<AlarmConfigurationOptions>) {
    this.config = {
      storageKey: 'critical-alarm-configuration',
      validateMarineStandards: true,
      allowUserOverrides: true,
      requireConfirmationForCritical: true,
      autoSaveDelay: 2000, // 2 seconds
      ...options,
    };
    
    this.snoozeConfig = this.getDefaultSnoozeConfig();
    this.testConfig = this.getDefaultTestConfig();
    
    this.initializeDefaultConfigurations();
    this.loadConfigurationsFromStorage();
  }
  
  /**
   * Get configuration for specific critical alarm type
   */
  public getAlarmConfig(type: CriticalAlarmType): CriticalAlarmConfig | undefined {
    return this.alarmConfigs.get(type);
  }
  
  /**
   * Update configuration for critical alarm type with marine safety validation
   */
  public async updateAlarmConfig(
    type: CriticalAlarmType, 
    updates: Partial<CriticalAlarmConfig>
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: false, errors: [] as string[] };
    
    try {
      const currentConfig = this.alarmConfigs.get(type);
      if (!currentConfig) {
        result.errors.push(`No configuration found for alarm type: ${type}`);
        return result;
      }
      
      const newConfig = { ...currentConfig, ...updates };
      
      // Validate marine safety standards only for critical navigation alarms
      // Non-critical alarms (like LOW_BATTERY) have different requirements
      if (this.config.validateMarineStandards && this.isCriticalNavigationAlarm(type) && updates.enabled !== false) {
        const validationResult = this.validateMarineStandards(newConfig);
        console.log('[CriticalAlarmConfiguration] validateMarineStandards result:', validationResult);
        if (!validationResult.valid) {
          console.log('[CriticalAlarmConfiguration] Marine standards validation failed:', validationResult.errors);
          result.errors.push(...validationResult.errors);
          return result;
        }
      }
      
      // Validate user permissions for critical settings
      const permissionResult = this.validateUserPermissions(type, updates);
      console.log('[CriticalAlarmConfiguration] validateUserPermissions result:', permissionResult);
      if (!permissionResult.allowed) {
        console.log('[CriticalAlarmConfiguration] Permission validation failed:', permissionResult.errors);
        result.errors.push(...permissionResult.errors);
        return result;
      }
      
      // Update configuration
      this.alarmConfigs.set(type, newConfig);
      
      // Schedule auto-save
      this.scheduleAutoSave();
      
      // Notify callback
      if (this.configChangedCallback) {
        this.configChangedCallback(type, newConfig);
      }
      
      result.success = true;
      
      console.log('CriticalAlarmConfiguration: Updated configuration', {
        type,
        updates: Object.keys(updates),
        marineSafetyCompliant: this.validateMarineStandards(newConfig).valid,
      });
      
    } catch (error) {
      result.errors.push(`Failed to update configuration: ${error instanceof Error ? error.message : error}`);
      console.error('CriticalAlarmConfiguration: Update failed', error);
    }
    
    return result;
  }
  
  /**
   * Get threshold configuration for specific threshold ID
   */
  public getThreshold(thresholdId: string): CriticalAlarmThreshold | undefined {
    return this.thresholds.get(thresholdId);
  }
  
  /**
   * Update threshold with marine safety validation
   */
  public async updateThreshold(
    thresholdId: string,
    updates: Partial<CriticalAlarmThreshold>
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: false, errors: [] as string[] };
    
    try {
      const currentThreshold = this.thresholds.get(thresholdId);
      if (!currentThreshold) {
        result.errors.push(`No threshold found with ID: ${thresholdId}`);
        return result;
      }
      
      const newThreshold = { ...currentThreshold, ...updates };
      
      // Validate marine safety ranges
      const validationResult = this.validateThresholdRanges(newThreshold);
      if (!validationResult.valid) {
        result.errors.push(...validationResult.errors);
        return result;
      }
      
      // Check if user can modify this threshold
      if (!newThreshold.userConfigurable && this.config.allowUserOverrides === false) {
        result.errors.push('This threshold is not user-configurable for safety reasons');
        return result;
      }
      
      // Update threshold
      newThreshold.lastModified = Date.now();
      newThreshold.modifiedBy = 'user'; // In production, would get actual user ID
      this.thresholds.set(thresholdId, newThreshold);
      
      // Schedule auto-save
      this.scheduleAutoSave();
      
      result.success = true;
      
      console.log('CriticalAlarmConfiguration: Updated threshold', {
        thresholdId,
        type: newThreshold.alarmType,
        newValues: updates,
      });
      
    } catch (error) {
      result.errors.push(`Failed to update threshold: ${error instanceof Error ? error.message : error}`);
      console.error('CriticalAlarmConfiguration: Threshold update failed', error);
    }
    
    return result;
  }
  
  /**
   * Get all thresholds for a specific alarm type
   */
  public getThresholdsForAlarmType(type: CriticalAlarmType): CriticalAlarmThreshold[] {
    return Array.from(this.thresholds.values())
      .filter(threshold => threshold.alarmType === type);
  }
  
  /**
   * Enable or disable specific alarm type
   */
  public async setAlarmEnabled(type: CriticalAlarmType, enabled: boolean, confirmed: boolean = false): Promise<{ success: boolean; requiresConfirmation: boolean; message?: string }> {
    const config = this.alarmConfigs.get(type);
    if (!config) {
      return { success: false, requiresConfirmation: false, message: 'Alarm configuration not found' };
    }
    
    // Safety check: Critical navigation alarms require confirmation to disable
    if (!enabled && this.isCriticalNavigationAlarm(type) && !confirmed) {
      console.warn(`CriticalAlarmConfiguration: Critical navigation alarm ${type} requires confirmation to disable`);
      return { 
        success: false, 
        requiresConfirmation: true, 
        message: 'This is a critical navigation alarm. Disabling it may compromise vessel safety. Are you sure you want to disable it?' 
      };
    }
    
    const updateResult = await this.updateAlarmConfig(type, { enabled });
    return { success: updateResult.success, requiresConfirmation: false };
  }
  
  /**
   * Test alarm configuration and system functionality
   */
  public async testAlarmConfiguration(type: CriticalAlarmType): Promise<{
    configurationValid: boolean;
    thresholdsValid: boolean;
    audioSystemReady: boolean;
    visualSystemReady: boolean;
    issues: string[];
  }> {
    const result = {
      configurationValid: false,
      thresholdsValid: false,
      audioSystemReady: false,
      visualSystemReady: false,
      issues: [] as string[],
    };
    
    try {
      // Test configuration validity
      const config = this.alarmConfigs.get(type);
      if (config) {
        // Only validate marine standards for critical navigation alarms
        if (this.isCriticalNavigationAlarm(type)) {
          const configValidation = this.validateMarineStandards(config);
          result.configurationValid = configValidation.valid;
          if (!configValidation.valid) {
            result.issues.push(...configValidation.errors);
          }
        } else {
          // Non-critical alarms are always considered valid for testing
          result.configurationValid = true;
        }
      } else {
        result.issues.push(`No configuration found for alarm type: ${type}`);
      }
      
      // Test thresholds validity
      const thresholds = this.getThresholdsForAlarmType(type);
      if (thresholds.length > 0) {
        const thresholdValidation = this.validateAllThresholds(thresholds);
        result.thresholdsValid = thresholdValidation.valid;
        if (!thresholdValidation.valid) {
          result.issues.push(...thresholdValidation.errors);
        }
      } else {
        result.issues.push(`No thresholds configured for alarm type: ${type}`);
      }
      
      // Test audio system (placeholder - would integrate with MarineAudioAlertManager)
      result.audioSystemReady = config?.audioEnabled || false;
      
      // Test visual system (placeholder - would integrate with visual components)
      result.visualSystemReady = config?.visualEnabled || false;
      
    } catch (error) {
      result.issues.push(`Test failed: ${error instanceof Error ? error.message : error}`);
    }
    
    return result;
  }
  
  /**
   * Get snooze configuration
   */
  public getSnoozeConfig(): AlarmSnoozeConfig {
    return { ...this.snoozeConfig };
  }
  
  /**
   * Update snooze configuration with safety validations
   */
  public async updateSnoozeConfig(updates: Partial<AlarmSnoozeConfig>): Promise<boolean> {
    try {
      const newConfig = { ...this.snoozeConfig, ...updates };
      
      // Validate snooze safety constraints
      if (newConfig.criticalAlarmsAllowed && this.config.validateMarineStandards) {
        console.warn('CriticalAlarmConfiguration: Critical alarms should not allow snoozing for marine safety');
        return false;
      }
      
      if (newConfig.maxDuration > 3600000) { // 1 hour max
        console.warn('CriticalAlarmConfiguration: Maximum snooze duration exceeds marine safety limits');
        return false;
      }
      
      this.snoozeConfig = newConfig;
      this.scheduleAutoSave();
      
      return true;
      
    } catch (error) {
      console.error('CriticalAlarmConfiguration: Failed to update snooze config', error);
      return false;
    }
  }
  
  /**
   * Export configuration for backup or transfer
   */
  public exportConfiguration(): {
    alarmConfigs: Record<string, CriticalAlarmConfig>;
    thresholds: Record<string, CriticalAlarmThreshold>;
    snoozeConfig: AlarmSnoozeConfig;
    testConfig: AlarmTestConfig;
    exportDate: string;
  } {
    return {
      alarmConfigs: Object.fromEntries(this.alarmConfigs.entries()),
      thresholds: Object.fromEntries(this.thresholds.entries()),
      snoozeConfig: this.snoozeConfig,
      testConfig: this.testConfig,
      exportDate: new Date().toISOString(),
    };
  }
  
  /**
   * Import configuration with validation
   */
  public async importConfiguration(
    configData: ReturnType<CriticalAlarmConfiguration['exportConfiguration']>
  ): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: false, errors: [] as string[] };
    
    try {
      // Validate imported alarm configurations
      for (const [typeStr, config] of Object.entries(configData.alarmConfigs)) {
        const type = typeStr as CriticalAlarmType;
        const validation = this.validateMarineStandards(config);
        
        if (!validation.valid) {
          result.errors.push(`Invalid configuration for ${type}: ${validation.errors.join(', ')}`);
        } else {
          this.alarmConfigs.set(type, config);
        }
      }
      
      // Validate imported thresholds
      for (const [id, threshold] of Object.entries(configData.thresholds)) {
        const validation = this.validateThresholdRanges(threshold);
        
        if (!validation.valid) {
          result.errors.push(`Invalid threshold ${id}: ${validation.errors.join(', ')}`);
        } else {
          this.thresholds.set(id, threshold);
        }
      }
      
      // Import snooze and test configs if valid
      if (configData.snoozeConfig) {
        this.snoozeConfig = configData.snoozeConfig;
      }
      
      if (configData.testConfig) {
        this.testConfig = configData.testConfig;
      }
      
      // Save imported configuration
      await this.saveConfigurationsToStorage();
      
      result.success = result.errors.length === 0;
      
      console.log('CriticalAlarmConfiguration: Configuration imported', {
        success: result.success,
        errorCount: result.errors.length,
        alarmConfigCount: Object.keys(configData.alarmConfigs).length,
        thresholdCount: Object.keys(configData.thresholds).length,
      });
      
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : error}`);
    }
    
    return result;
  }
  
  /**
   * Reset to default marine-safe configuration
   */
  public async resetToDefaults(): Promise<void> {
    this.alarmConfigs.clear();
    this.thresholds.clear();
    
    this.initializeDefaultConfigurations();
    this.snoozeConfig = this.getDefaultSnoozeConfig();
    this.testConfig = this.getDefaultTestConfig();
    
    await this.saveConfigurationsToStorage();
    
    console.log('CriticalAlarmConfiguration: Reset to default marine-safe configuration');
  }
  
  /**
   * Set callback for configuration changes
   */
  public setConfigChangedCallback(
    callback: (type: CriticalAlarmType, config: CriticalAlarmConfig) => void
  ): void {
    this.configChangedCallback = callback;
  }
  
  // Private helper methods
  
  private initializeDefaultConfigurations(): void {
    // Shallow Water Alarm Configuration
    this.alarmConfigs.set(CriticalAlarmType.SHALLOW_WATER, {
      type: CriticalAlarmType.SHALLOW_WATER,
      enabled: true,
      thresholds: {
        warning: 3.0, // meters
        caution: 2.0,
        critical: 1.5,
        emergency: 1.0,
      },
      hysteresis: 0.1, // 10cm hysteresis
      debounceMs: 1000,
      escalationTimeoutMs: 10000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: 'NAVIGATION_HAZARD',
      requiresConfirmation: true,
      allowSnooze: false, // Critical navigation safety
      maxResponseTimeMs: 500,
      minAudioLevelDb: 85,
      failSafeBehavior: 'alarm',
      redundantAlerting: true,
    });
    
    // Engine Overheat Alarm Configuration
    this.alarmConfigs.set(CriticalAlarmType.ENGINE_OVERHEAT, {
      type: CriticalAlarmType.ENGINE_OVERHEAT,
      enabled: true,
      thresholds: {
        warning: 85, // Celsius
        caution: 90,
        critical: 95,
        emergency: 100,
      },
      hysteresis: 2, // 2°C hysteresis
      debounceMs: 2000,
      escalationTimeoutMs: 15000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: 'MACHINERY_FAILURE',
      requiresConfirmation: true,
      allowSnooze: false, // Engine protection critical
      maxResponseTimeMs: 500,
      minAudioLevelDb: 85,
      failSafeBehavior: 'alarm',
      redundantAlerting: true,
    });
    
    // Low Battery Alarm Configuration
    this.alarmConfigs.set(CriticalAlarmType.LOW_BATTERY, {
      type: CriticalAlarmType.LOW_BATTERY,
      enabled: true,
      thresholds: {
        warning: 12.0, // Volts (12V system)
        caution: 11.5,
        critical: 11.0,
        emergency: 10.5,
      },
      hysteresis: 0.2, // 0.2V hysteresis
      debounceMs: 5000, // Longer debounce for battery voltage fluctuations
      escalationTimeoutMs: 30000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: false,
      notificationEnabled: true,
      marineSafetyClassification: 'POWER_SYSTEM',
      requiresConfirmation: false,
      allowSnooze: true, // Can be snoozed for planned power management
      maxSnoozeTime: 1800000, // 30 minutes max
      maxResponseTimeMs: 500,
      minAudioLevelDb: 75, // Lower priority than navigation alarms
      failSafeBehavior: 'alarm',
      redundantAlerting: false,
    });
    
    // Autopilot Failure Alarm Configuration
    this.alarmConfigs.set(CriticalAlarmType.AUTOPILOT_FAILURE, {
      type: CriticalAlarmType.AUTOPILOT_FAILURE,
      enabled: true,
      thresholds: {
        critical: 1, // Binary: failure detected
      },
      hysteresis: 0,
      debounceMs: 500, // Quick response for navigation safety
      escalationTimeoutMs: 5000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: 'NAVIGATION_SYSTEM',
      requiresConfirmation: true,
      allowSnooze: false, // Navigation safety critical
      maxResponseTimeMs: 250, // Faster response for navigation
      minAudioLevelDb: 90, // Highest priority
      failSafeBehavior: 'alarm',
      redundantAlerting: true,
    });
    
    // GPS Loss Alarm Configuration
    this.alarmConfigs.set(CriticalAlarmType.GPS_LOSS, {
      type: CriticalAlarmType.GPS_LOSS,
      enabled: true,
      thresholds: {
        warning: 30, // seconds without valid fix
        critical: 60,
        emergency: 120,
      },
      hysteresis: 5, // 5 second hysteresis
      debounceMs: 10000, // 10 seconds to account for temporary signal loss
      escalationTimeoutMs: 20000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: 'NAVIGATION_SYSTEM',
      requiresConfirmation: true,
      allowSnooze: false, // Navigation safety critical
      maxResponseTimeMs: 500,
      minAudioLevelDb: 85,
      failSafeBehavior: 'alarm',
      redundantAlerting: true,
    });
    
    // Initialize corresponding thresholds
    this.initializeDefaultThresholds();
  }
  
  private initializeDefaultThresholds(): void {
    // Shallow water thresholds
    this.thresholds.set('shallow-water-warning', {
      id: 'shallow-water-warning',
      alarmType: CriticalAlarmType.SHALLOW_WATER,
      name: 'Shallow Water Warning',
      description: 'Warning threshold for shallow water detection',
      dataPath: 'depth',
      units: 'meters',
      warningThreshold: 3.0,
      validRange: { min: 0.5, max: 100, recommended: 3.0 },
      hysteresis: { value: 10, unit: 'percentage' },
      debounceMs: 1000,
      enabled: true,
      userConfigurable: true,
      lastModified: Date.now(),
      modifiedBy: 'system',
      safetyClassification: 'CRITICAL',
      regulatory: true,
      certificationRequired: false,
    });
    
    // Engine temperature thresholds
    this.thresholds.set('engine-temp-critical', {
      id: 'engine-temp-critical',
      alarmType: CriticalAlarmType.ENGINE_OVERHEAT,
      name: 'Engine Temperature Critical',
      description: 'Critical temperature threshold for engine protection',
      dataPath: 'engine.coolantTemp',
      units: '°C',
      criticalThreshold: 95,
      validRange: { min: 60, max: 120, recommended: 85 },
      hysteresis: { value: 2, unit: 'absolute' },
      debounceMs: 2000,
      enabled: true,
      userConfigurable: true,
      lastModified: Date.now(),
      modifiedBy: 'system',
      safetyClassification: 'CRITICAL',
      regulatory: false,
      certificationRequired: false,
    });
    
    // Battery voltage thresholds
    this.thresholds.set('battery-low-warning', {
      id: 'battery-low-warning',
      alarmType: CriticalAlarmType.LOW_BATTERY,
      name: 'Low Battery Warning',
      description: 'Warning threshold for low battery voltage',
      dataPath: 'electrical.batteryVoltage',
      units: 'V',
      warningThreshold: 12.0,
      validRange: { min: 9.0, max: 16.0, recommended: 12.0 },
      hysteresis: { value: 2, unit: 'percentage' },
      debounceMs: 5000,
      enabled: true,
      userConfigurable: true,
      lastModified: Date.now(),
      modifiedBy: 'system',
      safetyClassification: 'IMPORTANT',
      regulatory: false,
      certificationRequired: false,
    });
  }
  
  private getDefaultSnoozeConfig(): AlarmSnoozeConfig {
    return {
      allowedAlarmTypes: [CriticalAlarmType.LOW_BATTERY], // Only low battery can be snoozed
      availableDurations: [300000, 600000, 1800000], // 5, 10, 30 minutes
      defaultDuration: 600000, // 10 minutes
      maxDuration: 1800000, // 30 minutes maximum
      maxSnoozeCount: 3,
      escalationOnMaxSnooze: true,
      criticalAlarmsAllowed: false,
      requireConfirmation: true,
      showTimeRemaining: true,
      audioWarningBeforeExpiry: true,
    };
  }
  
  private getDefaultTestConfig(): AlarmTestConfig {
    return {
      audioTest: true,
      visualTest: true,
      persistenceTest: true,
      escalationTest: true,
      performanceTest: true,
      testDurationMs: 30000, // 30 seconds
      testAlarmType: CriticalAlarmType.SHALLOW_WATER,
      testEscalationLevel: 'WARNING' as any,
      validateResponseTime: true,
      validateAudioLevel: true,
      validateVisualContrast: true,
    };
  }
  
  private validateMarineStandards(config: CriticalAlarmConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Response time must be <500ms for marine safety
    if (config.maxResponseTimeMs > 500) {
      errors.push('Response time exceeds marine safety requirement of 500ms');
    }
    
    // Audio level must be >85dB for marine environment
    if (config.minAudioLevelDb < 85) {
      errors.push('Audio level below marine safety requirement of 85dB');
    }
    
    // Critical navigation alarms must have redundant alerting
    if (this.isCriticalNavigationAlarm(config.type) && !config.redundantAlerting) {
      errors.push('Critical navigation alarms must have redundant alerting for marine safety');
    }
    
    // Critical alarms should not allow snoozing
    if (config.allowSnooze && config.marineSafetyClassification === 'NAVIGATION_HAZARD') {
      errors.push('Navigation hazard alarms should not allow snoozing for safety');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private validateUserPermissions(
    type: CriticalAlarmType,
    updates: Partial<CriticalAlarmConfig>
  ): { allowed: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if user can modify safety-critical settings
    if (updates.requiresConfirmation === false && this.isCriticalNavigationAlarm(type)) {
      errors.push('Cannot disable confirmation requirement for critical navigation alarms');
    }
    
    if (updates.allowSnooze === true && this.isCriticalNavigationAlarm(type)) {
      errors.push('Navigation hazard alarms should not allow snoozing for safety');
    }
    
    // Note: enabled state changes are now handled via setAlarmEnabled with confirmation
    // Don't block here - allow the confirmation flow to handle it
    
    return { allowed: errors.length === 0, errors };
  }
  
  private validateThresholdRanges(threshold: CriticalAlarmThreshold): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if thresholds are within valid ranges
    const checkThreshold = (value: number | undefined, name: string) => {
      if (value !== undefined) {
        if (value < threshold.validRange.min || value > threshold.validRange.max) {
          errors.push(`${name} threshold ${value} outside valid range ${threshold.validRange.min}-${threshold.validRange.max} ${threshold.units}`);
        }
      }
    };
    
    checkThreshold(threshold.warningThreshold, 'Warning');
    checkThreshold(threshold.cautionThreshold, 'Caution');
    checkThreshold(threshold.criticalThreshold, 'Critical');
    checkThreshold(threshold.emergencyThreshold, 'Emergency');
    
    // Check threshold progression (warning < caution < critical < emergency)
    const thresholds = [
      threshold.warningThreshold,
      threshold.cautionThreshold,
      threshold.criticalThreshold,
      threshold.emergencyThreshold,
    ].filter(t => t !== undefined) as number[];
    
    for (let i = 1; i < thresholds.length; i++) {
      if (thresholds[i] <= thresholds[i - 1]) {
        errors.push('Thresholds must be in ascending order of severity');
        break;
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private validateAllThresholds(thresholds: CriticalAlarmThreshold[]): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    
    for (const threshold of thresholds) {
      const validation = this.validateThresholdRanges(threshold);
      if (!validation.valid) {
        allErrors.push(...validation.errors.map(error => `${threshold.name}: ${error}`));
      }
    }
    
    return { valid: allErrors.length === 0, errors: allErrors };
  }
  
  private isCriticalNavigationAlarm(type: CriticalAlarmType): boolean {
    return type === CriticalAlarmType.SHALLOW_WATER ||
           type === CriticalAlarmType.AUTOPILOT_FAILURE ||
           type === CriticalAlarmType.GPS_LOSS;
  }
  
  private scheduleAutoSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveConfigurationsToStorage();
    }, this.config.autoSaveDelay);
  }
  
  private async loadConfigurationsFromStorage(): Promise<void> {
    try {
      const storedConfig = await AsyncStorage.getItem(this.config.storageKey);
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        
        // Load alarm configurations
        if (parsed.alarmConfigs) {
          for (const [typeStr, config] of Object.entries(parsed.alarmConfigs)) {
            this.alarmConfigs.set(typeStr as CriticalAlarmType, config as CriticalAlarmConfig);
          }
        }
        
        // Load thresholds
        if (parsed.thresholds) {
          for (const [id, threshold] of Object.entries(parsed.thresholds)) {
            this.thresholds.set(id, threshold as CriticalAlarmThreshold);
          }
        }
        
        // Load other configurations
        if (parsed.snoozeConfig) {
          this.snoozeConfig = parsed.snoozeConfig;
        }
        
        if (parsed.testConfig) {
          this.testConfig = parsed.testConfig;
        }
        
        console.log('CriticalAlarmConfiguration: Configuration loaded from storage');
      }
    } catch (error) {
      console.error('CriticalAlarmConfiguration: Failed to load from storage', error);
    }
  }
  
  private async saveConfigurationsToStorage(): Promise<void> {
    try {
      const configToSave = {
        alarmConfigs: Object.fromEntries(this.alarmConfigs.entries()),
        thresholds: Object.fromEntries(this.thresholds.entries()),
        snoozeConfig: this.snoozeConfig,
        testConfig: this.testConfig,
        lastSaved: Date.now(),
      };
      
      await AsyncStorage.setItem(this.config.storageKey, JSON.stringify(configToSave));
      
    } catch (error) {
      console.error('CriticalAlarmConfiguration: Failed to save to storage', error);
    }
  }
}