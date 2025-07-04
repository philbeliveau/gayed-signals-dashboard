import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { mockRouter } from '../mocks/authMocks'
import { MockAuthProvider, createAuthenticatedState, createUnauthenticatedState, createLoadingState } from '../utils/testUtils'

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}))

// Mock the useRequireAuth hook (to be implemented)
interface UseRequireAuthOptions {
  redirectTo?: string
  requiredRole?: string
  preserveRoute?: boolean
}

const useRequireAuth = (options: UseRequireAuthOptions = {}) => {
  const { redirectTo = '/login', requiredRole, preserveRoute = true } = options
  const [isChecking, setIsChecking] = React.useState(true)
  const [hasAccess, setHasAccess] = React.useState(false)
  
  // Mock getting auth state from context
  const mockAuth = React.useContext(require('../utils/testUtils').MockAuthContext)
  
  React.useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true)
      
      // Simulate async auth check
      await new Promise(resolve => setTimeout(resolve, 50))
      
      if (!mockAuth || mockAuth.isLoading) {
        setIsChecking(true)
        return
      }
      
      // Not authenticated
      if (!mockAuth.isAuthenticated) {
        if (preserveRoute) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
          mockRouter.push(`${redirectTo}?returnUrl=${encodeURIComponent(currentPath)}`)
        } else {
          mockRouter.push(redirectTo)
        }
        setHasAccess(false)
        setIsChecking(false)
        return
      }
      
      // Check role requirements
      if (requiredRole && mockAuth.user?.role !== requiredRole) {
        setHasAccess(false)
        setIsChecking(false)
        return
      }
      
      // All checks passed
      setHasAccess(true)
      setIsChecking(false)
    }
    
    checkAuth()
  }, [mockAuth, redirectTo, requiredRole, preserveRoute])
  
  return {
    isChecking,
    hasAccess,
    isAuthenticated: mockAuth?.isAuthenticated || false,
    user: mockAuth?.user || null,
    error: mockAuth?.error || null
  }
}

