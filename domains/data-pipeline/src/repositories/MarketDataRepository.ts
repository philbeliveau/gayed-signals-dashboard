/**
 * MarketDataRepository - Data access layer for market_data table
 * Story: 4.0b - Data Persistence Layer
 *
 * Provides type-safe CRUD operations for market data using Prisma Client.
 * All operations use Railway PostgreSQL with automatic connection pooling.
 */

import { PrismaClient, MarketData as PrismaMarketData, Prisma } from '@prisma/client';

export interface MarketData {
  id?: number;
  symbol: string;
  dataType: string;
  timestamp: Date;
  date: Date;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: bigint;
  adjustedClose?: number;
  splitCoefficient?: number;
  provenanceId?: number;
}

export class MarketDataRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Insert or update market data with provenance tracking
   * Uses upsert to handle duplicate timestamps (updates existing records)
   *
   * @param data Market data to insert
   * @param provenanceId Reference to data_provenance record
   * @returns ID of inserted/updated record
   */
  async insertMarketData(data: MarketData, provenanceId: number): Promise<number> {
    const result = await this.prisma.marketData.upsert({
      where: {
        unique_market_data: {
          symbol: data.symbol,
          dataType: data.dataType,
          timestamp: data.timestamp,
        },
      },
      update: {
        open: data.open ? new Prisma.Decimal(data.open) : null,
        high: data.high ? new Prisma.Decimal(data.high) : null,
        low: data.low ? new Prisma.Decimal(data.low) : null,
        close: new Prisma.Decimal(data.close),
        volume: data.volume,
        adjustedClose: data.adjustedClose ? new Prisma.Decimal(data.adjustedClose) : null,
        splitCoefficient: data.splitCoefficient ? new Prisma.Decimal(data.splitCoefficient) : null,
        provenanceId: provenanceId,
        updatedAt: new Date(),
      },
      create: {
        symbol: data.symbol,
        dataType: data.dataType,
        timestamp: data.timestamp,
        date: data.date,
        open: data.open ? new Prisma.Decimal(data.open) : null,
        high: data.high ? new Prisma.Decimal(data.high) : null,
        low: data.low ? new Prisma.Decimal(data.low) : null,
        close: new Prisma.Decimal(data.close),
        volume: data.volume,
        adjustedClose: data.adjustedClose ? new Prisma.Decimal(data.adjustedClose) : null,
        splitCoefficient: data.splitCoefficient ? new Prisma.Decimal(data.splitCoefficient) : null,
        provenanceId: provenanceId,
      },
    });

    return result.id;
  }

  /**
   * Bulk insert market data using Prisma transactions
   * Railway PostgreSQL handles transactions efficiently
   *
   * @param dataArray Array of market data records
   * @param provenanceId Reference to data_provenance record
   * @returns Array of inserted record IDs
   */
  async bulkInsertMarketData(
    dataArray: MarketData[],
    provenanceId: number
  ): Promise<number[]> {
    const results = await this.prisma.$transaction(
      dataArray.map((data) =>
        this.prisma.marketData.upsert({
          where: {
            unique_market_data: {
              symbol: data.symbol,
              dataType: data.dataType,
              timestamp: data.timestamp,
            },
          },
          update: {
            open: data.open ? new Prisma.Decimal(data.open) : null,
            high: data.high ? new Prisma.Decimal(data.high) : null,
            low: data.low ? new Prisma.Decimal(data.low) : null,
            close: new Prisma.Decimal(data.close),
            volume: data.volume,
            adjustedClose: data.adjustedClose ? new Prisma.Decimal(data.adjustedClose) : null,
            splitCoefficient: data.splitCoefficient ? new Prisma.Decimal(data.splitCoefficient) : null,
            provenanceId: provenanceId,
            updatedAt: new Date(),
          },
          create: {
            symbol: data.symbol,
            dataType: data.dataType,
            timestamp: data.timestamp,
            date: data.date,
            open: data.open ? new Prisma.Decimal(data.open) : null,
            high: data.high ? new Prisma.Decimal(data.high) : null,
            low: data.low ? new Prisma.Decimal(data.low) : null,
            close: new Prisma.Decimal(data.close),
            volume: data.volume,
            adjustedClose: data.adjustedClose ? new Prisma.Decimal(data.adjustedClose) : null,
            splitCoefficient: data.splitCoefficient ? new Prisma.Decimal(data.splitCoefficient) : null,
            provenanceId: provenanceId,
          },
        })
      )
    );

    return results.map((r) => r.id);
  }

  /**
   * Retrieve market data within a date range
   * Uses indexed query for optimal performance (<100ms target)
   *
   * @param symbol Ticker symbol (e.g., 'SPY')
   * @param startDate Start of date range (inclusive)
   * @param endDate End of date range (inclusive)
   * @param dataType Optional data type filter
   * @returns Array of market data records with provenance
   */
  async getMarketData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    dataType?: string
  ): Promise<MarketData[]> {
    const records = await this.prisma.marketData.findMany({
      where: {
        symbol,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(dataType && { dataType }),
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        provenance: true,
      },
    });

    return records.map(this.mapPrismaToMarketData);
  }

  /**
   * Get the most recent market data for a symbol and data type
   * Uses descending date index for fast retrieval
   *
   * @param symbol Ticker symbol
   * @param dataType Data type (e.g., 'price', 'volume')
   * @returns Latest market data record or null if not found
   */
  async getLatestMarketData(
    symbol: string,
    dataType: string
  ): Promise<MarketData | null> {
    const record = await this.prisma.marketData.findFirst({
      where: {
        symbol,
        dataType,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        provenance: true,
      },
    });

    return record ? this.mapPrismaToMarketData(record) : null;
  }

  /**
   * Update existing market data record
   *
   * @param id Record ID
   * @param data Partial market data to update
   * @returns true if updated, false if not found
   */
  async updateMarketData(id: number, data: Partial<MarketData>): Promise<boolean> {
    try {
      await this.prisma.marketData.update({
        where: { id },
        data: {
          ...(data.open !== undefined && { open: new Prisma.Decimal(data.open) }),
          ...(data.high !== undefined && { high: new Prisma.Decimal(data.high) }),
          ...(data.low !== undefined && { low: new Prisma.Decimal(data.low) }),
          ...(data.close !== undefined && { close: new Prisma.Decimal(data.close) }),
          ...(data.volume !== undefined && { volume: data.volume }),
          ...(data.adjustedClose !== undefined && {
            adjustedClose: new Prisma.Decimal(data.adjustedClose)
          }),
          ...(data.splitCoefficient !== undefined && {
            splitCoefficient: new Prisma.Decimal(data.splitCoefficient)
          }),
          ...(data.provenanceId !== undefined && { provenanceId: data.provenanceId }),
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        // Record not found
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete market data record (hard delete)
   * For soft delete, use updateMarketData with a deleted_at field
   *
   * @param id Record ID
   * @returns true if deleted, false if not found
   */
  async deleteMarketData(id: number): Promise<boolean> {
    try {
      await this.prisma.marketData.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        // Record not found
        return false;
      }
      throw error;
    }
  }

  /**
   * Get market data by IDs (used for signal calculation dependencies)
   *
   * @param ids Array of market data IDs
   * @returns Array of market data records
   */
  async getMarketDataByIds(ids: number[]): Promise<MarketData[]> {
    const records = await this.prisma.marketData.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        provenance: true,
      },
    });

    return records.map(this.mapPrismaToMarketData);
  }

  /**
   * Map Prisma record to MarketData interface
   * Converts Decimal to number for application use
   */
  private mapPrismaToMarketData(record: any): MarketData {
    return {
      id: record.id,
      symbol: record.symbol,
      dataType: record.dataType,
      timestamp: record.timestamp,
      date: record.date,
      open: record.open ? parseFloat(record.open.toString()) : undefined,
      high: record.high ? parseFloat(record.high.toString()) : undefined,
      low: record.low ? parseFloat(record.low.toString()) : undefined,
      close: parseFloat(record.close.toString()),
      volume: record.volume,
      adjustedClose: record.adjustedClose ? parseFloat(record.adjustedClose.toString()) : undefined,
      splitCoefficient: record.splitCoefficient
        ? parseFloat(record.splitCoefficient.toString())
        : undefined,
      provenanceId: record.provenanceId,
    };
  }
}
