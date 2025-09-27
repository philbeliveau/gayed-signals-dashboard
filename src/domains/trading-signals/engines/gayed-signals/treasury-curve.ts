import { Signal } from '../../types';

export class TreasuryCurveSignalCalculator {
  /**
   * Calculate Treasury Curve Signal based on Michael Gayed's methodology
   * Formula: Treasury_Signal = (TY10_Total_Return_t / TY10_Total_Return_t-n) / (TY30_Total_Return_t / TY30_Total_Return_t-n)
   * 
   * Signal Logic:
   * - 10Y outperforming 30Y (ratio > 1.0) → Risk-On (overweight equities)
   * - 30Y outperforming 10Y (ratio < 1.0) → Risk-Off (underweight equities)
   * 
   * @param ty10Prices Array of 10-year Treasury prices (most recent last)
   * @param ty30Prices Array of 30-year Treasury prices (most recent last)
   * @param lookback Lookback period in days (default: 21)
   * @returns Signal object or null if insufficient data
   */
  static calculateTreasuryCurveSignal(
    ty10Prices: number[], 
    ty30Prices: number[], 
    lookback: number = 21
  ): Signal | null {
    // Validate input data length
    if (ty10Prices.length < lookback + 1 || ty30Prices.length < lookback + 1) {
      return null;
    }

    // Validate lookback period
    if (lookback <= 0) {
      return null;
    }

    // Filter out invalid prices and ensure arrays are the same length
    const minLength = Math.min(ty10Prices.length, ty30Prices.length);
    const validTy10Prices = ty10Prices.slice(-minLength).filter(price => price > 0 && !isNaN(price) && isFinite(price));
    const validTy30Prices = ty30Prices.slice(-minLength).filter(price => price > 0 && !isNaN(price) && isFinite(price));

    if (validTy10Prices.length < lookback + 1 || validTy30Prices.length < lookback + 1) {
      return null;
    }

    // Calculate total returns over lookback period
    const ty10Start = validTy10Prices[validTy10Prices.length - 1 - lookback];
    const ty10End = validTy10Prices[validTy10Prices.length - 1];
    const ty30Start = validTy30Prices[validTy30Prices.length - 1 - lookback];
    const ty30End = validTy30Prices[validTy30Prices.length - 1];

    // Calculate total returns (price-based returns as proxy for total returns)
    const ty10TotalReturn = (ty10End / ty10Start);
    const ty30TotalReturn = (ty30End / ty30Start);

    // Handle division by zero or near-zero scenarios
    if (Math.abs(ty30TotalReturn) < 0.0001) {
      return {
        type: 'treasury_curve',
        signal: 'Neutral',
        strength: 'Weak',
        confidence: 0.1,
        rawValue: 1.0,
        date: new Date().toISOString(),
        metadata: { 
          ty10TotalReturn, 
          ty30TotalReturn, 
          lookback, 
          reason: 'near_zero_ty30_return',
          curveSlope: 0,
          ty10Return: (ty10TotalReturn - 1),
          ty30Return: (ty30TotalReturn - 1)
        }
      };
    }

    // Apply Michael Gayed's Treasury Curve Signal formula
    const treasurySignalRatio = ty10TotalReturn / ty30TotalReturn;

    // Validate ratio
    if (!isFinite(treasurySignalRatio) || isNaN(treasurySignalRatio)) {
      return null;
    }

    // Determine signal based on Gayed's methodology
    let signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
    if (treasurySignalRatio > 1.005) {
      // 10Y outperforming 30Y → Risk-On
      signal = 'Risk-On';
    } else if (treasurySignalRatio < 0.995) {
      // 30Y outperforming 10Y → Risk-Off
      signal = 'Risk-Off';
    } else {
      // Near equal performance → Neutral
      signal = 'Neutral';
    }

    // Calculate strength based on magnitude of ratio deviation from 1.0
    const deviation = Math.abs(treasurySignalRatio - 1.0);
    let strength: 'Strong' | 'Moderate' | 'Weak';

    if (deviation > 0.02) {
      strength = 'Strong';
    } else if (deviation > 0.01) {
      strength = 'Moderate';
    } else {
      strength = 'Weak';
    }

    // Calculate confidence based on signal clarity and curve dynamics
    let confidence = Math.min(deviation * 50, 1.0); // Scale deviation to 0-1

    // Adjust confidence based on market conditions
    const ty10Return = ty10TotalReturn - 1;
    const ty30Return = ty30TotalReturn - 1;
    const returnSpread = Math.abs(ty10Return - ty30Return);
    
    // Higher confidence when there's clear divergence between bonds
    if (returnSpread > 0.01) {
      confidence = Math.min(confidence * 1.2, 1.0);
    }

    // Calculate yield curve steepness proxy (return differential)
    const curveSlope = ty30Return - ty10Return;

    // Handle extreme market conditions (flight to quality scenarios)
    if (Math.abs(ty10Return) > 0.05 || Math.abs(ty30Return) > 0.05) {
      // Large moves in Treasuries suggest heightened volatility
      if (signal === 'Risk-Off') {
        confidence = Math.min(confidence * 1.3, 1.0); // Higher confidence in risk-off during stress
      }
    }

    return {
      type: 'treasury_curve',
      signal,
      strength,
      confidence: Math.max(0.1, confidence), // Minimum confidence of 0.1
      rawValue: treasurySignalRatio,
      date: new Date().toISOString(),
      metadata: {
        ty10TotalReturn,
        ty30TotalReturn,
        ty10Return,
        ty30Return,
        returnSpread,
        curveSlope,
        lookback,
        deviation,
        treasurySignalFormula: 'TY10_Return / TY30_Return'
      }
    };
  }
}