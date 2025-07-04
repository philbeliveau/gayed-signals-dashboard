/**
 * Route Configuration for Next.js Application
 * Defines route definitions, permissions, and access control
 */

export interface RouteDefinition {
  path: string;
  requireAuth: boolean;
  adminOnly?: boolean;
  permissions?: string[];
  roles?: string[];
  redirectTo?: string;
  displayName?: string;
  icon?: string;
  showInNavigation?: boolean;
}

export interface RouteConfig {
  // Public routes (no auth required)
  public: string[];
  
  // Protected routes (auth required)
  protected: string[];
  
  // Admin routes (superuser required)
  admin: string[];
  
  // API routes configuration
  api: {
    public: string[];
    protected: string[];
    admin: string[];
  };
}

// Route configuration object
export const routeConfig: RouteConfig = {
  // Public routes (no authentication required)
  public: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/terms',
    '/privacy',
    '/contact'
  ],
  
  // Protected routes (authentication required)
  protected: [
    '/dashboard',
    '/profile',
    '/settings',
    '/strategies',
    '/backtest',
    '/backtrader',
    '/video-insights',
    '/housing',
    '/labor',
    '/interactive-charts',
    '/simple-youtube'
  ],
  
  // Admin routes (superuser required)
  admin: [
    '/admin',
    '/admin/users',
    '/admin/settings',
    '/admin/logs'
  ],
  
  // API routes protection
  api: {
    public: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/signals',
      '/api/chart',
      '/api/backtest',
      '/api/backtrader',
      '/api/housing',
      '/api/labor'
    ],
    protected: [
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/users/profile',
      '/api/video-insights',
      '/api/simple-youtube',
      '/api/folders',
      '/api/prompts',
      '/api/monitoring'
    ],
    admin: [
      '/api/admin/users',
      '/api/admin/settings',
      '/api/admin/logs',
      '/api/admin/system'
    ]
  }
};

// Detailed route definitions with metadata
export const routeDefinitions: RouteDefinition[] = [
  // Public routes
  {
    path: '/',
    requireAuth: false,
    displayName: 'Home',
    icon: 'home',
    showInNavigation: true
  },
  {
    path: '/login',
    requireAuth: false,
    displayName: 'Login',
    icon: 'log-in',
    showInNavigation: false
  },
  {
    path: '/register',
    requireAuth: false,
    displayName: 'Register',
    icon: 'user-plus',
    showInNavigation: false
  },
  
  // Protected routes
  {
    path: '/dashboard',
    requireAuth: true,
    displayName: 'Dashboard',
    icon: 'layout-dashboard',
    showInNavigation: true
  },
  {
    path: '/strategies',
    requireAuth: true,
    displayName: 'Strategies',
    icon: 'trending-up',
    showInNavigation: true
  },
  {
    path: '/backtest',
    requireAuth: true,
    displayName: 'Backtest',
    icon: 'activity',
    showInNavigation: false
  },
  {
    path: '/backtrader',
    requireAuth: true,
    displayName: 'Backtrader Analysis',
    icon: 'line-chart',
    showInNavigation: true
  },
  {
    path: '/video-insights',
    requireAuth: true,
    displayName: 'Video Insights',
    icon: 'video',
    showInNavigation: false
  },
  {
    path: '/housing',
    requireAuth: true,
    displayName: 'Housing Market',
    icon: 'home',
    showInNavigation: false
  },
  {
    path: '/labor',
    requireAuth: true,
    displayName: 'Labor Market',
    icon: 'users',
    showInNavigation: false
  },
  {
    path: '/interactive-charts',
    requireAuth: true,
    displayName: 'Interactive Charts',
    icon: 'bar-chart',
    showInNavigation: true
  },
  {
    path: '/simple-youtube',
    requireAuth: true,
    displayName: 'YouTube Processor',
    icon: 'youtube',
    showInNavigation: true
  },
  {
    path: '/profile',
    requireAuth: true,
    displayName: 'Profile',
    icon: 'user',
    showInNavigation: false
  },
  {
    path: '/settings',
    requireAuth: true,
    displayName: 'Settings',
    icon: 'settings',
    showInNavigation: false
  },
  
  // Admin routes
  {
    path: '/admin',
    requireAuth: true,
    adminOnly: true,
    displayName: 'Admin Panel',
    icon: 'shield',
    showInNavigation: true
  },
  {
    path: '/admin/users',
    requireAuth: true,
    adminOnly: true,
    displayName: 'User Management',
    icon: 'users',
    showInNavigation: false
  },
  {
    path: '/admin/settings',
    requireAuth: true,
    adminOnly: true,
    displayName: 'System Settings',
    icon: 'settings',
    showInNavigation: false
  }
];

// Helper functions for route checking
export const isPublicRoute = (path: string): boolean => {
  return routeConfig.public.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const isProtectedRoute = (path: string): boolean => {
  return routeConfig.protected.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const isAdminRoute = (path: string): boolean => {
  return routeConfig.admin.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const isPublicApiRoute = (path: string): boolean => {
  return routeConfig.api.public.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const isProtectedApiRoute = (path: string): boolean => {
  return routeConfig.api.protected.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const isAdminApiRoute = (path: string): boolean => {
  return routeConfig.api.admin.some(route => {
    if (route === path) return true;
    if (route.includes('*')) {
      const routePattern = route.replace('*', '');
      return path.startsWith(routePattern);
    }
    return false;
  });
};

export const getRouteDefinition = (path: string): RouteDefinition | null => {
  return routeDefinitions.find(route => route.path === path) || null;
};

export const getNavigationRoutes = (isAuthenticated: boolean, isAdmin: boolean): RouteDefinition[] => {
  return routeDefinitions.filter(route => {
    if (!route.showInNavigation) return false;
    
    if (route.requireAuth && !isAuthenticated) return false;
    if (route.adminOnly && !isAdmin) return false;
    
    return true;
  });
};

// Default redirects
export const DEFAULT_REDIRECT_AFTER_LOGIN = '/dashboard';
export const DEFAULT_REDIRECT_AFTER_LOGOUT = '/';
export const LOGIN_ROUTE = '/login';
export const UNAUTHORIZED_ROUTE = '/unauthorized';
export const FORBIDDEN_ROUTE = '/forbidden';
