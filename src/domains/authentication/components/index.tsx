/**
 * Authentication Components
 * 
 * This module exports all authentication-related UI components for the Gayed Signals Dashboard.
 * Components are designed to be accessible, responsive, and integrate with the existing theme system.
 */

// Import components for re-export and object collections
import LoginFormComponent from './LoginForm';
import RegisterFormComponent from './RegisterForm';
import { UserProfile as UserProfileComponent } from './UserProfile';
import { RouteGuard as RouteGuardComponent } from './RouteGuard';
import { AuthModal as AuthModalComponent } from './AuthModal';
import FormFieldComponent from './FormField';
import LoadingSpinnerComponent from './LoadingSpinner';
import ErrorAlertComponent from './ErrorAlert';

// Core Authentication Components
export { default as LoginForm } from './LoginForm';
export type { LoginFormProps } from './LoginForm';

export { default as RegisterForm } from './RegisterForm';
export type { RegisterFormProps } from './RegisterForm';

export { UserProfile } from './UserProfile';
export type { UserProfileProps } from './UserProfile';

export { RouteGuard } from './RouteGuard';
export type { RouteGuardProps } from './RouteGuard';

export { AuthModal } from './AuthModal';
export type { AuthModalProps } from './AuthModal';

// Shared UI Components
export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { default as ErrorAlert } from './ErrorAlert';
export type { ErrorAlertProps } from './ErrorAlert';

// Types
export type { User } from '@/types/auth';

// Component collections for easy importing
export const AuthComponents = {
  LoginForm: LoginFormComponent,
  RegisterForm: RegisterFormComponent,
  UserProfile: UserProfileComponent,
  RouteGuard: RouteGuardComponent,
  AuthModal: AuthModalComponent
};

export const SharedComponents = {
  FormField: FormFieldComponent,
  LoadingSpinner: LoadingSpinnerComponent,
  ErrorAlert: ErrorAlertComponent
};

export default {
  ...AuthComponents,
  ...SharedComponents
};