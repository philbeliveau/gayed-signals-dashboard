/**
 * ProvenanceRepository - Data access layer for data_provenance table
 * Story: 4.0b - Data Persistence Layer
 *
 * Tracks source, quality, and lineage of all market data.
 * Supports recursive queries for data lineage tracing.
 */

import { PrismaClient, DataProvenance as PrismaDataProvenance } from '../../generated/client';

export interface ProvenanceData {
  id?: number;
  sourceSystem: string;
  sourceEndpoint?: string;
  sourceQueryParams?: Record<string, any>;
  requestTimestamp: Date;
  responseTimestamp?: Date;
  responseStatus?: number;
  responseHeaders?: Record<string, any>;
  recordsReceived?: number;
  recordsValid?: number;
  recordsInvalid?: number;
  validationErrors?: any;
  transformationApplied?: string;
  transformationParams?: Record<string, any>;
  apiCreditsUsed?: number;
  rateLimitRemaining?: number;
  createdBy?: string;
  status: 'pending' | 'completed' | 'failed' | 'partial';
  errorMessage?: string;
  parentProvenanceId?: number;
}

export class ProvenanceRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new provenance record
   * Typically created before fetching data from an external API
   *
   * @param data Provenance metadata
   * @returns ID of created provenance record
   */
  async createProvenance(data: ProvenanceData): Promise<number> {
    const result = await this.prisma.dataProvenance.create({
      data: {
        sourceSystem: data.sourceSystem,
        sourceEndpoint: data.sourceEndpoint,
        sourceQueryParams: data.sourceQueryParams,
        requestTimestamp: data.requestTimestamp,
        responseTimestamp: data.responseTimestamp,
        responseStatus: data.responseStatus,
        responseHeaders: data.responseHeaders,
        recordsReceived: data.recordsReceived,
        recordsValid: data.recordsValid,
        recordsInvalid: data.recordsInvalid,
        validationErrors: data.validationErrors,
        transformationApplied: data.transformationApplied,
        transformationParams: data.transformationParams,
        apiCreditsUsed: data.apiCreditsUsed,
        rateLimitRemaining: data.rateLimitRemaining,
        createdBy: data.createdBy,
        status: data.status,
        errorMessage: data.errorMessage,
        parentProvenanceId: data.parentProvenanceId,
      },
    });

    return result.id;
  }

  /**
   * Update an existing provenance record
   * Typically updated after API response is received
   *
   * @param id Provenance record ID
   * @param updates Partial provenance data to update
   * @returns true if updated, false if not found
   */
  async updateProvenance(
    id: number,
    updates: Partial<ProvenanceData>
  ): Promise<boolean> {
    try {
      await this.prisma.dataProvenance.update({
        where: { id },
        data: {
          ...(updates.responseTimestamp !== undefined && {
            responseTimestamp: updates.responseTimestamp,
          }),
          ...(updates.responseStatus !== undefined && {
            responseStatus: updates.responseStatus,
          }),
          ...(updates.responseHeaders !== undefined && {
            responseHeaders: updates.responseHeaders,
          }),
          ...(updates.recordsReceived !== undefined && {
            recordsReceived: updates.recordsReceived,
          }),
          ...(updates.recordsValid !== undefined && {
            recordsValid: updates.recordsValid,
          }),
          ...(updates.recordsInvalid !== undefined && {
            recordsInvalid: updates.recordsInvalid,
          }),
          ...(updates.validationErrors !== undefined && {
            validationErrors: updates.validationErrors,
          }),
          ...(updates.transformationApplied !== undefined && {
            transformationApplied: updates.transformationApplied,
          }),
          ...(updates.transformationParams !== undefined && {
            transformationParams: updates.transformationParams,
          }),
          ...(updates.apiCreditsUsed !== undefined && {
            apiCreditsUsed: updates.apiCreditsUsed,
          }),
          ...(updates.rateLimitRemaining !== undefined && {
            rateLimitRemaining: updates.rateLimitRemaining,
          }),
          ...(updates.status !== undefined && { status: updates.status }),
          ...(updates.errorMessage !== undefined && {
            errorMessage: updates.errorMessage,
          }),
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
   * Get provenance record by ID
   *
   * @param id Provenance record ID
   * @returns Provenance data or null if not found
   */
  async getProvenance(id: number): Promise<ProvenanceData | null> {
    const record = await this.prisma.dataProvenance.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    return record ? this.mapPrismaToProvenance(record) : null;
  }

  /**
   * Get provenance records by source system
   * Useful for auditing API usage and data quality
   *
   * @param source Source system name (e.g., 'alpha_vantage', 'fred')
   * @param startDate Optional start date filter
   * @param limit Maximum records to return
   * @returns Array of provenance records
   */
  async getProvenanceBySource(
    source: string,
    startDate?: Date,
    limit: number = 100
  ): Promise<ProvenanceData[]> {
    const records = await this.prisma.dataProvenance.findMany({
      where: {
        sourceSystem: source,
        ...(startDate && {
          requestTimestamp: { gte: startDate },
        }),
      },
      orderBy: {
        requestTimestamp: 'desc',
      },
      take: limit,
      include: {
        parent: true,
      },
    });

    return records.map(this.mapPrismaToProvenance);
  }

  /**
   * Get full data lineage for a market data record
   * Uses recursive query to trace all parent transformations
   *
   * @param marketDataId Market data record ID
   * @returns Array of provenance records (oldest to newest)
   */
  async getDataLineage(marketDataId: number): Promise<ProvenanceData[]> {
    // Get the market data record to find its provenance
    const marketData = await this.prisma.marketData.findUnique({
      where: { id: marketDataId },
      select: { provenanceId: true },
    });

    if (!marketData?.provenanceId) {
      return [];
    }

    // Get lineage using recursive CTE (via raw query for performance)
    const lineage = await this.prisma.$queryRaw<any[]>`
      WITH RECURSIVE lineage AS (
        -- Base case: get provenance for the market data
        SELECT p.*
        FROM data_provenance p
        WHERE p.id = ${marketData.provenanceId}

        UNION ALL

        -- Recursive case: get parent provenance
        SELECT p.*
        FROM data_provenance p
        INNER JOIN lineage l ON l.parent_provenance_id = p.id
      )
      SELECT * FROM lineage
      ORDER BY request_timestamp ASC
    `;

    return lineage.map(this.mapRawToProvenance);
  }

  /**
   * Get provenance records by status
   * Useful for monitoring failed or partial data fetches
   *
   * @param status Status filter
   * @param limit Maximum records to return
   * @returns Array of provenance records
   */
  async getProvenanceByStatus(
    status: 'pending' | 'completed' | 'failed' | 'partial',
    limit: number = 100
  ): Promise<ProvenanceData[]> {
    const records = await this.prisma.dataProvenance.findMany({
      where: { status },
      orderBy: {
        requestTimestamp: 'desc',
      },
      take: limit,
    });

    return records.map(this.mapPrismaToProvenance);
  }

  /**
   * Get API usage statistics for a source system
   * Useful for monitoring rate limits and costs
   *
   * @param source Source system name
   * @param startDate Start of date range
   * @param endDate End of date range
   * @returns Aggregated statistics
   */
  async getApiUsageStats(
    source: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalCreditsUsed: number;
    totalRecordsReceived: number;
    totalRecordsValid: number;
    averageResponseTime: number;
  }> {
    const stats = await this.prisma.dataProvenance.aggregate({
      where: {
        sourceSystem: source,
        requestTimestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      _sum: {
        apiCreditsUsed: true,
        recordsReceived: true,
        recordsValid: true,
      },
    });

    const successCount = await this.prisma.dataProvenance.count({
      where: {
        sourceSystem: source,
        requestTimestamp: { gte: startDate, lte: endDate },
        status: 'completed',
      },
    });

    const failedCount = await this.prisma.dataProvenance.count({
      where: {
        sourceSystem: source,
        requestTimestamp: { gte: startDate, lte: endDate },
        status: 'failed',
      },
    });

    // Calculate average response time
    const responseTimes = await this.prisma.$queryRaw<
      Array<{ avg_response_time: number }>
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (response_timestamp - request_timestamp))
      ) as avg_response_time
      FROM data_provenance
      WHERE source_system = ${source}
        AND request_timestamp >= ${startDate}
        AND request_timestamp <= ${endDate}
        AND response_timestamp IS NOT NULL
    `;

    return {
      totalRequests: stats._count,
      successfulRequests: successCount,
      failedRequests: failedCount,
      totalCreditsUsed: stats._sum.apiCreditsUsed || 0,
      totalRecordsReceived: stats._sum.recordsReceived || 0,
      totalRecordsValid: stats._sum.recordsValid || 0,
      averageResponseTime: responseTimes[0]?.avg_response_time || 0,
    };
  }

  /**
   * Map Prisma record to ProvenanceData interface
   */
  private mapPrismaToProvenance(record: any): ProvenanceData {
    return {
      id: record.id,
      sourceSystem: record.sourceSystem,
      sourceEndpoint: record.sourceEndpoint,
      sourceQueryParams: record.sourceQueryParams as Record<string, any>,
      requestTimestamp: record.requestTimestamp,
      responseTimestamp: record.responseTimestamp,
      responseStatus: record.responseStatus,
      responseHeaders: record.responseHeaders as Record<string, any>,
      recordsReceived: record.recordsReceived,
      recordsValid: record.recordsValid,
      recordsInvalid: record.recordsInvalid,
      validationErrors: record.validationErrors,
      transformationApplied: record.transformationApplied,
      transformationParams: record.transformationParams as Record<string, any>,
      apiCreditsUsed: record.apiCreditsUsed,
      rateLimitRemaining: record.rateLimitRemaining,
      createdBy: record.createdBy,
      status: record.status as 'pending' | 'completed' | 'failed' | 'partial',
      errorMessage: record.errorMessage,
      parentProvenanceId: record.parentProvenanceId,
    };
  }

  /**
   * Map raw SQL result to ProvenanceData interface
   */
  private mapRawToProvenance(row: any): ProvenanceData {
    return {
      id: row.id,
      sourceSystem: row.source_system,
      sourceEndpoint: row.source_endpoint,
      sourceQueryParams: row.source_query_params,
      requestTimestamp: row.request_timestamp,
      responseTimestamp: row.response_timestamp,
      responseStatus: row.response_status,
      responseHeaders: row.response_headers,
      recordsReceived: row.records_received,
      recordsValid: row.records_valid,
      recordsInvalid: row.records_invalid,
      validationErrors: row.validation_errors,
      transformationApplied: row.transformation_applied,
      transformationParams: row.transformation_params,
      apiCreditsUsed: row.api_credits_used,
      rateLimitRemaining: row.rate_limit_remaining,
      createdBy: row.created_by,
      status: row.status,
      errorMessage: row.error_message,
      parentProvenanceId: row.parent_provenance_id,
    };
  }
}
