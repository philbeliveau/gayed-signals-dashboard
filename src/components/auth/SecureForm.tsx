'use client';

/**
 * Secure Form Components
 * 
 * React components with built-in XSS protection and security features:
 * - Automatic input sanitization
 * - Real-time validation
 * - Security event monitoring
 * - CSRF protection integration
 */

import React, { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { XSSProtection, ValidationRule, ValidationResult } from '../../lib/auth/xssProtection';
import { csrfProtection } from '../../lib/auth/csrfProtection';

export interface SecureFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: (data: Record<string, string>, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  validationRules?: Record<string, ValidationRule>;
  enableCSRF?: boolean;
  enableRealTimeValidation?: boolean;
  onValidationChange?: (isValid: boolean, errors: Record<string, string[]>) => void;
  children: React.ReactNode;
}

export interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  name: string;
  validationRule?: ValidationRule;
  onChange?: (value: string, isValid: boolean, errors: string[]) => void;
  showErrors?: boolean;
  errorClassName?: string;
}

export interface SecureTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  name: string;
  validationRule?: ValidationRule;
  onChange?: (value: string, isValid: boolean, errors: string[]) => void;
  showErrors?: boolean;
  errorClassName?: string;
}

/**
 * Secure Form Component
 */
export const SecureForm: React.FC<SecureFormProps> = ({
  children,
  onSubmit,
  validationRules = {},
  enableCSRF = true,
  enableRealTimeValidation = true,
  onValidationChange,
  ...props
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback((data: Record<string, string>) => {
    const result = XSSProtection.sanitizeFormData(data, validationRules);
    setValidationErrors(result.errors);
    
    if (onValidationChange) {
      onValidationChange(result.isValid, result.errors);
    }
    
    return result;
  }, [validationRules, onValidationChange]);

  const handleInputChange = useCallback((name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    if (enableRealTimeValidation) {
      validateForm(newFormData);
    }
  }, [formData, enableRealTimeValidation, validateForm]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Extract form data
      const form = event.currentTarget;
      const formDataObj = new FormData(form);
      const data: Record<string, string> = {};
      
      for (const [key, value] of formDataObj.entries()) {
        if (typeof value === 'string') {
          data[key] = value;
        }
      }
      
      // Validate and sanitize
      const validation = validateForm(data);
      
      if (!validation.isValid) {
        console.warn('Form validation failed:', validation.errors);
        return;
      }
      
      // Add CSRF token if enabled
      if (enableCSRF) {
        try {
          const csrfToken = await csrfProtection.getCSRFToken();
          data._csrf = csrfToken;
        } catch (error) {
          console.error('Failed to get CSRF token:', error);
          return;
        }
      }
      
      // Log security event
      console.log('Secure form submission:', {
        fields: Object.keys(data),
        riskLevel: validation.riskLevel,
        timestamp: new Date().toISOString(),
      });
      
      // Submit with sanitized data
      await onSubmit(validation.sanitizedData, event);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form {...props} onSubmit={handleSubmit} noValidate>
      <SecureFormContext.Provider value={{
        formData,
        validationErrors,
        isSubmitting,
        onInputChange: handleInputChange,
      }}>
        {children}
      </SecureFormContext.Provider>
    </form>
  );
};

/**
 * Secure Input Component
 */
export const SecureInput: React.FC<SecureInputProps> = ({
  name,
  validationRule,
  onChange,
  showErrors = true,
  errorClassName = 'text-red-600 text-sm mt-1',
  ...props
}) => {
  const context = React.useContext(SecureFormContext);
  const [localValue, setLocalValue] = useState('');
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalValue(value);
    
    // Validate if rule is provided
    if (validationRule) {
      const result = XSSProtection.validateInput(value, validationRule);
      setLocalErrors(result.errors);
      
      if (onChange) {
        onChange(result.sanitizedValue, result.isValid, result.errors);
      }
    } else if (onChange) {
      onChange(value, true, []);
    }
    
    // Update form context
    if (context) {
      context.onInputChange(name, value);
    }
  }, [name, validationRule, onChange, context]);

  const secureProps = XSSProtection.createSecureFormProps(props);
  const errors = context?.validationErrors[name] || localErrors;
  const hasErrors = showErrors && errors.length > 0;

  return (
    <div className="w-full">
      <input
        {...secureProps}
        name={name}
        value={localValue}
        onChange={handleChange}
        className={`${props.className || ''} ${hasErrors ? 'border-red-500' : ''}`}
        disabled={context?.isSubmitting || props.disabled}
      />
      {hasErrors && (
        <div className={errorClassName}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Secure TextArea Component
 */
export const SecureTextArea: React.FC<SecureTextAreaProps> = ({
  name,
  validationRule,
  onChange,
  showErrors = true,
  errorClassName = 'text-red-600 text-sm mt-1',
  ...props
}) => {
  const context = React.useContext(SecureFormContext);
  const [localValue, setLocalValue] = useState('');
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setLocalValue(value);
    
    // Validate if rule is provided
    if (validationRule) {
      const result = XSSProtection.validateInput(value, validationRule);
      setLocalErrors(result.errors);
      
      if (onChange) {
        onChange(result.sanitizedValue, result.isValid, result.errors);
      }
    } else if (onChange) {
      onChange(value, true, []);
    }
    
    // Update form context
    if (context) {
      context.onInputChange(name, value);
    }
  }, [name, validationRule, onChange, context]);

  const secureProps = XSSProtection.createSecureFormProps(props);
  const errors = context?.validationErrors[name] || localErrors;
  const hasErrors = showErrors && errors.length > 0;

  return (
    <div className="w-full">
      <textarea
        {...secureProps}
        name={name}
        value={localValue}
        onChange={handleChange}
        className={`${props.className || ''} ${hasErrors ? 'border-red-500' : ''}`}
        disabled={context?.isSubmitting || props.disabled}
      />
      {hasErrors && (
        <div className={errorClassName}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Password Strength Indicator Component
 */
export const PasswordStrengthIndicator: React.FC<{
  password: string;
  className?: string;
}> = ({ password, className = '' }) => {
  const getPasswordStrength = (pwd: string): {
    score: number;
    label: string;
    color: string;
  } => {
    let score = 0;
    
    if (pwd.length >= 8) score += 20;
    if (pwd.length >= 12) score += 10;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 25;
    
    if (score < 30) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score < 60) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score < 80) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">Password Strength</span>
        <span className="text-sm font-medium">{strength.label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        ></div>
      </div>
    </div>
  );
};

/**
 * Security Event Logger Component
 */
export const SecurityEventLogger: React.FC<{
  onSecurityEvent?: (event: SecurityEvent) => void;
}> = ({ onSecurityEvent }) => {
  React.useEffect(() => {
    const handleSecurityEvent = (event: CustomEvent) => {
      const securityEvent: SecurityEvent = {
        type: event.detail.type,
        severity: event.detail.severity,
        message: event.detail.message,
        timestamp: new Date(),
        metadata: event.detail.metadata,
      };
      
      console.log('Security event detected:', securityEvent);
      
      if (onSecurityEvent) {
        onSecurityEvent(securityEvent);
      }
    };

    document.addEventListener('securityEvent', handleSecurityEvent as EventListener);
    
    return () => {
      document.removeEventListener('securityEvent', handleSecurityEvent as EventListener);
    };
  }, [onSecurityEvent]);

  return null;
};

// Context for form state management
interface SecureFormContextType {
  formData: Record<string, string>;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  onInputChange: (name: string, value: string) => void;
}

const SecureFormContext = React.createContext<SecureFormContextType | null>(null);

// Security event interface
interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: any;
}

// Utility function to trigger security events
export const triggerSecurityEvent = (
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  metadata?: any
) => {
  const event = new CustomEvent('securityEvent', {
    detail: { type, severity, message, metadata },
  });
  document.dispatchEvent(event);
};