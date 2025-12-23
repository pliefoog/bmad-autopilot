import { SafetyEventType, SafetyAlertLevel } from './autopilotSafetyManager';

/**
 * Error categories for different types of failures
 */
export enum ErrorCategory {
  CONNECTION = 'connection',
  AUTOPILOT = 'autopilot',
  NAVIGATION = 'navigation',
  COMMAND = 'command',
  SYSTEM = 'system',
  USER = 'user',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * User-friendly error message interface
 */
export interface ErrorMessage {
  title: string;
  message: string;
  cause?: string;
  solution: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  timestamp: number;
  data?: any;
}

/**
 * Recovery guidance for users
 */
export interface RecoveryGuidance {
  steps: string[];
  estimatedTime: string;
  automaticRecovery: boolean;
  contactSupport?: boolean;
}

/**
 * AutopilotErrorManager - Comprehensive error messaging and recovery guidance
 * Story 3.3 AC7: Clear error messages for different failure types
 */
export class AutopilotErrorManager {
  private static readonly ERROR_MESSAGES: {
    [key: string]: Omit<ErrorMessage, 'timestamp' | 'data'>;
  } = {
    // Connection Errors
    CONN_001: {
      title: 'Connection Lost',
      message: 'Lost connection to boat systems',
      cause: 'WiFi network interrupted or NMEA bridge offline',
      solution: 'Check WiFi connection and restart NMEA bridge if needed',
      category: ErrorCategory.CONNECTION,
      severity: ErrorSeverity.CRITICAL,
      code: 'CONN_001',
    },
    CONN_002: {
      title: 'Connection Timeout',
      message: 'Unable to connect to boat systems',
      cause: 'NMEA bridge not responding or wrong IP address',
      solution: 'Verify bridge IP address and ensure bridge is powered on',
      category: ErrorCategory.CONNECTION,
      severity: ErrorSeverity.ERROR,
      code: 'CONN_002',
    },
    CONN_003: {
      title: 'Data Stream Interrupted',
      message: 'NMEA data stream stopped unexpectedly',
      cause: 'Network congestion or bridge malfunction',
      solution: 'Wait for automatic reconnection or restart bridge',
      category: ErrorCategory.CONNECTION,
      severity: ErrorSeverity.WARNING,
      code: 'CONN_003',
    },

    // Autopilot Errors
    AUTO_001: {
      title: 'Autopilot Not Responding',
      message: 'Autopilot system is not responding to commands',
      cause: 'Autopilot offline, faulted, or in manual mode',
      solution: 'Check autopilot display and power, switch to manual if needed',
      category: ErrorCategory.AUTOPILOT,
      severity: ErrorSeverity.CRITICAL,
      code: 'AUTO_001',
    },
    AUTO_002: {
      title: 'Command Failed',
      message: 'Autopilot command was rejected or timed out',
      cause: 'Autopilot busy, invalid command, or system fault',
      solution: 'Wait and try again, or check autopilot status display',
      category: ErrorCategory.AUTOPILOT,
      severity: ErrorSeverity.ERROR,
      code: 'AUTO_002',
    },
    AUTO_003: {
      title: 'Manual Override Detected',
      message: 'Manual steering input detected while autopilot active',
      cause: 'Wheel or tiller moved by crew member',
      solution: 'Continue manual steering or re-engage autopilot',
      category: ErrorCategory.AUTOPILOT,
      severity: ErrorSeverity.WARNING,
      code: 'AUTO_003',
    },
    AUTO_004: {
      title: 'Autopilot Fault',
      message: 'Autopilot system reported internal fault',
      cause: 'Hardware malfunction or sensor failure',
      solution: 'Switch to manual steering and check autopilot diagnostics',
      category: ErrorCategory.AUTOPILOT,
      severity: ErrorSeverity.CRITICAL,
      code: 'AUTO_004',
    },

    // Navigation Errors
    NAV_001: {
      title: 'GPS Signal Lost',
      message: 'GPS position data is unavailable',
      cause: 'Poor satellite reception or GPS antenna issue',
      solution: 'Move to open area or check GPS antenna connections',
      category: ErrorCategory.NAVIGATION,
      severity: ErrorSeverity.ERROR,
      code: 'NAV_001',
    },
    NAV_002: {
      title: 'Compass Data Missing',
      message: 'Magnetic compass heading unavailable',
      cause: 'Compass sensor malfunction or interference',
      solution: 'Check compass calibration and remove magnetic interference',
      category: ErrorCategory.NAVIGATION,
      severity: ErrorSeverity.CRITICAL,
      code: 'NAV_002',
    },
    NAV_003: {
      title: 'Poor GPS Accuracy',
      message: 'GPS position accuracy is degraded',
      cause: 'Limited satellite visibility or atmospheric conditions',
      solution: 'Navigation may be less accurate, use visual references',
      category: ErrorCategory.NAVIGATION,
      severity: ErrorSeverity.WARNING,
      code: 'NAV_003',
    },

    // Command Errors
    CMD_001: {
      title: 'Command Rejected',
      message: 'Autopilot rejected the requested command',
      cause: 'Invalid parameters or autopilot not ready',
      solution: 'Check autopilot status and try again with valid parameters',
      category: ErrorCategory.COMMAND,
      severity: ErrorSeverity.ERROR,
      code: 'CMD_001',
    },
    CMD_002: {
      title: 'Command Timeout',
      message: 'Command did not complete within expected time',
      cause: 'Network delay or autopilot processing issue',
      solution: 'Command may still be processing, check autopilot status',
      category: ErrorCategory.COMMAND,
      severity: ErrorSeverity.WARNING,
      code: 'CMD_002',
    },

    // System Errors
    SYS_001: {
      title: 'System Overload',
      message: 'Too many commands sent too quickly',
      cause: 'Command rate limiting active for safety',
      solution: 'Wait a moment before sending next command',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.WARNING,
      code: 'SYS_001',
    },
    SYS_002: {
      title: 'Service Unavailable',
      message: 'Autopilot service is temporarily unavailable',
      cause: 'System fault or maintenance mode',
      solution: 'System will automatically retry, switch to manual if needed',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.ERROR,
      code: 'SYS_002',
    },
  };

