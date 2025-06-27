import { 
  SAFLAValidator, 
  ValidationConfig, 
  SAFLAValidationError, 
  SAFLACircuitBreakerError, 
  SAFLARateLimitError,
  validateSystem,
  validateQuick
} from '../../lib/safety/safla-validator';
import { MarketData, Signal, ConsensusSignal } from '../../lib/types';
import { generateGoodTestData, generateRateLimitTestData, generateCircuitBreakerTestData, getTestConfig } from '../../lib/safety/test-utils';

describe('SAFLAValidator', () => {
  let validator: SAFLAValidator;
  
  beforeEach(() => {
    // Reset the singleton instance to avoid state pollution between tests
    (SAFLAValidator as any).instance = undefined;
    validator = SAFLAValidator.getInstance();
  });

  describe('Data Integrity Validation', () => {
    test('should detect missing data', () => {
      const emptyData: Record<string, MarketData[]> = {};
      const results = validator.validateDataIntegrity(emptyData);
      
      expect(results.length).toBe(0); // Empty data returns no validation results
    });

    test('should detect insufficient data points', () => {
      const insufficientData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 },
          { date: '2023-01-02', symbol: 'SPY', close: 405 }
        ]
      };

      const results = validator.validateDataIntegrity(insufficientData);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('Insufficient data points');
      expect(results[0].severity).toBe('warning');
      expect(results[0].category).toBe('data_integrity');
    });

    test('should detect invalid price values', () => {
      const invalidData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 },
          { date: '2023-01-02', symbol: 'SPY', close: 0 }, // Invalid
          { date: '2023-01-03', symbol: 'SPY', close: -100 }, // Invalid
          { date: '2023-01-04', symbol: 'SPY', close: NaN }, // Invalid
          { date: '2023-01-05', symbol: 'SPY', close: Infinity }, // Invalid
          ...Array.from({ length: 20 }, (_, i) => ({
            date: `2023-01-${6 + i}`,
            symbol: 'SPY',
            close: 400 + i
          }))
        ]
      };

      const results = validator.validateDataIntegrity(invalidData);
      
      const missingDataResult = results.find(r => r.message.includes('missing data percentage'));
      expect(missingDataResult).toBeDefined();
      expect(missingDataResult?.severity).toBe('error');
    });

    test('should detect stale data', () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const staleData: Record<string, MarketData[]> = {
        'SPY': Array.from({ length: 25 }, (_, i) => ({
          date: new Date(staleDate.getTime() - i * 60 * 60 * 1000).toISOString(), // Going backwards in time
          symbol: 'SPY',
          close: 400 + i
        }))
      };

      const results = validator.validateDataIntegrity(staleData);
      
      const staleDataResult = results.find(r => r.message.includes('Stale data'));
      expect(staleDataResult).toBeDefined();
    });

    test('should detect symbol mismatches', () => {
      const mismatchedData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 },
          { date: '2023-01-02', symbol: 'QQQ', close: 300 }, // Wrong symbol
          ...Array.from({ length: 23 }, (_, i) => ({
            date: `2023-01-${3 + i}`,
            symbol: 'SPY',
            close: 400 + i
          }))
        ]
      };

      const results = validator.validateDataIntegrity(mismatchedData);
      
      const mismatchResult = results.find(r => r.message.includes('Symbol mismatch'));
      expect(mismatchResult).toBeDefined();
      expect(mismatchResult?.severity).toBe('error');
    });
  });

  describe('Market Data Validation', () => {
    test('should validate price ranges', () => {
      const outOfRangeData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 2000 }, // Way too high
          { date: '2023-01-02', symbol: 'SPY', close: 10 }, // Way too low
          ...Array.from({ length: 23 }, (_, i) => ({
            date: `2023-01-${3 + i}`,
            symbol: 'SPY',
            close: 400 + i
          }))
        ]
      };

      const results = validator.validateMarketData(outOfRangeData);
      
      const rangeViolationResult = results.find(r => r.message.includes('Price range violations'));
      expect(rangeViolationResult).toBeDefined();
      expect(rangeViolationResult?.severity).toBe('error');
    });

    test('should detect extreme daily changes', () => {
      const extremeChangeData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 },
          { date: '2023-01-02', symbol: 'SPY', close: 600 }, // 50% increase
          ...Array.from({ length: 23 }, (_, i) => ({
            date: `2023-01-${3 + i}`,
            symbol: 'SPY',
            close: 600 + i
          }))
        ]
      };

      const results = validator.validateMarketData(extremeChangeData);
      
      const extremeChangeResult = results.find(r => r.message.includes('Extreme daily price change'));
      expect(extremeChangeResult).toBeDefined();
      expect(extremeChangeResult?.severity).toBe('warning');
    });

    test('should warn about unconfigured symbols', () => {
      const unknownSymbolData: Record<string, MarketData[]> = {
        'UNKNOWN': Array.from({ length: 25 }, (_, i) => ({
          date: `2023-01-${1 + i}`,
          symbol: 'UNKNOWN',
          close: 100 + i
        }))
      };

      const results = validator.validateMarketData(unknownSymbolData);
      
      const unknownSymbolResult = results.find(r => r.message.includes('No price range validation configured'));
      expect(unknownSymbolResult).toBeDefined();
      expect(unknownSymbolResult?.severity).toBe('warning');
    });
  });

  describe('Financial Calculation Validation', () => {
    test('should detect invalid raw values', () => {
      const marketData: Record<string, MarketData[]> = {
        'SPY': Array.from({ length: 25 }, (_, i) => ({
          date: `2023-01-${1 + i}`,
          symbol: 'SPY',
          close: 400 + i
        }))
      };

      const invalidSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: NaN, // Invalid
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-Off',
          strength: 'Moderate',
          confidence: 0.6,
          rawValue: Infinity, // Invalid
          date: '2023-01-01'
        }
      ];

      const results = validator.validateFinancialCalculations(marketData, invalidSignals);
      
      const invalidValueResults = results.filter(r => r.message.includes('Invalid raw value'));
      expect(invalidValueResults.length).toBe(2);
      expect(invalidValueResults[0].severity).toBe('error');
    });

    test('should detect extreme signal values', () => {
      const marketData: Record<string, MarketData[]> = {};
      const extremeSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 10.0, // Extreme value
          date: '2023-01-01'
        }
      ];

      const results = validator.validateFinancialCalculations(marketData, extremeSignals);
      
      const extremeValueResult = results.find(r => r.message.includes('Extreme signal value'));
      expect(extremeValueResult).toBeDefined();
      expect(extremeValueResult?.severity).toBe('warning');
    });

    test('should detect invalid confidence values', () => {
      const marketData: Record<string, MarketData[]> = {};
      const invalidConfidenceSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 1.5, // Invalid (> 1)
          rawValue: 0.95,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-Off',
          strength: 'Moderate',
          confidence: -0.1, // Invalid (< 0)
          rawValue: 1.1,
          date: '2023-01-01'
        }
      ];

      const results = validator.validateFinancialCalculations(marketData, invalidConfidenceSignals);
      
      const invalidConfidenceResults = results.filter(r => r.message.includes('Invalid confidence value'));
      expect(invalidConfidenceResults.length).toBe(2);
    });

    test('should detect low confidence signals', () => {
      const marketData: Record<string, MarketData[]> = {};
      const lowConfidenceSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Weak',
          confidence: 0.01, // Very low confidence
          rawValue: 0.99,
          date: '2023-01-01'
        }
      ];

      const results = validator.validateFinancialCalculations(marketData, lowConfidenceSignals);
      
      const lowConfidenceResult = results.find(r => r.message.includes('Low confidence signal'));
      expect(lowConfidenceResult).toBeDefined();
      expect(lowConfidenceResult?.severity).toBe('warning');
    });

    test('should detect signal logic inconsistencies', () => {
      const marketData: Record<string, MarketData[]> = {};
      const inconsistentSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On', // Should be Risk-Off for rawValue > 1.0
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 1.2,
          date: '2023-01-01'
        }
      ];

      const results = validator.validateFinancialCalculations(marketData, inconsistentSignals);
      
      const inconsistencyResult = results.find(r => r.message.includes('Signal logic inconsistency'));
      expect(inconsistencyResult).toBeDefined();
      expect(inconsistencyResult?.severity).toBe('error');
    });

    test('should warn about insufficient signal coverage', () => {
      const marketData: Record<string, MarketData[]> = {};
      const fewSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 0.95,
          date: '2023-01-01'
        },
        null,
        null,
        null,
        null
      ];

      const results = validator.validateFinancialCalculations(marketData, fewSignals);
      
      const coverageResult = results.find(r => r.message.includes('Insufficient signal coverage'));
      expect(coverageResult).toBeDefined();
      expect(coverageResult?.severity).toBe('warning');
    });
  });

  describe('Signal Logic Validation', () => {
    test('should detect consensus count mismatches', () => {
      const signals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 0.95,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-Off',
          strength: 'Moderate',
          confidence: 0.6,
          rawValue: 1.1,
          date: '2023-01-01'
        }
      ];

      const incorrectConsensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 3, // Incorrect - should be 1
        riskOffCount: 0, // Incorrect - should be 1
        signals: []
      };

      const results = validator.validateSignalLogic(signals, incorrectConsensus);
      
      const mismatchResult = results.find(r => r.message.includes('Consensus signal count mismatch'));
      expect(mismatchResult).toBeDefined();
      expect(mismatchResult?.severity).toBe('error');
    });

    test('should detect inappropriate Mixed consensus with clear majority', () => {
      const strongMajoritySignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.9,
          rawValue: 0.85,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 1.3,
          date: '2023-01-01'
        },
        {
          type: 'treasury_curve',
          signal: 'Risk-On',
          strength: 'Moderate',
          confidence: 0.7,
          rawValue: 1.05,
          date: '2023-01-01'
        },
        {
          type: 'vix_defensive',
          signal: 'Risk-Off',
          strength: 'Weak',
          confidence: 0.4,
          rawValue: 12,
          date: '2023-01-01'
        }
      ];

      const mixedConsensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Mixed', // Should probably be Risk-On given the strong majority
        confidence: 0.3,
        riskOnCount: 3,
        riskOffCount: 1,
        signals: []
      };

      const results = validator.validateSignalLogic(strongMajoritySignals, mixedConsensus);
      
      const mixedConsensusResult = results.find(r => r.message.includes('Mixed when clear majority exists'));
      expect(mixedConsensusResult).toBeDefined();
      expect(mixedConsensusResult?.severity).toBe('warning');
    });

    test('should detect high-confidence conflicting signals', () => {
      const conflictingSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.9,
          rawValue: 0.85,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-Off',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 0.7,
          date: '2023-01-01'
        }
      ];

      const consensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 1,
        riskOffCount: 1,
        signals: []
      };

      const results = validator.validateSignalLogic(conflictingSignals, consensus);
      
      const conflictResult = results.find(r => r.message.includes('High-confidence conflicting signals'));
      expect(conflictResult).toBeDefined();
      expect(conflictResult?.severity).toBe('info');
    });
  });

  describe('Risk Boundary Validation', () => {
    test('should detect extreme VIX conditions', () => {
      const extremeVixData: Record<string, MarketData[]> = {
        '^VIX': [
          { date: '2023-01-01', symbol: '^VIX', close: 60 } // Extreme high VIX
        ]
      };

      const results = validator.validateRiskBoundaries(extremeVixData, [], {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      });

      const extremeVixResult = results.find(r => r.message.includes('Extreme market volatility'));
      expect(extremeVixResult).toBeDefined();
      expect(extremeVixResult?.severity).toBe('critical');
    });

    test('should detect unusually low VIX conditions', () => {
      const lowVixData: Record<string, MarketData[]> = {
        '^VIX': [
          { date: '2023-01-01', symbol: '^VIX', close: 8 } // Unusually low VIX
        ]
      };

      const results = validator.validateRiskBoundaries(lowVixData, [], {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      });

      const lowVixResult = results.find(r => r.message.includes('Unusually low volatility'));
      expect(lowVixResult).toBeDefined();
      expect(lowVixResult?.severity).toBe('warning');
    });

    test('should detect high consensus confidence with insufficient strong signals', () => {
      const weakSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Weak',
          confidence: 0.8,
          rawValue: 0.99,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-On',
          strength: 'Moderate',
          confidence: 0.7,
          rawValue: 1.02,
          date: '2023-01-01'
        }
      ];

      const highConfidenceConsensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Risk-On',
        confidence: 0.9, // High confidence
        riskOnCount: 2,
        riskOffCount: 0,
        signals: []
      };

      const results = validator.validateRiskBoundaries({}, weakSignals, highConfidenceConsensus);
      
      const highConfidenceResult = results.find(r => r.message.includes('High consensus confidence with insufficient strong signals'));
      expect(highConfidenceResult).toBeDefined();
      expect(highConfidenceResult?.severity).toBe('warning');
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after consecutive failures', async () => {
      const badData: Record<string, MarketData[]> = {
        'SPY': [{ date: '2023-01-01', symbol: 'SPY', close: NaN }]
      };

      const badSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: NaN,
          rawValue: NaN,
          date: '2023-01-01'
        }
      ];

      const badConsensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 4; i++) {
        try {
          await validator.validateComprehensive(badData, badSignals, badConsensus);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should throw circuit breaker error
      await expect(validator.validateComprehensive(badData, badSignals, badConsensus))
        .rejects.toThrow(SAFLACircuitBreakerError);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Create a fresh validator instance with strict rate limits
      (SAFLAValidator as any).instance = undefined;
      const config: Partial<ValidationConfig> = {
        maxValidationsPerMinute: 2,
        maxValidationsPerHour: 5
      };
      
      const limitedValidator = SAFLAValidator.getInstance(config);
      const goodData = generateRateLimitTestData();

      const consensusData = {
        date: new Date().toISOString(),
        consensus: 'Mixed' as const,
        confidence: 0.5,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      };

      // First two calls should succeed
      await limitedValidator.validateComprehensive(goodData, [], consensusData);
      await limitedValidator.validateComprehensive(goodData, [], consensusData);

      // Third call should trigger rate limit
      await expect(limitedValidator.validateComprehensive(goodData, [], consensusData))
        .rejects.toThrow(SAFLARateLimitError);
    });
  });

  describe('Comprehensive Validation', () => {
    test('should generate complete safety report', async () => {
      const goodData = generateGoodTestData();
      const today = new Date().toISOString().split('T')[0];

      const goodSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 0.8,
          rawValue: 0.95,
          date: today
        },
        {
          type: 'lumber_gold',
          signal: 'Risk-On',
          strength: 'Moderate',
          confidence: 0.6,
          rawValue: 1.05,
          date: today
        }
      ];

      const goodConsensus: ConsensusSignal = {
        date: today,
        consensus: 'Risk-On',
        confidence: 0.7,
        riskOnCount: 2,
        riskOffCount: 0,
        signals: []
      };

      const report = await validator.validateComprehensive(goodData, goodSignals, goodConsensus);

      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('validationResults');
      expect(report).toHaveProperty('circuitBreakerStatus');
      expect(report).toHaveProperty('riskScore');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('auditTrail');

      expect(['safe', 'warning', 'unsafe']).toContain(report.overallStatus);
      expect(report.riskScore).toBeLessThanOrEqual(100);
      expect(report.circuitBreakerStatus).toBe('inactive');
    });

    test('should handle validation errors gracefully', async () => {
      const badData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: NaN },
          { date: '2023-01-02', symbol: 'SPY', close: -100 }
        ]
      };

      const badSignals: (Signal | null)[] = [
        {
          type: 'utilities_spy',
          signal: 'Risk-On',
          strength: 'Strong',
          confidence: 2.0, // Invalid
          rawValue: Infinity, // Invalid
          date: '2023-01-01'
        }
      ];

      const badConsensus: ConsensusSignal = {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 10, // Inconsistent
        riskOffCount: 0,
        signals: []
      };

      const report = await validator.validateComprehensive(badData, badSignals, badConsensus);

      expect(report.overallStatus).toBe('unsafe');
      expect(report.riskScore).toBeGreaterThan(50);
      expect(report.validationResults.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Safe Defaults', () => {
    test('should provide safe fallback values', () => {
      const safeDefaults = validator.getSafeDefaults();

      expect(safeDefaults.marketData).toEqual({});
      expect(safeDefaults.signals).toEqual([]);
      expect(safeDefaults.consensus.consensus).toBe('Mixed');
      expect(safeDefaults.consensus.confidence).toBe(0.1);
      expect(safeDefaults.consensus.riskOnCount).toBe(0);
      expect(safeDefaults.consensus.riskOffCount).toBe(0);
    });
  });

  describe('Static Methods', () => {
    test('validateSystem should work as static method', async () => {
      const data: Record<string, MarketData[]> = {
        'SPY': Array.from({ length: 25 }, (_, i) => ({
          date: `2023-01-${1 + i}`,
          symbol: 'SPY',
          close: 400 + i
        }))
      };

      const report = await validateSystem(data, [], {
        date: '2023-01-01',
        consensus: 'Mixed',
        confidence: 0.5,
        riskOnCount: 0,
        riskOffCount: 0,
        signals: []
      });

      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('validationResults');
    });

    test('validateQuick should work as static method', () => {
      const data: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 }
        ]
      };

      const results = validateQuick(data);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Error Types', () => {
    test('should create SAFLAValidationError correctly', () => {
      const error = new SAFLAValidationError(
        'Test error',
        'data_integrity',
        'error',
        { testDetail: 'value' }
      );

      expect(error.name).toBe('SAFLAValidationError');
      expect(error.message).toBe('Test error');
      expect(error.category).toBe('data_integrity');
      expect(error.severity).toBe('error');
      expect(error.details?.testDetail).toBe('value');
    });

    test('should create SAFLACircuitBreakerError correctly', () => {
      const cooldownTime = Date.now() + 60000;
      const error = new SAFLACircuitBreakerError('Circuit breaker open', cooldownTime);

      expect(error.name).toBe('SAFLACircuitBreakerError');
      expect(error.cooldownUntil).toBe(cooldownTime);
    });

    test('should create SAFLARateLimitError correctly', () => {
      const resetTime = Date.now() + 60000;
      const error = new SAFLARateLimitError('Rate limit exceeded', resetTime);

      expect(error.name).toBe('SAFLARateLimitError');
      expect(error.resetTime).toBe(resetTime);
    });
  });
});