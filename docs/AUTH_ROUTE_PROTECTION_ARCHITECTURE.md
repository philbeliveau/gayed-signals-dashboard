# Route Protection & Navigation Architecture

## Overview
This document defines the route protection and navigation architecture for the authentication system, including Next.js middleware, client-side guards, and authentication-aware navigation components.

## Route Protection Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Route Protection Layers                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Next.js Middleware (Server-Side)                  │
│  ├── Token validation                                       │
│  ├── Route matching                                         │
│  ├── Automatic redirects                                    │
│  └── Request headers                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Route Guards (Client-Side)                        │
│  ├── Authentication checks                                  │
│  ├── Permission validation                                  │
│  ├── Role-based access                                      │
│  └── Loading states                                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Component Guards (Granular)                       │
│  ├── Feature-level protection                               │
│  ├── Action-based guards                                    │
│  ├── Data access control                                    │
│  └── UI element visibility                                  │
└─────────────────────────────────────────────────────────────┘
```

## Next.js Middleware Implementation

### 1. Core Middleware

**File**: `/src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

interface TokenPayload {
  sub: string; // user ID
  email: string;
  exp: number;
  iat: number;
  is_superuser?: boolean;
  permissions?: string[];
}

// Route configuration
const routeConfig = {
  // Public routes (no authentication required)
  public: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ],
  
  // Protected routes (authentication required)
  protected: [
    '/dashboard',
    '/profile',
    '/settings',
    '/strategies',
    '/backtest',
    '/video-insights',
    '/housing',
    '/labor',
    '/interactive-charts',
  ],
  
  // Admin routes (superuser required)
  admin: [
    '/admin',
    '/admin/*',
  ],
  
  // API routes that need protection
  api: {
    public: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
    ],
    protected: [
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/users/*',
      '/api/videos/*',
      '/api/folders/*',
      '/api/prompts/*',
      '/api/signals/*',
      '/api/backtest/*',
    ],
    admin: [
      '/api/admin/*',
    ],
  },
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // Check route type
  const routeType = getRouteType(pathname);
  
  // Handle public routes
  if (routeType === 'public') {
    return handlePublicRoute(request);
  }
  
  // Get and validate token
  const token = getTokenFromRequest(request);
  const tokenPayload = await validateToken(token);
  
  // Handle unauthenticated access to protected routes
  if (!tokenPayload && (routeType === 'protected' || routeType === 'admin')) {
    return redirectToLogin(request);
  }
  
  // Handle admin routes
  if (routeType === 'admin' && !tokenPayload?.is_superuser) {
    return createUnauthorizedResponse();
  }
  
  // Add user context to headers for server components
  if (tokenPayload) {
    const response = NextResponse.next();
    response.headers.set('x-user-id', tokenPayload.sub);
    response.headers.set('x-user-email', tokenPayload.email);
    response.headers.set('x-user-permissions', JSON.stringify(tokenPayload.permissions || []));
    return response;
  }
  
  return NextResponse.next();
}

function getRouteType(pathname: string): 'public' | 'protected' | 'admin' {
  // Check admin routes first (most specific)
  if (routeConfig.admin.some(route => 
    route.endsWith('*') 
      ? pathname.startsWith(route.slice(0, -1))
      : pathname === route
  )) {
    return 'admin';
  }
  
  // Check protected routes
  if (routeConfig.protected.some(route => 
    route.endsWith('*')
      ? pathname.startsWith(route.slice(0, -1))
      : pathname === route
  )) {
    return 'protected';
  }
  
  // Check API routes
  if (pathname.startsWith('/api/')) {
    if (routeConfig.api.admin.some(route => 
      route.endsWith('*')
        ? pathname.startsWith(route.slice(0, -1))
        : pathname === route
    )) {
      return 'admin';
    }
    
    if (routeConfig.api.protected.some(route => 
      route.endsWith('*')
        ? pathname.startsWith(route.slice(0, -1))
        : pathname === route
    )) {
      return 'protected';
    }
  }
  
  return 'public';
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const tokenCookie = request.cookies.get('access_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }
  
  return null;
}

async function validateToken(token: string | null): Promise<TokenPayload | null> {
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);
    
    return payload as TokenPayload;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
}

function handlePublicRoute(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  
  // Redirect authenticated users away from login/register pages
  if (pathname === '/login' || pathname === '/register') {
    const token = getTokenFromRequest(request);
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  
  // Preserve the original URL for redirect after login
  const returnUrl = encodeURIComponent(pathname + search);
  const loginUrl = new URL(`/login?returnUrl=${returnUrl}`, request.url);
  
  // Handle API routes differently
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return NextResponse.redirect(loginUrl);
}

function createUnauthorizedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: 'Insufficient permissions' }),
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Client-Side Route Guards

### 1. Base RouteGuard Component

**File**: `/src/components/auth/RouteGuard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UnauthorizedMessage from '@/components/auth/UnauthorizedMessage';

interface RouteGuardProps {
  children: React.ReactNode;
  
  // Authentication requirements
  requireAuth?: boolean;
  requireAdmin?: boolean;
  
  // Permission requirements
  requiredPermissions?: string[];
  requiredRoles?: string[];
  
  // Behavior configuration
  redirectTo?: string;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
  
  // Options
  allowUnverifiedUsers?: boolean;
  checkSessionValidity?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  requiredPermissions = [],
  requiredRoles = [],
  redirectTo = '/login',
  fallback = null,
  loadingComponent = <LoadingSpinner />,
  unauthorizedComponent = <UnauthorizedMessage />,
  allowUnverifiedUsers = false,
  checkSessionValidity = true,
}) => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isInitialized 
  } = useAuth();
  
  const { 
    hasPermission, 
    hasRole, 
    hasAllRoles, 
    isAdmin 
  } = usePermissions();
  
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkAuthorization = async () => {
      // Wait for auth to initialize
      if (!isInitialized) return;
      
      // Check authentication requirement
      if (requireAuth && !isAuthenticated) {
        const currentPath = window.location.pathname + window.location.search;
        const returnUrl = encodeURIComponent(currentPath);
        router.push(`${redirectTo}?returnUrl=${returnUrl}`);
        return;
      }
      
      // Check admin requirement
      if (requireAdmin && !isAdmin) {
        setIsAuthorized(false);
        return;
      }
      
      // Check email verification
      if (user && !allowUnverifiedUsers && !user.email_verified) {
        router.push('/verify-email');
        return;
      }
      
      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission => 
          hasPermission(permission)
        );
        if (!hasAllPermissions) {
          setIsAuthorized(false);
          return;
        }
      }
      
      // Check roles
      if (requiredRoles.length > 0) {
        if (!hasAllRoles(requiredRoles)) {
          setIsAuthorized(false);
          return;
        }
      }
      
      // Check session validity
      if (checkSessionValidity && isAuthenticated) {
        try {
          // This could trigger a token refresh if needed
          const { checkSessionValidity: validateSession } = useAuthActions();
          const isValid = await validateSession();
          if (!isValid) {
            router.push(redirectTo);
            return;
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          router.push(redirectTo);
          return;
        }
      }
      
      setIsAuthorized(true);
    };
    
    checkAuthorization();
  }, [
    user,
    isAuthenticated,
    isInitialized,
    requireAuth,
    requireAdmin,
    requiredPermissions,
    requiredRoles,
    isAdmin,
    hasPermission,
    hasAllRoles,
    allowUnverifiedUsers,
    checkSessionValidity,
    redirectTo,
    router,
  ]);
  
  // Show loading while checking authorization
  if (isLoading || !isInitialized || isAuthorized === null) {
    return <>{loadingComponent}</>;
  }
  
  // Show unauthorized message if not authorized
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <>{unauthorizedComponent}</>;
  }
  
  // Render children if authorized
  return <>{children}</>;
};

export default RouteGuard;
```

### 2. Specialized Route Guards

```typescript
// AdminRouteGuard.tsx
export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard
    requireAuth={true}
    requireAdmin={true}
    unauthorizedComponent={<AdminRequiredMessage />}
  >
    {children}
  </RouteGuard>
);

// PermissionGuard.tsx
interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  mode?: 'all' | 'any';
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  permissions, 
  mode = 'all' 
}) => {
  const { hasPermission } = usePermissions();
  
  const hasAccess = mode === 'all' 
    ? permissions.every(permission => hasPermission(permission))
    : permissions.some(permission => hasPermission(permission));
  
  if (!hasAccess) {
    return <InsufficientPermissionsMessage />;
  }
  
  return <>{children}</>;
};

// RoleGuard.tsx
interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  mode?: 'all' | 'any';
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  roles, 
  mode = 'any' 
}) => {
  const { hasRole, hasAnyRole, hasAllRoles } = usePermissions();
  
  const hasAccess = mode === 'all' 
    ? hasAllRoles(roles)
    : hasAnyRole(roles);
  
  if (!hasAccess) {
    return <InsufficientRoleMessage />;
  }
  
  return <>{children}</>;
};
```

### 3. HOC Route Guards

```typescript
// withAuth.tsx - Higher-Order Component for route protection
interface WithAuthOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  redirectTo?: string;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    return (
      <RouteGuard {...options}>
        <Component {...props} />
      </RouteGuard>
    );
  };
  
  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}

// Usage example:
// export default withAuth(DashboardPage, { requireAuth: true });
// export default withAuth(AdminPanel, { requireAdmin: true });
```

## Navigation Components

### 1. Authentication-Aware Navigation

**File**: `/src/components/navigation/AuthNavigation.tsx`

```typescript
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  UserIcon, 
  CogIcon, 
  LogOutIcon, 
  ShieldIcon 
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    requireAuth: true,
  },
  {
    label: 'Strategies',
    href: '/strategies',
    requireAuth: true,
  },
  {
    label: 'Backtest',
    href: '/backtest',
    requireAuth: true,
  },
  {
    label: 'Video Insights',
    href: '/video-insights',
    requireAuth: true,
  },
  {
    label: 'Housing Market',
    href: '/housing',
    requireAuth: true,
  },
  {
    label: 'Labor Market',
    href: '/labor',
    requireAuth: true,
  },
  {
    label: 'Interactive Charts',
    href: '/interactive-charts',
    requireAuth: true,
  },
  {
    label: 'Admin Panel',
    href: '/admin',
    icon: <ShieldIcon className="w-4 h-4" />,
    adminOnly: true,
  },
];

const AuthNavigation: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { hasPermission, hasRole, isAdmin } = usePermissions();
  const router = useRouter();
  
  const filteredNavItems = navigationItems.filter(item => {
    // Show public items to everyone
    if (!item.requireAuth && !item.adminOnly && !item.requiredPermissions && !item.requiredRoles) {
      return true;
    }
    
    // Hide auth-required items from unauthenticated users
    if (item.requireAuth && !isAuthenticated) {
      return false;
    }
    
    // Hide admin items from non-admins
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    
    // Check permissions
    if (item.requiredPermissions && !item.requiredPermissions.every(hasPermission)) {
      return false;
    }
    
    // Check roles
    if (item.requiredRoles && !item.requiredRoles.every(hasRole)) {
      return false;
    }
    
    return true;
  });
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Gayed Signals
              </Link>
            </div>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User menu */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// User menu component
interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-medium">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </span>
        </div>
        <span className="hidden sm:block text-gray-700 dark:text-gray-300">
          {user?.full_name || user?.email}
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
          <Link
            href="/profile"
            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <UserIcon className="w-4 h-4 mr-2" />
            Profile
          </Link>
          <Link
            href="/settings"
            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <CogIcon className="w-4 h-4 mr-2" />
            Settings
          </Link>
          <hr className="my-1" />
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOutIcon className="w-4 h-4 mr-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

// Auth buttons for unauthenticated users
const AuthButtons: React.FC = () => {
  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/login"
        className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
      >
        Sign up
      </Link>
    </div>
  );
};

