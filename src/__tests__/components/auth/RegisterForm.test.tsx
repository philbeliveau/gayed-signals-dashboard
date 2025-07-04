import React from 'react'
import { render, screen, fireEvent, waitFor } from '../../../__tests__/utils/testUtils'
import { mockAuthService, setupMockImplementations, mockErrorScenarios } from '../../../__tests__/mocks/authMocks'
import userEvent from '@testing-library/user-event'

// Mock the RegisterForm component (to be implemented)
const MockRegisterForm: React.FC<{
  onSuccess?: () => void
  onError?: (error: string) => void
  isLoading?: boolean
}> = ({ onSuccess, onError, isLoading = false }) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    termsAccepted: false
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(isLoading)
  const [passwordStrength, setPasswordStrength] = React.useState<string>('')
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null)

  const calculatePasswordStrength = (password: string): string => {
    if (password.length < 4) return 'weak'
    if (password.length < 8) return 'medium'
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong'
    return 'medium'
  }

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    
    // Mock API call
    const available = username !== 'taken@example.com'
    setUsernameAvailable(available)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.name) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }
    
    if (!formData.termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions'
    }

    if (usernameAvailable === false) {
      newErrors.email = 'This email is already taken'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value as string))
    }
    
    if (field === 'email') {
      checkUsernameAvailability(value as string)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await mockAuthService.register(formData.email, formData.password, formData.name)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setErrors({ general: errorMessage })
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Registration form">
      <div>
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={!!errors.name}
          disabled={loading}
          required
        />
        {errors.name && (
          <div id="name-error" role="alert" aria-live="polite">
            {errors.name}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          disabled={loading}
          required
        />
        {usernameAvailable === false && (
          <div role="alert" aria-live="polite">
            This email is already taken
          </div>
        )}
        {usernameAvailable === true && (
          <div aria-live="polite">
            Email is available
          </div>
        )}
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
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          aria-describedby={[
            errors.password ? 'password-error' : undefined,
            passwordStrength ? 'password-strength' : undefined
          ].filter(Boolean).join(' ')}
          aria-invalid={!!errors.password}
          disabled={loading}
          required
        />
        {passwordStrength && (
          <div id="password-strength" aria-live="polite">
            Password strength: {passwordStrength}
          </div>
        )}
        {errors.password && (
          <div id="password-error" role="alert" aria-live="polite">
            {errors.password}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          aria-invalid={!!errors.confirmPassword}
          disabled={loading}
          required
        />
        {errors.confirmPassword && (
          <div id="confirm-password-error" role="alert" aria-live="polite">
            {errors.confirmPassword}
          </div>
        )}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
            disabled={loading}
            required
          />
          I accept the terms and conditions
        </label>
        {errors.terms && (
          <div role="alert" aria-live="polite">
            {errors.terms}
          </div>
        )}
      </div>

      {errors.general && (
        <div role="alert" aria-live="polite">
          {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || usernameAvailable === false}
        aria-describedby={loading ? 'loading-message' : undefined}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      {loading && (
        <div id="loading-message" aria-live="polite">
          Please wait while we create your account...
        </div>
      )}
    </form>
  )
}

describe('RegisterForm', () => {
  beforeEach(() => {
    setupMockImplementations()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders all form fields correctly', () => {
      render(<MockRegisterForm />)
      
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/terms and conditions/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    test('renders with proper form structure', () => {
      render(<MockRegisterForm />)
      
      const form = screen.getByRole('form', { name: /registration form/i })
      expect(form).toBeInTheDocument()
      
      const nameInput = screen.getByLabelText(/full name/i)
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('required')
      
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('required')
      
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      expect(termsCheckbox).toHaveAttribute('type', 'checkbox')
      expect(termsCheckbox).toHaveAttribute('required')
    })

    test('renders with loading state', () => {
      render(<MockRegisterForm isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: /creating account/i })
      expect(submitButton).toBeDisabled()
      
      const loadingMessage = screen.getByText(/please wait while we create your account/i)
      expect(loadingMessage).toBeInTheDocument()
      expect(loadingMessage).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Form Validation', () => {
    test('validates all input fields', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)
      
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument()
      expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument()
    })

    test('validates email format', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    test('validates password requirements', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(passwordInput, '123')
      await user.click(submitButton)
      
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    test('validates password confirmation', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different123')
      await user.click(submitButton)
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    test('validates name requirements', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'A')
      await user.click(submitButton)
      
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
    })

    test('validates terms acceptance', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)
      
      expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument()
    })
  })

  describe('Password Strength Indicator', () => {
    test('shows password strength indicator', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      
      await user.type(passwordInput, '123')
      expect(screen.getByText(/password strength: weak/i)).toBeInTheDocument()
      
      await user.clear(passwordInput)
      await user.type(passwordInput, 'password')
      expect(screen.getByText(/password strength: medium/i)).toBeInTheDocument()
      
      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password123')
      expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument()
    })

    test('updates password strength in real-time', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      
      await user.type(passwordInput, '1')
      expect(screen.getByText(/password strength: weak/i)).toBeInTheDocument()
      
      await user.type(passwordInput, '2345678')
      expect(screen.getByText(/password strength: medium/i)).toBeInTheDocument()
      
      await user.type(passwordInput, 'A')
      expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument()
    })
  })

  describe('Username Availability', () => {
    test('checks username availability', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      await user.type(emailInput, 'available@example.com')
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
    })

    test('shows unavailable username message', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      
      await user.type(emailInput, 'taken@example.com')
      
      await waitFor(() => {
        expect(screen.getByText(/this email is already taken/i)).toBeInTheDocument()
      })
    })

    test('disables submit button when username is taken', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'taken@example.com')
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      
      render(<MockRegisterForm onSuccess={onSuccess} />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe')
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    test('handles registration failure', async () => {
      const user = userEvent.setup()
      const onError = jest.fn()
      
      mockAuthService.register.mockRejectedValueOnce(new Error('User already exists'))
      
      render(<MockRegisterForm onError={onError} />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument()
        expect(onError).toHaveBeenCalledWith('User already exists')
      })
    })

    test('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      mockAuthService.register.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
      
      await user.click(submitButton)
      
      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(nameInput).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
      expect(termsCheckbox).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    test('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.tab()
      expect(nameInput).toHaveFocus()
      
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()
      
      await user.tab()
      expect(termsCheckbox).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    test('provides proper error announcements', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)
      
      const errorMessages = screen.getAllByRole('alert')
      expect(errorMessages.length).toBeGreaterThan(0)
      
      errorMessages.forEach(error => {
        expect(error).toHaveAttribute('aria-live', 'polite')
      })
    })

    test('provides proper ARIA attributes for form fields', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'A')
      await user.click(submitButton)
      
      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
      
      const errorMessage = screen.getByText(/name must be at least 2 characters/i)
      expect(errorMessage).toHaveAttribute('id', 'name-error')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    test('provides proper ARIA attributes for password strength', async () => {
      const user = userEvent.setup()
      render(<MockRegisterForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      
      await user.type(passwordInput, 'weak')
      
      const strengthIndicator = screen.getByText(/password strength: weak/i)
      expect(strengthIndicator).toHaveAttribute('id', 'password-strength')
      expect(strengthIndicator).toHaveAttribute('aria-live', 'polite')
      expect(passwordInput).toHaveAttribute('aria-describedby', expect.stringContaining('password-strength'))
    })
  })

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      mockAuthService.register.mockRejectedValueOnce(new Error('Network error'))
      
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
        expect(submitButton).not.toBeDisabled()
        expect(nameInput).not.toBeDisabled()
      })
    })

    test('clears errors on successful submission', async () => {
      const user = userEvent.setup()
      
      render(<MockRegisterForm />)
      
      const nameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      // First submission with invalid data
      await user.type(nameInput, 'A')
      await user.click(submitButton)
      
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      
      // Fix the name and submit again
      await user.clear(nameInput)
      await user.type(nameInput, 'John Doe')
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms and conditions/i)
      
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(termsCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/email is available/i)).toBeInTheDocument()
      })
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument()
      })
    })
  })
})