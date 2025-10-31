# Data Cleanup Cron Configuration

## Overview

The data cleanup job runs automated retention policy enforcement based on configured schedules.

## Railway Cron Setup

Railway supports cron jobs through their scheduled jobs feature.

### Configuration

1. **Create cron service in Railway dashboard**:
   - Add new service → Cron Job
   - Link to data-pipeline service
   - Set schedule using cron expression

2. **Recommended Schedule**:
   ```cron
   0 2 * * * # Daily at 2:00 AM UTC
   ```

3. **Command**:
   ```bash
   npm run cleanup:execute
   ```

### Alternative: Node-Cron (Development)

For local development or self-hosted deployments:

```typescript
// src/jobs/cron-scheduler.ts
import cron from 'node-cron';
import { executeScheduledCleanup } from './scheduled-cleanup';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Triggering scheduled cleanup...');
  await executeScheduledCleanup();
});
```

## Manual Execution

### Preview (Dry Run)
```bash
cd domains/data-pipeline
npm run cleanup:preview
```

### Execute Cleanup
```bash
cd domains/data-pipeline
npm run cleanup:execute
```

## Monitoring

### Logs
- Railway: View logs in Railway dashboard under cron service
- Local: Logs written to console with `[Cleanup Job]` prefix

### Alerts
The cleanup job will log warnings for:
- High error rates during cleanup
- Large deletion volumes (>10,000 records)
- Individual data type failures

### Metrics to Monitor
- Total records deleted per run
- Execution time per run
- Error count per run
- Records skipped (minimum threshold protection)

## Retention Policy Configuration

Default policies in `src/config/retention-policies.ts`:

```typescript
- market_data: 730 days (2 years)
- data_provenance: 365 days (1 year)
- signal_history: 1825 days (5 years)
- cache_metadata: 30 days
- data_source_health: 90 days
```

## Environment Variables

```bash
# Archive path for backup before deletion
ARCHIVE_PATH=/path/to/archives

# Database connection (Railway auto-provides)
DATABASE_URL=postgresql://...
```

## Rollback Procedures

### If cleanup deletes too much data:

1. **Soft Delete Mode** (recommended):
   - Records marked with `deleted_at` timestamp
   - Can be restored using:
   ```typescript
   await cleanupService.restoreSoftDeleted('market_data', [ids]);
   ```

2. **Hard Delete Mode**:
   - Records permanently deleted
   - Must restore from Railway automatic backups
   - Railway maintains 30-day backup history

3. **Archive Recovery**:
   - If archiving was enabled, restore from archive files
   - Archives stored in ARCHIVE_PATH directory

## Safety Features

1. **Minimum Record Thresholds**: Each policy can specify minimum records to keep
2. **Archiving**: Data backed up before deletion when enabled
3. **Soft Delete**: Records marked as deleted, not removed immediately
4. **Preview Mode**: Test cleanup without executing
5. **Audit Trail**: All cleanup operations logged to provenance table

## Troubleshooting

### Cleanup fails with database errors
- Check Railway database status
- Verify DATABASE_URL connection string
- Check disk space on Railway PostgreSQL

### Cleanup takes too long
- Review retention policies (may be too aggressive)
- Check database indexes
- Consider increasing Railway database resources

### Records not being deleted
- Verify retention policies are enabled
- Check minimum record thresholds
- Review cleanup job logs for errors
