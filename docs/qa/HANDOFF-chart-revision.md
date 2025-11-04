# Handoff: Backtest Chart Revision Based on Gayed Signal Documentation

## Context

The simple backtesting platform (`/backtest-simple`) currently displays an equity curve chart with signal indicators and a static threshold line. However, after reading the original Gayed research papers, we discovered that the chart visualization is misleading and doesn't accurately represent how the trading strategies work.

## Problem Statement

**Current Implementation (INCORRECT):**
- Chart shows signal indicator values (purple dashed line) ✓
- Chart shows static threshold at 1.0 (orange dashed line) ✗ **MISLEADING**
- Tooltip suggests trades are triggered by crossing the 1.0 threshold ✗ **INCORRECT**

**Reality from Research Papers:**
- Different Gayed signals use **different methodologies** (not all use threshold crossovers)
- The Beta Rotation Strategy (Utilities/SPY) uses **4-week rate-of-change momentum**, not threshold crossovers
- The 1.0 threshold is used for **regime detection** in signal calculators, but **NOT for trading decisions**

## Your Mission

Revise the equity curve chart to accurately represent each of the 5 Gayed signals based on their original research papers. The chart should clearly show:

1. What the signal indicator actually measures
2. How trading decisions are made (momentum, threshold, moving average, etc.)
3. Accurate visualization that matches the research methodology

## Files to Review

### Research Papers (MUST READ ALL)
Located in `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/docs/gayed-doc/`:

1. **SSRN-id2417974.pdf** - Beta Rotation Strategy (Utilities/SPY)
   - Uses 4-week rate-of-change of Utilities/Market ratio
   - Positive momentum → Utilities, Negative momentum → Market

2. **SSRN-id2431022.pdf** - Lumber/Gold Signal
   - Read to understand actual methodology

3. **SSRN-id2604248.pdf** - Treasury Curve Signal (IEF/TLT)
   - Read to understand actual methodology

4. **SSRN-id2741701.pdf** - Additional Gayed signals
   - Read to understand actual methodology

5. **SSRN-id3718824.pdf** - VIX Defensive Signal
   - Read to understand actual methodology

### Signal Implementations (Current Code)
Located in `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/domains/trading-signals/engines/gayed-signals/`:

- `utilities-spy.ts` - Utilities/SPY signal calculator
- `lumber-gold.ts` - Lumber/Gold signal calculator
- `treasury-curve.ts` - Treasury curve signal calculator
- `sp500-ma.ts` - SP500 moving average signal
- `vix-defensive.ts` - VIX defensive signal

**Note:** These calculators currently use 1.0 thresholds for regime detection, but verify against research papers whether this is the actual trading methodology.

### Chart Implementation (Current Code)
Files to modify:

1. `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/domains/backtesting/simple/results/BacktestResults.ts`
   - Contains `formatEquityCurve()` function (lines 40-149)
   - Contains `getSignalThreshold()` function (lines 265-276)
   - Currently adds static threshold line at 1.0 (lines 80-94)

2. `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/app/backtest-simple/page.tsx`
   - Contains Chart.js configuration (lines 320-402)
   - Contains tooltip callbacks (lines 343-362)
   - Contains dual y-axis setup (lines 366-394)

### Signal Configuration
Located in `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/domains/backtesting/simple/signals/SignalAdapter.ts`:

- `SIGNAL_CONFIGS` object (lines 20-51)
- Defines which symbols are used for each signal type
- Maps signal types to risk-on/risk-off positions

## Key Questions to Answer

For each of the 5 signals, determine:

1. **What does the signal indicator measure?**
   - Raw price ratio?
   - Rate-of-change (momentum)?
   - Relative strength over N periods?
   - Moving average distance?

2. **How are trading decisions made?**
   - Threshold crossover at 1.0?
   - Momentum (positive/negative rate-of-change)?
   - Moving average crossover?
   - Fixed signal levels?

3. **What should be visualized on the chart?**
   - Current signal indicator? (keep purple line)
   - Static threshold line? (remove/modify?)
   - Rate-of-change line? (add new?)
   - Moving average? (add new?)
   - Zero line for momentum signals? (add new?)

## Expected Deliverables

1. **Analysis Document:**
   - Create `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/docs/qa/signal-methodology-analysis.md`
   - For each signal, document:
     - What the research paper says
     - What the current code implements
     - Gaps/discrepancies between paper and code
     - Recommended chart visualization

2. **Updated Chart Implementation:**
   - Modify `BacktestResults.ts` to accurately visualize each signal type
   - Update `page.tsx` chart configuration if needed
   - Add tooltips explaining the methodology
   - Consider signal-specific visualizations (not one-size-fits-all)

3. **Updated Types (if needed):**
   - Modify `/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/domains/backtesting/simple/engine/types.ts` if new signal metadata is needed

## Current Signal Types

From `SignalAdapter.ts`, we support:
- `utilities-spy` - Utilities/SPY relative strength
- `lumber-gold` - WOOD/GLD commodity rotation
- `treasury-curve` - IEF/TLT yield curve
- `sp500-ma` - SPY vs 200-day moving average
- `vix-defensive` - VIXY volatility indicator

## Technical Constraints

- Chart uses Chart.js (react-chartjs-2)
- Dual y-axis already implemented (y = portfolio value, y1 = signal indicator)
- Frontend fetches backtest results from `/api/backtest-simple`
- Backend response includes `signalValue` in `DailyPortfolioValue[]`
- Must maintain backward compatibility with existing API

## Success Criteria

✓ Chart accurately represents the trading methodology from research papers
✓ Different signals may have different visualizations (if appropriate)
✓ Tooltips clearly explain what triggers trades
✓ Remove or clarify misleading threshold lines
✓ Add documentation explaining the difference between regime detection and trading signals
✓ All 5 signals validated against their research papers

## Priority

**High Priority** - This is a critical accuracy issue. The current chart misleads users about how the strategies work.

## Estimated Complexity

**Complex** - Requires:
- Reading and understanding 5 research papers
- Analyzing signal implementation code
- Designing appropriate visualizations for each signal type
- Potentially restructuring chart logic to support signal-specific features

## Getting Started

1. Read SSRN-id2417974.pdf (Utilities/SPY) first - this is the one we already know is incorrect
2. Document the correct methodology for Utilities/SPY as a template
3. Repeat for the other 4 signals
4. Design a flexible chart system that can show different indicators based on signal type
5. Implement and test

## Current State

- Signal indicator (purple line) shows raw signal values ✓
- Static threshold at 1.0 (orange line) is misleading for momentum-based strategies ✗
- Tooltips show signal values with 4 decimal precision ✓
- Transaction markers (green/red triangles) show buy/sell trades ✓

## Contact

If you have questions or need clarification, refer back to:
- Original research papers in `docs/gayed-doc/`
- Signal calculator implementations in `domains/trading-signals/engines/gayed-signals/`
- Existing chart implementation in `domains/backtesting/simple/results/BacktestResults.ts`

---

**Created:** November 4, 2025
**Author:** Claude (handoff from previous agent)
**Status:** Ready for assignment
