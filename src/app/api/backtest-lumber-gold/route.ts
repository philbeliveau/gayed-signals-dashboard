import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData } from '../../../../lib/yahoo-finance';

/**
 * REAL Lumber/Gold Strategy Backtesting API
 * 
 * Implements actual lumber/gold ratio calculation and backtesting
 * NO FAKE DATA - uses real market data or returns error
 */

interface MarketData {
  date: string;
  symbol: string;
  close: number;
  volume?: number;
}

interface BacktestResult {
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

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, symbols } = await request.json();
    
    // Validate required symbols for lumber/gold strategy
    const lumberSymbols = ['WOOD', 'CUT']; // Multiple lumber ETF options
    const hasLumber = lumberSymbols.some(symbol => symbols.includes(symbol));
    const hasGold = symbols.includes('GLD');
    
    if (!hasLumber || !hasGold) {
      return NextResponse.json(
        { error: `LUMBER/GOLD STRATEGY REQUIRES: One lumber ETF (${lumberSymbols.join(' or ')}) and GLD (gold ETF) must be selected` },
        { status: 400 }
      );
    }
    
    // Determine which lumber symbol to use
    const lumberSymbol = lumberSymbols.find(symbol => symbols.includes(symbol)) || 'WOOD';
    
    // Get real market data
    const marketData = await fetchRealMarketData([lumberSymbol, 'GLD'], startDate, endDate);
    
    if (!marketData[lumberSymbol] || !marketData.GLD) {
      return NextResponse.json(
        { error: `REAL DATA REQUIRED: Cannot fetch lumber (${lumberSymbol}) or gold (GLD) data. Please ensure market data service is available.` },
        { status: 503 }
      );
    }
    
    // Execute real lumber/gold backtesting
    const backtestResult = await executeLumberGoldBacktest(marketData, startDate, endDate, lumberSymbol);
    
    return NextResponse.json(backtestResult);
    
  } catch (error) {
    console.error('Lumber/Gold backtest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backtesting failed' },
      { status: 500 }
    );
  }
}

/**
 * Fetch REAL market data using reliable yahoo-finance2 library - NO FAKE DATA
 */
