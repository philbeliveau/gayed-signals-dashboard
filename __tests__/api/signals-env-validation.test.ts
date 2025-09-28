/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../../src/app/api/signals/route';

// Mock the EnhancedMarketClient and SignalOrchestrator
jest.mock('../../src/domains/market-data/services/enhanced-market-client', () => ({
  EnhancedMarketClient: jest.fn().mockImplementation(() => ({
    fetchMarketData: jest.fn().mockResolvedValue({}),
    fetchHistoricalData: jest.fn().mockResolvedValue([])
  }))
}));

jest.mock('../../src/domains/trading-signals/engines/gayed-signals', () => ({
  SignalOrchestrator: {
    getRequiredSymbols: jest.fn().mockReturnValue(['SPY', 'XLU']),
    validateMarketData: jest.fn().mockReturnValue({ isValid: true, warnings: [] }),
    calculateFastSignals: jest.fn().mockReturnValue([]),
    calculateAllSignals: jest.fn().mockReturnValue([]),
    calculateConsensusSignal: jest.fn().mockReturnValue({ consensus: 'NEUTRAL', confidence: 0.5 })
  }
}));

describe('Signals API Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /api/signals', () => {
    test('should fail when TIINGO_API_KEY is missing', async () => {
      delete process.env.TIINGO_API_KEY;
      process.env.ALPHA_VANTAGE_KEY = 'test-alpha-key';

      const request = new NextRequest('http://localhost:3000/api/signals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
      expect(data.details).toBe('Missing required API configuration. Please contact support.');
      expect(data.timestamp).toBeDefined();
    });

    test('should fail when ALPHA_VANTAGE_KEY is missing', async () => {
      process.env.TIINGO_API_KEY = 'test-tiingo-key';
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
      expect(data.details).toBe('Missing required API configuration. Please contact support.');
      expect(data.timestamp).toBeDefined();
    });

    test('should fail when both API keys are missing', async () => {
      delete process.env.TIINGO_API_KEY;
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
      expect(data.details).toBe('Missing required API configuration. Please contact support.');
      expect(data.timestamp).toBeDefined();
    });

    test('should not expose sensitive information in error response', async () => {
      delete process.env.TIINGO_API_KEY;
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals');
      const response = await GET(request);
      const data = await response.json();

      // Ensure no sensitive information is leaked
      expect(JSON.stringify(data)).not.toContain('TIINGO_API_KEY');
      expect(JSON.stringify(data)).not.toContain('ALPHA_VANTAGE_KEY');
      expect(JSON.stringify(data)).not.toContain('process.env');
    });
  });

  describe('POST /api/signals', () => {
    test('should fail when TIINGO_API_KEY is missing', async () => {
      delete process.env.TIINGO_API_KEY;
      process.env.ALPHA_VANTAGE_KEY = 'test-alpha-key';

      const request = new NextRequest('http://localhost:3000/api/signals', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'SPY',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          requestHistorical: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
      expect(data.details).toBe('Missing required API configuration. Please contact support.');
      expect(data.timestamp).toBeDefined();
    });

    test('should fail when ALPHA_VANTAGE_KEY is missing', async () => {
      process.env.TIINGO_API_KEY = 'test-tiingo-key';
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'SPY',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          requestHistorical: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
      expect(data.details).toBe('Missing required API configuration. Please contact support.');
      expect(data.timestamp).toBeDefined();
    });

    test('should validate request parameters before checking environment variables', async () => {
      delete process.env.TIINGO_API_KEY;
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals', {
        method: 'POST',
        body: JSON.stringify({
          requestHistorical: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail at parameter validation before env validation
      expect(response.status).toBe(400);
      expect(data.error).toBe('This endpoint requires requestHistorical=true');
    });

    test('should not expose sensitive information in POST error response', async () => {
      delete process.env.TIINGO_API_KEY;
      delete process.env.ALPHA_VANTAGE_KEY;

      const request = new NextRequest('http://localhost:3000/api/signals', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'SPY',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          requestHistorical: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      // Ensure no sensitive information is leaked
      expect(JSON.stringify(data)).not.toContain('TIINGO_API_KEY');
      expect(JSON.stringify(data)).not.toContain('ALPHA_VANTAGE_KEY');
      expect(JSON.stringify(data)).not.toContain('process.env');
    });
  });

  describe('Environment validation security', () => {
    test('should perform fail-fast validation', async () => {
      delete process.env.TIINGO_API_KEY;
      process.env.ALPHA_VANTAGE_KEY = 'test-alpha-key';

      const startTime = Date.now();
      const request = new NextRequest('http://localhost:3000/api/signals');
      const response = await GET(request);
      const endTime = Date.now();

      // Should fail quickly without attempting to make API calls
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(response.status).toBe(500);
    });

    test('should log security warnings to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      delete process.env.TIINGO_API_KEY;
      process.env.ALPHA_VANTAGE_KEY = 'test-alpha-key';

      const request = new NextRequest('http://localhost:3000/api/signals');
      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith('❌ TIINGO_API_KEY environment variable is required');

      consoleSpy.mockRestore();
    });
  });
});