export default AuthNavigation;
```

### 2. Breadcrumb with Auth Awareness

```typescript
// AuthBreadcrumb.tsx
interface BreadcrumbItem {
  label: string;
  href?: string;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

interface AuthBreadcrumbProps {
  items: BreadcrumbItem[];
}

const AuthBreadcrumb: React.FC<AuthBreadcrumbProps> = ({ items }) => {
  const { isAuthenticated } = useAuth();
  const { isAdmin } = usePermissions();
  
  const filteredItems = items.filter(item => {
    if (item.requireAuth && !isAuthenticated) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
  
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        {filteredItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="w-5 h-5 text-gray-400 mx-2" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-blue-600 hover:text-blue-800"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
```

## Page-Level Protection

### 1. Protected Page Template

```typescript
// pages/dashboard/page.tsx
import { Metadata } from 'next';
import RouteGuard from '@/components/auth/RouteGuard';
import DashboardContent from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard - Gayed Signals',
  description: 'Your trading dashboard',
};

export default function DashboardPage() {
  return (
    <RouteGuard requireAuth={true}>
      <DashboardContent />
    </RouteGuard>
  );
}
```

### 2. Admin Page Template

```typescript
// pages/admin/page.tsx
import { Metadata } from 'next';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import AdminPanel from '@/components/admin/AdminPanel';

export const metadata: Metadata = {
  title: 'Admin Panel - Gayed Signals',
  description: 'Administrative controls',
};

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <AdminPanel />
    </AdminRouteGuard>
  );
}
```

## Error Pages

### 1. Unauthorized Page

```typescript
// components/auth/UnauthorizedMessage.tsx
interface UnauthorizedMessageProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  showHomeButton?: boolean;
}

const UnauthorizedMessage: React.FC<UnauthorizedMessageProps> = ({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  showLoginButton = true,
  showHomeButton = true,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
        
        <div className="space-y-4">
          {showLoginButton && (
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </Link>
          )}
          
          {showHomeButton && (
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Route Configuration

### 1. Route Definitions

```typescript
// config/routes.ts
export interface RouteDefinition {
  path: string;
  requireAuth: boolean;
  adminOnly?: boolean;
  permissions?: string[];
  roles?: string[];
  redirectTo?: string;
}

export const routes: RouteDefinition[] = [
  // Public routes
  { path: '/', requireAuth: false },
  { path: '/login', requireAuth: false },
  { path: '/register', requireAuth: false },
  { path: '/forgot-password', requireAuth: false },
  
  // Protected routes
  { path: '/dashboard', requireAuth: true },
  { path: '/profile', requireAuth: true },
  { path: '/settings', requireAuth: true },
  { path: '/strategies', requireAuth: true },
  { path: '/backtest', requireAuth: true },
  { path: '/video-insights', requireAuth: true },
  { path: '/housing', requireAuth: true },
  { path: '/labor', requireAuth: true },
  { path: '/interactive-charts', requireAuth: true },
  
  // Admin routes
  { path: '/admin', requireAuth: true, adminOnly: true },
  { path: '/admin/*', requireAuth: true, adminOnly: true },
];

export const getRouteConfig = (path: string): RouteDefinition | null => {
  return routes.find(route => {
    if (route.path.endsWith('*')) {
      return path.startsWith(route.path.slice(0, -1));
    }
    return path === route.path;
  }) || null;
};
```

## Testing Strategy

### 1. Route Guard Testing

```typescript
// __tests__/components/auth/RouteGuard.test.tsx
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import RouteGuard from '@/components/auth/RouteGuard';

jest.mock('@/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RouteGuard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  });

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });

    render(
      <RouteGuard requireAuth={true}>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show loading when auth is not initialized', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
    });

    render(
      <RouteGuard requireAuth={true}>
        <div>Protected Content</div>
      </RouteGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### 2. Middleware Testing

```typescript
// __tests__/middleware.test.ts
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Middleware', () => {
  it('should allow access to public routes', async () => {
    const request = new NextRequest('http://localhost:3000/');
    const response = await middleware(request);
    
    expect(response.status).toBe(200);
  });

  it('should redirect unauthenticated users from protected routes', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard');
    const response = await middleware(request);
    
    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toContain('/login');
  });
});
```

## Next Steps

1. **Implement Next.js middleware** for server-side route protection
2. **Create route guard components** with permission checking
3. **Build authentication-aware navigation** components
4. **Add error pages** for unauthorized access
5. **Configure route definitions** and access control
6. **Add comprehensive testing** for all protection mechanisms
7. **Implement deep linking** preservation for post-login redirects
8. **Add audit logging** for security monitoring