# Real Backtesting System - No Fake Data

## Overview

The backtesting system has been updated to use **REAL MARKET DATA ONLY**. No synthetic or mock data is generated.

## Three Backtesting Approaches

### 1. **Live Signals Dashboard** (`/`)
- **Purpose**: Shows current market regime signals
- **Data**: Real-time signal calculation
- **No Backtesting**: This tab is for current market analysis only

### 2. **Backtesting Laboratory** (`/backtest`)
- **Purpose**: Academic-grade comprehensive backtesting
- **Engines**: Walk-Forward, Monte Carlo, Cross-Validation, Bootstrap, Synthetic Data
- **Data Requirement**: Requires real historical market data
- **Error Handling**: Returns error if no real data available

### 3. **Backtrader Analysis** (`/backtrader`) - **NEW INTERACTIVE SYSTEM**
- **Purpose**: Interactive chart-based backtesting with real lumber/gold strategy
- **Features**: 
  - Real lumber/gold ratio calculation using 91-day lookback
  - Interactive charts with actual price data
  - Coherent signal timeline that matches chart data
  - Symbol identification on charts
  - Proper date axes
  - Performance metrics based on real trades

## Lumber/Gold Strategy Details

### How It Works:
```
1. Fetch real market data for WOOD (lumber ETF) and GLD (gold ETF)
2. Calculate 91-day performance ratios:
   - Lumber Ratio = Current_Price / Price_91_days_ago  
   - Gold Ratio = Current_Price / Price_91_days_ago
3. Calculate Lumber/Gold Ratio = Lumber_Ratio / Gold_Ratio
4. Generate signals:
   - Ratio > 1.0 → Risk-On (lumber outperforming) → Buy WOOD
   - Ratio < 1.0 → Risk-Off (gold outperforming) → Buy GLD
5. Execute trades based on signal changes
6. Calculate performance metrics
```

### Real Data Sources:
- **Primary**: Yahoo Finance API for WOOD and GLD ETF data
- **Backup**: Falls back to error message if data unavailable
- **No Fake Data**: System will show error rather than generate synthetic data

## Usage Instructions

### For Interactive Lumber/Gold Backtesting:

1. **Navigate to Backtrader Analysis tab** (`/backtrader`)
2. **Select Required Symbols**:
   - WOOD (lumber ETF) - REQUIRED
   - GLD (gold ETF) - REQUIRED
3. **Select lumber_gold signal**
4. **Set date range** (recommend 1+ years for statistical significance)
5. **Click "Run Analysis"**

### Expected Behavior:

✅ **With Real Data**:
- Interactive charts showing actual WOOD and GLD prices
- Real lumber/gold ratio calculation with proper 91-day lookback
- Coherent signal timeline matching actual price movements
- Performance metrics based on actual trades
- Symbol names clearly displayed on charts
- Proper date axes with real dates

❌ **Without Real Data**:
- Clear error message: "REAL DATA REQUIRED"
- No fake charts or synthetic data
- Instructions to retry when data is available

## API Endpoints

### New Real Backtesting API
- **Endpoint**: `/api/backtest-lumber-gold`
- **Method**: POST
- **Purpose**: Real lumber/gold strategy backtesting
- **Data Source**: Yahoo Finance API
- **Error Handling**: Returns error if data unavailable

### Updated Backtrader API  
- **Endpoint**: `/api/backtrader`
- **Purpose**: Connects to Python Backtrader service
- **Fallback**: Error message (no more fake data)

## Key Improvements

### 1. **Data Integrity**
- ✅ Real market data only
- ❌ No synthetic data generation
- ✅ Clear error messages when data unavailable

### 2. **Chart Accuracy** 
- ✅ Interactive charts using Recharts library
- ✅ Symbol names displayed on charts
- ✅ Proper date axes
- ✅ Signal timeline coherent with price data

### 3. **Strategy Implementation**
- ✅ Actual lumber/gold ratio calculation (91-day lookback)
- ✅ Real trade execution based on signal changes
- ✅ Performance metrics from actual trades
- ✅ Proper position sizing and risk management

### 4. **Educational Value**
- ✅ Shows importance of real data in financial analysis
- ✅ Demonstrates actual strategy mechanics
- ✅ No false confidence from synthetic data

## Troubleshooting

### "REAL DATA REQUIRED" Error
- **Cause**: Yahoo Finance API unavailable or rate limited
- **Solution**: Wait and retry, or check internet connection

### "Lumber/Gold Strategy Requires WOOD and GLD" Error
- **Cause**: Required symbols not selected
- **Solution**: Select both WOOD and GLD symbols in configuration

### Charts Not Loading
- **Cause**: Browser JavaScript issues or network problems
- **Solution**: Refresh page, check browser console for errors

## Technical Architecture

### Frontend Components:
- `InteractiveLumberGoldChart.tsx` - New interactive chart component
- `page.tsx` (backtrader) - Updated to use real data only

### Backend APIs:
- `/api/backtest-lumber-gold/route.ts` - Real lumber/gold backtesting
- `/api/backtrader/route.ts` - Updated to require Python service

### Data Flow:
1. User configures analysis parameters
2. Frontend validates lumber/gold requirements
3. Backend fetches real market data from Yahoo Finance
4. System calculates actual lumber/gold ratios using 91-day lookback
5. Strategy executes real trades based on signal changes
6. Frontend displays interactive charts with real data
7. Performance metrics calculated from actual trade results

## Educational Disclaimers

⚠️ **This system is for educational purposes only**
- Past performance does not guarantee future results
- Real trading involves additional risks and costs
- Backtesting has inherent limitations and biases
- Consult qualified financial professionals before investing

The system now maintains complete data integrity while providing valuable educational insights into quantitative trading strategies.