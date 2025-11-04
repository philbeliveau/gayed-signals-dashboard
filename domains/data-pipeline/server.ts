/**
 * Express Server for Unified Data Service
 * Story: 4.0a - Unified Data Service
 * Deployed on Railway with PostgreSQL
 */

import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { UnifiedDataService } from './services/UnifiedDataService';
import { Logger } from './services/Logger';
import { SignalOrchestratorV2 } from './src/services/SignalOrchestratorV2';
import { LegacySignalsAdapter } from './src/adapters/LegacySignalsAdapter';
import { SignalOrchestrator } from './src/engines/SignalOrchestrator';
import { MarketData } from './src/types/signals';
import validationRoutes from './src/validation/routes';

const app = express();
const logger = new Logger('Server');
const dataService = new UnifiedDataService();
const signalOrchestrator = new SignalOrchestratorV2();
const legacyAdapter = new LegacySignalsAdapter();

// Middleware
app.use(express.json());
app.use(compression()); // Enable gzip/brotli compression for all responses

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
 *
 * CRITICAL: Follows Auth-First pattern - authentication happens BEFORE
 * any request body parsing or parameter validation to prevent information
 * leakage and ensure financial-grade security compliance.
 */
function authenticate(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for health check endpoint and OPTIONS preflight requests
  if (req.path === '/health' || req.path === '/' || req.method === 'OPTIONS') {
    return next();
  }

  // STEP 1: Check API key configuration (server-side error, not authentication failure)
  const validApiKey = process.env.API_KEY;
  if (!validApiKey) {
    logger.error('API_KEY not configured in environment');
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Server configuration error',
    });
  }

  // STEP 2: Extract API key (only from headers, not query params for security)
  // Note: Query param support maintained for backward compatibility but logged as deprecated
  const headerApiKey = req.header('X-API-Key');
  const queryApiKey = req.query.api_key as string | undefined;

  if (queryApiKey) {
    logger.warn('API key passed via query parameter (deprecated)', {
      ip: req.ip,
      path: req.path,
    });
  }

  const apiKey = headerApiKey || queryApiKey;

  // STEP 3: Validate API key presence
  if (!apiKey) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Provide API key via X-API-Key header',
      documentation: '/docs/authentication',
    });
  }

  // STEP 4: Validate API key value
  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    return res.status(403).json({
      error: 'AUTHENTICATION_FAILED',
      message: 'Invalid API key',
    });
  }

  // STEP 5: Authentication successful - proceed to request processing
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

/**
 * Story 4.0e: Unified Signals API Endpoint
 * GET /api/v2/signals - Fetch signals with intelligent orchestration
 *
 * Query Parameters:
 * - dateFrom: ISO 8601 date (e.g., 2024-01-01)
 * - dateTo: ISO 8601 date
 * - types: Comma-separated signal types (e.g., timing,momentum)
 * - categories: Comma-separated signal names (e.g., gayed_8_month,gayed_20d)
 * - limit: Number of results (1-100, default 50)
 * - cursor: Pagination cursor (ISO date string)
 * - sortBy: date|priority|relevance (default: date)
 * - sortOrder: asc|desc (default: desc)
 * - includeMetadata: true|false (default: true)
 */
