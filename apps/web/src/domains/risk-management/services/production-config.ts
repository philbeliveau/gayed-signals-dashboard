/**
 * Production Configuration for Risk Management System
 * 
 * This file provides production-ready configurations for all risk management
 * components, including environment-specific settings for development,
 * staging, and production environments.
 */

import { RiskConfig } from './risk-manager';
import { SecurityConfig } from './security';
import { FallbackConfig } from './data-fallback';
import { EnhancedYahooFinanceConfig } from './enhanced-yahoo-finance';

export type Environment = 'development' | 'staging' | 'production';

export interface RiskManagementConfig {
  environment: Environment;
  riskManager: RiskConfig;
  security: SecurityConfig;
  dataFallback: FallbackConfig;
  yahooFinance: EnhancedYahooFinanceConfig;
  monitoring: {
    enableDashboard: boolean;
    refreshInterval: number;
    retentionPeriod: number;
    alertChannels: {
      webhookUrl?: string;
      slackChannel?: string;
      emailRecipients?: string[];
    };
  };
}

/**
 * Development Environment Configuration
 * - More lenient rate limits for testing
 * - Shorter timeout periods
 * - More verbose logging
 * - Disabled external alerts
 */
export const DEVELOPMENT_CONFIG: RiskManagementConfig = {
  environment: 'development',
  riskManager: {
    circuitBreaker: {
      failureThreshold: 3, // More forgiving for dev
      recoveryTimeout: 30000, // 30 seconds
      halfOpenRequestLimit: 2
    },
    rateLimit: {
      maxRequestsPerMinute: 120, // Higher limit for dev testing
      burstLimit: 20,
      windowSize: 60000
    },
    retry: {
      maxAttempts: 2, // Fewer retries for faster feedback
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5
    },
    health: {
      checkInterval: 10000, // 10 seconds - more frequent
      memoryThreshold: 256, // Lower threshold for dev machines
      responseTimeThreshold: 10000, // 10 seconds
      errorRateThreshold: 20 // 20% - more tolerant
    },
    alerts: {
      enabled: false // Disable external alerts in dev
    }
  },
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxRequests: 200, // Higher for dev testing
      skipSuccessfulRequests: true
    },
    inputValidation: {
      maxStringLength: 100,
      allowedSymbolPattern: /^[A-Z0-9^.\-_]{1,15}$/,
      blockedPatterns: [
        /(<script|javascript:|on\w+\s*=)/i,
        /(union|select|insert|update|delete|drop|create|alter)/i,
        /(exec|eval|system|cmd)/i
      ],
      sanitizeHtml: true
    },
    requestValidation: {
      maxBodySize: 50 * 1024, // 50KB for dev
      requiredHeaders: ['user-agent'],
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      validateContentType: false // More lenient for dev
    },
    security: {
      enableCSRF: false, // Disabled for easier dev testing
      enableCORS: true,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      secureHeaders: false // Disabled for dev
    }
  },
  dataFallback: {
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes for faster dev cycles
    staleDataTolerance: 30 * 60 * 1000, // 30 minutes
    healthCheckInterval: 30 * 1000, // 30 seconds
    maxConcurrentProviders: 2
  },
  yahooFinance: {
    rateLimit: 50, // Faster for dev
    maxRetries: 2,
    timeout: 15000,
    enableRiskManagement: true,
    enableSecurity: false, // Simplified for dev
    enableGracefulDegradation: true,
    enableDataFallback: true
  },
  monitoring: {
    enableDashboard: true,
    refreshInterval: 10000, // 10 seconds
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    alertChannels: {}
  }
};

/**
 * Staging Environment Configuration
 * - Production-like settings but with some safety margins
 * - Limited external integrations
 * - Enhanced monitoring for testing
 */
