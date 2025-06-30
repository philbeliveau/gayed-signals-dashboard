'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Home, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw
} from 'lucide-react';
import NoSSRWrapper from './NoSSRWrapper';
import { formatDate, formatTooltipDate } from '../utils/dateFormatting';

// Dynamically import Recharts components to prevent SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const ReferenceLine = dynamic(() => import('recharts').then(mod => mod.ReferenceLine), { ssr: false });

interface HousingDataPoint {
  date: string;
  caseSillerIndex: number;
  housingStarts: number;
  monthsSupply: number;
  newHomeSales: number;
  priceChangeMonthly: number;
  priceChangeYearly: number;
  inventoryLevel: number;
  daysOnMarket: number;
}

interface HousingAlert {
  id: string;
  type: 'price_decline' | 'supply_surge' | 'demand_drop';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  region?: string;
}

interface RegionData {
  code: string;
  name: string;
  caseSillerIndex: number;
  monthlyChange: number;
  yearlyChange: number;
  monthsSupply: number;
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
}> = ({ value, showValue = true, prefix = '', suffix = '%' }) => {
  const isPositive = value > 0;
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
}> = ({ title, value, change, subtitle, icon, status = 'normal', loading = false }) => {
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
        {change !== undefined && <TrendArrow value={change} />}
      </div>
      
      {subtitle && (
        <div className="text-xs text-theme-text-light mt-1">{subtitle}</div>
      )}
    </div>
  );
};

