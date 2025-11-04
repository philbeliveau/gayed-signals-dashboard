# Equity Curve Position Shading Issue

## Problem
The equity curve chart is not displaying alternating Risk-On/Risk-Off shaded regions correctly. Instead, the entire chart appears to have a single color shading (light green/blue), indicating the position detection logic is failing.

## Expected Behavior
- **Green shaded regions** (rgba(34, 197, 94, 0.15)) should appear during Risk-On periods
- **Red/Pink shaded regions** (rgba(239, 68, 68, 0.15)) should appear during Risk-Off periods
- Regions should **alternate** as the strategy switches between positions
- Shading should be **behind the equity curve** (layer: 'below')

## Current Behavior
- Entire chart has uniform shading (appears to be light green/blue)
- No alternating regions visible
- Legend shows "Risk-On Period" and "Risk-Off Period" but chart doesn't reflect this

## Affected Files
- `/apps/web/src/domains/backtesting/simple/results/BacktestResults.ts` (lines 89-158)
  - Function: `formatEquityCurve()`
  - Section: "Calculate position shading shapes"

## Technical Details

### Data Structure
The backtest engine produces:
1. **Trades array**: Contains BUY/SELL actions with symbols and dates
2. **Equity curve**: Contains daily portfolio values with `position` field (symbol held that day)

### Current Implementation Approach (v3 - FAILING)
```typescript
// Lines 89-158 in BacktestResults.ts
- Iterates through equityCurve array
- Reads point.position to get symbol held
- Matches symbol against trades to determine if Risk-On (BUY) or Risk-Off (SELL)
- Creates Plotly rect shapes when position type changes
```

### Potential Issues

#### 1. **Trade Pairing Logic**
The backtest engine appears to generate trade pairs:
- SELL (close old position) + BUY (open new position)
- Current logic: `sampleTrade.action === 'BUY'` to determine if Risk-On
- **Issue**: This may not correctly categorize symbols if both BUY and SELL trades exist for the same symbol

#### 2. **Position Field Format**
```typescript
const positionSymbol = point.position;
```
- Unknown if `position` field contains:
  - Just the symbol (e.g., "SPY", "XLU")
  - Position type (e.g., "RISK_ON", "RISK_OFF")
  - Something else entirely
- **Need to verify**: Console log actual `equityCurve` data structure

#### 3. **Symbol Categorization**
```typescript
const sampleTrade = trades.find(t => t.symbol === positionSymbol);
if (sampleTrade) {
  isRiskOn = sampleTrade.action === 'BUY';
}
```
- **Issue**: If a symbol appears in both BUY and SELL trades, `find()` returns first match
- May incorrectly categorize Risk-Off symbols as Risk-On (or vice versa)

#### 4. **CASH Position Handling**
```typescript
if (positionSymbol && positionSymbol !== 'CASH') {
  // categorize position
}
```
- CASH positions are skipped, which might create gaps in shading
- **Need to decide**: Should CASH periods have no shading, or neutral color?

#### 5. **Date Alignment**
```typescript
x0: periodStart,
x1: point.date,
```
- Plotly rect shapes use exact date strings
- **Verify**: Date formats match between equityCurve and Plotly x-axis

## Debugging Steps Needed

### 1. Log Actual Data
Add console logs to see real data structure:
```typescript
console.log('First equity point:', equityCurve[0]);
console.log('First 5 trades:', trades.slice(0, 5));
console.log('Shapes created:', shapes.length, shapes);
```

### 2. Verify Symbol Categorization
Create a lookup map of symbols:
```typescript
// Build symbol -> position type map from config
const riskOnSymbols = new Set([config.riskOnSymbol, 'SPY', 'QQQ']); // known risk-on
const riskOffSymbols = new Set([config.riskOffSymbol, 'XLU', 'GLD']); // known risk-off
```

### 3. Check Shape Generation
```typescript
// After creating shapes array
console.log('Total shapes:', shapes.length);
console.log('Risk-On shapes:', shapes.filter(s => s.fillcolor.includes('34, 197, 94')).length);
console.log('Risk-Off shapes:', shapes.filter(s => s.fillcolor.includes('239, 68, 68')).length);
```

### 4. Inspect Plotly Layout
Verify shapes are actually being passed to Plotly:
```typescript
// In page.tsx when rendering
console.log('Plotly layout.shapes:', result.equityCurve.layout.shapes);
```

## Alternative Approaches to Try

### Option A: Use Signal Value Instead
```typescript
// Use signalValue from equity curve to determine position
const isRiskOn = point.signalValue !== undefined && point.signalValue >= threshold;
```

### Option B: Use Trade Symbols from Config
```typescript
// Import signal config to get definitive symbol categorization
const signalConfig = SIGNAL_CONFIGS[signalType];
const isRiskOn = positionSymbol === signalConfig.riskOnSymbol;
```

### Option C: Track Position State
```typescript
// Maintain position state as we iterate through trades
let currentPosition = 'RISK_ON';
const positionTimeline = [];

for (const trade of trades) {
  if (trade.action === 'BUY') {
    currentPosition = 'RISK_ON';
  } else {
    currentPosition = 'RISK_OFF';
  }
  positionTimeline.push({ date: trade.date, position: currentPosition });
}
```

### Option D: Use Signal Threshold Directly
```typescript
// Compare signal value to threshold on equity curve
if (point.signalValue !== undefined) {
  const isRiskOn = point.signalValue > signalThreshold;
  // Create shapes based on this
}
```

## Previous Failed Attempts

### v1: Trade-by-trade approach
- Created one shape per trade
- **Issue**: Overlapping rectangles, all same color

### v2: Position change detection
- Only created shapes when `nextPosition !== currentPosition`
- **Issue**: Never detected changes, single color throughout

### v3: Equity curve iteration (current)
- Iterates daily equity curve, matches symbols to trades
- **Issue**: Symbol categorization fails, uniform shading

## Files to Review

1. **BacktestResults.ts** - Chart formatting logic
2. **SimpleBacktestEngine.ts** - Trade generation and equity curve creation
3. **types.ts** - Data structure definitions
4. **page.tsx** - Plotly chart rendering

## Success Criteria
- [ ] At least 2 different colored shaded regions visible
- [ ] Green regions correspond to Risk-On ETF holdings
- [ ] Red regions correspond to Risk-Off ETF holdings
- [ ] Shading aligns with trade dates in trade history table
- [ ] Legend correctly identifies region colors

## Priority
**High** - Core visual feature for understanding backtest performance

## Created
2025-01-04

## Status
Open - Investigation needed