export const STAGING_CONFIG: RiskManagementConfig = {
  environment: 'staging',
  riskManager: {
    circuitBreaker: {
      failureThreshold: 4,
      recoveryTimeout: 45000, // 45 seconds
      halfOpenRequestLimit: 3
    },
    rateLimit: {
      maxRequestsPerMinute: 80,
      burstLimit: 15,
      windowSize: 60000
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 20000,
      backoffMultiplier: 2
    },
    health: {
      checkInterval: 20000, // 20 seconds
      memoryThreshold: 400, // MB
      responseTimeThreshold: 7000, // 7 seconds
      errorRateThreshold: 15 // 15%
    },
    alerts: {
      enabled: true,
      webhookUrl: process.env.STAGING_WEBHOOK_URL
    }
  },
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxRequests: 150,
      skipSuccessfulRequests: false
    },
    inputValidation: {
      maxStringLength: 50,
      allowedSymbolPattern: /^[A-Z0-9^.\-_]{1,10}$/,
      blockedPatterns: [
        /(<script|javascript:|on\w+\s*=)/i,
        /(union|select|insert|update|delete|drop|create|alter)/i,
        /(exec|eval|system|cmd)/i,
        /[<>{}[\]]/g
      ],
      sanitizeHtml: true
    },
    requestValidation: {
      maxBodySize: 20 * 1024, // 20KB
      requiredHeaders: ['user-agent'],
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      validateContentType: true
    },
    security: {
      enableCSRF: true,
      enableCORS: true,
      allowedOrigins: [process.env.STAGING_FRONTEND_URL || 'https://staging.example.com'],
      secureHeaders: true
    }
  },
  dataFallback: {
    cacheEnabled: true,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    staleDataTolerance: 45 * 60 * 1000, // 45 minutes
    healthCheckInterval: 45 * 1000, // 45 seconds
    maxConcurrentProviders: 2
  },
  yahooFinance: {
    rateLimit: 75,
    maxRetries: 3,
    timeout: 25000,
    enableRiskManagement: true,
    enableSecurity: true,
    enableGracefulDegradation: true,
    enableDataFallback: true
  },
  monitoring: {
    enableDashboard: true,
    refreshInterval: 15000, // 15 seconds
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    alertChannels: {
      webhookUrl: process.env.STAGING_WEBHOOK_URL,
      slackChannel: process.env.STAGING_SLACK_CHANNEL
    }
  }
};

/**
 * Production Environment Configuration
 * - Strict security and performance settings
 * - Full monitoring and alerting
 * - Comprehensive error handling
 * - Optimized for high availability
 */
export const PRODUCTION_CONFIG: RiskManagementConfig = {
  environment: 'production',
  riskManager: {
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      halfOpenRequestLimit: 3
    },
    rateLimit: {
      maxRequestsPerMinute: 60,
      burstLimit: 10,
      windowSize: 60000
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    },
    health: {
      checkInterval: 30000, // 30 seconds
      memoryThreshold: 512, // MB
      responseTimeThreshold: 5000, // 5 seconds
      errorRateThreshold: 10 // 10%
    },
    alerts: {
      enabled: true,
      webhookUrl: process.env.PRODUCTION_WEBHOOK_URL,
      emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
      slackChannel: process.env.PRODUCTION_SLACK_CHANNEL
    }
  },
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      skipSuccessfulRequests: false
    },
    inputValidation: {
      maxStringLength: 50,
      allowedSymbolPattern: /^[A-Z0-9^.\-_]{1,10}$/,
      blockedPatterns: [
        /(<script|javascript:|on\w+\s*=)/i,
        /(union|select|insert|update|delete|drop|create|alter)/i,
        /(exec|eval|system|cmd)/i,
        /[<>{}[\]]/g,
        /(eval|function|constructor)/i,
        /(\bor\b|\band\b)/i
      ],
      sanitizeHtml: true
    },
    requestValidation: {
      maxBodySize: 10 * 1024, // 10KB
      requiredHeaders: ['user-agent'],
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      validateContentType: true
    },
    security: {
      enableCSRF: true,
      enableCORS: true,
      allowedOrigins: [process.env.PRODUCTION_FRONTEND_URL || 'https://app.example.com'],
      secureHeaders: true
    }
  },
  dataFallback: {
    cacheEnabled: true,
    cacheTTL: 15 * 60 * 1000, // 15 minutes
    staleDataTolerance: 60 * 60 * 1000, // 1 hour
    healthCheckInterval: 60 * 1000, // 1 minute
    maxConcurrentProviders: 2
  },
  yahooFinance: {
    rateLimit: 100,
    maxRetries: 3,
    timeout: 30000,
    enableRiskManagement: true,
    enableSecurity: true,
    enableGracefulDegradation: true,
    enableDataFallback: true
  },
  monitoring: {
    enableDashboard: true,
    refreshInterval: 30000, // 30 seconds
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    alertChannels: {
      webhookUrl: process.env.PRODUCTION_WEBHOOK_URL,
      slackChannel: process.env.PRODUCTION_SLACK_CHANNEL,
      emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',')
    }
  }
};

