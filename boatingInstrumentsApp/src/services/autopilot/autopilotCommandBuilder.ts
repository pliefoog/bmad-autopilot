// Autopilot Command Builder
// Advanced autopilot command construction and validation

export interface AutopilotCommand {
  type: 'heading' | 'wind_angle' | 'standby' | 'auto' | 'track' | 'waypoint';
  value?: number;
  direction?: 'port' | 'starboard' | 'left' | 'right';
  magnitude?: 'small' | 'medium' | 'large';
  timestamp: number;
  source: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  validation?: CommandValidation;
}

export interface CommandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  constraints: {
    minValue?: number;
    maxValue?: number;
    allowedDirections?: string[];
    requiredConditions?: string[];
  };
}

export interface AutopilotCapabilities {
  supportedCommands: string[];
  headingRange: { min: number; max: number };
  windAngleRange: { min: number; max: number };
  incrementSizes: number[];
  hasTrackMode: boolean;
  hasWindMode: boolean;
  hasWaypointNavigation: boolean;
  maxCommandRate: number; // commands per minute
}

export class AutopilotCommandBuilder {
  private static instance: AutopilotCommandBuilder;
  private capabilities: AutopilotCapabilities;
  private commandHistory: AutopilotCommand[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(capabilities?: AutopilotCapabilities) {
    this.capabilities = capabilities || this.getDefaultCapabilities();
  }

  static getInstance(capabilities?: AutopilotCapabilities): AutopilotCommandBuilder {
    if (!AutopilotCommandBuilder.instance) {
      AutopilotCommandBuilder.instance = new AutopilotCommandBuilder(capabilities);
    }
    return AutopilotCommandBuilder.instance;
  }

  /**
   * Build a heading command with validation
   */
  buildHeadingCommand(targetHeading: number, source: string = 'user'): AutopilotCommand {
    const command: AutopilotCommand = {
      type: 'heading',
      value: this.normalizeHeading(targetHeading),
      timestamp: Date.now(),
      source,
      priority: 'normal',
    };

    command.validation = this.validateCommand(command);
    this.addToHistory(command);

    return command;
  }

  /**
   * Build a heading adjustment command (relative change)
   */
  buildHeadingAdjustment(
    direction: 'port' | 'starboard', 
    magnitude: 'small' | 'medium' | 'large' = 'small',
    source: string = 'user'
  ): AutopilotCommand {
    const command: AutopilotCommand = {
      type: 'heading',
      direction,
      magnitude,
      timestamp: Date.now(),
      source,
      priority: 'normal',
    };

    command.validation = this.validateCommand(command);
    this.addToHistory(command);

    return command;
  }

  /**
   * Build a wind angle command
   */
  buildWindAngleCommand(targetAngle: number, source: string = 'user'): AutopilotCommand {
    const command: AutopilotCommand = {
      type: 'wind_angle',
      value: this.normalizeWindAngle(targetAngle),
      timestamp: Date.now(),
      source,
      priority: 'normal',
    };

    command.validation = this.validateCommand(command);
    this.addToHistory(command);

    return command;
  }

  /**
   * Build a mode change command (standby, auto, track)
   */
  buildModeCommand(
    mode: 'standby' | 'auto' | 'track',
    source: string = 'user',
    priority: AutopilotCommand['priority'] = 'normal'
  ): AutopilotCommand {
    const command: AutopilotCommand = {
      type: mode,
      timestamp: Date.now(),
      source,
      priority,
    };

    command.validation = this.validateCommand(command);
    this.addToHistory(command);

    return command;
  }

  /**
   * Build an emergency standby command
   */
  buildEmergencyStandby(source: string = 'emergency'): AutopilotCommand {
    const command: AutopilotCommand = {
      type: 'standby',
      timestamp: Date.now(),
      source,
      priority: 'emergency',
    };

    command.validation = this.validateCommand(command);
    this.addToHistory(command);

    return command;
  }

  /**
   * Validate a command against current capabilities and constraints
   */
  validateCommand(command: AutopilotCommand): CommandValidation {
    const validation: CommandValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      constraints: {},
    };

    // Check if command type is supported
    if (!this.capabilities.supportedCommands.includes(command.type)) {
      validation.isValid = false;
      validation.errors.push(`Command type '${command.type}' is not supported`);
    }

    // Validate heading commands
    if (command.type === 'heading') {
      if (command.value !== undefined) {
        const { min, max } = this.capabilities.headingRange;
        validation.constraints.minValue = min;
        validation.constraints.maxValue = max;

        if (command.value < min || command.value > max) {
          validation.isValid = false;
          validation.errors.push(`Heading ${command.value}° is outside valid range ${min}°-${max}°`);
        }
      }

      if (command.direction && !['port', 'starboard'].includes(command.direction)) {
        validation.isValid = false;
        validation.errors.push(`Invalid direction '${command.direction}' for heading command`);
      }
    }

    // Validate wind angle commands
    if (command.type === 'wind_angle') {
      if (!this.capabilities.hasWindMode) {
        validation.isValid = false;
        validation.errors.push('Wind mode is not supported by this autopilot');
      }

      if (command.value !== undefined) {
        const { min, max } = this.capabilities.windAngleRange;
        validation.constraints.minValue = min;
        validation.constraints.maxValue = max;

        if (command.value < min || command.value > max) {
          validation.isValid = false;
          validation.errors.push(`Wind angle ${command.value}° is outside valid range ${min}°-${max}°`);
        }
      }
    }

    // Validate track mode
    if (command.type === 'track' && !this.capabilities.hasTrackMode) {
      validation.isValid = false;
      validation.errors.push('Track mode is not supported by this autopilot');
    }

    // Check command rate limiting
    const recentCommands = this.getRecentCommands(60000); // Last minute
    if (recentCommands.length >= this.capabilities.maxCommandRate) {
      validation.warnings.push('Command rate limit approaching - consider reducing frequency');
    }

    // Check for conflicting recent commands
    const conflictingCommands = this.findConflictingCommands(command);
    if (conflictingCommands.length > 0) {
      validation.warnings.push('Similar command sent recently - verify intent');
    }

    return validation;
  }

