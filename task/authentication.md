  🗄️ Current Database Overview

  Good News: Your project already has a complete authentication database setup!

  Database Configuration

  - Database: PostgreSQL (video_insights)
  - ORM: SQLAlchemy 2.0 with async support
  - Connection: postgresql+asyncpg://postgres:password@postgres:5432/video_insights

  Existing User Authentication Table

  The users table already exists with these fields:
  users:
  ├── id (UUID Primary Key)
  ├── email (Unique, Indexed)
  ├── username (Unique, Indexed)
  ├── hashed_password (bcrypt encrypted)
  ├── full_name
  ├── is_active (Boolean)
  ├── is_superuser (Boolean)
  ├── created_at (Timestamp)
  └── updated_at (Timestamp)

  Current Authentication Features

  - ✅ JWT-based authentication backend
  - ✅ bcrypt password hashing
  - ✅ Row Level Security (RLS) for data isolation
  - ✅ Test user exists: test@example.com / testpassword123
  - ✅ User session management

  What's Missing: Frontend login interface and integration with existing backend auth.

  ---
  🤖 AI Swarm Authentication Implementation Prompt

  # AUTHENTICATION SYSTEM IMPLEMENTATION - AI SWARM COORDINATION

  ## 🎯 **PRIMARY OBJECTIVE**
  Implement a complete frontend authentication system for the Gayed Signals Dashboard that connects to the existing PostgreSQL authentication backend.

  ## 📋 **CONTEXT & EXISTING INFRASTRUCTURE**

  ### **Database Status**
  - ✅ PostgreSQL database already configured (`video_insights`)
  - ✅ `users` table exists with: id, email, username, hashed_password, full_name, is_active, is_superuser, timestamps
  - ✅ JWT authentication backend already implemented
  - ✅ Test user available: `test@example.com` / `testpassword123`
  - ✅ Row Level Security (RLS) enabled for multi-tenant data isolation

  ### **Technology Stack**
  - **Frontend**: Next.js 14 with TypeScript
  - **Backend**: FastAPI with SQLAlchemy 2.0 (async)
  - **Database**: PostgreSQL with asyncpg
  - **Styling**: Tailwind CSS
  - **State**: React hooks and context

  ## 🔄 **SWARM TASK DISTRIBUTION**

  ### **Agent 1: Authentication UI Components**
  **Task**: Create complete authentication interface components

  **Deliverables**:
  1. **Login Page** (`/src/app/login/page.tsx`)
     - Email/username and password fields
     - "Remember me" functionality
     - "Forgot password" link
     - Social login placeholders (Google, GitHub)
     - Professional design matching dashboard theme

  2. **Registration Page** (`/src/app/register/page.tsx`)
     - Email, username, full name, password, confirm password
     - Terms of service acceptance
     - Email verification flow
     - Redirect to login after successful registration

  3. **Password Reset Flow** (`/src/app/forgot-password/page.tsx`)
     - Email input for reset request
     - Password reset form with token validation
     - Success/error messaging

  4. **User Profile Component** (`/src/components/auth/UserProfile.tsx`)
     - Display user info (name, email, join date)
     - Edit profile functionality
     - Change password form
     - Account settings

  ### **Agent 2: Authentication Service & API Integration**
  **Task**: Create frontend authentication service layer

  **Deliverables**:
  1. **Auth Service** (`/src/lib/auth/authService.ts`)
     ```typescript
     interface AuthService {
       login(credentials: LoginCredentials): Promise<AuthResponse>
       register(userData: RegisterData): Promise<AuthResponse>
       logout(): Promise<void>
       refreshToken(): Promise<AuthResponse>
       getCurrentUser(): Promise<User>
       resetPassword(email: string): Promise<void>
       confirmReset(token: string, newPassword: string): Promise<void>
     }

  2. API Client (/src/lib/auth/apiClient.ts)
    - HTTP client with automatic token attachment
    - Request/response interceptors
    - Error handling and retry logic
    - Base URL configuration for FastAPI backend
  3. Token Management (/src/lib/auth/tokenManager.ts)
    - JWT token storage (secure cookies/localStorage)
    - Automatic token refresh
    - Token expiration handling
    - Secure storage utilities

  Agent 3: Authentication Context & State Management

  Task: Implement global authentication state management

  Deliverables:
  1. Auth Context (/src/contexts/AuthContext.tsx)
  interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (credentials: LoginCredentials) => Promise<void>
    register: (userData: RegisterData) => Promise<void>
    logout: () => Promise<void>
    updateUser: (userData: Partial<User>) => Promise<void>
  }
  2. Auth Provider - Wrap entire application
    - Global authentication state
    - Automatic session restoration on app load
    - User data persistence
    - Error state management
  3. Auth Hooks (/src/hooks/useAuth.ts)
    - useAuth() - Access auth context
    - useRequireAuth() - Redirect if not authenticated
    - useUser() - Current user data
    - usePermissions() - Role-based access control

  Agent 4: Route Protection & Navigation

  Task: Implement route guards and authentication-aware navigation

  Deliverables:
  1. Route Guards (/src/components/auth/RouteGuard.tsx)
    - Protect authenticated routes
    - Redirect to login if not authenticated
    - Role-based route protection
    - Loading states during auth checks
  2. Auth Middleware (/src/middleware.ts)
    - Next.js middleware for route protection
    - Token validation on server side
    - Automatic redirects
    - Public/private route configuration
  3. Navigation Updates
    - Update main navigation with login/logout
    - User avatar with dropdown menu
    - Conditional rendering based on auth status
    - Breadcrumb authentication awareness

  Agent 5: Integration & Testing

  Task: Connect to existing backend and comprehensive testing

  Deliverables:
  1. Backend Integration
    - Connect to existing FastAPI auth endpoints
    - Test with existing test user (test@example.com)
    - Verify JWT token flow
    - Database connection validation
  2. Route Configuration
    - Update /src/app/layout.tsx with AuthProvider
    - Configure protected routes in middleware
    - Set up redirect logic after login/logout
    - Handle deep linking to protected routes
  3. Testing & Validation
    - Login/logout flow testing
    - Token refresh testing
    - Registration flow validation
    - Password reset flow testing
    - Error handling verification

  🎨 DESIGN REQUIREMENTS

  Visual Design

  - Match existing dashboard design system
  - Use Tailwind CSS utility classes
  - Responsive design for mobile/desktop
  - Dark/light theme support
  - Professional, clean interface

  UX Requirements

  - Fast loading with optimistic updates
  - Clear error messaging
  - Accessibility (ARIA labels, keyboard navigation)
  - Form validation with real-time feedback
  - Smooth transitions and animations

  🔐 SECURITY REQUIREMENTS

  Frontend Security

  - Secure token storage (httpOnly cookies preferred)
  - CSRF protection
  - Input validation and sanitization
  - XSS prevention
  - Secure password requirements

  Backend Integration

  - Use existing JWT authentication
  - Respect existing RLS policies
  - Maintain user data isolation
  - Follow existing security patterns

  🚀 IMPLEMENTATION PRIORITIES

  Phase 1 (High Priority)

  1. Basic login/logout functionality
  2. Route protection for dashboard
  3. Integration with existing test user

  Phase 2 (Medium Priority)

  1. User registration
  2. Profile management
  3. Enhanced UI components

  Phase 3 (Future Enhancement)

  1. Password reset flow
  2. Social authentication
  3. Advanced security features

  📝 SUCCESS CRITERIA

  1. ✅ User can login with test@example.com / testpassword123
  2. ✅ Dashboard routes protected from unauthenticated access
  3. ✅ Smooth user experience with loading states
  4. ✅ Secure token management and automatic refresh
  5. ✅ Integration with existing PostgreSQL user database
  6. ✅ Professional UI matching dashboard design
  7. ✅ Mobile-responsive authentication forms

  🔗 EXISTING ENDPOINTS TO INTEGRATE

  - POST /auth/login - User authentication
  - POST /auth/refresh - Token refresh
  - GET /auth/me - Current user data
  - POST /users/ - User registration
  - PUT /users/me - Update profile

  📁 FILE STRUCTURE DELIVERABLE

  src/
  ├── app/
  │   ├── login/page.tsx
  │   ├── register/page.tsx
  │   └── forgot-password/page.tsx
  ├── components/auth/
  │   ├── LoginForm.tsx
  │   ├── RegisterForm.tsx
  │   ├── UserProfile.tsx
  │   └── RouteGuard.tsx
  ├── contexts/
  │   └── AuthContext.tsx
  ├── hooks/
  │   └── useAuth.ts
  ├── lib/auth/
  │   ├── authService.ts
  │   ├── apiClient.ts
  │   └── tokenManager.ts
  └── middleware.ts

  🎯 COORDINATION NOTES

  - All agents should use TypeScript with strict typing
  - Follow existing code conventions in the project
  - Test integration with existing database immediately
  - Maintain consistency with current UI/UX patterns
  - Coordinate on shared types and interfaces
