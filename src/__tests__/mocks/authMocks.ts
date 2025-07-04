import { MockAuthState, createMockUser } from '../utils/testUtils'

// Mock token data
export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer'
}

export const mockExpiredTokens = {
  accessToken: 'expired-access-token',
  refreshToken: 'expired-refresh-token',
  expiresIn: -1,
  tokenType: 'Bearer'
}

// Mock user data
export const mockUsers = {
  validUser: createMockUser(),
  adminUser: createMockUser({ role: 'admin', email: 'admin@example.com' }),
  premiumUser: createMockUser({ role: 'premium', email: 'premium@example.com' })
}

// Mock API responses
export const mockAPIResponses = {
  loginSuccess: {
    user: mockUsers.validUser,
    tokens: mockTokens,
    message: 'Login successful'
  },
  loginFailure: {
    error: 'Invalid credentials',
    message: 'Login failed'
  },
  registerSuccess: {
    user: mockUsers.validUser,
    tokens: mockTokens,
    message: 'Registration successful'
  },
  registerFailure: {
    error: 'User already exists',
    message: 'Registration failed'
  },
  refreshSuccess: {
    tokens: mockTokens,
    message: 'Token refreshed'
  },
  refreshFailure: {
    error: 'Invalid refresh token',
    message: 'Token refresh failed'
  },
  profileUpdateSuccess: {
    user: mockUsers.validUser,
    message: 'Profile updated successfully'
  },
  profileUpdateFailure: {
    error: 'Validation error',
    message: 'Profile update failed'
  },
  logoutSuccess: {
    message: 'Logout successful'
  },
  unauthorizedError: {
    error: 'Unauthorized',
    message: 'Please log in to access this resource'
  }
}

// Mock AuthService
export const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  updateProfile: jest.fn(),
  getCurrentUser: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn()
}

// Mock TokenManager
export const mockTokenManager = {
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
  isTokenExpired: jest.fn(),
  getTokenExpirationTime: jest.fn(),
  refreshTokens: jest.fn(),
  setupTokenRefresh: jest.fn(),
  clearTokenRefresh: jest.fn()
}

// Mock APIClient
export const mockAPIClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
}

// Mock validation utilities
export const mockValidation = {
  validateEmail: jest.fn(),
  validatePassword: jest.fn(),
  validateName: jest.fn(),
  validateForm: jest.fn()
}

// Mock route utilities
export const mockRoutes = {
  redirectToLogin: jest.fn(),
  redirectToHome: jest.fn(),
  preserveReturnUrl: jest.fn(),
  getReturnUrl: jest.fn(),
  clearReturnUrl: jest.fn()
}

// Mock security utilities
export const mockSecurity = {
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateCSRFToken: jest.fn(),
  validateCSRFToken: jest.fn(),
  sanitizeInput: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn()
}

// Mock error scenarios
export const mockErrorScenarios = {
  networkError: new Error('Network error'),
  serverError: new Error('Server error'),
  validationError: new Error('Validation error'),
  authenticationError: new Error('Authentication failed'),
  authorizationError: new Error('Insufficient permissions'),
  tokenExpiredError: new Error('Token expired'),
  rateLimitError: new Error('Too many requests')
}

// Test data generators
export const generateMockLoginData = (overrides: any = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  remember: false,
  ...overrides
})

export const generateMockRegisterData = (overrides: any = {}) => ({
  email: 'newuser@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  name: 'New User',
  termsAccepted: true,
  ...overrides
})

export const generateMockProfileData = (overrides: any = {}) => ({
  name: 'Updated Name',
  email: 'updated@example.com',
  bio: 'Updated bio',
  avatar: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  },
  ...overrides
})

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  reload: jest.fn(),
  asPath: '/',
  pathname: '/',
  query: {},
  isReady: true,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}

// Mock form validation states
export const mockFormValidation = {
  valid: {
    email: { isValid: true, error: null },
    password: { isValid: true, error: null },
    name: { isValid: true, error: null }
  },
  invalid: {
    email: { isValid: false, error: 'Invalid email format' },
    password: { isValid: false, error: 'Password must be at least 8 characters' },
    name: { isValid: false, error: 'Name is required' }
  }
}

// Mock loading states
export const mockLoadingStates = {
  login: { isLoading: true, error: null },
  register: { isLoading: true, error: null },
  logout: { isLoading: true, error: null },
  refresh: { isLoading: true, error: null },
  updateProfile: { isLoading: true, error: null }
}

// Mock error states
export const mockErrorStates = {
  login: { isLoading: false, error: 'Invalid credentials' },
  register: { isLoading: false, error: 'User already exists' },
  logout: { isLoading: false, error: 'Logout failed' },
  refresh: { isLoading: false, error: 'Token refresh failed' },
  updateProfile: { isLoading: false, error: 'Profile update failed' }
}

// Setup mock implementations
export const setupMockImplementations = () => {
  // AuthService mock implementations
  mockAuthService.login.mockImplementation(async (email: string, password: string) => {
    if (email === 'test@example.com' && password === 'password123') {
      return mockAPIResponses.loginSuccess
    }
    throw new Error('Invalid credentials')
  })

  mockAuthService.register.mockImplementation(async (email: string, password: string, name: string) => {
    if (email === 'newuser@example.com') {
      return mockAPIResponses.registerSuccess
    }
    throw new Error('User already exists')
  })

  mockAuthService.logout.mockResolvedValue(mockAPIResponses.logoutSuccess)
  mockAuthService.refreshToken.mockResolvedValue(mockAPIResponses.refreshSuccess)
  mockAuthService.updateProfile.mockResolvedValue(mockAPIResponses.profileUpdateSuccess)

  // TokenManager mock implementations
  mockTokenManager.getTokens.mockReturnValue(mockTokens)
  mockTokenManager.setTokens.mockImplementation(() => {})
  mockTokenManager.clearTokens.mockImplementation(() => {})
  mockTokenManager.isTokenExpired.mockReturnValue(false)
  mockTokenManager.getTokenExpirationTime.mockReturnValue(Date.now() + 3600000)

  // APIClient mock implementations
  mockAPIClient.get.mockResolvedValue({ data: { success: true } })
  mockAPIClient.post.mockResolvedValue({ data: { success: true } })
  mockAPIClient.put.mockResolvedValue({ data: { success: true } })
  mockAPIClient.delete.mockResolvedValue({ data: { success: true } })
  mockAPIClient.patch.mockResolvedValue({ data: { success: true } })

  // Validation mock implementations
  mockValidation.validateEmail.mockImplementation((email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  })
  mockValidation.validatePassword.mockImplementation((password: string) => {
    return password.length >= 8
  })
  mockValidation.validateName.mockImplementation((name: string) => {
    return name.length >= 2
  })
}

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockAuthService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  Object.values(mockTokenManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  Object.values(mockAPIClient).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  Object.values(mockValidation).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  Object.values(mockRoutes).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  Object.values(mockSecurity).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
}