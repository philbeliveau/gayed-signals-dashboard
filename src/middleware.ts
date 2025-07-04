import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { 
  isPublicRoute, 
  isProtectedRoute, 
  isAdminRoute, 
  isPublicApiRoute, 
  isProtectedApiRoute, 
  isAdminApiRoute,
  LOGIN_ROUTE,
  DEFAULT_REDIRECT_AFTER_LOGIN 
} from './config/routes';

// JWT secret for verification
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'your-secret-key-change-this-in-production'
);

// Token cookie/header names
const TOKEN_COOKIE_NAME = 'auth_token';
const TOKEN_HEADER_NAME = 'authorization';

interface JWTPayload {
  sub: string;
  email: string;
  is_superuser: boolean;
  exp: number;
  iat: number;
}

interface UserContext {
  id: string;
  email: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Verify JWT token and extract user information
 */
async function verifyToken(token: string): Promise<UserContext | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET) as { payload: JWTPayload };
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      isAuthenticated: true,
      isAdmin: payload.is_superuser || false,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from request (cookie or Authorization header)
 */
function extractToken(request: NextRequest): string | null {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get(TOKEN_HEADER_NAME);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to get token from cookie
  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME);
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Create response with user context headers
 */
function createResponseWithUserContext(
  response: NextResponse, 
  userContext: UserContext | null
): NextResponse {
  if (userContext) {
    response.headers.set('x-user-id', userContext.id);
    response.headers.set('x-user-email', userContext.email);
    response.headers.set('x-user-authenticated', 'true');
    response.headers.set('x-user-admin', userContext.isAdmin.toString());
  } else {
    response.headers.set('x-user-authenticated', 'false');
    response.headers.set('x-user-admin', 'false');
  }
  
  return response;
}

/**
 * Handle route protection logic
 */
async function handleRouteProtection(
  request: NextRequest,
  userContext: UserContext | null
): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');

  // Handle API routes
  if (isApiRoute) {
    return handleApiRouteProtection(request, userContext, pathname);
  }

  // Handle page routes
  return handlePageRouteProtection(request, userContext, pathname, searchParams);
}

/**
 * Handle API route protection
 */
function handleApiRouteProtection(
  request: NextRequest,
  userContext: UserContext | null,
  pathname: string
): NextResponse {
  // Public API routes - allow access
  if (isPublicApiRoute(pathname)) {
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Protected API routes - require authentication
  if (isProtectedApiRoute(pathname)) {
    if (!userContext?.isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Admin API routes - require admin privileges
  if (isAdminApiRoute(pathname)) {
    if (!userContext?.isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!userContext.isAdmin) {
      return new NextResponse(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Default: allow access to other API routes with user context
  const response = NextResponse.next();
  return createResponseWithUserContext(response, userContext);
}

/**
 * Handle page route protection
 */
function handlePageRouteProtection(
  request: NextRequest,
  userContext: UserContext | null,
  pathname: string,
  searchParams: URLSearchParams
): NextResponse {
  // Public routes - allow access
  if (isPublicRoute(pathname)) {
    // If user is authenticated and trying to access login, redirect to dashboard
    if (userContext?.isAuthenticated && pathname === LOGIN_ROUTE) {
      const redirectUrl = new URL(DEFAULT_REDIRECT_AFTER_LOGIN, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Protected routes - require authentication
  if (isProtectedRoute(pathname)) {
    if (!userContext?.isAuthenticated) {
      // Store the original URL for redirect after login
      const loginUrl = new URL(LOGIN_ROUTE, request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      
      // Preserve query parameters
      if (searchParams.toString()) {
        loginUrl.searchParams.set('returnQuery', searchParams.toString());
      }
      
      return NextResponse.redirect(loginUrl);
    }
    
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Admin routes - require admin privileges
  if (isAdminRoute(pathname)) {
    if (!userContext?.isAuthenticated) {
      const loginUrl = new URL(LOGIN_ROUTE, request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      
      if (searchParams.toString()) {
        loginUrl.searchParams.set('returnQuery', searchParams.toString());
      }
      
      return NextResponse.redirect(loginUrl);
    }
    
    if (!userContext.isAdmin) {
      // Redirect to unauthorized page or dashboard
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
    
    const response = NextResponse.next();
    return createResponseWithUserContext(response, userContext);
  }

  // Default: allow access to other routes with user context
  const response = NextResponse.next();
  return createResponseWithUserContext(response, userContext);
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  try {
    // Extract token from request
    const token = extractToken(request);
    
    // Verify token and get user context
    let userContext: UserContext | null = null;
    if (token) {
      userContext = await verifyToken(token);
    }

    // Handle route protection
    return await handleRouteProtection(request, userContext);
    
  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, allow the request to proceed but without user context
    const response = NextResponse.next();
    return createResponseWithUserContext(response, null);
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

/**
 * Helper function to check if request is from a browser
 */
function isBrowserRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const accept = request.headers.get('accept') || '';
  
  return (
    userAgent.includes('Mozilla') ||
    accept.includes('text/html') ||
    accept.includes('application/xhtml+xml')
  );
}

/**
 * Helper function to preserve original request URL for post-login redirect
 */
export function preserveReturnUrl(pathname: string, searchParams: URLSearchParams): string {
  const returnUrl = encodeURIComponent(pathname);
  const returnQuery = searchParams.toString() ? encodeURIComponent(searchParams.toString()) : '';
  
  let loginPath = `${LOGIN_ROUTE}?returnUrl=${returnUrl}`;
  if (returnQuery) {
    loginPath += `&returnQuery=${returnQuery}`;
  }
  
  return loginPath;
}

/**
 * Helper function to construct redirect URL after login
 */
export function constructReturnUrl(searchParams: URLSearchParams): string {
  const returnUrl = searchParams.get('returnUrl');
  const returnQuery = searchParams.get('returnQuery');
  
  if (returnUrl) {
    let targetUrl = decodeURIComponent(returnUrl);
    if (returnQuery) {
      const decodedQuery = decodeURIComponent(returnQuery);
      targetUrl += `?${decodedQuery}`;
    }
    return targetUrl;
  }
  
  return DEFAULT_REDIRECT_AFTER_LOGIN;
}