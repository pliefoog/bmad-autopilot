/**
 * MetricDisplayData Interface
 *
 * Minimal interface for metric display cells - cells are "dumb" display components
 * that only render what they're given. All formatting/conversion handled by MetricValue.
 */

import type { AlarmLevel } from './AlarmTypes';

export interface MetricDisplayData {
  /** Metric label/abbreviation (e.g., "HDG", "SPD", "DEPTH") */
  mnemonic: string;

  /** Pre-formatted display value from MetricValue.formattedValue */
  value?: string;

  /** Unit symbol from MetricValue.unit */
  unit?: string;

  /** Visual alarm state for color styling: 0=NONE, 1=STALE, 2=WARNING, 3=CRITICAL */
  alarmState: AlarmLevel;

  /** Optional layout hints (cells may ignore these) */
  layout?: {
    /** Minimum width in pixels for layout stability */
    minWidth?: number;
    /** Text alignment preference */
    alignment?: 'left' | 'center' | 'right';
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
