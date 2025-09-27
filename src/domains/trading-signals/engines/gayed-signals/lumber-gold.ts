import { Signal } from '../../types';

export class LumberGoldSignalCalculator {
  static calculateLumberGoldSignal(lumberPrices: number[], goldPrices: number[]): Signal | null {
    const lookback = 91; // 13-week (91 trading days) lookback period
    
    // Validate input data - need at least 91 + 1 data points
    if (lumberPrices.length < lookback + 1 || goldPrices.length < lookback + 1) {
      return null;
    }
    
    // Filter out invalid prices
    const validLumberPrices = lumberPrices.filter(price => price > 0 && !isNaN(price) && isFinite(price));
    const validGoldPrices = goldPrices.filter(price => price > 0 && !isNaN(price) && isFinite(price));
    
    if (validLumberPrices.length < lookback + 1 || validGoldPrices.length < lookback + 1) {
      return null;
    }
    
    // Calculate returns over 91-day lookback period
    const lumberStart = validLumberPrices[validLumberPrices.length - 1 - lookback];
    const lumberEnd = validLumberPrices[validLumberPrices.length - 1];
    const goldStart = validGoldPrices[validGoldPrices.length - 1 - lookback];
    const goldEnd = validGoldPrices[validGoldPrices.length - 1];
    
    // Handle division by zero scenarios for price ratios
    if (lumberStart <= 0 || goldStart <= 0) {
      return {
        type: 'lumber_gold',
        signal: 'Neutral',
        strength: 'Weak',
        confidence: 0.1,
        rawValue: 1.0,
        date: new Date().toISOString(),
        metadata: { 
          lumberReturn: 0, 
          goldReturn: 0, 
          lookback, 
          reason: 'invalid_start_prices',
          volatilityIndicator: 'unknown'
        }
      };
    }
    
    // Calculate individual asset returns over 13-week period
    const lumberReturn = (lumberEnd / lumberStart) - 1;
    const goldReturn = (goldEnd / goldStart) - 1;
    
    // Calculate performance ratios: (Current/Start) for each asset
    const lumberRatio = lumberEnd / lumberStart;
    const goldRatio = goldEnd / goldStart;
    
    // Handle division by zero for gold ratio
    if (Math.abs(goldRatio) < 0.0001) {
      return {
        type: 'lumber_gold',
        signal: 'Neutral',
        strength: 'Weak',
        confidence: 0.1,
        rawValue: 1.0,
        date: new Date().toISOString(),
        metadata: { 
          lumberReturn, 
          goldReturn, 
          lookback, 
          reason: 'near_zero_gold_ratio',
          volatilityIndicator: 'high'
        }
      };
    }
    
    // Calculate Lumber/Gold ratio: LG_Ratio = (Lumber_t/Lumber_t-91) / (Gold_t/Gold_t-91)
    const lgRatio = lumberRatio / goldRatio;
    
    // Validate ratio
    if (!isFinite(lgRatio) || isNaN(lgRatio)) {
      return null;
    }
    
    // Signal Logic:
    // If Lumber outperforms Gold over 13 weeks (ratio > 1) → Risk-On
    // If Gold outperforms Lumber over 13 weeks (ratio < 1) → Risk-Off
    const signal = lgRatio > 1.0 ? 'Risk-On' : 'Risk-Off';
    
    // Determine strength based on magnitude of ratio deviation from 1.0
    const deviation = Math.abs(lgRatio - 1.0);
    let strength: 'Strong' | 'Moderate' | 'Weak';
    
    // Adjusted thresholds for lumber-gold volatility characteristics
    if (deviation > 0.15) {
      strength = 'Strong';
    } else if (deviation > 0.05) {
      strength = 'Moderate';
    } else {
      strength = 'Weak';
    }
    
    // Calculate confidence (0-1 scale) based on magnitude of divergence
    // Higher confidence for larger divergences from 1.0
    const confidence = Math.min(deviation * 5, 1.0);
    
    // Determine volatility indicator based on historical context
    // Lumber leading: ~13.5% average SPY volatility
    // Gold leading: ~19.4% average SPY volatility
    const volatilityIndicator = signal === 'Risk-On' ? 'low' : 'high';
    const expectedVolatility = signal === 'Risk-On' ? 13.5 : 19.4;
    
    return {
      type: 'lumber_gold',
      signal,
      strength,
      confidence,
      rawValue: lgRatio,
      date: new Date().toISOString(),
      metadata: { 
        lumberReturn,
        goldReturn,
        lumberRatio,
        goldRatio,
        lookback,
        volatilityIndicator,
        expectedSpyVolatility: expectedVolatility,
        deviation,
        marketRegime: signal === 'Risk-On' ? 'lumber_leading' : 'gold_leading'
      }
    };
  }
}