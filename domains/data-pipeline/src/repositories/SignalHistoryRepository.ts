/**
 * SignalHistoryRepository - Data access layer for signal_history table
 * Story: 4.0b - Data Persistence Layer
 *
 * Manages signal calculation storage and retrieval with full audit trail.
 * Tracks signal status changes and data dependencies.
 */

import { PrismaClient, SignalHistory as PrismaSignalHistory, Prisma } from '@prisma/client';

export interface SignalData {
  id?: number;
  signalName: string;
  signalType: string;
  calculationDate: Date;
  calculationTimestamp?: Date;
  signalValue: number;
  signalStrength?: number;
  confidenceScore?: number;
  dataQualityScore?: number;
  signalStatus: 'bullish' | 'bearish' | 'neutral' | 'defensive';
  previousStatus?: string;
  statusChanged?: boolean;
  inputData?: Record<string, any>;
  intermediateValues?: Record<string, any>;
  calculationParams?: Record<string, any>;
  marketDataIds: number[];
  provenanceIds: number[];
  calculationVersion?: string;
  createdBy?: string;
}

export class SignalHistoryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Insert a new signal calculation
   * Uses upsert to handle recalculation of same signal on same date
   *
   * @param signal Signal data to insert
   * @returns ID of inserted/updated signal record
   */
  async insertSignal(signal: SignalData): Promise<number> {
    const result = await this.prisma.signalHistory.upsert({
      where: {
        unique_signal_calc: {
          signalName: signal.signalName,
          calculationDate: signal.calculationDate,
        },
      },
      update: {
        signalValue: new Prisma.Decimal(signal.signalValue),
        signalStrength: signal.signalStrength
          ? new Prisma.Decimal(signal.signalStrength)
          : null,
        confidenceScore: signal.confidenceScore
          ? new Prisma.Decimal(signal.confidenceScore)
          : null,
        dataQualityScore: signal.dataQualityScore
          ? new Prisma.Decimal(signal.dataQualityScore)
          : null,
        signalStatus: signal.signalStatus,
        previousStatus: signal.previousStatus,
        statusChanged: signal.statusChanged,
        inputData: signal.inputData,
        intermediateValues: signal.intermediateValues,
        calculationParams: signal.calculationParams,
        marketDataIds: signal.marketDataIds,
        provenanceIds: signal.provenanceIds,
        calculationVersion: signal.calculationVersion,
        createdBy: signal.createdBy,
      },
      create: {
        signalName: signal.signalName,
        signalType: signal.signalType,
        calculationDate: signal.calculationDate,
        calculationTimestamp: signal.calculationTimestamp || new Date(),
        signalValue: new Prisma.Decimal(signal.signalValue),
        signalStrength: signal.signalStrength
          ? new Prisma.Decimal(signal.signalStrength)
          : null,
        confidenceScore: signal.confidenceScore
          ? new Prisma.Decimal(signal.confidenceScore)
          : null,
        dataQualityScore: signal.dataQualityScore
          ? new Prisma.Decimal(signal.dataQualityScore)
          : null,
        signalStatus: signal.signalStatus,
        previousStatus: signal.previousStatus,
        statusChanged: signal.statusChanged ?? false,
        inputData: signal.inputData,
        intermediateValues: signal.intermediateValues,
        calculationParams: signal.calculationParams,
        marketDataIds: signal.marketDataIds,
        provenanceIds: signal.provenanceIds,
        calculationVersion: signal.calculationVersion,
        createdBy: signal.createdBy || 'system',
      },
    });

    return result.id;
  }

  /**
   * Get signal history for a specific signal
   * Returns signals within date range, ordered by date
   *
   * @param signalName Signal name (e.g., 'gayed_8_month')
   * @param startDate Start of date range
   * @param endDate End of date range
   * @returns Array of signal records
   */
  async getSignalHistory(
    signalName: string,
    startDate: Date,
    endDate: Date
  ): Promise<SignalData[]> {
    const records = await this.prisma.signalHistory.findMany({
      where: {
        signalName,
        calculationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        calculationDate: 'asc',
      },
    });

    return records.map(this.mapPrismaToSignalData);
  }

  /**
   * Get the most recent signal calculation
   * Useful for displaying current signal status
   *
   * @param signalName Signal name
   * @returns Latest signal record or null if not found
   */
  async getLatestSignal(signalName: string): Promise<SignalData | null> {
    const record = await this.prisma.signalHistory.findFirst({
      where: { signalName },
      orderBy: {
        calculationDate: 'desc',
      },
    });

    return record ? this.mapPrismaToSignalData(record) : null;
  }

  /**
   * Get signals by status on a specific date
   * Useful for generating daily market outlook
   *
   * @param status Signal status
   * @param date Target date
   * @returns Array of signals with matching status
   */
  async getSignalsByStatus(
    status: 'bullish' | 'bearish' | 'neutral' | 'defensive',
    date: Date
  ): Promise<SignalData[]> {
    const records = await this.prisma.signalHistory.findMany({
      where: {
        signalStatus: status,
        calculationDate: date,
      },
      orderBy: {
        signalName: 'asc',
      },
    });

    return records.map(this.mapPrismaToSignalData);
  }

  /**
   * Get signal status changes within a date range
   * Identifies when signals changed from one status to another
   *
   * @param signalName Signal name
   * @param startDate Start of date range
   * @returns Array of signal records where status changed
   */
  async getSignalStatusChanges(
    signalName: string,
    startDate: Date
  ): Promise<SignalData[]> {
    const records = await this.prisma.signalHistory.findMany({
      where: {
        signalName,
        calculationDate: { gte: startDate },
        statusChanged: true,
      },
      orderBy: {
        calculationDate: 'asc',
      },
    });

    return records.map(this.mapPrismaToSignalData);
  }

  /**
   * Get all signals calculated on a specific date
   * Useful for daily reporting and backtesting
   *
   * @param date Target date
   * @returns Array of all signals calculated on that date
   */
  async getSignalsByDate(date: Date): Promise<SignalData[]> {
    const records = await this.prisma.signalHistory.findMany({
      where: { calculationDate: date },
      orderBy: {
        signalName: 'asc',
      },
    });

    return records.map(this.mapPrismaToSignalData);
  }

  /**
   * Get signals by type within date range
   * Groups related signals (e.g., all 'timing' signals)
   *
   * @param signalType Signal type (e.g., 'timing', 'momentum')
   * @param startDate Start of date range
   * @param endDate End of date range
   * @returns Array of signals matching type
   */
  async getSignalsByType(
    signalType: string,
    startDate: Date,
    endDate: Date
  ): Promise<SignalData[]> {
    const records = await this.prisma.signalHistory.findMany({
      where: {
        signalType,
        calculationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ calculationDate: 'desc' }, { signalName: 'asc' }],
    });

    return records.map(this.mapPrismaToSignalData);
  }

  /**
   * Get signal performance statistics
   * Calculates signal accuracy and status distribution
   *
   * @param signalName Signal name
   * @param startDate Start of date range
   * @param endDate End of date range
   * @returns Performance statistics
   */
  async getSignalPerformanceStats(
    signalName: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCalculations: number;
    statusDistribution: Record<string, number>;
    averageConfidence: number;
    averageDataQuality: number;
    statusChangeCount: number;
  }> {
    const records = await this.prisma.signalHistory.findMany({
      where: {
        signalName,
        calculationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const statusDistribution: Record<string, number> = {};
    let totalConfidence = 0;
    let totalQuality = 0;
    let statusChangeCount = 0;
    let confidenceCount = 0;
    let qualityCount = 0;

    records.forEach((record) => {
      // Status distribution
      statusDistribution[record.signalStatus] =
        (statusDistribution[record.signalStatus] || 0) + 1;

      // Average confidence
      if (record.confidenceScore) {
        totalConfidence += parseFloat(record.confidenceScore.toString());
        confidenceCount++;
      }

      // Average data quality
      if (record.dataQualityScore) {
        totalQuality += parseFloat(record.dataQualityScore.toString());
        qualityCount++;
      }

      // Status changes
      if (record.statusChanged) {
        statusChangeCount++;
      }
    });

    return {
      totalCalculations: records.length,
      statusDistribution,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      averageDataQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
      statusChangeCount,
    };
  }

  /**
   * Delete old signal history records
   * Used by retention policy cleanup service
   *
   * @param beforeDate Delete records before this date
   * @returns Number of records deleted
   */
  async deleteOldSignals(beforeDate: Date): Promise<number> {
    const result = await this.prisma.signalHistory.deleteMany({
      where: {
        calculationDate: { lt: beforeDate },
      },
    });

    return result.count;
  }

  /**
   * Get signal data with dependencies (market data and provenance)
   * Useful for debugging and auditing calculations
   *
   * @param signalName Signal name
   * @param date Calculation date
   * @returns Signal with related market data and provenance IDs
   */
  async getSignalWithDependencies(
    signalName: string,
    date: Date
  ): Promise<SignalData | null> {
    const record = await this.prisma.signalHistory.findUnique({
      where: {
        unique_signal_calc: {
          signalName,
          calculationDate: date,
        },
      },
    });

    return record ? this.mapPrismaToSignalData(record) : null;
  }

  /**
   * Map Prisma record to SignalData interface
   * Converts Decimal to number for application use
   */
  private mapPrismaToSignalData(record: PrismaSignalHistory): SignalData {
    return {
      id: record.id,
      signalName: record.signalName,
      signalType: record.signalType,
      calculationDate: record.calculationDate,
      calculationTimestamp: record.calculationTimestamp,
      signalValue: parseFloat(record.signalValue.toString()),
      signalStrength: record.signalStrength
        ? parseFloat(record.signalStrength.toString())
        : undefined,
      confidenceScore: record.confidenceScore
        ? parseFloat(record.confidenceScore.toString())
        : undefined,
      dataQualityScore: record.dataQualityScore
        ? parseFloat(record.dataQualityScore.toString())
        : undefined,
      signalStatus: record.signalStatus as
        | 'bullish'
        | 'bearish'
        | 'neutral'
        | 'defensive',
      previousStatus: record.previousStatus || undefined,
      statusChanged: record.statusChanged,
      inputData: record.inputData as Record<string, any>,
      intermediateValues: record.intermediateValues as Record<string, any>,
      calculationParams: record.calculationParams as Record<string, any>,
      marketDataIds: record.marketDataIds,
      provenanceIds: record.provenanceIds,
      calculationVersion: record.calculationVersion || undefined,
      createdBy: record.createdBy,
    };
  }
}
