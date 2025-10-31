/**
 * Data Retention Policy Configuration
 *
 * Defines retention periods for different data types and cleanup behavior.
 * Story 4.0b Task 3.1
 */

export interface RetentionPolicy {
  /** Data type identifier (e.g., 'market_data', 'signal_history') */
  dataType: string;

  /** Number of days to retain data before cleanup */
  retentionDays: number;

  /** Whether to archive data before deletion */
  archiveBeforeDelete: boolean;

  /** Whether to compress archived data */
  compressionEnabled: boolean;

  /** Whether to use soft delete (set deleted_at) instead of hard delete */
  useSoftDelete: boolean;

  /** Minimum records to keep regardless of age (0 = no minimum) */
  minimumRecordsToKeep?: number;

  /** Whether this policy is currently active */
  enabled: boolean;
}

/**
 * Default retention policies for the data pipeline
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  // Market data - keep 2 years of historical data
  {
    dataType: 'market_data',
    retentionDays: 730, // 2 years
    archiveBeforeDelete: true,
    compressionEnabled: true,
    useSoftDelete: false,
    minimumRecordsToKeep: 1000,
    enabled: true
  },

  // Data provenance - keep 1 year for audit trail
  {
    dataType: 'data_provenance',
    retentionDays: 365, // 1 year
    archiveBeforeDelete: true,
    compressionEnabled: true,
    useSoftDelete: false,
    minimumRecordsToKeep: 500,
    enabled: true
  },

  // Signal history - keep 5 years for backtesting
  {
    dataType: 'signal_history',
    retentionDays: 1825, // 5 years
    archiveBeforeDelete: true,
    compressionEnabled: true,
    useSoftDelete: false,
    minimumRecordsToKeep: 2000,
    enabled: true
  },

  // Cache metadata - keep 30 days
  {
    dataType: 'cache_metadata',
    retentionDays: 30,
    archiveBeforeDelete: false,
    compressionEnabled: false,
    useSoftDelete: false,
    enabled: true
  },

  // Data source health - keep 90 days
  {
    dataType: 'data_source_health',
    retentionDays: 90,
    archiveBeforeDelete: false,
    compressionEnabled: false,
    useSoftDelete: false,
    enabled: true
  }
];

/**
 * Get retention policy for a specific data type
 */
export function getRetentionPolicy(dataType: string): RetentionPolicy | null {
  return DEFAULT_RETENTION_POLICIES.find(p => p.dataType === dataType) || null;
}

/**
 * Get all active retention policies
 */
export function getActiveRetentionPolicies(): RetentionPolicy[] {
  return DEFAULT_RETENTION_POLICIES.filter(p => p.enabled);
}

/**
 * Calculate cutoff date for a retention policy
 */
export function calculateCutoffDate(policy: RetentionPolicy): Date {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
  return cutoffDate;
}

/**
 * Validate retention policy configuration
 */
export function validateRetentionPolicy(policy: RetentionPolicy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy.dataType || policy.dataType.trim() === '') {
    errors.push('dataType is required');
  }

  if (policy.retentionDays <= 0) {
    errors.push('retentionDays must be positive');
  }

  if (policy.retentionDays < 7) {
    errors.push('retentionDays must be at least 7 days for safety');
  }

  if (policy.minimumRecordsToKeep !== undefined && policy.minimumRecordsToKeep < 0) {
    errors.push('minimumRecordsToKeep cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Environment-based retention policy overrides
 */
export function getRetentionPolicyForEnvironment(
  dataType: string,
  environment: 'development' | 'staging' | 'production' = 'production'
): RetentionPolicy | null {
  const basePolicy = getRetentionPolicy(dataType);
  if (!basePolicy) return null;

  // In development, reduce retention periods for faster testing
  if (environment === 'development') {
    return {
      ...basePolicy,
      retentionDays: Math.min(basePolicy.retentionDays, 30), // Max 30 days in dev
      archiveBeforeDelete: false, // Skip archiving in dev
      compressionEnabled: false
    };
  }

  // In staging, use moderate retention
  if (environment === 'staging') {
    return {
      ...basePolicy,
      retentionDays: Math.floor(basePolicy.retentionDays / 2), // Half of production
      archiveBeforeDelete: basePolicy.archiveBeforeDelete,
      compressionEnabled: false // Skip compression in staging
    };
  }

  return basePolicy;
}