  private static readonly RECOVERY_GUIDANCE: { [key: string]: RecoveryGuidance } = {
    CONN_001: {
      steps: [
        'Check WiFi connection indicator',
        'Verify NMEA bridge power LED is on',
        'Try connecting to bridge web interface',
        'Restart bridge if not responding',
      ],
      estimatedTime: '1-2 minutes',
      automaticRecovery: true,
      contactSupport: false,
    },
    AUTO_001: {
      steps: [
        'Check autopilot display for error codes',
        'Verify autopilot power connections',
        'Try engaging/disengaging from main display',
        'Switch to manual steering if needed',
      ],
      estimatedTime: '2-5 minutes',
      automaticRecovery: false,
      contactSupport: true,
    },
    NAV_001: {
      steps: [
        'Move to open area away from obstructions',
        'Check GPS antenna connections',
        'Wait for satellite acquisition',
        'Use backup navigation methods',
      ],
      estimatedTime: '5-10 minutes',
      automaticRecovery: true,
      contactSupport: false,
    },
  };

  /**
   * Create error message from safety event type
   */
  static createErrorFromSafetyEvent(eventType: SafetyEventType, data?: any): ErrorMessage {
    let errorCode: string;

    switch (eventType) {
      case SafetyEventType.CONNECTION_LOSS:
        errorCode = 'CONN_001';
        break;
      case SafetyEventType.AUTOPILOT_FAULT:
        errorCode = 'AUTO_004';
        break;
      case SafetyEventType.MANUAL_OVERRIDE:
        errorCode = 'AUTO_003';
        break;
      case SafetyEventType.GPS_FAILURE:
        errorCode = 'NAV_001';
        break;
      case SafetyEventType.COMPASS_FAILURE:
        errorCode = 'NAV_002';
        break;
      case SafetyEventType.COMMAND_TIMEOUT:
        errorCode = 'CMD_002';
        break;
      default:
        errorCode = 'SYS_002';
    }

    return this.createError(errorCode, data);
  }

