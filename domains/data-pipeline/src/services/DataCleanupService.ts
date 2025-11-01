/**
 * Data Cleanup Service
 *
 * Handles automated cleanup of expired data based on retention policies.
 * Supports archiving, soft delete, and hard delete operations.
 *
 * Story 4.0b Task 3.2
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  RetentionPolicy,
  getActiveRetentionPolicies,
  calculateCutoffDate
} from '../config/retention-policies';

export interface CleanupResult {
  dataType: string;
  recordsIdentified: number;
  recordsArchived: number;
  recordsDeleted: number;
  recordsSkipped: number;
  errors: string[];
  executionTimeMs: number;
}

export interface CleanupSummary {
  totalRecordsIdentified: number;
  totalRecordsArchived: number;
  totalRecordsDeleted: number;
  totalRecordsSkipped: number;
  totalErrors: number;
  results: CleanupResult[];
  startTime: Date;
  endTime: Date;
  totalExecutionTimeMs: number;
}

/**
 * Archive storage interface for abstraction
 */
export interface ArchiveStorage {
  archiveRecords(dataType: string, records: any[]): Promise<boolean>;
}

/**
 * Simple file-based archive storage (can be replaced with S3, etc.)
 */
export class FileArchiveStorage implements ArchiveStorage {
  constructor(private archivePath: string) {}

