/**
 * WebSocket Deployment Configuration
 *
 * Handles deployment-specific WebSocket configuration for different environments
 * (development, production, Railway, Vercel) following existing hosting patterns.
 */

import { WebSocketServerConfig } from '@/types/websocket';

interface DeploymentConfig {
  environment: 'development' | 'production' | 'test';
  platform: 'local' | 'railway' | 'vercel' | 'other';
  websocketConfig: WebSocketServerConfig;
  healthCheckPath: string;
  metricsPath: string;
}

/**
 * Get deployment configuration based on environment
 */
export function getDeploymentConfig(): DeploymentConfig {
  const environment = (process.env.NODE_ENV as any) || 'development';
  const platform = detectPlatform();

  // Base configuration
  const baseConfig: WebSocketServerConfig = {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true
    },
    rateLimit: {
      maxEventsPerMinute: parseInt(process.env.WS_RATE_LIMIT_EVENTS || '60'),
      maxConcurrentConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '100'),
      rateLimitWindow: parseInt(process.env.WS_RATE_LIMIT_WINDOW || '60000')
    },
    auth: {
      required: process.env.WS_AUTH_REQUIRED !== 'false',
      clerkEndpoint: process.env.CLERK_SECRET_KEY ? '/api/auth/clerk' : undefined
    },
    channels: {
      conversations: { requireAuth: true, maxSubscribers: 50 },
      signals: { requireAuth: true, maxSubscribers: 100 },
      monitoring: { requireAuth: true, maxSubscribers: 10 },
      system: { requireAuth: false, maxSubscribers: 1000 }
    }
  };

  // Environment-specific overrides
  if (environment === 'development') {
    return {
      environment,
      platform,
      websocketConfig: {
        ...baseConfig,
        port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
        cors: {
          origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
          ],
          credentials: true
        },
        auth: {
          required: false, // Relaxed for development
          clerkEndpoint: baseConfig.auth.clerkEndpoint
        }
      },
      healthCheckPath: '/api/websocket/health',
      metricsPath: '/api/websocket/metrics'
    };
  }

  if (environment === 'production') {
    return {
      environment,
      platform,
      websocketConfig: {
        ...baseConfig,
        cors: {
          origin: getProductionOrigins(),
          credentials: true
        },
        rateLimit: {
          ...baseConfig.rateLimit,
          maxEventsPerMinute: 30, // More restrictive in production
          maxConcurrentConnections: 200
        }
      },
      healthCheckPath: '/api/websocket/health',
      metricsPath: '/api/websocket/metrics'
    };
  }

  // Test environment
  return {
    environment,
    platform,
    websocketConfig: {
      ...baseConfig,
      auth: { required: false },
      cors: { origin: true, credentials: false },
      rateLimit: {
        maxEventsPerMinute: 1000,
        maxConcurrentConnections: 10,
        rateLimitWindow: 10000
      }
    },
    healthCheckPath: '/api/websocket/health',
    metricsPath: '/api/websocket/metrics'
  };
}

/**
 * Detect deployment platform
 */
function detectPlatform(): 'local' | 'railway' | 'vercel' | 'other' {
  if (process.env.RAILWAY_ENVIRONMENT) {
    return 'railway';
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return 'vercel';
  }
  if (process.env.NODE_ENV === 'development') {
    return 'local';
  }
  return 'other';
}

/**
 * Get allowed origins based on environment and deployment
 */
function getAllowedOrigins(): string | string[] | boolean {
  const environment = process.env.NODE_ENV;
  const platform = detectPlatform();

  if (environment === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
  }

  return getProductionOrigins();
}

/**
 * Get production-specific origins
 */
function getProductionOrigins(): string[] {
  const origins = [
    'https://gayed-signals-dashboard.vercel.app'
  ];

  // Add Railway domain if available
  if (process.env.RAILWAY_STATIC_URL) {
    origins.push(process.env.RAILWAY_STATIC_URL);
  }

  // Add Vercel domain if available
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Add custom domain if configured
  if (process.env.CUSTOM_DOMAIN) {
    origins.push(`https://${process.env.CUSTOM_DOMAIN}`);
  }

  return origins;
}

/**
 * Platform-specific WebSocket configuration
 */
export function getPlatformSpecificConfig(): {
  supportsWebSocket: boolean;
  recommendedTransports: string[];
  limitations: string[];
  configuration: Record<string, any>;
} {
  const platform = detectPlatform();

  switch (platform) {
    case 'railway':
      return {
        supportsWebSocket: true,
        recommendedTransports: ['websocket', 'polling'],
        limitations: [
          'WebSocket connections may be limited by Railway plan',
          'Connection timeouts may be enforced'
        ],
        configuration: {
          transports: ['websocket', 'polling'],
          pingTimeout: 60000,
          pingInterval: 25000,
          allowEIO3: true
        }
      };

    case 'vercel':
      return {
        supportsWebSocket: false, // Vercel serverless doesn't support persistent WebSocket
        recommendedTransports: ['polling'],
        limitations: [
          'WebSocket not supported on Vercel serverless',
          'Use polling transport only',
          'Consider external WebSocket service'
        ],
        configuration: {
          transports: ['polling'],
          pingTimeout: 30000,
          pingInterval: 15000,
          allowEIO3: true
        }
      };

    case 'local':
      return {
        supportsWebSocket: true,
        recommendedTransports: ['websocket', 'polling'],
        limitations: ['Development only'],
        configuration: {
          transports: ['websocket', 'polling'],
          pingTimeout: 60000,
          pingInterval: 25000,
          allowEIO3: true
        }
      };

    default:
      return {
        supportsWebSocket: true,
        recommendedTransports: ['websocket', 'polling'],
        limitations: ['Unknown platform - using defaults'],
        configuration: {
          transports: ['websocket', 'polling'],
          pingTimeout: 60000,
          pingInterval: 25000,
          allowEIO3: true
        }
      };
  }
}