  /**
   * Create error message by error code
   */
  static createError(errorCode: string, data?: any): ErrorMessage {
    const template = this.ERROR_MESSAGES[errorCode];

    if (!template) {
      return {
        title: 'Unknown Error',
        message: 'An unexpected error occurred',
        solution: 'Please try again or contact support',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
        code: 'UNKNOWN',
        timestamp: Date.now(),
        data,
      };
    }

    return {
      ...template,
      timestamp: Date.now(),
      data,
    };
  }

  /**
   * Get recovery guidance for error code
   */
  static getRecoveryGuidance(errorCode: string): RecoveryGuidance | null {
    return this.RECOVERY_GUIDANCE[errorCode] || null;
  }

  /**
   * Format error for user display
   */
  static formatErrorForUser(error: ErrorMessage): string {
    let formatted = `${error.title}\n\n${error.message}`;

    if (error.cause) {
      formatted += `\n\nCause: ${error.cause}`;
    }

    formatted += `\n\nSolution: ${error.solution}`;

    return formatted;
  }

  /**
   * Format recovery guidance for user display
   */
  static formatRecoveryGuidance(guidance: RecoveryGuidance): string {
    let formatted = 'Recovery Steps:\n';
    guidance.steps.forEach((step, index) => {
      formatted += `${index + 1}. ${step}\n`;
    });

    formatted += `\nEstimated time: ${guidance.estimatedTime}`;

    if (guidance.automaticRecovery) {
      formatted += '\n\nSystem will attempt automatic recovery.';
    }

    if (guidance.contactSupport) {
      formatted += '\n\nContact support if problem persists.';
    }

    return formatted;
  }

  /**
   * Get error severity level from safety alert level
   */
  static mapSafetyLevelToSeverity(safetyLevel: SafetyAlertLevel): ErrorSeverity {
    switch (safetyLevel) {
      case SafetyAlertLevel.INFO:
        return ErrorSeverity.INFO;
      case SafetyAlertLevel.WARNING:
        return ErrorSeverity.WARNING;
      case SafetyAlertLevel.CRITICAL:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * Create contextual error message with dynamic content
   */
  static createContextualError(
    baseErrorCode: string,
    context: { [key: string]: any },
  ): ErrorMessage {
    const baseError = this.createError(baseErrorCode);

    // Replace placeholders in message
    let message = baseError.message;
    let solution = baseError.solution;

    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      message = message.replace(placeholder, String(value));
      solution = solution.replace(placeholder, String(value));
    });

    return {
      ...baseError,
      message,
      solution,
      data: { ...baseError.data, context },
    };
  }

  /**
   * Filter errors by category
   */
  static filterErrorsByCategory(errors: ErrorMessage[], category: ErrorCategory): ErrorMessage[] {
    return errors.filter((error) => error.category === category);
  }

  /**
   * Filter errors by severity
   */
  static filterErrorsBySeverity(errors: ErrorMessage[], severity: ErrorSeverity): ErrorMessage[] {
    return errors.filter((error) => error.severity === severity);
  }

  /**
   * Get all available error codes
   */
  static getAllErrorCodes(): string[] {
    return Object.keys(this.ERROR_MESSAGES);
  }

  /**
   * Get error statistics
   */
  static getErrorStatistics(errors: ErrorMessage[]): {
    totalErrors: number;
    byCategory: { [key in ErrorCategory]: number };
    bySeverity: { [key in ErrorSeverity]: number };
    mostCommon: string[];
  } {
    const stats = {
      totalErrors: errors.length,
      byCategory: {} as { [key in ErrorCategory]: number },
      bySeverity: {} as { [key in ErrorSeverity]: number },
      mostCommon: [] as string[],
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach((category) => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach((severity) => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    const codeCount: { [key: string]: number } = {};

    errors.forEach((error) => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
      codeCount[error.code] = (codeCount[error.code] || 0) + 1;
    });

    // Find most common errors
    stats.mostCommon = Object.entries(codeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    return stats;
  }
}
