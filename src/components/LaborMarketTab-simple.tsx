'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { Users, TrendingUp, TrendingDown, AlertTriangle, Clock, BarChart, ArrowUpRight, ArrowDownRight, Activity, RefreshCw, Briefcase, FileText } from 'lucide-react';

export default function LaborMarketTab() {
  const [laborData, setLaborData] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLaborData = async (fast = false) => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await fetch(`/api/labor?fast=${fast}`);
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setLaborData(result.laborData || []);
      setCurrentMetrics(result.currentMetrics || null);
      setAlerts(result.alerts || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching labor data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLaborData(true);
  }, []);

  const TrendArrow = ({ value, showValue = true, suffix = '%', inverse = false }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNeutral = value === 0;
    const colorClass = isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600';
    const IconComponent = isNeutral ? null : isPositive ? ArrowUpRight : ArrowDownRight;
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {IconComponent && <IconComponent className="w-4 h-4" />}
        {showValue && <span className="text-sm font-medium">{Math.abs(value).toFixed(1)}{suffix}</span>}
      </div>
    );
  };

  const DataCard = ({ title, value, change, subtitle, icon, status = 'normal', inverse = false }) => {
    const statusColors = {
      normal: 'border-gray-200 bg-white',
      warning: 'border-yellow-400 bg-yellow-50',
      critical: 'border-red-400 bg-red-50'
    };
    
    return (
      <div className={`p-6 rounded-xl border ${statusColors[status]}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            {icon}
          </div>
          {change !== undefined && <TrendArrow value={change} inverse={inverse} />}
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formattedDate = new Date(label).toLocaleDateString() || label;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{formattedDate}</p>
          <div className="space-y-1 text-sm">
            <p className="text-purple-400">Initial Claims: {data.initialClaims?.toLocaleString()}</p>
            <p className="text-green-400">Continued Claims: {(data.continuedClaims / 1000000).toFixed(2)}M</p>
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
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-700 mb-2">Error Loading Labor Market Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchLaborData(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stressLevel = (
    currentMetrics?.initialClaims > 400000 || currentMetrics?.unemploymentRate > 5.0
  ) ? 'high' : (
    currentMetrics?.initialClaims > 300000 || currentMetrics?.unemploymentRate > 4.0
  ) ? 'medium' : 'low';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Labor Market Analysis</h2>
            <p className="text-gray-600">Employment trends and jobless claims tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</div>
              <div className="text-sm text-gray-700 font-medium">
                {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          )}
          
          <button
            onClick={() => fetchLaborData(true)}
            disabled={refreshing}
            className="p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
            title="Refresh labor data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
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
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${
                alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div className="flex-1">
                <div className={`font-medium ${
                  alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {alert.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <DataCard
          title="Initial Claims"
          value={currentMetrics?.initialClaims?.toLocaleString() || '--'}
          change={currentMetrics?.weeklyChangeInitial}
          subtitle="Weekly Unemployment Filings"
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          status={currentMetrics && currentMetrics.initialClaims > 400000 ? 'critical' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Continued Claims"
          value={currentMetrics?.continuedClaims ? `${(currentMetrics.continuedClaims / 1000000).toFixed(2)}M` : '--'}
          change={currentMetrics?.weeklyChangeContinued}
          subtitle="Ongoing Unemployment Claims"
          icon={<Briefcase className="w-5 h-5 text-blue-600" />}
          status={currentMetrics && currentMetrics.continuedClaims > 1800000 ? 'warning' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Unemployment Rate"
          value={currentMetrics?.unemploymentRate ? `${currentMetrics.unemploymentRate.toFixed(1)}%` : '--'}
          subtitle="Current Unemployment Rate"
          icon={<BarChart className="w-5 h-5 text-blue-600" />}
          status={currentMetrics && currentMetrics.unemploymentRate > 5.0 ? 'critical' : 'normal'}
          inverse={true}
        />
        
        <DataCard
          title="Labor Market Stress"
          value={stressLevel.toUpperCase()}
          subtitle={`${stressLevel} stress level`}
          icon={<div className={`w-4 h-4 rounded-full ${
            stressLevel === 'high' ? 'bg-red-500' : 
            stressLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          } animate-pulse`} />}
          status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
        />
      </div>

      {/* Claims Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Jobless Claims Trends
          </h3>
          <p className="text-sm text-gray-600">
            Initial claims, continued claims, and unemployment rate tracking
          </p>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600">Initial Claims</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Continued Claims</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600">Unemployment Rate</span>
          </div>
          <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-300">
            ⚠️ DEMO DATA - NOT REAL
          </div>
        </div>

        {laborData.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <span className="text-gray-500">No labor market data available</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={laborData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis 
                  yAxisId="claims"
                  tickFormatter={(value) => `${(value / 1000)}K`}
                  stroke="#6b7280"
                />
                <YAxis 
                  yAxisId="rate"
                  orientation="right"
                  tickFormatter={(value) => `${value}%`}
                  stroke="#6b7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  yAxisId="claims"
                  type="monotone" 
                  dataKey="initialClaims" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#8B5CF6', strokeWidth: 2, fill: '#8B5CF6' }}
                />
                <Line 
                  yAxisId="claims"
                  type="monotone" 
                  dataKey="continuedClaims" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                />
                <Line 
                  yAxisId="rate"
                  type="monotone" 
                  dataKey="unemploymentRate" 
                  stroke="#FBBF24" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                {/* Reference line for concerning level of continued claims */}
                <ReferenceLine 
                  yAxisId="claims"
                  y={1800000} 
                  stroke="#F87171"
                  strokeDasharray="3 3" 
                  label={{ value: "High Risk Level", position: "right" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs text-red-700 font-semibold mb-1">⚠️ DEMO DATA WARNING</div>
          <div className="text-xs text-red-600">
            This is SIMULATED/MOCK data generated by algorithms - NOT real labor market data. 
            Real data would come from: Department of Labor (DOL), Bureau of Labor Statistics (BLS).
          </div>
        </div>
      </div>

      {/* Employment Metrics & Historical Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nonfarm Payrolls</span>
              <div className="text-right">
                <span className="font-medium text-gray-900">
                  {currentMetrics ? `${(currentMetrics.nonfarmPayrolls / 1000).toFixed(0)}K` : '--'}
                </span>
                {currentMetrics && (
                  <div className="text-xs">
                    <TrendArrow value={currentMetrics.monthlyChangePayrolls} suffix="%" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Labor Force Participation</span>
              <span className="font-medium text-gray-900">
                {currentMetrics?.laborParticipation?.toFixed(1) || '--'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Job Openings</span>
              <span className="font-medium text-gray-900">
                {currentMetrics ? `${(currentMetrics.jobOpenings / 1000000).toFixed(1)}M` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">4-Week Avg Claims</span>
              <span className="font-medium text-gray-900">
                {currentMetrics ? currentMetrics.claims4Week?.toLocaleString() : '--'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Analysis</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-800 mb-2">Claims Trend</div>
              <div className="text-sm text-blue-600">
                {currentMetrics?.weeklyChangeInitial > 0 
                  ? `Initial claims increased ${currentMetrics.weeklyChangeInitial.toFixed(1)}% this week`
                  : currentMetrics?.weeklyChangeInitial < 0
                    ? `Initial claims decreased ${Math.abs(currentMetrics.weeklyChangeInitial).toFixed(1)}% this week`
                    : 'Initial claims remained stable this week'
                }
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-800 mb-2">Labor Market Status</div>
              <div className="text-sm text-gray-600">
                {stressLevel === 'high' 
                  ? 'High stress: Elevated unemployment and claims may signal economic weakness'
                  : stressLevel === 'medium'
                    ? 'Moderate stress: Some signs of labor market softening'
                    : 'Low stress: Strong labor market with healthy employment levels'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Attribution - DEMO WARNING */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-red-700 font-semibold mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>DEMO DATA DISCLAIMER</span>
        </div>
        <div className="text-xs text-red-600 space-y-1">
          <div>• This is SIMULATED data for demonstration purposes only</div>
          <div>• Data is generated using algorithms and random values - NOT from real sources</div>
          <div>• Real implementation would use: DOL API, BLS API for authentic labor statistics</div>
          <div>• Last generated: {lastUpdated ? lastUpdated.toLocaleString() : 'Unknown'}</div>
        </div>
      </div>
    </div>
  );
}