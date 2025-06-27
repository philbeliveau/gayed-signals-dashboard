import { GayedSignalCalculator } from '../../lib/signals/utilities-spy';

describe('UtilitiesSPYSignalCalculator', () => {
  describe('calculateUtilitiesSignal', () => {
    test('should return null when insufficient XLU data', () => {
      const xluPrices = [50, 51, 52]; // Only 3 data points
      const spyPrices = Array.from({length: 22}, (_, i) => 400 + i);
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      expect(result).toBeNull();
    });

    test('should return null when insufficient SPY data', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => 50 + i);
      const spyPrices = [400, 401]; // Only 2 data points
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      expect(result).toBeNull();
    });

    test('should calculate Risk-Off signal when utilities outperform SPY', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => 50 + (i * 0.2)); // Steady uptrend
      const spyPrices = Array.from({length: 22}, (_, i) => 400 + (i * 0.1)); // Slower uptrend
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      expect(result).not.toBeNull();
      expect(result!.signal).toBe('Risk-Off');
      expect(result!.type).toBe('utilities_spy');
      expect(result!.rawValue).toBeGreaterThan(1.0);
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });

    test('should calculate Risk-On signal when SPY outperforms utilities', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => 50 + (i * 0.1)); // Slow growth
      const spyPrices = Array.from({length: 22}, (_, i) => 400 + (i * 0.3)); // Strong growth
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      expect(result).not.toBeNull();
      expect(result!.signal).toBe('Risk-On');
      expect(result!.rawValue).toBeLessThan(1.0);
    });

    test('should handle division by zero scenario', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => 50 + i);
      const spyPrices = Array.from({length: 22}, () => 400); // No change = 0 return
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      if (result !== null) {
        expect(result.rawValue).not.toBe(Infinity);
        expect(result.rawValue).not.toBe(NaN);
      }
    });

    test('should handle negative prices gracefully', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => i === 10 ? -50 : 50 + i);
      const spyPrices = Array.from({length: 22}, (_, i) => 400 + i);
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      if (result !== null) {
        expect(result.rawValue).not.toBe(NaN);
        expect(result.rawValue).toBeGreaterThan(0);
      }
    });

    test('should return proper signal structure', () => {
      const xluPrices = Array.from({length: 22}, (_, i) => 50 + i);
      const spyPrices = Array.from({length: 22}, (_, i) => 400 + i);
      
      const result = GayedSignalCalculator.calculateUtilitiesSignal(xluPrices, spyPrices);
      
      expect(result).toMatchObject({
        type: 'utilities_spy',
        signal: expect.stringMatching(/^(Risk-On|Risk-Off|Neutral)$/),
        strength: expect.stringMatching(/^(Strong|Moderate|Weak)$/),
        confidence: expect.any(Number),
        rawValue: expect.any(Number),
        date: expect.any(String),
        metadata: expect.objectContaining({
          xluReturn: expect.any(Number),
          spyReturn: expect.any(Number),
          lookback: 21
        })
      });
    });
  });
});
