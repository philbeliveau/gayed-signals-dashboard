/**
 * Unit tests for SignalHistoryRepository
 * Story: 4.0b - Data Persistence Layer
 *
 * Tests signal calculation storage, status tracking, and performance stats
 * Target: >90% code coverage
 */

import { PrismaClient } from '../../../generated/client';
import { SignalHistoryRepository, SignalData } from '../SignalHistoryRepository';

describe('SignalHistoryRepository', () => {
  let prisma: PrismaClient;
  let repository: SignalHistoryRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
    repository = new SignalHistoryRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.signalHistory.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('insertSignal', () => {
    it('should insert signal successfully', async () => {
      const signal: SignalData = {
        signalName: 'gayed_8_month',
        signalType: 'timing',
        calculationDate: new Date('2024-01-01'),
        signalValue: 0.75,
        signalStrength: 0.8,
        confidenceScore: 0.95,
        dataQualityScore: 0.98,
        signalStatus: 'bullish',
        marketDataIds: [1, 2, 3],
        provenanceIds: [10],
      };

      const id = await repository.insertSignal(signal);

      expect(id).toBeGreaterThan(0);

      const retrieved = await prisma.signalHistory.findUnique({
        where: { id },
      });

      expect(retrieved).toBeTruthy();
      expect(retrieved!.signalName).toBe('gayed_8_month');
      expect(parseFloat(retrieved!.signalValue.toString())).toBe(0.75);
      expect(retrieved!.marketDataIds).toEqual([1, 2, 3]);
    });

    it('should handle upsert for recalculation', async () => {
      const signal: SignalData = {
        signalName: 'gayed_8_month',
        signalType: 'timing',
        calculationDate: new Date('2024-01-01'),
        signalValue: 0.75,
        signalStatus: 'bullish',
        marketDataIds: [1],
        provenanceIds: [10],
      };

      const id1 = await repository.insertSignal(signal);

      // Recalculate with new value
      signal.signalValue = 0.85;
      signal.signalStatus = 'defensive';
      const id2 = await repository.insertSignal(signal);

      expect(id1).toBe(id2);

      const retrieved = await prisma.signalHistory.findUnique({
        where: { id: id1 },
      });

      expect(parseFloat(retrieved!.signalValue.toString())).toBe(0.85);
      expect(retrieved!.signalStatus).toBe('defensive');
    });

    it('should store input data and calculation params', async () => {
      const signal: SignalData = {
        signalName: 'gayed_8_month',
        signalType: 'timing',
        calculationDate: new Date('2024-01-01'),
        signalValue: 0.75,
        signalStatus: 'bullish',
        inputData: {
          utilities: 85.5,
          spy: 450.25,
        },
        calculationParams: {
          lookbackMonths: 8,
          threshold: 1.0,
        },
        marketDataIds: [1, 2],
        provenanceIds: [10],
      };

      const id = await repository.insertSignal(signal);
      const retrieved = await prisma.signalHistory.findUnique({
        where: { id },
      });

      expect(retrieved!.inputData).toEqual({
        utilities: 85.5,
        spy: 450.25,
      });
      expect(retrieved!.calculationParams).toEqual({
        lookbackMonths: 8,
        threshold: 1.0,
      });
    });

    it('should track status changes', async () => {
      const signal: SignalData = {
        signalName: 'gayed_20d',
        signalType: 'momentum',
        calculationDate: new Date('2024-01-01'),
        signalValue: 1.02,
        signalStatus: 'bullish',
        previousStatus: 'neutral',
        statusChanged: true,
        marketDataIds: [1],
        provenanceIds: [10],
      };

      const id = await repository.insertSignal(signal);
      const retrieved = await prisma.signalHistory.findUnique({
        where: { id },
      });

      expect(retrieved!.statusChanged).toBe(true);
      expect(retrieved!.previousStatus).toBe('neutral');
      expect(retrieved!.signalStatus).toBe('bullish');
    });
  });

  describe('getSignalHistory', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-15'),
          signalValue: 0.85,
          signalStatus: 'bullish',
          marketDataIds: [2],
          provenanceIds: [11],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-31'),
          signalValue: 0.65,
          signalStatus: 'defensive',
          marketDataIds: [3],
          provenanceIds: [12],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should retrieve history within date range', async () => {
      const history = await repository.getSignalHistory(
        'gayed_8_month',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(history.length).toBe(3);
      expect(history[0].signalValue).toBe(0.75);
      expect(history[1].signalValue).toBe(0.85);
      expect(history[2].signalValue).toBe(0.65);
    });

    it('should return empty array for no matches', async () => {
      const history = await repository.getSignalHistory(
        'invalid_signal',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(history).toHaveLength(0);
    });
  });

  describe('getLatestSignal', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-15'),
          signalValue: 0.85,
          signalStatus: 'defensive',
          marketDataIds: [2],
          provenanceIds: [11],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should return most recent signal', async () => {
      const latest = await repository.getLatestSignal('gayed_8_month');

      expect(latest).toBeTruthy();
      expect(latest!.signalValue).toBe(0.85);
      expect(latest!.calculationDate).toEqual(new Date('2024-01-15'));
    });

    it('should return null for no matches', async () => {
      const latest = await repository.getLatestSignal('invalid_signal');

      expect(latest).toBeNull();
    });
  });

  describe('getSignalsByStatus', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'gayed_20d',
          signalType: 'momentum',
          calculationDate: new Date('2024-01-01'),
          signalValue: 1.05,
          signalStatus: 'bullish',
          marketDataIds: [2],
          provenanceIds: [11],
        },
        {
          signalName: 'bollinger',
          signalType: 'volatility',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.5,
          signalStatus: 'defensive',
          marketDataIds: [3],
          provenanceIds: [12],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should filter by status', async () => {
      const bullishSignals = await repository.getSignalsByStatus(
        'bullish',
        new Date('2024-01-01')
      );

      expect(bullishSignals.length).toBe(2);
      expect(bullishSignals.every((s) => s.signalStatus === 'bullish')).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const neutralSignals = await repository.getSignalsByStatus(
        'neutral',
        new Date('2024-01-01')
      );

      expect(neutralSignals).toHaveLength(0);
    });
  });

  describe('getSignalStatusChanges', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          statusChanged: false,
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-15'),
          signalValue: 0.65,
          signalStatus: 'defensive',
          previousStatus: 'bullish',
          statusChanged: true,
          marketDataIds: [2],
          provenanceIds: [11],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-31'),
          signalValue: 0.60,
          signalStatus: 'defensive',
          statusChanged: false,
          marketDataIds: [3],
          provenanceIds: [12],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should return only status changes', async () => {
      const changes = await repository.getSignalStatusChanges(
        'gayed_8_month',
        new Date('2024-01-01')
      );

      expect(changes.length).toBe(1);
      expect(changes[0].statusChanged).toBe(true);
      expect(changes[0].signalStatus).toBe('defensive');
      expect(changes[0].previousStatus).toBe('bullish');
    });
  });

  describe('getSignalPerformanceStats', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          confidenceScore: 0.95,
          dataQualityScore: 0.98,
          statusChanged: false,
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-15'),
          signalValue: 0.65,
          signalStatus: 'defensive',
          confidenceScore: 0.90,
          dataQualityScore: 0.95,
          statusChanged: true,
          marketDataIds: [2],
          provenanceIds: [11],
        },
        {
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-01-31'),
          signalValue: 0.85,
          signalStatus: 'bullish',
          confidenceScore: 0.92,
          dataQualityScore: 0.97,
          statusChanged: true,
          marketDataIds: [3],
          provenanceIds: [12],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should calculate performance statistics', async () => {
      const stats = await repository.getSignalPerformanceStats(
        'gayed_8_month',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(stats.totalCalculations).toBe(3);
      expect(stats.statusDistribution['bullish']).toBe(2);
      expect(stats.statusDistribution['defensive']).toBe(1);
      expect(stats.averageConfidence).toBeCloseTo(0.923, 2);
      expect(stats.averageDataQuality).toBeCloseTo(0.967, 2);
      expect(stats.statusChangeCount).toBe(2);
    });

    it('should handle empty results', async () => {
      const stats = await repository.getSignalPerformanceStats(
        'invalid_signal',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(stats.totalCalculations).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.averageDataQuality).toBe(0);
    });
  });

  describe('deleteOldSignals', () => {
    beforeEach(async () => {
      const signals: SignalData[] = [
        {
          signalName: 'old_signal',
          signalType: 'timing',
          calculationDate: new Date('2020-01-01'),
          signalValue: 0.75,
          signalStatus: 'bullish',
          marketDataIds: [1],
          provenanceIds: [10],
        },
        {
          signalName: 'recent_signal',
          signalType: 'timing',
          calculationDate: new Date('2024-01-01'),
          signalValue: 0.85,
          signalStatus: 'bullish',
          marketDataIds: [2],
          provenanceIds: [11],
        },
      ];

      for (const signal of signals) {
        await repository.insertSignal(signal);
      }
    });

    it('should delete old records', async () => {
      const deleted = await repository.deleteOldSignals(new Date('2023-01-01'));

      expect(deleted).toBe(1);

      const remaining = await prisma.signalHistory.count();
      expect(remaining).toBe(1);
    });

    it('should not delete recent records', async () => {
      const deleted = await repository.deleteOldSignals(new Date('2019-01-01'));

      expect(deleted).toBe(0);
    });
  });
});
