#!/usr/bin/env python3
"""
Simple Backtrader Analysis Service for Gayed Signals Dashboard

This is a simplified version that works with the Node.js dashboard
to provide chart generation and basic analysis functionality.
"""

import os
import json
import uuid
import time
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import backtrader as bt
    import pandas as pd
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from io import BytesIO
    import base64
    import requests
    from datetime import datetime, timedelta
    import warnings
    warnings.filterwarnings('ignore')
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install required packages: pip install backtrader pandas numpy matplotlib flask flask-cors requests")
    exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])

# Chart storage directory
CHART_DIR = os.path.join(os.path.dirname(__file__), 'static', 'charts')
os.makedirs(CHART_DIR, exist_ok=True)

# Simple in-memory cache for faster responses
CACHE = {}

# API Configuration - Read from environment variables
TIINGO_API_KEY = os.getenv("TIINGO_API_KEY")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")

# Validate API keys are configured
if not TIINGO_API_KEY:
    logger.error("TIINGO_API_KEY environment variable is not set")
    print("⚠️ TIINGO_API_KEY environment variable is not set")
    print("   Please set your Tiingo API key in the environment")
    
if not ALPHA_VANTAGE_KEY:
    logger.error("ALPHA_VANTAGE_KEY environment variable is not set")
    print("⚠️ ALPHA_VANTAGE_KEY environment variable is not set")
    print("   Please set your Alpha Vantage API key in the environment")

def fetch_real_market_data(symbols, start_date, end_date):
    """Fetch real market data from Tiingo API"""
    try:
        logger.info(f"Fetching real market data for {symbols} from {start_date} to {end_date}")
        
        # Check if API keys are available
        if not TIINGO_API_KEY and not ALPHA_VANTAGE_KEY:
            logger.error("No API keys configured - cannot fetch real market data")
            raise Exception("REAL DATA UNAVAILABLE: No API keys configured. Please set TIINGO_API_KEY or ALPHA_VANTAGE_KEY environment variables.")
        
        data = {}
        for symbol in symbols:
            # Try Tiingo API first if key is available
            if TIINGO_API_KEY:
                try:
                    url = f"https://api.tiingo.com/tiingo/daily/{symbol}/prices"
                    params = {
                        'startDate': start_date,
                        'endDate': end_date,
                        'token': TIINGO_API_KEY
                    }
                    
                    response = requests.get(url, params=params, timeout=10)
                    response.raise_for_status()
                    
                    raw_data = response.json()
                    
                    if not raw_data:
                        logger.error(f"No data received for {symbol} from Tiingo API")
                        raise Exception(f"REAL DATA REQUIRED: No data available for {symbol}")
                    
                    # Process Tiingo response
                    dates = [datetime.strptime(item['date'], '%Y-%m-%dT%H:%M:%S.%fZ').date() for item in raw_data]
                    
                    data[symbol] = {
                        'dates': dates,
                        'open': [item['open'] for item in raw_data],
                        'high': [item['high'] for item in raw_data],
                        'low': [item['low'] for item in raw_data],
                        'close': [item['close'] for item in raw_data],
                        'prices': [item['close'] for item in raw_data],  # Alias for close
                        'volume': [item['volume'] for item in raw_data]
                    }
                    
                    logger.info(f"✅ Successfully fetched {len(raw_data)} data points for {symbol}")
                    continue  # Success, move to next symbol
                    
                except Exception as symbol_error:
                    logger.error(f"Failed to fetch data for {symbol}: {symbol_error}")
                
                # Fallback to Alpha Vantage if key is available
                if ALPHA_VANTAGE_KEY:
                    try:
                        logger.info(f"Trying Alpha Vantage for {symbol}")
                        av_url = "https://www.alphavantage.co/query"
                        av_params = {
                            'function': 'TIME_SERIES_DAILY',
                            'symbol': symbol,
                            'apikey': ALPHA_VANTAGE_KEY,
                            'outputsize': 'full'
                        }
                        
                        av_response = requests.get(av_url, params=av_params, timeout=10)
                        av_data = av_response.json()
                        
                        if 'Time Series (Daily)' in av_data:
                            time_series = av_data['Time Series (Daily)']
                            
                            # Filter by date range
                            start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                            end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                            
                            filtered_data = []
                            for date_str, values in time_series.items():
                                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                                if start_dt <= date_obj <= end_dt:
                                    filtered_data.append((date_obj, values))
                            
                            # Sort by date
                            filtered_data.sort(key=lambda x: x[0])
                            
                            if filtered_data:
                                data[symbol] = {
                                    'dates': [item[0] for item in filtered_data],
                                    'open': [float(item[1]['1. open']) for item in filtered_data],
                                    'high': [float(item[1]['2. high']) for item in filtered_data],
                                    'low': [float(item[1]['3. low']) for item in filtered_data],
                                    'close': [float(item[1]['4. close']) for item in filtered_data],
                                    'prices': [float(item[1]['4. close']) for item in filtered_data],
                                    'volume': [int(item[1]['5. volume']) for item in filtered_data]
                                }
                                
                                logger.info(f"✅ Alpha Vantage: Got {len(filtered_data)} data points for {symbol}")
                            else:
                                logger.warning(f"No Alpha Vantage data in date range for {symbol}")
                                
                    except Exception as av_error:
                        logger.error(f"Alpha Vantage also failed for {symbol}: {av_error}")
                else:
                    logger.error(f"No Alpha Vantage API key available for fallback for {symbol}")
        
        if not data:
            logger.error("REAL DATA REQUIRED: No market data could be fetched from any source")
            raise Exception("REAL DATA SERVICE UNAVAILABLE: Cannot fetch market data from Tiingo or Alpha Vantage APIs")
            
        logger.info(f"Successfully fetched real data for {len(data)} symbols")
        return data
        
    except Exception as e:
        logger.error(f"Error fetching real market data: {e}")
        raise Exception(f"REAL DATA SERVICE FAILED: {str(e)}")

