'use client';

/**
 * Simple Gayed Backtesting Page
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 */

import { useState } from 'react';
import { Play, Loader2, TrendingUp, TrendingDown, Activity, Calendar, DollarSign, Zap } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { PageHeader, ContentCard, CardGrid, StatsCard } from '@/components/layout/ProfessionalLayout';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BacktestRequest {
  signalType: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  fastMode?: boolean;
}

interface BacktestResult {
  config: {
    signalType: string;
    dateRange: string;
    initialCapital: string;
  };
  metrics: {
    totalReturn: string;
    numberOfTrades: number;
    winRate: string;
    maxDrawdown: string;
    finalValue: string;
    initialValue: string;
  };
  summary: {
    dateRange: string;
    tradingDays: number;
    averageDailyReturn: string;
    bestDay: { date: string; return: string };
    worstDay: { date: string; return: string };
  };
  equityCurve: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }>;
  };
  trades: Array<{
    date: string;
    action: string;
    symbol: string;
    price: string;
    reason: string;
    signalValue?: string;
  }>;
  dataQuality: {
    score: number;
    issues: string[];
  };
}

const SIGNAL_OPTIONS = [
  { value: 'utilities-spy', label: 'Utilities/SPY Signal', description: 'XLU vs SPY relative strength' },
  { value: 'lumber-gold', label: 'Lumber/Gold Signal', description: 'WOOD vs GLD commodity rotation' },
  { value: 'treasury-curve', label: 'Treasury Curve Signal', description: 'IEF vs TLT yield curve' },
  { value: 'sp500-ma', label: 'SP500 Moving Average', description: 'SPY vs 200-day MA' },
  { value: 'vix-defensive', label: 'VIX Defensive Signal', description: 'VIXY volatility indicator' },
];

