# Gayed Signals Backtrader Analysis API Documentation

## Overview

The Gayed Signals Backtrader Analysis Service is a Python microservice that provides comprehensive analysis of Michael Gayed's market regime signals using the Backtrader library. It offers signal correlation analysis, performance attribution, and interactive chart generation.

## Base URL

- Development: `http://localhost:5000`
- Production: Configure according to your deployment

## Authentication

Currently, no authentication is required. In production, consider implementing API key authentication.

## API Endpoints

### Health Check

#### GET `/health`

Returns the health status of the service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-07-01T12:00:00Z",
  "version": "1.0.0",
  "service": "gayed-backtrader-analysis",
  "indicators_available": [
    "utilities_spy",
    "lumber_gold",
    "treasury_curve",
    "vix_defensive",
    "sp500_ma"
  ]
}
```

**Status Codes:**
- `200 OK`: Service is healthy
- `500 Internal Server Error`: Service is unhealthy

---

### Full Analysis

#### POST `/analyze`

Performs comprehensive Backtrader analysis with Gayed signals.

**Request Body:**
```json
{
  "symbols": ["SPY", "XLU", "GLD", "DGS2", "DGS10", "VIX"],
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "data": [
    {
      "date": "2023-01-01",
      "symbol": "SPY",
      "open": 385.25,
      "high": 387.10,
      "low": 384.50,
      "close": 386.75,
      "volume": 25000000
    },
    {
      "date": "2023-01-01",
      "symbol": "XLU",
      "open": 65.30,
      "high": 65.80,
      "low": 65.10,
      "close": 65.55,
      "volume": 5000000
    }
  ],
  "config": {
    "generate_charts": true,
    "chart_format": "png",
    "analysis_mode": "signal_analysis"
  }
}
```

**Required Fields:**
- `data`: Array of market data objects
- `data[].date`: ISO date string
- `data[].symbol`: Symbol identifier
- `data[].close`: Closing price

**Optional Fields:**
- `symbols`: List of symbols to analyze
- `start_date`/`end_date`: Date range filters
- `config`: Analysis configuration options

**Response:**
```json
{
  "analysis_id": "uuid-string",
  "timestamp": "2023-07-01T12:00:00Z",
  "success": true,
  "signals": [
    {
      "date": "2023-01-01",
      "type": "utilities_spy",
      "signal": "Risk-On",
      "strength": "Moderate",
      "confidence": 0.75,
      "rawValue": 0.98,
      "metadata": {
        "xlu_return": 0.02,
        "spy_return": 0.025,
        "lookback": 21
      }
    }
  ],
  "consensus": [
    {
      "date": "2023-01-01",
      "consensus": "Risk-On",
      "confidence": 0.68,
      "risk_on_count": 3,
      "risk_off_count": 1,
      "total_signals": 4
    }
  ],
  "charts": {
    "main_chart": "/charts/uuid_main",
    "correlation_matrix": "/charts/uuid_correlation",
    "utilities_spy_chart": "/charts/uuid_utilities_spy"
  },
  "correlations": {
    "signal_price_correlations": {
      "utilities_spy": {
        "next_day": {"correlation": 0.35, "p_value": 0.002}
      }
    },
    "cross_signal_correlations": {},
    "lead_lag_analysis": {}
  },
  "performance": {
    "overall_performance": {
      "total_return": 0.15,
      "sharpe_ratio": 1.25,
      "max_drawdown": -0.08
    },
    "signal_attribution": {
      "utilities_spy": {
        "return_contribution": 0.03,
        "accuracy": 0.58
      }
    }
  },
  "statistics": {
    "utilities_spy": {
      "total_signals": 45,
      "risk_on_percentage": 60.0,
      "average_confidence": 0.72
    }
  },
  "metadata": {
    "total_bars": 252,
    "date_range": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "indicators_used": ["utilities_spy", "lumber_gold"]
  }
}
```

**Status Codes:**
- `200 OK`: Analysis completed successfully
- `400 Bad Request`: Invalid request data
- `500 Internal Server Error`: Analysis failed

---

### Quick Analysis

#### POST `/analyze/quick`

Performs rapid analysis for real-time signal checking with limited data.

**Request Body:**
```json
{
  "symbols": ["SPY", "XLU"],
  "data": [
    // Recent 60 data points only
  ]
}
```

**Response:**
```json
{
  "analysis_id": "quick_abc123",
  "timestamp": "2023-07-01T12:00:00Z",
  "current_signals": {
    "utilities_spy": {
      "signal": "Risk-On",
      "confidence": 0.75,
      "strength": "Moderate"
    }
  },
  "consensus": {
    "consensus": "Risk-On",
    "confidence": 0.68
  },
  "signal_changes": {
    "utilities_spy": {
      "from": "Neutral",
      "to": "Risk-On",
      "date": "2023-07-01"
    }
  },
  "confidence_scores": {
    "utilities_spy": 0.75,
    "lumber_gold": 0.62
  }
}
```

---

### Get Chart

#### GET `/charts/{chart_id}`

Retrieves generated chart images.

**Parameters:**
- `chart_id`: Chart identifier from analysis response

**Response:**
- Content-Type: `image/png` or `text/html`
- Chart image or interactive HTML

**Status Codes:**
- `200 OK`: Chart found and returned
- `404 Not Found`: Chart not found

---

### Get Analysis Result

#### GET `/analysis/{analysis_id}`

Retrieves stored analysis results.

**Parameters:**
- `analysis_id`: Analysis identifier

**Response:**
Same format as POST `/analyze` response.

**Status Codes:**
- `200 OK`: Analysis found
- `404 Not Found`: Analysis not found

---

### Get Indicators Info

#### GET `/indicators`

Returns information about available indicators.

**Response:**
```json
{
  "indicators": {
    "utilities_spy": {
      "name": "Utilities/SPY Ratio",
      "description": "Risk-on/risk-off based on utilities vs market performance",
      "data_required": ["XLU", "SPY"],
      "lookback_period": 21
    },
    "lumber_gold": {
      "name": "Lumber/Gold Ratio",
      "description": "Economic growth vs safety sentiment",
      "data_required": ["Lumber", "Gold"],
      "lookback_period": 21
    }
  },
  "total_count": 5,
  "consensus_method": "weighted_average",
  "supported_timeframes": ["daily"]
}
```

---

### Get Configuration

#### GET `/config`

Returns current service configuration.

**Response:**
```json
{
  "environment": "development",
  "chart_output_dir": "/app/static/charts",
  "max_analysis_time": 300,
  "supported_formats": ["json", "png", "html"],
  "api_version": "1.0.0"
}
```

## Data Requirements

### Market Data Format

Each data record must include:

```json
{
  "date": "YYYY-MM-DD",           // Required: ISO date format
  "symbol": "SYMBOL",             // Required: Symbol identifier
  "close": 123.45,                // Required: Closing price
  "open": 123.00,                 // Optional: Opening price
  "high": 124.00,                 // Optional: High price
  "low": 122.50,                  // Optional: Low price
  "volume": 1000000               // Optional: Volume
}
```

### Required Symbols

For complete analysis, provide data for these symbol combinations:

1. **Utilities/SPY**: `XLU`, `SPY`
2. **Lumber/Gold**: `Lumber`, `Gold` (or `GLD`)
3. **Treasury Curve**: `DGS2`, `DGS10` (or `^TNX`, `^IRX`)
4. **VIX Defensive**: `VIX` (or `^VIX`)
5. **S&P 500 MA**: `SPY` (or `^GSPC`)

### Symbol Aliases

The service accepts these alternative symbols:
- `GLD`, `IAU` → `Gold`
- `^TNX`, `TNX` → `DGS10`
- `^IRX`, `IRX` → `DGS2`
- `^VIX` → `VIX`
- `^GSPC`, `GSPC` → `SPY`

## Error Handling

### Error Response Format

```json
{
  "error": "Error description",
  "details": "Detailed error information",
  "timestamp": "2023-07-01T12:00:00Z",
  "analysis_id": "uuid-string"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input data
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: Invalid HTTP method
- `500 Internal Server Error`: Service error

## Rate Limiting

No rate limiting is currently implemented. Consider implementing rate limiting in production environments.

## Response Times

- `/health`: < 100ms
- `/analyze/quick`: < 5 seconds
- `/analyze`: 30 seconds - 5 minutes (depending on data size)

## Data Validation

The service validates:
- Date format and ranges
- Required fields presence
- Numeric values validity
- Minimum data points (50 for meaningful analysis)
- OHLC relationships

## Integration Guide

### Node.js Integration

```javascript
const axios = require('axios');

// Perform analysis
const analysisResponse = await axios.post('http://localhost:5000/analyze', {
  symbols: ['SPY', 'XLU', 'GLD'],
  data: marketData,
  config: {
    generate_charts: true,
    chart_format: 'png'
  }
});

// Get chart
const chartResponse = await axios.get(
  `http://localhost:5000${analysisResponse.data.charts.main_chart}`,
  { responseType: 'arraybuffer' }
);
```

### Python Integration

```python
import requests