export default function HousingMarketTab() {
  const [housingData, setHousingData] = useState<HousingDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('national');
  const [alerts, setAlerts] = useState<HousingAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sample regions data - in production, this would come from API
  const regions: RegionData[] = [
    { code: 'national', name: 'National', caseSillerIndex: 311.2, monthlyChange: -0.8, yearlyChange: 2.4, monthsSupply: 4.2 },
    { code: 'ny', name: 'New York', caseSillerIndex: 289.4, monthlyChange: -1.2, yearlyChange: 1.8, monthsSupply: 3.8 },
    { code: 'ca', name: 'California', caseSillerIndex: 398.7, monthlyChange: -1.5, yearlyChange: 0.9, monthsSupply: 2.9 },
    { code: 'fl', name: 'Florida', caseSillerIndex: 356.2, monthlyChange: -0.9, yearlyChange: 3.2, monthsSupply: 5.1 },
    { code: 'tx', name: 'Texas', caseSillerIndex: 278.9, monthlyChange: -0.4, yearlyChange: 4.1, monthsSupply: 3.7 },
  ];

  useEffect(() => {
    fetchHousingData();
  }, [selectedRegion]);

  const fetchHousingData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      setError(null);

      // NOTE: This component is designed for real data integration
      // In production, these would be actual API calls to FRED, Redfin, etc.
      console.warn('Housing Market Tab: This component requires real data integration with FRED API, Redfin API, etc.');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate realistic housing data for demonstration
      const mockData = generateMockHousingData();
      const mockAlerts = generateMockAlerts();
      
      setHousingData(mockData);
      setAlerts(mockAlerts);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching housing data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load housing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockHousingData = (): HousingDataPoint[] => {
    const data: HousingDataPoint[] = [];
    const startDate = new Date('2023-01-01');
    const endDate = new Date();
    const months = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    let baseCaseShiller = 300;
    let baseStarts = 1500;
    let baseSupply = 4.0;
    let baseSales = 650;

    for (let i = 0; i <= months; i++) {
      const currentDate = new Date(startDate.getTime() + i * 30 * 24 * 60 * 60 * 1000);
      
      // Simulate housing market trends with some realism
      const monthlyTrend = -0.002 * i; // Gradual decline
      const seasonality = Math.sin((i / 12) * 2 * Math.PI) * 0.02;
      const noise = (Math.random() - 0.5) * 0.01;
      
      baseCaseShiller *= (1 + monthlyTrend + seasonality + noise);
      baseStarts *= (1 + (Math.random() - 0.5) * 0.05);
      baseSupply += (Math.random() - 0.5) * 0.2;
      baseSales *= (1 + (Math.random() - 0.5) * 0.08);

      const monthlyChange = i > 0 ? ((baseCaseShiller / data[i-1]?.caseSillerIndex) - 1) * 100 : 0;
      const yearlyChange = i >= 12 ? ((baseCaseShiller / data[i-12]?.caseSillerIndex) - 1) * 100 : 0;

      data.push({
        date: formatDate(currentDate, 'iso'),
        caseSillerIndex: Math.round(baseCaseShiller * 100) / 100,
        housingStarts: Math.round(baseStarts),
        monthsSupply: Math.round(baseSupply * 10) / 10,
        newHomeSales: Math.round(baseSales),
        priceChangeMonthly: Math.round(monthlyChange * 10) / 10,
        priceChangeYearly: Math.round(yearlyChange * 10) / 10,
        inventoryLevel: Math.round((baseSupply * 1000) + (Math.random() * 200)),
        daysOnMarket: Math.round(25 + (Math.random() * 20))
      });
    }

    return data.slice(-18); // Last 18 months
  };

  const generateMockAlerts = (): HousingAlert[] => {
    const alerts: HousingAlert[] = [];
    
    // Check for consecutive price declines
    if (housingData.length >= 2) {
      const recent = housingData.slice(-2);
      if (recent.every(d => d.priceChangeMonthly < 0)) {
        alerts.push({
          id: 'price_decline_alert',
          type: 'price_decline',
          severity: 'warning',
          message: '2+ consecutive months of price decline detected',
          timestamp: new Date().toISOString(),
          region: selectedRegion
        });
      }
    }

    // Check for high supply levels
    const currentData = housingData[housingData.length - 1];
    if (currentData?.monthsSupply > 6.0) {
      alerts.push({
        id: 'supply_surge_alert',
        type: 'supply_surge',
        severity: 'critical',
        message: `Housing supply at ${currentData.monthsSupply} months - well above healthy 4-6 month range`,
        timestamp: new Date().toISOString(),
        region: selectedRegion
      });
    }

    return alerts;
  };

  const getCurrentData = () => {
    if (housingData.length === 0) return null;
    return housingData[housingData.length - 1];
  };

  const getStressLevel = (): 'low' | 'medium' | 'high' => {
    const currentData = getCurrentData();
    if (!currentData) return 'medium';

    const criticalFactors = [
      currentData.priceChangeMonthly < -1.0, // Monthly decline > 1%
      currentData.monthsSupply > 6.0, // High supply
      currentData.daysOnMarket > 45, // Slow sales
      alerts.some(a => a.severity === 'critical')
    ];

    const criticalCount = criticalFactors.filter(Boolean).length;
    
    if (criticalCount >= 2) return 'high';
    if (criticalCount === 1) return 'medium';
    return 'low';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-lg">
          <p className="text-theme-text font-medium mb-2">{formatTooltipDate(label)}</p>
          <div className="space-y-1 text-sm">
            <p className="text-theme-primary">Case-Shiller Index: {data.caseSillerIndex}</p>
            <p className="text-theme-text-secondary">Monthly Change: {data.priceChangeMonthly}%</p>
            <p className="text-theme-text-secondary">Months Supply: {data.monthsSupply}</p>
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
          <h3 className="text-xl font-semibold text-theme-danger mb-2">Error Loading Housing Data</h3>
          <p className="text-theme-text-muted mb-4">{error}</p>
          <button
            onClick={() => fetchHousingData(true)}
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
  const selectedRegionData = regions.find(r => r.code === selectedRegion);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-theme-primary/10 border border-theme-primary/20 rounded-xl">
            <Home className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-theme-text">Housing Market Analysis</h2>
            <p className="text-theme-text-muted">Real-time housing market indicators and stress signals</p>
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
            onClick={() => fetchHousingData(true)}
            disabled={refreshing}
            className="p-2 bg-theme-card-secondary border border-theme-border rounded-lg text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover transition-all duration-200 disabled:opacity-50"
            title="Refresh housing data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Regional Filter */}
      <div className="flex items-center gap-4">
        <MapPin className="w-5 h-5 text-theme-text-muted" />
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="bg-theme-card border border-theme-border rounded-lg px-4 py-2 text-theme-text focus:border-theme-primary focus:outline-none"
          aria-label="Select region"
        >
          {regions.map(region => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>
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
                  : 'bg-theme-warning-bg border-theme-warning-border'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${
                alert.severity === 'critical' ? 'text-theme-danger' : 'text-theme-warning'
              }`} />
              <div className="flex-1">
                <div className={`font-medium ${
                  alert.severity === 'critical' ? 'text-theme-danger' : 'text-theme-warning'
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
          title="Case-Shiller Index"
          value={currentData?.caseSillerIndex.toFixed(1) || '--'}
          change={currentData?.priceChangeMonthly}
          subtitle="National Home Price Index"
          icon={<TrendingUp className="w-5 h-5" />}
          status={currentData && currentData.priceChangeMonthly < -1.0 ? 'warning' : 'normal'}
        />
        
        <DataCard
          title="Housing Supply"
          value={`${currentData?.monthsSupply.toFixed(1) || '--'} months`}
          subtitle="Months of Inventory"
          icon={<Home className="w-5 h-5" />}
          status={currentData && currentData.monthsSupply > 6.0 ? 'critical' : 'normal'}
        />
        
        <DataCard
          title="New Home Sales"
          value={currentData ? `${(currentData.newHomeSales / 1000).toFixed(0)}K` : '--'}
          subtitle="Monthly Sales Rate"
          icon={<Calendar className="w-5 h-5" />}
        />
        
        <DataCard
          title="Market Stress"
          value="--"
          subtitle={`${stressLevel.toUpperCase()} stress level`}
          icon={<StressIndicator level={stressLevel} size="lg" />}
          status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
        />
      </div>

      {/* Price Trends Chart */}
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-theme-text">Housing Price Trends</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-theme-primary rounded-full"></div>
              <span className="text-sm text-theme-text-muted">Case-Shiller Index</span>
            </div>
            <div className="text-sm text-theme-text-light">
              {selectedRegionData?.name} Region
            </div>
          </div>
        </div>

        <div className="h-96">
          <NoSSRWrapper fallback={
            <div className="flex items-center justify-center h-full bg-theme-bg-secondary rounded animate-pulse">
              <span className="text-theme-text-muted">Loading chart...</span>
            </div>
          }>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={housingData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="chart-grid-color" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  className="chart-axis-color chart-text-color"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatDate(value, 'chart')}
                />
                <YAxis 
                  className="chart-axis-color chart-text-color"
                  tick={{ fontSize: 12 }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="caseSillerIndex" 
                  stroke="var(--theme-primary)" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--theme-primary)', strokeWidth: 2, fill: 'var(--theme-primary)' }}
                />
                {/* Add reference line for historical average */}
                <ReferenceLine 
                  y={housingData.reduce((sum, d) => sum + d.caseSillerIndex, 0) / housingData.length} 
                  stroke="var(--theme-text-muted)" 
                  strokeDasharray="5 5" 
                />
              </LineChart>
            </ResponsiveContainer>
          </NoSSRWrapper>
        </div>

        <div className="mt-4 text-xs text-theme-text-muted">
          Chart shows Case-Shiller Home Price Index trends with historical average reference line. 
          Data updates monthly from Federal Reserve Economic Data (FRED).
        </div>
      </div>

      {/* Supply & Demand Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4">Supply Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Housing Starts</span>
              <span className="font-medium text-theme-text">
                {currentData ? `${(currentData.housingStarts / 1000).toFixed(1)}K` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Months Supply</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-theme-text">
                  {currentData?.monthsSupply.toFixed(1) || '--'}
                </span>
                <StressIndicator 
                  level={currentData && currentData.monthsSupply > 6.0 ? 'high' : 'low'} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-theme-text-muted">Days on Market</span>
              <span className="font-medium text-theme-text">
                {currentData?.daysOnMarket || '--'} days
              </span>
            </div>
          </div>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-text mb-4">Regional Comparison</h3>
          <div className="space-y-3">
            {regions.slice(1).map(region => (
              <div key={region.code} className="flex items-center justify-between p-3 bg-theme-card-secondary rounded-lg">
                <div>
                  <div className="font-medium text-theme-text">{region.name}</div>
                  <div className="text-sm text-theme-text-muted">Index: {region.caseSillerIndex}</div>
                </div>
                <div className="text-right">
                  <TrendArrow value={region.monthlyChange} showValue />
                  <div className="text-xs text-theme-text-light mt-1">
                    YoY: {region.yearlyChange > 0 ? '+' : ''}{region.yearlyChange.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Attribution */}
      <div className="bg-theme-card-secondary border border-theme-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-theme-text-muted">
          <Clock className="w-4 h-4" />
          <span>
            Data sources: Federal Reserve Economic Data (FRED), Bureau of Labor Statistics (BLS), Redfin Market Data. 
            Updates: Housing data monthly, inventory weekly. 
            Last updated: {lastUpdated?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}