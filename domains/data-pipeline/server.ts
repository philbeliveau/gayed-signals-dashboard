/**
 * Express Server for Unified Data Service
 * Story: 4.0a - Unified Data Service
 * Deployed on Railway with PostgreSQL
 */

import express, { Request, Response } from 'express';
import { UnifiedDataService } from './services/UnifiedDataService';
import { Logger } from './services/Logger';

const app = express();
const logger = new Logger('Server');
const dataService = new UnifiedDataService();

// Middleware
app.use(express.json());

// CORS for web app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

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

    const symbolArray = symbols.split(',').map((s) => s.trim().toUpperCase());

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

/**
 * Root endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Unified Data Service',
    version: '1.0.0',
    story: '4.0a',
    endpoints: {
      health: '/health',
      marketData: '/api/v2/market-data?symbols=SPY,XLU',
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