# Perform analysis
response = requests.post('http://localhost:5000/analyze', json={
    'symbols': ['SPY', 'XLU', 'GLD'],
    'data': market_data,
    'config': {
        'generate_charts': True,
        'chart_format': 'png'
    }
})

analysis_result = response.json()
```

### cURL Examples

```bash
# Health check
curl -X GET http://localhost:5000/health

# Quick analysis
curl -X POST http://localhost:5000/analyze/quick \
  -H "Content-Type: application/json" \
  -d @quick_data.json

# Full analysis
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d @analysis_data.json
```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker
docker build -t gayed-backtrader-analysis .
docker run -p 5000:5000 gayed-backtrader-analysis

# Or use docker-compose
docker-compose up -d
```

### Environment Variables

- `FLASK_ENV`: `development` or `production`
- `FLASK_PORT`: Port number (default: 5000)
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, `ERROR`
- `MAX_ANALYSIS_TIME`: Maximum analysis time in seconds
- `CHART_OUTPUT_DIR`: Directory for chart files

## Monitoring

### Health Monitoring

The service provides health checks at `/health` for monitoring systems.

### Logging

Structured JSON logs are written to:
- Console (stdout)
- File: `logs/app.log` (if configured)

Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Metrics

Consider implementing metrics collection for:
- Request latency
- Analysis success/failure rates
- Memory usage
- Chart generation times

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **Error Handling**: Errors don't expose internal details
3. **Resource Limits**: Analysis time and memory limits
4. **CORS**: Configure CORS for production use
5. **Authentication**: Implement API authentication for production

## Troubleshooting

### Common Issues

1. **"Insufficient data points"**
   - Ensure at least 50 data points
   - Check data format and dates

2. **"No valid indicator combinations"**
   - Verify required symbol pairs are present
   - Check symbol name aliases

3. **Chart generation fails**
   - Check write permissions for chart directory
   - Verify matplotlib/plotly installation

4. **Analysis timeout**
   - Reduce data size or increase timeout
   - Check for infinite loops in indicators

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python start_service.py
```

## Support

For issues and questions:
1. Check logs in `logs/app.log`
2. Verify data format and requirements
3. Test with `/health` endpoint
4. Review error messages and suggestions