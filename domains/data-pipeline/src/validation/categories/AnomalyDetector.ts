/**
 * Story 4.0c: AnomalyDetector
 * Detects anomalies and outliers in data
 */

import { ValidationResult } from '../core/ValidationResult';
import { TimeSeriesData } from './CompletenessValidator';

export interface BusinessRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  validate: (data: any) => { message: string; metadata?: any } | null;
}

export class AnomalyDetector {
  /**
   * Detect outliers using IQR method
   */
  detectOutliers(data: number[], multiplier: number = 1.5): ValidationResult {
    const result = new ValidationResult();

    if (data.length < 4) {
      return result; // Not enough data for quartile analysis
    }

    const sorted = [...data].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const outliers = data.filter((v) => v < lowerBound || v > upperBound);

    if (outliers.length > 0) {
      const severity = outliers.length > data.length * 0.05 ? 'error' : 'warning';
      result.addViolation({
        category: 'anomaly',
        severity,
        message: `Detected ${outliers.length} outliers`,
        code: 'OUTLIERS_DETECTED',
        metadata: {
          outliers,
          outlierCount: outliers.length,
          totalCount: data.length,
          outlierPercent: (outliers.length / data.length) * 100,
          bounds: { lower: lowerBound, upper: upperBound },
          quartiles: { q1, q3, iqr },
        },
      });
    }

    return result;
  }

  /**
   * Detect sudden changes (spikes or drops)
   */
  detectSuddenChanges(data: TimeSeriesData[], thresholdPercent: number = 20): ValidationResult {
    const result = new ValidationResult();
    const changes: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].value;
      const curr = data[i].value;

      if (prev === undefined || curr === undefined) continue;
      if (prev === 0) continue; // Skip division by zero

      const changePercent = Math.abs((curr - prev) / prev) * 100;

      if (changePercent > thresholdPercent) {
        changes.push({
          timestamp: data[i].timestamp,
          previousValue: prev,
          currentValue: curr,
          changePercent,
          changeDirection: curr > prev ? 'spike' : 'drop',
        });
      }
    }

    if (changes.length > 0) {
      result.addWarning({
        category: 'anomaly',
        message: `Detected ${changes.length} sudden changes exceeding ${thresholdPercent}%`,
        code: 'SUDDEN_CHANGES',
        metadata: {
          changes: changes.slice(0, 10),
          totalChanges: changes.length,
          threshold: thresholdPercent,
        },
      });
    }

    return result;
  }

  /**
   * Detect impossible values based on business rules
   */
  validateBusinessRules(data: any, rules: BusinessRule[]): ValidationResult {
    const result = new ValidationResult();

    for (const rule of rules) {
      const violation = rule.validate(data);
      if (violation) {
        result.addViolation({
          category: 'anomaly',
          severity: rule.severity,
          message: violation.message,
          code: 'BUSINESS_RULE_VIOLATION',
          metadata: {
            rule: rule.name,
            ...violation.metadata,
          },
        });
      }
    }

    return result;
  }

  /**
   * Detect zero or null values that shouldn't exist
   */
  validateNonZeroFields(data: Record<string, number | null | undefined>, fields: string[]): ValidationResult {
    const result = new ValidationResult();
    const zeroFields = fields.filter((f) => data[f] === 0 || data[f] === null || data[f] === undefined);

    if (zeroFields.length > 0) {
      result.addError({
        category: 'anomaly',
        message: `Found zero/null values in fields that should have data: ${zeroFields.join(', ')}`,
        code: 'UNEXPECTED_ZERO_VALUES',
        metadata: { zeroFields },
      });
    }

    return result;
  }

  /**
   * Detect negative values where they shouldn't exist
   */
  validateNonNegativeFields(data: Record<string, number>, fields: string[]): ValidationResult {
    const result = new ValidationResult();
    const negativeFields = fields.filter((f) => data[f] !== undefined && data[f] < 0);

    if (negativeFields.length > 0) {
      result.addError({
        category: 'anomaly',
        message: `Found negative values in fields that should be non-negative: ${negativeFields.join(', ')}`,
        code: 'UNEXPECTED_NEGATIVE_VALUES',
        metadata: {
          negativeFields,
          values: negativeFields.reduce((acc, f) => {
            acc[f] = data[f];
            return acc;
          }, {} as Record<string, number>),
        },
      });
    }

    return result;
  }

  private percentile(sorted: number[], percentile: number): number {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}
