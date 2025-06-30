'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter, ComposedChart, Bar } from 'recharts';

interface ChartData {
  date: string;
  lumberPrice: number;
  goldPrice: number;
  lumberGoldRatio: number;
  signal?: string;
  signalPrice?: number;
}

interface BacktestData {
  strategy: string;
  symbols: string[];
  timeframe: { start: string; end: string };
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
  trades: Array<{
    date: string;
    action: 'BUY' | 'SELL';
    symbol: string;
    price: number;
    signal: 'Risk-On' | 'Risk-Off';
    lumberGoldRatio: number;
    reasoning: string;
  }>;
  signalHistory: Array<{
    date: string;
    lumberPrice: number;
    goldPrice: number;
    lumberGoldRatio: number;
    signal: 'Risk-On' | 'Risk-Off';
    strength: 'Strong' | 'Moderate' | 'Weak';
  }>;
  chartData: {
    lumber: Array<{ date: string; price: number }>;
    gold: Array<{ date: string; price: number }>;
    ratio: Array<{ date: string; ratio: number }>;
    signals: Array<{ date: string; signal: string; price: number }>;
  };
}

interface Props {
  config: {
    startDate: string;
    endDate: string;
    symbols: string[];
    signals: string[];
  };
}

export default function InteractiveLumberGoldChart({ config }: Props) {
  const [backtestData, setBacktestData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prices' | 'ratio' | 'performance'>('prices');

  useEffect(() => {
    if (config.symbols.includes('WOOD') && config.symbols.includes('GLD') && 
        config.signals.includes('lumber_gold')) {
      runLumberGoldBacktest();
    }
  }, [config]);

  const runLumberGoldBacktest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try real data API
      let response = await fetch('/api/backtest-lumber-gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: config.startDate,
          endDate: config.endDate,
          symbols: config.symbols
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Real data API failed, trying demo API...', errorData.error);
        
        // If real data fails, try demo API
        response = await fetch('/api/backtest-lumber-gold-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: config.startDate,
            endDate: config.endDate,
            symbols: config.symbols
          })
        });
        
        if (!response.ok) {
          throw new Error(errorData.error || 'Both real and demo backtesting failed');
        }
      }

      const data = await response.json();
      setBacktestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-theme-card-secondary border border-theme-border rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto mb-4"></div>
          <p className="text-theme-text">Running REAL Lumber/Gold Backtesting...</p>
          <p className="text-theme-text-muted text-sm mt-2">Fetching actual market data and calculating signals</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-theme-card-secondary border border-theme-danger-border rounded-lg">
        <div className="text-center max-w-md">
          <div className="text-theme-danger text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-theme-danger mb-2">Real Data Required</h3>
          <p className="text-theme-text-muted text-sm mb-4">{error}</p>
          <button 
            onClick={runLumberGoldBacktest}
            className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors"
          >
            Retry with Real Data
          </button>
        </div>
      </div>
    );
  }

  if (!backtestData) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-theme-card-secondary border border-theme-border rounded-lg">
        <div className="text-center">
          <div className="text-theme-text-muted text-2xl mb-4">📊</div>
          <p className="text-theme-text-muted">Select WOOD and GLD symbols with lumber_gold signal to see real backtesting</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData: ChartData[] = backtestData.signalHistory.map(item => ({
    date: item.date,
    lumberPrice: item.lumberPrice,
    goldPrice: item.goldPrice,
    lumberGoldRatio: item.lumberGoldRatio,
    signal: item.signal,
    signalPrice: item.signal === 'Risk-On' ? item.lumberPrice : item.goldPrice
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-lg">
          <p className="text-theme-text font-medium">{new Date(label).toLocaleDateString()}</p>
          <p className="text-blue-400">WOOD: ${data.lumberPrice?.toFixed(2)}</p>
          <p className="text-yellow-400">GLD: ${data.goldPrice?.toFixed(2)}</p>
          <p className="text-theme-primary">L/G Ratio: {data.lumberGoldRatio?.toFixed(3)}</p>
          <p className={`font-medium ${data.signal === 'Risk-On' ? 'text-theme-success' : 'text-theme-danger'}`}>
            Signal: {data.signal}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with Performance Summary */}
      <div className="bg-theme-card border border-theme-border rounded-xl p-4">
        {/* Demo Notice */}
        {(backtestData as any).demo && (
          <div className="mb-4 bg-theme-warning-bg border border-theme-warning-border rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-theme-warning">🧪</span>
              <span className="text-theme-warning font-medium">DEMO MODE</span>
            </div>
            <p className="text-theme-text-secondary text-sm mt-1">
              {(backtestData as any).demo.notice} - {(backtestData as any).demo.dataSource}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-theme-text">{backtestData.strategy}</h3>
            <p className="text-theme-text-muted text-sm">
              {backtestData.timeframe.start} to {backtestData.timeframe.end} • {backtestData.symbols.join(' vs ')}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${backtestData.performance.totalReturn >= 0 ? 'text-theme-success' : 'text-theme-danger'}`}>
              {(backtestData.performance.totalReturn * 100).toFixed(2)}%
            </div>
            <div className="text-theme-text-muted text-sm">Total Return</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-theme-text font-medium">{(backtestData.performance.annualizedReturn * 100).toFixed(2)}%</div>
            <div className="text-theme-text-muted">Annual Return</div>
          </div>
          <div>
            <div className="text-theme-text font-medium">{backtestData.performance.sharpeRatio.toFixed(2)}</div>
            <div className="text-theme-text-muted">Sharpe Ratio</div>
          </div>
          <div>
            <div className="text-theme-danger font-medium">{(backtestData.performance.maxDrawdown * 100).toFixed(2)}%</div>
            <div className="text-theme-text-muted">Max Drawdown</div>
          </div>
          <div>
            <div className="text-theme-text font-medium">{(backtestData.performance.winRate * 100).toFixed(1)}%</div>
            <div className="text-theme-text-muted">Win Rate</div>
          </div>
          <div>
            <div className="text-theme-text font-medium">{backtestData.performance.totalTrades}</div>
            <div className="text-theme-text-muted">Total Trades</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-theme-card p-1 rounded-lg border border-theme-border">
        <button
          onClick={() => setActiveTab('prices')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'prices' 
              ? 'bg-theme-primary text-white' 
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
          }`}
        >
          Asset Prices
        </button>
        <button
          onClick={() => setActiveTab('ratio')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'ratio' 
              ? 'bg-theme-primary text-white' 
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
          }`}
        >
          Lumber/Gold Ratio
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'performance' 
              ? 'bg-theme-primary text-white' 
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover'
          }`}
        >
          Strategy Performance
        </button>
      </div>

      {/* Interactive Charts */}
      <div className="bg-theme-card border border-theme-border rounded-xl p-4 chart-container" style={{ height: '500px' }}>
        {activeTab === 'prices' && (
          <div className="chart-responsive-wrapper h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="chart-grid-color" />
                <XAxis 
                  dataKey="date" 
                  className="chart-axis-color chart-text-color"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="price" className="chart-axis-color chart-text-color" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="signals" orientation="right" className="chart-axis-color chart-text-color" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="lumberPrice" 
                  stroke="var(--theme-primary)" 
                  strokeWidth={2}
                  name="WOOD (Lumber ETF)"
                  dot={false}
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="goldPrice" 
                  stroke="var(--theme-warning)" 
                  strokeWidth={2}
                  name="GLD (Gold ETF)"
                  dot={false}
                />
                
                {/* Signal markers */}
                {backtestData.trades.map((trade, index) => (
                  <ReferenceLine 
                    key={index}
                    x={trade.date} 
                    stroke={trade.signal === 'Risk-On' ? 'var(--theme-success)' : 'var(--theme-danger)'}
                    strokeDasharray="2 2"
                    label={{
                      value: `${trade.action} ${trade.symbol}`,
                      position: 'top',
                      style: { fontSize: '10px', fill: trade.signal === 'Risk-On' ? 'var(--theme-success)' : 'var(--theme-danger)' }
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'ratio' && (
          <div className="chart-responsive-wrapper h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="chart-grid-color" />
                <XAxis 
                  dataKey="date" 
                  className="chart-axis-color chart-text-color"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis className="chart-axis-color chart-text-color" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Lumber/Gold ratio line */}
                <Line 
                  type="monotone" 
                  dataKey="lumberGoldRatio" 
                  stroke="var(--theme-accent)" 
                  strokeWidth={3}
                  name="Lumber/Gold Ratio"
                  dot={false}
                />
                
                {/* Reference line at 1.0 */}
                <ReferenceLine 
                  y={1.0} 
                  stroke="var(--theme-text-muted)" 
                  strokeDasharray="5 5"
                  label={{ value: "Neutral (1.0)", position: "right" }}
                />
                
                {/* Signal change markers */}
                {backtestData.trades.map((trade, index) => (
                  <ReferenceLine 
                    key={index}
                    x={trade.date} 
                    stroke={trade.signal === 'Risk-On' ? 'var(--theme-success)' : 'var(--theme-danger)'}
                    strokeWidth={2}
                    label={{
                      value: `${trade.signal}`,
                      position: trade.signal === 'Risk-On' ? 'bottom' : 'top',
                      style: { fontSize: '10px', fill: trade.signal === 'Risk-On' ? 'var(--theme-success)' : 'var(--theme-danger)' }
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="h-full space-y-4 overflow-y-auto">
            <h4 className="text-lg font-semibold text-theme-text">Trade History</h4>
            <div className="space-y-2">
              {backtestData.trades.map((trade, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-theme-card-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.action === 'BUY' ? 'bg-theme-success-bg text-theme-success' : 'bg-theme-danger-bg text-theme-danger'
                    }`}>
                      {trade.action}
                    </div>
                    <div className="text-theme-text font-medium">{trade.symbol}</div>
                    <div className="text-theme-text-muted text-sm">{new Date(trade.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-theme-text">${trade.price.toFixed(2)}</div>
                    <div className={`text-xs ${trade.signal === 'Risk-On' ? 'text-theme-success' : 'text-theme-danger'}`}>
                      {trade.signal} ({trade.lumberGoldRatio.toFixed(3)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strategy Explanation */}
      <div className="bg-theme-info-bg border border-theme-info-border rounded-xl p-4">
        <h4 className="text-lg font-semibold text-theme-info mb-2">Lumber/Gold Strategy Logic</h4>
        <div className="text-sm text-theme-text-secondary space-y-2">
          <p><strong>Calculation:</strong> Ratio = (Lumber_current/Lumber_91days_ago) / (Gold_current/Gold_91days_ago)</p>
          <p><strong>Risk-On Signal:</strong> Ratio {'>'} 1.0 → Lumber outperforming → Buy WOOD ETF</p>
          <p><strong>Risk-Off Signal:</strong> Ratio {'<'} 1.0 → Gold outperforming → Buy GLD ETF</p>
          <p><strong>Lookback Period:</strong> 91 trading days (13 weeks) as per Gayed research</p>
        </div>
      </div>
    </div>
  );
}