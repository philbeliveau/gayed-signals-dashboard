/**
 * Scheduled Cleanup Job
 *
 * Automated job to run data cleanup based on retention policies.
 * Can be triggered by:
 * - Railway cron service (production)
 * - Node-cron (development)
 * - Manual execution
 *
 * Story 4.0b Task 3.4
 */

import { PrismaClient } from '@prisma/client';
import { DataCleanupService, FileArchiveStorage } from '../services/DataCleanupService';

/**
 * Execute cleanup job
 */
export async function executeScheduledCleanup(): Promise<void> {
  const prisma = new PrismaClient();
  const archiveStorage = new FileArchiveStorage(process.env.ARCHIVE_PATH || './archives');
  const cleanupService = new DataCleanupService(prisma, archiveStorage);

  console.log('[Cleanup Job] Starting scheduled cleanup...');
  const startTime = Date.now();

  try {
    const summary = await cleanupService.executeCleanup();

    console.log('[Cleanup Job] Cleanup completed successfully');
    console.log(`  - Total records identified: ${summary.totalRecordsIdentified}`);
    console.log(`  - Total records archived: ${summary.totalRecordsArchived}`);
    console.log(`  - Total records deleted: ${summary.totalRecordsDeleted}`);
    console.log(`  - Total records skipped: ${summary.totalRecordsSkipped}`);
    console.log(`  - Total errors: ${summary.totalErrors}`);
    console.log(`  - Execution time: ${summary.totalExecutionTimeMs}ms`);

    // Log per-data-type results
    for (const result of summary.results) {
      console.log(`  [${result.dataType}]`);
      console.log(`    - Identified: ${result.recordsIdentified}`);
      console.log(`    - Deleted: ${result.recordsDeleted}`);
      console.log(`    - Skipped: ${result.recordsSkipped}`);
      if (result.errors.length > 0) {
        console.log(`    - Errors: ${result.errors.join(', ')}`);
      }
    }

    // Alert on high error rate
    if (summary.totalErrors > 0) {
      console.warn(`[Cleanup Job] ${summary.totalErrors} errors occurred during cleanup`);
      // In production, this would send alerts via PagerDuty, Slack, etc.
    }

    // Alert on large deletion volumes
    if (summary.totalRecordsDeleted > 10000) {
      console.warn(`[Cleanup Job] Large deletion volume: ${summary.totalRecordsDeleted} records`);
      // In production, this would trigger a notification
    }

  } catch (error) {
    console.error('[Cleanup Job] Fatal error during cleanup:', error);
    // In production, this would send critical alerts
    throw error;
  } finally {
    await prisma.$disconnect();
    const duration = Date.now() - startTime;
    console.log(`[Cleanup Job] Total job duration: ${duration}ms`);
  }
}

/**
 * Preview cleanup without executing
 */
export async function previewScheduledCleanup(): Promise<void> {
  const prisma = new PrismaClient();
  const cleanupService = new DataCleanupService(prisma);

  console.log('[Cleanup Preview] Analyzing cleanup candidates...');

  try {
    const previews = await cleanupService.previewCleanup();

    console.log('[Cleanup Preview] Results:');
    for (const preview of previews) {
      console.log(`  - ${preview.dataType}: ${preview.expiredRecords} records (cutoff: ${preview.cutoffDate.toISOString()})`);
    }

  } catch (error) {
    console.error('[Cleanup Preview] Error during preview:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * CLI entry point for manual execution
 */
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'preview') {
    previewScheduledCleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Preview failed:', error);
        process.exit(1);
      });
  } else if (command === 'execute' || !command) {
    executeScheduledCleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node scheduled-cleanup.js [preview|execute]');
    console.log('  preview  - Show what would be deleted without executing');
    console.log('  execute  - Run cleanup (default)');
    process.exit(1);
  }
}