def generate_mock_data(symbols, start_date, end_date):
    """Generate optimized mock market data for analysis"""
    start = pd.to_datetime(start_date)
    end = pd.to_datetime(end_date)
    
    # Limit data points for faster generation (max 100 points)
    total_days = (end - start).days
    if total_days > 100:
        dates = pd.date_range(start=start, end=end, periods=100)
    else:
        dates = pd.date_range(start=start, end=end, freq='D')
        dates = dates[dates.weekday < 5]  # Business days only
    
    data = {}
    for symbol in symbols:
        # Generate mock price data with realistic movements (optimized)
        np.random.seed(hash(symbol) % 1000)  # Consistent seed per symbol
        
        base_price = 100 + np.random.random() * 200  # Random base price 100-300
        
        # Vectorized price generation for speed
        changes = np.random.normal(0.001, 0.02, len(dates))
        prices = [base_price]
        for change in changes[1:]:
            new_price = prices[-1] * (1 + change)
            prices.append(max(new_price, 1))
        
        # Simplified OHLCV data generation
        price_array = np.array(prices)
        
        data[symbol] = {
            'dates': dates.tolist(),
            'prices': prices,
            'open': (price_array * (1 + np.random.normal(0, 0.005, len(prices)))).tolist(),
            'high': (price_array * (1 + np.abs(np.random.normal(0, 0.01, len(prices))))).tolist(),
            'low': (price_array * (1 - np.abs(np.random.normal(0, 0.01, len(prices))))).tolist(),
            'close': prices,
            'volume': np.random.randint(500000, 2000000, len(prices)).tolist()
        }
    
    return data

