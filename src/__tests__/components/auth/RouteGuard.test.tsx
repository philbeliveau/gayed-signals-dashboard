import React from 'react'
import { render, screen, waitFor } from '../../../__tests__/utils/testUtils'
import { mockRouter } from '../../../__tests__/mocks/authMocks'
import { createAuthenticatedState, createUnauthenticatedState, createLoadingState } from '../../../__tests__/utils/testUtils'

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}))

// Mock the RouteGuard component (to be implemented)
interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: string
  fallback?: React.ReactNode
  redirectTo?: string
  preserveRoute?: boolean
}

const MockRouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireAuth = true, 
  requiredRole, 
  fallback, 
  redirectTo = '/login',
  preserveRoute = true
}) => {
  const [isChecking, setIsChecking] = React.useState(true)
  
  // Mock getting auth state from context
  const mockAuth = React.useContext(require('../../../__tests__/utils/testUtils').MockAuthContext)
  
  React.useEffect(() => {
    // Simulate async auth check
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Show loading state during auth check
  if (isChecking || (mockAuth && mockAuth.isLoading)) {
    return (
      <div role="status" aria-live="polite">
        <div>Loading...</div>
      </div>
    )
  }
  
  // No auth required, render children
  if (!requireAuth) {
    return <>{children}</>
  }
  
  // Auth required but user not authenticated
  if (!mockAuth || !mockAuth.isAuthenticated) {
    if (preserveRoute) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
      mockRouter.push(`${redirectTo}?returnUrl=${encodeURIComponent(currentPath)}`)
    } else {
      mockRouter.push(redirectTo)
    }
    
    return fallback ? <>{fallback}</> : (
      <div role="alert" aria-live="polite">
        <div>Please log in to access this page.</div>
      </div>
    )
  }
  
  // Check role requirements
  if (requiredRole && mockAuth.user?.role !== requiredRole) {
    return (
      <div role="alert" aria-live="polite">
        <div>You don't have permission to access this page.</div>
      </div>
    )
  }
  
  // All checks passed, render children
  return <>{children}</>
}

describe('RouteGuard', () => {
  beforeEach(() => {
    mockRouter.push.mockClear()
  })

  describe('Unauthenticated Access', () => {
    test('renders children when authentication is not required', () => {
      render(
        <MockRouteGuard requireAuth={false}>
          <div>Public content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      expect(screen.getByText('Public content')).toBeInTheDocument()
    })

    test('redirects to login when user is not authenticated', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
      })
    })

    test('shows fallback content when user is not authenticated', async () => {
      render(
        <MockRouteGuard fallback={<div>Please log in</div>}>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Please log in')).toBeInTheDocument()
        expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
      })
    })

    test('shows default message when user is not authenticated and no fallback provided', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument()
        expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
      })
    })

    test('redirects to custom redirect path', async () => {
      render(
        <MockRouteGuard redirectTo="/custom-login">
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-login?returnUrl=%2F')
      })
    })

    test('does not preserve route when preserveRoute is false', async () => {
      render(
        <MockRouteGuard preserveRoute={false}>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Authenticated Access', () => {
    test('renders children when user is authenticated', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Protected content')).toBeInTheDocument()
      })
    })

    test('renders children when user is authenticated and has required role', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'admin' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Admin content')).toBeInTheDocument()
      })
    })

    test('does not redirect when user is authenticated', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })
  })

  describe('Role-Based Access Control', () => {
    test('allows access when user has required role', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'admin' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Admin content')).toBeInTheDocument()
      })
    })

    test('denies access when user does not have required role', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'user' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument()
        expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
      })
    })

    test('allows access when no role is required', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'user' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Protected content')).toBeInTheDocument()
      })
    })

    test('handles multiple role requirements', async () => {
      const MockMultiRoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
        children, 
        allowedRoles 
      }) => {
        const mockAuth = React.useContext(require('../../../__tests__/utils/testUtils').MockAuthContext)
        
        if (!mockAuth || !mockAuth.isAuthenticated) {
          return (
            <div role="alert" aria-live="polite">
              <div>Please log in to access this page.</div>
            </div>
          )
        }
        
        if (!allowedRoles.includes(mockAuth.user?.role || '')) {
          return (
            <div role="alert" aria-live="polite">
              <div>You don't have permission to access this page.</div>
            </div>
          )
        }
        
        return <>{children}</>
      }

      render(
        <MockMultiRoleGuard allowedRoles={['admin', 'moderator']}>
          <div>Admin or Moderator content</div>
        </MockMultiRoleGuard>,
        { authState: createAuthenticatedState({ role: 'moderator' }) }
      )
      
      expect(screen.getByText('Admin or Moderator content')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    test('shows loading state during authentication check', () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createLoadingState(false) }
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    })

    test('shows loading state with proper ARIA attributes', () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createLoadingState(false) }
      )
      
      const loadingElement = screen.getByRole('status')
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })

    test('transitions from loading to content when authentication completes', async () => {
      const { rerender } = render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createLoadingState(false) }
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      rerender(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Protected content')).toBeInTheDocument()
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('provides proper ARIA attributes for error messages', async () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toHaveAttribute('aria-live', 'polite')
        expect(errorElement).toHaveTextContent('Please log in to access this page.')
      })
    })

    test('provides proper ARIA attributes for permission denied messages', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'user' }) }
      )
      
      await waitFor(() => {
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toHaveAttribute('aria-live', 'polite')
        expect(errorElement).toHaveTextContent('You don\'t have permission to access this page.')
      })
    })

    test('provides proper ARIA attributes for loading states', () => {
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createLoadingState(false) }
      )
      
      const loadingElement = screen.getByRole('status')
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Route Preservation', () => {
    test('preserves current route in redirect URL', async () => {
      // Mock window.location.pathname
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard/settings' },
        writable: true
      })
      
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard%2Fsettings')
      })
    })

    test('preserves current route with query parameters', async () => {
      // Mock window.location.pathname with query params
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard/settings?tab=profile' },
        writable: true
      })
      
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard%2Fsettings%3Ftab%3Dprofile')
      })
    })

    test('does not preserve route when preserveRoute is false', async () => {
      render(
        <MockRouteGuard preserveRoute={false}>
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createUnauthenticatedState() }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles missing auth context gracefully', async () => {
      // Render without auth context
      render(
        <MockRouteGuard>
          <div>Protected content</div>
        </MockRouteGuard>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument()
      })
    })

    test('handles user with null role', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: null as any }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument()
      })
    })

    test('handles empty required role', async () => {
      render(
        <MockRouteGuard requiredRole="">
          <div>Protected content</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'user' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument()
      })
    })

    test('handles undefined user object', async () => {
      render(
        <MockRouteGuard requiredRole="admin">
          <div>Admin content</div>
        </MockRouteGuard>,
        { authState: { ...createAuthenticatedState(), user: null } }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Please log in to access this page.')).toBeInTheDocument()
      })
    })
  })

  describe('Component Composition', () => {
    test('works with nested route guards', async () => {
      render(
        <MockRouteGuard>
          <MockRouteGuard requiredRole="admin">
            <div>Nested protected content</div>
          </MockRouteGuard>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'admin' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Nested protected content')).toBeInTheDocument()
      })
    })

    test('handles nested route guards with different requirements', async () => {
      render(
        <MockRouteGuard>
          <MockRouteGuard requiredRole="admin">
            <div>Admin content</div>
          </MockRouteGuard>
        </MockRouteGuard>,
        { authState: createAuthenticatedState({ role: 'user' }) }
      )
      
      await waitFor(() => {
        expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument()
        expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
      })
    })

    test('renders multiple children correctly', async () => {
      render(
        <MockRouteGuard>
          <div>First child</div>
          <div>Second child</div>
        </MockRouteGuard>,
        { authState: createAuthenticatedState() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('First child')).toBeInTheDocument()
        expect(screen.getByText('Second child')).toBeInTheDocument()
      })
    })
  })
})