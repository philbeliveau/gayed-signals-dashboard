import { APIClientConfig, APIResponse, APIError, TokenManager } from '../../types/auth';

/**
 * API Error class for handling HTTP errors
 */
export class APIErrorImpl extends Error implements APIError {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(error: Omit<APIError, 'name'>) {
    super(error.message);
    this.name = 'APIError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }

  /**
   * Check if error is retryable based on status code
   */
  isRetryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Request options interface
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  skipAuthRefresh?: boolean;
  timeout?: number;
  retryAttempts?: number;
  signal?: AbortSignal;
}

/**
 * API Client Implementation
 * Handles HTTP communication with automatic token refresh and retry logic
 */
export class APIClient {
  private config: APIClientConfig;
  private abortController: AbortController;
  private requestId: number = 0;

  constructor(config: APIClientConfig) {
    this.config = config;
    this.abortController = new AbortController();
  }

  /**
   * Main request method with comprehensive error handling and retries
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      data,
      headers = {},
      requireAuth = true,
      skipAuthRefresh = false,
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      signal
    } = options;

    const requestId = ++this.requestId;
    const url = this.buildUrl(endpoint);

    // Build headers
    const requestHeaders = await this.buildHeaders(headers, requireAuth);
    
    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: signal || this.abortController.signal,
      body: this.buildBody(data, method),
    };

    // Add timeout handling
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    try {
      const response = await this.executeRequest(url, requestOptions, timeoutController.signal);
      
      // Handle authentication errors with token refresh
      if (response.status === 401 && !skipAuthRefresh && requireAuth) {
        return await this.handleAuthRefresh(endpoint, options, requestId);
      }

      return await this.processResponse<T>(response);
    } catch (error) {
      return await this.handleRequestError<T>(error, endpoint, options, retryAttempts, requestId);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string, 
    options: Omit<RequestOptions, 'method' | 'data'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string, 
    data?: any, 
    options: Omit<RequestOptions, 'method' | 'data'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string, 
    data?: any, 
    options: Omit<RequestOptions, 'method' | 'data'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string, 
    data?: any, 
    options: Omit<RequestOptions, 'method' | 'data'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', data });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string, 
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Cancel all pending requests
   */
  cancelRequests(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<APIClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseURL = this.config.baseURL.endsWith('/') 
      ? this.config.baseURL.slice(0, -1) 
      : this.config.baseURL;
    
    const cleanEndpoint = endpoint.startsWith('/') 
      ? endpoint 
      : `/${endpoint}`;

    return `${baseURL}${cleanEndpoint}`;
  }

  /**
   * Build request headers
   */
  private async buildHeaders(
    customHeaders: Record<string, string>, 
    requireAuth: boolean
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      ...customHeaders,
    };

