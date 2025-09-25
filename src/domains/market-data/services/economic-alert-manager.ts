/**
 * Economic Alert Management System
 * 
 * Comprehensive alert and notification system for housing and labor market indicators
 * Provides real-time monitoring, threshold management, and escalation protocols
 */

import { HousingLaborProcessor, AlertResult, AlertThreshold, EconomicIndicator } from './housing-labor-processor';
import { logger } from './production-logger';

// Notification channels
export type NotificationChannel = 'email' | 'push' | 'webhook' | 'dashboard' | 'log';

// Alert subscription
export interface AlertSubscription {
  id: string;
  userId: string;
  alertTypes: AlertThreshold['type'][];
  channels: NotificationChannel[];
  minimumSeverity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  filters?: {
    indicators?: string[];
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  };
}

// Notification message
export interface NotificationMessage {
  id: string;
  alertId: string;
  subscriberId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  data: AlertResult;
  sentAt: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  retryCount: number;
  error?: string;
}

// Alert history entry
export interface AlertHistoryEntry {
  id: string;
  alertResult: AlertResult;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  escalated: boolean;
  escalatedAt?: string;
  notificationsSent: number;
}

// System health metrics
export interface SystemHealthMetrics {
  alertsProcessed24h: number;
  alertsTriggered24h: number;
  averageProcessingTime: number;
  failedNotifications24h: number;
  systemUptime: number;
  lastDataUpdate: string;
  indicatorsMonitored: number;
  subscriptionsActive: number;
}

// Performance insights
export interface PerformanceInsights {
  topTriggeredAlerts: Array<{
    alertId: string;
    name: string;
    triggerCount: number;
    avgSeverity: number;
  }>;
  indicatorPerformance: Array<{
    indicator: string;
    dataQuality: number;
    updateFrequency: number;
    alertsGenerated: number;
  }>;
  responseTimeMetrics: {
    dataFetch: number;
    alertEvaluation: number;
    notificationDelivery: number;
  };
  recommendations: string[];
}

/**
 * Economic Alert Manager
 */
export class EconomicAlertManager {
  private processor: HousingLaborProcessor;
  private subscriptions: Map<string, AlertSubscription> = new Map();
  private alertHistory: Map<string, AlertHistoryEntry> = new Map();
  private notificationQueue: NotificationMessage[] = [];
  private processingMetrics: {
    alertsProcessed: number;
    alertsTriggered: number;
    processingTimes: number[];
    failedNotifications: number;
    startTime: number;
  };

  // Escalation rules
  private escalationRules = {
    criticalAlertTimeout: 30 * 60 * 1000, // 30 minutes
    warningAlertTimeout: 2 * 60 * 60 * 1000, // 2 hours
    maxRetries: 3,
    retryDelays: [60000, 300000, 900000] // 1min, 5min, 15min
  };

  constructor(processor: HousingLaborProcessor) {
    this.processor = processor;
    this.processingMetrics = {
      alertsProcessed: 0,
      alertsTriggered: 0,
      processingTimes: [],
      failedNotifications: 0,
      startTime: Date.now()
    };

    // Start background processes
    this.startAlertMonitoring();
    this.startNotificationProcessor();
  }

  /**
   * Add alert subscription
   */
  public addSubscription(subscription: AlertSubscription): void {
    this.subscriptions.set(subscription.id, subscription);
    logger.info('Alert subscription added', { 
      subscriptionId: subscription.id, 
      userId: subscription.userId,
      alertTypes: subscription.alertTypes
    });
  }

  /**
   * Remove alert subscription
   */
  public removeSubscription(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    logger.info('Alert subscription removed', { subscriptionId });
  }

  /**
   * Update subscription
   */
  public updateSubscription(subscriptionId: string, updates: Partial<AlertSubscription>): void {
    const existing = this.subscriptions.get(subscriptionId);
    if (existing) {
      this.subscriptions.set(subscriptionId, { ...existing, ...updates });
      logger.info('Alert subscription updated', { subscriptionId, updates });
    }
  }

