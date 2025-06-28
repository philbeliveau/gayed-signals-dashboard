"""
Backtrader Analysis Engine

Core engine that orchestrates Backtrader analysis with Gayed signals
and generates results for the API endpoints.
"""

import os
import sys
import tempfile
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import uuid

import backtrader as bt
import pandas as pd
import numpy as np
import structlog

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ..strategies import SignalAnalyzerStrategy, GayedConsensusStrategy
from ..charts import ChartGenerator
from ..analysis import CorrelationAnalyzer, PerformanceAttribution
from ..utils.data_processor import DataProcessor
from ..utils.logger import setup_logger

logger = setup_logger(__name__)


class BacktraderAnalysisEngine:
    """
    Main analysis engine that coordinates Backtrader analysis
    
    Handles:
    - Data preparation and validation
    - Backtrader strategy execution
    - Chart generation
    - Results processing and storage
    """
    
    def __init__(self):
        self.chart_generator = ChartGenerator()
        self.correlation_analyzer = CorrelationAnalyzer()
        self.performance_attribution = PerformanceAttribution()
        self.data_processor = DataProcessor()
        
        # Results storage
        self.analysis_cache = {}
        
        # Analysis configuration
        self.default_config = {
            'initial_capital': 100000,
            'commission': 0.001,
            'slippage': 0.001,
            'generate_charts': True,
            'chart_format': 'png',
            'analysis_mode': 'signal_analysis'  # or 'trading_simulation'
        }
    
    def run_analysis(self, analysis_id: str, market_data: List[Dict], 
                    symbols: List[str], start_date: Optional[str] = None,
                    end_date: Optional[str] = None, config: Dict = None) -> Dict[str, Any]:
        """
        Run comprehensive Backtrader analysis
        
        Args:
            analysis_id: Unique analysis identifier
            market_data: List of market data records
            symbols: List of symbols to analyze
            start_date: Analysis start date
            end_date: Analysis end date
            config: Analysis configuration
            
        Returns:
            Analysis results dictionary
        """
        try:
            logger.info(f"Starting analysis {analysis_id} with {len(market_data)} data points")
            
            # Merge configuration
            analysis_config = {**self.default_config, **(config or {})}
            
            # Process and validate data
            processed_data = self.data_processor.process_market_data(
                market_data, symbols, start_date, end_date
            )
            
            if not processed_data['success']:
                return {
                    'success': False,
                    'error': f"Data processing failed: {processed_data['error']}"
                }
            
            # Create Backtrader Cerebro engine
            cerebro = bt.Cerebro()
            
            # Set initial capital and costs
            cerebro.broker.setcash(analysis_config['initial_capital'])
            cerebro.broker.setcommission(commission=analysis_config['commission'])
            
            # Add data feeds to cerebro
            data_feeds = self._create_data_feeds(processed_data['data'])
            for feed in data_feeds:
                cerebro.adddata(feed)
            
            # Add strategy based on analysis mode
            if analysis_config['analysis_mode'] == 'trading_simulation':
                cerebro.addstrategy(GayedConsensusStrategy)
            else:
                cerebro.addstrategy(SignalAnalyzerStrategy)
            
            # Run analysis
            logger.info(f"Running Backtrader analysis for {analysis_id}")
            results = cerebro.run()
            
            if not results:
                return {
                    'success': False,
                    'error': 'Backtrader analysis failed to produce results'
                }
            
            strategy = results[0]
            
            # Get analysis results from strategy
            strategy_results = strategy.get_analysis_results()
            
            # Generate charts if requested
            charts = {}
            if analysis_config['generate_charts']:
                charts = self._generate_charts(
                    analysis_id, processed_data['data'], strategy_results, analysis_config
                )
            
            # Perform correlation analysis
            correlations = self.correlation_analyzer.analyze_correlations(
                strategy_results['analysis_results']['chart_data']
            )
            
            # Perform performance attribution
            performance = self.performance_attribution.analyze_performance(
                strategy_results
            )
            
            # Prepare final results
            final_results = {
                'success': True,
                'analysis_id': analysis_id,
                'timestamp': datetime.utcnow().isoformat(),
                'signals': self._extract_signals(strategy_results),
                'consensus': self._extract_consensus(strategy_results),
                'charts': charts,
                'correlations': correlations,
                'performance': performance,
                'statistics': self._calculate_statistics(strategy_results),
                'metadata': {
                    'total_bars': strategy_results['total_bars_analyzed'],
                    'date_range': strategy_results['data_summary']['date_range'],
                    'indicators_used': strategy_results['indicators_analyzed'],
                    'analysis_config': analysis_config
                }
            }
            
            # Cache results
            self.analysis_cache[analysis_id] = final_results
            
            logger.info(f"Analysis {analysis_id} completed successfully")
            return final_results
            
        except Exception as e:
            logger.error(f"Analysis {analysis_id} failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'analysis_id': analysis_id
            }
    
    def run_quick_analysis(self, analysis_id: str, market_data: List[Dict], 
                          symbols: List[str]) -> Dict[str, Any]:
        """
        Run quick analysis for real-time signal checking
        
        Args:
            analysis_id: Analysis identifier
            market_data: Recent market data (limited)
            symbols: Symbols to analyze
            
        Returns:
            Quick analysis results
        """
        try:
            logger.info(f"Running quick analysis {analysis_id}")
            
            # Process data with minimal validation
            processed_data = self.data_processor.process_market_data(
                market_data, symbols, validate_completeness=False
            )
            
            if not processed_data['success']:
                return {
                    'success': False,
                    'error': f"Quick data processing failed: {processed_data['error']}"
                }
            
            # Create simplified Cerebro engine
            cerebro = bt.Cerebro()
            cerebro.broker.setcash(100000)
            
            # Add data feeds
            data_feeds = self._create_data_feeds(processed_data['data'])
            for feed in data_feeds:
                cerebro.adddata(feed)
            
            # Add signal analyzer strategy only
            cerebro.addstrategy(SignalAnalyzerStrategy, track_performance=False)
            
            # Run quick analysis
            results = cerebro.run()
            strategy = results[0]
            strategy_results = strategy.get_analysis_results()
            
            # Extract current signals only
            current_signals = self._extract_current_signals(strategy_results)
            consensus = self._extract_current_consensus(strategy_results)
            
            return {
                'success': True,
                'analysis_id': analysis_id,
                'current_signals': current_signals,
                'consensus': consensus,
                'signal_changes': self._detect_signal_changes(strategy_results),
                'confidence_scores': self._extract_confidence_scores(strategy_results)
            }
            
        except Exception as e:
            logger.error(f"Quick analysis {analysis_id} failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_data_feeds(self, processed_data: Dict) -> List[bt.feeds.PandasData]:
        """
        Create Backtrader data feeds from processed data
        
        Args:
            processed_data: Processed market data dictionary
            
        Returns:
            List of Backtrader data feeds
        """
        data_feeds = []
        
        for symbol, df in processed_data.items():
            if isinstance(df, pd.DataFrame) and not df.empty:
                # Ensure required columns exist
                required_columns = ['open', 'high', 'low', 'close', 'volume']
                for col in required_columns:
                    if col not in df.columns:
                        if col == 'volume':
                            df[col] = 0  # Default volume
                        else:
                            # Forward fill from close price
                            df[col] = df['close']
                
                # Create Backtrader data feed
                data_feed = bt.feeds.PandasData(
                    dataname=df,
                    datetime=None,  # Use index as datetime
                    open='open',
                    high='high',
                    low='low',
                    close='close',
                    volume='volume',
                    openinterest=None
                )
                
                data_feeds.append(data_feed)
        
        return data_feeds
    
    def _generate_charts(self, analysis_id: str, data: Dict, 
                        strategy_results: Dict, config: Dict) -> Dict[str, str]:
        """
        Generate analysis charts
        
        Args:
            analysis_id: Analysis identifier
            data: Market data
            strategy_results: Strategy analysis results
            config: Chart configuration
            
        Returns:
            Dictionary of chart URLs/paths
        """
        charts = {}
        
        try:
            chart_data = strategy_results['analysis_results']['chart_data']
            
            # Main price and signals chart
            main_chart_path = self.chart_generator.create_main_chart(
                analysis_id, chart_data, format=config['chart_format']
            )
            if main_chart_path:
                charts['main_chart'] = f"/charts/{analysis_id}_main"
            
            # Correlation matrix chart
            if strategy_results['analysis_results']['correlations']:
                corr_chart_path = self.chart_generator.create_correlation_chart(
                    analysis_id, strategy_results['analysis_results']['correlations']
                )
                if corr_chart_path:
                    charts['correlation_matrix'] = f"/charts/{analysis_id}_correlation"
            
            # Individual signal charts
            for signal_name in strategy_results['indicators_analyzed']:
                signal_chart_path = self.chart_generator.create_signal_chart(
                    analysis_id, signal_name, chart_data
                )
                if signal_chart_path:
                    charts[f'{signal_name}_chart'] = f"/charts/{analysis_id}_{signal_name}"
            
            logger.info(f"Generated {len(charts)} charts for analysis {analysis_id}")
            
        except Exception as e:
            logger.error(f"Chart generation failed for {analysis_id}: {str(e)}")
        
        return charts
    
    def _extract_signals(self, strategy_results: Dict) -> List[Dict]:
        """Extract signal information from strategy results"""
        signals = []
        
        try:
            signal_history = strategy_results.get('signal_history', [])
            
            # Get recent signals (last 100)
            recent_signals = signal_history[-100:] if len(signal_history) > 100 else signal_history
            
            for record in recent_signals:
                for signal_name, signal_data in record.get('individual_signals', {}).items():
                    signals.append({
                        'date': record['date'],
                        'type': signal_name,
                        'signal': signal_data.get('signal', 'Neutral'),
                        'strength': signal_data.get('strength', 'Weak'),
                        'confidence': signal_data.get('confidence', 0.0),
                        'rawValue': signal_data.get('rawValue', 0.0),
                        'metadata': signal_data.get('metadata', {})
                    })
        
        except Exception as e:
            logger.error(f"Signal extraction failed: {str(e)}")
        
        return signals
    
    def _extract_consensus(self, strategy_results: Dict) -> List[Dict]:
        """Extract consensus signal information"""
        consensus_signals = []
        
        try:
            signal_history = strategy_results.get('signal_history', [])
            
            for record in signal_history[-50:]:  # Last 50 consensus signals
                consensus_info = record.get('consensus', {})
                if consensus_info:
                    consensus_signals.append({
                        'date': record['date'],
                        'consensus': consensus_info.get('consensus', 'Mixed'),
                        'confidence': consensus_info.get('confidence', 0.0),
                        'risk_on_count': consensus_info.get('risk_on_count', 0),
                        'risk_off_count': consensus_info.get('risk_off_count', 0),
                        'total_signals': consensus_info.get('total_signals', 0)
                    })
        
        except Exception as e:
            logger.error(f"Consensus extraction failed: {str(e)}")
        
        return consensus_signals
    
    def _calculate_statistics(self, strategy_results: Dict) -> Dict[str, Any]:
        """Calculate comprehensive statistics from strategy results"""
        stats = {}
        
        try:
            signal_stats = strategy_results['analysis_results'].get('signal_statistics', {})
            
            for signal_name, signal_data in signal_stats.items():
                stats[signal_name] = {
                    'total_signals': signal_data.get('total_signals', 0),
                    'risk_on_percentage': (
                        signal_data.get('risk_on_signals', 0) / 
                        max(signal_data.get('total_signals', 1), 1) * 100
                    ),
                    'risk_off_percentage': (
                        signal_data.get('risk_off_signals', 0) / 
                        max(signal_data.get('total_signals', 1), 1) * 100
                    ),
                    'average_confidence': signal_data.get('avg_confidence', 0.0),
                    'recent_trend': signal_data.get('recent_trend', 'Neutral')
                }
        
        except Exception as e:
            logger.error(f"Statistics calculation failed: {str(e)}")
        
        return stats
    
    def _extract_current_signals(self, strategy_results: Dict) -> Dict[str, Any]:
        """Extract only current (latest) signals for quick analysis"""
        current_signals = {}
        
        try:
            signal_history = strategy_results.get('signal_history', [])
            if signal_history:
                latest_record = signal_history[-1]
                current_signals = latest_record.get('individual_signals', {})
        
        except Exception as e:
            logger.error(f"Current signals extraction failed: {str(e)}")
        
        return current_signals
    
    def _extract_current_consensus(self, strategy_results: Dict) -> Dict[str, Any]:
        """Extract current consensus for quick analysis"""
        current_consensus = {}
        
        try:
            signal_history = strategy_results.get('signal_history', [])
            if signal_history:
                latest_record = signal_history[-1]
                current_consensus = latest_record.get('consensus', {})
        
        except Exception as e:
            logger.error(f"Current consensus extraction failed: {str(e)}")
        
        return current_consensus
    
    def _detect_signal_changes(self, strategy_results: Dict) -> Dict[str, Any]:
        """Detect recent signal changes"""
        signal_changes = {}
        
        try:
            signal_history = strategy_results.get('signal_history', [])
            if len(signal_history) >= 2:
                current = signal_history[-1]
                previous = signal_history[-2]
                
                current_signals = current.get('individual_signals', {})
                previous_signals = previous.get('individual_signals', {})
                
                for signal_name in current_signals:
                    if signal_name in previous_signals:
                        current_signal = current_signals[signal_name].get('signal')
                        previous_signal = previous_signals[signal_name].get('signal')
                        
                        if current_signal != previous_signal:
                            signal_changes[signal_name] = {
                                'from': previous_signal,
                                'to': current_signal,
                                'date': current['date']
                            }
        
        except Exception as e:
            logger.error(f"Signal change detection failed: {str(e)}")
        
        return signal_changes
    
    def _extract_confidence_scores(self, strategy_results: Dict) -> Dict[str, float]:
        """Extract current confidence scores for all signals"""
        confidence_scores = {}
        
        try:
            current_signals = self._extract_current_signals(strategy_results)
            for signal_name, signal_data in current_signals.items():
                confidence_scores[signal_name] = signal_data.get('confidence', 0.0)
        
        except Exception as e:
            logger.error(f"Confidence scores extraction failed: {str(e)}")
        
        return confidence_scores
    
    def get_stored_result(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Get previously stored analysis result
        
        Args:
            analysis_id: Analysis identifier
            
        Returns:
            Stored analysis result or None
        """
        return self.analysis_cache.get(analysis_id)
    
    def cleanup_old_results(self, max_age_hours: int = 24):
        """
        Clean up old analysis results from cache
        
        Args:
            max_age_hours: Maximum age of results to keep
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        to_remove = []
        for analysis_id, result in self.analysis_cache.items():
            try:
                result_time = datetime.fromisoformat(result['timestamp'].replace('Z', '+00:00'))
                if result_time < cutoff_time:
                    to_remove.append(analysis_id)
            except:
                to_remove.append(analysis_id)  # Remove invalid entries
        
        for analysis_id in to_remove:
            del self.analysis_cache[analysis_id]
        
        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} old analysis results")