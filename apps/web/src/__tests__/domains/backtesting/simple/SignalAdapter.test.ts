/**
 * Unit Tests for SignalAdapter
 * Story 4.0j - QA Fix TEST-002
 *
 * Test Coverage:
 * - Signal calculation for all 5 Gayed signals
 * - Position mapping (RISK_ON/RISK_OFF)
 * - getAllRequiredSymbols helper
 * - Edge cases (missing data, invalid signal types)
 */

import { SignalAdapter, SIGNAL_CONFIGS } from '@/domains/backtesting/simple/signals/SignalAdapter';
import type {
  MarketDataPoint,
  SignalType,
} from '@/domains/backtesting/simple/engine/types';

// Mock all signal calculators
jest.mock('@/domains/trading-signals/engines/gayed-signals/utilities-spy');
jest.mock('@/domains/trading-signals/engines/gayed-signals/lumber-gold');
jest.mock('@/domains/trading-signals/engines/gayed-signals/treasury-curve');
jest.mock('@/domains/trading-signals/engines/gayed-signals/sp500-ma');
jest.mock('@/domains/trading-signals/engines/gayed-signals/vix-defensive');

import { GayedSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/utilities-spy';
import { LumberGoldSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/lumber-gold';
import { TreasuryCurveSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/treasury-curve';
import { SP500MovingAverageSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/sp500-ma';
import { VixDefensiveSignalCalculator } from '@/domains/trading-signals/engines/gayed-signals/vix-defensive';

describe('SignalAdapter', () => {
  // Test data fixtures
  const createMarketDataPoints = (symbol: string, dates: string[], prices: number[]): MarketDataPoint[] => {
    return dates.map((date, i) => ({
      symbol,
      date,
      close: prices[i],
      open: prices[i],
      high: prices[i] * 1.01,
      low: prices[i] * 0.99,
      volume: 1000000,
    }));
  };

  const mockCalculatorResponse = (signal: 'Risk-On' | 'Risk-Off' | 'Neutral', rawValue: number, confidence: number) => ({
    signal,
    rawValue,
    confidence,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SIGNAL_CONFIGS', () => {
    it('should have configuration for all 5 signal types', () => {
      expect(Object.keys(SIGNAL_CONFIGS)).toHaveLength(5);
      expect(SIGNAL_CONFIGS['utilities-spy']).toBeDefined();
      expect(SIGNAL_CONFIGS['lumber-gold']).toBeDefined();
      expect(SIGNAL_CONFIGS['treasury-curve']).toBeDefined();
      expect(SIGNAL_CONFIGS['sp500-ma']).toBeDefined();
      expect(SIGNAL_CONFIGS['vix-defensive']).toBeDefined();
    });

    it('should have correct Risk-On/Risk-Off symbols for each signal', () => {
      // Utilities/SPY
      expect(SIGNAL_CONFIGS['utilities-spy'].riskOnSymbol).toBe('SPY');
      expect(SIGNAL_CONFIGS['utilities-spy'].riskOffSymbol).toBe('XLU');

      // Lumber/Gold
      expect(SIGNAL_CONFIGS['lumber-gold'].riskOnSymbol).toBe('SPY');
      expect(SIGNAL_CONFIGS['lumber-gold'].riskOffSymbol).toBe('GLD');

      // Treasury Curve
      expect(SIGNAL_CONFIGS['treasury-curve'].riskOnSymbol).toBe('SPY');
      expect(SIGNAL_CONFIGS['treasury-curve'].riskOffSymbol).toBe('TLT');

      // SP500 MA
      expect(SIGNAL_CONFIGS['sp500-ma'].riskOnSymbol).toBe('SPY');
      expect(SIGNAL_CONFIGS['sp500-ma'].riskOffSymbol).toBe('IEF');

      // VIX Defensive
      expect(SIGNAL_CONFIGS['vix-defensive'].riskOnSymbol).toBe('SPY');
      expect(SIGNAL_CONFIGS['vix-defensive'].riskOffSymbol).toBe('TLT');
    });

    it('should have correct required symbols for each signal', () => {
      expect(SIGNAL_CONFIGS['utilities-spy'].requiredSymbols).toEqual(['SPY', 'XLU']);
      expect(SIGNAL_CONFIGS['lumber-gold'].requiredSymbols).toEqual(['WOOD', 'GLD']);
      expect(SIGNAL_CONFIGS['treasury-curve'].requiredSymbols).toEqual(['IEF', 'TLT']);
      expect(SIGNAL_CONFIGS['sp500-ma'].requiredSymbols).toEqual(['SPY']);
      expect(SIGNAL_CONFIGS['vix-defensive'].requiredSymbols).toEqual(['VIXY']);
    });
  });

  describe('calculateSignal - Utilities/SPY', () => {
    it('should calculate Risk-On signal correctly', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102, 104]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51, 52]),
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 1.5, 0.95)
      );

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-03');

      // Assert
      expect(result).toBeDefined();
      expect(result?.position).toBe('RISK_ON');
      expect(result?.rawValue).toBe(1.5);
      expect(result?.confidence).toBe(0.95);
      expect(result?.date).toBe('2023-01-03');

      // Verify calculator called with correct data
      expect(GayedSignalCalculator.calculateUtilitiesSignal).toHaveBeenCalledWith(
        [50, 51, 52], // XLU prices
        [100, 102, 104] // SPY prices
      );
    });

    it('should calculate Risk-Off signal correctly', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102, 104]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51, 52]),
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-Off', 0.8, 0.92)
      );

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-03');

      // Assert
      expect(result?.position).toBe('RISK_OFF');
    });

    it('should map Neutral signal to Risk-On', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51]),
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Neutral', 1.0, 0.5)
      );

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-02');

      // Assert
      expect(result?.position).toBe('RISK_ON');
    });
  });

  describe('calculateSignal - Lumber/Gold', () => {
    it('should calculate signal using lumber and gold data', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        WOOD: createMarketDataPoints('WOOD', dates, [80, 82]),
        GLD: createMarketDataPoints('GLD', dates, [170, 172]),
      };

      (LumberGoldSignalCalculator.calculateLumberGoldSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 1.3, 0.88)
      );

      // Act
      const result = SignalAdapter.calculateSignal('lumber-gold', marketData, '2023-01-02');

      // Assert
      expect(result?.position).toBe('RISK_ON');
      expect(LumberGoldSignalCalculator.calculateLumberGoldSignal).toHaveBeenCalledWith(
        [80, 82], // WOOD prices
        [170, 172] // GLD prices
      );
    });
  });

  describe('calculateSignal - Treasury Curve', () => {
    it('should calculate signal using IEF and TLT data', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        IEF: createMarketDataPoints('IEF', dates, [95, 96]),
        TLT: createMarketDataPoints('TLT', dates, [90, 91]),
      };

      (TreasuryCurveSignalCalculator.calculateTreasuryCurveSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-Off', 0.75, 0.91)
      );

      // Act
      const result = SignalAdapter.calculateSignal('treasury-curve', marketData, '2023-01-02');

      // Assert
      expect(result?.position).toBe('RISK_OFF');
      expect(TreasuryCurveSignalCalculator.calculateTreasuryCurveSignal).toHaveBeenCalledWith(
        [95, 96], // IEF prices
        [90, 91]  // TLT prices
      );
    });
  });

  describe('calculateSignal - SP500 Moving Average', () => {
    it('should calculate signal using only SPY data', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [400, 405, 410]),
      };

      (SP500MovingAverageSignalCalculator.calculateSP500MASignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 410, 0.97)
      );

      // Act
      const result = SignalAdapter.calculateSignal('sp500-ma', marketData, '2023-01-03');

      // Assert
      expect(result?.position).toBe('RISK_ON');
      expect(SP500MovingAverageSignalCalculator.calculateSP500MASignal).toHaveBeenCalledWith(
        [400, 405, 410] // SPY prices
      );
    });
  });

  describe('calculateSignal - VIX Defensive', () => {
    it('should calculate signal using VIXY data', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        VIXY: createMarketDataPoints('VIXY', dates, [15, 14]),
      };

      (VixDefensiveSignalCalculator.calculateVixDefensiveSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 14, 0.89)
      );

      // Act
      const result = SignalAdapter.calculateSignal('vix-defensive', marketData, '2023-01-02');

      // Assert
      expect(result?.position).toBe('RISK_ON');
      expect(VixDefensiveSignalCalculator.calculateVixDefensiveSignal).toHaveBeenCalledWith(
        [15, 14] // VIXY prices
      );
    });
  });

  describe('calculateSignal - Data Filtering', () => {
    it('should only use data up to specified date', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102, 104, 106]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51, 52, 53]),
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 1.5, 0.95)
      );

      // Act - Calculate for 2023-01-03 (should exclude 2023-01-04)
      SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-03');

      // Assert - Should only use first 3 dates
      expect(GayedSignalCalculator.calculateUtilitiesSignal).toHaveBeenCalledWith(
        [50, 51, 52], // XLU prices (first 3 only)
        [100, 102, 104] // SPY prices (first 3 only)
      );
    });

    it('should handle data with gaps correctly', () => {
      // Arrange - Missing middle date
      const marketData = {
        SPY: [
          { symbol: 'SPY', date: '2023-01-01', close: 100 },
          // Missing 2023-01-02
          { symbol: 'SPY', date: '2023-01-03', close: 104 },
        ],
        XLU: [
          { symbol: 'XLU', date: '2023-01-01', close: 50 },
          // Missing 2023-01-02
          { symbol: 'XLU', date: '2023-01-03', close: 52 },
        ],
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 1.5, 0.95)
      );

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-03');

      // Assert - Should use both available dates
      expect(result).toBeDefined();
      expect(GayedSignalCalculator.calculateUtilitiesSignal).toHaveBeenCalledWith(
        [50, 52],
        [100, 104]
      );
    });
  });

  describe('calculateSignal - Edge Cases', () => {
    it('should return null when required symbol data is missing', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102]),
        // XLU missing
      };

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-02');

      // Assert
      expect(result).toBeNull();
      expect(GayedSignalCalculator.calculateUtilitiesSignal).not.toHaveBeenCalled();
    });

    it('should return null when no price data exists before target date', () => {
      // Arrange
      const marketData = {
        SPY: createMarketDataPoints('SPY', ['2023-01-05'], [100]),
        XLU: createMarketDataPoints('XLU', ['2023-01-05'], [50]),
      };

      // Act - Query for date before any data exists
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-01');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when calculator returns null', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51]),
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(null);

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-02');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for unknown signal type', () => {
      // Arrange
      const dates = ['2023-01-01'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100]),
      };

      // Act & Assert
      expect(() => {
        SignalAdapter.calculateSignal('invalid-signal' as SignalType, marketData, '2023-01-01');
      }).toThrow('Unknown signal type: invalid-signal');
    });
  });

  describe('getPositionSymbol', () => {
    it('should return Risk-On symbol for RISK_ON position', () => {
      expect(SignalAdapter.getPositionSymbol('utilities-spy', 'RISK_ON')).toBe('SPY');
      expect(SignalAdapter.getPositionSymbol('lumber-gold', 'RISK_ON')).toBe('SPY');
      expect(SignalAdapter.getPositionSymbol('treasury-curve', 'RISK_ON')).toBe('SPY');
      expect(SignalAdapter.getPositionSymbol('sp500-ma', 'RISK_ON')).toBe('SPY');
      expect(SignalAdapter.getPositionSymbol('vix-defensive', 'RISK_ON')).toBe('SPY');
    });

    it('should return Risk-Off symbol for RISK_OFF position', () => {
      expect(SignalAdapter.getPositionSymbol('utilities-spy', 'RISK_OFF')).toBe('XLU');
      expect(SignalAdapter.getPositionSymbol('lumber-gold', 'RISK_OFF')).toBe('GLD');
      expect(SignalAdapter.getPositionSymbol('treasury-curve', 'RISK_OFF')).toBe('TLT');
      expect(SignalAdapter.getPositionSymbol('sp500-ma', 'RISK_OFF')).toBe('IEF');
      expect(SignalAdapter.getPositionSymbol('vix-defensive', 'RISK_OFF')).toBe('TLT');
    });
  });

  describe('getAllRequiredSymbols', () => {
    it('should return all symbols needed for utilities-spy signal', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('utilities-spy');
      expect(symbols).toContain('SPY');
      expect(symbols).toContain('XLU');
      expect(symbols.length).toBe(2);
    });

    it('should return all symbols needed for lumber-gold signal', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('lumber-gold');
      expect(symbols).toContain('WOOD');
      expect(symbols).toContain('GLD');
      expect(symbols).toContain('SPY'); // Risk-On symbol
      expect(symbols.length).toBeGreaterThanOrEqual(3);
    });

    it('should return all symbols needed for treasury-curve signal', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('treasury-curve');
      expect(symbols).toContain('IEF');
      expect(symbols).toContain('TLT');
      expect(symbols).toContain('SPY'); // Risk-On symbol
      expect(symbols.length).toBeGreaterThanOrEqual(3);
    });

    it('should return all symbols needed for sp500-ma signal', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('sp500-ma');
      expect(symbols).toContain('SPY');
      expect(symbols).toContain('IEF'); // Risk-Off symbol
      expect(symbols.length).toBeGreaterThanOrEqual(2);
    });

    it('should return all symbols needed for vix-defensive signal', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('vix-defensive');
      expect(symbols).toContain('VIXY');
      expect(symbols).toContain('SPY'); // Risk-On symbol
      expect(symbols).toContain('TLT'); // Risk-Off symbol
      expect(symbols.length).toBeGreaterThanOrEqual(3);
    });

    it('should not include duplicate symbols', () => {
      const symbols = SignalAdapter.getAllRequiredSymbols('utilities-spy');
      const uniqueSymbols = [...new Set(symbols)];
      expect(symbols.length).toBe(uniqueSymbols.length);
    });
  });

  describe('Integration with Calculator Results', () => {
    it('should preserve signal metadata from calculator', () => {
      // Arrange
      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100, 102]),
        XLU: createMarketDataPoints('XLU', dates, [50, 51]),
      };

      const calculatorResult = {
        signal: 'Risk-On' as const,
        rawValue: 1.2345,
        confidence: 0.9876,
      };

      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(calculatorResult);

      // Act
      const result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-02');

      // Assert
      expect(result?.rawValue).toBe(1.2345);
      expect(result?.confidence).toBe(0.9876);
    });

    it('should handle all three signal directions from calculator', () => {
      const dates = ['2023-01-01'];
      const marketData = {
        SPY: createMarketDataPoints('SPY', dates, [100]),
        XLU: createMarketDataPoints('XLU', dates, [50]),
      };

      // Test Risk-On
      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-On', 1.5, 0.95)
      );
      let result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-01');
      expect(result?.position).toBe('RISK_ON');

      // Test Risk-Off
      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Risk-Off', 0.8, 0.92)
      );
      result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-01');
      expect(result?.position).toBe('RISK_OFF');

      // Test Neutral (maps to Risk-On)
      (GayedSignalCalculator.calculateUtilitiesSignal as jest.Mock).mockReturnValue(
        mockCalculatorResponse('Neutral', 1.0, 0.5)
      );
      result = SignalAdapter.calculateSignal('utilities-spy', marketData, '2023-01-01');
      expect(result?.position).toBe('RISK_ON');
    });
  });
});
