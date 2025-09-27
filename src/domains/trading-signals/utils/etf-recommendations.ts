/**
 * ETF Recommendations Configuration for Michael Gayed's Market Regime Signals
 * 
 * Maps each signal strategy to specific ETF recommendations based on Risk-On/Risk-Off signals
 */

export interface ETFRecommendation {
  symbol: string;
  name: string;
  category: string;
  riskLevel: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  expenseRatio: string;
  description: string;
  trackingInfo: string;
  priority: 'PRIMARY' | 'SECONDARY' | 'ALTERNATIVE';
}

export interface StrategyETFConfig {
  strategyName: string;
  description: string;
  riskOnETFs: ETFRecommendation[];
  riskOffETFs: ETFRecommendation[];
  neutralETFs?: ETFRecommendation[];
}

export const ETF_RECOMMENDATIONS: Record<string, StrategyETFConfig> = {
  utilities_spy: {
    strategyName: 'Utilities/SPY Signal',
    description: 'Based on utilities vs SPY relative performance - indicates market risk appetite',
    riskOnETFs: [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        category: 'Large Cap',
        riskLevel: 'Medium',
        expenseRatio: '0.09%',
        description: 'Tracks the S&P 500 index of large-cap US stocks',
        trackingInfo: 'S&P 500 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        category: 'Technology',
        riskLevel: 'Medium',
        expenseRatio: '0.20%',
        description: 'Tracks the Nasdaq-100 index of technology and growth stocks',
        trackingInfo: 'Nasdaq-100 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'IWM',
        name: 'iShares Russell 2000 ETF',
        category: 'Small Cap',
        riskLevel: 'High',
        expenseRatio: '0.19%',
        description: 'Tracks small-cap US stocks via the Russell 2000 index',
        trackingInfo: 'Russell 2000 Index',
        priority: 'SECONDARY'
      },
      {
        symbol: 'SPXL',
        name: 'Direxion Daily S&P 500 Bull 3X Shares',
        category: 'Leveraged',
        riskLevel: 'Very High',
        expenseRatio: '0.95%',
        description: '3x leveraged exposure to the S&P 500 index',
        trackingInfo: '3x S&P 500 Daily Performance',
        priority: 'ALTERNATIVE'
      }
    ],
    riskOffETFs: [
      {
        symbol: 'XLU',
        name: 'Utilities Select Sector SPDR Fund',
        category: 'Utilities',
        riskLevel: 'Low',
        expenseRatio: '0.12%',
        description: 'Tracks utilities companies that provide electricity, gas, and water services',
        trackingInfo: 'Utilities Select Sector Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        category: 'Low Volatility',
        riskLevel: 'Low',
        expenseRatio: '0.25%',
        description: 'Invests in the 100 least volatile stocks from the S&P 500',
        trackingInfo: 'S&P 500 Low Volatility Index',
        priority: 'SECONDARY'
      },
      {
        symbol: 'USMV',
        name: 'iShares MSCI USA Min Vol Factor ETF',
        category: 'Min Volatility',
        riskLevel: 'Low',
        expenseRatio: '0.15%',
        description: 'Targets the lowest volatility stocks in the US market',
        trackingInfo: 'MSCI USA Minimum Volatility Index',
        priority: 'ALTERNATIVE'
      }
    ]
  },

  lumber_gold: {
    strategyName: 'Lumber/Gold Signal',
    description: 'Based on lumber vs gold relative performance - inflation and economic growth indicator',
    riskOnETFs: [
      {
        symbol: 'WOOD',
        name: 'iShares Global Timber & Forestry ETF',
        category: 'Commodities',
        riskLevel: 'High',
        expenseRatio: '0.46%',
        description: 'Invests in companies engaged in timber and forestry related businesses',
        trackingInfo: 'S&P Global Timber & Forestry Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'CUT',
        name: 'Invesco MSCI Global Timber ETF',
        category: 'Commodities',
        riskLevel: 'High',
        expenseRatio: '0.61%',
        description: 'Alternative lumber exposure through global timber companies',
        trackingInfo: 'MSCI ACWI IMI Timber Select Capped Index',
        priority: 'ALTERNATIVE'
      },
      {
        symbol: 'XLI',
        name: 'Industrial Select Sector SPDR Fund',
        category: 'Industrials',
        riskLevel: 'Medium',
        expenseRatio: '0.12%',
        description: 'Industrial sector exposure benefiting from lumber demand',
        trackingInfo: 'Industrial Select Sector Index',
        priority: 'SECONDARY'
      }
    ],
    riskOffETFs: [
      {
        symbol: 'GLD',
        name: 'SPDR Gold Trust',
        category: 'Precious Metals',
        riskLevel: 'Medium',
        expenseRatio: '0.40%',
        description: 'Tracks the price of gold bullion',
        trackingInfo: 'London Gold PM Fix Price',
        priority: 'PRIMARY'
      },
      {
        symbol: 'IAU',
        name: 'iShares Gold Trust',
        category: 'Precious Metals',
        riskLevel: 'Medium',
        expenseRatio: '0.25%',
        description: 'Lower-cost alternative gold exposure',
        trackingInfo: 'London Gold AM Fix Price',
        priority: 'ALTERNATIVE'
      },
      {
        symbol: 'PDBC',
        name: 'Invesco Optimum Yield Diversified Commodity Strategy',
        category: 'Commodities',
        riskLevel: 'Medium',
        expenseRatio: '0.59%',
        description: 'Diversified commodity exposure with gold allocation',
        trackingInfo: 'Diversified Commodity Index',
        priority: 'SECONDARY'
      }
    ]
  },

  treasury_curve: {
    strategyName: 'Treasury Curve Signal',
    description: 'Based on 10Y vs 30Y Treasury performance - yield curve steepening/flattening indicator',
    riskOnETFs: [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        category: 'Large Cap Equity',
        riskLevel: 'Medium',
        expenseRatio: '0.09%',
        description: 'Benefits from steepening yield curve environment',
        trackingInfo: 'S&P 500 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'XLF',
        name: 'Financial Select Sector SPDR Fund',
        category: 'Financials',
        riskLevel: 'Medium',
        expenseRatio: '0.12%',
        description: 'Banks benefit from steeper yield curves',
        trackingInfo: 'Financial Select Sector Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'IWM',
        name: 'iShares Russell 2000 ETF',
        category: 'Small Cap',
        riskLevel: 'High',
        expenseRatio: '0.19%',
        description: 'Small caps benefit from economic growth signaled by steepening',
        trackingInfo: 'Russell 2000 Index',
        priority: 'SECONDARY'
      }
    ],
    riskOffETFs: [
      {
        symbol: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        category: 'Long Duration',
        riskLevel: 'Medium',
        expenseRatio: '0.15%',
        description: 'Benefits from flattening yield curve and flight to quality',
        trackingInfo: 'ICE U.S. Treasury 20+ Year Bond Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'IEF',
        name: 'iShares 7-10 Year Treasury Bond ETF',
        category: 'Intermediate Duration',
        riskLevel: 'Low',
        expenseRatio: '0.15%',
        description: 'Intermediate duration Treasury exposure',
        trackingInfo: 'ICE U.S. Treasury 7-10 Year Bond Index',
        priority: 'SECONDARY'
      },
      {
        symbol: 'VGIT',
        name: 'Vanguard Intermediate-Term Treasury ETF',
        category: 'Intermediate Duration',
        riskLevel: 'Low',
        expenseRatio: '0.04%',
        description: 'Low-cost intermediate Treasury exposure',
        trackingInfo: 'Bloomberg U.S. Treasury 3-10 Year Index',
        priority: 'ALTERNATIVE'
      }
    ]
  },

  vix_defensive: {
    strategyName: 'VIX Defensive Signal',
    description: 'Counter-intuitive positioning: Low VIX = Defensive, High VIX = Normal allocation',
    riskOnETFs: [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        category: 'Large Cap',
        riskLevel: 'Medium',
        expenseRatio: '0.09%',
        description: 'Normal equity allocation when volatility is elevated',
        trackingInfo: 'S&P 500 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        category: 'Total Market',
        riskLevel: 'Medium',
        expenseRatio: '0.03%',
        description: 'Broad market exposure during normal volatility periods',
        trackingInfo: 'CRSP US Total Market Index',
        priority: 'SECONDARY'
      },
      {
        symbol: 'MTUM',
        name: 'iShares MSCI USA Momentum Factor ETF',
        category: 'Factor',
        riskLevel: 'Medium',
        expenseRatio: '0.15%',
        description: 'Momentum factor exposure when volatility normalizes',
        trackingInfo: 'MSCI USA Momentum Index',
        priority: 'ALTERNATIVE'
      }
    ],
    riskOffETFs: [
      {
        symbol: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        category: 'Low Volatility',
        riskLevel: 'Low',
        expenseRatio: '0.25%',
        description: 'Defensive positioning when VIX is too low (complacency)',
        trackingInfo: 'S&P 500 Low Volatility Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'USMV',
        name: 'iShares MSCI USA Min Vol Factor ETF',
        category: 'Min Volatility',
        riskLevel: 'Low',
        expenseRatio: '0.15%',
        description: 'Minimum volatility factor exposure',
        trackingInfo: 'MSCI USA Minimum Volatility Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'QUAL',
        name: 'iShares MSCI USA Quality Factor ETF',
        category: 'Quality',
        riskLevel: 'Low',
        expenseRatio: '0.15%',
        description: 'High-quality companies for defensive positioning',
        trackingInfo: 'MSCI USA Sector Neutral Quality Index',
        priority: 'SECONDARY'
      }
    ]
  },

  sp500_ma: {
    strategyName: 'S&P 500 Moving Average Signal',
    description: 'Trend-following based on 50-day and 200-day moving averages',
    riskOnETFs: [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        category: 'Large Cap',
        riskLevel: 'Medium',
        expenseRatio: '0.09%',
        description: 'Primary exposure when trend is positive',
        trackingInfo: 'S&P 500 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        category: 'Technology',
        riskLevel: 'Medium',
        expenseRatio: '0.20%',
        description: 'Growth exposure during uptrends',
        trackingInfo: 'Nasdaq-100 Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'MTUM',
        name: 'iShares MSCI USA Momentum Factor ETF',
        category: 'Momentum',
        riskLevel: 'Medium',
        expenseRatio: '0.15%',
        description: 'Momentum factor during trend continuation',
        trackingInfo: 'MSCI USA Momentum Index',
        priority: 'SECONDARY'
      }
    ],
    riskOffETFs: [
      {
        symbol: 'SHY',
        name: 'iShares 1-3 Year Treasury Bond ETF',
        category: 'Short Duration',
        riskLevel: 'Very Low',
        expenseRatio: '0.15%',
        description: 'Cash-like exposure during downtrends',
        trackingInfo: 'ICE U.S. Treasury 1-3 Year Bond Index',
        priority: 'PRIMARY'
      },
      {
        symbol: 'SPLV',
        name: 'Invesco S&P 500 Low Volatility ETF',
        category: 'Low Volatility',
        riskLevel: 'Low',
        expenseRatio: '0.25%',
        description: 'Defensive equity exposure during bear markets',
        trackingInfo: 'S&P 500 Low Volatility Index',
        priority: 'SECONDARY'
      },
      {
        symbol: 'GLD',
        name: 'SPDR Gold Trust',
        category: 'Precious Metals',
        riskLevel: 'Medium',
        expenseRatio: '0.40%',
        description: 'Safe haven asset during market stress',
        trackingInfo: 'London Gold PM Fix Price',
        priority: 'ALTERNATIVE'
      }
    ]
  }
};

/**
 * Get ETF recommendations for a specific strategy and signal
 */
export function getETFRecommendations(
  strategyType: string, 
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral'
): ETFRecommendation[] {
  const config = ETF_RECOMMENDATIONS[strategyType];
  if (!config) return [];

  switch (signal) {
    case 'Risk-On':
      return config.riskOnETFs;
    case 'Risk-Off':
      return config.riskOffETFs;
    case 'Neutral':
      return config.neutralETFs || [];
    default:
      return [];
  }
}

/**
 * Get all unique symbols needed for ETF recommendations
 */
export function getAllRecommendedSymbols(): string[] {
  const allSymbols = new Set<string>();
  
  Object.values(ETF_RECOMMENDATIONS).forEach(config => {
    config.riskOnETFs.forEach(etf => allSymbols.add(etf.symbol));
    config.riskOffETFs.forEach(etf => allSymbols.add(etf.symbol));
    config.neutralETFs?.forEach(etf => allSymbols.add(etf.symbol));
  });
  
  return Array.from(allSymbols);
}

/**
 * Get strategy configuration
 */
export function getStrategyConfig(strategyType: string): StrategyETFConfig | null {
  return ETF_RECOMMENDATIONS[strategyType] || null;
}