# Handoff: Flexible Signal Index Selection - Simple Development Task

## Context

The simple backtesting platform (`/backtest-simple`) currently uses **hardcoded index mappings** for each Gayed signal type. Users cannot customize which indexes (ETFs) to use for their backtests.

**Assessment**: This is a **simple frontend development task** (~15-30 minutes implementation), not a complex product story. The solution is straightforward: add two dropdown fields to let users select custom Risk-On and Risk-Off symbols.

### Current Implementation

From `SignalAdapter.ts` (lines 20-51), each signal type has fixed Risk-On and Risk-Off symbols:

```typescript
export const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
  'utilities-spy': {
    type: 'utilities-spy',
    riskOnSymbol: 'SPY',      // FIXED - can't change
    riskOffSymbol: 'XLU',     // FIXED - can't change
    requiredSymbols: ['SPY', 'XLU'],
  },
  'lumber-gold': {
    type: 'lumber-gold',
    riskOnSymbol: 'SPY',      // FIXED - can't change
    riskOffSymbol: 'GLD',     // FIXED - can't change
    requiredSymbols: ['WOOD', 'GLD'],
  },
  'treasury-curve': {
    type: 'treasury-curve',
    riskOnSymbol: 'SPY',      // FIXED - can't change
    riskOffSymbol: 'TLT',     // FIXED - can't change
    requiredSymbols: ['IEF', 'TLT'],
  },
  'sp500-ma': {
    type: 'sp500-ma',
    riskOnSymbol: 'SPY',      // FIXED - can't change
    riskOffSymbol: 'IEF',     // FIXED - can't change
    requiredSymbols: ['SPY'],
  },
  'vix-defensive': {
    type: 'vix-defensive',
    riskOnSymbol: 'SPY',      // FIXED - can't change
    riskOffSymbol: 'TLT',     // FIXED - can't change
    requiredSymbols: ['VIXY'],
  },
};
```

### Problem Statement

Users want to test the same signal logic with **different indexes** to:
- Compare performance across different market exposures
- Test defensive strategies with different safe-haven assets
- Customize risk-on positions (e.g., QQQ instead of SPY)
- Test international indexes
- Use leveraged or inverse ETFs

**Example Use Cases:**
1. "I want to test Utilities/SPY signal but use QQQ (Nasdaq) as risk-on instead of SPY"
2. "I want to test with TLT (long-term treasuries) vs IEF (intermediate treasuries) as risk-off"
3. "I want to backtest with international indexes (EFA, EEM) instead of US markets"
4. "I want to test leveraged versions (UPRO, TMF) to see amplified results"

## Quick Implementation Guide

This is a **simple development task** that can be implemented directly without a full product story.

### Estimated Effort
- **Complexity**: Small (XS)
- **Time**: 15-30 minutes
- **Files to Change**: 3 files
- **Testing**: Manual testing only

### Implementation Steps

**Step 1: Add Fields to Form (5 minutes)**
- File: `apps/web/src/app/backtest-simple/page.tsx`
- Add two new dropdown fields after "Signal Type"
- Dropdowns show common ETFs with categories

**Step 2: Update Types (2 minutes)**
- File: `apps/web/src/app/backtest-simple/page.tsx`
- Add `riskOnSymbol?: string` and `riskOffSymbol?: string` to `BacktestRequest` interface
- Add same fields to component state

**Step 3: Update Backend (5 minutes)**
- File: `apps/web/src/app/api/backtest-simple/route.ts`
- Accept optional `riskOnSymbol` and `riskOffSymbol` in request
- Pass through to backtest engine

**Step 4: Update Signal Adapter (5 minutes)**
- File: `apps/web/src/domains/backtesting/simple/signals/SignalAdapter.ts`
- Modify `getPositionSymbol()` to accept custom symbols
- Add validation for symbol availability

**Step 5: Test (10 minutes)**
- Test default behavior (should work as before)
- Test custom symbols (QQQ, TLT, etc.)
- Test mobile responsiveness

### Acceptance Criteria

