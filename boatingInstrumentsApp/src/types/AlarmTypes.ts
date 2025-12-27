/**
 * Alarm Types - Core alarm level definitions and visual states
 * 
 * Defines the 4-level numeric alarm system with priority-based evaluation:
 * 0 = NONE: Normal operation
 * 1 = STALE: Data too old to trust (visual warning only, no sound)
 * 2 = WARNING: Warning threshold breached (sound alert)
 * 3 = CRITICAL: Critical threshold breached (sound + flashing)
 */

/**
 * Alarm level enumeration for metric threshold states
 * Uses numeric values for performance and storage efficiency
 */
export const enum AlarmLevel {
  NONE = 0,      // Normal operation
  STALE = 1,     // Data too old to trust
  WARNING = 2,   // Warning threshold breached
  CRITICAL = 3   // Critical threshold breached
}

/**
 * Visual and audio feedback states per alarm level
 * Maps alarm levels to presentation requirements
 */
export interface AlarmVisualState {
  color: 'normal' | 'orange' | 'red';
  flash: boolean;
  sound: boolean;
}

/**
 * Visual state mapping for each alarm level
 * Used by components to determine presentation
 */
export const ALARM_VISUAL_STATES: Record<AlarmLevel, AlarmVisualState> = {
  [AlarmLevel.NONE]: { color: 'normal', flash: false, sound: false },
  [AlarmLevel.STALE]: { color: 'normal', flash: true, sound: false },
  [AlarmLevel.WARNING]: { color: 'orange', flash: false, sound: true },
  [AlarmLevel.CRITICAL]: { color: 'red', flash: true, sound: true }
};