  /**
   * Get command history for analysis
   */
  getCommandHistory(count?: number): AutopilotCommand[] {
    if (count) {
      return this.commandHistory.slice(-count);
    }
    return [...this.commandHistory];
  }

  /**
   * Get recent commands within a time window
   */
  getRecentCommands(windowMs: number): AutopilotCommand[] {
    const cutoff = Date.now() - windowMs;
    return this.commandHistory.filter(cmd => cmd.timestamp >= cutoff);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Update autopilot capabilities
   */
  updateCapabilities(capabilities: Partial<AutopilotCapabilities>): void {
    this.capabilities = { ...this.capabilities, ...capabilities };
  }

  /**
   * Get current autopilot capabilities
   */
  getCapabilities(): AutopilotCapabilities {
    return { ...this.capabilities };
  }

  // Private helper methods

  private normalizeHeading(heading: number): number {
    // Normalize heading to 0-359 range
    while (heading < 0) heading += 360;
    while (heading >= 360) heading -= 360;
    return Math.round(heading);
  }

  private normalizeWindAngle(angle: number): number {
    // Normalize wind angle to -180 to +180 range
    while (angle <= -180) angle += 360;
    while (angle > 180) angle -= 360;
    return Math.round(angle);
  }

  private addToHistory(command: AutopilotCommand): void {
    this.commandHistory.push(command);
    
    // Maintain history size limit
    if (this.commandHistory.length > this.MAX_HISTORY) {
      this.commandHistory.shift();
    }
  }

  private findConflictingCommands(command: AutopilotCommand): AutopilotCommand[] {
    const recentCommands = this.getRecentCommands(5000); // Last 5 seconds
    
    return recentCommands.filter(cmd => 
      cmd.type === command.type && 
      cmd.value === command.value &&
      cmd.direction === command.direction
    );
  }

  private getDefaultCapabilities(): AutopilotCapabilities {
    return {
      supportedCommands: ['heading', 'wind_angle', 'standby', 'auto', 'track'],
      headingRange: { min: 0, max: 359 },
      windAngleRange: { min: -180, max: 180 },
      incrementSizes: [1, 5, 10, 30],
      hasTrackMode: true,
      hasWindMode: true,
      hasWaypointNavigation: false,
      maxCommandRate: 10, // 10 commands per minute
    };
  }
}

// Export singleton instance
export const autopilotCommandBuilder = AutopilotCommandBuilder.getInstance();