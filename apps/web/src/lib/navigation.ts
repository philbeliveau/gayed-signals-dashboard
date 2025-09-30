/**
 * Navigation routes configuration for Clerk-based authentication
 */

export interface NavigationRoute {
  path: string;
  displayName: string;
  icon?: string;
  adminOnly?: boolean;
  requiresAuth?: boolean;
}

export const publicRoutes: NavigationRoute[] = [
  {
    path: '/',
    displayName: 'Home',
    icon: 'home',
    requiresAuth: false
  },
  {
    path: '/demo/live-conversation',
    displayName: 'AI Agent Debates',
    icon: 'message-square-more',
    requiresAuth: false
  }
];

export const authenticatedRoutes: NavigationRoute[] = [
  {
    path: '/',
    displayName: 'Dashboard',
    icon: 'layout-dashboard',
    requiresAuth: true
  },
  {
    path: '/interactive-charts',
    displayName: 'Interactive Charts',
    icon: 'line-chart',
    requiresAuth: true
  },
  {
    path: '/backtrader',
    displayName: 'Backtesting',
    icon: 'trending-up',
    requiresAuth: true
  },
  {
    path: '/simple-youtube',
    displayName: 'Video Analysis',
    icon: 'youtube',
    requiresAuth: true
  },
  {
    path: '/demo/live-conversation',
    displayName: 'AI Agent Debates',
    icon: 'message-square-more',
    requiresAuth: true
  }
];

export const adminRoutes: NavigationRoute[] = [
  {
    path: '/admin',
    displayName: 'Admin Panel',
    icon: 'shield',
    adminOnly: true,
    requiresAuth: true
  }
];

export function getNavigationRoutes(isAuthenticated: boolean, isAdmin: boolean = false): NavigationRoute[] {
  let routes: NavigationRoute[] = [];
  
  if (isAuthenticated) {
    routes = [...authenticatedRoutes];
    
    if (isAdmin) {
      routes = [...routes, ...adminRoutes];
    }
  } else {
    routes = [...publicRoutes];
  }
  
  return routes;
}