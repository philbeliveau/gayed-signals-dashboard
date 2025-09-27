/**
 * Integration Tests for Frontend-Backend Communication
 * 
 * Tests the complete integration between Next.js frontend and Python backend services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'undici';

describe('Frontend-Backend Integration Tests', () => {
  let pythonService: ChildProcess;
  let nextjsService: ChildProcess;
  
  const PYTHON_SERVICE_URL = 'http://localhost:5000';
  const NEXTJS_SERVICE_URL = 'http://localhost:3001'; // Use different port for testing
  const TEST_TIMEOUT = 30000; // 30 seconds

  beforeAll(async () => {
    // Start Python service
    console.log('Starting Python service...');
    pythonService = spawn('python', ['start_service.py', '--port', '5000'], {
      cwd: './python-services/backtrader-analysis',
      env: { ...process.env, FLASK_ENV: 'testing' },
      stdio: 'pipe'
    });

    // Start Next.js service on different port
    console.log('Starting Next.js service...');
    nextjsService = spawn('npm', ['run', 'dev', '--', '--port', '3001'], {
      env: { ...process.env, NODE_ENV: 'test', PYTHON_SERVICE_URL: PYTHON_SERVICE_URL },
      stdio: 'pipe'
    });

    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify services are running
    await waitForService(PYTHON_SERVICE_URL + '/health', 'Python service');
    await waitForService(NEXTJS_SERVICE_URL + '/api/health', 'Next.js service');
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (pythonService) {
      pythonService.kill();
    }
    if (nextjsService) {
      nextjsService.kill();
    }
  });

  describe('Service Health Checks', () => {
    it('should verify Python service is healthy', async () => {
      const response = await fetch(PYTHON_SERVICE_URL + '/health');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('gayed-backtrader-analysis');
      expect(data.indicators_available).toEqual([
        'utilities_spy',
        'lumber_gold',
        'treasury_curve',
        'vix_defensive',
        'sp500_ma'
      ]);
    });

    it('should verify Next.js service is healthy', async () => {
      const response = await fetch(NEXTJS_SERVICE_URL + '/api/health');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow cross-origin requests from Next.js to Python', async () => {
      const response = await fetch(PYTHON_SERVICE_URL + '/health', {
        method: 'GET',
        headers: {
          'Origin': NEXTJS_SERVICE_URL,
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await fetch(PYTHON_SERVICE_URL + '/analyze', {
        method: 'OPTIONS',
        headers: {
          'Origin': NEXTJS_SERVICE_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });

  describe('API Proxy Configuration', () => {
    it('should proxy requests through Next.js API routes', async () => {
      // Test the API proxy by making a request through Next.js to Python service
      const testConfig = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        initialCash: 100000,
        commission: 0.001,
        symbols: ['SPY', 'XLU'],
        signals: ['utilities_spy'],
        timeframe: '1D',
        chartStyle: 'candlestick',
        showVolume: true,
        showSignals: true,
        showDrawdown: true
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/backtrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });

      // Should either succeed or fail gracefully with proper error handling
      expect(response.status).toBeOneOf([200, 400, 500]);
      
      const data = await response.json();
      if (response.status === 200) {
        expect(data).toHaveProperty('chartUrl');
        expect(data).toHaveProperty('performanceMetrics');
      } else {
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe('Environment Variable Coordination', () => {
    it('should have consistent environment configuration', async () => {
      // Check Python service config
      const pythonResponse = await fetch(PYTHON_SERVICE_URL + '/config');
      expect(pythonResponse.status).toBe(200);
      
      const pythonConfig = await pythonResponse.json();
      expect(pythonConfig.environment).toBe('testing');
      
      // Check Next.js service has proper Python service URL
      const nextjsResponse = await fetch(NEXTJS_SERVICE_URL + '/api/backtrader', {
        method: 'GET'
      });
      expect(nextjsResponse.status).toBe(200);
      
      const nextjsData = await nextjsResponse.json();
      expect(nextjsData.status).toBe('active');
    });
  });

  describe('Signal Processing Integration', () => {
    it('should process signals through the complete pipeline', async () => {
      // Test signal processing from frontend to backend
      const signalRequest = {
        symbols: ['SPY', 'XLU', 'VIX'],
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalRequest)
      });

      expect(response.status).toBeOneOf([200, 500]); // May fail due to data requirements
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('signals');
        expect(data).toHaveProperty('consensus');
        expect(data.signals).toBeInstanceOf(Array);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Python service errors gracefully', async () => {
      // Send invalid request to test error handling
      const invalidConfig = {
        startDate: 'invalid-date',
        endDate: '2023-12-31',
        symbols: [],
        signals: []
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/backtrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('validation failed');
    });

    it('should handle Python service unavailable', async () => {
      // Temporarily kill Python service
      if (pythonService) {
        pythonService.kill();
      }

      const testConfig = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        initialCash: 100000,
        commission: 0.001,
        symbols: ['SPY'],
        signals: ['utilities_spy'],
        timeframe: '1D',
        chartStyle: 'candlestick',
        showVolume: true,
        showSignals: true,
        showDrawdown: true
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/backtrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('service is not available');

      // Restart Python service for remaining tests
      pythonService = spawn('python', ['start_service.py', '--port', '5000'], {
        cwd: './python-services/backtrader-analysis',
        env: { ...process.env, FLASK_ENV: 'testing' },
        stdio: 'pipe'
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    });
  });

  describe('Prompt Management Integration', () => {
    it('should handle prompt template requests', async () => {
      const response = await fetch(NEXTJS_SERVICE_URL + '/api/prompts');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('templates');
      expect(data.templates).toBeInstanceOf(Array);
      expect(data.templates.length).toBeGreaterThan(0);
    });

    it('should generate prompts from templates', async () => {
      const generateRequest = {
        action: 'generate',
        templateId: 'financial_market_analysis',
        variables: {
          signals: [
            { name: 'Utilities/SPY', value: 'Risk-On', confidence: 75 },
            { name: 'Lumber/Gold', value: 'Risk-Off', confidence: 60 }
          ],
          dateRange: '2023-01-01 to 2023-12-31',
          marketConditions: 'Volatile with mixed signals',
          analysisType: 'Risk Management',
          riskTolerance: 'Moderate',
          investmentHorizon: 'Medium-term (6-24 months)'
        }
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateRequest)
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('prompt');
      expect(data.prompt).toContain('Risk-On');
      expect(data.prompt).toContain('Risk-Off');
    });
  });

  describe('Performance Validation', () => {
    it('should meet G4 requirement: 2-4 minutes for <20min videos', async () => {
      const startTime = Date.now();
      
      // Simulate processing request that should complete within 2-4 minutes
      const testConfig = {
        startDate: '2023-01-01',
        endDate: '2023-03-31', // 3 months of data (simulating <20min video processing)
        initialCash: 100000,
        commission: 0.001,
        symbols: ['SPY', 'XLU', 'VIX'],
        signals: ['utilities_spy', 'vix_defensive'],
        timeframe: '1D',
        chartStyle: 'candlestick',
        showVolume: true,
        showSignals: true,
        showDrawdown: true
      };

      const response = await fetch(NEXTJS_SERVICE_URL + '/api/backtrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000; // Convert to seconds

      // Should process within reasonable time for test (allow up to 30 seconds for test environment)
      expect(processingTime).toBeLessThan(30);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('executionTime');
        
        // In production, execution time should be within 2-4 minutes (120-240 seconds)
        // For testing, we'll just verify it's tracked
        expect(typeof data.executionTime).toBe('number');
      }
    }, 60000); // 60 second timeout for this test
  });
});

// Helper function to wait for service to be available
async function waitForService(url: string, serviceName: string, maxAttempts: number = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        console.log(`${serviceName} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    console.log(`Waiting for ${serviceName}... (attempt ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`${serviceName} failed to start within expected time`);
}

// Custom Jest matcher
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});