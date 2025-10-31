/**
 * Story 4.0c: FreshnessValidator
 * Validates data freshness - staleness detection
 */

import { ValidationResult } from '../core/ValidationResult';
import { TimeSeriesData } from './CompletenessValidator';

export class FreshnessValidator {
  /**
   * Check if data is within acceptable age
   */
  validateDataAge(data: { timestamp: Date }, maxAgeHours: number): ValidationResult {
    const result = new ValidationResult();
    const now = new Date();
    const ageMs = now.getTime() - data.timestamp.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) {
      result.addWarning({
        category: 'freshness',
        message: `Data is ${ageHours.toFixed(1)} hours old, exceeds maximum of ${maxAgeHours} hours`,
        code: 'STALE_DATA',
        metadata: {
          dataTimestamp: data.timestamp,
          currentTime: now,
          ageHours,
          maxAgeHours,
        },
      });
    }

    return result;
  }

  /**
   * Check if latest data point is recent enough
   */
  async validateLatestDataPoint(
    data: { timestamp: Date }[],
    maxAgeHours: number
  ): Promise<ValidationResult> {
    const result = new ValidationResult();

    if (!data || data.length === 0) {
      result.addError({
        category: 'freshness',
        message: 'No data found',
        code: 'NO_DATA',
      });
      return result;
    }

    // Find latest data point
    const latest = data.reduce((max, item) =>
      item.timestamp > max.timestamp ? item : max
    );

    const ageResult = this.validateDataAge(latest, maxAgeHours);
    result.merge(ageResult);

    return result;
  }

  /**
   * Check for expected update frequency
   */
  async validateUpdateFrequency(
    data: TimeSeriesData[],
    expectedFrequency: 'daily' | 'hourly' | 'realtime',
    lookbackPeriod: number = 7 // days
  ): Promise<ValidationResult> {
    const result = new ValidationResult();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackPeriod);

    const recentData = data.filter((d) => d.timestamp >= cutoffDate);

    if (recentData.length === 0) {
      result.addError({
        category: 'freshness',
        message: `No data updates in the last ${lookbackPeriod} days`,
        code: 'NO_RECENT_UPDATES',
        metadata: { lookbackPeriod, cutoffDate },
      });
      return result;
    }

    // Calculate actual update frequency
    const sortedData = [...recentData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const intervals: number[] = [];
    for (let i = 1; i < sortedData.length; i++) {
      const interval = sortedData[i].timestamp.getTime() - sortedData[i - 1].timestamp.getTime();
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgIntervalHours = avgInterval / (1000 * 60 * 60);

    // Validate against expected frequency
    const expectedIntervalHours = this.getExpectedInterval(expectedFrequency);
    const tolerance = 0.5; // 50% tolerance

    if (Math.abs(avgIntervalHours - expectedIntervalHours) > expectedIntervalHours * tolerance) {
      result.addWarning({
        category: 'freshness',
        message: `Average update interval ${avgIntervalHours.toFixed(1)}h differs from expected ${expectedIntervalHours}h`,
        code: 'IRREGULAR_UPDATES',
        metadata: {
          expectedIntervalHours,
          actualIntervalHours: avgIntervalHours,
          sampleSize: intervals.length,
        },
      });
    }

    return result;
  }

  private getExpectedInterval(frequency: string): number {
    switch (frequency) {
      case 'daily':
        return 24;
      case 'hourly':
        return 1;
      case 'realtime':
        return 0.016; // ~1 minute
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }
}
