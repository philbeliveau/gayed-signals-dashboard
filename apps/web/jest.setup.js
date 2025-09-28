import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock yahoo-finance2 at the module level to avoid import issues
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    historical: jest.fn(),
  },
}))

// Mock Clerk modules to handle ES6 import issues
jest.mock('@clerk/nextjs', () => ({
  __esModule: true,
  ClerkProvider: ({ children }) => children,
  useAuth: jest.fn(() => ({
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn().mockResolvedValue('test-token'),
  })),
  useUser: jest.fn(() => ({
    isLoaded: true,
    user: {
      id: 'test-user-id',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'Test',
      lastName: 'User',
    },
  })),
  auth: jest.fn(() => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn().mockResolvedValue('test-token'),
  })),
  currentUser: jest.fn(() => ({
    id: 'test-user-id',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    firstName: 'Test',
    lastName: 'User',
  })),
}))

// Mock Socket.io to avoid import issues
jest.mock('socket.io-client', () => ({
  __esModule: true,
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}))

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}