describe('useRequireAuth hook', () => {
  beforeEach(() => {
    mockRouter.push.mockClear()
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    })
  })

  describe('Unauthenticated Users', () => {
    test('redirects unauthenticated users to login', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      expect(result.current.isChecking).toBe(true)
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
    })

    test('redirects to custom redirect path', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ redirectTo: '/custom-login' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).toHaveBeenCalledWith('/custom-login?returnUrl=%2F')
    })

    test('preserves return URL when redirecting', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard/settings' },
        writable: true
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard%2Fsettings')
    })

    test('does not preserve route when preserveRoute is false', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ preserveRoute: false }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    test('returns correct state for unauthenticated users', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Authenticated Users', () => {
    test('allows authenticated users access', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(true)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('does not redirect authenticated users', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('returns correct state for authenticated users', async () => {
      const userState = createAuthenticatedState()
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={userState}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(userState.user)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Role-Based Access Control', () => {
    test('allows users with required role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: 'admin' })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ requiredRole: 'admin' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(true)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('denies users without required role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: 'user' })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ requiredRole: 'admin' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(mockRouter.push).not.toHaveBeenCalled() // No redirect for role mismatch
    })

    test('allows access when no role is required', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: 'user' })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(true)
    })

    test('handles user with null role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: null as any })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ requiredRole: 'admin' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
    })
  })

  describe('Loading States', () => {
    test('handles loading state during auth check', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createLoadingState(false)}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useRequireAuth(), { wrapper })
      
      expect(result.current.isChecking).toBe(true)
      expect(result.current.hasAccess).toBe(false)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('transitions from loading to checking complete', async () => {
      const { rerender } = renderHook(
        ({ authState }) => useRequireAuth(),
        {
          wrapper: ({ children, authState }: any) => (
            <MockAuthProvider initialState={authState}>
              {children}
            </MockAuthProvider>
          ),
          initialProps: { authState: createLoadingState(false) }
        }
      )
      
      // Initial loading state
      expect(mockRouter.push).not.toHaveBeenCalled()
      
      // Update to authenticated state
      rerender({ authState: createAuthenticatedState() })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('waits for auth context loading to complete', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createLoadingState(true)}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useRequireAuth(), { wrapper })
      
      expect(result.current.isChecking).toBe(true)
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('handles missing auth context gracefully', async () => {
      const { result, waitFor } = renderHook(() => useRequireAuth())
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
    })

    test('handles auth context with error state', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={{ ...createUnauthenticatedState(), error: 'Authentication error' }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(result.current.error).toBe('Authentication error')
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
    })

    test('handles undefined user object', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={{ ...createAuthenticatedState(), user: null }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ requiredRole: 'admin' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
    })
  })

  describe('Hook Dependencies', () => {
    test('re-checks auth when auth state changes', async () => {
      const { result, rerender, waitFor } = renderHook(
        ({ authState }) => useRequireAuth(),
        {
          wrapper: ({ children, authState }: any) => (
            <MockAuthProvider initialState={authState}>
              {children}
            </MockAuthProvider>
          ),
          initialProps: { authState: createUnauthenticatedState() }
        }
      )
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
      
      // Clear the mock calls
      mockRouter.push.mockClear()
      
      // Update to authenticated state
      rerender({ authState: createAuthenticatedState() })
      
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(true)
      })
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('re-checks auth when required role changes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: 'user' })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, rerender, waitFor } = renderHook(
        ({ requiredRole }) => useRequireAuth({ requiredRole }),
        { wrapper, initialProps: { requiredRole: 'user' } }
      )
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(true)
      
      // Change required role
      rerender({ requiredRole: 'admin' })
      
      await waitFor(() => {
        expect(result.current.hasAccess).toBe(false)
      })
    })

    test('re-checks auth when redirect path changes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { rerender, waitFor } = renderHook(
        ({ redirectTo }) => useRequireAuth({ redirectTo }),
        { wrapper, initialProps: { redirectTo: '/login' } }
      )
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2F')
      })
      
      mockRouter.push.mockClear()
      
      // Change redirect path
      rerender({ redirectTo: '/auth/login' })
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?returnUrl=%2F')
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid state changes correctly', async () => {
      const { result, rerender, waitFor } = renderHook(
        ({ authState }) => useRequireAuth(),
        {
          wrapper: ({ children, authState }: any) => (
            <MockAuthProvider initialState={authState}>
              {children}
            </MockAuthProvider>
          ),
          initialProps: { authState: createLoadingState(false) }
        }
      )
      
      expect(result.current.isChecking).toBe(true)
      
      // Rapid state changes
      rerender({ authState: createUnauthenticatedState() })
      rerender({ authState: createAuthenticatedState() })
      rerender({ authState: createUnauthenticatedState() })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
    })

    test('handles concurrent auth checks', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result: result1, waitFor: waitFor1 } = renderHook(() => useRequireAuth(), { wrapper })
      const { result: result2, waitFor: waitFor2 } = renderHook(() => useRequireAuth({ requiredRole: 'admin' }), { wrapper })
      
      await Promise.all([
        waitFor1(() => expect(result1.current.isChecking).toBe(false)),
        waitFor2(() => expect(result2.current.isChecking).toBe(false))
      ])
      
      expect(result1.current.hasAccess).toBe(true)
      expect(result2.current.hasAccess).toBe(false) // User role doesn't match admin requirement
    })

    test('handles empty string required role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createAuthenticatedState({ role: 'user' })}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth({ requiredRole: '' }), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(result.current.hasAccess).toBe(false)
    })
  })

  describe('Return URL Handling', () => {
    test('encodes complex return URLs correctly', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard/settings?tab=profile&section=security' },
        writable: true
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard%2Fsettings%3Ftab%3Dprofile%26section%3Dsecurity')
    })

    test('handles special characters in return URL', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/search?q=hello world&filter=active' },
        writable: true
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={createUnauthenticatedState()}>
          {children}
        </MockAuthProvider>
      )
      
      const { result, waitFor } = renderHook(() => useRequireAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })
      
      expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fsearch%3Fq%3Dhello%2520world%26filter%3Dactive')
    })
  })
})