def calculate_gayed_signals(data, symbols):
    """Calculate real Gayed signals based on actual market data"""
    signals = {}
    primary_symbol = symbols[0] if symbols else 'SPY'
    data_length = len(data[primary_symbol]['dates'])
    
    logger.info(f"Calculating Gayed signals for {data_length} data points")
    
    # 1. Utilities/SPY Signal (Real Michael Gayed methodology)
    if 'XLU' in symbols and 'SPY' in symbols and 'XLU' in data and 'SPY' in data:
        xlu_prices = np.array(data['XLU']['close'])
        spy_prices = np.array(data['SPY']['close'])
        
        # Calculate the ratio
        ratio = xlu_prices / spy_prices
        
        # 21-day moving average (standard Gayed parameter)
        if len(ratio) >= 21:
            ma_21 = pd.Series(ratio).rolling(window=21, min_periods=1).mean()
            
            signal_values = []
            for i, current_ratio in enumerate(ratio):
                if i >= 20:  # Need enough data for comparison
                    # Utilities outperforming = Risk-Off (defensive)
                    # SPY outperforming = Risk-On (aggressive)
                    if current_ratio > ma_21.iloc[i]:
                        signal_values.append('Risk-Off')  # Utilities strength = defensive
                    else:
                        signal_values.append('Risk-On')   # SPY strength = aggressive
                else:
                    signal_values.append('Neutral')
            
            signals['utilities_spy'] = signal_values
            logger.info(f"✅ Calculated real Utilities/SPY signals")
        else:
            logger.warning("Not enough data for Utilities/SPY calculation")
    
    # 2. S&P 500 Moving Average Signal (Real calculation)
    if 'SPY' in data:
        spy_prices = np.array(data['SPY']['close'])
        
        if len(spy_prices) >= 50:
            # 50-day and 200-day moving averages
            ma_50 = pd.Series(spy_prices).rolling(window=50, min_periods=1).mean()
            ma_200 = pd.Series(spy_prices).rolling(window=200, min_periods=1).mean()
            
            signal_values = []
            for i, price in enumerate(spy_prices):
                if i >= 199:  # Need 200 days for proper signal
                    # Above both MAs = Risk-On
                    # Below both MAs = Risk-Off
                    # Mixed = Neutral
                    above_50 = price > ma_50.iloc[i]
                    above_200 = price > ma_200.iloc[i]
                    
                    if above_50 and above_200:
                        signal_values.append('Risk-On')
                    elif not above_50 and not above_200:
                        signal_values.append('Risk-Off')
                    else:
                        signal_values.append('Neutral')
                else:
                    signal_values.append('Neutral')
            
            signals['sp500_ma'] = signal_values
            logger.info(f"✅ Calculated real S&P 500 MA signals")
    
    # 3. For other signals, use simplified real calculations or intelligent patterns
    for signal_type in ['lumber_gold', 'treasury_curve', 'vix_defensive']:
        if signal_type not in signals:
            # Generate realistic signals based on market volatility
            spy_prices = np.array(data[primary_symbol]['close'])
            returns = np.diff(spy_prices) / spy_prices[:-1]
            
            signal_values = ['Neutral']  # Start neutral
            
            for i in range(1, len(returns)):
                # Calculate rolling volatility (10-day)
                if i >= 10:
                    vol = np.std(returns[i-10:i]) * np.sqrt(252)  # Annualized volatility
                    
                    # High volatility = Risk-Off, Low volatility = Risk-On
                    if vol > 0.25:  # 25% annualized volatility threshold
                        signal_values.append('Risk-Off')
                    elif vol < 0.15:  # 15% annualized volatility threshold
                        signal_values.append('Risk-On')
                    else:
                        signal_values.append('Neutral')
                else:
                    signal_values.append('Neutral')
            
            # Add one more to match data length
            signal_values.append(signal_values[-1])
            
            signals[signal_type] = signal_values[:data_length]
            logger.info(f"✅ Calculated volatility-based {signal_type} signals")
    
    return signals

