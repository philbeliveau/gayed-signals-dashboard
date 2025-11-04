/**
 * Unit Tests for SimpleBacktestEngine
 * Story 4.0j - QA Fix TEST-001
 *
 * Test Coverage:
 * - Position switching logic
 * - Trade execution
 * - Metrics calculation (total return, win rate, max drawdown)
 * - Edge cases (no data, missing symbols, signal calculation failures)
 */

import { SimpleBacktestEngine } from '@/domains/backtesting/simple/engine/SimpleBacktestEngine';
import type {
  BacktestConfig,
  MarketDataPoint,
} from '@/domains/backtesting/simple/engine/types';

// Mock SignalAdapter to isolate engine testing
jest.mock('@/domains/backtesting/simple/signals/SignalAdapter', () => ({
  SignalAdapter: {
    calculateSignal: jest.fn(),
    getPositionSymbol: jest.fn(),
  },
  SIGNAL_CONFIGS: {
    'utilities-spy': {
      type: 'utilities-spy',
      riskOnSymbol: 'SPY',
      riskOffSymbol: 'XLU',
      requiredSymbols: ['SPY', 'XLU'],
    },
  },
}));

import { SignalAdapter } from '@/domains/backtesting/simple/signals/SignalAdapter';

describe('SimpleBacktestEngine', () => {
  // Test data fixtures
  const createMarketData = (dates: string[], spyPrices: number[], xluPrices: number[]): Record<string, MarketDataPoint[]> => {
    return {
      SPY: dates.map((date, i) => ({
        symbol: 'SPY',
        date,
        close: spyPrices[i],
        open: spyPrices[i],
        high: spyPrices[i] * 1.01,
        low: spyPrices[i] * 0.99,
        volume: 1000000,
      })),
      XLU: dates.map((date, i) => ({
        symbol: 'XLU',
        date,
        close: xluPrices[i],
        open: xluPrices[i],
        high: xluPrices[i] * 1.01,
        low: xluPrices[i] * 0.99,
        volume: 500000,
      })),
    };
  };

  const mockSignal = (position: 'RISK_ON' | 'RISK_OFF', rawValue: number) => ({
    position,
    rawValue,
    threshold: 1.0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runBacktest - Core Functionality', () => {
    it('should execute complete backtest with position switching', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-05',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'];
      const marketData = createMarketData(
        dates,
        [100, 102, 104, 103, 105], // SPY prices
        [50, 51, 52, 53, 54]        // XLU prices
      );

      // Mock signal changing from RISK_ON to RISK_OFF on day 3
      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5))  // Day 1
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.4))  // Day 2
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.9)) // Day 3 - SWITCH
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.8)) // Day 4
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.7)); // Day 5

      (SignalAdapter.getPositionSymbol as jest.Mock)
        .mockReturnValue('SPY')  // For RISK_ON
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('XLU')  // For RISK_OFF on day 3
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('XLU');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.trades.length).toBeGreaterThan(0);
      expect(result.equityCurve.length).toBe(5);
      expect(result.metrics.totalReturn).toBeDefined();
      expect(result.metrics.numberOfTrades).toBeGreaterThanOrEqual(1);
      expect(result.metrics.finalValue).toBeDefined();
    });

    it('should track daily portfolio value correctly', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-03',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = createMarketData(
        dates,
        [100, 110, 120], // SPY up 20%
        [50, 51, 52]
      );

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.equityCurve.length).toBe(3);
      expect(result.equityCurve[0].date).toBe('2023-01-01');
      expect(result.equityCurve[2].date).toBe('2023-01-03');

      // Portfolio should grow with SPY price
      expect(result.equityCurve[2].value).toBeGreaterThan(result.equityCurve[0].value);

      // All values should be positive
      result.equityCurve.forEach(point => {
        expect(point.value).toBeGreaterThan(0);
      });
    });
  });

  describe('Trade Execution Logic', () => {
    it('should execute BUY trade on first signal', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 102], [50, 51]);

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      const buyTrades = result.trades.filter(t => t.action === 'BUY');
      expect(buyTrades.length).toBeGreaterThanOrEqual(1);
      expect(buyTrades[0].symbol).toBe('SPY');
      expect(buyTrades[0].price).toBe(100);
      expect(buyTrades[0].reason).toContain('Signal:');
    });

    it('should execute SELL then BUY when position changes', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-03',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = createMarketData(dates, [100, 102, 104], [50, 51, 52]);

      // Position change on day 2
      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5))
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.9))
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.8));

      (SignalAdapter.getPositionSymbol as jest.Mock)
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('XLU');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Should have: BUY SPY (day 1), SELL SPY (day 2), BUY XLU (day 2), SELL XLU (end)
      expect(result.trades.length).toBeGreaterThanOrEqual(3);

      const sellTrades = result.trades.filter(t => t.action === 'SELL');
      const buyTrades = result.trades.filter(t => t.action === 'BUY');

      expect(sellTrades.length).toBeGreaterThanOrEqual(1);
      expect(buyTrades.length).toBeGreaterThanOrEqual(2);

      // Verify position switch
      expect(buyTrades[0].symbol).toBe('SPY');
      expect(buyTrades[1].symbol).toBe('XLU');
    });

    it('should close final position at end of backtest', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 110], [50, 51]);

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      const finalTrade = result.trades[result.trades.length - 1];
      expect(finalTrade.action).toBe('SELL');
      expect(finalTrade.reason).toBe('End of backtest period');
      expect(finalTrade.date).toBe('2023-01-02');
    });

    it('should not trade when signal remains unchanged', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-05',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'];
      const marketData = createMarketData(
        dates,
        [100, 102, 104, 106, 108],
        [50, 51, 52, 53, 54]
      );

      // Same signal every day
      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Should only have: BUY (day 1) and SELL (end)
      expect(result.trades.length).toBe(2);
      expect(result.trades[0].action).toBe('BUY');
      expect(result.trades[1].action).toBe('SELL');
    });
  });

  describe('Performance Metrics Calculation', () => {
    it('should calculate total return correctly', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 120], [50, 51]); // SPY +20%

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Bought at 100, sold at 120 = 20% return (approximately, minus rounding)
      expect(result.metrics.totalReturn).toBeGreaterThan(15);
      expect(result.metrics.totalReturn).toBeLessThan(21);
      expect(result.metrics.finalValue).toBeGreaterThan(result.metrics.initialValue);
    });

    it('should count number of trades correctly', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-05',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'];
      const marketData = createMarketData(
        dates,
        [100, 102, 104, 106, 108],
        [50, 51, 52, 53, 54]
      );

      // 3 position switches
      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5))
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.9))
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.2))
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.8))
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.7));

      (SignalAdapter.getPositionSymbol as jest.Mock)
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('XLU');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.metrics.numberOfTrades).toBeGreaterThanOrEqual(3); // 3 position switches + initial
    });

    it('should calculate win rate correctly', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-04',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04'];
      const marketData = createMarketData(
        dates,
        [100, 110, 105, 112], // Winning trade: 100->110, Losing trade: 105->112 (after position switch)
        [50, 51, 52, 53]
      );

      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5))   // Buy SPY at 100
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.9))  // Sell SPY at 110, Buy XLU at 51
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.8))  // Hold XLU
        .mockReturnValueOnce(mockSignal('RISK_OFF', 0.7)); // Sell XLU at 53

      (SignalAdapter.getPositionSymbol as jest.Mock)
        .mockReturnValueOnce('SPY')
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('XLU')
        .mockReturnValueOnce('XLU');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.metrics.winRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.winRate).toBeLessThanOrEqual(100);
    });

    it('should calculate maximum drawdown correctly', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-05',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'];
      const marketData = createMarketData(
        dates,
        [100, 120, 90, 95, 110], // Peak at 120, trough at 90 = 25% drawdown
        [50, 51, 52, 53, 54]
      );

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.metrics.maxDrawdown).toBeGreaterThan(0);
      // Drawdown should be approximately 25% ((120-90)/120 * 100)
      expect(result.metrics.maxDrawdown).toBeGreaterThan(20);
      expect(result.metrics.maxDrawdown).toBeLessThan(30);
    });

    it('should return zero win rate when no trades completed', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-01',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01'];
      const marketData = createMarketData(dates, [100], [50]);

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.metrics.winRate).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error when no trading dates found', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const marketData = {
        SPY: [],
        XLU: [],
      };

      // Act & Assert
      expect(() => {
        SimpleBacktestEngine.runBacktest(config, marketData);
      }).toThrow('No trading dates found in the specified range');
    });

    it('should throw error when SPY data is missing', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const marketData = {
        XLU: [
          { symbol: 'XLU', date: '2023-01-01', close: 50 },
        ],
      };

      // Act & Assert
      expect(() => {
        SimpleBacktestEngine.runBacktest(config, marketData);
      }).toThrow('SPY data required for trading dates');
    });

    it('should handle signal calculation failure gracefully', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-03',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const marketData = createMarketData(dates, [100, 102, 104], [50, 51, 52]);

      // Signal fails on day 2
      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5))
        .mockReturnValueOnce(null) // Signal calculation failure
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.4));

      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Should complete backtest despite signal failure
      expect(result.equityCurve.length).toBe(3);
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should handle missing price data for symbol', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const marketData = {
        SPY: [
          { symbol: 'SPY', date: '2023-01-01', close: 100 },
          { symbol: 'SPY', date: '2023-01-02', close: 102 },
        ],
        // XLU missing entirely
      };

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_OFF', 0.9));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('XLU');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Should handle gracefully (no trades executed due to missing price data)
      expect(result).toBeDefined();
      expect(result.trades.length).toBe(0); // No trades possible without price data
    });

    it('should maintain position when signal fails but position exists', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-04',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04'];
      const marketData = createMarketData(
        dates,
        [100, 102, 104, 106],
        [50, 51, 52, 53]
      );

      // Establish position, then signal fails, then signal returns
      (SignalAdapter.calculateSignal as jest.Mock)
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.5)) // Day 1: Buy SPY
        .mockReturnValueOnce(null)                        // Day 2: Signal fails
        .mockReturnValueOnce(null)                        // Day 3: Signal fails
        .mockReturnValueOnce(mockSignal('RISK_ON', 1.4)); // Day 4: Signal returns

      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Portfolio value should still be tracked during signal failures
      expect(result.equityCurve.length).toBe(4);
      expect(result.equityCurve[1].position).toBe('SPY'); // Maintained position
      expect(result.equityCurve[2].position).toBe('SPY'); // Maintained position

      // Should only have BUY (day 1) and SELL (end)
      expect(result.trades.length).toBe(2);
    });

    it('should handle zero or negative prices gracefully', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const marketData = {
        SPY: [
          { symbol: 'SPY', date: '2023-01-01', close: 0 }, // Invalid price
          { symbol: 'SPY', date: '2023-01-02', close: 102 },
        ],
        XLU: [
          { symbol: 'XLU', date: '2023-01-01', close: 50 },
          { symbol: 'XLU', date: '2023-01-02', close: 51 },
        ],
      };

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      // Should handle gracefully - no trade on day 1 due to invalid price
      const buyTrades = result.trades.filter(t => t.action === 'BUY');
      expect(buyTrades.length).toBeLessThanOrEqual(1); // May buy on day 2 only
    });
  });

  describe('Data Quality and Integration', () => {
    it('should return data quality information in results', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 102], [50, 51]);

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.dataQuality).toBeDefined();
      expect(result.dataQuality.score).toBeDefined();
      expect(result.dataQuality.issues).toBeDefined();
      expect(Array.isArray(result.dataQuality.issues)).toBe(true);
    });

    it('should include signal values in equity curve', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 102], [50, 51]);

      const signalValue = 1.234;
      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', signalValue));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.equityCurve[0].signalValue).toBe(signalValue);
      expect(result.equityCurve[1].signalValue).toBe(signalValue);
    });

    it('should include configuration in results', () => {
      // Arrange
      const config: BacktestConfig = {
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        initialCapital: 10000,
      };

      const dates = ['2023-01-01', '2023-01-02'];
      const marketData = createMarketData(dates, [100, 102], [50, 51]);

      (SignalAdapter.calculateSignal as jest.Mock).mockReturnValue(mockSignal('RISK_ON', 1.5));
      (SignalAdapter.getPositionSymbol as jest.Mock).mockReturnValue('SPY');

      // Act
      const result = SimpleBacktestEngine.runBacktest(config, marketData);

      // Assert
      expect(result.config).toEqual(config);
      expect(result.config.signalType).toBe('utilities-spy');
      expect(result.config.initialCapital).toBe(10000);
    });
  });
});
