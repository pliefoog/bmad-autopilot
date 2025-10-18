/**
 * Utility Types
 * 
 * Generic patterns, helpers, and reusable type definitions for common patterns
 * across the marine instrument application. These types promote code reuse
 * while maintaining strict type safety.
 * 
 * @fileoverview Centralized utility types for cross-cutting concerns
 */

/**
 * Unit system types for marine instrumentation
 * 
 * Supports common marine measurement units including:
 * - Distance: feet, meters, fathoms
 * - Speed: knots, mph, kmh  
 * - Temperature: fahrenheit, celsius
 */
export type Unit = 'feet' | 'meters' | 'fathoms' | 'knots' | 'mph' | 'kmh' | 'fahrenheit' | 'celsius';

/**
 * Unit conversion configuration
 * 
 * Defines conversion parameters between different units.
 * The factor represents the multiplier to convert from source to target unit.
 * 
 * @example
 * ```typescript
 * const feetToMeters: UnitConversion = {
 *   from: 'feet',
 *   to: 'meters', 
 *   factor: 0.3048
 * };
 * ```
 */
export interface UnitConversion {
  /** Source unit for conversion */
  from: Unit;
  /** Target unit for conversion */
  to: Unit;
  /** Multiplication factor for conversion */
  factor: number;
}

/**
 * Generic data point with timestamp and optional source
 * 
 * Represents a single measurement or reading with associated metadata.
 * Used throughout the NMEA data system for tracking sensor readings.
 * 
 * @template T The type of the measured value (defaults to number)
 * 
 * @example
 * ```typescript
 * const depthReading: DataPoint<number> = {
 *   value: 12.5,
 *   timestamp: Date.now(),
 *   source: 'depth-sensor-1'
 * };
 * ```
 */
export interface DataPoint<T = number> {
  /** The measured value */
  value: T;
  /** Unix timestamp when measurement was taken */
  timestamp: number;
  /** Optional identifier for the data source/sensor */
  source?: string;
}

/**
 * Nullable type helper
 * 
 * Convenience type for values that can be null, commonly used
 * for optional NMEA data that may not be available.
 * 
 * @template T The base type to make nullable
 */
export type Nullable<T> = T | null;

/**
 * Optional properties helper - makes specified keys optional
 * 
 * Utility type for creating variants of interfaces where certain
 * properties become optional while maintaining type safety.
 * 
 * @template T The source interface
 * @template K The keys to make optional
 * 
 * @example
 * ```typescript
 * interface Required { a: string; b: number; c: boolean; }
 * type PartiallyOptional = Optional<Required, 'b' | 'c'>;
 * // Result: { a: string; b?: number; c?: boolean; }
 * ```
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Generic event handler types
 */
export type EventHandler<T = void> = () => T;
export type ValueChangeHandler<T> = (value: T) => void;
export type AsyncEventHandler<T = void> = () => Promise<T>;

/**
 * Promise resolution helpers
 */
export type PromiseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

/**
 * Configuration state helpers
 */
export interface ConfigState<T> {
  value: T;
  isDefault: boolean;
  lastModified: number;
  source: 'user' | 'system' | 'default';
}

/**
 * Generic validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Common callback patterns
 */
export type SuccessCallback<T = void> = (result: T) => void;
export type ErrorCallback = (error: string | Error) => void;
export type ProgressCallback = (progress: number) => void;