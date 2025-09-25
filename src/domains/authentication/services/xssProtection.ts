/**
 * XSS Prevention System
 * 
 * Provides comprehensive XSS protection including:
 * - Input sanitization and validation
 * - HTML content filtering
 * - Safe form data handling
 * - Content Security Policy utilities
 */

export interface XSSConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  maxInputLength: number;
  enableLogging: boolean;
}

export interface ValidationRule {
  type: 'email' | 'username' | 'password' | 'text' | 'url' | 'phone';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * XSS Protection Utilities
 */
export class XSSProtection {
  private static config: XSSConfig = {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'span'],
    allowedAttributes: {
      'span': ['class'],
      'p': ['class'],
      'strong': ['class'],
      'em': ['class'],
      'u': ['class'],
    },
    maxInputLength: 1000,
    enableLogging: true,
  };

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(html: string): string {
    if (!html) return '';
    
    try {
      // Remove script tags and their content
      let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove dangerous attributes
      sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>]*/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:/gi, '');
      
      // Remove form elements
      sanitized = sanitized.replace(/<\/?(?:form|input|textarea|select|button|iframe|object|embed|link|meta|base)[^>]*>/gi, '');
      
      // Filter allowed tags
      const allowedTagsRegex = new RegExp(`<(?!\/?(?:${this.config.allowedTags.join('|')})(?:\s|>))[^>]*>`, 'gi');
      sanitized = sanitized.replace(allowedTagsRegex, '');
      