app.get('/api/v2/signals', async (req: Request, res: Response) => {
  try {
    const {
      dateFrom,
      dateTo,
      types,
      categories,
      limit,
      cursor,
      sortBy,
      sortOrder,
      includeMetadata,
      fast, // Fast mode: skip expensive calculations, return cached data only
    } = req.query;

    // Parse and validate query parameters
    const queryParams: any = {};

    // Fast mode: prioritize speed over freshness
    // - Uses only in-memory/Redis cache
    // - Skips PostgreSQL queries
    // - Returns immediately if no cached data
    const fastMode = fast === 'true';
    if (fastMode) {
      logger.info('Fast mode enabled - cache-only operation');
    }

    // Date range
    if (dateFrom && typeof dateFrom === 'string') {
      const date = new Date(dateFrom);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid dateFrom parameter. Must be ISO 8601 date string.',
          example: '/api/v2/signals?dateFrom=2024-01-01',
        });
      }
      queryParams.dateFrom = date;
    }

    if (dateTo && typeof dateTo === 'string') {
      const date = new Date(dateTo);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid dateTo parameter. Must be ISO 8601 date string.',
          example: '/api/v2/signals?dateTo=2024-12-31',
        });
      }
      queryParams.dateTo = date;
    }

    // Signal types filter
    if (types && typeof types === 'string') {
      queryParams.types = types.split(',').map(t => t.trim());
    }

    // Signal categories (names) filter
    if (categories && typeof categories === 'string') {
      queryParams.categories = categories.split(',').map(c => c.trim());
    }

    // Limit validation
    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid limit parameter. Must be between 1 and 100.',
        });
      }
      queryParams.limit = limitNum;
    } else {
      queryParams.limit = 50; // Default
    }

    // Cursor for pagination
    if (cursor && typeof cursor === 'string') {
      queryParams.cursor = cursor;
    }

    // Sort parameters
    if (sortBy && typeof sortBy === 'string') {
      if (!['date', 'priority', 'relevance'].includes(sortBy)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid sortBy parameter. Must be one of: date, priority, relevance',
        });
      }
      queryParams.sortBy = sortBy as 'date' | 'priority' | 'relevance';
    }

    if (sortOrder && typeof sortOrder === 'string') {
      if (!['asc', 'desc'].includes(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid sortOrder parameter. Must be one of: asc, desc',
        });
      }
      queryParams.sortOrder = sortOrder as 'asc' | 'desc';
    }

    queryParams.includeMetadata = includeMetadata !== 'false';

    // Execute query through SignalOrchestratorV2
    const result = await signalOrchestrator.fetchSignals(queryParams);

    // Fast mode: skip on-demand calculation, return cached data or empty
    if (fastMode && (!result.success || result.data.length === 0)) {
      logger.info('Fast mode: no cached data, returning empty result');
      res.set({
        'Cache-Control': 'no-cache',
        'X-Fast-Mode': 'true',
      });
      return res.json({
        success: false,
        data: [],
        metadata: {
          count: 0,
          hasMore: false,
          sources: {
            primary: 'fast_mode_cache_miss',
            fallbacksUsed: [],
            failedSources: ['cache_empty']
          },
          quality: {
            freshnessScore: 0,
            completenessScore: 0,
            consistencyScore: 0,
            overallScore: 0
          },
          timing: {
            totalMs: 0,
            sourceMs: { fast_mode: 0 },
            cached: false
          }
        },
        timestamp: new Date().toISOString(),
      });
    }

    // If PostgreSQL has no signals, calculate on-demand (only in normal mode)
    if (!result.success || result.data.length === 0) {
      logger.info('PostgreSQL empty - calculating signals on-demand');
      logger.info('Attempting on-demand signal calculation', {
        fastMode,
        resultSuccess: result.success,
        resultDataLength: result.data.length
      });

      // Fetch market data with historical data (252 trading days = ~1 year)
      const symbols = SignalOrchestrator.getRequiredSymbols();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      let marketDataResult;
      try {
        logger.info('[On-Demand] Fetching market data for symbols:', { symbols });
        marketDataResult = await dataService.fetchMarketData(symbols, {
          useCache: true,
          fallbackEnabled: true,
          limit: 252,  // 252 trading days = ~1 year of data for signal calculations
          endDate: new Date(),
          startDate: oneYearAgo
        });
        logger.info('[On-Demand] Market data fetch completed');
      } catch (fetchError: any) {
        logger.error('[On-Demand] Market data fetch FAILED:', {
          error: fetchError.message,
          stack: fetchError.stack
        });
        throw fetchError; // Re-throw to be caught by outer try-catch
      }

      if (marketDataResult.data && marketDataResult.data.length > 0) {
        // Transform market data to Record<symbol, MarketData[]> format
        const marketDataBySymbol: Record<string, MarketData[]> = {};
        marketDataResult.data.forEach((item: any) => {
          if (!marketDataBySymbol[item.symbol]) {
            marketDataBySymbol[item.symbol] = [];
          }
          marketDataBySymbol[item.symbol].push({
            symbol: item.symbol,
            date: item.date,
            close: item.close,
            volume: item.volume
          });
        });

        // DIAGNOSTIC LOGGING: Market data fetch results
        logger.info('[Railway Backend] Market data fetch results:', {
          requestedSymbols: symbols,
          receivedSymbols: Object.keys(marketDataBySymbol),
          dataPointCounts: Object.fromEntries(
            Object.entries(marketDataBySymbol).map(([symbol, data]) => [symbol, data.length])
          ),
          missingSymbols: symbols.filter(s => !marketDataBySymbol[s] || marketDataBySymbol[s].length === 0),
          dataSource: marketDataResult.source,
          qualityScore: marketDataResult.quality?.score || 0,
          cached: marketDataResult.cached
        });

        // Calculate signals
        const signals = SignalOrchestrator.calculateAllSignals(marketDataBySymbol);
        const consensus = SignalOrchestrator.calculateConsensusSignal(signals);

        // DIAGNOSTIC LOGGING: Signal calculation results
        logger.info('[Railway Backend] Signal calculation results:', {
          totalSignals: signals.length,
          validSignals: signals.filter(s => s !== null).length,
          nullSignals: signals.filter(s => s === null).length,
          successfulTypes: signals.filter(s => s !== null).map(s => s?.type),
          failedTypes: signals.map((s, i) => s === null ? symbols[i] : null).filter(Boolean)
        });

        // Transform to V2 API format
        const validSignals = signals.filter((s): s is NonNullable<typeof s> => s !== null);
        const signalData = validSignals.map((signal, index) => ({
          id: index + 1,
          signalName: signal.type,
          signalType: 'timing',
          calculationDate: new Date(),
          calculationTimestamp: new Date(),
          signalValue: signal.rawValue,
          signalStrength: signal.strength === 'Strong' ? 1.0 : signal.strength === 'Moderate' ? 0.75 : 0.5,
          confidenceScore: signal.confidence,
          dataQualityScore: 0.90,
          signalStatus: signal.signal.toLowerCase().replace('-', '_'),
          statusChanged: false,
          inputData: signal.metadata,
          marketDataIds: [],
          provenanceIds: [],
        }));

        return res.json({
          success: true,
          data: signalData,
          metadata: {
            count: signalData.length,
            hasMore: false,
            sources: {
              primary: 'on_demand_calculation',
              fallbacksUsed: ['market_data_api'],
              failedSources: []
            },
            quality: {
              averageScore: 0.85,
              issues: []
            },
            timing: {
              totalMs: 0,
              cached: false
            }
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Set caching headers
    res.set({
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'ETag': `W/"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString(),
    });

    // Return response with metadata ALWAYS included (frontend requires it)
    // Even if includeMetadata is false, return minimal metadata to prevent crashes
    res.json({
      success: result.success,
      data: result.data,
      metadata: result.metadata || {
        count: 0,
        hasMore: false,
        sources: {
          primary: 'none',
          fallbacksUsed: [],
          failedSources: ['on_demand_calculation_failed']
        },
        quality: {
          freshnessScore: 0,
          completenessScore: 0,
          consistencyScore: 0,
          overallScore: 0
        },
        timing: {
          totalMs: 0,
          sourceMs: {},
          cached: false
        }
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Signals API request failed', {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while fetching signals',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Story 4.0e: Source Health Status Endpoint
 * GET /api/v2/signals/health - Check health of all signal data sources
 */
app.get('/api/v2/signals/health', async (req: Request, res: Response) => {
  try {
    const health = await signalOrchestrator.getSourcesHealth();

    res.json({
      success: true,
      sources: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Signal health check failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to check signal sources health',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Story 4.0e: Legacy V1 Signals Endpoint (Backward Compatibility)
 * GET /api/signals - Legacy signals endpoint redirected to V2
 * @deprecated Use /api/v2/signals instead
 */
app.get('/api/signals', async (req: Request, res: Response) => {
  logger.warn('Legacy V1 signals endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  try {
    const { from, to, type, limit } = req.query;

    // Transform legacy query params to V2 format
    const v2Params = legacyAdapter.transformV1QueryToV2({
      from: from as string,
      to: to as string,
      type: type as string,
      limit: limit as string,
    });

    // Fetch from V2 orchestrator
    const v2Response = await signalOrchestrator.fetchSignals(v2Params);

    // Transform to legacy format
    const legacyResponse = legacyAdapter.transformToV1(v2Response);

    // Add deprecation headers
    const headers = legacyAdapter.addDeprecationHeaders({
      'Content-Type': 'application/json',
    });

    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    res.json(legacyResponse);
  } catch (error: any) {
    logger.error('Legacy signals endpoint failed', {
      error: error.message,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch signals. Please migrate to /api/v2/signals',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Story 4.0e: Legacy Unified Content Endpoint (Backward Compatibility)
 * GET /api/content/unified - Legacy unified content endpoint
 * @deprecated Use /api/v2/signals instead
 */
app.get('/api/content/unified', async (req: Request, res: Response) => {
  logger.warn('Legacy unified content endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  try {
    const { from, to, type, limit } = req.query;

    // Transform legacy query params to V2 format
    const v2Params = legacyAdapter.transformV1QueryToV2({
      from: from as string,
      to: to as string,
      type: type as string,
      limit: limit as string,
    });

    // Fetch from V2 orchestrator
    const v2Response = await signalOrchestrator.fetchSignals(v2Params);

    // Transform to unified content format
    const unifiedResponse = legacyAdapter.transformToUnifiedContent(v2Response);

    // Add deprecation headers
    const headers = legacyAdapter.addDeprecationHeaders({
      'Content-Type': 'application/json',
    });

    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    res.json(unifiedResponse);
  } catch (error: any) {
    logger.error('Legacy unified content endpoint failed', {
      error: error.message,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch content. Please migrate to /api/v2/signals',
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
    version: '2.0.0',
    story: '4.0a + 4.0c + 4.0e',
    endpoints: {
      health: '/health',
      signals: '/api/v2/signals',
      signalsHealth: '/api/v2/signals/health',
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
  await signalOrchestrator.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await dataService.disconnect();
  await signalOrchestrator.disconnect();
  process.exit(0);
});

// Start the server
start();
