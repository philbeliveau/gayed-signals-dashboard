import yahooFinance from 'yahoo-finance2';
import { MarketData } from './types';

export async function fetchMarketData(symbols: string[], period: string = '2y'): Promise<Record<string, MarketData[]>> {
  const results: Record<string, MarketData[]> = {};
  
  for (const symbol of symbols) {
    try {
      const cleanSymbol = symbol.replace('^', '');
      const historical = await yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)), // 2 years ago
        period2: new Date(),
        interval: '1d'
      });
      
      results[cleanSymbol] = historical.map(data => ({
        date: data.date.toISOString().split('T')[0],
        symbol: cleanSymbol,
        close: data.close,
        volume: data.volume
      }));
      
      console.log(`✅ Fetched ${historical.length} data points for ${symbol}`);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error fetching data for ${symbol}:`, error);
      results[symbol.replace('^', '')] = [];
    }
  }
  
  return results;
}

export function validateMarketData(data: Record<string, MarketData[]>): boolean {
  const requiredSymbols = ['SPY', 'XLU'];
  const minDataPoints = 252; // Need at least 1 year
  
  for (const symbol of requiredSymbols) {
    if (!data[symbol] || data[symbol].length < minDataPoints) {
      console.error(`❌ Insufficient data for ${symbol}: ${data[symbol]?.length || 0} points`);
      return false;
    }
  }
  
  return true;
}
