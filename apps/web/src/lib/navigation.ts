/**
 * Navigation routes configuration for Clerk-based authentication
 */

export interface NavigationRoute {
  path: string;
  displayName: string;
  icon?: string;
  section?: string;
  adminOnly?: boolean;
  requiresAuth?: boolean;
}

export const publicRoutes: NavigationRoute[] = [
  {
    path: '/',
    displayName: 'Home',
    icon: 'home',
    section: 'MAIN',
    requiresAuth: false
  }
];

export const authenticatedRoutes: NavigationRoute[] = [
  {
    path: '/',
    displayName: 'Dashboard',
    icon: 'layout-dashboard',
    section: 'MAIN',
    requiresAuth: true
  },
  {
    path: '/interactive-charts',
    displayName: 'Economic Data',
    icon: 'bar-chart',
    section: 'ANALYSIS',
    requiresAuth: true
  },
  {
    path: '/backtest-simple',
    displayName: 'Backtesting Signals',
    icon: 'trending-up',
    section: 'ANALYSIS',
    requiresAuth: true
  }
];

export const adminRoutes: NavigationRoute[] = [
  {
    path: '/admin',
    displayName: 'Admin Panel',
    icon: 'shield',
    section: 'PROFILE',
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