✅ User can select custom Risk-On symbol (defaults to signal's standard)
✅ User can select custom Risk-Off symbol (defaults to signal's standard)
✅ Dropdowns show common ETF options organized by category
✅ Default behavior unchanged (if no custom symbols selected)
✅ Works on mobile devices
✅ Invalid symbols show error message
✅ Custom symbols work with all 5 signal types

## Recommended Design: Simple Inline Dropdowns

Add two dropdown fields directly in the form (Option 1 - simplest):

```
┌─────────────────────────────────────────────────┐
│ Signal Type                                     │
│ [Utilities/SPY Signal ▼]                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Risk-On Symbol (optional - defaults to SPY)    │
│ [SPY ▼]                                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Risk-Off Symbol (optional - defaults to XLU)   │
│ [XLU ▼]                                         │
└─────────────────────────────────────────────────┘
```

**Why This Approach:**
- ✅ Simplest to implement (15-30 min)
- ✅ No extra clicks/modals needed
- ✅ Clear and discoverable
- ✅ Works well on mobile (already responsive grid)
- ✅ No state management complexity

**Alternative Approaches (For Future):**
- Advanced Settings Modal (cleaner but requires more dev time)
- Saved Presets (nice-to-have, out of scope for simple task)

### Common ETF Options (Dropdown Content)

Organize by category for better UX:

**US Equity (Risk-On):**
- SPY - S&P 500
- QQQ - Nasdaq 100
- IWM - Russell 2000
- DIA - Dow Jones

**Defensive (Risk-Off):**
- XLU - Utilities
- TLT - 20+ Year Treasury
- IEF - 7-10 Year Treasury
- GLD - Gold

**Sectors:**
- XLF - Financials
- XLE - Energy
- XLK - Technology
- XLV - Healthcare

**International:**
- EFA - Developed Markets
- EEM - Emerging Markets

**Leveraged (Advanced):**
- UPRO - 3x S&P 500
- TMF - 3x 20+ Year Treasury

### Validation Requirements

- **Symbol validation**: Ensure indexes exist in Railway backend data
- **Date range validation**: Verify data availability for selected period
- **Default fallback**: Show warning if custom symbol has insufficient data
- **Error handling**: Clear error message if backtest fails due to missing data

## Key Files to Reference

### Current Implementation
- `/apps/web/src/domains/backtesting/simple/signals/SignalAdapter.ts` - Signal configuration (lines 20-51, 188-204)
- `/apps/web/src/app/backtest-simple/page.tsx` - UI form (lines 131-190)
- `/apps/web/src/domains/backtesting/simple/engine/types.ts` - Type definitions
- `/apps/web/src/app/api/backtest-simple/route.ts` - Backend API endpoint

### Related Documentation
- `docs/stories/4.0j.simple-gayed-backtesting.md` - Original backtesting story
- `docs/stories/4.0h.frontend-railway-integration.md` - Railway backend integration
- `CLAUDE.md` - Platform architecture and constraints

## Technical Notes

### Railway Backend Integration
- **Railway Backend URL**: `https://gayed-backend-production.up.railway.app`
- **Endpoint**: `/api/v2/market-data` (for backtesting historical data)
- Railway backend already supports fetching **any symbol** from multiple data sources:
  - Yahoo Finance (primary, free)
  - Tiingo API (fallback, premium data)
  - Alpha Vantage (fallback)
  - FRED API (economic/treasury data)
- No backend changes needed - just pass custom symbols through
- Data validation happens automatically via UnifiedDataService
- Quality score enforcement (minimum 0.8) already in place
- Data is cached in Redis and persisted in PostgreSQL

### Signal Calculator Compatibility
- Signal calculators accept any symbol arrays
- No hardcoded assumptions in calculation logic
- Just need to pass custom symbols to existing functions

## Out of Scope (Future Enhancements)

These features are **excluded** from the initial simple implementation:
- Saved preset management/sharing
- Batch backtesting multiple configurations
- Advanced symbol search/autocomplete
- Custom signal formula creation
- Transaction cost modeling per symbol

## Code Example

Here's what the implementation looks like:

```typescript
// page.tsx - Add to BacktestRequest interface
interface BacktestRequest {
  signalType: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  fastMode?: boolean;
  riskOnSymbol?: string;   // NEW
  riskOffSymbol?: string;  // NEW
}

// page.tsx - Add to form (after Signal Type dropdown)
<div>
  <label>Risk-On Symbol (optional)</label>
  <select
    value={config.riskOnSymbol || ''}
    onChange={(e) => setConfig({ ...config, riskOnSymbol: e.target.value })}
  >
    <option value="">Default (SPY)</option>
    <optgroup label="US Equity">
      <option value="SPY">SPY - S&P 500</option>
      <option value="QQQ">QQQ - Nasdaq 100</option>
      <option value="IWM">IWM - Russell 2000</option>
    </optgroup>
    {/* ... more options ... */}
  </select>
</div>

// SignalAdapter.ts - Update getPositionSymbol
static getPositionSymbol(
  signalType: SignalType,
  position: Position,
  customRiskOn?: string,
  customRiskOff?: string
): string {
  if (customRiskOn && position === 'RISK_ON') return customRiskOn;
  if (customRiskOff && position === 'RISK_OFF') return customRiskOff;

  const config = SIGNAL_CONFIGS[signalType];
  return position === 'RISK_ON' ? config.riskOnSymbol : config.riskOffSymbol;
}
```

---

**Created:** November 4, 2025
**Type:** Simple Development Task (not full PM story)
**Estimated Effort:** 15-30 minutes
**Priority:** User-requested feature
