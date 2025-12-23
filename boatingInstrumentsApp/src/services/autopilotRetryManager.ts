import { autopilotSafetyManager } from './autopilotSafetyManager';

/**
 * Retry policy configuration for different failure types
 */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1 for random jitter
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  error?: string;
  responseTimeMs: number;
  attempt: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, blocking requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * AutopilotRetryManager - Implements intelligent retry and backoff logic
 * Story 3.3 AC2: Automatic command retry with exponential backoff
 */
export class AutopilotRetryManager {
  private static readonly DEFAULT_RETRY_POLICIES: { [key: string]: RetryPolicy } = {
    connection: {
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    command: {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      jitterFactor: 0.2,
    },
    critical: {
      maxAttempts: 2,
      baseDelayMs: 200,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
  };

  private circuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly circuitBreakerTimeout = 30000; // 30 seconds
  private readonly failureThreshold = 5;

  /**
   * Execute command with retry logic and circuit breaker pattern
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    policyName: keyof typeof AutopilotRetryManager.DEFAULT_RETRY_POLICIES = 'command',
    customPolicy?: Partial<RetryPolicy>,
  ): Promise<CommandResult & { result?: T }> {
    // Check circuit breaker
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerTimeout) {
        this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
      } else {
        return {
          success: false,
          error: 'Circuit breaker open - service unavailable',
          responseTimeMs: 0,
          attempt: 0,
        };
      }
    }

    const policy = {
      ...AutopilotRetryManager.DEFAULT_RETRY_POLICIES[policyName],
      ...customPolicy,
    };

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      const startTime = Date.now();

      try {
        const result = await operation();
        const responseTime = Date.now() - startTime;

        // Success - reset circuit breaker
        this.onSuccess();

        // Record metrics
        autopilotSafetyManager.recordCommandExecution(true, responseTime);

        return {
          success: true,
          responseTimeMs: responseTime,
          attempt,
          result,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        lastError = error instanceof Error ? error.message : String(error);

        // Record failure
        this.onFailure();
        autopilotSafetyManager.recordCommandExecution(false, responseTime);

        // If this was the last attempt, don't wait
        if (attempt === policy.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, policy);

        console.warn(
          `[RetryManager] Attempt ${attempt}/${policy.maxAttempts} failed: ${lastError}. Retrying in ${delay}ms`,
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError || 'Unknown error',
      responseTimeMs: 0,
      attempt: policy.maxAttempts,
    };
  }

  /**
   * Execute command with timeout and retry
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    policyName: keyof typeof AutopilotRetryManager.DEFAULT_RETRY_POLICIES = 'command',
  ): Promise<CommandResult & { result?: T }> {
    const timeoutOperation = () =>
      Promise.race([operation(), this.createTimeoutPromise<T>(timeoutMs)]);

    return this.executeWithRetry(timeoutOperation, policyName);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);

    // Add random jitter to prevent thundering herd
    const jitter = cappedDelay * policy.jitterFactor * (Math.random() * 2 - 1);

    return Math.max(0, cappedDelay + jitter);
  }

  /**
   * Create a promise that rejects after specified timeout
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
    }
    this.failureCount = 0;
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.failureThreshold &&
      this.circuitBreakerState === CircuitBreakerState.CLOSED
    ) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
      console.error(`[RetryManager] Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreakerState;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Check if service is available (circuit breaker allows requests)
   */
  isServiceAvailable(): boolean {
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      return Date.now() - this.lastFailureTime > this.circuitBreakerTimeout;
    }
    return true;
  }
}

// Singleton instance for global use
export const autopilotRetryManager = new AutopilotRetryManager();
