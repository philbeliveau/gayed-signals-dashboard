/**
 * Redis Configuration for Railway
 *
 * Configures ioredis client for Railway Redis caching layer.
 * Supports connection pooling, retry logic, and graceful degradation.
 */

import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '../../services/Logger';

const logger = new Logger('RedisConfig');

/**
 * Redis connection configuration
 * Railway Redis URL format: redis://default:password@host:port
 */
const REDIS_URL = process.env.REDIS_URL || process.env.RAILWAY_REDIS_URL;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Default enabled if URL provided

/**
 * Redis client options
 */
const redisOptions: RedisOptions = {
  // Connection retry strategy
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },

  // Maximum retry attempts
  maxRetriesPerRequest: 3,

  // Connection timeout
  connectTimeout: 5000,

  // Enable keep-alive
  keepAlive: 30000,

  // Reconnect on error
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY errors
      return true;
    }
    return false;
  },

  // Lazy connect (don't connect until first command)
  lazyConnect: true,
};

/**
 * Create Redis client instance
 * Returns null if Redis is disabled or URL not configured
 */
export function createRedisClient(): Redis | null {
  if (!REDIS_ENABLED) {
    logger.info('Redis disabled via REDIS_ENABLED=false');
    return null;
  }

  if (!REDIS_URL) {
    logger.warn('Redis URL not configured (REDIS_URL or RAILWAY_REDIS_URL missing)');
    return null;
  }

  try {
    const client = new Redis(REDIS_URL, redisOptions);

    // Event handlers
    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('error', (error: Error) => {
      logger.error('Redis client error:', error);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Redis cache key prefixes for organization
 */
export const CACHE_PREFIXES = {
  SIGNALS: 'signals:',
  QUERY: 'query:',
  HEALTH: 'health:',
} as const;

/**
 * Default cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  SIGNALS: 300,      // 5 minutes for signal data
  QUERY_RESULT: 60,  // 1 minute for query results
  HEALTH: 30,        // 30 seconds for health checks
} as const;
