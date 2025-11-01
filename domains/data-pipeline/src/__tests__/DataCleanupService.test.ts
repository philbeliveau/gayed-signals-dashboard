/**
 * Data Cleanup Service Tests
 *
 * Tests for retention policies and automated cleanup
 * Story 4.0b Task 3
 */

import { PrismaClient } from '@prisma/client';
import { DataCleanupService, FileArchiveStorage, CleanupSummary } from '../services/DataCleanupService';
import {
  getRetentionPolicy,
  calculateCutoffDate,
  validateRetentionPolicy,
  RetentionPolicy
} from '../config/retention-policies';

describe('Retention Policies', () => {
  describe('getRetentionPolicy', () => {
    it('should return policy for valid data types', () => {
      const policy = getRetentionPolicy('market_data');
      expect(policy).toBeDefined();
      expect(policy?.dataType).toBe('market_data');
      expect(policy?.retentionDays).toBe(730); // 2 years
    });

    it('should return null for unknown data types', () => {
      const policy = getRetentionPolicy('unknown_type');
      expect(policy).toBeNull();
    });

    it('should have correct retention periods', () => {
      expect(getRetentionPolicy('market_data')?.retentionDays).toBe(730);
      expect(getRetentionPolicy('data_provenance')?.retentionDays).toBe(365);
      expect(getRetentionPolicy('signal_history')?.retentionDays).toBe(1825);
      expect(getRetentionPolicy('cache_metadata')?.retentionDays).toBe(30);
      expect(getRetentionPolicy('data_source_health')?.retentionDays).toBe(90);
    });
  });

  describe('calculateCutoffDate', () => {
    it('should calculate correct cutoff date', () => {
      const policy: RetentionPolicy = {
        dataType: 'test',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      const cutoffDate = calculateCutoffDate(policy);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Check within 1 second tolerance
      const diff = Math.abs(cutoffDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('validateRetentionPolicy', () => {
    it('should validate correct policy', () => {
      const policy: RetentionPolicy = {
        dataType: 'test',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      const validation = validateRetentionPolicy(policy);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject policy with missing dataType', () => {
      const policy: RetentionPolicy = {
        dataType: '',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      const validation = validateRetentionPolicy(policy);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('dataType is required');
    });

    it('should reject policy with invalid retentionDays', () => {
      const policy: RetentionPolicy = {
        dataType: 'test',
        retentionDays: -10,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      const validation = validateRetentionPolicy(policy);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('retentionDays must be positive');
    });

    it('should reject policy with too short retention', () => {
      const policy: RetentionPolicy = {
        dataType: 'test',
        retentionDays: 5,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      const validation = validateRetentionPolicy(policy);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('retentionDays must be at least 7 days for safety');
    });
  });
});

describe('DataCleanupService', () => {
  let prisma: PrismaClient;
  let cleanupService: DataCleanupService;
  let mockArchiveStorage: FileArchiveStorage;

  beforeAll(() => {
    prisma = new PrismaClient();
    mockArchiveStorage = new FileArchiveStorage('./test-archives');
    cleanupService = new DataCleanupService(prisma, mockArchiveStorage);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.marketData.deleteMany();
    await prisma.dataProvenance.deleteMany();
    await prisma.signalHistory.deleteMany();
  });

  describe('previewCleanup', () => {
    it('should preview cleanup without deleting data', async () => {
      // Insert old test data
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 800); // Older than market_data retention (730 days)

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: oldDate,
          status: 'completed'
        }
      });

      await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      const previews = await cleanupService.previewCleanup();

      const marketDataPreview = previews.find(p => p.dataType === 'market_data');
      expect(marketDataPreview).toBeDefined();
      expect(marketDataPreview?.expiredRecords).toBe(1);

      // Verify no data was deleted
      const count = await prisma.marketData.count();
      expect(count).toBe(1);
    });
  });

  describe('cleanupDataType - Hard Delete', () => {
    it('should delete expired market data', async () => {
      const policy: RetentionPolicy = {
        dataType: 'market_data',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        enabled: true
      };

      // Insert old and new data
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days old

      const newDate = new Date();
      newDate.setDate(newDate.getDate() - 10); // 10 days old

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: new Date(),
          status: 'completed'
        }
      });

      await prisma.marketData.createMany({
        data: [
          {
            symbol: 'OLD',
            dataType: 'price',
            timestamp: oldDate,
            date: oldDate,
            close: 100.0,
            provenanceId: provenance.id,
            createdAt: oldDate
          },
          {
            symbol: 'NEW',
            dataType: 'price',
            timestamp: newDate,
            date: newDate,
            close: 105.0,
            provenanceId: provenance.id,
            createdAt: newDate
          }
        ]
      });

      const result = await cleanupService.cleanupDataType(policy);

      expect(result.recordsIdentified).toBe(1);
      expect(result.recordsDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify old data deleted, new data retained
      const remaining = await prisma.marketData.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].symbol).toBe('NEW');
    });

    it('should respect minimum records threshold', async () => {
      const policy: RetentionPolicy = {
        dataType: 'market_data',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: false,
        minimumRecordsToKeep: 2,
        enabled: true
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: new Date(),
          status: 'completed'
        }
      });

      // Insert 3 old records
      await prisma.marketData.createMany({
        data: [
          {
            symbol: 'TEST1',
            dataType: 'price',
            timestamp: oldDate,
            date: oldDate,
            close: 100.0,
            provenanceId: provenance.id,
            createdAt: oldDate
          },
          {
            symbol: 'TEST2',
            dataType: 'price',
            timestamp: oldDate,
            date: oldDate,
            close: 101.0,
            provenanceId: provenance.id,
            createdAt: oldDate
          },
          {
            symbol: 'TEST3',
            dataType: 'price',
            timestamp: oldDate,
            date: oldDate,
            close: 102.0,
            provenanceId: provenance.id,
            createdAt: oldDate
          }
        ]
      });

      const result = await cleanupService.cleanupDataType(policy);

      expect(result.recordsIdentified).toBe(3);
      expect(result.recordsDeleted).toBe(1); // Only 1 deleted to keep 2 minimum
      expect(result.recordsSkipped).toBe(2);

      // Verify 2 records remain
      const remaining = await prisma.marketData.count();
      expect(remaining).toBe(2);
    });
  });

  describe('cleanupDataType - Soft Delete', () => {
    it('should soft delete expired records', async () => {
      const policy: RetentionPolicy = {
        dataType: 'market_data',
        retentionDays: 30,
        archiveBeforeDelete: false,
        compressionEnabled: false,
        useSoftDelete: true,
        enabled: true
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: new Date(),
          status: 'completed'
        }
      });

      const created = await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      const result = await cleanupService.cleanupDataType(policy);

      expect(result.recordsDeleted).toBe(1);

      // Verify record soft deleted
      const record = await prisma.marketData.findUnique({
        where: { id: created.id }
      });

      expect(record?.deletedAt).not.toBeNull();
    });

    it('should restore soft-deleted records', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: new Date(),
          status: 'completed'
        }
      });

      const created = await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate,
          deletedAt: new Date() // Already soft deleted
        }
      });

      const restored = await cleanupService.restoreSoftDeleted('market_data', [created.id]);

      expect(restored).toBe(1);

      // Verify record restored
      const record = await prisma.marketData.findUnique({
        where: { id: created.id }
      });

      expect(record?.deletedAt).toBeNull();
    });
  });

  describe('executeCleanup', () => {
    it('should cleanup multiple data types', async () => {
      // Insert expired data for multiple types
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: oldDate,
          status: 'completed',
          createdAt: oldDate
        }
      });

      await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      await prisma.signalHistory.create({
        data: {
          signalName: 'test_signal',
          signalType: 'timing',
          calculationDate: oldDate,
          calculationTimestamp: oldDate,
          signalValue: 0.5,
          signalStatus: 'neutral',
          marketDataIds: [],
          provenanceIds: [],
          createdAt: oldDate
        }
      });

      const summary = await cleanupService.executeCleanup();

      expect(summary.totalRecordsIdentified).toBeGreaterThan(0);
      expect(summary.totalRecordsDeleted).toBeGreaterThan(0);
      expect(summary.results.length).toBeGreaterThan(0);
    });

    it('should log cleanup to provenance', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: oldDate,
          status: 'completed',
          createdAt: oldDate
        }
      });

      await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      await cleanupService.executeCleanup();

      // Verify cleanup logged to provenance
      const cleanupLog = await prisma.dataProvenance.findFirst({
        where: {
          sourceSystem: 'data_cleanup_service'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      expect(cleanupLog).toBeDefined();
      expect(cleanupLog?.transformationApplied).toBe('cleanup');
    });
  });

  describe('cleanupSpecificType', () => {
    it('should cleanup only specified data type', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test',
          requestTimestamp: oldDate,
          status: 'completed',
          createdAt: oldDate
        }
      });

      await prisma.marketData.create({
        data: {
          symbol: 'TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      await prisma.signalHistory.create({
        data: {
          signalName: 'test_signal',
          signalType: 'timing',
          calculationDate: oldDate,
          calculationTimestamp: oldDate,
          signalValue: 0.5,
          signalStatus: 'neutral',
          marketDataIds: [],
          provenanceIds: [],
          createdAt: oldDate
        }
      });

      const result = await cleanupService.cleanupSpecificType('market_data');

      expect(result.dataType).toBe('market_data');
      expect(result.recordsDeleted).toBeGreaterThan(0);

      // Verify only market_data deleted
      const marketCount = await prisma.marketData.count();
      const signalCount = await prisma.signalHistory.count();

      expect(marketCount).toBe(0);
      expect(signalCount).toBe(1); // Not deleted
    });

    it('should throw error for invalid data type', async () => {
      await expect(cleanupService.cleanupSpecificType('invalid_type'))
        .rejects.toThrow('No retention policy found');
    });
  });
});
