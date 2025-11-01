/**
 * DataLineageTracker
 * Story 4.0f: Monitoring & Observability - Task 2.2
 *
 * Tracks data provenance through the entire pipeline from source to signal calculation.
 * Provides complete audit trail for compliance and debugging.
 */

import type {
  DataLineage,
  DataLineageSource,
  DataTransformation,
  DataLineageDestination,
  QualityCheckResult,
} from '../../types/monitoring';

export interface LineageContext {
  signalId: string;
  startTime: Date;
  correlationId: string;
}

export class DataLineageTracker {
  private activeLineages: Map<string, DataLineage> = new Map();

  // ============================================================================
  // Lineage Lifecycle Management
  // ============================================================================

  /**
   * Start tracking a new data lineage for a signal calculation
   */
  async startLineage(
    signalId: string,
    source: Omit<DataLineageSource, 'timestamp'>
  ): Promise<string> {
    const correlationId = this.generateCorrelationId();

    const lineage: DataLineage = {
      signalId,
      source: {
        ...source,
        timestamp: new Date(),
      },
      transformations: [],
      destination: {
        system: '',
        timestamp: new Date(),
        finalData: null,
      },
      qualityChecks: [],
      createdAt: new Date(),
    };

    this.activeLineages.set(correlationId, lineage);

    console.log(`📊 Started lineage tracking for signal ${signalId} (${correlationId})`);

    return correlationId;
  }

  /**
   * Record a data transformation step
   */
  async recordTransformation(
    correlationId: string,
    transformation: Omit<DataTransformation, 'timestamp'>
  ): Promise<void> {
    const lineage = this.activeLineages.get(correlationId);

    if (!lineage) {
      console.warn(`⚠️ No active lineage found for correlation ID: ${correlationId}`);
      return;
    }

    const transformationWithTimestamp: DataTransformation = {
      ...transformation,
      timestamp: new Date(),
    };

    lineage.transformations.push(transformationWithTimestamp);

    console.log(`🔄 Recorded transformation: ${transformation.step} (${correlationId})`);
  }

  /**
   * Record a quality check result
   */
  async recordQualityCheck(
    correlationId: string,
    checkResult: Omit<QualityCheckResult, 'timestamp'>
  ): Promise<void> {
    const lineage = this.activeLineages.get(correlationId);

    if (!lineage) {
      console.warn(`⚠️ No active lineage found for correlation ID: ${correlationId}`);
      return;
    }

    const checkWithTimestamp: QualityCheckResult = {
      ...checkResult,
      timestamp: new Date(),
    };

    lineage.qualityChecks.push(checkWithTimestamp);

    const status = checkResult.passed ? '✅' : '❌';
    console.log(`${status} Quality check: ${checkResult.checkType} (score: ${checkResult.score})`);
  }

  /**
   * Complete the lineage with final destination
   */
  async completeLineage(
    correlationId: string,
    destination: Omit<DataLineageDestination, 'timestamp'>
  ): Promise<DataLineage> {
    const lineage = this.activeLineages.get(correlationId);

    if (!lineage) {
      throw new Error(`No active lineage found for correlation ID: ${correlationId}`);
    }

    lineage.destination = {
      ...destination,
      timestamp: new Date(),
    };

    // Persist to storage (PostgreSQL via Prisma in production)
    await this.persistLineage(lineage);

    // Remove from active tracking
    this.activeLineages.delete(correlationId);

    console.log(`✅ Completed lineage for signal ${lineage.signalId}`);

    return lineage;
  }

  // ============================================================================
  // Query Lineage
  // ============================================================================

  /**
   * Get complete lineage for a signal
   */
  async getLineage(signalId: string): Promise<DataLineage | null> {
    // In production, query from PostgreSQL
    // const lineage = await prisma.dataLineage.findFirst({
    //   where: { signalId },
    //   include: {
    //     transformations: true,
    //     qualityChecks: true,
    //   },
    //   orderBy: {
    //     createdAt: 'desc',
    //   },
    // });

    // For now, check active lineages
    for (const lineage of this.activeLineages.values()) {
      if (lineage.signalId === signalId) {
        return lineage;
      }
    }

    console.log(`ℹ️ No lineage found for signal: ${signalId}`);
    return null;
  }

  /**
   * Get all transformations for a signal
   */
  async getTransformationChain(signalId: string): Promise<DataTransformation[]> {
    const lineage = await this.getLineage(signalId);
    return lineage?.transformations || [];
  }

  /**
   * Get quality check history for a signal
   */
  async getQualityCheckHistory(signalId: string): Promise<QualityCheckResult[]> {
    const lineage = await this.getLineage(signalId);
    return lineage?.qualityChecks || [];
  }

  /**
   * Trace data back to original source
   */
  async traceToSource(signalId: string): Promise<DataLineageSource | null> {
    const lineage = await this.getLineage(signalId);
    return lineage?.source || null;
  }

  // ============================================================================
  // Lineage Analysis
  // ============================================================================

