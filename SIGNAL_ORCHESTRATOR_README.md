# Gayed Signals Orchestrator

A comprehensive signal orchestrator that calculates all 5 Michael Gayed market regime signals and generates consensus signals for trading decisions.

## Overview

The SignalOrchestrator combines five different market regime signals developed by Michael Gayed:

1. **Utilities/SPY Signal** - Risk-On/Risk-Off based on utilities relative performance
2. **Lumber/Gold Signal** - Risk-On/Risk-Off based on lumber vs gold performance  
3. **Treasury Curve Signal** - Risk-On/Risk-Off based on 10Y vs 30Y Treasury performance
4. **VIX Defensive Signal** - Counter-intuitive: Low VIX = Risk-Off, High VIX = Risk-On
5. **S&P 500 Moving Average Signal** - Trend-following based on 50/200 day moving averages

## Key Features

- **Comprehensive Signal Calculation**: Calculates all 5 signals simultaneously
- **Consensus Generation**: Combines individual signals into overall market regime assessment
- **Confidence Weighting**: Uses signal strength and confidence for better consensus
- **Error Handling**: Gracefully handles missing data and calculation failures
- **Data Validation**: Validates market data completeness and quality
- **TypeScript Support**: Full type safety and IntelliSense support

## Required Market Data

The orchestrator requires the following market data symbols:

```typescript
const requiredSymbols = [
  'SPY',     // S&P 500 ETF
  'XLU',     // Utilities ETF
  'WOOD',    // Lumber ETF proxy
  'GLD',     // Gold ETF
  'IEF',     // 10-year Treasury ETF
  'TLT',     // 30-year Treasury ETF
  '^VIX'     // VIX volatility index
];
```

## Basic Usage

```typescript
import { SignalOrchestrator } from './lib/signals';
import { MarketData } from './lib/types';

// 1. Get required symbols
const symbols = SignalOrchestrator.getRequiredSymbols();

// 2. Fetch market data (implement your data fetching logic)
const marketData: Record<string, MarketData[]> = {};
// ... populate marketData from your data source

// 3. Validate data completeness
const validation = SignalOrchestrator.validateMarketData(marketData);
if (!validation.isValid) {
  console.log('Missing symbols:', validation.missingSymbols);
}

// 4. Calculate all signals
const signals = SignalOrchestrator.calculateAllSignals(marketData);

// 5. Generate consensus
const consensus = SignalOrchestrator.calculateConsensusSignal(signals);

console.log('Market Regime:', consensus.consensus);
console.log('Confidence:', consensus.confidence);
console.log('Risk-On Count:', consensus.riskOnCount);
console.log('Risk-Off Count:', consensus.riskOffCount);
```

## Signal Types and Interpretation

### Individual Signals

Each signal returns:
- `signal`: 'Risk-On' | 'Risk-Off' | 'Neutral'
- `strength`: 'Strong' | 'Moderate' | 'Weak'
- `confidence`: 0-1 scale
- `rawValue`: Underlying calculation value
- `metadata`: Additional signal-specific information

### Consensus Signal

The consensus combines all individual signals:
- `consensus`: 'Risk-On' | 'Risk-Off' | 'Mixed'
- `confidence`: Overall confidence level (0-1)
- `riskOnCount`: Number of Risk-On signals
- `riskOffCount`: Number of Risk-Off signals
- `signals`: Array of individual signals used

## Signal Methodology

### 1. Utilities/SPY Signal
```
Ratio = (XLU_return_21d + 1) / (SPY_return_21d + 1)
- Ratio > 1.0 → Risk-Off (utilities outperforming)
- Ratio < 1.0 → Risk-On (SPY outperforming)
```

### 2. Lumber/Gold Signal
```
Ratio = (Lumber_91d_return + 1) / (Gold_91d_return + 1)
- Ratio > 1.0 → Risk-On (lumber outperforming)
- Ratio < 1.0 → Risk-Off (gold outperforming)
```

