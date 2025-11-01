/**
 * Monitoring & Observability Types
 * Story 4.0f: Monitoring & Observability
 */

// ============================================================================
// Time Range Types
// ============================================================================

export type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'custom';

export interface CustomTimeRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Data Quality Types
// ============================================================================

export interface QualityScore {
  overall: number; // 0-100
  freshness: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  timestamp: Date;
}

export interface FreshnessMetrics {
  score: number; // 0-100
  lastUpdate: Date;
  staleDuration: number; // seconds
  isStale: boolean;
}

export interface CompletenessMetrics {
  score: number; // 0-100
  missingFields: string[];
  totalRecords: number;
  completeRecords: number;
  missingDataPercentage: number;
}

export interface ValidationError {
  field: string;
  value: any;
  expectedType: string;
  actualType: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FormatIssue {
  field: string;
  value: any;
  expectedFormat: string;
  actualFormat: string;
  suggestion?: string;
}

export interface ConsistencyMetrics {
  score: number; // 0-100
  validationErrors: ValidationError[];
  formatIssues: FormatIssue[];
  inconsistenciesFound: number;
}

export interface SourceQualityMetrics {
  source: string;
  quality: QualityScore;
  availability: number; // 0-100
  latency: number; // ms
  errorRate: number; // 0-1
  lastSuccessfulFetch: Date;
  consecutiveFailures: number;
}

export interface QualityMetrics {
  overall: QualityScore;
  freshness: FreshnessMetrics;
  completeness: CompletenessMetrics;
  consistency: ConsistencyMetrics;
  sources: Record<string, SourceQualityMetrics>;
  timestamp: Date;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface QualityAlert {
  id: string;
  severity: AlertSeverity;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  source: string;
  message: string;
  recommendation?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: {
    operator: '>' | '<' | '==' | '!=' | 'contains';
    threshold: number;
    duration: number; // seconds
  };
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
  throttle: number; // minimum seconds between alerts
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationChannel =
  | { type: 'email'; recipients: string[] }
  | { type: 'slack'; webhookUrl: string; channel: string }
  | { type: 'pagerduty'; serviceKey: string }
  | { type: 'webhook'; url: string; headers?: Record<string, string> }
  | { type: 'sms'; phoneNumbers: string[] };

// ============================================================================
// Audit Log Types
// ============================================================================

export type AuditLogType = 'DATA_OPERATION' | 'USER_ACTION' | 'SYSTEM_EVENT';
export type AuditLogResult = 'SUCCESS' | 'FAILURE';

export interface Actor {
  id: string;
  type: 'user' | 'system' | 'service';
  name: string;
  email?: string;
}

export interface AuditLogMetadata {
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  environment?: string;
  version?: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  type: AuditLogType;
  actor: Actor;
  action: string;
  resource: string;
  details: Record<string, any>;
  result: AuditLogResult;
  errorMessage?: string;
  metadata: AuditLogMetadata;
}

export interface AuditLogFilters {
  type?: AuditLogType;
  actorId?: string;
  action?: string;
  resource?: string;
  result?: AuditLogResult;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Data Lineage Types
// ============================================================================

export interface DataLineageSource {
  system: string;
  timestamp: Date;
  originalData: any;
  source: string;
}

export interface DataTransformation {
  step: string;
  timestamp: Date;
  input: any;
  output: any;
  transformer: string;
  duration?: number; // ms
}

export interface DataLineageDestination {
  system: string;
  timestamp: Date;
  finalData: any;
}

export interface QualityCheckResult {
  checkType: string;
  passed: boolean;
  score: number;
  issues: string[];
  timestamp: Date;
}

export interface DataLineage {
  signalId: string;
  source: DataLineageSource;
  transformations: DataTransformation[];
  destination: DataLineageDestination;
  qualityChecks: QualityCheckResult[];
  createdAt: Date;
}

// ============================================================================
// Compliance Report Types
// ============================================================================

export interface ComplianceReport {
  id: string;
  type: 'ISO27001' | 'SOC2' | 'GDPR' | 'MONTHLY_SUMMARY';
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    uniqueUsers: number;
    dataAccessCount: number;
    securityIncidents: number;
  };
  auditTrail: AuditLog[];
  issues: ComplianceIssue[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: Actor;
}

export interface ComplianceIssue {
  severity: AlertSeverity;
  category: string;
  description: string;
  affectedRecords: string[];
  remediation: string;
  deadline?: Date;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface ApiMetrics {
  requestCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}

export interface SourceMetrics {
  queriesTotal: number;
  avgQueryTime: number;
  successRate: number;
  availability: number;
  errorCount: number;
  lastError?: {
    timestamp: Date;
    message: string;
  };
}

export interface CacheMetrics {
  hitRate: number; // 0-1
  hits: number;
  misses: number;
  evictions: number;
  avgHitTime: number; // ms
  avgMissTime: number; // ms
  memoryUsage: number; // bytes
  keyCount: number;
}

export interface AggregatedMetrics {
  api: ApiMetrics;
  sources: Record<string, SourceMetrics>;
  cache: CacheMetrics;
  dataQuality: QualityMetrics;
  timestamp: Date;
}

// ============================================================================
// Time Series Types
// ============================================================================

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  metric: string;
  unit?: string;
  dataPoints: TimeSeriesDataPoint[];
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'p95' | 'p99';
}

// ============================================================================
// Anomaly Detection Types
// ============================================================================

export type AnomalyType = 'SPIKE' | 'DROP' | 'TREND_CHANGE' | 'MISSING_DATA';

export interface Anomaly {
  type: AnomalyType;
  severity: number; // 0-1
  metric: string;
  detectedAt: Date;
  expectedValue: number;
  actualValue: number;
  confidence: number; // 0-1
  context?: {
    historicalAverage?: number;
    standardDeviation?: number;
    zScore?: number;
  };
}

export interface DetectorOptions {
  sensitivity: 'low' | 'medium' | 'high';
  windowSize: number; // number of data points to consider
  seasonalPeriod?: number; // for seasonal anomaly detection
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DataQualityDashboardProps {
  timeRange: TimeRange;
  sources: string[];
  refreshInterval?: number; // ms
}

export interface DashboardUpdate {
  type: 'metrics' | 'alert' | 'anomaly' | 'status';
  data: any;
  timestamp: Date;
}

// ============================================================================
// Component Health Types
// ============================================================================

export type ComponentStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface ComponentHealth {
  component: string;
  status: ComponentStatus;
  uptime: number; // seconds
  lastCheck: Date;
  issues: string[];
  metrics?: Record<string, number>;
}

export interface SystemHealthStatus {
  overall: ComponentStatus;
  components: ComponentHealth[];
  alerts: QualityAlert[];
  lastUpdate: Date;
}

// ============================================================================
// Data Operation Types
// ============================================================================

export interface DataOperation {
  operationType: 'FETCH' | 'STORE' | 'UPDATE' | 'DELETE' | 'VALIDATE';
  resource: string;
  data?: any;
  metadata: {
    source?: string;
    symbols?: string[];
    duration?: number;
    success: boolean;
    errorMessage?: string;
  };
}

export interface UserAction {
  actionType: string;
  resource: string;
  userId: string;
  metadata: Record<string, any>;
}

export interface SystemEvent {
  eventType: string;
  component: string;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, any>;
}
