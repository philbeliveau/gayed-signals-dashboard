'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Home, TrendingUp, TrendingDown, AlertTriangle, MapPin, Calendar, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HousingMarketTab() {
  const [housingData, setHousingData] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('national');
  const [refreshing, setRefreshing] = useState(false);

  const regions = [
    { code: 'national', name: 'National' },
    { code: 'ca', name: 'California' },
    { code: 'ny', name: 'New York' },
    { code: 'fl', name: 'Florida' },
    { code: 'tx', name: 'Texas' }
  ];

  const fetchHousingData = async (fast = false) => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await fetch(`/api/housing?region=${selectedRegion}&fast=${fast}`);
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setHousingData(result.housingData || []);
      setCurrentMetrics(result.currentMetrics || null);
      setAlerts(result.alerts || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching housing data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHousingData(true);
  }, [selectedRegion]);

  const TrendArrow = ({ value, showValue = true, suffix = '%' }) => {
    const isPositive = value > 0;
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

  const DataCard = ({ title, value, change, subtitle, icon, status = 'normal' }) => {
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
          {change !== undefined && <TrendArrow value={change} />}
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
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          <p className="text-purple-400 text-sm">Case-Shiller Index: {data.caseSillerIndex?.toFixed(1)}</p>
          {data.housingStarts && (
            <p className="text-green-400 text-sm">Housing Starts: {(data.housingStarts / 1000000).toFixed(2)}M</p>
          )}
          {data.monthsSupply && (
            <p className="text-yellow-400 text-sm">Months Supply: {data.monthsSupply?.toFixed(1)}</p>
          )}
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
          <h3 className="text-xl font-semibold text-red-700 mb-2">Error Loading Housing Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchHousingData(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const selectedRegionData = regions.find(r => r.code === selectedRegion);
  const stressLevel = currentMetrics?.monthsSupply > 6 ? 'high' : currentMetrics?.monthsSupply > 4 ? 'medium' : 'low';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl">
            <Home className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Housing Market Analysis</h2>
            <p className="text-gray-600">Real-time housing market indicators and stress signals</p>
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
            onClick={() => fetchHousingData(true)}
            disabled={refreshing}
            className="p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
            title="Refresh housing data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Regional Filter */}
      <div className="flex items-center gap-4">
        <MapPin className="w-5 h-5 text-gray-500" />
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
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
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <DataCard
          title="Case-Shiller Index"
          value={currentMetrics?.caseSillerIndex?.toFixed(1) || '--'}
          change={currentMetrics?.priceChangeMonthly}
          subtitle="National Home Price Index"
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          status={currentMetrics && currentMetrics.priceChangeMonthly < -1.0 ? 'warning' : 'normal'}
        />
        
        <DataCard
          title="Housing Supply"
          value={currentMetrics?.monthsSupply ? `${currentMetrics.monthsSupply.toFixed(1)} months` : '--'}
          subtitle="Months of Inventory"
          icon={<Home className="w-5 h-5 text-blue-600" />}
          status={currentMetrics && currentMetrics.monthsSupply > 6.0 ? 'critical' : 'normal'}
        />
        
        <DataCard
          title="New Home Sales"
          value={currentMetrics?.newHomeSales ? `${(currentMetrics.newHomeSales / 1000).toFixed(0)}K` : '--'}
          subtitle="Monthly Sales Rate"
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
        />
        
        <DataCard
          title="Market Stress"
          value={stressLevel.toUpperCase()}
          subtitle={`${stressLevel} stress level`}
          icon={<div className={`w-4 h-4 rounded-full ${
            stressLevel === 'high' ? 'bg-red-500' : 
            stressLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          } animate-pulse`} />}
          status={stressLevel === 'high' ? 'critical' : stressLevel === 'medium' ? 'warning' : 'normal'}
        />
      </div>

      {/* Price Trends Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Housing Price Trends
          </h3>
          <p className="text-sm text-gray-600">
            Case-Shiller Index trends for {selectedRegionData?.name} region
          </p>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600">Case-Shiller Index</span>
          </div>
        </div>

        {housingData.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <span className="text-gray-500">No housing market data available</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={housingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="caseSillerIndex" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#8B5CF6', strokeWidth: 2, fill: '#8B5CF6' }}
                />
                {/* Historical average reference line */}
                {housingData.length > 0 && (
                  <ReferenceLine 
                    y={housingData.reduce((sum, d) => sum + d.caseSillerIndex, 0) / housingData.length} 
                    stroke="#6b7280"
                    strokeDasharray="5 5" 
                    label={{ value: "Average", position: "right" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          Chart shows Case-Shiller Home Price Index trends with historical average reference line. 
          Data updates monthly from Federal Reserve Economic Data (FRED).
        </div>
      </div>

      {/* Supply & Demand Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supply Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Housing Starts</span>
              <span className="font-medium text-gray-900">
                {currentMetrics ? `${(currentMetrics.housingStarts / 1000).toFixed(1)}K` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Months Supply</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {currentMetrics?.monthsSupply?.toFixed(1) || '--'}
                </span>
                <div className={`w-3 h-3 rounded-full ${
                  stressLevel === 'high' ? 'bg-red-500' : 
                  stressLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                } animate-pulse`} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">New Home Sales</span>
              <span className="font-medium text-gray-900">
                {currentMetrics?.newHomeSales ? `${(currentMetrics.newHomeSales / 1000).toFixed(0)}K` : '--'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Analysis</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-800 mb-2">Price Trend</div>
              <div className="text-sm text-blue-600">
                {currentMetrics?.priceChangeMonthly > 0 
                  ? `Prices increased ${currentMetrics.priceChangeMonthly.toFixed(1)}% this month`
                  : currentMetrics?.priceChangeMonthly < 0
                    ? `Prices declined ${Math.abs(currentMetrics.priceChangeMonthly).toFixed(1)}% this month`
                    : 'Prices remained stable this month'
                }
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-800 mb-2">Market Status</div>
              <div className="text-sm text-gray-600">
                {stressLevel === 'high' 
                  ? 'High stress: Oversupply conditions may lead to price pressure'
                  : stressLevel === 'medium'
                    ? 'Moderate stress: Balanced supply and demand conditions'
                    : 'Low stress: Healthy market with good demand-supply balance'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}