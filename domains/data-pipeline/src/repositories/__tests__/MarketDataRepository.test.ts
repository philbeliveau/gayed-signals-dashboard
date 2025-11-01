/**
 * Unit tests for MarketDataRepository
 * Story: 4.0b - Data Persistence Layer
 *
 * Tests all CRUD operations with Railway PostgreSQL via Prisma Client
 * Target: >90% code coverage
 */

import { PrismaClient } from '@prisma/client';
import { MarketDataRepository, MarketData } from '../MarketDataRepository';

describe('MarketDataRepository', () => {
  let prisma: PrismaClient;
  let repository: MarketDataRepository;
  let testProvenanceId: number;

  beforeAll(async () => {
    // Connect to test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
    repository = new MarketDataRepository(prisma);
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.marketData.deleteMany();
    await prisma.dataProvenance.deleteMany();

    // Create test provenance record
    const provenance = await prisma.dataProvenance.create({
      data: {
        sourceSystem: 'test',
        requestTimestamp: new Date(),
        status: 'completed',
      },
    });
    testProvenanceId = provenance.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('insertMarketData', () => {
    it('should insert market data successfully', async () => {
      const data: MarketData = {
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        close: 450.25,
        volume: BigInt(1000000),
      };

      const id = await repository.insertMarketData(data, testProvenanceId);

      expect(id).toBeGreaterThan(0);

      const retrieved = await prisma.marketData.findUnique({
        where: { id },
      });

      expect(retrieved).toBeTruthy();
      expect(retrieved!.symbol).toBe('SPY');
      expect(parseFloat(retrieved!.close.toString())).toBe(450.25);
      expect(retrieved!.provenanceId).toBe(testProvenanceId);
    });

    it('should handle upsert for duplicate timestamps', async () => {
      const data: MarketData = {
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        close: 450.25,
      };

      const id1 = await repository.insertMarketData(data, testProvenanceId);

      // Insert duplicate with different close price
      data.close = 451.5;
      const id2 = await repository.insertMarketData(data, testProvenanceId);

      // Should return same ID (upsert)
      expect(id1).toBe(id2);

      const retrieved = await prisma.marketData.findUnique({
        where: { id: id1 },
      });

      expect(parseFloat(retrieved!.close.toString())).toBe(451.5);
    });

    it('should store OHLCV data with proper precision', async () => {
      const data: MarketData = {
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        open: 449.123,
        high: 452.987,
        low: 448.456,
        close: 450.789,
        volume: BigInt(5432100),
      };

      const id = await repository.insertMarketData(data, testProvenanceId);
      const retrieved = await prisma.marketData.findUnique({
        where: { id },
      });

      expect(parseFloat(retrieved!.open!.toString())).toBe(449.123);
      expect(parseFloat(retrieved!.high!.toString())).toBe(452.987);
      expect(parseFloat(retrieved!.low!.toString())).toBe(448.456);
      expect(parseFloat(retrieved!.close.toString())).toBe(450.789);
      expect(retrieved!.volume).toBe(BigInt(5432100));
    });

    it('should store adjusted close and split coefficient', async () => {
      const data: MarketData = {
        symbol: 'AAPL',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        close: 185.5,
        adjustedClose: 184.25,
        splitCoefficient: 0.5,
      };

      const id = await repository.insertMarketData(data, testProvenanceId);
      const retrieved = await prisma.marketData.findUnique({
        where: { id },
      });

      expect(parseFloat(retrieved!.adjustedClose!.toString())).toBe(184.25);
      expect(parseFloat(retrieved!.splitCoefficient!.toString())).toBe(0.5);
    });
  });

  describe('bulkInsertMarketData', () => {
    it('should insert multiple records efficiently', async () => {
      const dataArray: MarketData[] = Array.from({ length: 100 }, (_, i) => ({
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`),
        date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        close: 450 + i,
        volume: BigInt(1000000),
      }));

      const startTime = Date.now();
      const ids = await repository.bulkInsertMarketData(dataArray, testProvenanceId);
      const duration = Date.now() - startTime;

      expect(ids).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds

      const count = await prisma.marketData.count();
      expect(count).toBe(100);
    });

    it('should handle transaction rollback on error', async () => {
      const dataArray: MarketData[] = [
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 450,
        },
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-02T12:00:00Z'),
          date: new Date('2024-01-02'),
          close: 451,
        },
      ];

      // First insert should succeed
      await repository.bulkInsertMarketData(dataArray, testProvenanceId);

      // Verify data was inserted
      const count = await prisma.marketData.count();
      expect(count).toBe(2);
    });
  });

  describe('getMarketData', () => {
    beforeEach(async () => {
      // Insert test data
      const testData: MarketData[] = [
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 450,
        },
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          date: new Date('2024-01-15'),
          close: 455,
        },
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-31T12:00:00Z'),
          date: new Date('2024-01-31'),
          close: 460,
        },
      ];

      await repository.bulkInsertMarketData(testData, testProvenanceId);
    });

    it('should retrieve data within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const data = await repository.getMarketData('SPY', startDate, endDate);

      expect(data.length).toBe(3);
      expect(data[0].close).toBe(450);
      expect(data[1].close).toBe(455);
      expect(data[2].close).toBe(460);
    });

    it('should filter by dataType', async () => {
      // Insert additional volume data
      await repository.insertMarketData(
        {
          symbol: 'SPY',
          dataType: 'volume',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 0,
          volume: BigInt(1000000),
        },
        testProvenanceId
      );

      const priceData = await repository.getMarketData(
        'SPY',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'price'
      );

      expect(priceData.length).toBe(3);
      expect(priceData.every((d) => d.dataType === 'price')).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const data = await repository.getMarketData(
        'INVALID',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(data).toHaveLength(0);
    });
  });

  describe('getLatestMarketData', () => {
    beforeEach(async () => {
      const testData: MarketData[] = [
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 450,
        },
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          date: new Date('2024-01-15'),
          close: 455,
        },
      ];

      await repository.bulkInsertMarketData(testData, testProvenanceId);
    });

    it('should return most recent record', async () => {
      const latest = await repository.getLatestMarketData('SPY', 'price');

      expect(latest).toBeTruthy();
      expect(latest!.close).toBe(455);
      expect(latest!.date).toEqual(new Date('2024-01-15'));
    });

    it('should return null for no matches', async () => {
      const latest = await repository.getLatestMarketData('INVALID', 'price');

      expect(latest).toBeNull();
    });
  });

  describe('updateMarketData', () => {
    it('should update existing record', async () => {
      const data: MarketData = {
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        close: 450,
      };

      const id = await repository.insertMarketData(data, testProvenanceId);

      const updated = await repository.updateMarketData(id, {
        close: 451.5,
        volume: BigInt(2000000),
      });

      expect(updated).toBe(true);

      const retrieved = await prisma.marketData.findUnique({
        where: { id },
      });

      expect(parseFloat(retrieved!.close.toString())).toBe(451.5);
      expect(retrieved!.volume).toBe(BigInt(2000000));
    });

    it('should return false for non-existent record', async () => {
      const updated = await repository.updateMarketData(99999, {
        close: 100,
      });

      expect(updated).toBe(false);
    });
  });

  describe('deleteMarketData', () => {
    it('should delete existing record', async () => {
      const data: MarketData = {
        symbol: 'SPY',
        dataType: 'price',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        date: new Date('2024-01-01'),
        close: 450,
      };

      const id = await repository.insertMarketData(data, testProvenanceId);

      const deleted = await repository.deleteMarketData(id);

      expect(deleted).toBe(true);

      const retrieved = await prisma.marketData.findUnique({
        where: { id },
      });

      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent record', async () => {
      const deleted = await repository.deleteMarketData(99999);

      expect(deleted).toBe(false);
    });
  });

  describe('getMarketDataByIds', () => {
    it('should retrieve records by ID array', async () => {
      const testData: MarketData[] = [
        {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 450,
        },
        {
          symbol: 'QQQ',
          dataType: 'price',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          date: new Date('2024-01-01'),
          close: 380,
        },
      ];

      const ids = await repository.bulkInsertMarketData(testData, testProvenanceId);

      const records = await repository.getMarketDataByIds(ids);

      expect(records).toHaveLength(2);
      expect(records.find((r) => r.symbol === 'SPY')).toBeTruthy();
      expect(records.find((r) => r.symbol === 'QQQ')).toBeTruthy();
    });
  });
});
