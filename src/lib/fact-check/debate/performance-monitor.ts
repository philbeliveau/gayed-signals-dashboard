/**
 * Performance Monitor
 * Phase 3 - Debate System Engineer
 * 
 * Real-time monitoring and optimization for debate system performance
 */

import { DebateResult, DebateSystemMetrics } from './index';
import { ConsensusResult, DebateRound, Investigation } from '../../../types/fact-check';

export interface PerformanceThresholds {
  maxDebateTime: number; // milliseconds
  minConsensusRate: number; // 0-1
  maxConflictRate: number; // 0-1
  minConfidenceScore: number; // 0-100
  maxMemoryUsage: number; // MB
  maxConcurrentDebates: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'PERFORMANCE' | 'QUALITY' | 'SYSTEM' | 'THRESHOLD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metrics: Record<string, number>;
  timestamp: number;
  sessionId?: string;
  recommendations: string[];
}

export interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  components: {
    debateOrchestrator: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    conflictResolver: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    consensusCalculator: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    memoryCoordinator: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  };
  activeIssues: PerformanceAlert[];
  recommendations: string[];
  lastChecked: number;
}

export class PerformanceMonitor {
  private thresholds: PerformanceThresholds = {
    maxDebateTime: 120000, // 2 minutes
    minConsensusRate: 0.7, // 70%
    maxConflictRate: 0.3, // 30%
    minConfidenceScore: 60, // 60%
    maxMemoryUsage: 512, // 512MB
    maxConcurrentDebates: 10
  };

  private alerts: PerformanceAlert[] = [];
  private metricsHistory: Array<{
    timestamp: number;
    metrics: DebateSystemMetrics;
  }> = [];

  private performanceTimers: Map<string, number> = new Map();
  private alertCallbacks: Set<(alert: PerformanceAlert) => void> = new Set();

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Start monitoring a debate session
   */
  startDebateMonitoring(sessionId: string): void {
    this.performanceTimers.set(sessionId, Date.now());
  }

