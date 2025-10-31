/**
 * Story 4.0c: Validation Framework Tests
 * Comprehensive tests for all validation categories
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '../generated/client';
import {
  DataValidationService,
  CompletenessValidator,
  FreshnessValidator,
  ConsistencyValidator,
  AnomalyDetector,
  SequentialValidator,
  ValidationResult,
} from '../src/validation';

const prisma = new PrismaClient();

describe('Story 4.0c: Validation Framework', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  describe('ValidationResult', () => {
    it('should track errors, warnings, and calculate score', () => {
      const result = new ValidationResult();

      result.addError({
        category: 'completeness',
        message: 'Missing required field',
        code: 'MISSING_FIELDS',
      });

      result.addWarning({
        category: 'freshness',
        message: 'Data is stale',
        code: 'STALE_DATA',
      });

      expect(result.isValid()).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.getErrors().length).toBe(1);
      expect(result.getWarnings().length).toBe(1);

      const score = result.calculateScore();
      expect(score).toBe(0.89); // 1.0 - 0.1 (error) - 0.01 (warning)
    });

    it('should merge results from multiple validators', () => {
      const result1 = new ValidationResult();
      result1.addError({ category: 'completeness', message: 'Error 1', code: 'E1' });

      const result2 = new ValidationResult();
      result2.addWarning({ category: 'freshness', message: 'Warning 1', code: 'W1' });

      result1.merge(result2);

      expect(result1.getErrors().length).toBe(1);
      expect(result1.getWarnings().length).toBe(1);
    });
  });

  describe('CompletenessValidator', () => {
    const validator = new CompletenessValidator();

    it('should detect missing required fields', () => {
      const data = { symbol: 'SPY', date: new Date() };
      const result = validator.validateRequiredFields(data, ['symbol', 'date', 'close']);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('MISSING_FIELDS');
      expect(result.getErrors()[0].metadata?.missingFields).toContain('close');
    });

    it('should pass when all required fields present', () => {
      const data = { symbol: 'SPY', date: new Date(), close: 450 };
      const result = validator.validateRequiredFields(data, ['symbol', 'date', 'close']);

      expect(result.isValid()).toBe(true);
    });

    it('should detect gaps in time series data', async () => {
      const data = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 101 },
        // Missing 2024-01-03
        { timestamp: new Date('2024-01-04'), value: 102 },
      ];

      const result = await validator.validateTimeSeriesGaps(data, 'daily');

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('TIME_SERIES_GAPS');
    });
  });

  describe('FreshnessValidator', () => {
    const validator = new FreshnessValidator();

    it('should detect stale data', () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // 10 days old

      const data = { timestamp: staleDate };
      const result = validator.validateDataAge(data, 24); // Max 24 hours

      expect(result.hasErrors()).toBe(false); // Staleness is a warning, not error
      expect(result.getWarnings().length).toBeGreaterThan(0);
      expect(result.getWarnings()[0].code).toBe('STALE_DATA');
    });

    it('should pass fresh data', () => {
      const freshDate = new Date();
      const data = { timestamp: freshDate };
      const result = validator.validateDataAge(data, 24);

      expect(result.isValid()).toBe(true);
    });
  });

  describe('ConsistencyValidator', () => {
    const validator = new ConsistencyValidator();

    it('should detect duplicate records', async () => {
      const data = [
        { symbol: 'SPY', date: '2024-01-01', value: 100 },
        { symbol: 'SPY', date: '2024-01-01', value: 100 }, // Duplicate
      ];

      const result = await validator.validateNoDuplicates(data, ['symbol', 'date']);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('DUPLICATE_RECORDS');
    });

    it('should validate OHLC consistency', () => {
      const validOHLC = {
        open: 100,
        high: 105,
        low: 95,
        close: 102,
      };

      const result = validator.validateOHLCConsistency(validOHLC);
      expect(result.isValid()).toBe(true);
    });

    it('should detect OHLC violations', () => {
      const invalidOHLC = {
        open: 100,
        high: 90, // High < Low violation
        low: 95,
        close: 102,
      };

      const result = validator.validateOHLCConsistency(invalidOHLC);
      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('INVALID_OHLC');
    });
  });

  describe('AnomalyDetector', () => {
    const detector = new AnomalyDetector();

    it('should detect outliers using IQR', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is outlier
      const result = detector.detectOutliers(data);

      expect(result.isValid()).toBe(false);
      expect(result.getViolations()[0].code).toBe('OUTLIERS_DETECTED');
    });

    it('should detect sudden changes', () => {
      const data = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 150 }, // 50% increase
      ];

      const result = detector.detectSuddenChanges(data, 20); // 20% threshold

      expect(result.hasErrors()).toBe(false); // Sudden changes are warnings, not errors
      expect(result.getWarnings().length).toBeGreaterThan(0);
      expect(result.getWarnings()[0].code).toBe('SUDDEN_CHANGES');
    });

    it('should detect unexpected zero values', () => {
      const data = { volume: 0, close: 100 };
      const result = detector.validateNonZeroFields(data, ['volume']);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('UNEXPECTED_ZERO_VALUES');
    });
  });

  describe('SequentialValidator', () => {
    const validator = new SequentialValidator();

    it('should detect out-of-order timestamps', () => {
      const data = [
        { timestamp: new Date('2024-01-02'), value: 100 },
        { timestamp: new Date('2024-01-01'), value: 101 }, // Out of order
      ];

      const result = validator.validateChronologicalOrder(data);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('OUT_OF_ORDER');
    });

    it('should validate monotonic increasing sequence', () => {
      const data = [1, 2, 3, 2, 5]; // 2 breaks monotonic increasing
      const result = validator.validateMonotonicIncreasing(data);

      expect(result.isValid()).toBe(false);
      expect(result.getErrors()[0].code).toBe('NOT_MONOTONIC');
    });
  });

  describe('DataValidationService (Integration)', () => {
    const service = new DataValidationService(prisma);

    it('should validate complete market data', async () => {
      const data = [
        {
          symbol: 'SPY',
          timestamp: new Date(),
          date: new Date(),
          open: 450,
          high: 455,
          low: 448,
          close: 452,
          volume: 1000000,
        },
      ];

      const result = await service.validateMarketData(data);

      expect(result).toBeDefined();
      expect(result.calculateScore()).toBeGreaterThan(0.9);
    });

    it('should quarantine data on errors when option enabled', async () => {
      const invalidData = [
        {
          symbol: 'SPY',
          timestamp: new Date(),
          // Missing required 'close' field
        },
      ];

      const result = await service.validateMarketData(invalidData as any, {
        quarantineOnError: true,
      });

      expect(result.hasErrors()).toBe(true);

      // Check quarantine table
      const quarantined = await prisma.quarantinedData.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(quarantined.length).toBeGreaterThan(0);
    });

    it('should store validation results in database', async () => {
      const data = [
        {
          symbol: 'XLU',
          timestamp: new Date(),
          close: 65.5,
        },
      ];

      await service.validateMarketData(data);

      // Check validation results table
      const results = await prisma.validationResult.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
    });

    it('should retrieve validation metrics', async () => {
      const metrics = await service.getValidationMetrics(7);

      expect(metrics).toBeDefined();
      expect(metrics.totalValidations).toBeGreaterThanOrEqual(0);
      expect(metrics.averageScore).toBeGreaterThanOrEqual(0);
    });
  });
});