/**
 * Get environment-specific WebSocket URL
 */
export function getWebSocketURL(): string {
  const environment = process.env.NODE_ENV;
  const platform = detectPlatform();

  if (environment === 'development') {
    return `http://localhost:${process.env.WEBSOCKET_PORT || '3001'}`;
  }

  if (platform === 'railway' && process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }

  if (platform === 'vercel') {
    // Vercel doesn't support WebSocket, return current origin for polling
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  // Fallback to current origin
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Validate deployment configuration
 */
export function validateDeploymentConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const config = getDeploymentConfig();
  const platformConfig = getPlatformSpecificConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check platform compatibility
  if (!platformConfig.supportsWebSocket && config.websocketConfig.rateLimit.maxConcurrentConnections > 50) {
    warnings.push('Platform may not support high concurrent WebSocket connections');
  }

  // Check required environment variables
  if (config.websocketConfig.auth.required && !process.env.CLERK_SECRET_KEY) {
    errors.push('CLERK_SECRET_KEY required when authentication is enabled');
  }

  // Check CORS configuration
  if (config.environment === 'production' && config.websocketConfig.cors.origin === true) {
    warnings.push('CORS origin should be specific in production');
  }

  // Platform-specific validation
  if (config.platform === 'vercel' && config.websocketConfig.rateLimit.maxConcurrentConnections > 10) {
    warnings.push('Vercel may not support many concurrent connections');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get deployment status and recommendations
 */
export function getDeploymentStatus(): {
  platform: string;
  environment: string;
  websocketSupported: boolean;
  recommendations: string[];
  configuration: DeploymentConfig;
} {
  const config = getDeploymentConfig();
  const platformConfig = getPlatformSpecificConfig();
  const validation = validateDeploymentConfig();

  const recommendations: string[] = [];

  // Platform-specific recommendations
  if (config.platform === 'vercel') {
    recommendations.push(
      'Consider using Railway or similar platform for WebSocket support',
      'Use polling transport only on Vercel',
      'Consider external WebSocket service like Pusher or Ably'
    );
  }

  if (config.platform === 'railway') {
    recommendations.push(
      'WebSocket support available on Railway',
      'Monitor connection limits based on plan',
      'Use persistent connections for better performance'
    );
  }

  // Add validation warnings as recommendations
  recommendations.push(...validation.warnings);

  return {
    platform: config.platform,
    environment: config.environment,
    websocketSupported: platformConfig.supportsWebSocket,
    recommendations,
    configuration: config
  };
}

/**
 * Create platform-optimized Socket.io configuration
 */
export function createOptimizedSocketConfig(): any {
  const config = getDeploymentConfig();
  const platformConfig = getPlatformSpecificConfig();

  return {
    ...platformConfig.configuration,
    cors: config.websocketConfig.cors,
    transports: platformConfig.recommendedTransports,

    // Add platform-specific optimizations
    ...(config.platform === 'railway' && {
      // Railway-specific optimizations
      connectTimeout: 45000,
      timeout: 45000
    }),

    ...(config.platform === 'vercel' && {
      // Vercel-specific optimizations (polling only)
      transports: ['polling'],
      pollingTimeout: 30000
    }),

    ...(config.environment === 'development' && {
      // Development optimizations
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000
    })
  };
}

/**
 * Generate deployment documentation
 */
export function generateDeploymentDocs(): string {
  const status = getDeploymentStatus();
  const validation = validateDeploymentConfig();

  return `
# WebSocket Deployment Configuration

## Platform: ${status.platform.toUpperCase()}
## Environment: ${status.environment.toUpperCase()}
## WebSocket Support: ${status.websocketSupported ? '✅ Supported' : '❌ Not Supported'}

## Configuration Status
${validation.isValid ? '✅ Valid' : '❌ Invalid'}

${validation.errors.length > 0 ? `
### Errors:
${validation.errors.map(error => `- ❌ ${error}`).join('\n')}
` : ''}

${validation.warnings.length > 0 ? `
### Warnings:
${validation.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}
` : ''}

## Recommendations:
${status.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}

## WebSocket URL:
${getWebSocketURL()}

## Allowed Origins:
${JSON.stringify(status.configuration.websocketConfig.cors.origin, null, 2)}

## Rate Limits:
- Max Events/Minute: ${status.configuration.websocketConfig.rateLimit.maxEventsPerMinute}
- Max Connections: ${status.configuration.websocketConfig.rateLimit.maxConcurrentConnections}
- Window: ${status.configuration.websocketConfig.rateLimit.rateLimitWindow}ms

## Channel Configuration:
${Object.entries(status.configuration.websocketConfig.channels)
  .map(([channel, config]) => `- ${channel}: Auth Required: ${config.requireAuth}, Max Subscribers: ${config.maxSubscribers}`)
  .join('\n')}
  `.trim();
}

// Export utilities
export {
  getWebSocketURL as getSocketURL,
  createOptimizedSocketConfig as getSocketConfig
};