    // Add authentication header if required
    if (requireAuth) {
      const token = this.config.tokenManager.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Build request body
   */
  private buildBody(data: any, method: string): string | FormData | undefined {
    if (!data || method === 'GET') {
      return undefined;
    }

    // Handle FormData
    if (data instanceof FormData) {
      return data;
    }

    // Handle File uploads
    if (data instanceof File || data instanceof Blob) {
      const formData = new FormData();
      formData.append('file', data);
      return formData;
    }

    // Handle JSON data
    return JSON.stringify(data);
  }

  /**
   * Execute HTTP request with timeout handling
   */
  private async executeRequest(
    url: string, 
    options: RequestInit, 
    timeoutSignal: AbortSignal
  ): Promise<Response> {
    // Combine abort signals
    const combinedSignal = this.combineAbortSignals([
      options.signal as AbortSignal,
      timeoutSignal
    ].filter(Boolean));

    const requestOptions = {
      ...options,
      signal: combinedSignal,
    };

    // Add content-type for JSON requests
    if (typeof options.body === 'string' && !(options.headers as Record<string, string>)?.['Content-Type']) {
      (requestOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    return fetch(url, requestOptions);
  }

  /**
   * Process successful response
   */
  private async processResponse<T>(response: Response): Promise<APIResponse<T>> {
    let responseData: T;

    // Handle different content types
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType.includes('text/')) {
      responseData = (await response.text()) as T;
    } else if (contentType.includes('application/octet-stream') || contentType.includes('application/pdf')) {
      responseData = (await response.blob()) as T;
    } else {
      responseData = (await response.text()) as T;
    }

    // Check for HTTP errors
    if (!response.ok) {
      throw new APIErrorImpl({
        message: (responseData as any)?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        code: (responseData as any)?.code || `HTTP_${response.status}`,
        details: responseData
      });
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  /**
   * Handle authentication refresh when 401 is received
   */
  private async handleAuthRefresh<T>(
    endpoint: string, 
    options: RequestOptions, 
    requestId: number
  ): Promise<APIResponse<T>> {
    try {
      // Attempt to refresh the token
      await this.config.tokenManager.refreshToken();
      
      // Retry the original request with the new token
      console.log(`[APIClient:${requestId}] Token refreshed, retrying request to ${endpoint}`);
      return this.request<T>(endpoint, { ...options, skipAuthRefresh: true });
    } catch (refreshError) {
      // Refresh failed, clear tokens and throw auth error
      console.error(`[APIClient:${requestId}] Token refresh failed:`, refreshError);
      this.config.tokenManager.clearAll();
      
      throw new APIErrorImpl({
        message: 'Authentication failed - please login again',
        status: 401,
        code: 'AUTH_REFRESH_FAILED',
        details: refreshError
      });
    }
  }

  /**
   * Handle request errors with retry logic
   */
  private async handleRequestError<T>(
    error: any, 
    endpoint: string, 
    options: RequestOptions, 
    retryAttempts: number, 
    requestId: number
  ): Promise<APIResponse<T>> {
    console.error(`[APIClient:${requestId}] Request error:`, error);

    // Handle abort errors
    if (error.name === 'AbortError') {
      throw new APIErrorImpl({
        message: 'Request was cancelled',
        status: 0,
        code: 'REQUEST_CANCELLED'
      });
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIErrorImpl({
        message: 'Network error - please check your connection',
        status: 0,
        code: 'NETWORK_ERROR',
        details: error.message
      });
    }

    // Handle API errors
    if (error instanceof APIErrorImpl) {
      // Retry logic for retryable errors
      if (error.isRetryable() && retryAttempts > 0) {
        console.log(`[APIClient:${requestId}] Retrying request to ${endpoint}, attempts left: ${retryAttempts - 1}`);
        
        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, this.config.retryAttempts - retryAttempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.request<T>(endpoint, { ...options, retryAttempts: retryAttempts - 1 });
      }
      
      throw error;
    }

    // Handle unexpected errors
    throw new APIErrorImpl({
      message: error.message || 'An unexpected error occurred',
      status: 0,
      code: 'UNKNOWN_ERROR',
      details: error
    });
  }

  /**
   * Combine multiple abort signals
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      
      signal.addEventListener('abort', () => controller.abort());
    }
    
    return controller.signal;
  }

  /**
   * Create a request with custom timeout
   */
  async requestWithTimeout<T>(
    endpoint: string, 
    options: RequestOptions, 
    timeoutMs: number
  ): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      return await this.request<T>(endpoint, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    options: {
      onProgress?: (progress: number) => void;
      additionalData?: Record<string, any>;
    } = {}
  ): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional form data
    if (options.additionalData) {
      Object.entries(options.additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    // Note: Progress tracking would require XMLHttpRequest
    // For now, we'll use the standard fetch approach
    return this.post<T>(endpoint, formData, {
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      }
    });
  }

  /**
   * Download file
   */
  async downloadFile(
    endpoint: string,
    filename?: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<Blob> {
    const response = await this.get<Blob>(endpoint, options);
    
    // If filename is provided, trigger download
    if (filename && typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
    
    return response.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { 
        requireAuth: false,
        retryAttempts: 0,
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create API client
 */
export function createAPIClient(config: APIClientConfig): APIClient {
  return new APIClient(config);
}

export default APIClient;