/**
 * AlertManager
 * Story 4.0f: Monitoring & Observability - Task 4.1
 *
 * Manages alert rules, evaluation, and notification delivery.
 * Integrates with Railway webhooks and external notification channels.
 */

import type {
  AlertRule,
  QualityAlert,
  NotificationChannel,
  AlertSeverity,
} from '../../types/monitoring';

export class AlertManager {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, QualityAlert> = new Map();
  private alertThrottleTracker: Map<string, Date> = new Map();

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Create a new alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateRuleId();
    const now = new Date();

    const alertRule: AlertRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.alertRules.set(id, alertRule);

    console.log(`✅ Created alert rule: ${rule.name} (${id})`);

    // In production, persist to PostgreSQL
    // await prisma.alertRule.create({ data: alertRule });

    return id;
  }

  /**
   * Update an existing alert rule
   */
  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<void> {
    const rule = this.alertRules.get(id);

    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      id, // Prevent ID changes
      createdAt: rule.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    this.alertRules.set(id, updatedRule);

    console.log(`📝 Updated alert rule: ${id}`);

    // In production, persist to PostgreSQL
    // await prisma.alertRule.update({ where: { id }, data: updates });
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(id: string): Promise<void> {
    const rule = this.alertRules.get(id);

    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    this.alertRules.delete(id);

    console.log(`🗑️ Deleted alert rule: ${id}`);

    // In production, delete from PostgreSQL
    // await prisma.alertRule.delete({ where: { id } });
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get enabled alert rules
   */
  async getEnabledRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values()).filter((rule) => rule.enabled);
  }

  // ============================================================================
  // Alert Lifecycle
  // ============================================================================

  /**
   * Evaluate metric against all rules and trigger alerts
   */
  async evaluateMetric(metric: string, currentValue: number, source: string): Promise<void> {
    const rules = await this.getEnabledRules();

    for (const rule of rules) {
      if (rule.metric !== metric) continue;

      const shouldAlert = this.evaluateCondition(rule.condition, currentValue);

      if (shouldAlert && !this.isThrottled(rule.id)) {
        await this.triggerAlert({
          id: this.generateAlertId(),
          severity: rule.severity,
          metric: rule.metric,
          threshold: rule.condition.threshold,
          currentValue,
          timestamp: new Date(),
          source,
          message: this.generateAlertMessage(rule, currentValue),
          recommendation: this.generateRecommendation(rule, currentValue),
          acknowledged: false,
          resolved: false,
        });

        this.updateThrottle(rule.id);
      }
    }
  }

  /**
   * Trigger a new alert
   */
  async triggerAlert(alert: QualityAlert): Promise<void> {
    this.activeAlerts.set(alert.id, alert);

    console.log(`🚨 ALERT [${alert.severity}]: ${alert.message}`);

    // Find rules that match this metric
    const matchingRules = Array.from(this.alertRules.values()).filter(
      (rule) => rule.metric === alert.metric && rule.enabled
    );

    // Send notifications for each matching rule
    for (const rule of matchingRules) {
      await this.sendNotification(alert, rule.channels);
    }

    // In production, persist alert to PostgreSQL
    // await prisma.alert.create({ data: alert });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    console.log(`✅ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);

    // In production, update PostgreSQL
    // await prisma.alert.update({
    //   where: { id: alertId },
    //   data: {
    //     acknowledged: true,
    //     acknowledgedBy,
    //     acknowledgedAt: new Date(),
    //   },
    // });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    console.log(`✅ Alert resolved: ${alertId} by ${resolvedBy}`);

    // In production, update PostgreSQL
    // await prisma.alert.update({
    //   where: { id: alertId },
    //   data: {
    //     resolved: true,
    //     resolvedBy,
    //     resolvedAt: new Date(),
    //     resolution,
    //   },
    // });
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<QualityAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts by severity
   */
  async getAlertsBySeverity(severity: AlertSeverity): Promise<QualityAlert[]> {
    return Array.from(this.activeAlerts.values()).filter((alert) => alert.severity === severity);
  }

  // ============================================================================
  // Notification Delivery
  // ============================================================================

  /**
   * Send alert notification to all configured channels
   */
  private async sendNotification(alert: QualityAlert, channels: NotificationChannel[]): Promise<void> {
    const promises = channels.map((channel) => this.sendToChannel(alert, channel));
    await Promise.allSettled(promises);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(alert: QualityAlert, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(alert, channel.recipients);
          break;
        case 'slack':
          await this.sendSlackNotification(alert, channel.webhookUrl);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert, channel.url, channel.headers);
          break;
        case 'pagerduty':
          await this.sendPagerDutyNotification(alert, channel.serviceKey);
          break;
        case 'sms':
          await this.sendSMSNotification(alert, channel.phoneNumbers);
          break;
      }

      console.log(`📤 Notification sent via ${channel.type}`);
    } catch (error) {
      console.error(`❌ Failed to send notification via ${channel.type}:`, error);
    }
  }

  private async sendEmailNotification(alert: QualityAlert, recipients: string[]): Promise<void> {
    // In production, integrate with SendGrid/Postmark
    console.log(`📧 Email notification to ${recipients.join(', ')}:`, alert.message);
  }

  private async sendSlackNotification(alert: QualityAlert, webhookUrl: string): Promise<void> {
    const payload = {
      text: `🚨 *${alert.severity.toUpperCase()}*: ${alert.message}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Metric', value: alert.metric, short: true },
            { title: 'Current Value', value: alert.currentValue.toString(), short: true },
            { title: 'Threshold', value: alert.threshold.toString(), short: true },
            { title: 'Source', value: alert.source, short: true },
          ],
          footer: alert.recommendation || undefined,
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    // In production, send to Slack webhook
    console.log(`📱 Slack notification to ${webhookUrl}:`, payload);
  }

  private async sendWebhookNotification(
    alert: QualityAlert,
    url: string,
    headers?: Record<string, string>
  ): Promise<void> {
    // In production, send POST request
    console.log(`🔗 Webhook notification to ${url}:`, alert);
  }

  private async sendPagerDutyNotification(alert: QualityAlert, serviceKey: string): Promise<void> {
    // In production, integrate with PagerDuty Events API
    console.log(`📟 PagerDuty notification (service: ${serviceKey}):`, alert);
  }

  private async sendSMSNotification(alert: QualityAlert, phoneNumbers: string[]): Promise<void> {
    // In production, integrate with Twilio/SMS provider
    console.log(`📲 SMS notification to ${phoneNumbers.join(', ')}:`, alert.message);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private evaluateCondition(
    condition: AlertRule['condition'],
    currentValue: number
  ): boolean {
    switch (condition.operator) {
      case '>':
        return currentValue > condition.threshold;
      case '<':
        return currentValue < condition.threshold;
      case '==':
        return currentValue === condition.threshold;
      case '!=':
        return currentValue !== condition.threshold;
      default:
        return false;
    }
  }

  private isThrottled(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    const lastAlert = this.alertThrottleTracker.get(ruleId);
    if (!lastAlert) return false;

    const now = Date.now();
    const throttleMs = rule.throttle * 1000;
    return now - lastAlert.getTime() < throttleMs;
  }

  private updateThrottle(ruleId: string): void {
    this.alertThrottleTracker.set(ruleId, new Date());
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    return `${rule.name}: ${rule.metric} is ${currentValue} (threshold: ${rule.condition.operator} ${rule.condition.threshold})`;
  }

  private generateRecommendation(rule: AlertRule, currentValue: number): string | undefined {
    // Generate contextual recommendations
    if (rule.metric.includes('quality')) {
      return 'Review data validation rules and check data source health';
    }
    if (rule.metric.includes('latency') || rule.metric.includes('response_time')) {
      return 'Check database query performance and API response times';
    }
    if (rule.metric.includes('error')) {
      return 'Review error logs and check service health';
    }
    return undefined;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    };
    return colors[severity];
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
  } {
    const activeAlertArray = Array.from(this.activeAlerts.values());

    return {
      totalRules: this.alertRules.size,
      enabledRules: Array.from(this.alertRules.values()).filter((r) => r.enabled).length,
      activeAlerts: this.activeAlerts.size,
      alertsBySeverity: {
        info: activeAlertArray.filter((a) => a.severity === 'info').length,
        warning: activeAlertArray.filter((a) => a.severity === 'warning').length,
        error: activeAlertArray.filter((a) => a.severity === 'error').length,
        critical: activeAlertArray.filter((a) => a.severity === 'critical').length,
      },
    };
  }
}

// Export singleton instance
export const alertManager = new AlertManager();