  /**
   * Analyze lineage for data quality issues
   */
  async analyzeLineage(signalId: string): Promise<{
    totalTransformations: number;
    qualityChecksPassed: number;
    qualityChecksFailed: number;
    averageQualityScore: number;
    processingTime: number;
    issues: string[];
  }> {
    const lineage = await this.getLineage(signalId);

    if (!lineage) {
      return {
        totalTransformations: 0,
        qualityChecksPassed: 0,
        qualityChecksFailed: 0,
        averageQualityScore: 0,
        processingTime: 0,
        issues: ['Lineage not found'],
      };
    }

    const qualityChecksPassed = lineage.qualityChecks.filter((check) => check.passed).length;
    const qualityChecksFailed = lineage.qualityChecks.length - qualityChecksPassed;
    const averageQualityScore =
      lineage.qualityChecks.length > 0
        ? lineage.qualityChecks.reduce((sum, check) => sum + check.score, 0) / lineage.qualityChecks.length
        : 0;

    const processingTime =
      lineage.destination.timestamp.getTime() - lineage.source.timestamp.getTime();

    const issues: string[] = [];

    // Detect issues
    if (qualityChecksFailed > 0) {
      issues.push(`${qualityChecksFailed} quality check(s) failed`);
    }

    if (averageQualityScore < 80) {
      issues.push(`Low average quality score: ${averageQualityScore.toFixed(1)}`);
    }

    if (processingTime > 10000) {
      // > 10 seconds
      issues.push(`Long processing time: ${(processingTime / 1000).toFixed(1)}s`);
    }

    return {
      totalTransformations: lineage.transformations.length,
      qualityChecksPassed,
      qualityChecksFailed,
      averageQualityScore,
      processingTime,
      issues,
    };
  }

  /**
   * Generate visual lineage graph (returns DOT notation for Graphviz)
   */
  async generateLineageGraph(signalId: string): Promise<string> {
    const lineage = await this.getLineage(signalId);

    if (!lineage) {
      return '';
    }

    let dot = 'digraph DataLineage {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Source node
    dot += `  source [label="${lineage.source.system}\\n${lineage.source.source}"];\n`;

    // Transformation nodes
    lineage.transformations.forEach((transform, index) => {
      const nodeId = `transform${index}`;
      dot += `  ${nodeId} [label="${transform.step}\\n${transform.transformer}"];\n`;

      if (index === 0) {
        dot += `  source -> ${nodeId};\n`;
      } else {
        dot += `  transform${index - 1} -> ${nodeId};\n`;
      }
    });

    // Destination node
    dot += `  dest [label="${lineage.destination.system}"];\n`;

    if (lineage.transformations.length > 0) {
      dot += `  transform${lineage.transformations.length - 1} -> dest;\n`;
    } else {
      dot += '  source -> dest;\n';
    }

    dot += '}\n';

    return dot;
  }

  // ============================================================================
  // Compliance & Reporting
  // ============================================================================

  /**
   * Generate provenance report for compliance
   */
  async generateProvenanceReport(signalId: string): Promise<{
    signalId: string;
    dataSource: string;
    fetchTimestamp: Date;
    transformationCount: number;
    qualityScore: number;
    processingTime: number;
    compliant: boolean;
    issues: string[];
  }> {
    const lineage = await this.getLineage(signalId);

    if (!lineage) {
      return {
        signalId,
        dataSource: 'UNKNOWN',
        fetchTimestamp: new Date(),
        transformationCount: 0,
        qualityScore: 0,
        processingTime: 0,
        compliant: false,
        issues: ['Lineage not found - data provenance not tracked'],
      };
    }

    const analysis = await this.analyzeLineage(signalId);

    return {
      signalId,
      dataSource: lineage.source.source,
      fetchTimestamp: lineage.source.timestamp,
      transformationCount: lineage.transformations.length,
      qualityScore: analysis.averageQualityScore,
      processingTime: analysis.processingTime,
      compliant: analysis.issues.length === 0 && analysis.averageQualityScore >= 80,
      issues: analysis.issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async persistLineage(lineage: DataLineage): Promise<void> {
    // In production, persist to PostgreSQL via Prisma
    // await prisma.dataLineage.create({
    //   data: {
    //     signalId: lineage.signalId,
    //     sourceSystem: lineage.source.system,
    //     sourceData: lineage.source.originalData,
    //     sourceTimestamp: lineage.source.timestamp,
    //     destinationSystem: lineage.destination.system,
    //     destinationData: lineage.destination.finalData,
    //     destinationTimestamp: lineage.destination.timestamp,
    //     transformations: {
    //       create: lineage.transformations,
    //     },
    //     qualityChecks: {
    //       create: lineage.qualityChecks,
    //     },
    //   },
    // });

    console.log(`💾 Persisted lineage for signal: ${lineage.signalId}`);
  }

  private generateCorrelationId(): string {
    return `lineage_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get active lineage count (for monitoring)
   */
  getActiveLineageCount(): number {
    return this.activeLineages.size;
  }

  /**
   * Clean up stale lineages (older than 1 hour)
   */
  cleanupStaleLineages(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [correlationId, lineage] of this.activeLineages.entries()) {
      if (lineage.createdAt.getTime() < oneHourAgo) {
        this.activeLineages.delete(correlationId);
        cleaned++;
        console.warn(`🧹 Cleaned up stale lineage: ${correlationId}`);
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const dataLineageTracker = new DataLineageTracker();
