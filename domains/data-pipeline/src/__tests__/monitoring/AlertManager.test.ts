/**
 * AlertManager Unit Tests
 * Story 4.0f: Monitoring & Observability - Task 6.1
 */

import { AlertManager } from '../../services/AlertManager';
import type { AlertRule } from '../../../types/monitoring';

describe('AlertManager', () => {
  let manager: AlertManager;

  beforeEach(() => {
    manager = new AlertManager();
  });

  describe('createAlertRule', () => {
    it('should create a new alert rule', async () => {
      const ruleId = await manager.createAlertRule({
        name: 'High Error Rate',
        description: 'Trigger when error rate exceeds threshold',
        metric: 'api_error_rate',
        condition: {
          operator: '>',
          threshold: 0.1,
          duration: 300,
        },
        severity: 'error',
        channels: [],
        enabled: true,
        throttle: 600,
      });

      expect(ruleId).toBeDefined();
      expect(ruleId).toMatch(/^rule_/);
    });

    it('should store the rule', async () => {
      const ruleId = await manager.createAlertRule({
        name: 'Test Rule',
        description: 'Test',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 300,
      });

      const rules = await manager.getAlertRules();
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe(ruleId);
    });
  });

  describe('updateAlertRule', () => {
    it('should update an existing rule', async () => {
      const ruleId = await manager.createAlertRule({
        name: 'Original Name',
        description: 'Original',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 300,
      });

      await manager.updateAlertRule(ruleId, {
        name: 'Updated Name',
        severity: 'error',
      });

      const rules = await manager.getAlertRules();
      const updatedRule = rules.find((r) => r.id === ruleId);

      expect(updatedRule?.name).toBe('Updated Name');
      expect(updatedRule?.severity).toBe('error');
      expect(updatedRule?.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent rule', async () => {
      await expect(
        manager.updateAlertRule('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Alert rule not found');
    });
  });

  describe('deleteAlertRule', () => {
    it('should delete an existing rule', async () => {
      const ruleId = await manager.createAlertRule({
        name: 'To Delete',
        description: 'Will be deleted',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'info',
        channels: [],
        enabled: true,
        throttle: 300,
      });

      await manager.deleteAlertRule(ruleId);

      const rules = await manager.getAlertRules();
      expect(rules.find((r) => r.id === ruleId)).toBeUndefined();
    });

    it('should throw error for non-existent rule', async () => {
      await expect(manager.deleteAlertRule('nonexistent')).rejects.toThrow(
        'Alert rule not found'
      );
    });
  });

  describe('getEnabledRules', () => {
    it('should return only enabled rules', async () => {
      await manager.createAlertRule({
        name: 'Enabled Rule',
        description: 'Enabled',
        metric: 'metric1',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 300,
      });

      await manager.createAlertRule({
        name: 'Disabled Rule',
        description: 'Disabled',
        metric: 'metric2',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 60,
        },
        severity: 'warning',
        channels: [],
        enabled: false,
        throttle: 300,
      });

      const enabledRules = await manager.getEnabledRules();
      expect(enabledRules.length).toBe(1);
      expect(enabledRules[0].name).toBe('Enabled Rule');
    });
  });

  describe('evaluateMetric', () => {
    it('should trigger alert when condition met', async () => {
      await manager.createAlertRule({
        name: 'High Value Alert',
        description: 'Alerts on high values',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 0, // No throttle for testing
      });

      await manager.evaluateMetric('test_metric', 150, 'test-source');

      const activeAlerts = await manager.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].currentValue).toBe(150);
    });

    it('should not trigger alert when condition not met', async () => {
      await manager.createAlertRule({
        name: 'High Value Alert',
        description: 'Alerts on high values',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.evaluateMetric('test_metric', 50, 'test-source');

      const activeAlerts = await manager.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });

    it('should respect throttle period', async () => {
      const ruleId = await manager.createAlertRule({
        name: 'Throttled Alert',
        description: 'Has throttle',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 3600, // 1 hour
      });

      // First alert should trigger
      await manager.evaluateMetric('test_metric', 150, 'test-source');
      const alerts1 = await manager.getActiveAlerts();
      expect(alerts1.length).toBe(1);

      // Second alert should be throttled
      await manager.evaluateMetric('test_metric', 160, 'test-source');
      const alerts2 = await manager.getActiveAlerts();
      expect(alerts2.length).toBe(1); // Still only 1
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an active alert', async () => {
      await manager.createAlertRule({
        name: 'Test Rule',
        description: 'Test',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.evaluateMetric('test_metric', 150, 'test-source');
      const alerts = await manager.getActiveAlerts();
      const alertId = alerts[0].id;

      await manager.acknowledgeAlert(alertId, 'operator@example.com');

      const acknowledged = await manager.getActiveAlerts();
      expect(acknowledged[0].acknowledged).toBe(true);
      expect(acknowledged[0].acknowledgedBy).toBe('operator@example.com');
      expect(acknowledged[0].acknowledgedAt).toBeDefined();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      await manager.createAlertRule({
        name: 'Test Rule',
        description: 'Test',
        metric: 'test_metric',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.evaluateMetric('test_metric', 150, 'test-source');
      const alerts = await manager.getActiveAlerts();
      const alertId = alerts[0].id;

      await manager.resolveAlert(alertId, 'operator@example.com', 'Metric returned to normal');

      const activeAlerts = await manager.getActiveAlerts();
      expect(activeAlerts.length).toBe(0);
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should filter alerts by severity', async () => {
      await manager.createAlertRule({
        name: 'Critical Rule',
        description: 'Critical',
        metric: 'metric1',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'critical',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.createAlertRule({
        name: 'Warning Rule',
        description: 'Warning',
        metric: 'metric2',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.evaluateMetric('metric1', 150, 'source1');
      await manager.evaluateMetric('metric2', 150, 'source2');

      const criticalAlerts = await manager.getAlertsBySeverity('critical');
      const warningAlerts = await manager.getAlertsBySeverity('warning');

      expect(criticalAlerts.length).toBe(1);
      expect(warningAlerts.length).toBe(1);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return correct statistics', async () => {
      await manager.createAlertRule({
        name: 'Rule 1',
        description: 'Test',
        metric: 'metric1',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'critical',
        channels: [],
        enabled: true,
        throttle: 0,
      });

      await manager.createAlertRule({
        name: 'Rule 2',
        description: 'Test',
        metric: 'metric2',
        condition: {
          operator: '>',
          threshold: 100,
          duration: 0,
        },
        severity: 'warning',
        channels: [],
        enabled: false,
        throttle: 0,
      });

      await manager.evaluateMetric('metric1', 150, 'source1');

      const stats = manager.getAlertStatistics();

      expect(stats.totalRules).toBe(2);
      expect(stats.enabledRules).toBe(1);
      expect(stats.activeAlerts).toBe(1);
      expect(stats.alertsBySeverity.critical).toBe(1);
    });
  });
});
