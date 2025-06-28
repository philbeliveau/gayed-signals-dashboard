"""
Flask API Application for Gayed Signals Backtrader Analysis

Main Flask application providing REST API endpoints for market analysis
and signal visualization using Backtrader.
"""

import os
import sys
import json
import uuid
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import structlog

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .analysis_engine import BacktraderAnalysisEngine
from .data_validator import MarketDataValidator
from ..utils.config import Config
from ..utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)

def create_app(config_name: str = 'development') -> Flask:
    """
    Create and configure Flask application
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    config = Config.get_config(config_name)
    app.config.from_object(config)
    
    # Enable CORS for cross-origin requests from Node.js
    CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])
    
    # Initialize analysis engine
    analysis_engine = BacktraderAnalysisEngine()
    data_validator = MarketDataValidator()
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        try:
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0',
                'service': 'gayed-backtrader-analysis',
                'indicators_available': [
                    'utilities_spy',
                    'lumber_gold', 
                    'treasury_curve',
                    'vix_defensive',
                    'sp500_ma'
                ]
            }), 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
    
    @app.route('/analyze', methods=['POST'])
    def analyze_signals():
        """
        Main analysis endpoint
        
        Accepts market data and returns Gayed signal analysis with charts
        """
        try:
            # Get request data
            request_data = request.get_json()
            if not request_data:
                return jsonify({'error': 'No data provided'}), 400
            
            logger.info(f"Received analysis request with {len(request_data.get('data', []))} data points")
            
            # Validate request data
            validation_result = data_validator.validate_request(request_data)
            if not validation_result['valid']:
                logger.warning(f"Data validation failed: {validation_result['errors']}")
                return jsonify({
                    'error': 'Data validation failed',
                    'details': validation_result['errors']
                }), 400
            
            # Generate unique analysis ID
            analysis_id = str(uuid.uuid4())
            
            # Run analysis
            logger.info(f"Starting analysis {analysis_id}")
            analysis_result = analysis_engine.run_analysis(
                analysis_id=analysis_id,
                market_data=request_data['data'],
                symbols=request_data.get('symbols', []),
                start_date=request_data.get('start_date'),
                end_date=request_data.get('end_date'),
                config=request_data.get('config', {})
            )
            
            if not analysis_result['success']:
                logger.error(f"Analysis {analysis_id} failed: {analysis_result['error']}")
                return jsonify({
                    'error': 'Analysis failed',
                    'details': analysis_result['error'],
                    'analysis_id': analysis_id
                }), 500
            
            # Prepare response
            response = {
                'analysis_id': analysis_id,
                'timestamp': datetime.utcnow().isoformat(),
                'success': True,
                'signals': analysis_result['signals'],
                'consensus': analysis_result['consensus'],
                'charts': analysis_result['charts'],
                'correlations': analysis_result['correlations'],
                'performance': analysis_result['performance'],
                'statistics': analysis_result['statistics'],
                'metadata': {
                    'total_bars': analysis_result['metadata']['total_bars'],
                    'date_range': analysis_result['metadata']['date_range'],
                    'indicators_used': analysis_result['metadata']['indicators_used']
                }
            }
            
            logger.info(f"Analysis {analysis_id} completed successfully")
            return jsonify(response), 200
            
        except Exception as e:
            logger.error(f"Analysis endpoint error: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'error': 'Internal server error',
                'details': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
    
    @app.route('/analyze/quick', methods=['POST'])
    def quick_analyze():
        """
        Quick analysis endpoint for real-time signal checks
        
        Optimized for fast response with recent data only
        """
        try:
            request_data = request.get_json()
            if not request_data:
                return jsonify({'error': 'No data provided'}), 400
            
            logger.info("Received quick analysis request")
            
            # Run quick analysis (last 60 days only)
            analysis_id = f"quick_{uuid.uuid4().hex[:8]}"
            analysis_result = analysis_engine.run_quick_analysis(
                analysis_id=analysis_id,
                market_data=request_data['data'][-60:],  # Last 60 data points
                symbols=request_data.get('symbols', [])
            )
            
            if not analysis_result['success']:
                return jsonify({
                    'error': 'Quick analysis failed',
                    'details': analysis_result['error']
                }), 500
            
            response = {
                'analysis_id': analysis_id,
                'timestamp': datetime.utcnow().isoformat(),
                'current_signals': analysis_result['current_signals'],
                'consensus': analysis_result['consensus'],
                'signal_changes': analysis_result['signal_changes'],
                'confidence_scores': analysis_result['confidence_scores']
            }
            
            logger.info(f"Quick analysis {analysis_id} completed")
            return jsonify(response), 200
            
        except Exception as e:
            logger.error(f"Quick analysis error: {str(e)}")
            return jsonify({
                'error': 'Quick analysis failed',
                'details': str(e)
            }), 500
    
    @app.route('/charts/<chart_id>', methods=['GET'])
    def get_chart(chart_id: str):
        """
        Serve generated chart images
        
        Args:
            chart_id: Unique chart identifier
        """
        try:
            chart_path = os.path.join(app.config['CHART_OUTPUT_DIR'], f"{chart_id}.png")
            
            if not os.path.exists(chart_path):
                return jsonify({'error': 'Chart not found'}), 404
            
            return send_file(chart_path, mimetype='image/png')
            
        except Exception as e:
            logger.error(f"Chart serving error: {str(e)}")
            return jsonify({'error': 'Chart serving failed'}), 500
    
    @app.route('/analysis/<analysis_id>', methods=['GET'])
    def get_analysis_result(analysis_id: str):
        """
        Get stored analysis results
        
        Args:
            analysis_id: Analysis identifier
        """
        try:
            result = analysis_engine.get_stored_result(analysis_id)
            
            if not result:
                return jsonify({'error': 'Analysis not found'}), 404
            
            return jsonify(result), 200
            
        except Exception as e:
            logger.error(f"Analysis retrieval error: {str(e)}")
            return jsonify({'error': 'Analysis retrieval failed'}), 500
    
    @app.route('/indicators', methods=['GET'])
    def get_indicators_info():
        """Get information about available indicators"""
        try:
            indicators_info = {
                'utilities_spy': {
                    'name': 'Utilities/SPY Ratio',
                    'description': 'Risk-on/risk-off based on utilities vs market performance',
                    'data_required': ['XLU', 'SPY'],
                    'lookback_period': 21
                },
                'lumber_gold': {
                    'name': 'Lumber/Gold Ratio',
                    'description': 'Economic growth vs safety sentiment',
                    'data_required': ['Lumber', 'Gold'],
                    'lookback_period': 21
                },
                'treasury_curve': {
                    'name': 'Treasury Curve',
                    'description': 'Yield curve analysis for risk assessment',
                    'data_required': ['DGS2', 'DGS10'],
                    'lookback_period': 21
                },
                'vix_defensive': {
                    'name': 'VIX Defensive',
                    'description': 'Volatility-based risk management',
                    'data_required': ['VIX'],
                    'lookback_period': 21
                },
                'sp500_ma': {
                    'name': 'S&P 500 Moving Average',
                    'description': 'Trend-following component',
                    'data_required': ['SPY'],
                    'ma_periods': [50, 200]
                }
            }
            
            return jsonify({
                'indicators': indicators_info,
                'total_count': len(indicators_info),
                'consensus_method': 'weighted_average',
                'supported_timeframes': ['daily']
            }), 200
            
        except Exception as e:
            logger.error(f"Indicators info error: {str(e)}")
            return jsonify({'error': 'Failed to get indicators info'}), 500
    
    @app.route('/config', methods=['GET'])
    def get_config():
        """Get current configuration"""
        try:
            return jsonify({
                'environment': config_name,
                'chart_output_dir': app.config.get('CHART_OUTPUT_DIR'),
                'max_analysis_time': app.config.get('MAX_ANALYSIS_TIME', 300),
                'supported_formats': ['json', 'png', 'html'],
                'api_version': '1.0.0'
            }), 200
        except Exception as e:
            logger.error(f"Config endpoint error: {str(e)}")
            return jsonify({'error': 'Failed to get config'}), 500
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endpoint not found'}), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({'error': 'Method not allowed'}), 405
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({'error': 'Internal server error'}), 500
    
    logger.info(f"Flask app created with config: {config_name}")
    return app

# Create default app instance
app = create_app()

def main():
    """Main entry point for running the Flask server"""
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Gayed Signals Backtrader Analysis API on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )

if __name__ == '__main__':
    main()