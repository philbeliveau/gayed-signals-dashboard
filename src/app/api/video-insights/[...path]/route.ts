/**
 * API Proxy Route for Video Insights
 * Proxies requests to the FastAPI backend while handling authentication and error responses
 */

import { NextRequest, NextResponse } from 'next/server';

// FastAPI backend configuration with validation
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8002';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '60000'); // 60 seconds default

// Validate backend service on startup
let serviceValidated = false;
async function validateBackendService() {
  if (serviceValidated) return true;
  
  try {
    const healthResponse = await fetch(`${FASTAPI_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`✅ Backend service validated: ${health.service || 'Video Insights API'}`);
      serviceValidated = true;
      return true;
    }
  } catch (error) {
    console.error(`❌ Backend service validation failed for ${FASTAPI_BASE_URL}:`, error.message);
    console.error(`💡 Check if FASTAPI_BASE_URL environment variable points to the correct service`);
  }
  return false;
}

/**
 * Helper function to get user authentication token
 * In a real implementation, this would integrate with your auth system
 */
function getAuthToken(request: NextRequest): string | null {
  // Development bypass - skip authentication in development mode
  if (process.env.NODE_ENV === 'development') {
    return 'dev-token';
  }

  // Check for Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check for session cookie or other auth mechanisms
  // This is a placeholder - implement based on your auth system
  const sessionCookie = request.cookies.get('session');
  if (sessionCookie) {
    // In real implementation, validate and extract user token from session
    return sessionCookie.value;
  }

  // For testing purposes, allow API Key authentication
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.API_KEY) {
    return 'api-key-token';
  }

  return null;
}

/**
 * Helper function to construct FastAPI URL
 */
function constructFastAPIUrl(path: string[], searchParams: URLSearchParams): string {
  const pathString = path.join('/');
  const url = `${FASTAPI_BASE_URL}/api/v1/${pathString}`;
  const params = searchParams.toString();
  return params ? `${url}?${params}` : url;
}

/**
 * Helper function to proxy request to FastAPI
 */
async function proxyToFastAPI(
  request: NextRequest,
  path: string[],
  method: string
): Promise<NextResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Get authentication token
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Construct target URL
    const url = new URL(request.url);
    const targetUrl = constructFastAPIUrl(path, url.searchParams);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'User-Agent': 'NextJS-Proxy/1.0',
    };

    // Copy relevant headers from original request
    const relevantHeaders = ['x-request-id', 'x-forwarded-for', 'x-real-ip'];
    relevantHeaders.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        console.error('Error reading request body:', error);
        return NextResponse.json(
          {
            status: 'error',
            error: 'Invalid request body',
            code: 'INVALID_BODY'
          },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Proxying ${method} request to FastAPI: ${targetUrl}`);

    // Make request to FastAPI
    const response = await fetch(targetUrl, requestOptions);
    clearTimeout(timeoutId);

    // Handle different response types
    const contentType = response.headers.get('content-type') || '';
    
    let responseData;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType.includes('text/')) {
      responseData = await response.text();
    } else {
      // For binary data (exports, files, etc.)
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': response.headers.get('content-disposition') || '',
        },
      });
    }

    // Create response with same status code
    const nextResponse = NextResponse.json(responseData, {
      status: response.status,
    });

    // Copy relevant response headers
    const responseHeaders = ['x-request-id', 'x-rate-limit-remaining', 'x-rate-limit-reset'];
    responseHeaders.forEach(headerName => {
      const value = response.headers.get(headerName);
      if (value) {
        nextResponse.headers.set(headerName, value);
      }
    });

    return nextResponse;

  } catch (error) {
    clearTimeout(timeoutId);

    console.error('❌ FastAPI proxy error:', error);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Request timeout',
          code: 'TIMEOUT'
        },
        { status: 408 }
      );
    }

    // Handle network errors
    if ((error as any)?.code === 'ECONNREFUSED' || (error instanceof Error && error.message.includes('fetch failed'))) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Backend service unavailable',
          code: 'SERVICE_UNAVAILABLE'
        },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return proxyToFastAPI(request, resolvedParams.path, 'GET');
}

/**
 * POST handler
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return proxyToFastAPI(request, resolvedParams.path, 'POST');
}

/**
 * PUT handler
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return proxyToFastAPI(request, resolvedParams.path, 'PUT');
}

/**
 * DELETE handler
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return proxyToFastAPI(request, resolvedParams.path, 'DELETE');
}

/**
 * PATCH handler
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  return proxyToFastAPI(request, resolvedParams.path, 'PATCH');
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  // Allow CORS for video insights API
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}

/**
 * Health check endpoint for the proxy
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  // If path is specifically 'health', check FastAPI health
  if (resolvedParams.path.length === 1 && resolvedParams.path[0] === 'health') {
    try {
      const healthUrl = `${FASTAPI_BASE_URL}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      return new NextResponse(null, {
        status: response.ok ? 200 : 503,
        headers: {
          'X-Service-Status': response.ok ? 'healthy' : 'unhealthy',
          'X-Proxy-Status': 'healthy',
        },
      });
    } catch (error) {
      return new NextResponse(null, {
        status: 503,
        headers: {
          'X-Service-Status': 'unhealthy',
          'X-Proxy-Status': 'healthy',
          'X-Error': error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // For other HEAD requests, just return 200
  return new NextResponse(null, { status: 200 });
}