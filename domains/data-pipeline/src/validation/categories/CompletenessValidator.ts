/**
 * Story 4.0c: CompletenessValidator
 * Validates data completeness - missing values, gaps, required fields
 */

import { ValidationResult } from '../core/ValidationResult';

export interface TimeSeriesData {
  timestamp: Date;
  value?: number;
  [key: string]: any;
}

export interface TimeGap {
  after: Date;
  before: Date;
  expectedNext: Date;
  actualNext: Date;
  gapSize: number;
}

export class CompletenessValidator {
  /**
   * Check for missing required fields
   */
  validateRequiredFields(data: Record<string, any>, requiredFields: string[]): ValidationResult {
    const result = new ValidationResult();
    const missing = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missing.length > 0) {
      result.addError({
        category: 'completeness',
        message: `Missing required fields: ${missing.join(', ')}`,
        code: 'MISSING_FIELDS',
        metadata: { missingFields: missing },
      });
    }

    return result;
  }

  /**
   * Check for gaps in time series data
   */
  async validateTimeSeriesGaps(
    data: TimeSeriesData[],
    expectedFrequency: 'daily' | 'hourly' | 'minute',
    tolerancePercent: number = 5
  ): Promise<ValidationResult> {
    const result = new ValidationResult();

    if (data.length < 2) {
      return result; // Not enough data to check gaps
    }

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const gaps: TimeGap[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const expectedNext = this.getNextExpectedTime(sorted[i - 1].timestamp, expectedFrequency);
      const actual = sorted[i].timestamp;
      const diff = Math.abs(actual.getTime() - expectedNext.getTime());

      // Check if gap exceeds tolerance
      const expectedInterval = this.getIntervalMs(expectedFrequency);
      const toleranceMs = expectedInterval * (tolerancePercent / 100);

      if (diff > toleranceMs) {
        gaps.push({
          after: sorted[i - 1].timestamp,
          before: sorted[i].timestamp,
          expectedNext,
          actualNext: actual,
          gapSize: diff / expectedInterval,
        });
      }
    }

    if (gaps.length > 0) {
      const severity = gaps.length > data.length * 0.1 ? 'error' : 'warning';
      result.addViolation({
        category: 'completeness',
        severity,
        message: `Found ${gaps.length} gaps in time series data`,
        code: 'TIME_SERIES_GAPS',
        metadata: {
          gaps: gaps.slice(0, 10), // First 10 gaps
          totalGaps: gaps.length,
          gapPercentage: (gaps.length / data.length) * 100,
        },
      });
    }

    return result;
  }

  /**
   * Check for missing data within expected date range
   */
  async validateDateRangeCoverage(
    data: { date: Date }[],
    expectedStart: Date,
    expectedEnd: Date,
    minimumCoverage: number = 95 // percent
  ): Promise<ValidationResult> {
    const result = new ValidationResult();

    const totalExpectedDays = this.getDaysBetween(expectedStart, expectedEnd);
    const actualDates = new Set(data.map((d) => d.date.toISOString().split('T')[0]));
    const actualDays = actualDates.size;

    const coveragePercent = (actualDays / totalExpectedDays) * 100;

    if (coveragePercent < minimumCoverage) {
      result.addError({
        category: 'completeness',
        message: `Data coverage ${coveragePercent.toFixed(1)}% below minimum ${minimumCoverage}%`,
        code: 'INSUFFICIENT_COVERAGE',
        metadata: {
          expectedDays: totalExpectedDays,
          actualDays,
          coveragePercent,
          missingDays: totalExpectedDays - actualDays,
        },
      });
    }

    return result;
  }

  private getNextExpectedTime(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'minute':
        next.setMinutes(next.getMinutes() + 1);
        break;
    }
    return next;
  }

  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'hourly':
        return 60 * 60 * 1000;
      case 'minute':
        return 60 * 1000;
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }

  private getDaysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  }
}