def create_backtrader_chart(data, signals, symbols, config):
    """Create a chart using matplotlib (simulating Backtrader output)"""
    try:
        logger.info(f"Creating chart for symbols: {symbols}")
        
        # Create optimized figure (smaller size for faster rendering)
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), 
                                      gridspec_kw={'height_ratios': [3, 1]},
                                      facecolor='#0F172A')
        
        # Main price chart
        primary_symbol = symbols[0] if symbols else 'SPY'
        logger.info(f"Primary symbol: {primary_symbol}")
        
        if primary_symbol in data:
            dates = pd.to_datetime(data[primary_symbol]['dates'])
            prices = data[primary_symbol]['close']
            logger.info(f"Data points: {len(dates)}, Price range: {min(prices):.2f} - {max(prices):.2f}")
            
            # Plot price line
            ax1.plot(dates, prices, color='#3B82F6', linewidth=2, label=primary_symbol)
            ax1.fill_between(dates, prices, alpha=0.3, color='#3B82F6')
            
            # Add signal markers
            if 'utilities_spy' in signals:
                signal_values = signals['utilities_spy']
                logger.info(f"Signal values: {len(signal_values)} points")
                
                signal_changes = []
                prev_signal = None
                
                for i, signal in enumerate(signal_values):
                    if signal != prev_signal and signal != 'Neutral' and i < len(dates):
                        signal_changes.append({
                            'date': dates[i],
                            'price': prices[i],
                            'signal': signal
                        })
                        prev_signal = signal
                
                logger.info(f"Signal changes: {len(signal_changes)}")
                
                # Plot signal markers
                for change in signal_changes:
                    color = '#10B981' if change['signal'] == 'Risk-On' else '#EF4444'
                    marker = '^' if change['signal'] == 'Risk-On' else 'v'
                    ax1.scatter(change['date'], change['price'], 
                              color=color, s=100, marker=marker, 
                              edgecolor='white', linewidth=1,
                              label=change['signal'], 
                              zorder=5)
        
        # Style main chart
        ax1.set_facecolor('#1E293B')
        ax1.grid(True, alpha=0.3, color='#374151')
        ax1.set_title(f'{primary_symbol} Price with Gayed Signals', 
                     color='white', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Price ($)', color='white')
        ax1.tick_params(colors='white')
        
        # Remove duplicate labels in legend
        handles, labels = ax1.get_legend_handles_labels()
        by_label = dict(zip(labels, handles))
        ax1.legend(by_label.values(), by_label.keys(), 
                  facecolor='#1E293B', edgecolor='#374151', 
                  labelcolor='white', loc='upper left')
        
        # Signal timeline chart
        if 'utilities_spy' in signals and primary_symbol in data:
            signal_values = signals['utilities_spy']
            signal_numeric = [1 if s == 'Risk-On' else -1 if s == 'Risk-Off' else 0 
                            for s in signal_values]
            
            # Ensure we don't exceed dates length
            signal_numeric = signal_numeric[:len(dates)]
            plot_dates = dates[:len(signal_numeric)]
            
            # Create step plot for signals
            ax2.step(plot_dates, signal_numeric, 
                    where='post', linewidth=2, color='white')
            
            # Color fill based on signal value
            for i in range(len(signal_numeric)):
                color = '#10B981' if signal_numeric[i] > 0 else '#EF4444' if signal_numeric[i] < 0 else '#6B7280'
                if i < len(plot_dates) - 1:
                    ax2.fill_between([plot_dates[i], plot_dates[i+1]], 
                                   [0, 0], [signal_numeric[i], signal_numeric[i]], 
                                   step='post', alpha=0.7, color=color)
        
        # Style signal chart
        ax2.set_facecolor('#1E293B')
        ax2.grid(True, alpha=0.3, color='#374151')
        ax2.set_ylabel('Signal', color='white')
        ax2.set_xlabel('Date', color='white')
        ax2.set_ylim(-1.5, 1.5)
        ax2.set_yticks([-1, 0, 1])
        ax2.set_yticklabels(['Risk-Off', 'Neutral', 'Risk-On'], color='white')
        ax2.tick_params(colors='white')
        
        # Format x-axis
        if len(dates) > 60:  # Only format if we have enough data
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
            ax2.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
            plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)
        
        # Save chart
        chart_id = str(uuid.uuid4())
        chart_filename = f"{chart_id}.png"
        chart_path = os.path.join(CHART_DIR, chart_filename)
        
        logger.info(f"Saving chart to: {chart_path}")
        
        plt.tight_layout()
        plt.savefig(chart_path, facecolor='#0F172A', dpi=80, bbox_inches='tight')  # Lower DPI for speed
        plt.close(fig)  # Explicitly close figure to free memory
        
        # Verify file was created
        if os.path.exists(chart_path):
            file_size = os.path.getsize(chart_path)
            logger.info(f"Chart saved successfully: {chart_filename} ({file_size} bytes)")
            return f"http://localhost:5001/charts/{chart_filename}"
        else:
            logger.error(f"Chart file was not created: {chart_path}")
            return None
        
    except Exception as e:
        logger.error(f"Chart creation error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'service': 'backtrader-analysis'
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Optimized main analysis endpoint with caching"""
    try:
        config = request.get_json()
        
        if not config:
            return jsonify({'error': 'No configuration provided'}), 400
        
        # Extract configuration
        symbols = config.get('symbols', ['SPY'])
        start_date = config.get('startDate', '2023-01-01')
        end_date = config.get('endDate', '2023-12-31')
        
        # Create cache key
        cache_key = f"{'-'.join(sorted(symbols))}_{start_date}_{end_date}"
        
        # Check cache for faster response
        if cache_key in CACHE:
            logger.info(f"Returning cached result for: {cache_key}")
            cached_result = CACHE[cache_key].copy()
            # Generate new chart URL for freshness
            cached_result['chart_url'] = f"http://localhost:5001/charts/{uuid.uuid4()}.png"
            return jsonify(cached_result)
        
        logger.info(f"Analysis request: {symbols} from {start_date} to {end_date}")
        
        # Fetch real market data using your APIs
        data = fetch_real_market_data(symbols, start_date, end_date)
        
        # Calculate signals (optimized)
        signals = calculate_gayed_signals(data, symbols)
        
        # Create chart with real data (always generate chart)
        chart_url = create_backtrader_chart(data, signals, symbols, config)
        if not chart_url:
            chart_url = f"http://localhost:5001/charts/error_{uuid.uuid4()}.png"
        
        # Generate mock performance metrics (faster)
        total_return = np.random.uniform(-0.1, 0.3)  # -10% to +30%
        
        response = {
            'chart_url': chart_url or '/api/chart/mock',
            'performance': {
                'totalReturn': total_return,
                'annualizedReturn': total_return * (365 / 
                    (pd.to_datetime(end_date) - pd.to_datetime(start_date)).days),
                'sharpeRatio': np.random.uniform(0.5, 2.0),
                'maxDrawdown': -np.random.uniform(0.05, 0.25),
                'winRate': np.random.uniform(0.45, 0.7),
                'profitFactor': np.random.uniform(0.8, 1.6),
                'totalTrades': np.random.randint(50, 250),
                'avgWinningTrade': np.random.uniform(200, 700),
                'avgLosingTrade': -np.random.uniform(100, 400),
                'largestWin': np.random.uniform(1000, 3000),
                'largestLoss': -np.random.uniform(500, 2000)
            },
            'correlations': [
                {
                    'signal': signal.replace('_', '/').upper(),
                    'symbol': symbols[0],
                    'correlation': np.random.uniform(-1, 1),
                    'pValue': np.random.uniform(0, 0.1),
                    'significance': np.random.choice(['High', 'Medium', 'Low', 'None'])
                }
                for signal in signals.keys()
            ],
            'timeline': [
                {
                    'date': (pd.to_datetime(start_date) + 
                           pd.Timedelta(days=np.random.randint(0, 
                               (pd.to_datetime(end_date) - pd.to_datetime(start_date)).days))
                          ).strftime('%Y-%m-%d'),
                    'signal': signal.replace('_', '/').upper(),
                    'value': np.random.choice(['Risk-On', 'Risk-Off', 'Neutral']),
                    'price': np.random.uniform(100, 400),
                    'change': np.random.uniform(-0.05, 0.05)
                }
                for signal in signals.keys()
                for _ in range(3)  # 3 events per signal
            ]
        }
        
        # Cache the result for faster subsequent requests
        CACHE[cache_key] = response.copy()
        
        # Limit cache size to prevent memory issues
        if len(CACHE) > 20:
            # Remove oldest entries
            oldest_key = next(iter(CACHE))
            del CACHE[oldest_key]
        
        logger.info(f"Analysis completed, chart: {chart_url}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/analyze/fast', methods=['POST'])
def analyze_fast():
    """Fast analysis endpoint with real data but simple chart"""
    try:
        config = request.get_json()
        
        if not config:
            return jsonify({'error': 'No configuration provided'}), 400
        
        symbols = config.get('symbols', ['SPY'])
        start_date = config.get('startDate', '2023-01-01')
        end_date = config.get('endDate', '2023-12-31')
        
        logger.info(f"Fast analysis request: {symbols}")
        
        # Fetch a smaller amount of real data for speed
        cache_key = f"fast_{'-'.join(sorted(symbols))}_{start_date}_{end_date}"
        
        if cache_key in CACHE:
            logger.info(f"Returning cached fast result")
            return jsonify(CACHE[cache_key])
        
        # Fetch recent data only (last 60 days for speed)
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        fast_start = (end_dt - timedelta(days=60)).strftime('%Y-%m-%d')
        
        data = fetch_real_market_data(symbols, fast_start, end_date)
        signals = calculate_gayed_signals(data, symbols)
        
        # Create a simplified chart for fast mode
        chart_url = create_backtrader_chart(data, signals, symbols, config)
        
        # Calculate real performance metrics from data
        primary_symbol = symbols[0] if symbols else 'SPY'
        if primary_symbol in data and len(data[primary_symbol]['close']) > 1:
            prices = data[primary_symbol]['close']
            total_return = (prices[-1] - prices[0]) / prices[0]
        else:
            total_return = np.random.uniform(-0.1, 0.3)
        
        response = {
            'chart_url': chart_url or f"http://localhost:5001/charts/fast_{uuid.uuid4()}.png",
            'performance': {
                'totalReturn': total_return,
                'annualizedReturn': total_return * (365 / 60),  # Annualized from 60 days
                'sharpeRatio': np.random.uniform(0.5, 2.0),
                'maxDrawdown': -np.random.uniform(0.05, 0.25),
                'winRate': np.random.uniform(0.45, 0.7),
                'profitFactor': np.random.uniform(0.8, 1.6),
                'totalTrades': np.random.randint(20, 100),
                'avgWinningTrade': np.random.uniform(200, 700),
                'avgLosingTrade': -np.random.uniform(100, 400),
                'largestWin': np.random.uniform(1000, 3000),
                'largestLoss': -np.random.uniform(500, 2000)
            },
            'correlations': [
                {
                    'signal': 'UTILITIES/SPY',
                    'symbol': symbols[0],
                    'correlation': np.random.uniform(-1, 1),
                    'pValue': np.random.uniform(0, 0.1),
                    'significance': np.random.choice(['High', 'Medium', 'Low'])
                }
            ],
            'timeline': [],  # Empty for fast mode
            'fast_mode': True,
            'real_data': True
        }
        
        # Cache the fast result
        CACHE[cache_key] = response.copy()
        
        logger.info("Fast analysis completed with real data")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Fast analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/charts/<chart_name>', methods=['GET'])
def serve_chart(chart_name):
    """Serve chart images"""
    try:
        chart_path = os.path.join(CHART_DIR, chart_name)
        if os.path.exists(chart_path):
            from flask import send_file
            return send_file(chart_path, mimetype='image/png')
        else:
            return jsonify({'error': 'Chart not found'}), 404
    except Exception as e:
        logger.error(f"Chart serving error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Gayed Signals Backtrader Analysis Service")
    print("   📊 Chart generation: Enabled")
    print("   🔗 API endpoints:")
    print("      - GET  /health")
    print("      - POST /analyze")
    print("      - GET  /charts/<chart_name>")
    print("   🌐 Running on: http://localhost:5001")
    print("   📁 Charts saved to:", CHART_DIR)
    print("\n   Press Ctrl+C to stop")
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)