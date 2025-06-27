import { Signal } from '../types';

export class VixDefensiveSignalCalculator {
  /**
   * Calculate VIX-Based Defensive Positioning Signal based on Michael Gayed's methodology
   * 
   * Counter-intuitive Signal Logic:
   * - VIX < threshold (low volatility) → Risk-Off (defensive overweight)
   * - VIX >= threshold (normal/high volatility) → Risk-On (normal allocation)
   * 
   * Theory: Low volatility periods often precede market stress, making defensive positioning prudent
   * 
   * @param vixPrices Array of VIX values (most recent last)
   * @param threshold VIX threshold level (default: 12.5)
   * @returns Signal object or null if insufficient data
   */
  static calculateVixDefensiveSignal(
    vixPrices: number[], 
    threshold: number = 12.5
  ): Signal | null {
    // Validate input data
    if (vixPrices.length === 0) {
      return null;
    }

    // Validate threshold
    if (threshold <= 0 || threshold > 100 || !isFinite(threshold)) {
      return null;
    }

    // Filter out invalid VIX values
    const validVixPrices = vixPrices.filter(price => {
      return price > 0 && 
             price < 200 && // VIX rarely exceeds 100, but allow buffer
             !isNaN(price) && 
             isFinite(price);
    });

    if (validVixPrices.length === 0) {
      return null;
    }

    // Get most recent VIX value
    const currentVix = validVixPrices[validVixPrices.length - 1];

    // Validate current VIX value
    if (!isFinite(currentVix) || isNaN(currentVix) || currentVix <= 0) {
      return null;
    }

    // Apply Michael Gayed's VIX Defensive Signal logic (counter-intuitive)
    let signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
    let marketRegime: string;

    if (currentVix < threshold) {
      // Low volatility → Defensive overweight (Risk-Off)
      signal = 'Risk-Off';
      marketRegime = 'Low Volatility - Defensive Overweight';
    } else {
      // Normal/High volatility → Normal allocation (Risk-On)
      signal = 'Risk-On';
      marketRegime = 'Normal/High Volatility - Normal Allocation';
    }

    // Calculate distance from threshold for strength and confidence
    const distanceFromThreshold = Math.abs(currentVix - threshold);
    const relativeDistance = distanceFromThreshold / threshold;

    // Calculate strength based on how far VIX is from threshold
    let strength: 'Strong' | 'Moderate' | 'Weak';
    
    if (relativeDistance > 0.4) {
      // VIX is >40% away from threshold
      strength = 'Strong';
    } else if (relativeDistance > 0.2) {
      // VIX is 20-40% away from threshold
      strength = 'Moderate';
    } else {
      // VIX is <20% away from threshold
      strength = 'Weak';
    }

    // Calculate confidence based on distance from threshold
    // Higher confidence when VIX is further from threshold
    let confidence = Math.min(relativeDistance * 2, 1.0);
    
    // Boost confidence for extreme VIX readings
    if (currentVix < 10) {
      // Extremely low VIX - very high confidence in defensive positioning
      confidence = Math.min(confidence * 1.5, 1.0);
    } else if (currentVix > 30) {
      // High VIX - high confidence in normal allocation
      confidence = Math.min(confidence * 1.3, 1.0);
    }

    // Ensure minimum confidence
    confidence = Math.max(0.1, confidence);

    // Calculate additional metrics for context
    const vixPercentile = calculateVixPercentile(currentVix, validVixPrices);
    const vixTrend = calculateVixTrend(validVixPrices);

    // Determine volatility regime
    let volatilityRegime: string;
    if (currentVix < 12) {
      volatilityRegime = 'Extremely Low';
    } else if (currentVix < 16) {
      volatilityRegime = 'Low';
    } else if (currentVix < 20) {
      volatilityRegime = 'Normal';
    } else if (currentVix < 30) {
      volatilityRegime = 'Elevated';
    } else {
      volatilityRegime = 'High';
    }

    return {
      type: 'vix_defensive',
      signal,
      strength,
      confidence,
      rawValue: currentVix,
      date: new Date().toISOString(),
      metadata: {
        currentVix,
        threshold,
        distanceFromThreshold,
        relativeDistance,
        marketRegime,
        volatilityRegime,
        vixPercentile,
        vixTrend,
        methodology: 'Gayed VIX Defensive Positioning',
        signalLogic: 'Counter-intuitive: Low VIX → Defensive, High VIX → Normal',
        thresholdRationale: `VIX below ${threshold} suggests complacency, favoring defensive positioning`
      }
    };
  }
}

/**
 * Calculate VIX percentile rank over the provided period
 */
function calculateVixPercentile(currentVix: number, vixPrices: number[]): number {
  const sortedPrices = [...vixPrices].sort((a, b) => a - b);
  const rank = sortedPrices.findIndex(price => price >= currentVix);
  return rank === -1 ? 100 : (rank / sortedPrices.length) * 100;
}

/**
 * Calculate VIX trend over recent period
 */
function calculateVixTrend(vixPrices: number[]): 'Rising' | 'Falling' | 'Stable' {
  if (vixPrices.length < 5) {
    return 'Stable';
  }

  const recent = vixPrices.slice(-5);
  const early = recent.slice(0, 2);
  const late = recent.slice(-2);
  
  const earlyAvg = early.reduce((sum, val) => sum + val, 0) / early.length;
  const lateAvg = late.reduce((sum, val) => sum + val, 0) / late.length;
  
  const change = (lateAvg - earlyAvg) / earlyAvg;
  
  if (change > 0.05) {
    return 'Rising';
  } else if (change < -0.05) {
    return 'Falling';
  } else {
    return 'Stable';
  }
}