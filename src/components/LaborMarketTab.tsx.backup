'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  BarChart,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw,
  Briefcase,
  FileText
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts';
import { formatDate, formatTooltipDate } from '../utils/dateFormatting';

interface LaborDataPoint {
  date: string;
  initialClaims: number;
  continuedClaims: number;
  claims4Week: number;
  unemploymentRate: number;
  nonfarmPayrolls: number;
  laborParticipation: number;
  jobOpenings: number;
  weeklyChangeInitial: number;
  weeklyChangeContinued: number;
  monthlyChangePayrolls: number;
}

interface LaborAlert {
  id: string;
  type: 'claims_spike' | 'unemployment_rise' | 'payroll_decline' | 'participation_drop';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  indicator: string;
  currentValue: number;
  thresholdValue: number;
}

interface HistoricalComparison {
  current: number;
  pre2021: number;
  peak2021: number;
  deviationPercent: number;
  status: 'better' | 'similar' | 'worse';
  daysSince2021: number;
}

// Shared utility components
const StressIndicator: React.FC<{
  level: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
}> = ({ level, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const colorClasses = {
    low: 'bg-theme-success',
    medium: 'bg-theme-warning',
    high: 'bg-theme-danger'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[level]} rounded-full animate-pulse`} />
  );
};

const TrendArrow: React.FC<{
  value: number;
  showValue?: boolean;
  prefix?: string;
  suffix?: string;
  inverse?: boolean; // For indicators where lower is better (like unemployment)
}> = ({ value, showValue = true, prefix = '', suffix = '', inverse = false }) => {
  const isPositive = inverse ? value < 0 : value > 0;
  const isNeutral = value === 0;

  const colorClass = isNeutral 
    ? 'text-theme-text-muted' 
    : isPositive 
      ? 'text-theme-success' 
      : 'text-theme-danger';

  const IconComponent = isNeutral ? null : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      {IconComponent && <IconComponent className="w-4 h-4" />}
      {showValue && (
        <span className="font-medium text-sm">
          {prefix}{Math.abs(value).toFixed(1)}{suffix}
        </span>
      )}
    </div>
  );
};

const DataCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical';
  loading?: boolean;
  inverse?: boolean;
}> = ({ title, value, change, subtitle, icon, status = 'normal', loading = false, inverse = false }) => {
  const statusColors = {
    normal: 'border-theme-border bg-theme-card',
    warning: 'border-theme-warning-border bg-theme-warning-bg',
    critical: 'border-theme-danger-border bg-theme-danger-bg'
  };

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-8 bg-theme-bg-secondary rounded mb-2"></div>
        <div className="h-3 bg-theme-bg-secondary rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 border transition-all duration-200 hover:border-theme-border-hover hover:shadow-lg ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-theme-text-muted uppercase tracking-wide">{title}</div>
        {icon && <div className="text-theme-text-muted">{icon}</div>}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-theme-text">{value}</div>
        {change !== undefined && <TrendArrow value={change} inverse={inverse} />}
      </div>
      
      {subtitle && (
        <div className="text-xs text-theme-text-light mt-1">{subtitle}</div>
      )}
    </div>
  );
};

export default function LaborMarketTab() {
  const [laborData, setLaborData] = useState<LaborDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<LaborAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '12m' | '24m'>('12m');
  const [activeView, setActiveView] = useState<'claims' | 'employment' | 'correlation'>('claims');
  const [isClient, setIsClient] = useState(false);
  
  // Simple color theme
  const chartColors = {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    success: '#10B981',
    danger: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    textLight: '#6B7280'
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchLaborData();
  }, [selectedPeriod]);

  const fetchLaborData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      setError(null);

      console.log(`👥 Fetching labor data for period: ${selectedPeriod}`);
      
      // Call the actual API endpoint
      const response = await fetch(`/api/labor?period=${selectedPeriod}&fast=false`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch labor data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('👥 Successfully fetched labor data:', data.laborData?.length, 'points');
      
      // Transform API data to component format
      const transformedData: LaborDataPoint[] = (data.laborData || []).map((item: any) => ({
        date: item.date,
        initialClaims: item.initialClaims || 0,
        continuedClaims: item.continuedClaims || 0,
        claims4Week: item.claims4Week || 0,
        unemploymentRate: item.unemploymentRate || 0,
        nonfarmPayrolls: item.nonfarmPayrolls || 0,
        laborParticipation: item.laborParticipation || 0,
        jobOpenings: item.jobOpenings || 0,
        weeklyChangeInitial: item.weeklyChangeInitial || 0,
        weeklyChangeContinued: item.weeklyChangeContinued || 0,
        monthlyChangePayrolls: item.monthlyChangePayrolls || 0
      }));
      
      // Transform alerts
      const transformedAlerts: LaborAlert[] = data.alerts?.map((alert: any) => ({
        id: alert.id || Date.now().toString(),
        type: alert.type || 'claims_spike',
        severity: alert.severity || 'warning',
        message: alert.message || 'Labor market alert',
        timestamp: alert.timestamp || new Date().toISOString()
      })) || [];
      
      console.log('👥 Processed', transformedData.length, 'labor data points for charts');
      
      setLaborData(transformedData);
      setAlerts(transformedAlerts);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('❌ Error fetching labor data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load labor market data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockLaborData = (): LaborDataPoint[] => {
    const data: LaborDataPoint[] = [];
    const startDate = new Date('2023-01-01');
    const endDate = new Date();
    
    // Get number of weeks based on selected period
    const periodWeeks = {
      '3m': 12,
      '6m': 24, 
      '12m': 52,
      '24m': 104
    };
    
    const weeks = Math.min(periodWeeks[selectedPeriod], 
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    
    // Starting realistic values (based on 2023-2024 trends)
    let baseInitialClaims = 220000;
    let baseContinuedClaims = 1750000;
    let baseUnemploymentRate = 3.7;
    let baseNonfarmPayrolls = 200000; // Monthly change
    let baseLaborParticipation = 63.4;
    let baseJobOpenings = 9500000;

    for (let i = 0; i <= weeks; i++) {
      const currentDate = new Date(endDate.getTime() - (weeks - i) * 7 * 24 * 60 * 60 * 1000);
      
      // Add trends and seasonality
      const weeklyTrend = 0.0002 * i; // Gradual increase in claims
      const seasonality = Math.sin((i / 52) * 2 * Math.PI) * 0.02;
      const noise = (Math.random() - 0.5) * 0.03;
      
      // Apply variations
      baseInitialClaims *= (1 + weeklyTrend + seasonality + noise);
      baseContinuedClaims *= (1 + weeklyTrend * 1.5 + seasonality + noise);
      baseUnemploymentRate *= (1 + weeklyTrend * 0.5 + noise * 0.5);
      baseNonfarmPayrolls *= (1 + (Math.random() - 0.5) * 0.2);
      baseLaborParticipation *= (1 + (Math.random() - 0.5) * 0.001);
      baseJobOpenings *= (1 + (Math.random() - 0.5) * 0.05);

      // Calculate weekly changes
      const weeklyChangeInitial = i > 0 ? 
        ((baseInitialClaims / data[i-1]?.initialClaims) - 1) * 100 : 0;
      const weeklyChangeContinued = i > 0 ? 
        ((baseContinuedClaims / data[i-1]?.continuedClaims) - 1) * 100 : 0;
      const monthlyChangePayrolls = i >= 4 ? 
        ((baseNonfarmPayrolls / (data[i-4]?.nonfarmPayrolls || baseNonfarmPayrolls)) - 1) * 100 : 0;

      data.push({
        date: formatDate(currentDate, 'iso'),
        initialClaims: Math.round(baseInitialClaims),
        continuedClaims: Math.round(baseContinuedClaims),
        claims4Week: Math.round((baseInitialClaims + (data[i-1]?.initialClaims || baseInitialClaims) + 
          (data[i-2]?.initialClaims || baseInitialClaims) + (data[i-3]?.initialClaims || baseInitialClaims)) / 4),
        unemploymentRate: Math.round(baseUnemploymentRate * 10) / 10,
        nonfarmPayrolls: Math.round(baseNonfarmPayrolls),
        laborParticipation: Math.round(baseLaborParticipation * 10) / 10,
        jobOpenings: Math.round(baseJobOpenings),
        weeklyChangeInitial: Math.round(weeklyChangeInitial * 10) / 10,
        weeklyChangeContinued: Math.round(weeklyChangeContinued * 10) / 10,
        monthlyChangePayrolls: Math.round(monthlyChangePayrolls * 10) / 10
      });
    }

    return data;
  };

  const generateMockAlerts = (data: LaborDataPoint[]): LaborAlert[] => {
    const alerts: LaborAlert[] = [];
    if (data.length === 0) return alerts;
    
    const currentData = data[data.length - 1];
    
    // Check for continuing claims above 2021 levels
    const baseline2021ContinuedClaims = 1400000; // Approximate 2021 average
    if (currentData.continuedClaims > baseline2021ContinuedClaims) {
      alerts.push({
        id: 'continued_claims_alert',
        type: 'claims_spike',
        severity: 'critical',
        message: `Continued claims (${(currentData.continuedClaims / 1000000).toFixed(2)}M) above 2021 baseline (${(baseline2021ContinuedClaims / 1000000).toFixed(2)}M)`,
        timestamp: new Date().toISOString(),
        indicator: 'continuedClaims',
        currentValue: currentData.continuedClaims,
        thresholdValue: baseline2021ContinuedClaims
      });
    }

    // Check for unemployment rate spike
    if (currentData.unemploymentRate > 4.5) {
      alerts.push({
        id: 'unemployment_spike_alert',
        type: 'unemployment_rise',
        severity: 'warning',
        message: `Unemployment rate at ${currentData.unemploymentRate}% - above comfort zone`,
        timestamp: new Date().toISOString(),
        indicator: 'unemploymentRate',
        currentValue: currentData.unemploymentRate,
        thresholdValue: 4.5
      });
    }

    // Check for negative payroll growth
    if (currentData.monthlyChangePayrolls < -50) {
      alerts.push({
        id: 'payroll_decline_alert',
        type: 'payroll_decline',
        severity: 'warning',
        message: `Monthly payroll change significantly negative (${currentData.monthlyChangePayrolls.toFixed(1)}%)`,
        timestamp: new Date().toISOString(),
        indicator: 'nonfarmPayrolls',
        currentValue: currentData.monthlyChangePayrolls,
        thresholdValue: 0
      });
    }

    return alerts;
  };

  const getCurrentData = () => {
    if (laborData.length === 0) return null;
    return laborData[laborData.length - 1];
  };

  const getStressLevel = (): 'low' | 'medium' | 'high' => {
    const currentData = getCurrentData();
    if (!currentData) return 'medium';

    const stressFactors = [
      currentData.continuedClaims > 1800000, // Above concerning level
      currentData.unemploymentRate > 4.5, // Above comfort zone
      currentData.weeklyChangeInitial > 5.0, // Large weekly increase in initial claims
      currentData.laborParticipation < 63.0, // Low participation
      alerts.some(a => a.severity === 'critical')
    ];

    const stressCount = stressFactors.filter(Boolean).length;
    
    if (stressCount >= 3) return 'high';
    if (stressCount >= 1) return 'medium';
    return 'low';
  };

  const getHistoricalComparison = (indicator: 'continuedClaims' | 'unemploymentRate'): HistoricalComparison => {
    const currentData = getCurrentData();
    if (!currentData) return {
      current: 0,
      pre2021: 0,
      peak2021: 0,
      deviationPercent: 0,
      status: 'similar',
      daysSince2021: 0
    };

    const baselines = {
      continuedClaims: { pre2021: 1400000, peak2021: 1800000 },
      unemploymentRate: { pre2021: 3.5, peak2021: 14.8 }
    };

    const current = currentData[indicator];
    const baseline = baselines[indicator];
    const deviationPercent = ((current - baseline.pre2021) / baseline.pre2021) * 100;
    
    let status: 'better' | 'similar' | 'worse';
    if (indicator === 'unemploymentRate') {
      status = current < baseline.pre2021 ? 'better' : current > baseline.pre2021 * 1.2 ? 'worse' : 'similar';
    } else {
      status = current < baseline.pre2021 ? 'better' : current > baseline.pre2021 * 1.2 ? 'worse' : 'similar';
    }

    const jan2021 = new Date('2021-01-01');
    const now = new Date();
    const daysSince2021 = Math.floor((now.getTime() - jan2021.getTime()) / (1000 * 60 * 60 * 24));

    return {
      current,
      pre2021: baseline.pre2021,
      peak2021: baseline.peak2021,
      deviationPercent,
      status,
      daysSince2021
    };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: chartColors.primary }}>Initial Claims: {data.initialClaims.toLocaleString()}</p>
            <p style={{ color: chartColors.secondary }}>Continued Claims: {(data.continuedClaims / 1000000).toFixed(2)}M</p>
            <p className="text-gray-300">Unemployment: {data.unemploymentRate}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-theme-bg-secondary rounded w-48 animate-pulse"></div>
          <div className="h-8 bg-theme-bg-secondary rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <DataCard key={i} title="" value="" loading />
          ))}
        </div>
        
        <div className="bg-theme-card border border-theme-border rounded-xl p-6">
          <div className="h-96 bg-theme-bg-secondary rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-theme-danger-bg border border-theme-danger-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-theme-danger mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-theme-danger mb-2">Error Loading Labor Market Data</h3>
          <p className="text-theme-text-muted mb-4">{error}</p>
          <button
            onClick={() => fetchLaborData(true)}
            className="px-6 py-2 bg-theme-danger text-white rounded-lg hover:bg-theme-danger/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentData = getCurrentData();
  const stressLevel = getStressLevel();
  const claimsComparison = getHistoricalComparison('continuedClaims');
  const unemploymentComparison = getHistoricalComparison('unemploymentRate');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/10 border border-theme-primary/20 rounded-xl">
            <Users className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-theme-text">Labor Market Analysis</h2>
            <p className="text-theme-text-muted">Employment trends and jobless claims tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-right">
              <div className="text-xs text-theme-text-light uppercase tracking-wide">Last Updated</div>
              <div className="text-sm text-theme-text-secondary font-medium">
                {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          )}
          
          <button
            onClick={() => fetchLaborData(true)}
            disabled={refreshing}
            className="p-2 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover transition-all duration-200 disabled:opacity-50"
            title="Refresh labor market data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="flex items-center gap-4">
        <BarChart className="w-5 h-5 text-theme-text-muted" />
        <div className="flex bg-theme-card border border-theme-border rounded-lg p-1">
          {(['3m', '6m', '12m', '24m'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedPeriod === period
                  ? 'bg-theme-primary text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Alert System */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                alert.severity === 'critical' 
                  ? 'bg-theme-danger-bg border-theme-danger-border' 
                  : alert.severity === 'warning'
                  ? 'bg-theme-warning-bg border-theme-warning-border'
                  : 'bg-theme-info-bg border-theme-info-border'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${
                alert.severity === 'critical' ? 'text-theme-danger' : 
                alert.severity === 'warning' ? 'text-theme-warning' : 'text-theme-info'
              }`} />
              <div className="flex-1">
                <div className={`font-medium ${
                  alert.severity === 'critical' ? 'text-theme-danger' : 
                  alert.severity === 'warning' ? 'text-theme-warning' : 'text-theme-info'
                }`}>
                  {alert.message}
                </div>
                <div className="text-xs text-theme-text-muted mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
              <StressIndicator level={alert.severity === 'critical' ? 'high' : 'medium'} />
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <DataCard
          title="Initial Claims"
          value={currentData ? currentData.initialClaims.toLocaleString() : '--'}
          change={currentData?.weeklyChangeInitial}
          subtitle="Weekly jobless claims"
          icon={<FileText className="w-5 h-5" />}
          status={currentData && currentData.weeklyChangeInitial > 10 ? 'warning' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Continued Claims"
          value={currentData ? `${(currentData.continuedClaims / 1000000).toFixed(2)}M` : '--'}
          change={currentData?.weeklyChangeContinued}
          subtitle="Ongoing unemployment claims"
          icon={<Users className="w-5 h-5" />}
          status={claimsComparison.status === 'worse' ? 'critical' : claimsComparison.status === 'similar' ? 'warning' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Unemployment Rate"
          value={currentData ? `${currentData.unemploymentRate}%` : '--'}
          subtitle="Official unemployment rate"
          icon={<Briefcase className="w-5 h-5" />}
          status={currentData && currentData.unemploymentRate > 4.5 ? 'warning' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Labor Market Stress"
          value="--"
          subtitle={`${stressLevel.toUpperCase()} stress level`}
          icon={<StressIndicator level={stressLevel} size="lg" />}
          status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
        />
      </div>

      {/* Claims Trend Chart */}
      <ChartWrapper
        height={400}
        loading={loading}
        error={error}
        title="Jobless Claims Trends"
        description="Initial claims, continued claims, and unemployment rate tracking"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }}></div>
              <span className="text-sm text-theme-text-muted">Initial Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.secondary }}></div>
              <span className="text-sm text-theme-text-muted">Continued Claims</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.warning }}></div>
              <span className="text-sm text-theme-text-muted">Unemployment Rate</span>
            </div>
          </div>
        </div>

        {laborData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-theme-text-muted">No labor market data available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={laborData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatDate(value, 'chart')}
              />
              <YAxis 
                yAxisId="claims"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000)}K`}
              />
              <YAxis 
                yAxisId="rate"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                yAxisId="claims"
                type="monotone" 
                dataKey="initialClaims" 
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
              />
              <Line 
                yAxisId="claims"
                type="monotone" 
                dataKey="continuedClaims" 
                stroke={chartColors.secondary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.secondary, strokeWidth: 2, fill: chartColors.secondary }}
              />
              <Line 
                yAxisId="rate"
                type="monotone" 
                dataKey="unemploymentRate" 
                stroke={chartColors.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              {/* Reference line for concerning level of continued claims */}
              <ReferenceLine 
                yAxisId="claims"
                y={1800000} 
                stroke={chartColors.danger}
                strokeDasharray="3 3" 
                label={{ value: "High Risk Level", position: "right" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="mt-4 text-xs text-gray-500">
          Chart shows initial claims, continued claims, and unemployment rate trends. 
          Data updates weekly from Department of Labor (DOL) and Bureau of Labor Statistics (BLS).
        </div>
      </div>

      {/* Employment Metrics & Historical Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4">Employment Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Nonfarm Payrolls</span>
              <div className="text-right">
                <span className="font-medium text-theme-text">
                  {currentData ? `${(currentData.nonfarmPayrolls / 1000).toFixed(0)}K` : '--'}
                </span>
                {currentData && (
                  <div className="text-xs">
                    <TrendArrow value={currentData.monthlyChangePayrolls} suffix="%" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Labor Force Participation</span>
              <span className="font-medium text-theme-text">
                {currentData?.laborParticipation.toFixed(1) || '--'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Job Openings</span>
              <span className="font-medium text-theme-text">
                {currentData ? `${(currentData.jobOpenings / 1000000).toFixed(1)}M` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">4-Week Avg Claims</span>
              <span className="font-medium text-theme-text">
                {currentData ? currentData.claims4Week.toLocaleString() : '--'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4">Historical Context</h3>
          <div className="space-y-4">
            <div className="p-4 bg-theme-card-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-theme-text-muted text-sm">Continued Claims vs. Pre-2021</span>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  claimsComparison.status === 'better' ? 'bg-theme-success-bg text-theme-success' :
                  claimsComparison.status === 'worse' ? 'bg-theme-danger-bg text-theme-danger' :
                  'bg-theme-warning-bg text-theme-warning'
                }`}>
                  {claimsComparison.status.toUpperCase()}
                </div>
              </div>
              <div className="text-theme-text font-medium">
                {claimsComparison.deviationPercent > 0 ? '+' : ''}{claimsComparison.deviationPercent.toFixed(1)}% 
                from baseline
              </div>
              <div className="text-xs text-theme-text-light mt-1">
                Current: {(claimsComparison.current / 1000000).toFixed(2)}M | 
                Baseline: {(claimsComparison.pre2021 / 1000000).toFixed(2)}M
              </div>
            </div>

            <div className="p-4 bg-theme-card-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-theme-text-muted text-sm">Unemployment vs. Pre-2021</span>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  unemploymentComparison.status === 'better' ? 'bg-theme-success-bg text-theme-success' :
                  unemploymentComparison.status === 'worse' ? 'bg-theme-danger-bg text-theme-danger' :
                  'bg-theme-warning-bg text-theme-warning'
                }`}>
                  {unemploymentComparison.status.toUpperCase()}
                </div>
              </div>
              <div className="text-theme-text font-medium">
                {unemploymentComparison.deviationPercent > 0 ? '+' : ''}{unemploymentComparison.deviationPercent.toFixed(1)}% 
                from baseline
              </div>
              <div className="text-xs text-theme-text-light mt-1">
                Current: {unemploymentComparison.current}% | 
                Baseline: {unemploymentComparison.pre2021}%
              </div>
            </div>

            <div className="text-xs text-theme-text-muted">
              Recovery tracking: {claimsComparison.daysSince2021} days since Jan 2021 baseline
            </div>
          </div>
        </div>
      </div>

      {/* Data Attribution */}
      <div className="bg-theme-card-secondary border border-theme-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-theme-text-muted">
          <Clock className="w-4 h-4" />
          <span>
            Data sources: Department of Labor (DOL), Bureau of Labor Statistics (BLS), Federal Reserve Economic Data (FRED). 
            Updates: Initial/Continued Claims weekly (Thursday), Employment data monthly. 
            Last updated: {lastUpdated?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}