/**
 * Story 4.0c: DataValidationService
 * Main service that orchestrates all validation categories with Prisma integration
 */

import { PrismaClient } from '@prisma/client';
import { ValidationResult, ValidationContext } from './core/ValidationResult';
import { CompletenessValidator } from './categories/CompletenessValidator';
import { FreshnessValidator } from './categories/FreshnessValidator';
import { ConsistencyValidator } from './categories/ConsistencyValidator';
import { AnomalyDetector } from './categories/AnomalyDetector';
import { SequentialValidator } from './categories/SequentialValidator';

export interface MarketDataInput {
  symbol: string;
  timestamp: Date;
  date?: Date;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  [key: string]: any;
}

export interface ValidationOptions {
  categories?: {
    completeness?: boolean;
    freshness?: boolean;
    consistency?: boolean;
    anomaly?: boolean;
    sequential?: boolean;
  };
  thresholds?: {
    maxAgeHours?: number;
    minCoverage?: number;
    outlierMultiplier?: number;
    suddenChangePercent?: number;
  };
  quarantineOnError?: boolean;
}

/**
 * DataValidationService - Railway-deployed validation service with Prisma
 */
export class DataValidationService {
  private prisma: PrismaClient;
  private completenessValidator: CompletenessValidator;
  private freshnessValidator: FreshnessValidator;
  private consistencyValidator: ConsistencyValidator;
  private anomalyDetector: AnomalyDetector;
  private sequentialValidator: SequentialValidator;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.completenessValidator = new CompletenessValidator();
    this.freshnessValidator = new FreshnessValidator();
    this.consistencyValidator = new ConsistencyValidator();
    this.anomalyDetector = new AnomalyDetector();
    this.sequentialValidator = new SequentialValidator();
  }

  /**
   * Validate market data with all enabled categories
   */
  async validateMarketData(
    data: MarketDataInput[],
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const result = new ValidationResult();
    const context: ValidationContext = {
      source: 'market_data_validation',
      timestamp: new Date(),
      dataCount: data.length,
    };

    try {
      // Completeness validation
      if (options.categories?.completeness !== false) {
        for (const item of data) {
          const completenessResult = this.completenessValidator.validateRequiredFields(item, [
            'symbol',
            'timestamp',
            'close',
          ]);
          result.merge(completenessResult);

          // OHLC data completeness check
          if (item.open !== undefined || item.high !== undefined || item.low !== undefined) {
            const ohlcComplete = this.completenessValidator.validateRequiredFields(item, [
              'open',
              'high',
              'low',
              'close',
            ]);
            result.merge(ohlcComplete);
          }
        }
      }

      // Freshness validation
      if (options.categories?.freshness !== false && data.length > 0) {
        const maxAgeHours = options.thresholds?.maxAgeHours || 24;
        const freshnessResult = await this.freshnessValidator.validateLatestDataPoint(data, maxAgeHours);
        result.merge(freshnessResult);
      }

      // Consistency validation
      if (options.categories?.consistency !== false) {
        // Check for duplicates
        const duplicateResult = await this.consistencyValidator.validateNoDuplicates(data, ['symbol', 'timestamp']);
        result.merge(duplicateResult);

        // Check OHLC consistency for each record with complete OHLC data
        for (const item of data) {
          if (
            item.open !== undefined &&
            item.high !== undefined &&
            item.low !== undefined &&
            item.close !== undefined
          ) {
            const ohlcResult = this.consistencyValidator.validateOHLCConsistency({
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
            });
            result.merge(ohlcResult);
          }
        }
      }

      // Anomaly detection
      if (options.categories?.anomaly !== false && data.length > 0) {
        const closePrices = data.filter((d) => d.close !== undefined).map((d) => d.close);
        if (closePrices.length > 4) {
          const outlierMultiplier = options.thresholds?.outlierMultiplier || 1.5;
          const outlierResult = this.anomalyDetector.detectOutliers(closePrices, outlierMultiplier);
          result.merge(outlierResult);
        }

        // Detect sudden changes
        const timeSeriesData = data.map((d) => ({
          timestamp: d.timestamp,
          value: d.close,
        }));
        const suddenChangePercent = options.thresholds?.suddenChangePercent || 20;
        const changeResult = this.anomalyDetector.detectSuddenChanges(timeSeriesData, suddenChangePercent);
        result.merge(changeResult);

        // Check for non-negative values where required
        for (const item of data) {
          if (item.volume !== undefined) {
            const volumeResult = this.anomalyDetector.validateNonNegativeFields(
              { volume: item.volume } as any,
              ['volume']
            );
            result.merge(volumeResult);
          }
        }
      }

      // Sequential validation
      if (options.categories?.sequential !== false && data.length > 1) {
        const timeSeriesData = data.map((d) => ({
          timestamp: d.timestamp,
          value: d.close,
        }));
        const chronoResult = this.sequentialValidator.validateChronologicalOrder(timeSeriesData);
        result.merge(chronoResult);
      }

      result.complete();

      // Store validation result in database
      await this.storeValidationResult(result, context);

      // Quarantine data if errors and option enabled
      if (result.hasErrors() && options.quarantineOnError) {
        await this.quarantineData(data, result, context);
      }

      return result;
    } catch (error) {
      result.addError({
        category: 'completeness',
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
      });
      result.complete();
      return result;
    }
  }

  /**
   * Store validation result in Prisma database
   */
  private async storeValidationResult(result: ValidationResult, context: ValidationContext): Promise<void> {
    try {
      await this.prisma.validationResult.create({
        data: {
          timestamp: new Date(),
          dataCount: context.dataCount || 0,
          errors: result.getErrors() as any,
          warnings: result.getWarnings() as any,
          score: result.calculateScore(),
          metadata: {
            context,
            summary: result.getSummary(),
          },
        },
      });
    } catch (error) {
      console.error('Failed to store validation result:', error);
    }
  }

  /**
   * Quarantine invalid data in Prisma database
   */
  private async quarantineData(data: any[], result: ValidationResult, context: ValidationContext): Promise<void> {
    try {
      await this.prisma.quarantinedData.create({
        data: {
          originalData: data as any,
          validationErrors: result.getErrors() as any,
          source: context.source || 'unknown',
          symbol: context.symbol,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to quarantine data:', error);
    }
  }

  /**
   * Get validation metrics for dashboard
   */
  async getValidationMetrics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.prisma.validationResult.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const totalValidations = results.length;
    const passedCount = results.filter((r) => r.score.toNumber() >= 0.8).length;
    const failedCount = results.filter((r) => r.score.toNumber() < 0.8).length;
    const scores = results.map((r) => r.score.toNumber()).sort((a, b) => a - b);

    return {
      totalValidations,
      passedCount,
      failedCount,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length || 0,
      p95Score: this.percentile(scores, 95),
      p99Score: this.percentile(scores, 99),
      recentResults: results.slice(0, 10),
    };
  }

  /**
   * Get quarantined data for review
   */
  async getQuarantinedData(reviewed: boolean = false) {
    return await this.prisma.quarantinedData.findMany({
      where: {
        reviewed,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });
  }

  /**
   * Review quarantined data
   */
  async reviewQuarantinedData(id: string, action: 'approved' | 'rejected' | 'modified', reviewedBy: string) {
    return await this.prisma.quarantinedData.update({
      where: { id },
      data: {
        reviewed: true,
        reviewedBy,
        reviewedAt: new Date(),
        action,
      },
    });
  }

  private percentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}
