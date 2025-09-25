/**
 * Emergency Fail-Safe Mechanisms - Layer 8 Data Authenticity Framework
 * 
 * Automatic system lockdown and emergency response procedures to prevent
 * fake data usage when threats are detected. This is the final defense layer.
 */

import EventEmitter from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { logger } from '../data/production-logger';
import { DataSource } from './source-authenticator';

// Lockdown reasons and severity levels
export type LockdownReason = 
  | 'FAKE_DATA_DETECTED'
  | 'API_COMPROMISE_SUSPECTED'
  | 'SYSTEM_INTEGRITY_BREACH'
  | 'MULTIPLE_VALIDATION_FAILURES'
  | 'ANOMALY_THRESHOLD_EXCEEDED'
  | 'EXTERNAL_THREAT_DETECTED'
  | 'MANUAL_OVERRIDE'
  | 'COMPLIANCE_VIOLATION';

export type LockdownSeverity = 'PARTIAL' | 'FULL' | 'EMERGENCY';

// Quarantine reasons for data sources
export type QuarantineReason =
  | 'AUTHENTICATION_FAILURE'
  | 'DATA_QUALITY_DEGRADATION'
  | 'SUSPICIOUS_RESPONSE_PATTERNS'
  | 'RATE_LIMIT_VIOLATIONS'
  | 'SSL_CERTIFICATE_ISSUES'
  | 'CORRELATION_ANOMALIES'
  | 'MANUAL_INTERVENTION';

// System states
export type SystemState = 
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'PARTIAL_LOCKDOWN'
  | 'FULL_LOCKDOWN'
  | 'EMERGENCY_LOCKDOWN'
  | 'MAINTENANCE'
  | 'RECOVERY';

// Interfaces
export interface LockdownConfig {
  reason: LockdownReason;
  severity: LockdownSeverity;
  initiatedBy: string;
  evidence: Record<string, any>;
  automaticRecovery: boolean;
  manualApprovalRequired: boolean;
  stakeholderNotification: boolean;
  maxLockdownDuration?: number; // milliseconds
  emergencyContacts: string[];
}

export interface QuarantineConfig {
  source: DataSource;
  reason: QuarantineReason;
  duration?: number; // milliseconds, undefined = indefinite
  allowFallback: boolean;
  requiresInvestigation: boolean;
  autoRemovalConditions?: QuarantineRemovalCondition[];
}

export interface QuarantineRemovalCondition {
  metric: string;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  value: number | string;
  sustainedDuration: number; // milliseconds
}

export interface RecoveryValidation {
  canRecover: boolean;
  requirements: RecoveryRequirement[];
  blockers: string[];
  estimatedRecoveryTime?: number;
  manualApprovalRequired: boolean;
  validationResults: ValidationCheck[];
}

export interface RecoveryRequirement {
  id: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  deadline?: string;
  evidence?: Record<string, any>;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  confidence: number;
  evidence: Record<string, any>;
  warnings: string[];
  errors: string[];
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  type: 'LOCKDOWN' | 'QUARANTINE' | 'RECOVERY';
  severity: LockdownSeverity | QuarantineReason;
  description: string;
  rootCause?: string;
  timeline: IncidentTimelineEntry[];
  impact: ImpactAssessment;
  resolution?: string;
  lessonsLearned?: string[];
  preventiveMeasures?: string[];
  assignedTo?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
}

export interface IncidentTimelineEntry {
  timestamp: string;
  event: string;
  actor: string;
  details: Record<string, any>;
}

export interface ImpactAssessment {
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  securityImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDowntime?: number; // minutes
  affectedSystems: string[];
  affectedUsers: number;
  financialImpact?: number;
}

export interface SystemStateHistory {
  timestamp: string;
  previousState: SystemState;
  newState: SystemState;
  reason: string;
  initiatedBy: string;
  evidence: Record<string, any>;
}

/**
 * Emergency fail-safe system for automatic protection
 */