      // Remove remaining dangerous patterns
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/vbscript:/gi, '');
      sanitized = sanitized.replace(/onload=/gi, '');
      sanitized = sanitized.replace(/onerror=/gi, '');
      
      return sanitized.trim();
    } catch (error) {
      console.error('HTML sanitization failed:', error);
      return this.sanitizeText(html);
    }
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\r?\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Validate and sanitize input based on type
   */
  static validateInput(input: string, rule: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let sanitizedValue = input;

    // Required validation
    if (rule.required && (!input || input.trim().length === 0)) {
      errors.push('This field is required');
      return { isValid: false, errors, sanitizedValue: '', riskLevel: 'low' };
    }

    // Length validation
    if (rule.minLength && input.length < rule.minLength) {
      errors.push(`Minimum length is ${rule.minLength} characters`);
    }

    if (rule.maxLength && input.length > rule.maxLength) {
      errors.push(`Maximum length is ${rule.maxLength} characters`);
      riskLevel = 'medium';
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script|javascript:|on\w+\s*=/i,
      /eval\s*\(|setTimeout\s*\(|setInterval\s*\(/i,
      /document\.|window\.|location\.|XMLHttpRequest/i,
      /\$\(|\$\{|<%|%>|<\?|\?>/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        errors.push('Input contains potentially dangerous content');
        riskLevel = 'high';
        break;
      }
    }

    // Type-specific validation
    switch (rule.type) {
      case 'email':
        if (!this.isValidEmail(input)) {
          errors.push('Invalid email format');
        }
        break;
      
      case 'username':
        if (!this.isValidUsername(input)) {
          errors.push('Username can only contain letters, numbers, and underscores');
        }
        break;
      
      case 'password':
        const passwordValidation = this.validatePassword(input);
        if (!passwordValidation.isValid) {
          errors.push(...passwordValidation.errors);
        }
        break;
      
      case 'url':
        if (!this.isValidURL(input)) {
          errors.push('Invalid URL format');
        }
        break;
      
      case 'phone':
        if (!this.isValidPhone(input)) {
          errors.push('Invalid phone number format');
        }
        break;
    }

    // Custom pattern validation
    if (rule.pattern && !rule.pattern.test(input)) {
      errors.push('Input does not match required format');
    }

    // Sanitize if requested
    if (rule.sanitize !== false) {
      sanitizedValue = this.sanitizeText(input);
    }

    // Log high-risk inputs
    if (riskLevel === 'high' && this.config.enableLogging) {
      console.warn('High-risk input detected:', {
        input: input.substring(0, 100),
        type: rule.type,
        errors,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
      riskLevel,
    };
  }

  /**
   * Create secure form properties
   */
  static createSecureFormProps(props: Record<string, any>): Record<string, any> {
    const secureProps = { ...props };
    
    // Add security attributes
    secureProps.autoComplete = secureProps.autoComplete || 'off';
    secureProps.spellCheck = false;
    secureProps.autoCorrect = 'off';
    secureProps.autoCapitalize = 'off';
    
    // Add input validation patterns
    if (secureProps.type === 'email') {
      secureProps.pattern = secureProps.pattern || '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
    } else if (secureProps.type === 'tel') {
      secureProps.pattern = secureProps.pattern || '^[+]?[0-9\\s\\-\\(\\)]{10,}$';
    }
    
    // Add security event handlers
    const originalOnPaste = secureProps.onPaste;
    secureProps.onPaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData?.getData('text/plain') || '';
      if (this.containsSuspiciousContent(clipboardData)) {
        event.preventDefault();
        console.warn('Suspicious content detected in paste operation');
        return;
      }
      if (originalOnPaste) originalOnPaste(event);
    };
    
    return secureProps;
  }

  /**
   * Check if content contains suspicious patterns
   */
  private static containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script|javascript:|on\w+\s*=/i,
      /eval\s*\(|setTimeout\s*\(|setInterval\s*\(/i,
      /document\.|window\.|location\./i,
      /\$\(|\$\{|<%|%>|<\?|\?>/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Username validation
   */
  private static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Password validation
   */
  private static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
      riskLevel = 'medium';
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon'
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
      riskLevel = 'high';
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: password,
      riskLevel,
    };
  }

  /**
   * URL validation
   */
  private static isValidURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Phone validation
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Encode for safe attribute insertion
   */
  static encodeForAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Encode for safe JavaScript insertion
   */
  static encodeForJavaScript(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\f/g, '\\f')
      .replace(/\b/g, '\\b')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0');
  }

  /**
   * Validate and sanitize form data
   */
  static sanitizeFormData(formData: Record<string, string>, rules: Record<string, ValidationRule>): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedData: Record<string, string>;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, string> = {};
    let overallRiskLevel: 'low' | 'medium' | 'high' = 'low';

    for (const [field, value] of Object.entries(formData)) {
      const rule = rules[field];
      if (!rule) continue;

      const result = this.validateInput(value, rule);
      
      if (!result.isValid) {
        errors[field] = result.errors;
      }
      
      sanitizedData[field] = result.sanitizedValue;
      
      // Update overall risk level
      if (result.riskLevel === 'high') {
        overallRiskLevel = 'high';
      } else if (result.riskLevel === 'medium' && overallRiskLevel === 'low') {
        overallRiskLevel = 'medium';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData,
      riskLevel: overallRiskLevel,
    };
  }
}

/**
 * Content Security Policy utilities
 */
export class CSPUtils {
  /**
   * Generate CSP header value
   */
  static generateCSPHeader(options: {
    enableInlineStyles?: boolean;
    enableInlineScripts?: boolean;
    allowDataUris?: boolean;
    allowedDomains?: string[];
    enableWebSockets?: boolean;
  } = {}): string {
    const directives = [];
    
    // Default src
    directives.push("default-src 'self'");
    
    // Script src
    let scriptSrc = "'self'";
    if (options.enableInlineScripts) {
      scriptSrc += " 'unsafe-inline'";
    }
    if (options.allowedDomains) {
      scriptSrc += " " + options.allowedDomains.join(" ");
    }
    directives.push(`script-src ${scriptSrc}`);
    
    // Style src
    let styleSrc = "'self'";
    if (options.enableInlineStyles) {
      styleSrc += " 'unsafe-inline'";
    }
    directives.push(`style-src ${styleSrc}`);
    
    // Image src
    let imgSrc = "'self'";
    if (options.allowDataUris) {
      imgSrc += " data:";
    }
    imgSrc += " https:";
    directives.push(`img-src ${imgSrc}`);
    
    // Font src
    directives.push("font-src 'self' data:");
    
    // Connect src
    let connectSrc = "'self'";
    if (options.enableWebSockets) {
      connectSrc += " ws: wss:";
    }
    if (options.allowedDomains) {
      connectSrc += " " + options.allowedDomains.join(" ");
    }
    directives.push(`connect-src ${connectSrc}`);
    
    // Frame ancestors
    directives.push("frame-ancestors 'none'");
    
    // Base URI
    directives.push("base-uri 'self'");
    
    // Form action
    directives.push("form-action 'self'");
    
    // Object src
    directives.push("object-src 'none'");
    
    return directives.join("; ");
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  static generateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array));
    }
    
    // Fallback
    return btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  }
}

// Export default instance
export const xssProtection = XSSProtection;