/**
 * Express Server for Unified Data Service
 * Story: 4.0a - Unified Data Service
 * Deployed on Railway with PostgreSQL
 */

import express, { Request, Response, NextFunction } from 'express';
import { UnifiedDataService } from './services/UnifiedDataService';
import { Logger } from './services/Logger';
import validationRoutes from './src/validation/routes';

const app = express();
const logger = new Logger('Server');
const dataService = new UnifiedDataService();

// Middleware
app.use(express.json());

// CORS for web app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  next();
});

/**
 * Authentication middleware
 * Validates API key from X-API-Key header or api_key query parameter
 */
function authenticate(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for health check endpoint
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const apiKey = req.header('X-API-Key') || req.query.api_key;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication not properly configured',
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Provide API key via X-API-Key header or api_key query parameter',
    });
  }

  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    });
  }

  next();
}

// Apply authentication middleware to all routes
app.use(authenticate);

/**
 * Health check endpoint for Railway
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await dataService.healthCheck();
    res.json({
      status: health.status,
      service: 'unified-data-service',
      timestamp: new Date().toISOString(),
      checks: health.checks,
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Validate symbols parameter
 * - Must be alphanumeric with optional dots and hyphens (for stock symbols)
 * - Max 50 symbols per request
 * - Each symbol max 10 characters
 */
function validateSymbols(symbolsParam: string): { valid: boolean; error?: string; symbols?: string[] } {
  if (!symbolsParam || typeof symbolsParam !== 'string') {
    return { valid: false, error: 'Symbols parameter must be a non-empty string' };
  }

  const symbolArray = symbolsParam.split(',').map((s) => s.trim().toUpperCase());

  // Check array size limit
  if (symbolArray.length > 50) {
    return { valid: false, error: 'Maximum 50 symbols per request' };
  }

  // Validate each symbol
  const symbolRegex = /^[A-Z0-9.\-]{1,10}$/;
  for (const symbol of symbolArray) {
    if (!symbolRegex.test(symbol)) {
      return {
        valid: false,
        error: `Invalid symbol format: ${symbol}. Must be alphanumeric (1-10 chars), dots and hyphens allowed`,
      };
    }
  }

  return { valid: true, symbols: symbolArray };
}

/**
 * Market data endpoint
 * GET /api/v2/market-data?symbols=SPY,XLU&useCache=true
 */
app.get('/api/v2/market-data', async (req: Request, res: Response) => {
  try {
    const { symbols, useCache, fallbackEnabled } = req.query;

    if (!symbols || typeof symbols !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid symbols parameter',
        example: '/api/v2/market-data?symbols=SPY,XLU',
      });
    }

    // Validate symbols input
    const validation = validateSymbols(symbols);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid symbols parameter',
        message: validation.error,
        example: '/api/v2/market-data?symbols=SPY,XLU',
      });
    }

    const symbolArray = validation.symbols!;

    const result = await dataService.fetchMarketData(symbolArray, {
      useCache: useCache !== 'false',
      fallbackEnabled: fallbackEnabled !== 'false',
    });

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Market data request failed', {
      error: error.message,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Story 4.0c: Mount validation routes
app.use('/api/validation', validationRoutes);

/**
 * Root endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Unified Data Service',
    version: '1.0.0',
    story: '4.0a + 4.0c',
    endpoints: {
      health: '/health',
      marketData: '/api/v2/market-data?symbols=SPY,XLU',
      validation: '/api/validation',
      validationMetrics: '/api/validation/metrics',
      validationRules: '/api/validation/rules',
      quarantine: '/api/validation/quarantine',
    },
    documentation: 'https://github.com/gayed-signals/dashboard',
  });
});

/**
 * Initialize and start server
 */
async function start() {
  try {
    // Initialize data service
    logger.info('Initializing Unified Data Service...');
    await dataService.initialize();

    // Start Express server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      logger.info(`UnifiedDataService running on Railway port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(
        `Market data: http://localhost:${PORT}/api/v2/market-data?symbols=SPY`
      );
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await dataService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await dataService.disconnect();
  process.exit(0);
});

// Start the server
start();
