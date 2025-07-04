# Authentication UI Components

A comprehensive set of authentication components for the Gayed Signals Dashboard, built with React, TypeScript, and Tailwind CSS.

## Components Overview

### Core Components

1. **LoginForm** - User authentication form with email/password validation
2. **RegisterForm** - User registration with real-time validation and password strength
3. **UserProfile** - User profile management with edit capabilities
4. **RouteGuard** - Route protection with permission-based access control
5. **AuthModal** - Modal container for authentication forms

### Shared Components

1. **FormField** - Consistent form field styling with error handling
2. **LoadingSpinner** - Animated loading indicators
3. **ErrorAlert** - Error message display with dismissible functionality

## Installation & Usage

### Basic Import

```typescript
import { 
  LoginForm, 
  RegisterForm, 
  UserProfile, 
  RouteGuard, 
  AuthModal 
} from '@/components/auth';
```

### Component-Specific Imports

```typescript
// Individual component imports
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { UserProfile } from '@/components/auth/UserProfile';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AuthModal } from '@/components/auth/AuthModal';

// Shared components
import { FormField, LoadingSpinner, ErrorAlert } from '@/components/auth';
```

## Component Documentation

### LoginForm

Professional login form with email/password validation, social auth placeholders, and "remember me" functionality.

```typescript
import { LoginForm } from '@/components/auth';

function LoginPage() {
  const handleLoginSuccess = (user) => {
    console.log('User logged in:', user);
    // Handle successful login
  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
    // Handle login error
  };

  return (
    <LoginForm
      onSuccess={handleLoginSuccess}
      onError={handleLoginError}
      redirectTo="/dashboard"
      showRegisterLink={true}
      showForgotPassword={true}
    />
  );
}
```

**Props:**
- `onSuccess?: (user: User) => void` - Called when login succeeds
- `onError?: (error: string) => void` - Called when login fails
- `redirectTo?: string` - URL to redirect after successful login
- `showRegisterLink?: boolean` - Show "Sign up" link (default: true)
- `showForgotPassword?: boolean` - Show "Forgot password" link (default: true)
- `className?: string` - Additional CSS classes

**Features:**
- Email format validation
- Password strength requirements
- Loading states with disabled form
- Social login placeholders (Google, GitHub)
- Remember me checkbox
- Responsive design
- Accessibility compliant

### RegisterForm

Comprehensive registration form with real-time validation, username availability checking, and password strength indicator.

```typescript
import { RegisterForm } from '@/components/auth';

function RegisterPage() {
  const handleRegisterSuccess = (user) => {
    console.log('User registered:', user);
    // Handle successful registration
  };

  return (
    <RegisterForm
      onSuccess={handleRegisterSuccess}
      redirectTo="/welcome"
      requireTerms={true}
      showLoginLink={true}
    />
  );
}
```

**Props:**
- `onSuccess?: (user: User) => void` - Called when registration succeeds
- `onError?: (error: string) => void` - Called when registration fails
- `redirectTo?: string` - URL to redirect after successful registration
- `showLoginLink?: boolean` - Show "Sign in" link (default: true)
- `requireTerms?: boolean` - Require terms acceptance (default: true)
- `className?: string` - Additional CSS classes

**Features:**
- Real-time email validation
- Username availability checking
- Password strength indicator with suggestions
- Confirm password validation
- Terms of service acceptance
- Form field error states
- Debounced API calls for username checking

### UserProfile

User profile management component with edit capabilities, password change, and account deletion.

```typescript
import { UserProfile } from '@/components/auth';

function ProfilePage({ user }) {
  const handleProfileUpdate = (updatedUser) => {
    console.log('Profile updated:', updatedUser);
    // Handle profile update
  };

  return (
    <UserProfile
      user={user}
      onUpdate={handleProfileUpdate}
      showAvatar={true}
      showPasswordChange={true}
    />
  );
}
```

**Props:**
- `user: User` - Current user object (required)
- `onUpdate?: (user: User) => void` - Called when profile is updated
- `onError?: (error: string) => void` - Called when update fails
- `showAvatar?: boolean` - Show avatar section (default: true)
- `showPasswordChange?: boolean` - Show password change option (default: true)
- `className?: string` - Additional CSS classes

**Features:**
- Inline editing with save/cancel
- Password change modal
- Account deletion with confirmation
- Permissions and role display
- Profile validation
- Responsive layout

### RouteGuard

Route protection component with authentication and permission checking.

```typescript
import { RouteGuard } from '@/components/auth';

function ProtectedPage() {
  return (
    <RouteGuard
      requireAuth={true}
      requiredPermissions={['read', 'write']}
      redirectTo="/login"
    >
      <div>Protected content here</div>
    </RouteGuard>
  );
}

// Admin-only route
function AdminPage() {
  return (
    <RouteGuard requireAdmin={true}>
      <div>Admin-only content</div>
    </RouteGuard>
  );
}
```

**Props:**
- `children: React.ReactNode` - Protected content (required)
- `requireAuth?: boolean` - Require authentication (default: true)
- `requireAdmin?: boolean` - Require admin role (default: false)
- `requiredPermissions?: string[]` - Required permissions array
- `requiredRoles?: string[]` - Required roles array
- `redirectTo?: string` - URL to redirect unauthorized users (default: '/login')
- `fallback?: React.ReactNode` - Custom unauthorized component
- `loadingComponent?: React.ReactNode` - Custom loading component

