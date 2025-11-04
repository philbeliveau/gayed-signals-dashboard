'use client';

/**
 * Simple Gayed Backtesting Page
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 */

import { useState, useMemo } from 'react';
import { Play, Loader2, TrendingUp, TrendingDown, Activity, Calendar, DollarSign } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PageHeader, ContentCard, CardGrid, StatsCard } from '@/components/layout/ProfessionalLayout';
import { SIGNAL_CONFIGS } from '@/domains/backtesting/simple/signals/SignalAdapter';

// Dynamic import of Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface BacktestRequest {
  signalType: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  fastMode?: boolean;
  riskOnSymbol?: string;
  riskOffSymbol?: string;
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

// Signal-specific ETF options (matches dashboard ETF_RECOMMENDATIONS)
const SIGNAL_SPECIFIC_ETFS = {
  'utilities-spy': {
    riskOn: [
      { value: 'SPY', label: 'SPY - S&P 500 (default)' },
      { value: 'QQQ', label: 'QQQ - Nasdaq 100' },
      { value: 'IWM', label: 'IWM - Russell 2000' },
      { value: 'SPXL', label: 'SPXL - 3x S&P 500 (leveraged)' },
    ],
    riskOff: [
      { value: 'XLU', label: 'XLU - Utilities (default)' },
      { value: 'SPLV', label: 'SPLV - Low Volatility' },
      { value: 'USMV', label: 'USMV - Min Volatility' },
    ],
  },
  'lumber-gold': {
    riskOn: [
      { value: 'WOOD', label: 'WOOD - Timber & Forestry (default for signal calc)' },
      { value: 'XLI', label: 'XLI - Industrials' },
      { value: 'XLB', label: 'XLB - Materials' },
      { value: 'IYM', label: 'IYM - Basic Materials' },
    ],
    riskOff: [
      { value: 'GLD', label: 'GLD - Gold (default)' },
      { value: 'IAU', label: 'IAU - Gold Trust' },
      { value: 'TLT', label: 'TLT - 20+ Year Treasury' },
      { value: 'PDBC', label: 'PDBC - Commodities' },
    ],
  },
  'treasury-curve': {
    riskOn: [
      { value: 'IEF', label: 'IEF - 7-10 Year Treasury (default for signal calc)' },
      { value: 'SHY', label: 'SHY - 1-3 Year Treasury' },
      { value: 'VTEB', label: 'VTEB - Municipal Bonds' },
    ],
    riskOff: [
      { value: 'TLT', label: 'TLT - 20+ Year Treasury (default)' },
      { value: 'EDV', label: 'EDV - Extended Duration Treasury' },
      { value: 'VGLT', label: 'VGLT - Long-Term Treasury' },
    ],
  },
  'sp500-ma': {
    riskOn: [
      { value: 'SPY', label: 'SPY - S&P 500 (default)' },
      { value: 'SPXL', label: 'SPXL - 3x S&P 500 (leveraged)' },
      { value: 'QQQ', label: 'QQQ - Nasdaq 100' },
      { value: 'VTI', label: 'VTI - Total Stock Market' },
    ],
    riskOff: [
      { value: 'SHY', label: 'SHY - 1-3 Year Treasury (default)' },
      { value: 'TLT', label: 'TLT - 20+ Year Treasury' },
      { value: 'SPLV', label: 'SPLV - Low Volatility' },
      { value: 'VMOT', label: 'VMOT - Multi-Asset' },
    ],
  },
  'vix-defensive': {
    riskOn: [
      { value: 'SPHB', label: 'SPHB - High Beta (default)' },
      { value: 'SPXL', label: 'SPXL - 3x S&P 500 (leveraged)' },
      { value: 'TQQQ', label: 'TQQQ - 3x Nasdaq (leveraged)' },
      { value: 'UPRO', label: 'UPRO - 3x S&P 500 (leveraged)' },
    ],
    riskOff: [
      { value: 'SPLV', label: 'SPLV - Low Volatility (default)' },
      { value: 'USMV', label: 'USMV - Min Volatility' },
      { value: 'VXX', label: 'VXX - VIX Futures (very high risk)' },
      { value: 'VIXY', label: 'VIXY - VIX Futures (very high risk)' },
    ],
  },
};

