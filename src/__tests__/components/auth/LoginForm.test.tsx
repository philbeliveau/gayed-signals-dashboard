import React from 'react'
import { render, screen, fireEvent, waitFor } from '../../../__tests__/utils/testUtils'
import { mockAuthService, setupMockImplementations, mockErrorScenarios } from '../../../__tests__/mocks/authMocks'
import userEvent from '@testing-library/user-event'

// Mock the LoginForm component (to be implemented)
const MockLoginForm: React.FC<{
  onSuccess?: () => void
  onError?: (error: string) => void
  isLoading?: boolean
  redirectTo?: string
}> = ({ onSuccess, onError, isLoading = false, redirectTo = '/dashboard' }) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(isLoading)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await mockAuthService.login(email, password)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setErrors({ general: errorMessage })
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          disabled={loading}
          required
        />
        {errors.email && (
          <div id="email-error" role="alert" aria-live="polite">
            {errors.email}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={!!errors.password}
          disabled={loading}
          required
        />
        {errors.password && (
          <div id="password-error" role="alert" aria-live="polite">
            {errors.password}
          </div>
        )}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
          />
          Remember me
        </label>
      </div>

      {errors.general && (
        <div role="alert" aria-live="polite">
          {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        aria-describedby={loading ? 'loading-message' : undefined}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      {loading && (
        <div id="loading-message" aria-live="polite">
          Please wait while we sign you in...
        </div>
      )}
    </form>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    setupMockImplementations()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders all form fields correctly', () => {
      render(<MockLoginForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    test('renders with proper form structure', () => {
      render(<MockLoginForm />)
      
      const form = screen.getByRole('form', { name: /login form/i })
      expect(form).toBeInTheDocument()
      
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    test('renders with loading state', () => {
      render(<MockLoginForm isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: /signing in/i })
      expect(submitButton).toBeDisabled()
      
      const loadingMessage = screen.getByText(/please wait while we sign you in/i)
      expect(loadingMessage).toBeInTheDocument()
      expect(loadingMessage).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Form Validation', () => {
    test('validates email format', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    test('validates password requirements', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(passwordInput, '123')
      await user.click(submitButton)
      
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    test('validates required fields', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })

    test('shows field-specific ARIA attributes for errors', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'invalid')
      await user.click(submitButton)
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
      
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveAttribute('id', 'email-error')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      
      render(<MockLoginForm onSuccess={onSuccess} />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    test('handles login failure', async () => {
      const user = userEvent.setup()
      const onError = jest.fn()
      
      mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'))
      
      render(<MockLoginForm onError={onError} />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        expect(onError).toHaveBeenCalledWith('Invalid credentials')
      })
    })

    test('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
    })

    test('prevents multiple submissions', async () => {
      const user = userEvent.setup()
      
      mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      await user.click(submitButton)
      await user.click(submitButton)
      
      expect(mockAuthService.login).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    test('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(rememberCheckbox).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    test('handles form submission with Enter key', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      
      render(<MockLoginForm onSuccess={onSuccess} />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    test('provides proper error announcements', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      const errorMessages = screen.getAllByRole('alert')
      expect(errorMessages).toHaveLength(2)
      
      errorMessages.forEach(error => {
        expect(error).toHaveAttribute('aria-live', 'polite')
      })
    })

    test('maintains focus management during state changes', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // Focus should remain on the form after validation error
      expect(document.activeElement).toBe(submitButton)
    })
  })

  describe('Error Handling', () => {
    test('displays general error messages', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockRejectedValueOnce(mockErrorScenarios.networkError)
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    test('clears errors on successful submission', async () => {
      const user = userEvent.setup()
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // First submission with invalid data
      await user.type(emailInput, 'invalid')
      await user.click(submitButton)
      
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      
      // Fix the email and submit again
      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
      })
    })

    test('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockRejectedValueOnce(new Error('Network error'))
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
        expect(submitButton).not.toBeDisabled()
        expect(emailInput).not.toBeDisabled()
      })
    })
  })

  describe('Remember Me Functionality', () => {
    test('handles remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<MockLoginForm />)
      
      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      
      expect(rememberCheckbox).not.toBeChecked()
      
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()
      
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()
    })

    test('disables remember me during loading', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<MockLoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(rememberCheckbox).toBeDisabled()
    })
  })
})