### 3. Treasury Curve Signal
```
Ratio = TY10_total_return / TY30_total_return
- Ratio > 1.0 → Risk-On (10Y outperforming 30Y)
- Ratio < 1.0 → Risk-Off (30Y outperforming 10Y)
```

### 4. VIX Defensive Signal
```
Counter-intuitive logic:
- VIX < 12.5 → Risk-Off (low volatility = defensive)
- VIX ≥ 12.5 → Risk-On (normal volatility = normal allocation)
```

### 5. S&P 500 Moving Average Signal
```
Trend analysis:
- Price > 50MA AND Price > 200MA → Risk-On
- Price < 50MA AND Price < 200MA → Risk-Off
- Mixed conditions → Neutral
```

## Consensus Calculation

The consensus uses confidence-weighted voting:

1. **Signal Weighting**: Each signal weighted by confidence × strength multiplier
2. **Strength Multipliers**: Strong (1.0), Moderate (0.75), Weak (0.5)
3. **Decision Logic**: 
   - Weighted difference < 10% → Mixed
   - Weighted difference ≥ 10% → Directional consensus
   - Weighted difference > 30% → Strong consensus (boosted confidence)

## Error Handling

The orchestrator handles various error conditions:
- Missing market data symbols
- Insufficient historical data
- Invalid or corrupted price data
- Calculation failures in individual signals
- Network timeouts (when fetching data)

## Testing

Run the comprehensive test suite:

```bash
npm test __tests__/signals/signal-orchestrator.test.ts
```

Tests cover:
- Signal calculation with various data scenarios
- Consensus generation logic
- Data validation functionality
- Error handling edge cases
- Performance with large datasets

## Examples

See `examples/signal-orchestrator-usage.ts` for:
- Complete usage workflow
- Mock data generation
- Market regime interpretation
- Specific scenario testing

## Integration Notes

### With Yahoo Finance API
```typescript
import { fetchMarketData } from './lib/yahoo-finance';

const symbols = SignalOrchestrator.getRequiredSymbols();
const marketData = await fetchMarketData(symbols);
const signals = SignalOrchestrator.calculateAllSignals(marketData);
```

### With Dashboard UI
```typescript
// In your React component
const [signals, setSignals] = useState([]);
const [consensus, setConsensus] = useState(null);

useEffect(() => {
  const calculateSignals = async () => {
    const data = await fetchMarketData(symbols);
    const calculatedSignals = SignalOrchestrator.calculateAllSignals(data);
    const consensusSignal = SignalOrchestrator.calculateConsensusSignal(calculatedSignals);
    
    setSignals(calculatedSignals);
    setConsensus(consensusSignal);
  };
  
  calculateSignals();
}, []);
```

## Performance Considerations

- **Data Volume**: Requires 200+ days of history for reliable signals
- **Calculation Speed**: All 5 signals typically calculate in <10ms
- **Memory Usage**: ~1MB per symbol for 1 year of daily data
- **Caching**: Consider caching calculated signals to avoid recalculation

## File Structure

```
lib/signals/
├── index.ts                 # Main SignalOrchestrator class
├── utilities-spy.ts         # Utilities/SPY signal calculator
├── lumber-gold.ts           # Lumber/Gold signal calculator
├── treasury-curve.ts        # Treasury curve signal calculator
├── vix-defensive.ts         # VIX defensive signal calculator
└── sp500-ma.ts             # S&P 500 moving average calculator

__tests__/signals/
└── signal-orchestrator.test.ts  # Comprehensive test suite

examples/
└── signal-orchestrator-usage.ts # Usage examples and demos
```

## Contributing

When adding new signals or modifying existing ones:

1. Update the `Signal` type definition in `types.ts`
2. Add the signal type to the orchestrator's calculation methods
3. Write comprehensive tests for the new functionality
4. Update this README with the new signal methodology
5. Add examples demonstrating the new features

## License

This implementation is based on the research and methodologies developed by Michael Gayed. Please ensure proper attribution when using these signals in production systems.