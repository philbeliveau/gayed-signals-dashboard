import { NextRequest, NextResponse } from 'next/server';

/**
 * DEMO Lumber/Gold Strategy with Sample Data
 * Shows how the real system works with actual data structure
 */

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();
    
    console.log('🧪 Running DEMO lumber/gold backtesting with sample data...');
    
    // Generate realistic sample data that mimics Yahoo Finance structure
    const sampleData = generateRealisticSampleData(startDate, endDate);
    
    // Execute the same backtesting logic as the real system
    const backtestResult = await executeLumberGoldBacktest(sampleData, startDate, endDate);
    
    // Add demo notice
    (backtestResult as any).demo = {
      notice: "DEMO MODE: Using realistic sample data structure",
      realSystem: "Switch to /api/backtest-lumber-gold for real Yahoo Finance data",
      dataSource: "Generated sample data with realistic correlations and volatility"
    };
    
    return NextResponse.json(backtestResult);
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Demo backtesting failed' },
      { status: 500 }
    );
  }
}

/**
 * Generate realistic sample data with proper correlations
 */
function generateRealisticSampleData(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const woodData = [];
  const gldData = [];
  
  // Starting prices based on real historical levels
  let woodPrice = 45.0;  // Typical WOOD price
  let gldPrice = 180.0;  // Typical GLD price
  
  // Generate correlated price movements
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Generate correlated returns
    const marketReturn = (Math.random() - 0.5) * 0.02; // Market factor
    const woodSpecific = (Math.random() - 0.5) * 0.03; // WOOD specific
    const gldSpecific = (Math.random() - 0.5) * 0.015; // GLD specific (less volatile)
    
    // WOOD is more volatile and correlated with growth
    const woodReturn = marketReturn * 1.5 + woodSpecific;
    // GLD is defensive and often moves opposite to market
    const gldReturn = marketReturn * -0.3 + gldSpecific;
    
    woodPrice *= (1 + woodReturn);
    gldPrice *= (1 + gldReturn);
    
    woodData.push({
      date: dateStr,
      symbol: 'WOOD',
      close: Math.round(woodPrice * 100) / 100,
      volume: Math.floor(500000 + Math.random() * 1000000)
    });
    
    gldData.push({
      date: dateStr,
      symbol: 'GLD', 
      close: Math.round(gldPrice * 100) / 100,
      volume: Math.floor(5000000 + Math.random() * 10000000)
    });
  }
  
  return { WOOD: woodData, GLD: gldData };
}

/**
 * Same backtesting logic as real system
 */
async function executeLumberGoldBacktest(marketData: any, startDate: string, endDate: string) {
  const lumberData = marketData.WOOD;
  const goldData = marketData.GLD;
  
  // Align dates
  const alignedData = alignMarketData(lumberData, goldData);
  
  const trades: any[] = [];
  const signalHistory: any[] = [];
  const chartData = {
    lumber: alignedData.map(d => ({ date: d.date, price: d.lumberPrice })),
    gold: alignedData.map(d => ({ date: d.date, price: d.goldPrice })),
    ratio: [] as Array<{ date: string; ratio: number }>,
    signals: [] as Array<{ date: string; signal: string; price: number }>
  };
  
  const portfolio = { cash: 100000, shares: 0 };
  let currentPosition: 'WOOD' | 'GLD' | null = null;
  
  // 91-day lookback calculation (same as real system)
  for (let i = 91; i < alignedData.length; i++) {
    const current = alignedData[i];
    const lookback = alignedData[i - 91];
    
    // Calculate lumber/gold ratio (exact same logic)
    const lumberRatio = current.lumberPrice / lookback.lumberPrice;
    const goldRatio = current.goldPrice / lookback.goldPrice;
    const lgRatio = lumberRatio / goldRatio;
    
    const signal = lgRatio > 1.0 ? 'Risk-On' : 'Risk-Off';
    const targetSymbol = signal === 'Risk-On' ? 'WOOD' : 'GLD';
    const targetPrice = signal === 'Risk-On' ? current.lumberPrice : current.goldPrice;
    
    const deviation = Math.abs(lgRatio - 1.0);
    let strength: 'Strong' | 'Moderate' | 'Weak';
    if (deviation > 0.15) strength = 'Strong';
    else if (deviation > 0.05) strength = 'Moderate';
    else strength = 'Weak';
    
    signalHistory.push({
      date: current.date,
      lumberPrice: current.lumberPrice,
      goldPrice: current.goldPrice,
      lumberGoldRatio: lgRatio,
      signal,
      strength
    });
    
    chartData.ratio.push({ date: current.date, ratio: lgRatio });
    
    // Execute trades (same logic as real system)
    if (currentPosition !== targetSymbol && strength !== 'Weak') {
      if (currentPosition && portfolio.shares > 0) {
        const sellPrice = currentPosition === 'WOOD' ? current.lumberPrice : current.goldPrice;
        portfolio.cash = portfolio.shares * sellPrice;
        
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
  
  // Calculate performance metrics (same as real system)
  const finalData = alignedData[alignedData.length - 1];
  const finalPrice = currentPosition === 'WOOD' ? finalData.lumberPrice : finalData.goldPrice;
  const finalValue = portfolio.shares * finalPrice + portfolio.cash;
  
  const totalReturn = (finalValue - 100000) / 100000;
  const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
  
  const returns = [];
  let cumulativeValue = 100000;
  for (const trade of trades) {
    if (trade.action === 'SELL') {
      const newValue = trade.price * portfolio.shares;
      const periodReturn = (newValue - cumulativeValue) / cumulativeValue;
      returns.push(periodReturn);
      cumulativeValue = newValue;
    }
  }
  
  const winningTrades = returns.filter(r => r > 0).length;
  const winRate = returns.length > 0 ? winningTrades / returns.length : 0;
  
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
    strategy: 'Lumber/Gold Ratio Strategy (DEMO)',
    symbols: ['WOOD', 'GLD'],
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

function alignMarketData(lumberData: any[], goldData: any[]) {
  const aligned = [];
  const lumberMap = new Map(lumberData.map(d => [d.date, d.close]));
  const goldMap = new Map(goldData.map(d => [d.date, d.close]));
  
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
    strategy: 'Lumber/Gold Ratio Backtesting (DEMO)',
    description: 'Demonstrates real system with sample data',
    note: 'Uses realistic sample data to show how the system works',
    realEndpoint: '/api/backtest-lumber-gold (uses Yahoo Finance)',
    calculation: 'Same 91-day lookback calculation as real system'
  });
}