**Features:**
- Authentication checking
- Permission-based access control
- Role-based restrictions
- Loading states during auth checks
- Automatic redirects with return URL
- Customizable fallback components

### AuthModal

Modal container for authentication forms with mode switching and accessibility features.

```typescript
import { AuthModal } from '@/components/auth';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleAuthSuccess = (user) => {
    console.log('Auth success:', user);
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsAuthModalOpen(true)}>
        Sign In
      </button>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
```

**Props:**
- `isOpen: boolean` - Modal visibility state (required)
- `onClose: () => void` - Close modal handler (required)
- `mode: 'login' | 'register' | 'forgot-password'` - Current form mode (required)
- `onModeChange?: (mode) => void` - Mode change handler
- `onSuccess?: (user: User) => void` - Success handler
- `className?: string` - Additional CSS classes

**Features:**
- Keyboard navigation (ESC to close, Tab trapping)
- Focus management
- Backdrop click to close
- Mode switching between login/register
- Smooth animations
- Mobile-responsive design

## Shared Components

### FormField

Consistent form field wrapper with label, error display, and accessibility features.

```typescript
import { FormField } from '@/components/auth';

function MyForm() {
  return (
    <FormField
      label="Email Address"
      error={emailError}
      required={true}
      helpText="We'll never share your email"
    >
      <input
        type="email"
        value={email}
        onChange={handleEmailChange}
        placeholder="Enter your email"
      />
    </FormField>
  );
}
```

### LoadingSpinner

Animated loading spinner with size and color variants.

```typescript
import { LoadingSpinner } from '@/components/auth';

function LoadingButton() {
  return (
    <button disabled={isLoading}>
      {isLoading ? (
        <LoadingSpinner size="small" color="white" />
      ) : (
        'Submit'
      )}
    </button>
  );
}
```

### ErrorAlert

Error message display with dismissible functionality and type variants.

```typescript
import { ErrorAlert } from '@/components/auth';

function MyComponent() {
  return (
    <ErrorAlert
      message="Something went wrong"
      type="error"
      onDismiss={clearError}
      autoDismiss={true}
      autoDismissTime={5000}
    />
  );
}
```

## Theme Integration

All components use the existing Tailwind CSS theme system with CSS variables:

```css
/* Theme variables are automatically applied */
.auth-component {
  background-color: var(--theme-card);
  border-color: var(--theme-border);
  color: var(--theme-text);
}
```

**Theme Classes Used:**
- `theme-bg` - Background colors
- `theme-card` - Card backgrounds
- `theme-border` - Border colors
- `theme-text` - Text colors
- `theme-primary` - Primary action colors
- `theme-danger` - Error/danger colors
- `theme-success` - Success colors
- `theme-warning` - Warning colors

## Accessibility Features

All components follow WCAG AA accessibility standards:

### Keyboard Navigation
- Tab order is logical and intuitive
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible
- ESC key closes modals and dropdowns

### Screen Reader Support
- Proper ARIA labels and roles
- Form validation errors are announced
- Loading states are announced
- Required fields are clearly marked

### Color Contrast
- Minimum 4.5:1 contrast ratio for text
- Error states use sufficient contrast
- Focus indicators are clearly visible
- Color is not the only way to convey information

### Form Accessibility
- Labels are properly associated with inputs
- Error messages are linked to form fields
- Required fields are indicated with both visual and text cues
- Form validation provides clear feedback

## Testing

### Unit Testing Example

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth';

describe('LoginForm', () => {
  it('should validate email format', async () => {
    const mockOnError = jest.fn();
    render(<LoginForm onError={mockOnError} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockOnSuccess = jest.fn();
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

## Integration with Authentication Service

To integrate with your authentication service, replace the mock API calls in each component:

```typescript
// Replace mock services with real implementations
const authService = {
  login: async (credentials) => {
    // Your authentication API call
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  register: async (userData) => {
    // Your registration API call
  },

  getCurrentUser: async () => {
    // Your user fetching API call
  },

  updateProfile: async (userId, data) => {
    // Your profile update API call
  }
};
```

## Performance Considerations

### Code Splitting

```typescript
// Lazy load auth components for better performance
const AuthModal = lazy(() => import('@/components/auth/AuthModal'));
const UserProfile = lazy(() => import('@/components/auth/UserProfile'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AuthModal isOpen={isOpen} onClose={onClose} mode="login" />
</Suspense>
```

### Memoization

```typescript
// Memo expensive components
const MemoizedUserProfile = React.memo(UserProfile);

// Memo callback functions
const handleLoginSuccess = useCallback((user) => {
  // Handle success
}, []);
```

## Security Best Practices

1. **Input Validation**: All inputs are validated on both client and server side
2. **XSS Prevention**: Components properly escape user input
3. **CSRF Protection**: Include CSRF tokens in form submissions
4. **Rate Limiting**: Implement rate limiting on sensitive operations
5. **Secure Storage**: Use secure methods for storing authentication tokens

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

When adding new authentication components:

1. Follow existing patterns and naming conventions
2. Include proper TypeScript types
3. Add comprehensive tests
4. Ensure accessibility compliance
5. Update this documentation

## License

MIT License - see LICENSE file for details.