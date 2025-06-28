# Gayed Signals Backtrader Analysis Service

A Python microservice that uses Backtrader to visualize and analyze how Gayed signals correlate with stock price movements.

## Features

- **Backtrader Integration**: Custom indicators for all 5 Gayed signals
- **Interactive Charts**: Candlestick charts with signal overlays
- **Correlation Analysis**: Statistical analysis of signal effectiveness
- **Flask API**: RESTful endpoints for integration with Node.js dashboard
- **Performance Attribution**: Track how signals predict market moves

## Gayed Signals Implemented

1. **Utilities/SPY Ratio Signal** - Risk-On/Risk-Off based on utilities vs market performance
2. **Lumber/Gold Ratio Signal** - Economic growth vs safety sentiment
3. **Treasury Curve Signal** - Yield curve analysis for risk assessment
4. **VIX Defensive Signal** - Volatility-based risk management
5. **S&P 500 Moving Average Signal** - Trend-following component

## Quick Start

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install in development mode
pip install -e .
```

### Environment Setup

Create a `.env` file:

```env
FLASK_APP=src/api/app.py
FLASK_ENV=development
FLASK_PORT=5000
LOG_LEVEL=INFO
```

### Running the Service

```bash
# Start Flask development server
python src/api/app.py

# Or using gunicorn for production
gunicorn --bind 0.0.0.0:5000 src.api.app:app
```

## API Endpoints

### POST /analyze
Receive market data and generate signal analysis with charts.

**Request:**
```json
{
  "symbols": ["SPY", "XLU", "GOLD", "DGS10", "VIX"],
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "data": [
    {
      "date": "2023-01-01",
      "symbol": "SPY",
      "open": 100.0,
      "high": 102.0,
      "low": 99.0,
      "close": 101.0,
      "volume": 1000000
    }
  ]
}
```

**Response:**
```json
{
  "analysis_id": "uuid",
  "signals": [...],
  "charts": {
    "main_chart": "/static/charts/main_chart.png",
    "correlation_matrix": "/static/charts/correlation.png"
  },
  "performance": {
    "total_return": 0.15,
    "sharpe_ratio": 1.2,
    "max_drawdown": -0.08
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-07-01T12:00:00Z",
  "version": "1.0.0"
}
```

## Directory Structure

```
.
├── src/
│   ├── indicators/          # Custom Backtrader indicators
│   ├── strategies/          # Trading strategies
│   ├── api/                # Flask API endpoints
│   ├── charts/             # Chart generation
│   ├── analysis/           # Correlation and performance analysis
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── static/charts/          # Generated chart images
├── logs/                   # Log files
└── requirements.txt        # Python dependencies
```

## Development

### Running Tests

```bash
pytest tests/ -v --cov=src
```

### Code Formatting

```bash
black src/ tests/
flake8 src/ tests/
mypy src/
```

## Integration with Node.js Dashboard

This service is designed to work with the existing Node.js Gayed Signals Dashboard:

1. Node.js dashboard sends market data via POST /analyze
2. Python service processes data through Backtrader
3. Returns analysis results and chart URLs
4. Node.js dashboard displays results to users

## Configuration

Environment variables:

- `FLASK_PORT`: Port for Flask server (default: 5000)
- `LOG_LEVEL`: Logging level (default: INFO)
- `CHART_OUTPUT_DIR`: Directory for generated charts
- `MAX_ANALYSIS_TIME`: Maximum time for analysis (seconds)

## License

MIT License