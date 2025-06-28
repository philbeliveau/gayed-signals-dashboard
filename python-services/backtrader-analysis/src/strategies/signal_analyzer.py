"""
Signal Analyzer Strategy

A specialized strategy focused on analyzing and tracking Gayed signals
without actual trading. Optimized for correlation analysis and visualization.
"""

import backtrader as bt
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

from ..indicators import (
    UtilitiesSpyIndicator,
    LumberGoldIndicator,
    TreasuryCarveIndicator,
    VixDefensiveIndicator,
    SP500MAIndicator
)


class SignalAnalyzerStrategy(bt.Strategy):
    """
    Signal Analysis Strategy
    
    Focused on tracking and analyzing all Gayed signals for:
    - Signal correlation analysis
    - Performance attribution
    - Chart generation data
    - Historical signal tracking
    
    Does not perform actual trading - only signal analysis.
    """
    
    params = (
        # Analysis parameters
        ('analysis_window', 252),          # Analysis window in days (1 year)
        ('correlation_window', 60),        # Rolling correlation window
        ('signal_stability_window', 10),   # Window for signal stability analysis
        
        # Signal tracking parameters
        ('track_all_signals', True),       # Track all individual signals
        ('track_consensus', True),         # Track consensus signals
        ('track_performance', True),       # Track performance attribution
        
        # Data retention parameters
        ('max_history_length', 5000),      # Maximum history length
        ('history_cleanup_threshold', 6000), # When to clean up history
    )
    
    def __init__(self):
        super().__init__()
        
        # Validate data feeds
        required_feeds = 6  # Minimum required data feeds
        if len(self.datas) < required_feeds:
            raise ValueError(f"Strategy requires at least {required_feeds} data feeds")
        
        # Assign data feeds
        self.spy_data = self.datas[0]      # S&P 500 (SPY)
        self.xlu_data = self.datas[1]      # Utilities (XLU)  
        self.lumber_data = self.datas[2]   # Lumber
        self.gold_data = self.datas[3]     # Gold
        self.two_year_data = self.datas[4] # 2-year Treasury
        self.ten_year_data = self.datas[5] # 10-year Treasury
        self.vix_data = self.datas[6] if len(self.datas) > 6 else None  # VIX (optional)
        
        # Initialize indicators
        self.setup_indicators()
        
        # Analysis data storage
        self.signal_history = []
        self.consensus_history = []
        self.correlation_data = defaultdict(list)
        self.performance_data = []
        
        # Tracking variables
        self.current_bar = 0
        self.last_analysis_bar = 0
        
        # Results storage
        self.analysis_results = {
            'signals': {},
            'correlations': {},
            'performance_attribution': {},
            'signal_statistics': {},
            'chart_data': {}
        }
    
    def setup_indicators(self):
        """Initialize all Gayed indicators for analysis"""
        
        # Utilities/SPY Indicator
        self.utilities_spy = UtilitiesSpyIndicator(
            self.xlu_data, self.spy_data,
            lookback=21
        )
        
        # Lumber/Gold Indicator
        self.lumber_gold = LumberGoldIndicator(
            self.lumber_data, self.gold_data,
            lookback=21
        )
        
        # Treasury Curve Indicator
        self.treasury_curve = TreasuryCarveIndicator(
            self.two_year_data, self.ten_year_data,
            lookback=21
        )
        
        # VIX Defensive Indicator (if VIX data available)
        if self.vix_data:
            self.vix_defensive = VixDefensiveIndicator(
                self.vix_data,
                lookback=21
            )
        else:
            self.vix_defensive = None
        
        # S&P 500 MA Indicator
        self.sp500_ma = SP500MAIndicator(
            self.spy_data,
            short_ma_period=50,
            long_ma_period=200
        )
        
        # Store indicators for iteration
        self.indicators = {
            'utilities_spy': self.utilities_spy,
            'lumber_gold': self.lumber_gold,
            'treasury_curve': self.treasury_curve,
            'sp500_ma': self.sp500_ma
        }
        
        if self.vix_defensive:
            self.indicators['vix_defensive'] = self.vix_defensive
    
    def collect_current_signals(self) -> Dict[str, Any]:
        """Collect current signal data from all indicators"""
        current_signals = {}
        
        for name, indicator in self.indicators.items():
            try:
                signal_info = indicator.get_signal_info()
                if signal_info:
                    current_signals[name] = signal_info
            except (IndexError, AttributeError):
                # Indicator not ready yet
                continue
        
        return current_signals
    
    def calculate_consensus_signal(self, individual_signals: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate consensus from individual signals"""
        if not individual_signals:
            return {
                'consensus': 'Mixed',
                'confidence': 0.0,
                'risk_on_count': 0,
                'risk_off_count': 0,
                'total_signals': 0
            }
        
        risk_on_count = 0
        risk_off_count = 0
        neutral_count = 0
        total_confidence = 0.0
        
        for signal_data in individual_signals.values():
            signal_type = signal_data.get('signal', 'Neutral')
            confidence = signal_data.get('confidence', 0.0)
            
            if signal_type == 'Risk-On':
                risk_on_count += 1
            elif signal_type == 'Risk-Off':
                risk_off_count += 1
            else:
                neutral_count += 1
            
            total_confidence += confidence
        
        total_signals = len(individual_signals)
        avg_confidence = total_confidence / total_signals if total_signals > 0 else 0.0
        
        # Determine consensus
        if risk_off_count > risk_on_count and risk_off_count > neutral_count:
            consensus = 'Risk-Off'
        elif risk_on_count > risk_off_count and risk_on_count > neutral_count:
            consensus = 'Risk-On'
        else:
            consensus = 'Mixed'
        
        return {
            'consensus': consensus,
            'confidence': avg_confidence,
            'risk_on_count': risk_on_count,
            'risk_off_count': risk_off_count,
            'neutral_count': neutral_count,
            'total_signals': total_signals
        }
    
    def calculate_correlations(self) -> Dict[str, Any]:
        """Calculate correlations between signals and price movements"""
        if len(self.signal_history) < self.params.correlation_window:
            return {}
        
        correlations = {}
        
        # Get recent data
        recent_signals = self.signal_history[-self.params.correlation_window:]
        
        # Extract price changes
        prices = [s['price'] for s in recent_signals]
        price_returns = []
        for i in range(1, len(prices)):
            if prices[i-1] > 0:
                price_returns.append((prices[i] / prices[i-1]) - 1)
        
        if len(price_returns) < 10:
            return {}
        
        # Calculate correlations for each signal
        for signal_name in self.indicators.keys():
            signal_values = []
            
            for signal_data in recent_signals[1:]:  # Skip first to match price_returns length
                if signal_name in signal_data.get('individual_signals', {}):
                    signal_info = signal_data['individual_signals'][signal_name]
                    # Convert signal to numeric (-1, 0, 1)
                    if signal_info.get('signal') == 'Risk-On':
                        signal_values.append(-1)
                    elif signal_info.get('signal') == 'Risk-Off':
                        signal_values.append(1)
                    else:
                        signal_values.append(0)
                else:
                    signal_values.append(0)
            
            if len(signal_values) == len(price_returns):
                try:
                    correlation = np.corrcoef(signal_values, price_returns)[0, 1]
                    if not np.isnan(correlation):
                        correlations[signal_name] = float(correlation)
                except:
                    correlations[signal_name] = 0.0
        
        return correlations
    
    def analyze_signal_performance(self) -> Dict[str, Any]:
        """Analyze how well signals predict price movements"""
        if len(self.signal_history) < 30:
            return {}
        
        performance_analysis = {}
        
        for signal_name in self.indicators.keys():
            signal_performance = {
                'accuracy': 0.0,
                'precision': 0.0,
                'recall': 0.0,
                'total_signals': 0,
                'correct_predictions': 0
            }
            
            correct_predictions = 0
            total_predictions = 0
            
            # Look at signal vs next-day price movement
            for i in range(len(self.signal_history) - 1):
                current_data = self.signal_history[i]
                next_data = self.signal_history[i + 1]
                
                if (signal_name in current_data.get('individual_signals', {}) and 
                    'price' in current_data and 'price' in next_data):
                    
                    signal_info = current_data['individual_signals'][signal_name]
                    signal_type = signal_info.get('signal', 'Neutral')
                    
                    # Calculate next-day price movement
                    price_change = (next_data['price'] - current_data['price']) / current_data['price']
                    
                    if signal_type != 'Neutral':
                        total_predictions += 1
                        
                        # Check if prediction was correct
                        if ((signal_type == 'Risk-On' and price_change > 0) or
                            (signal_type == 'Risk-Off' and price_change < 0)):
                            correct_predictions += 1
            
            if total_predictions > 0:
                signal_performance['accuracy'] = correct_predictions / total_predictions
                signal_performance['total_signals'] = total_predictions
                signal_performance['correct_predictions'] = correct_predictions
            
            performance_analysis[signal_name] = signal_performance
        
        return performance_analysis
    
    def next(self):
        """Main analysis logic executed on each bar"""
        self.current_bar += 1
        
        # Skip if not enough data
        if len(self.spy_data) < 50:
            return
        
        # Collect current signals
        individual_signals = self.collect_current_signals()
        
        # Calculate consensus
        consensus_info = self.calculate_consensus_signal(individual_signals)
        
        # Store signal data
        signal_record = {
            'date': self.spy_data.datetime.datetime(0).isoformat(),
            'bar': self.current_bar,
            'price': self.spy_data.close[0],
            'volume': getattr(self.spy_data, 'volume', [0])[0] if hasattr(self.spy_data, 'volume') else 0,
            'individual_signals': individual_signals,
            'consensus': consensus_info
        }
        
        self.signal_history.append(signal_record)
        
        # Periodic analysis updates
        if self.current_bar % 10 == 0:  # Every 10 bars
            self.update_analysis_results()
        
        # Cleanup old data if needed
        if len(self.signal_history) > self.params.history_cleanup_threshold:
            self.signal_history = self.signal_history[-self.params.max_history_length:]
    
    def update_analysis_results(self):
        """Update comprehensive analysis results"""
        
        # Update correlations
        correlations = self.calculate_correlations()
        if correlations:
            self.analysis_results['correlations'] = correlations
        
        # Update performance attribution
        performance = self.analyze_signal_performance()
        if performance:
            self.analysis_results['performance_attribution'] = performance
        
        # Update signal statistics
        self.analysis_results['signal_statistics'] = self.calculate_signal_statistics()
        
        # Update chart data
        self.analysis_results['chart_data'] = self.prepare_chart_data()
    
    def calculate_signal_statistics(self) -> Dict[str, Any]:
        """Calculate comprehensive signal statistics"""
        if not self.signal_history:
            return {}
        
        stats = {}
        
        for signal_name in self.indicators.keys():
            signal_stats = {
                'total_signals': 0,
                'risk_on_signals': 0,
                'risk_off_signals': 0,
                'neutral_signals': 0,
                'avg_confidence': 0.0,
                'signal_distribution': {},
                'recent_trend': 'Neutral'
            }
            
            confidences = []
            recent_signals = []
            
            for record in self.signal_history:
                if signal_name in record.get('individual_signals', {}):
                    signal_info = record['individual_signals'][signal_name]
                    signal_type = signal_info.get('signal', 'Neutral')
                    confidence = signal_info.get('confidence', 0.0)
                    
                    signal_stats['total_signals'] += 1
                    confidences.append(confidence)
                    
                    if signal_type == 'Risk-On':
                        signal_stats['risk_on_signals'] += 1
                    elif signal_type == 'Risk-Off':
                        signal_stats['risk_off_signals'] += 1
                    else:
                        signal_stats['neutral_signals'] += 1
                    
                    # Track recent signals (last 20)
                    recent_signals.append(signal_type)
                    if len(recent_signals) > 20:
                        recent_signals = recent_signals[-20:]
            
            if confidences:
                signal_stats['avg_confidence'] = np.mean(confidences)
            
            # Calculate recent trend
            if len(recent_signals) >= 10:
                recent_risk_on = recent_signals[-10:].count('Risk-On')
                recent_risk_off = recent_signals[-10:].count('Risk-Off')
                
                if recent_risk_on > recent_risk_off:
                    signal_stats['recent_trend'] = 'Risk-On'
                elif recent_risk_off > recent_risk_on:
                    signal_stats['recent_trend'] = 'Risk-Off'
                else:
                    signal_stats['recent_trend'] = 'Mixed'
            
            stats[signal_name] = signal_stats
        
        return stats
    
    def prepare_chart_data(self) -> Dict[str, Any]:
        """Prepare data for chart generation"""
        if not self.signal_history:
            return {}
        
        chart_data = {
            'dates': [],
            'prices': [],
            'volumes': [],
            'signals': {},
            'consensus': []
        }
        
        # Get recent data for charting
        recent_data = self.signal_history[-min(len(self.signal_history), 500):]
        
        for record in recent_data:
            chart_data['dates'].append(record['date'])
            chart_data['prices'].append(record['price'])
            chart_data['volumes'].append(record.get('volume', 0))
            chart_data['consensus'].append(record['consensus'])
            
            # Add individual signal data
            for signal_name, signal_info in record.get('individual_signals', {}).items():
                if signal_name not in chart_data['signals']:
                    chart_data['signals'][signal_name] = []
                chart_data['signals'][signal_name].append(signal_info)
        
        return chart_data
    
    def get_analysis_results(self) -> Dict[str, Any]:
        """Get comprehensive analysis results"""
        # Ensure analysis is up to date
        self.update_analysis_results()
        
        return {
            'analysis_results': self.analysis_results,
            'signal_history': self.signal_history[-100:] if self.signal_history else [],
            'total_bars_analyzed': self.current_bar,
            'indicators_analyzed': list(self.indicators.keys()),
            'data_summary': {
                'total_records': len(self.signal_history),
                'date_range': {
                    'start': self.signal_history[0]['date'] if self.signal_history else None,
                    'end': self.signal_history[-1]['date'] if self.signal_history else None
                }
            }
        }