export default function SimpleBacktestPage() {
  const [config, setConfig] = useState<BacktestRequest>({
    signalType: 'utilities-spy',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    fastMode: false,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get default symbols for the selected signal
  const currentDefaults = useMemo(() => {
    const signalConfig = SIGNAL_CONFIGS[config.signalType as keyof typeof SIGNAL_CONFIGS];
    return {
      riskOn: signalConfig?.riskOnSymbol || 'SPY',
      riskOff: signalConfig?.riskOffSymbol || 'XLU',
    };
  }, [config.signalType]);

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
        title="Backtesting"
        subtitle="Validate signal performance with historical market data"
      />

      <div className="space-y-8">
        {/* Configuration Panel */}
        <ContentCard title="Configuration" subtitle="Set your strategy parameters">
          <div className="space-y-8">
            {/* Signal Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-theme-text">
                Signal Strategy
              </label>
              <select
                value={config.signalType}
                onChange={(e) => setConfig({ ...config, signalType: e.target.value })}
                className="w-full px-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all hover:border-theme-primary/50 cursor-pointer"
              >
                {SIGNAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                {SIGNAL_OPTIONS.find(opt => opt.value === config.signalType)?.description}
              </p>
            </div>

            {/* Asset Pair Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Risk-On Asset */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  Risk-On Asset
                </label>
                <select
                  value={config.riskOnSymbol || ''}
                  onChange={(e) => setConfig({ ...config, riskOnSymbol: e.target.value || undefined })}
                  className="w-full px-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-green-500/50 transition-all cursor-pointer"
                >
                  <option value="">Default ({currentDefaults.riskOn})</option>
                  {SIGNAL_SPECIFIC_ETFS[config.signalType as keyof typeof SIGNAL_SPECIFIC_ETFS]?.riskOn.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-theme-text-muted">Hold when signal is bullish</p>
              </div>

              {/* Risk-Off Asset */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  Risk-Off Asset
                </label>
                <select
                  value={config.riskOffSymbol || ''}
                  onChange={(e) => setConfig({ ...config, riskOffSymbol: e.target.value || undefined })}
                  className="w-full px-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 hover:border-red-500/50 transition-all cursor-pointer"
                >
                  <option value="">Default ({currentDefaults.riskOff})</option>
                  {SIGNAL_SPECIFIC_ETFS[config.signalType as keyof typeof SIGNAL_SPECIFIC_ETFS]?.riskOff.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-theme-text-muted">Hold when signal is defensive</p>
              </div>
            </div>

            {/* Test Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Initial Capital */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  Initial Capital
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted">$</span>
                  <input
                    type="number"
                    value={config.initialCapital}
                    onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
                    min="1000"
                    step="1000"
                    className="w-full pl-8 pr-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all hover:border-theme-primary/50"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  Start Date
                </label>
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all hover:border-theme-primary/50 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-theme-text">
                  End Date
                </label>
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-theme-border rounded-lg bg-theme-card text-theme-text focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all hover:border-theme-primary/50 cursor-pointer"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-theme-border/30">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Fast Mode Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    onClick={() => setConfig({ ...config, fastMode: !config.fastMode })}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/30 ${
                      config.fastMode ? 'bg-theme-primary' : 'bg-theme-border'
                    }`}
                    aria-label={`Fast mode ${config.fastMode ? 'enabled' : 'disabled'}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        config.fastMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-theme-text group-hover:text-theme-primary transition-colors">
                      Fast Mode
                    </span>
                    <p className="text-xs text-theme-text-muted">
                      {config.fastMode ? 'Approximate data' : 'Full precision'}
                    </p>
                  </div>
                </label>

                {/* Run Button */}
                <button
                  onClick={runBacktest}
                  disabled={loading}
                  className="sm:w-auto px-8 py-3 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Run Backtest</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
            <ContentCard title="Equity Curve" subtitle="Portfolio value and signal indicator over time (zoom/pan enabled)">
              <div className="h-[400px] md:h-[600px]">
                <Plot
                  data={result.equityCurve.data}
                  layout={{
                    ...result.equityCurve.layout,
                    // Mobile-specific overrides
                    margin: {
                      l: 60,
                      r: 60,
                      t: 20,
                      b: 50,
                    },
                    legend: {
                      orientation: 'h',
                      yanchor: 'bottom',
                      y: 1.02,
                      xanchor: 'center',
                      x: 0.5,
                    },
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    toImageButtonOptions: {
                      format: 'png',
                      filename: 'backtest_equity_curve',
                      height: 800,
                      width: 1400,
                      scale: 2,
                    },
                  }}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler={true}
                />
              </div>
            </ContentCard>

            {/* Trade History */}
            <ContentCard title="Trade History" subtitle={`${result.trades.length} trades executed`}>
              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-theme-card-secondary">
                    <tr>
                      <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-theme-text">Date</th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-theme-text">Position</th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-theme-text">Price</th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-medium text-theme-text hidden sm:table-cell">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {result.trades.map((trade, index) => {
                      const isRiskOn = trade.action === 'BUY';
                      return (
                        <tr key={index} className="hover:bg-theme-card-hover transition-colors">
                          <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-theme-text whitespace-nowrap">{trade.date}</td>
                          <td className="px-3 md:px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-lg text-xs font-medium ${
                                isRiskOn
                                  ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                                  : 'bg-red-500/10 text-red-600 border border-red-500/30'
                              }`}>
                                {isRiskOn ? (
                                  <>
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Risk-On:</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Risk-Off:</span>
                                  </>
                                )}
                                <span className="font-semibold">{trade.symbol}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-theme-text whitespace-nowrap">{trade.price}</td>
                          <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-theme-text-muted hidden sm:table-cell">{trade.reason}</td>
                        </tr>
                      );
                    })}
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

