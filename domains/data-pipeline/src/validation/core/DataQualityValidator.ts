/**
 * Story 4.0c: Base DataQualityValidator
 * Abstract base class for all validation categories
 */

import { PrismaClient } from '../../../generated/client';
import { ValidationResult, ValidationContext, ValidationCategory } from './ValidationResult';

export interface ValidationConfig {
  enabled?: boolean;
  categories?: {
    completeness?: boolean;
    freshness?: boolean;
    consistency?: boolean;
    anomaly?: boolean;
    sequential?: boolean;
  };
  thresholds?: {
    [key: string]: any;
  };
}

/**
 * Abstract base class for data quality validators
 */
export abstract class DataQualityValidator<T> {
  protected config: ValidationConfig;
  protected prisma: PrismaClient;

  constructor(config: ValidationConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;
  }

  /**
   * Main validation entry point - runs all enabled validators
   */
  async validate(data: T, context: ValidationContext): Promise<ValidationResult> {
    const result = new ValidationResult();

    // Check if validation is enabled
    if (this.config.enabled === false) {
      return result;
    }

    try {
      // Run validators in parallel for performance
      const validations = await Promise.allSettled([
        this.shouldRunCategory('completeness')
          ? this.validateCompleteness(data, context)
          : Promise.resolve(new ValidationResult()),
        this.shouldRunCategory('freshness')
          ? this.validateFreshness(data, context)
          : Promise.resolve(new ValidationResult()),
        this.shouldRunCategory('consistency')
          ? this.validateConsistency(data, context)
          : Promise.resolve(new ValidationResult()),
        this.shouldRunCategory('anomaly')
          ? this.validateAnomalies(data, context)
          : Promise.resolve(new ValidationResult()),
        this.shouldRunCategory('sequential')
          ? this.validateSequential(data, context)
          : Promise.resolve(new ValidationResult()),
      ]);

      // Aggregate results
      validations.forEach((v, index) => {
        if (v.status === 'fulfilled') {
          result.merge(v.value);
        } else {
          result.addError({
            category: this.getCategoryByIndex(index),
            message: `Validator failed: ${v.reason}`,
            code: 'VALIDATOR_ERROR',
            metadata: { error: v.reason instanceof Error ? v.reason.message : String(v.reason) },
          });
        }
      });

      result.complete();

      // Log validation results to database
      await this.logValidation(result, context);

      return result;
    } catch (error) {
      result.addError({
        category: 'completeness',
        message: `Validation process failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_PROCESS_ERROR',
      });
      result.complete();
      return result;
    }
  }

  /**
   * Check if a category should run
   */
  protected shouldRunCategory(category: ValidationCategory): boolean {
    if (!this.config.categories) return true;
    return this.config.categories[category] !== false;
  }

  /**
   * Get category name by index
   */
  protected getCategoryByIndex(index: number): ValidationCategory {
    const categories: ValidationCategory[] = ['completeness', 'freshness', 'consistency', 'anomaly', 'sequential'];
    return categories[index] || 'completeness';
  }

  /**
   * Log validation results to Prisma database
   */
  protected async logValidation(result: ValidationResult, context: ValidationContext): Promise<void> {
    try {
      await this.prisma.validationResult.create({
        data: {
          timestamp: new Date(),
          dataCount: 1, // Override in concrete implementations
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
      // Silent fail - don't break validation if logging fails
      console.error('Failed to log validation:', error);
    }
  }

  // Abstract methods to be implemented by concrete validators
  protected abstract validateCompleteness(data: T, context: ValidationContext): Promise<ValidationResult>;
  protected abstract validateFreshness(data: T, context: ValidationContext): Promise<ValidationResult>;
  protected abstract validateConsistency(data: T, context: ValidationContext): Promise<ValidationResult>;
  protected abstract validateAnomalies(data: T, context: ValidationContext): Promise<ValidationResult>;
  protected abstract validateSequential(data: T, context: ValidationContext): Promise<ValidationResult>;
}