export default function SimpleBacktestPage() {
  const [config, setConfig] = useState<BacktestRequest>({
    signalType: 'utilities-spy',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    initialCapital: 10000,
    fastMode: false,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/backtest-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Backtest failed');
      }

      if (data.success && data.result) {
        setResult(data.result);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Backtest error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Simple Backtesting"
        subtitle="Test historical performance of Gayed signals"
      />

      <div className="space-y-8">
        {/* Configuration Panel */}
        <ContentCard title="Backtest Configuration" subtitle="Configure your backtest parameters">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Signal Selection */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">
                Signal Type
              </label>
              <select
                value={config.signalType}
                onChange={(e) => setConfig({ ...config, signalType: e.target.value })}
                className="w-full px-4 py-3 border border-theme-border rounded-xl bg-theme-card text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
              >
                {SIGNAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Capital */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">
                Initial Capital ($)
              </label>
              <input
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
                min="1000"
                step="1000"
                className="w-full px-4 py-3 border border-theme-border rounded-xl bg-theme-card text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="w-full px-4 py-3 border border-theme-border rounded-xl bg-theme-card text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">
                End Date
              </label>
              <input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                className="w-full px-4 py-3 border border-theme-border rounded-xl bg-theme-card text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Run Button with Mode Toggle */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Fast Mode Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-theme-text">Fast Mode</label>
              <button
                onClick={() => setConfig({ ...config, fastMode: !config.fastMode })}
                className={`group relative flex items-center px-2 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 ${
                  config.fastMode
                    ? 'bg-theme-primary/10 hover:bg-theme-primary/20 border-theme-primary/20 hover:border-theme-primary/30'
                    : 'bg-theme-border/10 hover:bg-theme-border/20 border-theme-border hover:border-theme-border'
                }`}
                aria-label={`Fast mode ${config.fastMode ? 'enabled' : 'disabled'}`}
                title={config.fastMode ? 'Disable fast mode (approximate data)' : 'Enable fast mode (approximate data)'}
              >
                {/* Toggle Track */}
                <div className="relative w-11 h-6 bg-theme-border rounded-full transition-colors duration-200">
                  {/* Toggle Slider */}
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-200 flex items-center justify-center ${
                      config.fastMode
                        ? 'translate-x-5 bg-theme-primary'
                        : 'translate-x-0 bg-theme-card'
                    }`}
                  >
                    {config.fastMode && <Zap className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
              <span className="text-xs text-theme-text-muted">
                {config.fastMode ? 'Approximate data' : 'Detailed data'}
              </span>
            </div>

            {/* Run Button */}
            <button
              onClick={runBacktest}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Running Backtest...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Run Backtest</span>
                </>
              )}
            </button>
          </div>
        </ContentCard>

        {/* Error Display */}
        {error && (
          <ContentCard>
            <div className="bg-theme-danger-bg border border-theme-danger-border rounded-xl p-4">
              <p className="text-theme-danger">{error}</p>
            </div>
          </ContentCard>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-8">
            {/* Performance Metrics */}
            <ContentCard title="Performance Metrics" subtitle="Backtest results summary">
              <CardGrid cols={3}>
                <StatsCard
                  title="Total Return"
                  value={result.metrics.totalReturn}
                  changeType={result.metrics.totalReturn.startsWith('+') ? 'positive' : 'negative'}
                  icon={<TrendingUp className="w-6 h-6 text-theme-success" />}
                />
                <StatsCard
                  title="Number of Trades"
                  value={result.metrics.numberOfTrades}
                  icon={<Activity className="w-6 h-6 text-theme-primary" />}
                />
                <StatsCard
                  title="Win Rate"
                  value={result.metrics.winRate}
                  icon={<TrendingUp className="w-6 h-6 text-theme-success" />}
                />
                <StatsCard
                  title="Max Drawdown"
                  value={result.metrics.maxDrawdown}
                  changeType="negative"
                  icon={<TrendingDown className="w-6 h-6 text-theme-danger" />}
                />
                <StatsCard
                  title="Final Value"
                  value={result.metrics.finalValue}
                  icon={<DollarSign className="w-6 h-6 text-theme-success" />}
                />
                <StatsCard
                  title="Trading Days"
                  value={result.summary.tradingDays}
                  icon={<Calendar className="w-6 h-6 text-theme-primary" />}
                />
              </CardGrid>
            </ContentCard>

            {/* Equity Curve Chart */}
            <ContentCard title="Equity Curve" subtitle="Portfolio value over time">
              <div className="h-96">
                <Line
                  data={result.equityCurve}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value: any) => `$${Number(value).toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </ContentCard>

            {/* Trade History */}
            <ContentCard title="Trade History" subtitle={`${result.trades.length} trades executed`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-card-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-text">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-text">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-text">Symbol</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-text">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-text">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {result.trades.map((trade, index) => (
                      <tr key={index} className="hover:bg-theme-card-hover transition-colors">
                        <td className="px-4 py-3 text-sm text-theme-text">{trade.date}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            trade.action === 'BUY'
                              ? 'bg-theme-success-bg text-theme-success border border-theme-success-border'
                              : 'bg-theme-danger-bg text-theme-danger border border-theme-danger-border'
                          }`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-theme-text">{trade.symbol}</td>
                        <td className="px-4 py-3 text-sm text-theme-text">{trade.price}</td>
                        <td className="px-4 py-3 text-sm text-theme-text-muted">{trade.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>

            {/* Data Quality */}
            {result.dataQuality.score < 1.0 && (
              <ContentCard>
                <div className="bg-theme-warning-bg border border-theme-warning-border rounded-xl p-4">
                  <p className="text-sm text-theme-warning">
                    Data Quality Score: {(result.dataQuality.score * 100).toFixed(0)}%
                    {result.dataQuality.issues.length > 0 && ` - Issues: ${result.dataQuality.issues.join(', ')}`}
                  </p>
                </div>
              </ContentCard>
            )}
          </div>
        )}
      </div>
    </>
  );
}