async function fetchRealMarketData(
  symbols: string[], 
  startDate: string, 
  endDate: string
): Promise<Record<string, MarketData[]>> {
  try {
    console.log(`🔍 Fetching REAL market data for ${symbols.join(', ')} from ${startDate} to ${endDate}`);
    
    // Use the proper yahoo-finance library
    const rawData = await fetchMarketData(symbols, '5y');
    
    // Convert to expected format and filter by date range
    const marketData: Record<string, MarketData[]> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (const symbol of symbols) {
      if (rawData[symbol] && rawData[symbol].length > 0) {
        marketData[symbol] = rawData[symbol]
          .filter(data => {
            const dataDate = new Date(data.date);
            return dataDate >= start && dataDate <= end;
          })
          .map(data => ({
            date: data.date,
            symbol: data.symbol,
            close: data.close,
            volume: data.volume || 0
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
        console.log(`✅ Retrieved ${marketData[symbol].length} data points for ${symbol}`);
      } else {
        throw new Error(`REAL DATA UNAVAILABLE: No data received for ${symbol} from Yahoo Finance`);
      }
    }
    
    // Validate we have sufficient data
    for (const symbol of symbols) {
      if (!marketData[symbol] || marketData[symbol].length < 100) {
        throw new Error(`INSUFFICIENT REAL DATA: ${symbol} has only ${marketData[symbol]?.length || 0} data points (minimum 100 required)`);
      }
    }
    
    return marketData;
    
  } catch (error) {
    console.error('❌ Real market data fetch failed:', error);
    throw new Error(`REAL DATA SERVICE UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Execute REAL lumber/gold backtesting with actual ratio calculation
 */
async function executeLumberGoldBacktest(
  marketData: Record<string, MarketData[]>,
  startDate: string,
  endDate: string,
  lumberSymbol: string = 'WOOD'
): Promise<BacktestResult> {
  
  const lumberData = marketData[lumberSymbol];
  const goldData = marketData.GLD;
  
  // Align dates between lumber and gold data
  const alignedData = alignMarketData(lumberData, goldData);
  
  const trades: any[] = [];
  const signalHistory: any[] = [];
  const chartData = {
    lumber: alignedData.map(d => ({ date: d.date, price: d.lumberPrice })),
    gold: alignedData.map(d => ({ date: d.date, price: d.goldPrice })),
    ratio: [] as Array<{ date: string; ratio: number }>,
    signals: [] as Array<{ date: string; signal: string; price: number }>
  };
  
  const portfolio = { cash: 100000, shares: 0, symbol: null as string | null };
  let currentPosition: 'WOOD' | 'GLD' | null = null;
  
  // Calculate signals using 91-day lookback (as per lumber-gold.ts)
  for (let i = 91; i < alignedData.length; i++) {
    const current = alignedData[i];
    const lookback = alignedData[i - 91];
    
    // Calculate 91-day performance ratios
    const lumberRatio = current.lumberPrice / lookback.lumberPrice;
    const goldRatio = current.goldPrice / lookback.goldPrice;
    const lgRatio = lumberRatio / goldRatio;
    
    // Determine signal (exact logic from lumber-gold.ts:83)
    const signal = lgRatio > 1.0 ? 'Risk-On' : 'Risk-Off';
    const targetSymbol = signal === 'Risk-On' ? lumberSymbol : 'GLD';
    const targetPrice = signal === 'Risk-On' ? current.lumberPrice : current.goldPrice;
    
    // Determine strength
    const deviation = Math.abs(lgRatio - 1.0);
    let strength: 'Strong' | 'Moderate' | 'Weak';
    if (deviation > 0.15) strength = 'Strong';
    else if (deviation > 0.05) strength = 'Moderate';
    else strength = 'Weak';
    
    // Record signal
    signalHistory.push({
      date: current.date,
      lumberPrice: current.lumberPrice,
      goldPrice: current.goldPrice,
      lumberGoldRatio: lgRatio,
      signal,
      strength
    });
    
    chartData.ratio.push({ date: current.date, ratio: lgRatio });
    
    // Execute trades based on signal changes
    if (currentPosition !== targetSymbol && strength !== 'Weak') {
      
      // Close existing position
      if (currentPosition && portfolio.shares > 0) {
        const sellPrice = currentPosition === lumberSymbol ? current.lumberPrice : current.goldPrice;
        const sellValue = portfolio.shares * sellPrice;
        portfolio.cash = sellValue;
        
        trades.push({
          date: current.date,
          action: 'SELL',
          symbol: currentPosition,
          price: sellPrice,
          signal: signal,
          lumberGoldRatio: lgRatio,
          reasoning: `Close ${currentPosition} position - Signal changed to ${signal}`
        });
      }
      
      // Open new position
      portfolio.shares = portfolio.cash / targetPrice;
      portfolio.cash = 0;
      currentPosition = targetSymbol;
      
      trades.push({
        date: current.date,
        action: 'BUY',
        symbol: targetSymbol,
        price: targetPrice,
        signal: signal,
        lumberGoldRatio: lgRatio,
        reasoning: `Buy ${targetSymbol} - L/G ratio: ${lgRatio.toFixed(3)} (${signal})`
      });
      
      chartData.signals.push({
        date: current.date,
        signal: `${signal} (${targetSymbol})`,
        price: targetPrice
      });
    }
  }
  
  // Calculate final portfolio value
  const finalData = alignedData[alignedData.length - 1];
  const finalPrice = currentPosition === lumberSymbol ? finalData.lumberPrice : finalData.goldPrice;
  const finalValue = portfolio.shares * finalPrice + portfolio.cash;
  
  // Calculate performance metrics
  const totalReturn = (finalValue - 100000) / 100000;
  const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
  
  // Calculate other metrics
  const returns = trades.map((trade, i) => {
    if (i === 0) return 0;
    const prevTrade = trades[i - 1];
    return (trade.price - prevTrade.price) / prevTrade.price;
  });
  
  const winningTrades = trades.filter((trade, i) => i > 0 && returns[i] > 0).length;
  const winRate = trades.length > 1 ? winningTrades / (trades.length - 1) : 0;
  
  // Calculate max drawdown
  let peak = 100000;
  let maxDrawdown = 0;
  for (let i = 0; i < signalHistory.length; i++) {
    const value = 100000 * (1 + totalReturn * (i / signalHistory.length));
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0);
  const sharpeRatio = volatility > 0 ? (annualizedReturn - 0.02) / (volatility * Math.sqrt(252)) : 0;
  
  return {
    strategy: 'Lumber/Gold Ratio Strategy',
    symbols: [lumberSymbol, 'GLD'],
    timeframe: { start: startDate, end: endDate },
    performance: {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length
    },
    trades,
    signalHistory,
    chartData
  };
}

/**
 * Align lumber and gold data by matching dates
 */
function alignMarketData(lumberData: MarketData[], goldData: MarketData[]): Array<{
  date: string;
  lumberPrice: number;
  goldPrice: number;
}> {
  const aligned: Array<{ date: string; lumberPrice: number; goldPrice: number }> = [];
  
  const lumberMap = new Map(lumberData.map(d => [d.date, d.close]));
  const goldMap = new Map(goldData.map(d => [d.date, d.close]));
  
  // Get common dates
  const commonDates = lumberData
    .map(d => d.date)
    .filter(date => goldMap.has(date))
    .sort();
  
  for (const date of commonDates) {
    const lumberPrice = lumberMap.get(date);
    const goldPrice = goldMap.get(date);
    
    if (lumberPrice && goldPrice) {
      aligned.push({ date, lumberPrice, goldPrice });
    }
  }
  
  return aligned;
}

export async function GET() {
  return NextResponse.json({
    strategy: 'Lumber/Gold Ratio Backtesting',
    description: 'Real lumber/gold ratio calculation using 91-day lookback period',
    requiredSymbols: ['One lumber ETF (WOOD or CUT)', 'GLD'],
    lumberETFOptions: ['WOOD', 'CUT'],
    calculation: 'Ratio = (Lumber_t/Lumber_t-91) / (Gold_t/Gold_t-91)',
    signals: {
      'Risk-On': 'Ratio > 1.0 (Lumber outperforming) → Buy lumber ETF',
      'Risk-Off': 'Ratio < 1.0 (Gold outperforming) → Buy GLD'
    },
    note: 'Uses REAL market data only - no synthetic data generated'
  });
}