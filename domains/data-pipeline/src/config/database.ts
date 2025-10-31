/**
 * Database Configuration and Connection Pooling
 *
 * Configures Prisma Client with optimal connection pool settings
 * Story 4.0b Task 4.3
 */

import { PrismaClient } from '../../generated/client';

export interface DatabaseConfig {
  connectionLimit: number;
  connectionTimeout: number;
  poolTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
}

/**
 * Get database configuration based on environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return {
        connectionLimit: 20, // Max connections for production
        connectionTimeout: 3000, // 3 seconds
        poolTimeout: 10000, // 10 seconds
        idleTimeout: 10000, // 10 seconds idle before closing
        maxLifetime: 3600000 // 1 hour max connection lifetime
      };

    case 'staging':
      return {
        connectionLimit: 10,
        connectionTimeout: 3000,
        poolTimeout: 10000,
        idleTimeout: 10000,
        maxLifetime: 3600000
      };

    case 'development':
    case 'test':
      return {
        connectionLimit: 5, // Fewer connections for dev/test
        connectionTimeout: 5000,
        poolTimeout: 10000,
        idleTimeout: 5000,
        maxLifetime: 1800000 // 30 minutes
      };

    default:
      return {
        connectionLimit: 5,
        connectionTimeout: 3000,
        poolTimeout: 10000,
        idleTimeout: 10000,
        maxLifetime: 3600000
      };
  }
}

/**
 * Create configured Prisma Client instance
 */
export function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();
  const env = process.env.NODE_ENV || 'development';

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse and modify connection string to add pool parameters
  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', config.connectionLimit.toString());
  url.searchParams.set('pool_timeout', Math.floor(config.poolTimeout / 1000).toString());

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url.toString()
      }
    },
    log: env === 'development'
      ? ['query', 'error', 'warn']
      : ['error']
  });

  return prisma;
}

/**
 * Connection Pool Health Check
 */
export interface PoolHealthCheck {
  healthy: boolean;
  activeConnections: number;
  totalConnections: number;
  utilizationPercent: number;
  errors: string[];
}

/**
 * Check connection pool health
 */
export async function checkPoolHealth(prisma: PrismaClient): Promise<PoolHealthCheck> {
  const errors: string[] = [];
  let healthy = true;

  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Get connection pool stats (PostgreSQL specific)
    const stats: any = await prisma.$queryRaw`
      SELECT
        numbackends as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_database
      WHERE datname = current_database()
    `;

    const activeConnections = stats[0]?.active_connections || 0;
    const totalConnections = stats[0]?.max_connections || 100;
    const utilizationPercent = (activeConnections / totalConnections) * 100;

    // Check for high utilization
    if (utilizationPercent > 80) {
      errors.push(`High connection pool utilization: ${utilizationPercent.toFixed(1)}%`);
      healthy = false;
    }

    return {
      healthy,
      activeConnections,
      totalConnections,
      utilizationPercent,
      errors
    };

  } catch (error) {
    errors.push(`Connection pool health check failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      healthy: false,
      activeConnections: 0,
      totalConnections: 0,
      utilizationPercent: 0,
      errors
    };
  }
}

/**
 * Stress test connection pool
 */
export async function stressTestPool(
  prisma: PrismaClient,
  concurrentQueries: number = 50,
  duration: number = 10000
): Promise<{
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  queriesPerSecond: number;
}> {
  console.log(`[Pool Stress Test] Starting with ${concurrentQueries} concurrent queries for ${duration}ms...\n`);

  const startTime = Date.now();
  let totalQueries = 0;
  let successfulQueries = 0;
  let failedQueries = 0;
  const latencies: number[] = [];

  const executeQuery = async (): Promise<void> => {
    while (Date.now() - startTime < duration) {
      const queryStart = performance.now();
      try {
        await prisma.marketData.findFirst({
          where: { symbol: 'SPY' },
          orderBy: { date: 'desc' }
        });
        const queryEnd = performance.now();
        latencies.push(queryEnd - queryStart);
        successfulQueries++;
      } catch (error) {
        failedQueries++;
      }
      totalQueries++;
    }
  };

  // Run concurrent queries
  const promises = Array.from({ length: concurrentQueries }, () => executeQuery());
  await Promise.all(promises);

  const actualDuration = Date.now() - startTime;
  const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);
  const queriesPerSecond = (totalQueries / actualDuration) * 1000;

  console.log(`[Pool Stress Test] Results:`);
  console.log(`  - Total queries: ${totalQueries}`);
  console.log(`  - Successful: ${successfulQueries}`);
  console.log(`  - Failed: ${failedQueries}`);
  console.log(`  - Queries/second: ${queriesPerSecond.toFixed(0)}`);
  console.log(`  - Average latency: ${averageLatency.toFixed(2)}ms`);
  console.log(`  - Min latency: ${minLatency.toFixed(2)}ms`);
  console.log(`  - Max latency: ${maxLatency.toFixed(2)}ms\n`);

  return {
    totalQueries,
    successfulQueries,
    failedQueries,
    averageLatency,
    maxLatency,
    minLatency,
    queriesPerSecond
  };
}

/**
 * Validate connection pool configuration
 */
export async function validatePoolConfiguration(prisma: PrismaClient): Promise<boolean> {
  console.log('[Pool Validation] Checking connection pool configuration...\n');

  const config = getDatabaseConfig();

  console.log('Configuration:');
  console.log(`  - Connection Limit: ${config.connectionLimit}`);
  console.log(`  - Connection Timeout: ${config.connectionTimeout}ms`);
  console.log(`  - Pool Timeout: ${config.poolTimeout}ms`);
  console.log(`  - Idle Timeout: ${config.idleTimeout}ms`);
  console.log(`  - Max Lifetime: ${config.maxLifetime}ms\n`);

  // Test basic connectivity
  console.log('[Pool Validation] Testing basic connectivity...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Basic connectivity test passed\n');
  } catch (error) {
    console.error('❌ Basic connectivity test failed:', error);
    return false;
  }

  // Check pool health
  console.log('[Pool Validation] Checking pool health...');
  const health = await checkPoolHealth(prisma);
  console.log(`  - Active connections: ${health.activeConnections}`);
  console.log(`  - Total connections: ${health.totalConnections}`);
  console.log(`  - Utilization: ${health.utilizationPercent.toFixed(1)}%`);

  if (!health.healthy) {
    console.log(`❌ Pool health check failed:`);
    health.errors.forEach(err => console.log(`  - ${err}`));
    return false;
  }
  console.log('✅ Pool health check passed\n');

  // Stress test
  const stressResults = await stressTestPool(prisma, 20, 5000);

  if (stressResults.failedQueries > 0) {
    console.log(`⚠️  Stress test had ${stressResults.failedQueries} failed queries`);
  }

  if (stressResults.averageLatency > 100) {
    console.log(`⚠️  Average latency (${stressResults.averageLatency.toFixed(2)}ms) exceeds 100ms threshold`);
  }

  console.log('✅ Connection pool validation complete\n');
  return true;
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const prisma = createPrismaClient();

  (async () => {
    const isValid = await validatePoolConfiguration(prisma);
    await prisma.$disconnect();
    process.exit(isValid ? 0 : 1);
  })();
}
