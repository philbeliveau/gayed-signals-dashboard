import React, { ReactElement } from 'react'
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext'

// Mock Auth Context that we'll create
export interface MockAuthState {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface MockAuthContextType extends MockAuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (data: Partial<MockAuthState['user']>) => Promise<void>
}

// Mock AuthContext for testing
export const MockAuthContext = React.createContext<MockAuthContextType | null>(null)

export const MockAuthProvider: React.FC<{
  children: React.ReactNode
  initialState?: Partial<MockAuthState>
  mockFunctions?: Partial<Pick<MockAuthContextType, 'login' | 'register' | 'logout' | 'refreshToken' | 'updateProfile'>>
}> = ({ 
  children, 
  initialState = {}, 
  mockFunctions = {} 
}) => {
  const defaultState: MockAuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    ...initialState
  }

  const defaultMockFunctions = {
    login: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockResolvedValue(undefined),
    ...mockFunctions
  }

  const contextValue: MockAuthContextType = {
    ...defaultState,
    ...defaultMockFunctions
  }

  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  )
}

// Test wrapper with all providers
interface AllTheProvidersProps {
  children: React.ReactNode
  authState?: Partial<MockAuthState>
  authMockFunctions?: Partial<Pick<MockAuthContextType, 'login' | 'register' | 'logout' | 'refreshToken' | 'updateProfile'>>
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  authState = {}, 
  authMockFunctions = {} 
}) => {
  return (
    <ThemeProvider>
      <UserPreferencesProvider>
        <MockAuthProvider 
          initialState={authState} 
          mockFunctions={authMockFunctions}
        >
          {children}
        </MockAuthProvider>
      </UserPreferencesProvider>
    </ThemeProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options: RenderOptions & {
    authState?: Partial<MockAuthState>
    authMockFunctions?: Partial<Pick<MockAuthContextType, 'login' | 'register' | 'logout' | 'refreshToken' | 'updateProfile'>>
  } = {}
) => {
  const { authState, authMockFunctions, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        authState={authState} 
        authMockFunctions={authMockFunctions}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Test data factories
export const createMockUser = (overrides: Partial<MockAuthState['user']> = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  ...overrides
})

export const createAuthenticatedState = (userOverrides: Partial<MockAuthState['user']> = {}): MockAuthState => ({
  user: createMockUser(userOverrides),
  isAuthenticated: true,
  isLoading: false,
  error: null
})

export const createUnauthenticatedState = (): MockAuthState => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
})

export const createLoadingState = (isAuthenticated = false): MockAuthState => ({
  user: isAuthenticated ? createMockUser() : null,
  isAuthenticated,
  isLoading: true,
  error: null
})

export const createErrorState = (error: string): MockAuthState => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error
})

// Test utilities
export const waitForAuthState = async (condition: () => boolean, timeout = 5000) => {
  return waitFor(() => {
    if (!condition()) {
      throw new Error('Auth state condition not met')
    }
  }, { timeout })
}

export const fillForm = async (fields: Record<string, string>) => {
  const user = userEvent.setup()
  
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'))
    await user.clear(input)
    await user.type(input, value)
  }
}

export const submitForm = async (buttonText = /submit|login|register/i) => {
  const user = userEvent.setup()
  const submitButton = screen.getByRole('button', { name: buttonText })
  await user.click(submitButton)
}

// Custom assertions
export const useExpectAuthState = (expectedState: Partial<MockAuthState>) => {
  const context = React.useContext(MockAuthContext)
  if (!context) {
    throw new Error('MockAuthContext not found')
  }

  Object.entries(expectedState).forEach(([key, value]) => {
    expect(context[key as keyof MockAuthState]).toEqual(value)
  })
}

// Mock localStorage
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
    store
  }
})()

// Mock sessionStorage
export const mockSessionStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null,
    store
  }
})()

// Setup for tests
export const setupAuthTest = () => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  })

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  })

  // Mock fetch
  global.fetch = jest.fn()

  // Reset mocks before each test
  beforeEach(() => {
    mockLocalStorage.clear()
    mockSessionStorage.clear()
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render, userEvent }