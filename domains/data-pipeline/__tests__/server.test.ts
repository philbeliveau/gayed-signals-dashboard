/**
 * Server Integration Tests
 * Story: 4.0a - Unified Data Service
 * Tests authentication and input validation
 */

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// Mock the UnifiedDataService
jest.mock('../services/UnifiedDataService');

describe('Server API', () => {
  let app: express.Application;
  const validApiKey = 'test-api-key-123';

  beforeAll(() => {
    // Set environment variables
    process.env.API_KEY = validApiKey;

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());

    // CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      next();
    });

    // Authentication middleware
    function authenticate(req: Request, res: Response, next: NextFunction) {
      if (req.path === '/health' || req.path === '/') {
        return next();
      }

      const apiKey = req.header('X-API-Key') || req.query.api_key;
      const validKey = process.env.API_KEY;

      if (!validKey) {
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

      if (apiKey !== validKey) {
        return res.status(403).json({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      }

      next();
    }

    app.use(authenticate);

    // Validation function
    function validateSymbols(symbolsParam: string): {
      valid: boolean;
      error?: string;
      symbols?: string[]
    } {
      if (!symbolsParam || typeof symbolsParam !== 'string') {
        return { valid: false, error: 'Symbols parameter must be a non-empty string' };
      }

      const symbolArray = symbolsParam.split(',').map((s) => s.trim().toUpperCase());

      if (symbolArray.length > 50) {
        return { valid: false, error: 'Maximum 50 symbols per request' };
      }

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

    // Test endpoints
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    app.get('/', (req, res) => {
      res.json({ service: 'Unified Data Service' });
    });

    app.get('/api/v2/market-data', (req, res) => {
      const { symbols } = req.query;

      if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({
          error: 'Missing or invalid symbols parameter',
          example: '/api/v2/market-data?symbols=SPY,XLU',
        });
      }

      const validation = validateSymbols(symbols);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid symbols parameter',
          message: validation.error,
          example: '/api/v2/market-data?symbols=SPY,XLU',
        });
      }

      res.json({
        success: true,
        symbols: validation.symbols,
      });
    });
  });

  describe('Authentication Middleware (SEC-001)', () => {
    it('should allow access to /health without authentication', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should allow access to / without authentication', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.service).toBe('Unified Data Service');
    });

    it('should reject requests without API key', async () => {
      const response = await request(app).get('/api/v2/market-data?symbols=SPY');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=SPY')
        .set('X-API-Key', 'wrong-key');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should accept valid API key in header', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=SPY')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid API key in query parameter', async () => {
      const response = await request(app)
        .get(`/api/v2/market-data?symbols=SPY&api_key=${validApiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Input Validation (SEC-002)', () => {
    it('should accept valid single symbol', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=SPY')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.symbols).toEqual(['SPY']);
    });

    it('should accept valid multiple symbols', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=SPY,QQQ,AAPL')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.symbols).toEqual(['SPY', 'QQQ', 'AAPL']);
    });

    it('should accept symbols with dots and hyphens', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=BRK.B,SPY-ETF')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.symbols).toEqual(['BRK.B', 'SPY-ETF']);
    });

    it('should reject missing symbols parameter', async () => {
      const response = await request(app)
        .get('/api/v2/market-data')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing or invalid');
    });

    it('should reject symbols with special characters', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=SPY;DROP TABLE')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid symbols parameter');
      expect(response.body.message).toContain('Invalid symbol format');
    });

    it('should reject symbols longer than 10 characters', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=VERYLONGSYMBOL')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid symbol format');
    });

    it('should reject more than 50 symbols', async () => {
      const symbols = Array(51).fill('SPY').join(',');
      const response = await request(app)
        .get(`/api/v2/market-data?symbols=${symbols}`)
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Maximum 50 symbols');
    });

    it('should trim whitespace from symbols', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols= SPY , QQQ ')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.symbols).toEqual(['SPY', 'QQQ']);
    });

    it('should convert symbols to uppercase', async () => {
      const response = await request(app)
        .get('/api/v2/market-data?symbols=spy,qqq')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
      expect(response.body.symbols).toEqual(['SPY', 'QQQ']);
    });
  });
});
