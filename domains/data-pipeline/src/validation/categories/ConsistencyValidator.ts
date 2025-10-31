/**
 * Story 4.0c: ConsistencyValidator
 * Validates data consistency - duplicates, conflicts, referential integrity
 */

import { ValidationResult } from '../core/ValidationResult';

export interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  [key: string]: any;
}

export class ConsistencyValidator {
  /**
   * Check for duplicate records
   */
  async validateNoDuplicates(data: any[], uniqueKeys: string[]): Promise<ValidationResult> {
    const result = new ValidationResult();
    const seen = new Map<string, number>();
    const duplicates: any[] = [];

    data.forEach((item, index) => {
      const key = uniqueKeys.map((k) => item[k]).join('|');
      if (seen.has(key)) {
        duplicates.push({
          index,
          firstSeenAt: seen.get(key),
          item,
        });
      } else {
        seen.set(key, index);
      }
    });

    if (duplicates.length > 0) {
      result.addError({
        category: 'consistency',
        message: `Found ${duplicates.length} duplicate records`,
        code: 'DUPLICATE_RECORDS',
        metadata: {
          duplicates: duplicates.slice(0, 10), // First 10
          totalDuplicates: duplicates.length,
          uniqueKeys,
        },
      });
    }

    return result;
  }

  /**
   * Check for conflicting values (same key, different values)
   */
  async validateNoConflicts(
    data: any[],
    keyFields: string[],
    valueFields: string[]
  ): Promise<ValidationResult> {
    const result = new ValidationResult();
    const groups = new Map<string, any[]>();

    // Group by key fields
    data.forEach((item) => {
      const key = keyFields.map((k) => item[k]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    const conflicts: any[] = [];

    // Check for conflicting values within each group
    groups.forEach((items, key) => {
      if (items.length > 1) {
        const firstItem = items[0];
        for (let i = 1; i < items.length; i++) {
          const differentFields = valueFields.filter((field) => firstItem[field] !== items[i][field]);

          if (differentFields.length > 0) {
            conflicts.push({
              key,
              conflictingFields: differentFields,
              values: items.map((item) =>
                differentFields.reduce((acc, field) => {
                  acc[field] = item[field];
                  return acc;
                }, {} as Record<string, any>)
              ),
            });
          }
        }
      }
    });

    if (conflicts.length > 0) {
      result.addError({
        category: 'consistency',
        message: `Found ${conflicts.length} conflicting records`,
        code: 'CONFLICTING_VALUES',
        metadata: {
          conflicts: conflicts.slice(0, 10),
          totalConflicts: conflicts.length,
        },
      });
    }

    return result;
  }

  /**
   * Validate OHLC consistency (Open, High, Low, Close)
   */
  validateOHLCConsistency(data: OHLCData): ValidationResult {
    const result = new ValidationResult();
    const errors: string[] = [];

    // High should be >= Low
    if (data.high < data.low) {
      errors.push(`High (${data.high}) < Low (${data.low})`);
    }

    // High should be >= Open and Close
    if (data.high < data.open) {
      errors.push(`High (${data.high}) < Open (${data.open})`);
    }
    if (data.high < data.close) {
      errors.push(`High (${data.high}) < Close (${data.close})`);
    }

    // Low should be <= Open and Close
    if (data.low > data.open) {
      errors.push(`Low (${data.low}) > Open (${data.open})`);
    }
    if (data.low > data.close) {
      errors.push(`Low (${data.low}) > Close (${data.close})`);
    }

    if (errors.length > 0) {
      result.addError({
        category: 'consistency',
        message: 'OHLC values are inconsistent',
        code: 'INVALID_OHLC',
        metadata: {
          data,
          violations: errors,
        },
      });
    }

    return result;
  }

  /**
   * Check referential integrity
   */
  async validateReferentialIntegrity(
    foreignKeys: Array<{ table: string; id: any }>,
    checkExists: (table: string, id: any) => Promise<boolean>
  ): Promise<ValidationResult> {
    const result = new ValidationResult();
    const missing: any[] = [];

    for (const fk of foreignKeys) {
      const exists = await checkExists(fk.table, fk.id);
      if (!exists) {
        missing.push(fk);
      }
    }

    if (missing.length > 0) {
      result.addError({
        category: 'consistency',
        message: `Found ${missing.length} missing foreign key references`,
        code: 'BROKEN_REFERENCES',
        metadata: { missing },
      });
    }

    return result;
  }
}
