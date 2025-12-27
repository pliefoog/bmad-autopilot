/**
 * MetricDisplayData Interface
 *
 * Unified interface for metric display data with stable layout information.
 * Eliminates dual-system conflicts between legacy useUnitConversion and presentations.
 *
 * Phase 1 Refactor: Added alarmState for integrated alarm visualization
 */

import { Presentation } from '../presentation/presentations';
import type { AlarmLevel } from './AlarmTypes';

export interface MetricDisplayData {
  /** The unit abbreviation/symbol (e.g., "kts", "m", "°C") */
  mnemonic: string;

  /** The formatted display value (e.g., "15.5", "4 Bf (Moderate Breeze)") */
  value: string;

  /** The full unit name (e.g., "knots", "meters", "Celsius") */
  unit: string;

  /** The original raw value in base units */
  rawValue: number;

  /** Alarm state: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL */
  alarmState: AlarmLevel;

  /** Layout information for stable rendering */
  layout: {
    /** Minimum width in pixels for layout stability */
    minWidth: number;
    /** Text alignment preference */
    alignment: 'left' | 'center' | 'right';
    /** Font size recommendation */
    fontSize?: number;
  };

  /** Presentation metadata */
  presentation: {
    /** Presentation ID for tracking */
    id: string;
    /** Display name of the presentation */
    name: string;
    /** Format pattern used */
    pattern: string;
  };

  /** Validation and status */
  status: {
    /** Whether the measurement is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Whether this is a fallback/estimated value */
    isFallback?: boolean;
  };
}

export interface MetricDisplayOptions {
  /** Override default font size for width calculation */
  fontSize?: number;
  /** Override default font family */
  fontFamily?: string;
  /** Override default font weight */
  fontWeight?: string;
  /** Force specific presentation ID */
  presentationId?: string;
  /** Include debug information */
  includeDebug?: boolean;
  /** Metadata for format functions (e.g., isLatitude for coordinates) */
  metadata?: {
    /** Whether this is a latitude (vs longitude) coordinate */
    isLatitude?: boolean;
    /** Extensible metadata for other use cases */
    [key: string]: any;
  };
}