  /**
   * Stop monitoring and analyze results
   */
  stopDebateMonitoring(sessionId: string, result: DebateResult): PerformanceAlert[] {
    const startTime = this.performanceTimers.get(sessionId);
    if (!startTime) return [];

    const totalTime = Date.now() - startTime;
    this.performanceTimers.delete(sessionId);

    const alerts: PerformanceAlert[] = [];

    // Check debate time threshold
    if (totalTime > this.thresholds.maxDebateTime) {
      alerts.push(this.createAlert({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Debate session exceeded time threshold`,
        metrics: { actualTime: totalTime, threshold: this.thresholds.maxDebateTime },
        sessionId,
        recommendations: [
          'Consider reducing max debate rounds',
          'Optimize conflict resolution algorithms',
          'Implement early consensus detection'
        ]
      }));
    }

    // Check consensus confidence
    if (result.finalConsensus.confidenceScore < this.thresholds.minConfidenceScore) {
      alerts.push(this.createAlert({
        type: 'QUALITY',
        severity: 'MEDIUM',
        message: `Low consensus confidence score`,
        metrics: { 
          confidenceScore: result.finalConsensus.confidenceScore,
          threshold: this.thresholds.minConfidenceScore 
        },
        sessionId,
        recommendations: [
          'Improve evidence quality validation',
          'Adjust agent expertise weights',
          'Increase minimum evidence requirements'
        ]
      }));
    }

    // Check conflict resolution rate
    const conflictRate = result.conflictResolutions.length / 
      (result.debateRounds.flatMap(r => r.evidenceConflicts).length || 1);
    
    if (conflictRate > this.thresholds.maxConflictRate) {
      alerts.push(this.createAlert({
        type: 'QUALITY',
        severity: 'HIGH',
        message: `High conflict rate detected`,
        metrics: { conflictRate, threshold: this.thresholds.maxConflictRate },
        sessionId,
        recommendations: [
          'Review source credibility weights',
          'Implement better evidence filtering',
          'Adjust conflict detection sensitivity'
        ]
      }));
    }

    // Store alerts
    this.alerts.push(...alerts);
    
    return alerts;
  }

  /**
   * Monitor system-wide metrics
   */
  monitorSystemMetrics(metrics: DebateSystemMetrics): PerformanceAlert[] {
    // Store metrics history
    this.metricsHistory.push({
      timestamp: Date.now(),
      metrics: { ...metrics }
    });

    // Keep only last 24 hours of data
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoff);

    const alerts: PerformanceAlert[] = [];

    // Check consensus rate
    if (metrics.consensusRate < this.thresholds.minConsensusRate) {
      alerts.push(this.createAlert({
        type: 'SYSTEM',
        severity: 'HIGH',
        message: `System consensus rate below threshold`,
        metrics: { consensusRate: metrics.consensusRate, threshold: this.thresholds.minConsensusRate },
        recommendations: [
          'Review agent configuration',
          'Adjust consensus thresholds',
          'Improve evidence quality requirements'
        ]
      }));
    }

    // Check average debate time
    if (metrics.averageDebateTime > this.thresholds.maxDebateTime) {
      alerts.push(this.createAlert({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Average debate time exceeds threshold`,
        metrics: { averageTime: metrics.averageDebateTime, threshold: this.thresholds.maxDebateTime },
        recommendations: [
          'Optimize debate algorithms',
          'Implement parallel processing',
          'Reduce maximum debate rounds'
        ]
      }));
    }

    // Check performance breakdown for bottlenecks
    const performanceBreakdown = metrics.performanceBreakdown;
    const maxComponentTime = Math.max(...Object.values(performanceBreakdown));
    
    if (maxComponentTime > this.thresholds.maxDebateTime * 0.4) { // 40% of max time
      const bottleneckComponent = Object.entries(performanceBreakdown)
        .find(([_, time]) => time === maxComponentTime)?.[0];
      
      alerts.push(this.createAlert({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Performance bottleneck detected in ${bottleneckComponent}`,
        metrics: { componentTime: maxComponentTime, component: bottleneckComponent },
        recommendations: this.getBottleneckRecommendations(bottleneckComponent || '')
      }));
    }

    // Store and broadcast alerts
    this.alerts.push(...alerts);
    alerts.forEach(alert => this.broadcastAlert(alert));

    return alerts;
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    const recentAlerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp < 60 * 60 * 1000 // Last hour
    );

    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'CRITICAL');
    const highAlerts = recentAlerts.filter(alert => alert.severity === 'HIGH');

    let overallHealth: SystemHealth['overall'] = 'HEALTHY';
    if (criticalAlerts.length > 0) {
      overallHealth = 'CRITICAL';
    } else if (highAlerts.length > 2) {
      overallHealth = 'CRITICAL';
    } else if (highAlerts.length > 0 || recentAlerts.length > 5) {
      overallHealth = 'DEGRADED';
    }

    // Component health analysis
    const components = {
      debateOrchestrator: this.analyzeComponentHealth('debateOrchestrator', recentAlerts),
      conflictResolver: this.analyzeComponentHealth('conflictResolver', recentAlerts),
      consensusCalculator: this.analyzeComponentHealth('consensusCalculator', recentAlerts),
      memoryCoordinator: this.analyzeComponentHealth('memoryCoordinator', recentAlerts)
    };

    return {
      overall: overallHealth,
      components,
      activeIssues: recentAlerts,
      recommendations: this.generateSystemRecommendations(recentAlerts),
      lastChecked: Date.now()
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(hours: number = 24): {
    consensusRate: number[];
    averageDebateTime: number[];
    conflictResolutionRate: number[];
    timestamps: number[];
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const relevantMetrics = this.metricsHistory.filter(entry => entry.timestamp > cutoff);

    return {
      consensusRate: relevantMetrics.map(entry => entry.metrics.consensusRate),
      averageDebateTime: relevantMetrics.map(entry => entry.metrics.averageDebateTime),
      conflictResolutionRate: relevantMetrics.map(entry => entry.metrics.conflictResolutionRate),
      timestamps: relevantMetrics.map(entry => entry.timestamp)
    };
  }

  /**
   * Subscribe to performance alerts
   */
  subscribeToAlerts(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(hours: number = 24): PerformanceAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Private helper methods
   */
  private createAlert(params: {
    type: PerformanceAlert['type'];
    severity: PerformanceAlert['severity'];
    message: string;
    metrics: Record<string, any>;
    sessionId?: string;
    recommendations: string[];
  }): PerformanceAlert {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...params
    };
  }

  private analyzeComponentHealth(
    component: string,
    alerts: PerformanceAlert[]
  ): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    const componentAlerts = alerts.filter(alert => 
      alert.message.toLowerCase().includes(component.toLowerCase())
    );

    const criticalAlerts = componentAlerts.filter(alert => alert.severity === 'CRITICAL');
    const highAlerts = componentAlerts.filter(alert => alert.severity === 'HIGH');

    if (criticalAlerts.length > 0) return 'CRITICAL';
    if (highAlerts.length > 1) return 'DEGRADED';
    if (componentAlerts.length > 3) return 'DEGRADED';
    
    return 'HEALTHY';
  }

  private generateSystemRecommendations(alerts: PerformanceAlert[]): string[] {
    const recommendations = new Set<string>();
    
    alerts.forEach(alert => {
      alert.recommendations.forEach(rec => recommendations.add(rec));
    });

    // Add general recommendations based on alert patterns
    const performanceAlerts = alerts.filter(alert => alert.type === 'PERFORMANCE');
    const qualityAlerts = alerts.filter(alert => alert.type === 'QUALITY');

    if (performanceAlerts.length > 3) {
      recommendations.add('Consider horizontal scaling of debate processes');
      recommendations.add('Implement caching for frequently accessed data');
    }

    if (qualityAlerts.length > 2) {
      recommendations.add('Review and update evidence quality standards');
      recommendations.add('Implement additional validation layers');
    }

    return Array.from(recommendations);
  }

  private getBottleneckRecommendations(component: string): string[] {
    switch (component) {
      case 'debatePhase':
        return [
          'Implement parallel round processing',
          'Optimize argument generation algorithms',
          'Consider reducing debate complexity'
        ];
      case 'conflictResolution':
        return [
          'Optimize conflict detection algorithms',
          'Implement conflict resolution caching',
          'Use parallel resolution strategies'
        ];
      case 'consensusCalculation':
        return [
          'Optimize voting weight calculations',
          'Implement early consensus detection',
          'Use cached agent expertise scores'
        ];
      case 'memoryCoordination':
        return [
          'Optimize memory storage operations',
          'Implement memory pooling',
          'Use asynchronous memory operations'
        ];
      default:
        return ['Optimize general system performance'];
    }
  }

  private broadcastAlert(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  private startHealthChecks(): void {
    // Run health checks every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  private performHealthCheck(): void {
    // Check memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
      
      if (memoryMB > this.thresholds.maxMemoryUsage) {
        const alert = this.createAlert({
          type: 'SYSTEM',
          severity: 'HIGH',
          message: 'High memory usage detected',
          metrics: { memoryUsage: memoryMB, threshold: this.thresholds.maxMemoryUsage },
          recommendations: [
            'Implement memory cleanup routines',
            'Reduce cache sizes',
            'Monitor for memory leaks'
          ]
        });
        
        this.alerts.push(alert);
        this.broadcastAlert(alert);
      }
    }

    // Cleanup old alerts (keep last 7 days)
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(hours: number = 24): {
    summary: {
      totalAlerts: number;
      criticalIssues: number;
      averageResolutionTime: number;
      systemUptime: number;
    };
    trends: ReturnType<typeof this.getPerformanceTrends>;
    topIssues: PerformanceAlert[];
    recommendations: string[];
  } {
    const recentAlerts = this.getRecentAlerts(hours);
    const trends = this.getPerformanceTrends(hours);
    
    const criticalIssues = recentAlerts.filter(alert => alert.severity === 'CRITICAL').length;
    const topIssues = recentAlerts
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);

    return {
      summary: {
        totalAlerts: recentAlerts.length,
        criticalIssues,
        averageResolutionTime: 0, // Would need to track resolution times
        systemUptime: 100 - (criticalIssues / recentAlerts.length * 100) // Simplified calculation
      },
      trends,
      topIssues,
      recommendations: this.generateSystemRecommendations(recentAlerts)
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();