  /**
   * Process alerts for economic data
   */
  public async processAlerts(data: Record<string, EconomicIndicator[]>): Promise<AlertResult[]> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing economic alerts', { 
        indicatorCount: Object.keys(data).length,
        subscriptionCount: this.subscriptions.size
      });

      // Evaluate alerts
      const alertResults = await this.processor.evaluateAlerts(data);
      
      // Process each alert result
      for (const alertResult of alertResults) {
        await this.processAlertResult(alertResult);
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.processingMetrics.alertsProcessed += alertResults.length;
      this.processingMetrics.alertsTriggered += alertResults.filter(a => a.triggered).length;
      this.processingMetrics.processingTimes.push(processingTime);

      // Keep only last 100 processing times for averaging
      if (this.processingMetrics.processingTimes.length > 100) {
        this.processingMetrics.processingTimes = this.processingMetrics.processingTimes.slice(-100);
      }

      logger.info('Alert processing completed', {
        totalAlerts: alertResults.length,
        triggeredAlerts: alertResults.filter(a => a.triggered).length,
        processingTime
      });

      return alertResults;

    } catch (error) {
      logger.error('Alert processing failed', { error });
      return [];
    }
  }

  /**
   * Process individual alert result
   */
  private async processAlertResult(alertResult: AlertResult): Promise<void> {
    // Create history entry
    const historyEntry: AlertHistoryEntry = {
      id: `${alertResult.id}_${Date.now()}`,
      alertResult,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      escalated: false,
      notificationsSent: 0
    };

    this.alertHistory.set(historyEntry.id, historyEntry);

    // If alert was triggered, send notifications
    if (alertResult.triggered) {
      await this.sendNotifications(alertResult, historyEntry);
    }
  }

  /**
   * Send notifications for triggered alert
   */
  private async sendNotifications(alertResult: AlertResult, historyEntry: AlertHistoryEntry): Promise<void> {
    const relevantSubscriptions = this.getRelevantSubscriptions(alertResult);

    for (const subscription of relevantSubscriptions) {
      if (!this.shouldSendNotification(subscription, alertResult)) {
        continue;
      }

      for (const channel of subscription.channels) {
        const notification = this.createNotification(alertResult, subscription, channel);
        this.notificationQueue.push(notification);
        historyEntry.notificationsSent++;
      }
    }

    logger.info('Notifications queued for alert', {
      alertId: alertResult.id,
      notificationCount: historyEntry.notificationsSent
    });
  }

  /**
   * Get subscriptions relevant to alert
   */
  private getRelevantSubscriptions(alertResult: AlertResult): AlertSubscription[] {
    return Array.from(this.subscriptions.values()).filter(subscription => {
      if (!subscription.enabled) return false;
      
      // Check alert type
      if (!subscription.alertTypes.includes(alertResult.type)) return false;
      
      // Check minimum severity
      const severityLevels = { info: 1, warning: 2, critical: 3 };
      if (severityLevels[alertResult.severity] < severityLevels[subscription.minimumSeverity]) {
        return false;
      }
      
      // Check filters
      if (subscription.filters) {
        if (subscription.filters.indicators && 
            !subscription.filters.indicators.includes(alertResult.data.indicator)) {
          return false;
        }
        
        // Check time of day filter
        if (subscription.filters.timeOfDay) {
          const now = new Date();
          const currentTime = now.toTimeString().slice(0, 5);
          const { start, end } = subscription.filters.timeOfDay;
          
          if (start <= end) {
            if (currentTime < start || currentTime > end) return false;
          } else {
            if (currentTime < start && currentTime > end) return false;
          }
        }
        
        // Check day of week filter
        if (subscription.filters.daysOfWeek) {
          const dayOfWeek = new Date().getDay();
          if (!subscription.filters.daysOfWeek.includes(dayOfWeek)) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  /**
   * Check if notification should be sent
   */
  private shouldSendNotification(subscription: AlertSubscription, alertResult: AlertResult): boolean {
    // Add rate limiting logic here
    // For now, return true
    return true;
  }

  /**
   * Create notification message
   */
  private createNotification(
    alertResult: AlertResult,
    subscription: AlertSubscription,
    channel: NotificationChannel
  ): NotificationMessage {
    const subject = this.generateSubject(alertResult);
    const body = this.generateBody(alertResult, channel);

    return {
      id: `${alertResult.id}_${subscription.id}_${channel}_${Date.now()}`,
      alertId: alertResult.id,
      subscriberId: subscription.id,
      channel,
      subject,
      body,
      data: alertResult,
      sentAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };
  }

  /**
   * Generate notification subject
   */
  private generateSubject(alertResult: AlertResult): string {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    return `${severityEmoji[alertResult.severity]} ${alertResult.name} - ${alertResult.severity.toUpperCase()}`;
  }

  /**
   * Generate notification body
   */
  private generateBody(alertResult: AlertResult, channel: NotificationChannel): string {
    const { data } = alertResult;
    
    let body = `Alert: ${alertResult.name}\n`;
    body += `Severity: ${alertResult.severity.toUpperCase()}\n`;
    body += `Triggered: ${new Date(alertResult.triggeredAt).toLocaleString()}\n\n`;
    body += `Message: ${alertResult.message}\n\n`;
    body += `Details:\n`;
    body += `- Indicator: ${data.indicator}\n`;
    body += `- Current Value: ${data.currentValue.toFixed(2)}\n`;
    body += `- Threshold: ${data.thresholdValue.toFixed(2)}\n`;

    if (data.context && Object.keys(data.context).length > 0) {
      body += `\nAdditional Context:\n`;
      for (const [key, value] of Object.entries(data.context)) {
        body += `- ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    // Format based on channel
    if (channel === 'email') {
      body = body.replace(/\n/g, '<br>');
    }

    return body;
  }

  /**
   * Start alert monitoring background process
   */
  private startAlertMonitoring(): void {
    // Check for unacknowledged critical alerts every 5 minutes
    setInterval(() => {
      this.checkForEscalation();
    }, 5 * 60 * 1000);
  }

  /**
   * Start notification processing background process
   */
  private startNotificationProcessor(): void {
    // Process notification queue every 30 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 30 * 1000);
  }

  /**
   * Check for alerts that need escalation
   */
  private checkForEscalation(): void {
    const now = Date.now();
    
    for (const [historyId, entry] of this.alertHistory.entries()) {
      if (entry.acknowledged || entry.resolved || entry.escalated) continue;
      
      const alertAge = now - new Date(entry.timestamp).getTime();
      const escalationTimeout = entry.alertResult.severity === 'critical' 
        ? this.escalationRules.criticalAlertTimeout
        : this.escalationRules.warningAlertTimeout;
      
      if (alertAge > escalationTimeout) {
        this.escalateAlert(entry);
      }
    }
  }

  /**
   * Escalate unacknowledged alert
   */
  private escalateAlert(entry: AlertHistoryEntry): void {
    entry.escalated = true;
    entry.escalatedAt = new Date().toISOString();
    
    logger.warn('Alert escalated due to no acknowledgment', {
      alertId: entry.alertResult.id,
      alertName: entry.alertResult.name,
      age: Date.now() - new Date(entry.timestamp).getTime()
    });
    
    // Create escalation notification
    const escalationNotification: NotificationMessage = {
      id: `escalation_${entry.id}_${Date.now()}`,
      alertId: entry.alertResult.id,
      subscriberId: 'system',
      channel: 'email',
      subject: `🔥 ESCALATED: ${entry.alertResult.name}`,
      body: `This alert has been escalated due to no acknowledgment.\n\nOriginal Alert: ${entry.alertResult.message}`,
      data: entry.alertResult,
      sentAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };
    
    this.notificationQueue.push(escalationNotification);
  }

  /**
   * Process notification queue
   */
  private async processNotificationQueue(): Promise<void> {
    const pendingNotifications = this.notificationQueue.filter(n => n.status === 'pending');
    
    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification);
        notification.status = 'sent';
      } catch (error) {
        logger.error('Failed to send notification', { 
          notificationId: notification.id,
          error
        });
        
        notification.retryCount++;
        notification.error = error instanceof Error ? error.message : 'Unknown error';
        
        if (notification.retryCount >= this.escalationRules.maxRetries) {
          notification.status = 'failed';
          this.processingMetrics.failedNotifications++;
        } else {
          // Schedule retry
          setTimeout(() => {
            notification.status = 'pending';
          }, this.escalationRules.retryDelays[notification.retryCount - 1] || 60000);
        }
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    switch (notification.channel) {
      case 'log':
        logger.info('Alert notification', {
          subject: notification.subject,
          body: notification.body,
          alertData: notification.data
        });
        break;
        
      case 'dashboard':
        // Dashboard notifications are handled by real-time updates
        break;
        
      case 'webhook':
        // Webhook implementation would go here
        logger.info('Webhook notification sent', { notificationId: notification.id });
        break;
        
      case 'email':
        // Email implementation would go here
        logger.info('Email notification sent', { notificationId: notification.id });
        break;
        
      case 'push':
        // Push notification implementation would go here
        logger.info('Push notification sent', { notificationId: notification.id });
        break;
        
      default:
        throw new Error(`Unsupported notification channel: ${notification.channel}`);
    }
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(historyId: string, acknowledgedBy: string): boolean {
    const entry = this.alertHistory.get(historyId);
    if (!entry) return false;
    
    entry.acknowledged = true;
    entry.acknowledgedBy = acknowledgedBy;
    entry.acknowledgedAt = new Date().toISOString();
    
    logger.info('Alert acknowledged', {
      historyId,
      alertId: entry.alertResult.id,
      acknowledgedBy
    });
    
    return true;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(historyId: string): boolean {
    const entry = this.alertHistory.get(historyId);
    if (!entry) return false;
    
    entry.resolved = true;
    entry.resolvedAt = new Date().toISOString();
    
    logger.info('Alert resolved', {
      historyId,
      alertId: entry.alertResult.id
    });
    
    return true;
  }

  /**
   * Get system health metrics
   */
  public getSystemHealthMetrics(): SystemHealthMetrics {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentHistory = Array.from(this.alertHistory.values())
      .filter(entry => new Date(entry.timestamp).getTime() > last24h);
    
    const averageProcessingTime = this.processingMetrics.processingTimes.length > 0
      ? this.processingMetrics.processingTimes.reduce((a, b) => a + b, 0) / this.processingMetrics.processingTimes.length
      : 0;
    
    return {
      alertsProcessed24h: recentHistory.length,
      alertsTriggered24h: recentHistory.filter(e => e.alertResult.triggered).length,
      averageProcessingTime,
      failedNotifications24h: this.processingMetrics.failedNotifications,
      systemUptime: now - this.processingMetrics.startTime,
      lastDataUpdate: new Date().toISOString(),
      indicatorsMonitored: this.processor.getEconomicSymbols().housing ? 
        Object.keys(this.processor.getEconomicSymbols().housing).length +
        Object.keys(this.processor.getEconomicSymbols().labor).length : 0,
      subscriptionsActive: Array.from(this.subscriptions.values()).filter(s => s.enabled).length
    };
  }

  /**
   * Get performance insights
   */
  public getPerformanceInsights(): PerformanceInsights {
    const alertCounts = new Map<string, number>();
    const indicatorStats = new Map<string, { alerts: number; quality: number }>();
    
    // Analyze alert history
    for (const entry of this.alertHistory.values()) {
      const alertId = entry.alertResult.id;
      alertCounts.set(alertId, (alertCounts.get(alertId) || 0) + 1);
      
      const indicator = entry.alertResult.data.indicator;
      const stats = indicatorStats.get(indicator) || { alerts: 0, quality: 100 };
      stats.alerts++;
      indicatorStats.set(indicator, stats);
    }
    
    const topTriggeredAlerts = Array.from(alertCounts.entries())
      .map(([alertId, count]) => ({
        alertId,
        name: alertId, // Would typically lookup alert name
        triggerCount: count,
        avgSeverity: 2 // Placeholder calculation
      }))
      .sort((a, b) => b.triggerCount - a.triggerCount)
      .slice(0, 10);
    
    const indicatorPerformance = Array.from(indicatorStats.entries())
      .map(([indicator, stats]) => ({
        indicator,
        dataQuality: stats.quality,
        updateFrequency: 1, // Placeholder
        alertsGenerated: stats.alerts
      }));
    
    const recommendations = this.generateRecommendations(topTriggeredAlerts, indicatorPerformance);
    
    return {
      topTriggeredAlerts,
      indicatorPerformance,
      responseTimeMetrics: {
        dataFetch: 500, // Placeholder
        alertEvaluation: 100,
        notificationDelivery: 200
      },
      recommendations
    };
  }

  /**
   * Generate system recommendations
   */
  private generateRecommendations(
    topAlerts: PerformanceInsights['topTriggeredAlerts'],
    indicators: PerformanceInsights['indicatorPerformance']
  ): string[] {
    const recommendations: string[] = [];
    
    // High-frequency alerts
    const highFrequencyAlerts = topAlerts.filter(a => a.triggerCount > 10);
    if (highFrequencyAlerts.length > 0) {
      recommendations.push(`Consider adjusting thresholds for frequently triggered alerts: ${highFrequencyAlerts.map(a => a.name).join(', ')}`);
    }
    
    // Data quality issues
    const lowQualityIndicators = indicators.filter(i => i.dataQuality < 90);
    if (lowQualityIndicators.length > 0) {
      recommendations.push(`Review data sources for indicators with quality issues: ${lowQualityIndicators.map(i => i.indicator).join(', ')}`);
    }
    
    // Performance optimization
    if (this.processingMetrics.processingTimes.some(t => t > 10000)) {
      recommendations.push('Consider optimizing alert processing performance - some evaluations taking >10 seconds');
    }
    
    return recommendations;
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): AlertHistoryEntry[] {
    return Array.from(this.alertHistory.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get active subscriptions
   */
  public getSubscriptions(): AlertSubscription[] {
    return Array.from(this.subscriptions.values());
  }
}

/**
 * Create default economic alert manager
 */
export function createEconomicAlertManager(processor: HousingLaborProcessor): EconomicAlertManager {
  return new EconomicAlertManager(processor);
}