/**
 * AppError - Dual-Message Error System
 *
 * **Purpose:**
 * Provides errors with both technical details (for developers) and
 * user-friendly messages (for end users). Enables fail-fast development
 * while maintaining good UX in production.
 *
 * **Architecture:**
 * - Extends native Error class
 * - Dual messages: devMessage (technical) vs userMessage (friendly)
 * - Error codes for support/logging
 * - Optional context for debugging
 * - Automatic logging integration
 *
 * **Usage:**
 * ```typescript
 * // Throw with dual messages
 * throw new AppError(
 *   'INVALID_SI_VALUE',
 *   'MetricValue: si_value must be finite, got NaN',
 *   'Invalid sensor reading'
 * );
 *
 * // With context
 * throw new AppError(
 *   'NO_PRESENTATION_FOUND',
 *   `No presentation for category: ${category}`,
 *   `Display configuration missing`,
 *   { category, availableCategories: [...] }
 * );
 *
 * // In catch block
 * catch (error) {
 *   if (error instanceof AppError) {
 *     error.logError();
 *     alert(error.getDisplayMessage(__DEV__));
 *   }
 * }
 * ```
 *
 * **Benefits:**
 * - ✅ Technical details available for debugging
 * - ✅ User-friendly messages for production
 * - ✅ Error codes for support/analytics
 * - ✅ Automatic logging integration
 * - ✅ Type-safe error handling
 */

import { log } from './logging/logger';

/**
 * Application Error with Dual Messages
 *
 * Provides both technical and user-friendly error messages,
 * enabling fail-fast development while maintaining good UX.
 */
export class AppError extends Error {
  /** Error code for support/logging (e.g., 'INVALID_SI_VALUE') */
  readonly code: string;

  /** Technical message for developers */
  readonly devMessage: string;

  /** User-friendly message for end users */
  readonly userMessage: string;

  /** Optional context data for debugging */
  readonly context?: any;

  constructor(code: string, devMessage: string, userMessage: string, context?: any) {
    super(devMessage); // Error.message = devMessage
    this.name = 'AppError';
    this.code = code;
    this.devMessage = devMessage;
    this.userMessage = userMessage;
    this.context = context;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get appropriate message for audience
   *
   * @param isDev - Whether to show dev message (defaults to __DEV__)
   * @returns Developer or user message
   */
  getDisplayMessage(isDev: boolean = __DEV__): string {
    return isDev ? this.devMessage : this.userMessage;
  }

  /**
   * Log error to appropriate channel
   * Uses conditional logging system for zero-overhead when disabled
   */
  logError(): void {
    log.app(this.devMessage, () => ({
      code: this.code,
      userMessage: this.userMessage,
      context: this.context,
      stack: this.stack,
    }));
  }

  /**
   * Convert to JSON for logging/analytics
   */
  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      devMessage: this.devMessage,
      userMessage: this.userMessage,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Create from generic Error
   * Useful for wrapping unknown errors
   */
  static fromError(error: Error, code: string = 'UNKNOWN_ERROR'): AppError {
    return new AppError(code, error.message, 'An unexpected error occurred', {
      originalError: error.name,
      stack: error.stack,
    });
  }
}
