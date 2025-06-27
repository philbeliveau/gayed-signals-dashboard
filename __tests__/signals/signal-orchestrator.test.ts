import { SignalOrchestrator } from '../../lib/signals';
import { MarketData } from '../../lib/types';

describe('SignalOrchestrator', () => {
  describe('getRequiredSymbols', () => {
    test('should return all required market data symbols', () => {
      const symbols = SignalOrchestrator.getRequiredSymbols();
      
      expect(symbols).toHaveLength(7);
      expect(symbols).toContain('SPY');
      expect(symbols).toContain('XLU');
      expect(symbols).toContain('WOOD');
      expect(symbols).toContain('GLD');
      expect(symbols).toContain('IEF');
      expect(symbols).toContain('TLT');
      expect(symbols).toContain('^VIX');
    });
  });

  describe('validateMarketData', () => {
    test('should identify missing symbols', () => {
      const incompleteData: Record<string, MarketData[]> = {
        'SPY': [
          { date: '2023-01-01', symbol: 'SPY', close: 400 },
          { date: '2023-01-02', symbol: 'SPY', close: 405 }
        ]
      };

      const validation = SignalOrchestrator.validateMarketData(incompleteData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingSymbols).toHaveLength(6);
      expect(validation.missingSymbols).toContain('XLU');
      expect(validation.missingSymbols).toContain('WOOD');
      expect(validation.missingSymbols).toContain('GLD');
    });

    test('should validate complete data set', () => {
      const completeData: Record<string, MarketData[]> = {};
      const symbols = SignalOrchestrator.getRequiredSymbols();
      
      // Create mock data for all symbols
      symbols.forEach(symbol => {
        completeData[symbol] = Array.from({ length: 300 }, (_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
          symbol,
          close: 100 + Math.random() * 10
        }));
      });

      const validation = SignalOrchestrator.validateMarketData(completeData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingSymbols).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    test('should warn about insufficient data', () => {
      const shortData: Record<string, MarketData[]> = {};
      const symbols = SignalOrchestrator.getRequiredSymbols();
      
      // Create short data sets (less than 250 points)
      symbols.forEach(symbol => {
        shortData[symbol] = Array.from({ length: 50 }, (_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
          symbol,
          close: 100 + Math.random() * 10
        }));
      });

      const validation = SignalOrchestrator.validateMarketData(shortData);
      
      expect(validation.isValid).toBe(true); // Data exists but quality warnings
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Insufficient data');
    });
  });

  describe('calculateAllSignals', () => {
    test('should handle empty market data gracefully', () => {
      const emptyData: Record<string, MarketData[]> = {};
      
      const signals = SignalOrchestrator.calculateAllSignals(emptyData);
      
      expect(signals).toHaveLength(5);
      expect(signals.every(signal => signal === null)).toBe(true);
    });

    test('should calculate signals with valid data', () => {
      const validData: Record<string, MarketData[]> = {};
      const symbols = SignalOrchestrator.getRequiredSymbols();
      
      // Create sufficient mock data for all signals
      symbols.forEach(symbol => {
        const basePrice = symbol === '^VIX' ? 15 : 100;
        validData[symbol] = Array.from({ length: 300 }, (_, i) => ({
          date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
          symbol,
          close: basePrice + (Math.sin(i / 10) * 5) + (Math.random() - 0.5) * 2
        }));
      });

      const signals = SignalOrchestrator.calculateAllSignals(validData);
      
      expect(signals).toHaveLength(5);
      
      // At least some signals should be calculated successfully
      const validSignalsCount = signals.filter(signal => signal !== null).length;
      expect(validSignalsCount).toBeGreaterThan(0);
      
      // Check signal properties for non-null signals
      signals.forEach(signal => {
        if (signal !== null) {
          expect(signal).toHaveProperty('type');
          expect(signal).toHaveProperty('signal');
          expect(signal).toHaveProperty('strength');
          expect(signal).toHaveProperty('confidence');
          expect(signal).toHaveProperty('rawValue');
          expect(signal).toHaveProperty('date');
          
          expect(['Risk-On', 'Risk-Off', 'Neutral']).toContain(signal.signal);
          expect(['Strong', 'Moderate', 'Weak']).toContain(signal.strength);
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('calculateConsensusSignal', () => {
    test('should handle empty signals array', () => {
      const consensus = SignalOrchestrator.calculateConsensusSignal([]);
      
      expect(consensus.consensus).toBe('Mixed');
      expect(consensus.confidence).toBe(0.0);
      expect(consensus.riskOnCount).toBe(0);
      expect(consensus.riskOffCount).toBe(0);
      expect(consensus.signals).toHaveLength(0);
    });

    test('should handle all null signals', () => {
      const nullSignals = [null, null, null, null, null];
      
      const consensus = SignalOrchestrator.calculateConsensusSignal(nullSignals);
      
      expect(consensus.consensus).toBe('Mixed');
      expect(consensus.confidence).toBe(0.0);
      expect(consensus.riskOnCount).toBe(0);
      expect(consensus.riskOffCount).toBe(0);
    });

    test('should calculate consensus with mixed signals', () => {
      const mixedSignals = [
        {
          type: 'utilities_spy' as const,
          signal: 'Risk-On' as const,
          strength: 'Strong' as const,
          confidence: 0.8,
          rawValue: 0.95,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold' as const,
          signal: 'Risk-Off' as const,
          strength: 'Moderate' as const,
          confidence: 0.6,
          rawValue: 1.1,
          date: '2023-01-01'
        },
        {
          type: 'treasury_curve' as const,
          signal: 'Risk-On' as const,
          strength: 'Weak' as const,
          confidence: 0.4,
          rawValue: 1.02,
          date: '2023-01-01'
        }
      ];

      const consensus = SignalOrchestrator.calculateConsensusSignal(mixedSignals);
      
      expect(consensus.riskOnCount).toBe(2);
      expect(consensus.riskOffCount).toBe(1);
      expect(consensus.signals).toHaveLength(3);
      expect(consensus.confidence).toBeGreaterThan(0);
      expect(['Risk-On', 'Risk-Off', 'Mixed']).toContain(consensus.consensus);
    });

    test('should calculate strong Risk-On consensus', () => {
      const riskOnSignals = [
        {
          type: 'utilities_spy' as const,
          signal: 'Risk-On' as const,
          strength: 'Strong' as const,
          confidence: 0.9,
          rawValue: 0.85,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold' as const,
          signal: 'Risk-On' as const,
          strength: 'Strong' as const,
          confidence: 0.8,
          rawValue: 1.3,
          date: '2023-01-01'
        },
        {
          type: 'treasury_curve' as const,
          signal: 'Risk-On' as const,
          strength: 'Moderate' as const,
          confidence: 0.7,
          rawValue: 1.05,
          date: '2023-01-01'
        },
        {
          type: 'vix_defensive' as const,
          signal: 'Risk-On' as const,
          strength: 'Strong' as const,
          confidence: 0.8,
          rawValue: 18,
          date: '2023-01-01'
        }
      ];

      const consensus = SignalOrchestrator.calculateConsensusSignal(riskOnSignals);
      
      expect(consensus.consensus).toBe('Risk-On');
      expect(consensus.riskOnCount).toBe(4);
      expect(consensus.riskOffCount).toBe(0);
      expect(consensus.confidence).toBeGreaterThan(0.5);
    });

    test('should calculate strong Risk-Off consensus', () => {
      const riskOffSignals = [
        {
          type: 'utilities_spy' as const,
          signal: 'Risk-Off' as const,
          strength: 'Strong' as const,
          confidence: 0.9,
          rawValue: 1.15,
          date: '2023-01-01'
        },
        {
          type: 'lumber_gold' as const,
          signal: 'Risk-Off' as const,
          strength: 'Strong' as const,
          confidence: 0.8,
          rawValue: 0.7,
          date: '2023-01-01'
        },
        {
          type: 'vix_defensive' as const,
          signal: 'Risk-Off' as const,
          strength: 'Moderate' as const,
          confidence: 0.7,
          rawValue: 10,
          date: '2023-01-01'
        }
      ];

      const consensus = SignalOrchestrator.calculateConsensusSignal(riskOffSignals);
      
      expect(consensus.consensus).toBe('Risk-Off');
      expect(consensus.riskOnCount).toBe(0);
      expect(consensus.riskOffCount).toBe(3);
      expect(consensus.confidence).toBeGreaterThan(0.5);
    });
  });
});