/**
 * Get configuration for current environment
 */
export function getRiskManagementConfig(): RiskManagementConfig {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'staging':
      return STAGING_CONFIG;
    case 'development':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Initialize risk management system with environment-specific configuration
 */
export function initializeRiskManagement(): {
  config: RiskManagementConfig;
  message: string;
} {
  const config = getRiskManagementConfig();
  
  console.log(`🔧 Initializing risk management system for ${config.environment} environment`);
  console.log(`📊 Circuit breaker threshold: ${config.riskManager.circuitBreaker.failureThreshold} failures`);
  console.log(`🛡️ Rate limit: ${config.riskManager.rateLimit.maxRequestsPerMinute} requests/minute`);
  console.log(`🔒 Security: ${config.security.rateLimiting.enabled ? 'enabled' : 'disabled'}`);
  console.log(`📡 Monitoring: ${config.monitoring.enableDashboard ? 'enabled' : 'disabled'}`);
  
  return {
    config,
    message: `Risk management system initialized for ${config.environment} environment`
  };
}

/**
 * Validate configuration for production readiness
 */
export function validateProductionConfig(config: RiskManagementConfig): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check critical production settings
  if (config.environment === 'production') {
    if (!config.riskManager.alerts.enabled) {
      errors.push('Alerts must be enabled in production');
    }
    
    if (!config.riskManager.alerts.webhookUrl && !config.riskManager.alerts.emailRecipients) {
      warnings.push('No alert channels configured - alerts will not be delivered');
    }
    
    if (config.security.rateLimiting.maxRequests > 200) {
      warnings.push('Rate limit may be too high for production');
    }
    
    if (!config.security.security.enableCSRF) {
      errors.push('CSRF protection must be enabled in production');
    }
    
    if (!config.security.security.secureHeaders) {
      warnings.push('Security headers should be enabled in production');
    }
    
    if (config.dataFallback.cacheTTL < 5 * 60 * 1000) {
      warnings.push('Cache TTL may be too short for production load');
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Environment variables required for each environment
 */
export const REQUIRED_ENV_VARS = {
  development: [],
  staging: [
    'STAGING_WEBHOOK_URL',
    'STAGING_FRONTEND_URL'
  ],
  production: [
    'PRODUCTION_WEBHOOK_URL',
    'PRODUCTION_FRONTEND_URL',
    'PRODUCTION_SLACK_CHANNEL',
    'ALERT_EMAIL_RECIPIENTS'
  ]
} as const;

/**
 * Check if all required environment variables are set
 */
export function validateEnvironmentVariables(env: Environment): {
  isValid: boolean;
  missing: string[];
} {
  const required = REQUIRED_ENV_VARS[env];
  const missing = required.filter(varName => !process.env[varName]);
  
  return {
    isValid: missing.length === 0,
    missing
  };
}