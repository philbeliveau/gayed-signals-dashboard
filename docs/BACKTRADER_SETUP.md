# 📊 Backtrader Analysis Setup Guide

Your Gayed Signal Dashboard now includes **Backtrader Analysis** - a powerful Python-based backtesting system that shows how signals correlate with price movements using interactive charts.

## 🚀 Quick Setup (5 minutes)

### 1. **Setup Python Service**
```bash
cd /Users/philippebeliveau/Desktop/Notebook/Trading-system/gayed-signals-dashboard
./python-services/setup.sh
```

### 2. **Start Python Service**
```bash
cd python-services/backtrader-analysis
source venv/bin/activate
python start_service.py
```

### 3. **Start Dashboard**
```bash
# In another terminal
cd /Users/philippebeliveau/Desktop/Notebook/Trading-system/gayed-signals-dashboard
npm run dev
```

### 4. **Access Backtrader Analysis**
- **Dashboard**: http://localhost:3000
- **Backtrader Tab**: Click "Backtrader Analysis" in the navigation
- **Python API**: http://localhost:5000 (runs automatically)

## 📈 What You'll See

### **Configuration Tab**
- **Select Signals**: Choose from 5 Gayed signals
- **Pick Symbols**: SPY, XLU, WOOD, GLD, TLT, QQQ, IWM, VXX, DBA, USO
- **Date Range**: Set analysis period
- **Chart Options**: Choose visualization styles

### **Charts Tab**
- **Interactive Charts**: Backtrader-generated price charts
- **Signal Overlays**: See exactly when signals changed
- **Signal Markers**: Risk-On/Risk-Off transition points
- **Zoom & Pan**: Explore different time periods

### **Performance Tab**
- **Total Return**: How the strategy performed
- **Sharpe Ratio**: Risk-adjusted returns
- **Max Drawdown**: Worst losing period
- **Win Rate**: Percentage of profitable trades
- **Trade Analysis**: Detailed trade statistics

### **Correlations Tab**
- **Signal-Price Correlations**: How signals relate to price movements
- **Cross-Signal Analysis**: How signals interact with each other
- **Statistical Significance**: Confidence levels for correlations
- **Heat Maps**: Visual correlation matrices

### **Signal Guide Tab**
- **Educational Content**: Understand each Gayed signal
- **Calculation Methods**: How signals are computed
- **Risk-On/Risk-Off**: What each signal state means
- **Trading Implications**: How to interpret signals

## 🔧 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │    │    Node.js       │    │    Python       │
│   (Frontend)    │───▶│     API          │───▶│   Backtrader    │
│   localhost:3000│    │  /api/backtrader │    │   localhost:5000│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Frontend**: React/TypeScript dashboard with Backtrader tab
- **Node.js API**: Middleware between frontend and Python
- **Python Service**: Backtrader analysis with chart generation

## 🎯 Features

### **5 Gayed Signals Analyzed**
1. **Utilities/SPY Ratio** - Risk-on/risk-off sentiment
2. **Lumber/Gold Ratio** - Economic growth vs safety
3. **Treasury Curve** - Yield curve analysis
4. **VIX Defensive** - Volatility-based positioning
5. **S&P 500 Moving Average** - Trend following

### **10 Symbols Supported**
- **Equity ETFs**: SPY, XLU, QQQ, IWM
- **Commodity ETFs**: WOOD, GLD, DBA, USO
- **Bond ETFs**: TLT
- **Volatility**: VXX

### **Advanced Analysis**
- **Signal Timing**: See exactly when signals changed
- **Performance Attribution**: Which signals drove returns
- **Risk Analysis**: Drawdowns, volatility, correlations
- **Statistical Testing**: Significance of signal relationships

## 🛠 Troubleshooting

### **Python Service Won't Start**
```bash
# Check Python version (need 3.8+)
python3 --version

# Reinstall dependencies
cd python-services/backtrader-analysis
pip install -r requirements.txt --force-reinstall
```

### **Dashboard Connection Issues**
```bash
# Check if Python service is running
curl http://localhost:5000/health

# Restart both services
# Terminal 1: Python service
cd python-services/backtrader-analysis && python start_service.py

# Terminal 2: Dashboard
npm run dev
```

### **Charts Not Loading**
- Ensure Python service is running on port 5000
- Check browser console for error messages
- Verify firewall isn't blocking localhost connections

## 📚 Dependencies

### **Python Requirements**
- backtrader >= 1.9.78.123
- matplotlib >= 3.5.0
- pandas >= 1.3.0
- numpy >= 1.21.0
- flask >= 2.0.0
- plotly >= 5.0.0

### **Node.js Integration**
- Existing dashboard dependencies
- New API route: `/api/backtrader`
- New page: `/backtrader`

## 🎓 Educational Use

This Backtrader analysis system is designed for:
- **Learning**: Understand how signals relate to market movements
- **Research**: Analyze historical signal performance
- **Visualization**: See signals in context of price action
- **Strategy Development**: Test signal-based trading ideas

⚠️ **Important**: This is for educational purposes only. Past performance doesn't guarantee future results.

## 🔄 Updates

The system automatically updates with:
- **Real Market Data**: From your existing Tiingo/Alpha Vantage APIs
- **Live Signals**: Current Gayed signal calculations
- **Interactive Charts**: Real-time Backtrader visualizations
- **Performance Tracking**: Updated analysis results

## 🆘 Support

If you need help:
1. Check the logs in `python-services/backtrader-analysis/logs/`
2. Verify all services are running with `curl http://localhost:5000/health`
3. Restart services if needed
4. Check Python dependencies are properly installed

Your Backtrader analysis system is now ready! 🚀