  async archiveRecords(dataType: string, records: any[]): Promise<boolean> {
    // In production, this would write to S3, Railway volumes, etc.
    // For now, we'll just log the archive operation
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.archivePath}/${dataType}_${timestamp}.json`;

    console.log(`[Archive] Would archive ${records.length} ${dataType} records to ${filename}`);
    // TODO: Implement actual file/S3 write
    return true;
  }
}

/**
 * Main data cleanup service
 */
export class DataCleanupService {
  constructor(
    private prisma: PrismaClient,
    private archiveStorage?: ArchiveStorage
  ) {}

  /**
   * Execute cleanup for all active retention policies
   */
  async executeCleanup(): Promise<CleanupSummary> {
    const startTime = new Date();
    const policies = getActiveRetentionPolicies();
    const results: CleanupResult[] = [];

    console.log(`[Cleanup] Starting cleanup for ${policies.length} data types`);

    for (const policy of policies) {
      try {
        const result = await this.cleanupDataType(policy);
        results.push(result);
      } catch (error) {
        console.error(`[Cleanup] Failed to cleanup ${policy.dataType}:`, error);
        results.push({
          dataType: policy.dataType,
          recordsIdentified: 0,
          recordsArchived: 0,
          recordsDeleted: 0,
          recordsSkipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          executionTimeMs: 0
        });
      }
    }

    const endTime = new Date();

    return {
      totalRecordsIdentified: results.reduce((sum, r) => sum + r.recordsIdentified, 0),
      totalRecordsArchived: results.reduce((sum, r) => sum + r.recordsArchived, 0),
      totalRecordsDeleted: results.reduce((sum, r) => sum + r.recordsDeleted, 0),
      totalRecordsSkipped: results.reduce((sum, r) => sum + r.recordsSkipped, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      results,
      startTime,
      endTime,
      totalExecutionTimeMs: endTime.getTime() - startTime.getTime()
    };
  }

  /**
   * Cleanup data for a specific data type based on its retention policy
   */
  async cleanupDataType(policy: RetentionPolicy): Promise<CleanupResult> {
    const startTime = Date.now();
    const cutoffDate = calculateCutoffDate(policy);
    const errors: string[] = [];

    console.log(`[Cleanup] Processing ${policy.dataType} (cutoff: ${cutoffDate.toISOString()})`);

    let recordsIdentified = 0;
    let recordsArchived = 0;
    let recordsDeleted = 0;
    let recordsSkipped = 0;

    try {
      // Identify records to clean up
      const expiredRecords = await this.identifyExpiredRecords(policy.dataType, cutoffDate);
      recordsIdentified = expiredRecords.length;

      console.log(`[Cleanup] Found ${recordsIdentified} expired ${policy.dataType} records`);

      // Check minimum records threshold
      if (policy.minimumRecordsToKeep) {
        const totalRecords = await this.countTotalRecords(policy.dataType);
        const recordsAfterCleanup = totalRecords - recordsIdentified;

        if (recordsAfterCleanup < policy.minimumRecordsToKeep) {
          const canDelete = totalRecords - policy.minimumRecordsToKeep;
          recordsSkipped = recordsIdentified - canDelete;
          console.log(
            `[Cleanup] Skipping ${recordsSkipped} records to maintain minimum of ${policy.minimumRecordsToKeep}`
          );

          // Only delete what we can while maintaining minimum
          expiredRecords.splice(0, recordsSkipped);
        }
      }

      // Archive before delete if configured
      if (policy.archiveBeforeDelete && expiredRecords.length > 0 && this.archiveStorage) {
        console.log(`[Cleanup] Archiving ${expiredRecords.length} ${policy.dataType} records`);
        const archived = await this.archiveStorage.archiveRecords(policy.dataType, expiredRecords);
        if (archived) {
          recordsArchived = expiredRecords.length;
        } else {
          errors.push('Archive operation failed');
          // Don't delete if archiving failed
          return {
            dataType: policy.dataType,
            recordsIdentified,
            recordsArchived: 0,
            recordsDeleted: 0,
            recordsSkipped: expiredRecords.length,
            errors,
            executionTimeMs: Date.now() - startTime
          };
        }
      }

      // Execute deletion
      if (expiredRecords.length > 0) {
        recordsDeleted = await this.deleteRecords(policy.dataType, expiredRecords, policy.useSoftDelete);
        console.log(`[Cleanup] Deleted ${recordsDeleted} ${policy.dataType} records`);

        // Log cleanup to provenance
        await this.logCleanupToProvenance(policy.dataType, recordsDeleted, cutoffDate);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error(`[Cleanup] Error during cleanup:`, error);
    }

    return {
      dataType: policy.dataType,
      recordsIdentified,
      recordsArchived,
      recordsDeleted,
      recordsSkipped,
      errors,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Identify expired records for a data type
   */
  private async identifyExpiredRecords(dataType: string, cutoffDate: Date): Promise<any[]> {
    switch (dataType) {
      case 'market_data':
        return await this.prisma.marketData.findMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

      case 'data_provenance':
        return await this.prisma.dataProvenance.findMany({
          where: {
            requestTimestamp: {
              lt: cutoffDate
            }
          },
          orderBy: {
            requestTimestamp: 'asc'
          }
        });

      case 'signal_history':
        return await this.prisma.signalHistory.findMany({
          where: {
            calculationTimestamp: {
              lt: cutoffDate
            }
          },
          orderBy: {
            calculationTimestamp: 'asc'
          }
        });

      case 'cache_metadata':
        return await this.prisma.cacheMetadata.findMany({
          where: {
            createdAt: {
              lt: cutoffDate
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

      case 'data_source_health':
        return await this.prisma.dataSourceHealth.findMany({
          where: {
            lastCheckAt: {
              lt: cutoffDate
            }
          },
          orderBy: {
            lastCheckAt: 'asc'
          }
        });

      default:
        console.warn(`[Cleanup] Unknown data type: ${dataType}`);
        return [];
    }
  }

  /**
   * Count total records for a data type
   */
  private async countTotalRecords(dataType: string): Promise<number> {
    switch (dataType) {
      case 'market_data':
        return await this.prisma.marketData.count();
      case 'data_provenance':
        return await this.prisma.dataProvenance.count();
      case 'signal_history':
        return await this.prisma.signalHistory.count();
      case 'cache_metadata':
        return await this.prisma.cacheMetadata.count();
      case 'data_source_health':
        return await this.prisma.dataSourceHealth.count();
      default:
        return 0;
    }
  }

  /**
   * Delete records (hard delete or soft delete)
   */
  private async deleteRecords(dataType: string, records: any[], useSoftDelete: boolean): Promise<number> {
    const ids = records.map(r => r.id);
    const now = new Date();

    if (useSoftDelete) {
      console.log(`[Cleanup] Soft deleting ${ids.length} ${dataType} records`);
      return await this.softDeleteRecords(dataType, ids, now);
    }

    // Hard delete
    console.log(`[Cleanup] Hard deleting ${ids.length} ${dataType} records`);
    return await this.hardDeleteRecords(dataType, ids);
  }

  /**
   * Soft delete records by setting deleted_at timestamp
   */
  private async softDeleteRecords(dataType: string, ids: any[], deletedAt: Date): Promise<number> {
    switch (dataType) {
      case 'market_data':
        const marketResult = await this.prisma.marketData.updateMany({
          where: { id: { in: ids as number[] } },
          data: { deletedAt }
        });
        return marketResult.count;

      case 'data_provenance':
        const provResult = await this.prisma.dataProvenance.updateMany({
          where: { id: { in: ids as number[] } },
          data: { deletedAt }
        });
        return provResult.count;

      case 'signal_history':
        const signalResult = await this.prisma.signalHistory.updateMany({
          where: { id: { in: ids as number[] } },
          data: { deletedAt }
        });
        return signalResult.count;

      case 'cache_metadata':
        const cacheResult = await this.prisma.cacheMetadata.updateMany({
          where: { id: { in: ids as number[] } },
          data: { deletedAt }
        });
        return cacheResult.count;

      case 'data_source_health':
        const healthResult = await this.prisma.dataSourceHealth.updateMany({
          where: { id: { in: ids as string[] } },
          data: { deletedAt }
        });
        return healthResult.count;

      default:
        return 0;
    }
  }

  /**
   * Hard delete records permanently
   */
  private async hardDeleteRecords(dataType: string, ids: any[]): Promise<number> {
    switch (dataType) {
      case 'market_data':
        const marketResult = await this.prisma.marketData.deleteMany({
          where: { id: { in: ids as number[] } }
        });
        return marketResult.count;

      case 'data_provenance':
        const provResult = await this.prisma.dataProvenance.deleteMany({
          where: { id: { in: ids as number[] } }
        });
        return provResult.count;

      case 'signal_history':
        const signalResult = await this.prisma.signalHistory.deleteMany({
          where: { id: { in: ids as number[] } }
        });
        return signalResult.count;

      case 'cache_metadata':
        const cacheResult = await this.prisma.cacheMetadata.deleteMany({
          where: { id: { in: ids as number[] } }
        });
        return cacheResult.count;

      case 'data_source_health':
        const healthResult = await this.prisma.dataSourceHealth.deleteMany({
          where: { id: { in: ids as string[] } }
        });
        return healthResult.count;

      default:
        return 0;
    }
  }

  /**
   * Restore soft-deleted records
   */
  async restoreSoftDeleted(dataType: string, ids: any[]): Promise<number> {
    console.log(`[Cleanup] Restoring ${ids.length} soft-deleted ${dataType} records`);

    switch (dataType) {
      case 'market_data':
        const marketResult = await this.prisma.marketData.updateMany({
          where: { id: { in: ids as number[] }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        return marketResult.count;

      case 'data_provenance':
        const provResult = await this.prisma.dataProvenance.updateMany({
          where: { id: { in: ids as number[] }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        return provResult.count;

      case 'signal_history':
        const signalResult = await this.prisma.signalHistory.updateMany({
          where: { id: { in: ids as number[] }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        return signalResult.count;

      case 'cache_metadata':
        const cacheResult = await this.prisma.cacheMetadata.updateMany({
          where: { id: { in: ids as number[] }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        return cacheResult.count;

      case 'data_source_health':
        const healthResult = await this.prisma.dataSourceHealth.updateMany({
          where: { id: { in: ids as string[] }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        return healthResult.count;

      default:
        return 0;
    }
  }

  /**
   * Log cleanup operation to provenance for audit trail
   */
  private async logCleanupToProvenance(
    dataType: string,
    recordsDeleted: number,
    cutoffDate: Date
  ): Promise<void> {
    await this.prisma.dataProvenance.create({
      data: {
        sourceSystem: 'data_cleanup_service',
        sourceEndpoint: `/cleanup/${dataType}`,
        sourceQueryParams: {
          cutoffDate: cutoffDate.toISOString(),
          recordsDeleted
        },
        requestTimestamp: new Date(),
        responseTimestamp: new Date(),
        responseStatus: 200,
        recordsReceived: recordsDeleted,
        recordsValid: recordsDeleted,
        transformationApplied: 'cleanup',
        status: 'completed'
      }
    });
  }

  /**
   * Cleanup a specific data type by name
   */
  async cleanupSpecificType(dataType: string): Promise<CleanupResult> {
    const policy = getActiveRetentionPolicies().find(p => p.dataType === dataType);

    if (!policy) {
      throw new Error(`No retention policy found for data type: ${dataType}`);
    }

    return await this.cleanupDataType(policy);
  }

  /**
   * Preview cleanup (identify records without deleting)
   */
  async previewCleanup(): Promise<{ dataType: string; expiredRecords: number; cutoffDate: Date }[]> {
    const policies = getActiveRetentionPolicies();
    const previews = [];

    for (const policy of policies) {
      const cutoffDate = calculateCutoffDate(policy);
      const expiredRecords = await this.identifyExpiredRecords(policy.dataType, cutoffDate);

      previews.push({
        dataType: policy.dataType,
        expiredRecords: expiredRecords.length,
        cutoffDate
      });
    }

    return previews;
  }
}
