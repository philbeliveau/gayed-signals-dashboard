/**
 * Risk Management Monitoring Dashboard
 * 
 * Provides real-time visualization of:
 * - System health and performance metrics
 * - Circuit breaker status
 * - Rate limiting statistics
 * - Security events and alerts
 * - Data source reliability
 * - Graceful degradation status
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types for monitoring data
interface HealthMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  requestCount: number;
  activeConnections: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

interface SecurityStats {
  rateLimiting: {
    totalIPs: number;
    suspiciousIPs: number;
    totalRequests: number;
  };
  events: {
    total: number;
    recent: Array<{
      timestamp: Date;
      event: string;
      metadata: unknown;
    }>;
  };
  suspiciousIPs: string[];
}

interface DataSourceHealth {
  'yahoo-finance': boolean;
  'fallback-static': boolean;
}

interface MonitoringData {
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: HealthMetrics | null;
    uptime: number;
    circuitBreakerState: string;
  };
  security: SecurityStats;
  dataSources: DataSourceHealth;
  alerts: Array<{
    id: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
  cache: {
    size: number;
    entries: Array<{
      key: string;
      source: string;
      age: number;
      expiresIn: number;
    }>;
  };
}

const StatusIndicator: React.FC<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} title={status} />
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  status?: 'healthy' | 'degraded' | 'unhealthy';
  subtitle?: string;
}> = ({ title, value, unit, status, subtitle }) => (
  <div className="bg-white p-4 rounded-lg shadow border">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      {status && <StatusIndicator status={status} />}
    </div>
    <div className="text-2xl font-bold text-gray-900">
      {value}
      {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
    </div>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const AlertList: React.FC<{ alerts: MonitoringData['alerts'] }> = ({ alerts }) => {
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'border-red-500 bg-red-50';
      case 'ERROR': return 'border-red-400 bg-red-50';
      case 'WARNING': return 'border-yellow-400 bg-yellow-50';
      case 'INFO': return 'border-blue-400 bg-blue-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No recent alerts</div>
        ) : (
          alerts.slice(0, 20).map((alert) => (
            <div key={alert.id} className={`border-l-4 p-3 rounded ${getAlertColor(alert.level)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded font-medium mr-2 ${
                      alert.level === 'CRITICAL' ? 'bg-red-600 text-white' :
                      alert.level === 'ERROR' ? 'bg-red-500 text-white' :
                      alert.level === 'WARNING' ? 'bg-yellow-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {alert.level}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mt-2 text-gray-800">{alert.message}</p>
                  {alert.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                        {JSON.stringify(alert.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const DataSourceStatus: React.FC<{ dataSources: DataSourceHealth }> = ({ dataSources }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
    <div className="space-y-3">
      {Object.entries(dataSources).map(([source, isHealthy]) => (
        <div key={source} className="flex items-center justify-between p-3 border rounded">
          <span className="font-medium">{source.replace('-', ' ').toUpperCase()}</span>
          <StatusIndicator status={isHealthy ? 'healthy' : 'unhealthy'} />
        </div>
      ))}
    </div>
  </div>
);

const CacheStatus: React.FC<{ cache: MonitoringData['cache'] }> = ({ cache }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">Cache Status</h2>
    <div className="mb-4">
      <MetricCard title="Cache Size" value={cache.size} unit="entries" />
    </div>
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {cache.entries.slice(0, 10).map((entry, index) => (
        <div key={index} className="text-sm border rounded p-2">
          <div className="font-medium truncate">{entry.key}</div>
          <div className="text-gray-600 flex justify-between">
            <span>Source: {entry.source}</span>
            <span>Expires: {Math.floor(entry.expiresIn / 1000)}s</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const RiskManagementDashboard: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setMonitoringData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      console.error('Monitoring data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMonitoringData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Monitoring Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchMonitoringData();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No monitoring data available</p>
      </div>
    );
  }

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Risk Management Dashboard</h1>
            <p className="text-gray-600">Real-time system monitoring and health status</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-600">Auto Refresh</label>
            </div>
            <button
              onClick={fetchMonitoringData}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="System Status"
          value={monitoringData.health.status.toUpperCase()}
          status={monitoringData.health.status}
        />
        <MetricCard
          title="Uptime"
          value={formatUptime(monitoringData.health.uptime)}
          subtitle="Since last restart"
        />
        <MetricCard
          title="Circuit Breaker"
          value={monitoringData.health.circuitBreakerState}
          status={monitoringData.health.circuitBreakerState === 'CLOSED' ? 'healthy' : 
                  monitoringData.health.circuitBreakerState === 'HALF_OPEN' ? 'degraded' : 'unhealthy'}
        />
        <MetricCard
          title="Active Alerts"
          value={monitoringData.alerts.filter(alert => 
            Date.now() - new Date(alert.timestamp).getTime() < 3600000 // Last hour
          ).length}
          status={monitoringData.alerts.length > 5 ? 'unhealthy' : 
                  monitoringData.alerts.length > 2 ? 'degraded' : 'healthy'}
        />
      </div>

      {/* Performance Metrics */}
      {monitoringData.health.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Memory Usage"
            value={monitoringData.health.metrics.memory.used.toFixed(1)}
            unit="MB"
            subtitle={`${monitoringData.health.metrics.memory.percentage.toFixed(1)}% of total`}
            status={monitoringData.health.metrics.memory.percentage > 80 ? 'unhealthy' : 
                    monitoringData.health.metrics.memory.percentage > 60 ? 'degraded' : 'healthy'}
          />
          <MetricCard
            title="Avg Response Time"
            value={monitoringData.health.metrics.responseTime.average.toFixed(0)}
            unit="ms"
            subtitle={`P95: ${monitoringData.health.metrics.responseTime.p95.toFixed(0)}ms`}
            status={monitoringData.health.metrics.responseTime.average > 5000 ? 'unhealthy' : 
                    monitoringData.health.metrics.responseTime.average > 2000 ? 'degraded' : 'healthy'}
          />
          <MetricCard
            title="Error Rate"
            value={monitoringData.health.metrics.errorRate.toFixed(1)}
            unit="%"
            subtitle={`${monitoringData.health.metrics.requestCount} total requests`}
            status={monitoringData.health.metrics.errorRate > 10 ? 'unhealthy' : 
                    monitoringData.health.metrics.errorRate > 5 ? 'degraded' : 'healthy'}
          />
          <MetricCard
            title="Suspicious IPs"
            value={monitoringData.security.suspiciousIPs.length}
            subtitle={`${monitoringData.security.rateLimiting.totalIPs} total IPs`}
            status={monitoringData.security.suspiciousIPs.length > 10 ? 'unhealthy' : 
                    monitoringData.security.suspiciousIPs.length > 5 ? 'degraded' : 'healthy'}
          />
        </div>
      )}

      {/* Detailed Status Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataSourceStatus dataSources={monitoringData.dataSources} />
        <CacheStatus cache={monitoringData.cache} />
      </div>

      {/* Alerts */}
      <AlertList alerts={monitoringData.alerts} />

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default RiskManagementDashboard;