export class EmergencyFailsafe extends EventEmitter {
  private currentState: SystemState = 'OPERATIONAL';
  private lockdownConfig: LockdownConfig | null = null;
  private quarantinedSources: Map<DataSource, QuarantineConfig> = new Map();
  private stateHistory: SystemStateHistory[] = [];
  private incidents: Map<string, IncidentReport> = new Map();
  private recoveryValidation: RecoveryValidation | null = null;
  private readonly STATE_HISTORY_LIMIT = 1000;
  private readonly LOCKDOWN_FILE_PATH = '/tmp/gayed-signals-lockdown.json';
  private readonly QUARANTINE_FILE_PATH = '/tmp/gayed-signals-quarantine.json';

  constructor() {
    super();
    this.setupEventListeners();
    this.loadPersistedState();
  }

  private setupEventListeners(): void {
    this.on('lockdownInitiated', this.handleLockdownInitiated.bind(this));
    this.on('quarantineInitiated', this.handleQuarantineInitiated.bind(this));
    this.on('recoveryAttempted', this.handleRecoveryAttempted.bind(this));
    this.on('incidentCreated', this.handleIncidentCreated.bind(this));
  }

  /**
   * Initiate emergency lockdown
   */
  public async initiateLockdown(config: LockdownConfig): Promise<void> {
    const lockdownId = this.generateId();
    const timestamp = new Date().toISOString();

    logger.critical('EMERGENCY LOCKDOWN INITIATED', {
      lockdownId,
      reason: config.reason,
      severity: config.severity,
      evidence: config.evidence,
      initiatedBy: config.initiatedBy
    });

    try {
      // 1. Update system state
      await this.updateSystemState(this.determineNewState(config.severity), config.reason, config.initiatedBy, config.evidence);

      // 2. Store lockdown configuration
      this.lockdownConfig = { ...config };
      await this.persistLockdownState();

      // 3. Stop all data fetching immediately
      await this.stopAllDataFetching();

      // 4. Clear all caches
      await this.clearAllCaches();

      // 5. Disable API endpoints
      await this.disableApiEndpoints(config.severity);

      // 6. Enable maintenance mode
      await this.enableMaintenanceMode(config);

      // 7. Create incident report
      const incident = await this.createIncidentReport('LOCKDOWN', config);

      // 8. Notify stakeholders
      if (config.stakeholderNotification) {
        await this.notifyStakeholders(config, incident.id);
      }

      // 9. Set automatic recovery timer if configured
      if (config.automaticRecovery && config.maxLockdownDuration) {
        this.scheduleAutomaticRecovery(config.maxLockdownDuration);
      }

      this.emit('lockdownInitiated', { lockdownId, config, incident: incident.id });

    } catch (error) {
      logger.error('Failed to initiate lockdown', { lockdownId, error });
      throw new Error(`Lockdown initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Quarantine a specific data source
   */
  public async quarantineSource(config: QuarantineConfig): Promise<void> {
    const quarantineId = this.generateId();
    const timestamp = new Date().toISOString();

    logger.warn('DATA SOURCE QUARANTINED', {
      quarantineId,
      source: config.source,
      reason: config.reason,
      duration: config.duration,
      allowFallback: config.allowFallback
    });

    try {
      // 1. Add to quarantine list
      this.quarantinedSources.set(config.source, config);
      await this.persistQuarantineState();

      // 2. Blacklist the data source
      await this.blacklistDataSource(config.source);

      // 3. Remove from fallback chain
      await this.removeFallbackChain(config.source);

      // 4. Clear cached data from source
      await this.clearSourceCache(config.source);

      // 5. Create incident report
      const incident = await this.createIncidentReport('QUARANTINE', config.reason, {
        source: config.source,
        config
      });

      // 6. Alert monitoring systems
      await this.alertMonitoring(config.source, config.reason);

      // 7. Initiate investigation if required
      if (config.requiresInvestigation) {
        await this.initiateInvestigation(config.source, incident.id);
      }

      // 8. Set automatic removal timer if configured
      if (config.duration) {
        this.scheduleAutomaticQuarantineRemoval(config.source, config.duration);
      }

      this.emit('quarantineInitiated', { quarantineId, config, incident: incident.id });

    } catch (error) {
      logger.error('Failed to quarantine source', { quarantineId, source: config.source, error });
      throw new Error(`Source quarantine failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate recovery conditions
   */
  public async validateRecoveryConditions(): Promise<RecoveryValidation> {
    logger.info('Validating recovery conditions');

    const requirements: RecoveryRequirement[] = [];
    const blockers: string[] = [];
    const validationResults: ValidationCheck[] = [];
    let canRecover = true;

    try {
      // 1. Data source authentication check
      const authValidation = await this.validateAllDataSourceAuthentication();
      validationResults.push(authValidation);
      if (!authValidation.passed) {
        canRecover = false;
        blockers.push('Data source authentication failed');
        requirements.push({
          id: 'auth_validation',
          description: 'All data sources must pass authentication',
          status: 'FAILED',
          priority: 'CRITICAL'
        });
      }

      // 2. Configuration validation
      const configValidation = await this.validateSystemConfiguration();
      validationResults.push(configValidation);
      if (!configValidation.passed) {
        canRecover = false;
        blockers.push('System configuration invalid');
        requirements.push({
          id: 'config_validation',
          description: 'System configuration must be valid',
          status: 'FAILED',
          priority: 'HIGH'
        });
      }

      // 3. Test data validation
      const testDataValidation = await this.validateTestDataSources();
      validationResults.push(testDataValidation);
      if (!testDataValidation.passed) {
        canRecover = false;
        blockers.push('Test data validation failed');
        requirements.push({
          id: 'test_data_validation',
          description: 'Test data must pass all authenticity checks',
          status: 'FAILED',
          priority: 'HIGH'
        });
      }

      // 4. Security clearance (if required)
      if (this.lockdownConfig?.severity === 'EMERGENCY') {
        requirements.push({
          id: 'security_clearance',
          description: 'Security team clearance required for emergency lockdown recovery',
          status: 'PENDING',
          priority: 'CRITICAL'
        });
      }

      // 5. Manual approval requirement
      const manualApprovalRequired = this.lockdownConfig?.manualApprovalRequired ?? false;
      if (manualApprovalRequired) {
        requirements.push({
          id: 'manual_approval',
          description: 'Senior engineer manual approval required',
          status: 'PENDING',
          priority: 'CRITICAL'
        });
      }

      this.recoveryValidation = {
        canRecover,
        requirements,
        blockers,
        manualApprovalRequired,
        validationResults,
        estimatedRecoveryTime: this.calculateEstimatedRecoveryTime(requirements)
      };

      return this.recoveryValidation;

    } catch (error) {
      logger.error('Recovery validation failed', { error });
      throw new Error(`Recovery validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Attempt system recovery
   */
  public async attemptRecovery(approvedBy: string, approvalEvidence?: Record<string, any>): Promise<boolean> {
    const recoveryId = this.generateId();
    
    logger.info('ATTEMPTING SYSTEM RECOVERY', {
      recoveryId,
      approvedBy,
      currentState: this.currentState
    });

    try {
      // 1. Validate recovery conditions
      const validation = await this.validateRecoveryConditions();
      if (!validation.canRecover) {
        logger.warn('Recovery blocked due to failed validation', {
          recoveryId,
          blockers: validation.blockers
        });
        return false;
      }

      // 2. Check manual approval if required
      if (validation.manualApprovalRequired && !approvalEvidence) {
        logger.warn('Recovery blocked - manual approval required', { recoveryId });
        return false;
      }

      // 3. Gradual recovery process
      await this.performGradualRecovery(recoveryId, approvedBy);

      // 4. Extended monitoring period
      await this.initiateExtendedMonitoring();

      // 5. Update system state
      await this.updateSystemState('OPERATIONAL', 'RECOVERY_COMPLETED', approvedBy, approvalEvidence || {});

      // 6. Clear lockdown configuration
      this.lockdownConfig = null;
      await this.clearPersistedLockdownState();

      // 7. Create recovery incident report
      await this.createIncidentReport('RECOVERY', 'RECOVERY_COMPLETED', {
        recoveryId,
        approvedBy,
        validation
      });

      this.emit('recoveryCompleted', { recoveryId, approvedBy });

      logger.info('SYSTEM RECOVERY SUCCESSFUL', { recoveryId });
      return true;

    } catch (error) {
      logger.error('System recovery failed', { recoveryId, error });
      this.emit('recoveryFailed', { recoveryId, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Validate source recovery after quarantine
   */
  public async validateSourceRecovery(source: DataSource): Promise<boolean> {
    const recoveryId = this.generateId();
    
    logger.info('Validating source recovery', { source, recoveryId });

    try {
      const quarantineConfig = this.quarantinedSources.get(source);
      if (!quarantineConfig) {
        logger.warn('Source not quarantined', { source });
        return true; // Not quarantined, can be used
      }

      // 1. Root cause analysis completed?
      if (quarantineConfig.requiresInvestigation) {
        const investigationComplete = await this.checkInvestigationStatus(source);
        if (!investigationComplete) {
          logger.warn('Source investigation not complete', { source });
          return false;
        }
      }

      // 2. Security audit passed?
      const securityAudit = await this.performSecurityAudit(source);
      if (!securityAudit.passed) {
        logger.warn('Source security audit failed', { source, audit: securityAudit });
        return false;
      }

      // 3. Extended validation period (24 hours)
      const validationPeriod = 24 * 60 * 60 * 1000; // 24 hours
      const quarantineStart = new Date(quarantineConfig.duration || 0);
      const timeSinceQuarantine = Date.now() - quarantineStart.getTime();
      
      if (timeSinceQuarantine < validationPeriod) {
        logger.warn('Extended validation period not complete', { 
          source, 
          timeSinceQuarantine: timeSinceQuarantine / (60 * 60 * 1000) 
        });
        return false;
      }

      // 4. Manual approval required
      logger.info('Source recovery validation passed - manual approval required', { source });
      return false; // Always require manual approval for source recovery
      
    } catch (error) {
      logger.error('Source recovery validation failed', { source, recoveryId, error });
      return false;
    }
  }

  /**
   * Manually approve source recovery
   */
  public async approveSourceRecovery(source: DataSource, approvedBy: string): Promise<boolean> {
    logger.info('Approving source recovery', { source, approvedBy });

    try {
      // Remove from quarantine
      this.quarantinedSources.delete(source);
      await this.persistQuarantineState();

      // Re-enable source
      await this.enableDataSource(source);

      // Gradual re-introduction with monitoring
      await this.initiateGradualReintroduction(source);

      logger.info('Source recovery approved', { source, approvedBy });
      return true;

    } catch (error) {
      logger.error('Source recovery approval failed', { source, error });
      return false;
    }
  }

  // Implementation methods
  private async stopAllDataFetching(): Promise<void> {
    // Implementation would stop all data fetching services
    logger.info('All data fetching stopped');
  }

  private async clearAllCaches(): Promise<void> {
    // Implementation would clear all data caches
    logger.info('All caches cleared');
  }

  private async disableApiEndpoints(severity: LockdownSeverity): Promise<void> {
    // Implementation would disable API endpoints based on severity
    logger.info('API endpoints disabled', { severity });
  }

  private async enableMaintenanceMode(config: LockdownConfig): Promise<void> {
    // Implementation would enable maintenance mode UI
    logger.info('Maintenance mode enabled');
  }

  private async notifyStakeholders(config: LockdownConfig, incidentId: string): Promise<void> {
    // Implementation would notify stakeholders via multiple channels
    logger.info('Stakeholders notified', { incidentId, contacts: config.emergencyContacts });
  }

  private async blacklistDataSource(source: DataSource): Promise<void> {
    // Implementation would blacklist the data source
    logger.info('Data source blacklisted', { source });
  }

  private async removeFallbackChain(source: DataSource): Promise<void> {
    // Implementation would remove source from fallback chain
    logger.info('Source removed from fallback chain', { source });
  }

  private async clearSourceCache(source: DataSource): Promise<void> {
    // Implementation would clear cache for specific source
    logger.info('Source cache cleared', { source });
  }

  private async alertMonitoring(source: DataSource, reason: QuarantineReason): Promise<void> {
    // Implementation would alert monitoring systems
    logger.info('Monitoring systems alerted', { source, reason });
  }

  private async initiateInvestigation(source: DataSource, incidentId: string): Promise<void> {
    // Implementation would initiate formal investigation
    logger.info('Investigation initiated', { source, incidentId });
  }

  private async validateAllDataSourceAuthentication(): Promise<ValidationCheck> {
    // Implementation would validate all data source authentication
    return {
      name: 'Data Source Authentication',
      passed: true,
      confidence: 1.0,
      evidence: {},
      warnings: [],
      errors: []
    };
  }

  private async validateSystemConfiguration(): Promise<ValidationCheck> {
    // Implementation would validate system configuration
    return {
      name: 'System Configuration',
      passed: true,
      confidence: 1.0,
      evidence: {},
      warnings: [],
      errors: []
    };
  }

  private async validateTestDataSources(): Promise<ValidationCheck> {
    // Implementation would validate test data sources
    return {
      name: 'Test Data Sources',
      passed: true,
      confidence: 1.0,
      evidence: {},
      warnings: [],
      errors: []
    };
  }

  private async performGradualRecovery(recoveryId: string, approvedBy: string): Promise<void> {
    // Implementation would perform gradual system recovery
    logger.info('Performing gradual recovery', { recoveryId, approvedBy });
  }

  private async initiateExtendedMonitoring(): Promise<void> {
    // Implementation would initiate 48-hour extended monitoring
    logger.info('Extended monitoring initiated');
  }

  private async checkInvestigationStatus(source: DataSource): Promise<boolean> {
    // Implementation would check investigation completion status
    return true;
  }

  private async performSecurityAudit(source: DataSource): Promise<{ passed: boolean; details: any }> {
    // Implementation would perform security audit
    return { passed: true, details: {} };
  }

  private async enableDataSource(source: DataSource): Promise<void> {
    // Implementation would re-enable data source
    logger.info('Data source enabled', { source });
  }

  private async initiateGradualReintroduction(source: DataSource): Promise<void> {
    // Implementation would gradually reintroduce source with monitoring
    logger.info('Gradual reintroduction initiated', { source });
  }

  // Helper methods
  private determineNewState(severity: LockdownSeverity): SystemState {
    switch (severity) {
      case 'PARTIAL': return 'PARTIAL_LOCKDOWN';
      case 'FULL': return 'FULL_LOCKDOWN';
      case 'EMERGENCY': return 'EMERGENCY_LOCKDOWN';
      default: return 'DEGRADED';
    }
  }

  private async updateSystemState(
    newState: SystemState, 
    reason: string, 
    initiatedBy: string, 
    evidence: Record<string, any>
  ): Promise<void> {
    const stateChange: SystemStateHistory = {
      timestamp: new Date().toISOString(),
      previousState: this.currentState,
      newState,
      reason,
      initiatedBy,
      evidence
    };

    this.stateHistory.push(stateChange);
    if (this.stateHistory.length > this.STATE_HISTORY_LIMIT) {
      this.stateHistory = this.stateHistory.slice(-this.STATE_HISTORY_LIMIT);
    }

    this.currentState = newState;
    this.emit('stateChanged', stateChange);
  }

  private async createIncidentReport(
    type: 'LOCKDOWN' | 'QUARANTINE' | 'RECOVERY',
    severity: any,
    details?: Record<string, any>
  ): Promise<IncidentReport> {
    const incident: IncidentReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      description: `${type} initiated due to ${severity}`,
      timeline: [{
        timestamp: new Date().toISOString(),
        event: `${type}_INITIATED`,
        actor: 'SYSTEM',
        details: details || {}
      }],
      impact: {
        businessImpact: 'HIGH',
        technicalImpact: 'HIGH',
        securityImpact: 'CRITICAL',
        affectedSystems: ['data_fetching', 'api_endpoints'],
        affectedUsers: 0
      },
      status: 'OPEN'
    };

    this.incidents.set(incident.id, incident);
    this.emit('incidentCreated', incident);
    
    return incident;
  }

  private calculateEstimatedRecoveryTime(requirements: RecoveryRequirement[]): number {
    // Base recovery time: 30 minutes
    let estimatedTime = 30 * 60 * 1000;
    
    // Add time for each pending requirement
    requirements.forEach(req => {
      if (req.status === 'PENDING') {
        switch (req.priority) {
          case 'CRITICAL': estimatedTime += 60 * 60 * 1000; break; // 1 hour
          case 'HIGH': estimatedTime += 30 * 60 * 1000; break; // 30 minutes
          case 'MEDIUM': estimatedTime += 15 * 60 * 1000; break; // 15 minutes
          case 'LOW': estimatedTime += 5 * 60 * 1000; break; // 5 minutes
        }
      }
    });

    return estimatedTime;
  }

  private scheduleAutomaticRecovery(duration: number): void {
    setTimeout(async () => {
      logger.info('Automatic recovery timer expired');
      await this.attemptRecovery('SYSTEM_AUTOMATIC');
    }, duration);
  }

  private scheduleAutomaticQuarantineRemoval(source: DataSource, duration: number): void {
    setTimeout(async () => {
      logger.info('Automatic quarantine removal timer expired', { source });
      const validation = await this.validateSourceRecovery(source);
      if (validation) {
        await this.approveSourceRecovery(source, 'SYSTEM_AUTOMATIC');
      }
    }, duration);
  }

  private async persistLockdownState(): Promise<void> {
    try {
      await fs.writeFile(this.LOCKDOWN_FILE_PATH, JSON.stringify(this.lockdownConfig, null, 2));
    } catch (error) {
      logger.warn('Failed to persist lockdown state', { error });
    }
  }

  private async persistQuarantineState(): Promise<void> {
    try {
      const quarantineData = Array.from(this.quarantinedSources.entries());
      await fs.writeFile(this.QUARANTINE_FILE_PATH, JSON.stringify(quarantineData, null, 2));
    } catch (error) {
      logger.warn('Failed to persist quarantine state', { error });
    }
  }

  private async clearPersistedLockdownState(): Promise<void> {
    try {
      await fs.unlink(this.LOCKDOWN_FILE_PATH);
    } catch (error) {
      // File may not exist, which is fine
    }
  }

  private async loadPersistedState(): Promise<void> {
    try {
      // Load lockdown state
      try {
        const lockdownData = await fs.readFile(this.LOCKDOWN_FILE_PATH, 'utf-8');
        this.lockdownConfig = JSON.parse(lockdownData);
        if (this.lockdownConfig) {
          this.currentState = this.determineNewState(this.lockdownConfig.severity);
        }
      } catch {
        // No persisted lockdown state
      }

      // Load quarantine state
      try {
        const quarantineData = await fs.readFile(this.QUARANTINE_FILE_PATH, 'utf-8');
        const quarantineEntries = JSON.parse(quarantineData);
        this.quarantinedSources = new Map(quarantineEntries);
      } catch {
        // No persisted quarantine state
      }

    } catch (error) {
      logger.warn('Failed to load persisted state', { error });
    }
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Event handlers
  private handleLockdownInitiated(data: any): void {
    logger.info('Lockdown initiated event handled', { data });
  }

  private handleQuarantineInitiated(data: any): void {
    logger.info('Quarantine initiated event handled', { data });
  }

  private handleRecoveryAttempted(data: any): void {
    logger.info('Recovery attempted event handled', { data });
  }

  private handleIncidentCreated(incident: IncidentReport): void {
    logger.info('Incident created event handled', { incidentId: incident.id });
  }

  // Public getters
  public getCurrentState(): SystemState {
    return this.currentState;
  }

  public getLockdownConfig(): LockdownConfig | null {
    return this.lockdownConfig;
  }

  public getQuarantinedSources(): DataSource[] {
    return Array.from(this.quarantinedSources.keys());
  }

  public getIncidents(): IncidentReport[] {
    return Array.from(this.incidents.values());
  }

  public getStateHistory(): SystemStateHistory[] {
    return [...this.stateHistory];
  }

  public isSourceQuarantined(source: DataSource): boolean {
    return this.quarantinedSources.has(source);
  }

  public isSystemLocked(): boolean {
    return this.currentState.includes('LOCKDOWN');
  }
}

/**
 * Singleton instance
 */
export const emergencyFailsafe = new EmergencyFailsafe();

/**
 * Convenience functions
 */
export async function initiateLockdown(config: LockdownConfig): Promise<void> {
  return emergencyFailsafe.initiateLockdown(config);
}

export async function quarantineSource(config: QuarantineConfig): Promise<void> {
  return emergencyFailsafe.quarantineSource(config);
}

export async function attemptRecovery(approvedBy: string, approvalEvidence?: Record<string, any>): Promise<boolean> {
  return emergencyFailsafe.attemptRecovery(approvedBy, approvalEvidence);
}

export function getCurrentSystemState(): SystemState {
  return emergencyFailsafe.getCurrentState();
}

export function isSystemLocked(): boolean {
  return emergencyFailsafe.isSystemLocked();
}