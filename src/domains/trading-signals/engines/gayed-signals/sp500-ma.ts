import { Signal } from '../../types';

export class SP500MovingAverageSignalCalculator {
  /**
   * Calculate S&P 500 Moving Average signal for trend-following analysis
   * @param sp500Prices Array of S&P 500 closing prices (most recent last)
   * @param shortPeriod Short moving average period (default: 50 days)
   * @param longPeriod Long moving average period (default: 200 days)
   * @returns Signal object or null if insufficient data
   */
  static calculateSP500MASignal(
    sp500Prices: number[], 
    shortPeriod: number = 50, 
    longPeriod: number = 200
  ): Signal | null {
    // Validate input parameters
    if (shortPeriod <= 0 || longPeriod <= 0 || shortPeriod >= longPeriod) {
      return null;
    }

    // Validate input data - need at least longPeriod + 1 data points
    if (sp500Prices.length < longPeriod + 1) {
      return null;
    }

    // Filter out invalid prices
    const validPrices = sp500Prices.filter(price => price > 0 && !isNaN(price) && isFinite(price));
    
    if (validPrices.length < longPeriod + 1) {
      return null;
    }

    // Get current price (most recent)
    const currentPrice = validPrices[validPrices.length - 1];

    // Calculate moving averages
    const shortMA = this.calculateMovingAverage(validPrices, shortPeriod);
    const longMA = this.calculateMovingAverage(validPrices, longPeriod);

    if (shortMA === null || longMA === null) {
      return null;
    }

    // Calculate percentage distances from moving averages
    const shortMADistance = ((currentPrice - shortMA) / shortMA) * 100;
    const longMADistance = ((currentPrice - longMA) / longMA) * 100;

    // Determine trend classification and signal
    const aboveShortMA = currentPrice > shortMA;
    const aboveLongMA = currentPrice > longMA;
    
    let signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
    let trendClassification: string;
    
    if (aboveShortMA && aboveLongMA) {
      signal = 'Risk-On';
      trendClassification = 'strong_uptrend';
    } else if (!aboveShortMA && !aboveLongMA) {
      signal = 'Risk-Off';
      trendClassification = 'strong_downtrend';
    } else {
      signal = 'Neutral';
      trendClassification = aboveShortMA ? 'short_term_bullish' : 'long_term_bullish';
    }

    // Calculate signal strength based on distance from moving averages
    const avgDistance = Math.abs((shortMADistance + longMADistance) / 2);
    let strength: 'Strong' | 'Moderate' | 'Weak';
    
    if (avgDistance > 5.0) {
      strength = 'Strong';
    } else if (avgDistance > 2.0) {
      strength = 'Moderate';
    } else {
      strength = 'Weak';
    }

    // Calculate confidence based on clarity of trend signals
    let confidence: number;
    
    if (signal === 'Neutral') {
      // Mixed signals have lower confidence
      confidence = Math.max(0.1, 0.5 - (avgDistance / 20));
    } else {
      // Clear directional signals - confidence increases with distance from MAs
      const baseConfidence = 0.6;
      const distanceBonus = Math.min(avgDistance / 10, 0.4);
      confidence = Math.min(baseConfidence + distanceBonus, 1.0);
    }

    // Calculate raw value (price relative to long MA as primary trend indicator)
    const rawValue = currentPrice / longMA;

    // Additional trend analysis
    const maSpread = ((shortMA - longMA) / longMA) * 100;
    const maCrossover = this.checkMACrossover(validPrices, shortPeriod, longPeriod);

    return {
      type: 'sp500_ma',
      signal,
      strength,
      confidence,
      rawValue,
      date: new Date().toISOString(),
      metadata: {
        currentPrice,
        shortMA,
        longMA,
        shortPeriod,
        longPeriod,
        shortMADistance,
        longMADistance,
        avgDistance,
        trendClassification,
        maSpread,
        maCrossover,
        aboveShortMA,
        aboveLongMA,
        priceToShortMARatio: currentPrice / shortMA,
        priceToLongMARatio: currentPrice / longMA,
        marketRegime: signal === 'Risk-On' ? 'bull_market' : signal === 'Risk-Off' ? 'bear_market' : 'sideways_market'
      }
    };
  }

  /**
   * Calculate simple moving average for given period
   * @param prices Array of prices
   * @param period Moving average period
   * @returns Moving average value or null if insufficient data
   */
  private static calculateMovingAverage(prices: number[], period: number): number | null {
    if (prices.length < period) {
      return null;
    }

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Check for recent moving average crossover
   * @param prices Array of prices
   * @param shortPeriod Short MA period
   * @param longPeriod Long MA period
   * @returns Crossover status
   */
  private static checkMACrossover(
    prices: number[], 
    shortPeriod: number, 
    longPeriod: number
  ): 'bullish_crossover' | 'bearish_crossover' | 'no_crossover' | 'insufficient_data' {
    // Need at least longPeriod + 5 data points to check for crossovers
    if (prices.length < longPeriod + 5) {
      return 'insufficient_data';
    }

    // Calculate current MAs
    const currentShortMA = this.calculateMovingAverage(prices, shortPeriod);
    const currentLongMA = this.calculateMovingAverage(prices, longPeriod);

    // Calculate MAs from 5 periods ago
    const historicalPrices = prices.slice(0, -5);
    const historicalShortMA = this.calculateMovingAverage(historicalPrices, shortPeriod);
    const historicalLongMA = this.calculateMovingAverage(historicalPrices, longPeriod);

    if (!currentShortMA || !currentLongMA || !historicalShortMA || !historicalLongMA) {
      return 'insufficient_data';
    }

    const wasShortAboveLong = historicalShortMA > historicalLongMA;
    const isShortAboveLong = currentShortMA > currentLongMA;

    if (!wasShortAboveLong && isShortAboveLong) {
      return 'bullish_crossover';
    } else if (wasShortAboveLong && !isShortAboveLong) {
      return 'bearish_crossover';
    } else {
      return 'no_crossover';
    }
  }
}