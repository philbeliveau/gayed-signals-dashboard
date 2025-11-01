/**
 * AuditService
 * Story 4.0f: Monitoring & Observability - Task 2.1
 *
 * Core audit logging service for tracking data operations, user actions,
 * and system events with complete provenance and compliance reporting.
 */

import type {
  AuditLog,
  AuditLogFilters,
  DataLineage,
  ComplianceReport,
  DataOperation,
  UserAction,
  SystemEvent,
  Actor,
  AuditLogMetadata,
} from '../../types/monitoring';

export class AuditService {
  private correlationIdCounter = 0;

  // ============================================================================
  // Core Audit Logging
  // ============================================================================

  /**
   * Log a data operation (fetch, store, update, delete, validate)
   */
  async logDataOperation(operation: DataOperation): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'DATA_OPERATION',
      actor: {
        id: 'system',
        type: 'system',
        name: 'Data Pipeline',
      },
      action: operation.operationType,
      resource: operation.resource,
      details: {
        metadata: operation.metadata,
        data: this.maskSensitiveData(operation.data),
      },
      result: operation.metadata.success ? 'SUCCESS' : 'FAILURE',
      errorMessage: operation.metadata.errorMessage,
      metadata: {
        correlationId: this.generateCorrelationId(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown',
      },
    };

    await this.storeAuditLog(auditLog);
  }

  /**
   * Log a user action
   */
  async logUserAction(action: UserAction): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'USER_ACTION',
      actor: {
        id: action.userId,
        type: 'user',
        name: action.userId, // Would be enriched with actual user data
      },
      action: action.actionType,
      resource: action.resource,
      details: this.maskSensitiveData(action.metadata),
      result: 'SUCCESS',
      metadata: {
        correlationId: this.generateCorrelationId(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown',
      },
    };

    await this.storeAuditLog(auditLog);
  }

  /**
   * Log a system event
   */
  async logSystemEvent(event: SystemEvent): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'SYSTEM_EVENT',
      actor: {
        id: event.component,
        type: 'system',
        name: event.component,
      },
      action: event.eventType,
      resource: event.component,
      details: this.maskSensitiveData(event.metadata),
      result: event.severity === 'critical' || event.severity === 'error' ? 'FAILURE' : 'SUCCESS',
      errorMessage: event.severity === 'critical' || event.severity === 'error' ? event.message : undefined,
      metadata: {
        correlationId: this.generateCorrelationId(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown',
      },
    };

    await this.storeAuditLog(auditLog);
  }

  // ============================================================================
  // Query Audit Logs
  // ============================================================================

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    // In production, this would query PostgreSQL via Prisma
    // For now, returning mock data structure
    console.log('Querying audit logs with filters:', filters);

    // This would be implemented as:
    // const logs = await prisma.auditLog.findMany({
    //   where: {
    //     type: filters.type,
    //     actorId: filters.actorId,
    //     action: filters.action,
    //     resource: filters.resource,
    //     result: filters.result,
    //     timestamp: {
    //       gte: filters.startDate,
    //       lte: filters.endDate,
    //     },
    //   },
    //   take: filters.limit || 100,
    //   skip: filters.offset || 0,
    //   orderBy: {
    //     timestamp: 'desc',
    //   },
    // });

    return [];
  }

  /**
   * Get complete data lineage for a signal
   */
  async getDataLineage(signalId: string): Promise<DataLineage> {
    console.log('Fetching data lineage for signal:', signalId);

    // In production, this would trace through provenance tables
    // const lineage = await prisma.dataProvenance.findMany({
    //   where: { signalId },
    //   include: {
    //     transformations: true,
    //     qualityChecks: true,
    //   },
    // });

    // Mock structure for now
    return {
      signalId,
      source: {
        system: 'yahoo-finance',
        timestamp: new Date(),
        originalData: {},
        source: 'YAHOO_FINANCE_API',
      },
      transformations: [],
      destination: {
        system: 'signal-calculator',
        timestamp: new Date(),
        finalData: {},
      },
      qualityChecks: [],
      createdAt: new Date(),
    };
  }

  // ============================================================================
  // Compliance Reports
  // ============================================================================

  /**
   * Generate compliance report for specified period
   */
  async generateComplianceReport(period: {
    start: Date;
    end: Date;
  }): Promise<ComplianceReport> {
    const logs = await this.queryAuditLogs({
      startDate: period.start,
      endDate: period.end,
    });

    const totalOperations = logs.length;
    const successfulOperations = logs.filter((log) => log.result === 'SUCCESS').length;
    const failedOperations = totalOperations - successfulOperations;
    const uniqueUsers = new Set(logs.filter((log) => log.actor.type === 'user').map((log) => log.actor.id)).size;
    const dataAccessCount = logs.filter((log) => log.type === 'DATA_OPERATION').length;
    const securityIncidents = logs.filter(
      (log) => log.type === 'SYSTEM_EVENT' && log.result === 'FAILURE'
    ).length;

    return {
      id: this.generateId(),
      type: 'MONTHLY_SUMMARY',
      period,
      summary: {
        totalOperations,
        successfulOperations,
        failedOperations,
        uniqueUsers,
        dataAccessCount,
        securityIncidents,
      },
      auditTrail: logs,
      issues: [],
      recommendations: this.generateRecommendations(logs),
      generatedAt: new Date(),
      generatedBy: {
        id: 'audit-service',
        type: 'system',
        name: 'Audit Service',
      },
    };
  }

  /**
   * Export audit logs in specified format
   */
  async exportAuditLogs(
    format: 'json' | 'csv',
    filters: AuditLogFilters
  ): Promise<string> {
    const logs = await this.queryAuditLogs(filters);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'Type',
      'Actor',
      'Action',
      'Resource',
      'Result',
      'Error',
    ];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.type,
      log.actor.name,
      log.action,
      log.resource,
      log.result,
      log.errorMessage || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async storeAuditLog(log: AuditLog): Promise<void> {
    // In production, this would store to PostgreSQL via Prisma
    // await prisma.auditLog.create({ data: log });

    // For development, log to console
    console.log('Audit Log:', {
      type: log.type,
      actor: log.actor.name,
      action: log.action,
      resource: log.resource,
      result: log.result,
      timestamp: log.timestamp.toISOString(),
    });
  }

  private maskSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'apiKey',
      'api_key',
      'secret',
      'token',
      'ssn',
      'creditCard',
      'email', // May want to partially mask
    ];

    const masked = { ...data };

    Object.keys(masked).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = '***MASKED***';
      }
    });

    return masked;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateCorrelationId(): string {
    this.correlationIdCounter++;
    return `corr_${Date.now()}_${this.correlationIdCounter}`;
  }

  private generateRecommendations(logs: AuditLog[]): string[] {
    const recommendations: string[] = [];

    const failureRate = logs.filter((log) => log.result === 'FAILURE').length / logs.length;
    if (failureRate > 0.1) {
      recommendations.push(
        `High failure rate detected (${(failureRate * 100).toFixed(1)}%). Review error patterns and implement preventive measures.`
      );
    }

    const uniqueErrors = new Set(
      logs.filter((log) => log.errorMessage).map((log) => log.errorMessage)
    );
    if (uniqueErrors.size > 10) {
      recommendations.push(
        `Multiple distinct error types detected (${uniqueErrors.size}). Consider consolidating error handling.`
      );
    }

    const dataOps = logs.filter((log) => log.type === 'DATA_OPERATION');
    if (dataOps.length > 10000) {
      recommendations.push(
        `High volume of data operations (${dataOps.length}). Consider implementing caching strategies.`
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const auditService = new AuditService();
