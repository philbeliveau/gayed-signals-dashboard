/**
 * Circuit Breaker Pattern Implementation
 * Story: 4.0a - Unified Data Service
 * Protects data sources from cascading failures
 */

import { CircuitBreakerConfig, CircuitBreakerState } from '../types';

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private successCount: number = 0;
  private totalAttempts: number = 0;
  private totalFailures: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.config.onHalfOpen?.();
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.config.onOpen?.();
    }
  }

  /**
   * Check if circuit breaker allows attempts
   */
  canAttempt(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      // Check if timeout has elapsed to move to HALF_OPEN
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.config.onHalfOpen?.();
        return true;
      }
      return false;
    }

    // HALF_OPEN state allows attempts
    return true;
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.totalAttempts++;
    this.onSuccess();
  }

  /**
   * Record failed operation
   */
  recordFailure(): void {
    this.totalAttempts++;
    this.onFailure();
  }

  /**
   * Get error rate (0-1)
   */
  getErrorRate(): number {
    if (this.totalAttempts === 0) return 0;
    return this.totalFailures / this.totalAttempts;
  }

  /**
   * Get last successful execution time
   */
  getLastSuccess(): Date | undefined {
    return this.lastSuccessTime > 0 ? new Date(this.lastSuccessTime) : undefined;
  }

  /**
   * Get last failed execution time
   */
  getLastFailure(): Date | undefined {
    return this.lastFailureTime > 0 ? new Date(this.lastFailureTime) : undefined;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.totalAttempts = 0;
    this.totalFailures = 0;
  }
}
