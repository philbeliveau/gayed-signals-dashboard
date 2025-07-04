import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { mockAuthService, mockTokenManager, setupMockImplementations, resetAllMocks } from '../mocks/authMocks'
import { MockAuthProvider, MockAuthContextType } from '../utils/testUtils'

// Mock the useAuth hook (to be implemented)
const useAuth = (): MockAuthContextType => {
  const context = React.useContext(require('../utils/testUtils').MockAuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Mock implementation of the auth hook logic
const createMockUseAuth = (initialState: any = {}) => {
  const [state, setState] = React.useState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    ...initialState
  })

  const login = React.useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await mockAuthService.login(email, password)
      await mockTokenManager.setTokens(response.tokens)
      setState(prev => ({ 
        ...prev, 
        user: response.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Login failed'
      }))
      throw error
    }
  }, [])

  const register = React.useCallback(async (email: string, password: string, name: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await mockAuthService.register(email, password, name)
      await mockTokenManager.setTokens(response.tokens)
      setState(prev => ({ 
        ...prev, 
        user: response.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Registration failed'
      }))
      throw error
    }
  }, [])

  const logout = React.useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await mockAuthService.logout()
      await mockTokenManager.clearTokens()
      setState(prev => ({ 
        ...prev, 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Logout failed'
      }))
      throw error
    }
  }, [])

  const refreshToken = React.useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await mockAuthService.refreshToken()
      await mockTokenManager.setTokens(response.tokens)
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: null 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Token refresh failed'
      }))
      throw error
    }
  }, [])

  const updateProfile = React.useCallback(async (data: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await mockAuthService.updateProfile(data)
      setState(prev => ({ 
        ...prev, 
        user: response.user, 
        isLoading: false,
        error: null 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Profile update failed'
      }))
      throw error
    }
  }, [])

  return {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateProfile
  }
}

