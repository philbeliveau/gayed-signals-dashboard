/**
 * Railway Backend HTTP Client
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Provides authenticated HTTP client for Railway backend V2 API with:
 * - Automatic authentication headers
 * - Retry logic with exponential backoff
 * - Request/response logging
 * - Timeout handling
 */

import {
  RailwayConfig,
  RailwayResponse,
  RailwayAPIError,
  RailwayTimeoutError,
  RailwayNetworkError,
} from './types';

export class RailwayClient {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config?: Partial<RailwayConfig>) {
    this.baseURL =
      config?.baseURL || process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL || '';
    this.apiKey = config?.apiKey || process.env.NEXT_PUBLIC_RAILWAY_API_KEY || '';
    this.timeout = config?.timeout || 10000; // 10 seconds default
    this.retryAttempts = config?.retryAttempts || 3;
    this.retryDelay = config?.retryDelay || 1000; // 1 second base delay

    // Validate configuration
    if (!this.baseURL) {
      throw new Error(
        'Railway backend URL not configured. Set NEXT_PUBLIC_RAILWAY_BACKEND_URL environment variable.'
      );
    }

    if (!this.apiKey) {
      console.warn(
        '[Railway Client] API key not configured. Set NEXT_PUBLIC_RAILWAY_API_KEY environment variable.'
      );
    }
  }

  /**
   * Make authenticated request to Railway backend
   */
  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<RailwayResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        this.logRequest(url, attempt);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-API-Key': this.apiKey }),
            ...options?.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new RailwayAPIError(
            `Railway API error: ${response.status} ${response.statusText}`,
            response.status,
            await response.text()
          );
        }

        const data = await response.json();
        this.logResponse(url, data, attempt);

        return data;
      } catch (error) {
        lastError = this.handleError(error, attempt);

        // Don't retry on client errors (4xx)
        if (
          error instanceof RailwayAPIError &&
          error.statusCode &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Railway API request failed after all retries');
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: unknown, attempt: number): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        const timeoutError = new RailwayTimeoutError(
          `Railway API timeout after ${this.timeout}ms`
        );
        this.logError(timeoutError, attempt);
        return timeoutError;
      }

      if (error instanceof RailwayAPIError) {
        this.logError(error, attempt);
        return error;
      }

      // Network errors
      const networkError = new RailwayNetworkError(
        `Network error: ${error.message}`
      );
      this.logError(networkError, attempt);
      return networkError;
    }

    const unknownError = new Error('Unknown error occurred');
    this.logError(unknownError, attempt);
    return unknownError;
  }

  /**
   * Log request for debugging
   */
  private logRequest(url: string, attempt: number): void {
    console.log(
      `[Railway Client] Request to ${url} (attempt ${attempt + 1}/${this.retryAttempts})`
    );
  }

  /**
   * Log successful response
   */
  private logResponse(url: string, data: unknown, attempt: number): void {
    console.log(
      `[Railway Client] Response from ${url} (attempt ${attempt + 1}):`,
      {
        success: (data as RailwayResponse<unknown>)?.success,
        cached: (data as RailwayResponse<unknown>)?.metadata?.timing?.cached,
        totalMs: (data as RailwayResponse<unknown>)?.metadata?.timing?.totalMs,
      }
    );
  }

  /**
   * Log errors for debugging
   */
  private logError(error: Error, attempt: number): void {
    console.error(
      `[Railway Client] Error (attempt ${attempt + 1}/${this.retryAttempts}):`,
      {
        name: error.name,
        message: error.message,
        ...(error instanceof RailwayAPIError && { statusCode: error.statusCode }),
      }
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
