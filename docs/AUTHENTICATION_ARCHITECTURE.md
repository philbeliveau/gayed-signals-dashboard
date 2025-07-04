# Authentication System Architecture

## Overview
This document outlines the comprehensive authentication system architecture for the Gayed Signals Dashboard, integrating the existing FastAPI backend with a new Next.js frontend authentication interface.

## Current State Analysis

### Backend Infrastructure (✅ Complete)
- **Database**: PostgreSQL with `users` table
- **Authentication**: JWT-based with bcrypt password hashing
- **Security**: Row Level Security (RLS) for multi-tenant data isolation
- **API Endpoints**: FastAPI with async SQLAlchemy 2.0
- **Test User**: `test@example.com` / `testpassword123`

### Frontend Infrastructure (⚠️ Missing)
- **Authentication UI**: No login/register pages
- **State Management**: No auth context
- **Route Protection**: No authentication guards
- **API Integration**: No frontend auth service

## System Architecture

### 1. Authentication Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Auth Service   │    │  FastAPI Backend│
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Login Form   │ │───▶│ │API Client   │ │───▶│ │JWT Auth     │ │
│ │Register Form│ │    │ │Token Mgmt   │ │    │ │User Model   │ │
│ │Profile UI   │ │    │ │Auth Service │ │    │ │Security     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. Component Architecture

#### Layer 1: UI Components (`/src/components/auth/`)
- **LoginForm.tsx**: Email/password login with validation
- **RegisterForm.tsx**: User registration with terms acceptance
- **UserProfile.tsx**: Profile management and settings
- **RouteGuard.tsx**: Route protection wrapper
- **AuthModal.tsx**: Modal for authentication flows

#### Layer 2: Pages (`/src/app/`)
- **login/page.tsx**: Login page with social auth placeholders
- **register/page.tsx**: Registration page with email verification
- **forgot-password/page.tsx**: Password reset flow
- **profile/page.tsx**: User profile management

#### Layer 3: State Management (`/src/contexts/`)
- **AuthContext.tsx**: Global authentication state
- **AuthProvider.tsx**: Context provider with session management

#### Layer 4: Service Layer (`/src/lib/auth/`)
- **authService.ts**: Authentication business logic
- **apiClient.ts**: HTTP client with auto-auth
- **tokenManager.ts**: JWT token management
- **types.ts**: TypeScript interfaces

#### Layer 5: Hooks (`/src/hooks/`)
- **useAuth.ts**: Authentication hook
- **useRequireAuth.ts**: Protected route hook
- **useUser.ts**: User data hook

### 3. Security Architecture

#### Frontend Security
- **Token Storage**: HttpOnly cookies (preferred) or secure localStorage
- **CSRF Protection**: Anti-CSRF tokens for sensitive operations
- **Input Validation**: Client-side validation with zod
- **XSS Prevention**: Sanitized inputs and outputs
- **Type Safety**: Full TypeScript integration

#### Backend Integration
- **JWT Validation**: Existing backend JWT system
- **RLS Compliance**: Maintain Row Level Security
- **User Context**: Automatic user context setting
- **Error Handling**: Consistent error responses

### 4. API Integration Architecture

#### Authentication Endpoints
```typescript
// Existing FastAPI endpoints to integrate
POST /auth/login          // User authentication
POST /auth/refresh        // Token refresh
GET  /auth/me            // Current user data
POST /users/             // User registration
PUT  /users/me           // Update profile
```

#### Request/Response Flow
```typescript
// Login Flow
LoginForm → AuthService → API Client → FastAPI /auth/login → JWT Token → AuthContext

// Protected Route Access
RouteGuard → AuthContext → Token Validation → API Request → Response
```

## Implementation Strategy

### Phase 1: Core Authentication (Priority: High)
1. **Auth Service Layer**
   - API client with token management
   - Authentication service with login/logout
   - Token refresh handling

2. **Basic UI Components**
   - Login form with validation
   - Basic route protection
   - Authentication context

3. **Backend Integration**
   - Connect to existing JWT endpoints
   - Test with existing test user
   - Verify token flow

### Phase 2: Enhanced Features (Priority: Medium)
1. **Complete UI Set**
   - Registration flow
   - Profile management
   - Password reset

2. **Advanced Security**
   - Remember me functionality
   - Secure token storage
   - Session management

3. **User Experience**
   - Loading states
   - Error handling
   - Responsive design

### Phase 3: Advanced Features (Priority: Low)
1. **Social Authentication**
   - Google OAuth integration
   - GitHub OAuth integration
   - Social provider management

2. **Advanced Security**
   - Multi-factor authentication
   - Session monitoring
   - Advanced security headers

## Technical Specifications

### TypeScript Interfaces
```typescript
// Core Authentication Types
interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  terms_accepted: boolean;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
```

### Authentication Service Interface
```typescript
interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(userData: RegisterData): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResponse>;
  getCurrentUser(): Promise<User>;
  updateUser(updates: Partial<User>): Promise<User>;
  resetPassword(email: string): Promise<void>;
  confirmReset(token: string, password: string): Promise<void>;
}
```

### Route Protection Strategy
```typescript
// Route Protection Patterns
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

// Next.js Middleware for Server-Side Protection
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── register/
│   │   └── page.tsx                 # Registration page
│   ├── forgot-password/
│   │   └── page.tsx                 # Password reset
│   └── profile/
│       └── page.tsx                 # User profile
├── components/
│   └── auth/
│       ├── LoginForm.tsx            # Login form component
│       ├── RegisterForm.tsx         # Registration form
│       ├── UserProfile.tsx          # Profile management
│       ├── RouteGuard.tsx           # Route protection
│       └── AuthModal.tsx            # Authentication modal
├── contexts/
│   └── AuthContext.tsx              # Authentication context
├── hooks/
│   ├── useAuth.ts                   # Authentication hook
│   ├── useRequireAuth.ts            # Protected route hook
│   └── useUser.ts                   # User data hook
├── lib/
│   └── auth/
│       ├── authService.ts           # Authentication service
│       ├── apiClient.ts             # API client
│       ├── tokenManager.ts          # Token management
│       └── types.ts                 # TypeScript types
└── middleware.ts                    # Next.js middleware
```

## Quality Assurance

### Testing Strategy
1. **Unit Tests**: All authentication functions
2. **Integration Tests**: API endpoint integration
3. **E2E Tests**: Complete authentication flows
4. **Security Tests**: Token validation and protection

### Performance Considerations
1. **Token Refresh**: Automatic background refresh
2. **Route Protection**: Efficient auth state checks
3. **Loading States**: Optimistic UI updates
4. **Error Handling**: Graceful degradation

### Accessibility
1. **ARIA Labels**: All form elements
2. **Keyboard Navigation**: Full keyboard support
3. **Screen Readers**: Proper semantic markup
4. **Color Contrast**: WCAG AA compliance

## Success Metrics

### Functional Requirements
- ✅ User login with existing test account
- ✅ Dashboard route protection
- ✅ Token-based authentication
- ✅ User session management
- ✅ Responsive design

### Non-Functional Requirements
- ✅ < 2s authentication response time
- ✅ 99.9% authentication success rate
- ✅ OWASP security compliance
- ✅ Mobile-responsive interface
- ✅ Accessibility compliance

## Next Steps

1. **Setup Authentication Service Layer**
2. **Create Basic UI Components**
3. **Implement Route Protection**
4. **Test with Existing Backend**
5. **Add Enhanced Features**
6. **Comprehensive Testing**
7. **Performance Optimization**
8. **Security Audit**