describe('useAuth hook', () => {
  beforeEach(() => {
    setupMockImplementations()
  })

  afterEach(() => {
    resetAllMocks()
  })

  describe('Initial State', () => {
    test('returns correct initial state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider>{children}</MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.login).toBe('function')
      expect(typeof result.current.register).toBe('function')
      expect(typeof result.current.logout).toBe('function')
      expect(typeof result.current.refreshToken).toBe('function')
      expect(typeof result.current.updateProfile).toBe('function')
    })

    test('returns custom initial state', () => {
      const initialState = {
        user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        isAuthenticated: true,
        isLoading: false,
        error: null
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider initialState={initialState}>{children}</MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.user).toEqual(initialState.user)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    test('throws error when used outside provider', () => {
      const { result } = renderHook(() => useAuth())
      
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('useAuth must be used within an AuthProvider')
    })
  })

  describe('Login Function', () => {
    test('handles successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ login: mockLogin }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    test('handles login failure', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ login: mockLogin }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Invalid credentials')
        }
      })
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrongpassword')
    })

    test('updates loading state during login', async () => {
      let resolveLogin: (value: any) => void
      const mockLogin = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveLogin = resolve
        })
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ isLoading: false }}
          mockFunctions={{ login: mockLogin }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isLoading).toBe(false)
      
      act(() => {
        result.current.login('test@example.com', 'password123')
      })
      
      // Should be loading after login call
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveLogin(undefined)
      })
      
      // Should not be loading after login completes
      expect(result.current.isLoading).toBe(false)
    })

    test('clears error state on successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ error: 'Previous error' }}
          mockFunctions={{ login: mockLogin }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.error).toBe('Previous error')
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      expect(result.current.error).toBe(null)
    })
  })

  describe('Register Function', () => {
    test('handles successful registration', async () => {
      const mockRegister = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ register: mockRegister }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.register('test@example.com', 'password123', 'Test User')
      })
      
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })

    test('handles registration failure', async () => {
      const mockRegister = jest.fn().mockRejectedValue(new Error('User already exists'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ register: mockRegister }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.register('test@example.com', 'password123', 'Test User')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('User already exists')
        }
      })
      
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })

    test('updates loading state during registration', async () => {
      let resolveRegister: (value: any) => void
      const mockRegister = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveRegister = resolve
        })
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ isLoading: false }}
          mockFunctions={{ register: mockRegister }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isLoading).toBe(false)
      
      act(() => {
        result.current.register('test@example.com', 'password123', 'Test User')
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveRegister(undefined)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Logout Function', () => {
    test('handles successful logout', async () => {
      const mockLogout = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ 
            user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
            isAuthenticated: true 
          }}
          mockFunctions={{ logout: mockLogout }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      await act(async () => {
        await result.current.logout()
      })
      
      expect(mockLogout).toHaveBeenCalled()
    })

    test('handles logout failure', async () => {
      const mockLogout = jest.fn().mockRejectedValue(new Error('Logout failed'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ logout: mockLogout }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.logout()
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Logout failed')
        }
      })
      
      expect(mockLogout).toHaveBeenCalled()
    })

    test('updates loading state during logout', async () => {
      let resolveLogout: (value: any) => void
      const mockLogout = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveLogout = resolve
        })
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ isLoading: false }}
          mockFunctions={{ logout: mockLogout }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isLoading).toBe(false)
      
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveLogout(undefined)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Refresh Token Function', () => {
    test('handles successful token refresh', async () => {
      const mockRefreshToken = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ refreshToken: mockRefreshToken }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.refreshToken()
      })
      
      expect(mockRefreshToken).toHaveBeenCalled()
    })

    test('handles token refresh failure', async () => {
      const mockRefreshToken = jest.fn().mockRejectedValue(new Error('Token refresh failed'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ refreshToken: mockRefreshToken }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.refreshToken()
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Token refresh failed')
        }
      })
      
      expect(mockRefreshToken).toHaveBeenCalled()
    })

    test('updates loading state during token refresh', async () => {
      let resolveRefresh: (value: any) => void
      const mockRefreshToken = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveRefresh = resolve
        })
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ isLoading: false }}
          mockFunctions={{ refreshToken: mockRefreshToken }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isLoading).toBe(false)
      
      act(() => {
        result.current.refreshToken()
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveRefresh(undefined)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Update Profile Function', () => {
    test('handles successful profile update', async () => {
      const mockUpdateProfile = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ updateProfile: mockUpdateProfile }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      const updateData = { name: 'Updated Name' }
      
      await act(async () => {
        await result.current.updateProfile(updateData)
      })
      
      expect(mockUpdateProfile).toHaveBeenCalledWith(updateData)
    })

    test('handles profile update failure', async () => {
      const mockUpdateProfile = jest.fn().mockRejectedValue(new Error('Profile update failed'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ updateProfile: mockUpdateProfile }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.updateProfile({ name: 'Updated Name' })
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Profile update failed')
        }
      })
      
      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Updated Name' })
    })

    test('updates loading state during profile update', async () => {
      let resolveUpdate: (value: any) => void
      const mockUpdateProfile = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveUpdate = resolve
        })
      })
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ isLoading: false }}
          mockFunctions={{ updateProfile: mockUpdateProfile }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.isLoading).toBe(false)
      
      act(() => {
        result.current.updateProfile({ name: 'Updated Name' })
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveUpdate(undefined)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('maintains error state after failed operations', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Login failed'))
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider mockFunctions={{ login: mockLogin }}>
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword')
        } catch (error) {
          // Expected to throw
        }
      })
      
      expect(result.current.error).toBe('Login failed')
    })

    test('clears error state on successful operations', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          initialState={{ error: 'Previous error' }}
          mockFunctions={{ login: mockLogin }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.error).toBe('Previous error')
      
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      expect(result.current.error).toBe(null)
    })
  })

  describe('State Management', () => {
    test('maintains state consistency across operations', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      const mockLogout = jest.fn().mockResolvedValue(undefined)
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          mockFunctions={{ login: mockLogin, logout: mockLogout }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Initial state
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      
      // After login
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      // After logout
      await act(async () => {
        await result.current.logout()
      })
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockLogout).toHaveBeenCalled()
    })

    test('handles concurrent operations correctly', async () => {
      const mockLogin = jest.fn().mockResolvedValue(undefined)
      const mockRefreshToken = jest.fn().mockResolvedValue(undefined)
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockAuthProvider 
          mockFunctions={{ login: mockLogin, refreshToken: mockRefreshToken }}
        >
          {children}
        </MockAuthProvider>
      )
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Start concurrent operations
      await act(async () => {
        await Promise.all([
          result.current.login('test@example.com', 'password123'),
          result.current.refreshToken()
        ])
      })
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockRefreshToken).toHaveBeenCalled()
    })
  })
})