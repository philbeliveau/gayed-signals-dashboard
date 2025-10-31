/**
 * Story 4.0c: SequentialValidator
 * Validates sequential and ordering constraints
 */

import { ValidationResult } from '../core/ValidationResult';
import { TimeSeriesData } from './CompletenessValidator';

export class SequentialValidator {
  /**
   * Validate chronological order
   */
  validateChronologicalOrder(data: TimeSeriesData[]): ValidationResult {
    const result = new ValidationResult();
    const outOfOrder: any[] = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i].timestamp < data[i - 1].timestamp) {
        outOfOrder.push({
          index: i,
          current: data[i].timestamp,
          previous: data[i - 1].timestamp,
        });
      }
    }

    if (outOfOrder.length > 0) {
      result.addError({
        category: 'sequential',
        message: `Found ${outOfOrder.length} out-of-order timestamps`,
        code: 'OUT_OF_ORDER',
        metadata: {
          outOfOrder: outOfOrder.slice(0, 10),
          totalOutOfOrder: outOfOrder.length,
        },
      });
    }

    return result;
  }

  /**
   * Validate monotonic increasing sequence
   */
  validateMonotonicIncreasing(data: number[], strict: boolean = false): ValidationResult {
    const result = new ValidationResult();
    const violations: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const isViolation = strict ? data[i] <= data[i - 1] : data[i] < data[i - 1];

      if (isViolation) {
        violations.push({
          index: i,
          current: data[i],
          previous: data[i - 1],
        });
      }
    }

    if (violations.length > 0) {
      result.addError({
        category: 'sequential',
        message: `Sequence is not monotonic increasing (${violations.length} violations)`,
        code: 'NOT_MONOTONIC',
        metadata: { violations: violations.slice(0, 10), strict },
      });
    }

    return result;
  }

  /**
   * Validate monotonic decreasing sequence
   */
  validateMonotonicDecreasing(data: number[], strict: boolean = false): ValidationResult {
    const result = new ValidationResult();
    const violations: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const isViolation = strict ? data[i] >= data[i - 1] : data[i] > data[i - 1];

      if (isViolation) {
        violations.push({
          index: i,
          current: data[i],
          previous: data[i - 1],
        });
      }
    }

    if (violations.length > 0) {
      result.addError({
        category: 'sequential',
        message: `Sequence is not monotonic decreasing (${violations.length} violations)`,
        code: 'NOT_MONOTONIC_DECREASING',
        metadata: { violations: violations.slice(0, 10), strict },
      });
    }

    return result;
  }

  /**
   * Validate continuous sequence (no jumps in IDs, dates, etc.)
   */
  validateContinuousSequence(data: { sequence: number }[], allowedGap: number = 1): ValidationResult {
    const result = new ValidationResult();
    const gaps: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const expectedNext = data[i - 1].sequence + allowedGap;
      const actual = data[i].sequence;

      if (actual !== expectedNext) {
        gaps.push({
          index: i,
          expected: expectedNext,
          actual,
          gapSize: actual - expectedNext,
        });
      }
    }

    if (gaps.length > 0) {
      result.addWarning({
        category: 'sequential',
        message: `Found ${gaps.length} gaps in sequence`,
        code: 'SEQUENCE_GAPS',
        metadata: {
          gaps: gaps.slice(0, 10),
          totalGaps: gaps.length,
        },
      });
    }

    return result;
  }

  /**
   * Validate that data is sorted in specified order
   */
  validateSortOrder<T>(
    data: T[],
    compareFunction: (a: T, b: T) => number,
    order: 'ascending' | 'descending' = 'ascending'
  ): ValidationResult {
    const result = new ValidationResult();
    const violations: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const comparison = compareFunction(data[i - 1], data[i]);
      const isViolation =
        order === 'ascending' ? comparison > 0 : comparison < 0;

      if (isViolation) {
        violations.push({
          index: i,
          previousIndex: i - 1,
        });
      }
    }

    if (violations.length > 0) {
      result.addError({
        category: 'sequential',
        message: `Data is not sorted in ${order} order (${violations.length} violations)`,
        code: 'NOT_SORTED',
        metadata: {
          violations: violations.slice(0, 10),
          totalViolations: violations.length,
          expectedOrder: order,
        },
      });
    }

    return result;
  }
}
