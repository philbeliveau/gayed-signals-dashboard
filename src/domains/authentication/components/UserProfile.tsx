'use client';

import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Edit, 
  Save, 
  X, 
  Eye, 
  EyeOff, 
  Lock, 
  Shield, 
  Trash2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { FormField } from './FormField';
import LoadingSpinner from './LoadingSpinner';
import { ErrorAlert } from './ErrorAlert';
import { User } from '@/types/auth';

export interface UserProfileProps {
  user: User;
  onUpdate?: (user: User) => void;
  onError?: (error: string) => void;
  showAvatar?: boolean;
  showPasswordChange?: boolean;
  className?: string;
}

interface UserProfileState {
  isEditing: boolean;
  isSubmitting: boolean;
  showPasswordModal: boolean;
  showDeleteModal: boolean;
  formData: {
    email: string;
    username: string;
    fullName: string;
  };
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  errors: Record<string, string | undefined>;
}

// Mock API service - replace with actual implementation
const mockApiService = {
  updateProfile: async (userId: string, data: any): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { ...data };
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate validation
    if (currentPassword !== 'currentpass') {
      throw new Error('Current password is incorrect');
    }
  },

  deleteAccount: async (userId: string, password: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate validation
    if (password !== 'currentpass') {
      throw new Error('Password is incorrect');
    }
  }
};

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdate,
  onError,
  showAvatar = true,
  showPasswordChange = true,
  className = ''
}) => {
  const [state, setState] = useState<UserProfileState>({
    isEditing: false,
    isSubmitting: false,
    showPasswordModal: false,
    showDeleteModal: false,
    formData: {
      email: user.email,
      username: user.username,
      fullName: user.full_name || ''
    },
    passwordData: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    errors: {}
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateUsername = (username: string): string | undefined => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return undefined;
  };

  const validateFullName = (fullName: string): string | undefined => {
    if (!fullName) return 'Full name is required';
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const handleEditToggle = () => {
    setState(prev => ({
      ...prev,
      isEditing: !prev.isEditing,
      formData: {
        email: user.email,
        username: user.username,
        fullName: user.full_name || ''
      },
      errors: {}
    }));
  };

  const handleFormInputChange = (field: keyof UserProfileState['formData']) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          [field]: e.target.value
        },
        errors: {
          ...prev.errors,
          [field]: undefined
        }
      }));
    };

  const handlePasswordInputChange = (field: keyof UserProfileState['passwordData']) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState(prev => ({
        ...prev,
        passwordData: {
          ...prev.passwordData,
          [field]: e.target.value
        },
        errors: {
          ...prev.errors,
          [field]: undefined
        }
      }));
    };

  const handleSaveProfile = async () => {
    const emailError = validateEmail(state.formData.email);
    const usernameError = validateUsername(state.formData.username);
    const fullNameError = validateFullName(state.formData.fullName);

    if (emailError || usernameError || fullNameError) {
      setState(prev => ({
        ...prev,
        errors: {
          email: emailError,
          username: usernameError,
          fullName: fullNameError
        }
      }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const updatedUser = await mockApiService.updateProfile(user.id, {
        ...user,
        ...state.formData
      });

      setState(prev => ({ ...prev, isEditing: false }));
      
      if (onUpdate) {
        onUpdate(updatedUser);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setState(prev => ({
        ...prev,
        errors: { general: errorMessage }
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleChangePassword = async () => {
    const currentPasswordError = validatePassword(state.passwordData.currentPassword);
    const newPasswordError = validatePassword(state.passwordData.newPassword);
    const confirmPasswordError = state.passwordData.newPassword !== state.passwordData.confirmPassword 
      ? 'Passwords do not match' : undefined;

    if (currentPasswordError || newPasswordError || confirmPasswordError) {
      setState(prev => ({
        ...prev,
        errors: {
          currentPassword: currentPasswordError,
          newPassword: newPasswordError,
          confirmPassword: confirmPasswordError
        }
      }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      await mockApiService.changePassword(
        user.id,
        state.passwordData.currentPassword,
        state.passwordData.newPassword
      );

      setState(prev => ({
        ...prev,
        showPasswordModal: false,
        passwordData: {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }
      }));

      // Show success message
      alert('Password changed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setState(prev => ({
        ...prev,
        errors: { general: errorMessage }
      }));
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setState(prev => ({
        ...prev,
        errors: { delete: 'Please type DELETE to confirm' }
      }));
      return;
    }

    if (!deleteConfirmPassword) {
      setState(prev => ({
        ...prev,
        errors: { delete: 'Please enter your password' }
      }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      await mockApiService.deleteAccount(user.id, deleteConfirmPassword);
      
      // Redirect to login or handle account deletion
      window.location.href = '/login';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      setState(prev => ({
        ...prev,
        errors: { delete: errorMessage }
      }));
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-theme-card border border-theme-border rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {showAvatar && (
            <div className="w-16 h-16 bg-theme-primary rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-theme-text">Profile Settings</h2>
            <p className="text-theme-text-muted">Manage your account information</p>
          </div>
        </div>
        
        <button
          onClick={handleEditToggle}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors duration-200"
          disabled={state.isSubmitting}
        >
          {state.isEditing ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="w-4 h-4" />
              Edit
            </>
          )}
        </button>
      </div>

      {state.errors.general && (
        <ErrorAlert
          message={state.errors.general}
          type="error"
          onDismiss={() => setState(prev => ({ ...prev, errors: { ...prev.errors, general: undefined } }))}
          className="mb-6"
        />
      )}

      {/* Profile Information */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Full Name"
            error={state.errors.fullName}
            required
          >
            <input
              type="text"
              value={state.isEditing ? state.formData.fullName : (user.full_name || '')}
              onChange={handleFormInputChange('fullName')}
              disabled={!state.isEditing || state.isSubmitting}
              className={`${!state.isEditing ? 'bg-theme-bg-secondary cursor-not-allowed' : ''}`}
            />
          </FormField>

          <FormField
            label="Username"
            error={state.errors.username}
            required
          >
            <input
              type="text"
              value={state.isEditing ? state.formData.username : user.username}
              onChange={handleFormInputChange('username')}
              disabled={!state.isEditing || state.isSubmitting}
              className={`${!state.isEditing ? 'bg-theme-bg-secondary cursor-not-allowed' : ''}`}
            />
          </FormField>
        </div>

        <FormField
          label="Email Address"
          error={state.errors.email}
          required
        >
          <input
            type="email"
            value={state.isEditing ? state.formData.email : user.email}
            onChange={handleFormInputChange('email')}
            disabled={!state.isEditing || state.isSubmitting}
            className={`${!state.isEditing ? 'bg-theme-bg-secondary cursor-not-allowed' : ''}`}
          />
        </FormField>

        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Role">
            <input
              type="text"
              value={user.is_superuser ? 'Administrator' : 'User'}
              disabled
              className="bg-theme-bg-secondary cursor-not-allowed"
            />
          </FormField>

          <FormField label="Member Since">
            <input
              type="text"
              value={formatDate(user.created_at)}
              disabled
              className="bg-theme-bg-secondary cursor-not-allowed"
            />
          </FormField>
        </div>

        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            Permissions
          </label>
          <div className="flex flex-wrap gap-2">
            {(user.is_superuser ? ['read', 'write', 'admin', 'delete'] : ['read']).map((permission) => (
              <span
                key={permission}
                className="px-3 py-1 bg-theme-primary-bg text-theme-primary text-sm rounded-full border border-theme-primary-border"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {state.isEditing && (
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={state.isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-theme-success hover:bg-theme-success text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {state.isSubmitting ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            
            <button
              onClick={handleEditToggle}
              disabled={state.isSubmitting}
              className="px-4 py-2 bg-theme-bg-secondary hover:bg-theme-card-hover text-theme-text rounded-lg border border-theme-border transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Security Actions */}
        {!state.isEditing && (
          <div className="pt-6 border-t border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Settings
            </h3>
            
            <div className="space-y-3">
              {showPasswordChange && (
                <button
                  onClick={() => setState(prev => ({ ...prev, showPasswordModal: true }))}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white rounded-lg transition-colors duration-200"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              )}
              
              <button
                onClick={() => setState(prev => ({ ...prev, showDeleteModal: true }))}
                className="flex items-center gap-2 px-4 py-2 bg-theme-danger hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {state.showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-card border border-theme-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-theme-text mb-4">Change Password</h3>
            
            <div className="space-y-4">
              <FormField
                label="Current Password"
                error={state.errors.currentPassword}
                required
              >
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={state.passwordData.currentPassword}
                  onChange={handlePasswordInputChange('currentPassword')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </FormField>

              <FormField
                label="New Password"
                error={state.errors.newPassword}
                required
              >
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={state.passwordData.newPassword}
                  onChange={handlePasswordInputChange('newPassword')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </FormField>

              <FormField
                label="Confirm New Password"
                error={state.errors.confirmPassword}
                required
              >
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={state.passwordData.confirmPassword}
                  onChange={handlePasswordInputChange('confirmPassword')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </FormField>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                disabled={state.isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {state.isSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
              
              <button
                onClick={() => setState(prev => ({ ...prev, showPasswordModal: false, passwordData: { currentPassword: '', newPassword: '', confirmPassword: '' }, errors: {} }))}
                disabled={state.isSubmitting}
                className="px-4 py-2 bg-theme-bg-secondary hover:bg-theme-card-hover text-theme-text rounded-lg border border-theme-border transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {state.showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-theme-card border border-theme-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-theme-text">Delete Account</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-theme-text-muted">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              
              <FormField
                label="Type DELETE to confirm"
                required
              >
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </FormField>

              <FormField
                label="Enter your password"
                required
              >
                <input
                  type="password"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </FormField>

              {state.errors.delete && (
                <ErrorAlert
                  message={state.errors.delete}
                  type="error"
                />
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleDeleteAccount}
                disabled={state.isSubmitting || deleteConfirmText !== 'DELETE'}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {state.isSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, showDeleteModal: false, errors: {} }));
                  setDeleteConfirmText('');
                  setDeleteConfirmPassword('');
                }}
                disabled={state.isSubmitting}
                className="px-4 py-2 bg-theme-bg-secondary hover:bg-theme-card-hover text-theme-text rounded-lg border border-theme-border transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};