import { Signal } from '../types';

export class GayedSignalCalculator {
  static calculateUtilitiesSignal(xluPrices: number[], spyPrices: number[]): Signal | null {
    const lookback = 21;
    
    // Validate input data
    if (xluPrices.length < lookback + 1 || spyPrices.length < lookback + 1) {
      return null;
    }
    
    // Filter out invalid prices
    const validXluPrices = xluPrices.filter(price => price > 0 && !isNaN(price) && isFinite(price));
    const validSpyPrices = spyPrices.filter(price => price > 0 && !isNaN(price) && isFinite(price));
    
    if (validXluPrices.length < lookback + 1 || validSpyPrices.length < lookback + 1) {
      return null;
    }
    
    // Calculate returns over lookback period
    const xluStart = validXluPrices[validXluPrices.length - 1 - lookback];
    const xluEnd = validXluPrices[validXluPrices.length - 1];
    const spyStart = validSpyPrices[validSpyPrices.length - 1 - lookback];
    const spyEnd = validSpyPrices[validSpyPrices.length - 1];
    
    const xluReturn = (xluEnd / xluStart) - 1;
    const spyReturn = (spyEnd / spyStart) - 1;
    
    // Handle division by zero or near-zero scenarios
    const denominator = 1 + spyReturn;
    if (Math.abs(denominator) < 0.0001) {
      return {
        type: 'utilities_spy',
        signal: 'Neutral',
        strength: 'Weak',
        confidence: 0.1,
        rawValue: 1.0,
        date: new Date().toISOString(),
        metadata: { xluReturn, spyReturn, lookback, reason: 'near_zero_spy_return' }
      };
    }
    
    const ratio = (1 + xluReturn) / denominator;
    
    // Validate ratio
    if (!isFinite(ratio) || isNaN(ratio)) {
      return null;
    }
    
    // Determine signal
    const signal = ratio > 1.0 ? 'Risk-Off' : 'Risk-On';
    
    // Determine strength based on magnitude of ratio deviation from 1.0
    const deviation = Math.abs(ratio - 1.0);
    let strength: 'Strong' | 'Moderate' | 'Weak';
    
    if (deviation > 0.05) {
      strength = 'Strong';
    } else if (deviation > 0.02) {
      strength = 'Moderate';
    } else {
      strength = 'Weak';
    }
    
    // Calculate confidence (0-1 scale)
    const confidence = Math.min(deviation * 10, 1.0);
    
    return {
      type: 'utilities_spy',
      signal,
      strength,
      confidence,
      rawValue: ratio,
      date: new Date().toISOString(),
      metadata: { xluReturn, spyReturn, lookback }
    };
  }
}
