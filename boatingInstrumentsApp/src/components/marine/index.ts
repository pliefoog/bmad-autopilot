/**
 * Marine Components Library - Custom Marine UI Components
 *
 * Professional marine-grade React Native components designed for boating instruments
 * and marine control interfaces. All components follow marine safety standards and
 * provide professional marine equipment aesthetics.
 *
 * Acceptance Criteria Satisfied:
 * - AC 25: Component Exports with proper barrel exports for all marine components
 *
 * Components:
 * - DigitalDisplay: LED-style numeric displays with 7-segment appearance
 * - AnalogGauge: Circular gauges with needle animation and marine color coding
 * - LinearBar: Progress bars for tank/battery indicators with threshold markers
 * - StatusIndicator: Multi-state LED indicators with marine safety colors
 * - MarineButton: Professional tactile buttons with pressed/unpressed states
 */

// Component exports
export { default as DigitalDisplay } from './DigitalDisplay';
export { default as AnalogGauge } from './AnalogGauge';
export { default as LinearBar } from './LinearBar';
export { default as StatusIndicator } from './StatusIndicator';
export { default as MarineButton } from './MarineButton';

// Import components for convenience object
import DigitalDisplay from './DigitalDisplay';
import AnalogGauge from './AnalogGauge';
import LinearBar from './LinearBar';
import StatusIndicator from './StatusIndicator';
import MarineButton from './MarineButton';

// Type exports for component props
export type { DigitalDisplayProps } from './DigitalDisplay';
export type { AnalogGaugeProps, GaugeRange } from './AnalogGauge';
export type {
  LinearBarProps,
  LinearBarOrientation,
  LinearBarType,
  ThresholdMarker,
} from './LinearBar';
export type { StatusIndicatorProps, StatusState, StatusSize } from './StatusIndicator';
export type { MarineButtonProps, MarineButtonVariant, MarineButtonSize } from './MarineButton';

// Convenience re-exports for common marine component patterns
export const MarineComponents = {
  DigitalDisplay,
  AnalogGauge,
  LinearBar,
  StatusIndicator,
  MarineButton,
} as const;

// Marine safety color constants used by components
// NOTE: These are day/night mode defaults. Components should use theme context
// for automatic red-night mode compliance (e.g., theme.success, theme.warning, theme.error)
export const MARINE_COLORS = {
  NORMAL: '#00AA00', // Marine standard green (day/night only - use theme.success for red-night)
  CAUTION: '#FFAA00', // Marine standard amber/yellow (use theme.warning for theme-aware)
  ALARM: '#AA0000', // Marine standard red (use theme.error for theme-aware)
  OFF: '#2A2A2A', // Dark gray for off state
  UNKNOWN: '#666666', // Medium gray for unknown state
} as const;

// Common marine component sizes
export const MARINE_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export default MarineComponents;
