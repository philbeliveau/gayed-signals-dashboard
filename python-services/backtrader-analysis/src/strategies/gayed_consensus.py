"""
Gayed Consensus Strategy

Implements a comprehensive strategy that combines all 5 Gayed signals
to generate consensus risk-on/risk-off signals with position sizing
and risk management.
"""

import backtrader as bt
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

from ..indicators import (
    UtilitiesSpyIndicator,
    LumberGoldIndicator,
    TreasuryCarveIndicator,
    VixDefensiveIndicator,
    SP500MAIndicator
)


class GayedConsensusStrategy(bt.Strategy):
    """
    Gayed Consensus Strategy
    
    Combines all 5 Gayed signals to generate consensus risk-on/risk-off signals:
    1. Utilities/SPY Ratio
    2. Lumber/Gold Ratio
    3. Treasury Curve
    4. VIX Defensive
    5. S&P 500 Moving Average
    
    Strategy generates signals based on consensus and individual signal strength.
    """
    
    params = (
        # Signal weight parameters
        ('utilities_spy_weight', 0.25),     # Weight for utilities/spy signal
        ('lumber_gold_weight', 0.20),       # Weight for lumber/gold signal
        ('treasury_curve_weight', 0.20),    # Weight for treasury curve signal
        ('vix_defensive_weight', 0.20),     # Weight for VIX defensive signal
        ('sp500_ma_weight', 0.15),          # Weight for S&P 500 MA signal
        
        # Consensus parameters
        ('min_signals_required', 3),        # Minimum signals required for consensus
        ('consensus_threshold', 0.6),       # Threshold for consensus (60%)
        ('strong_consensus_threshold', 0.8), # Threshold for strong consensus (80%)
        
        # Position sizing parameters
        ('max_position_size', 1.0),         # Maximum position size (100%)
        ('base_position_size', 0.5),        # Base position size (50%)
        ('size_scaling_factor', 0.3),       # Additional sizing based on consensus strength
        
        # Risk management parameters
        ('stop_loss_pct', 0.05),            # Stop loss percentage (5%)
        ('take_profit_pct', 0.15),          # Take profit percentage (15%)
        ('max_holding_days', 60),           # Maximum holding period in days
        ('min_holding_days', 5),            # Minimum holding period in days
        
        # Rebalancing parameters
        ('rebalance_frequency', 5),         # Rebalance every N days
        ('signal_lookback', 10),            # Lookback for signal stability
        
        # Analysis parameters
        ('track_performance', True),        # Track detailed performance metrics
        ('save_signal_history', True),      # Save signal history for analysis
    )
    
    def __init__(self):
        super().__init__()
        
        # Validate data feeds
        if len(self.datas) < 6:  # SPY + XLU + Lumber + Gold + 2Y + 10Y + VIX
            raise ValueError("Strategy requires at least 6 data feeds")
        
        # Assign data feeds
        self.spy_data = self.datas[0]      # S&P 500 (SPY)
        self.xlu_data = self.datas[1]      # Utilities (XLU)
        self.lumber_data = self.datas[2]   # Lumber
        self.gold_data = self.datas[3]     # Gold
        self.two_year_data = self.datas[4] # 2-year Treasury
        self.ten_year_data = self.datas[5] # 10-year Treasury
        self.vix_data = self.datas[6] if len(self.datas) > 6 else self.spy_data  # VIX
        
        # Initialize indicators
        self.setup_indicators()
        
        # Strategy state
        self.consensus_signals = []
        self.signal_history = []
        self.position_entry_date = None
        self.position_entry_price = None
        self.days_in_position = 0
        self.last_rebalance_date = None
        
        # Performance tracking
        self.performance_metrics = {
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'total_pnl': 0.0,
            'max_drawdown': 0.0,
            'current_drawdown': 0.0,
            'peak_value': 0.0,
            'signal_accuracy': defaultdict(int),
            'signal_counts': defaultdict(int)
        }
        
        # Analysis data
        self.analysis_data = {
            'signals': [],
            'positions': [],
            'trades': [],
            'correlations': {},
            'attribution': {}
        }
    
    def setup_indicators(self):
        """Initialize all Gayed indicators"""
        
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
        
        # VIX Defensive Indicator
        self.vix_defensive = VixDefensiveIndicator(
            self.vix_data,
            lookback=21
        )
        
        # S&P 500 MA Indicator
        self.sp500_ma = SP500MAIndicator(
            self.spy_data,
            short_ma_period=50,
            long_ma_period=200
        )
        
        # Store indicators for easy iteration
        self.indicators = {
            'utilities_spy': self.utilities_spy,
            'lumber_gold': self.lumber_gold,
            'treasury_curve': self.treasury_curve,
            'vix_defensive': self.vix_defensive,
            'sp500_ma': self.sp500_ma
        }
        
        # Signal weights
        self.signal_weights = {
            'utilities_spy': self.params.utilities_spy_weight,
            'lumber_gold': self.params.lumber_gold_weight,
            'treasury_curve': self.params.treasury_curve_weight,
            'vix_defensive': self.params.vix_defensive_weight,
            'sp500_ma': self.params.sp500_ma_weight
        }
    
    def calculate_consensus(self) -> Dict[str, Any]:
        """
        Calculate consensus signal from all indicators
        
        Returns:
            Dict containing consensus information
        """
        current_signals = {}
        valid_signals = 0
        risk_on_score = 0.0
        risk_off_score = 0.0
        total_confidence = 0.0
        
        # Collect signals from all indicators
        for name, indicator in self.indicators.items():
            try:
                if len(indicator.lines.signal) > 0:
                    signal_value = indicator.lines.signal[0]
                    confidence = indicator.lines.confidence[0]
                    strength = indicator.lines.strength[0]
                    
                    # Convert numeric signal to string
                    if signal_value > 0:
                        signal_type = 'Risk-Off'
                    elif signal_value < 0:
                        signal_type = 'Risk-On'
                    else:
                        signal_type = 'Neutral'
                    
                    current_signals[name] = {
                        'signal': signal_type,
                        'confidence': confidence,
                        'strength': strength,
                        'weight': self.signal_weights[name]
                    }
                    
                    # Calculate weighted scores
                    if signal_type == 'Risk-On':
                        risk_on_score += confidence * self.signal_weights[name]
                    elif signal_type == 'Risk-Off':
                        risk_off_score += confidence * self.signal_weights[name]
                    
                    total_confidence += confidence * self.signal_weights[name]
                    valid_signals += 1
                    
            except (IndexError, AttributeError):
                # Indicator not ready yet
                continue
        
        # Determine consensus
        if valid_signals < self.params.min_signals_required:
            consensus = 'Mixed'
            consensus_strength = 'Weak'
            consensus_confidence = 0.1
        else:
            total_score = risk_on_score + risk_off_score
            if total_score > 0:
                risk_on_pct = risk_on_score / total_score
                risk_off_pct = risk_off_score / total_score
            else:
                risk_on_pct = risk_off_pct = 0.5
            
            # Determine consensus
            if risk_off_pct > self.params.consensus_threshold:
                consensus = 'Risk-Off'
            elif risk_on_pct > self.params.consensus_threshold:
                consensus = 'Risk-On'
            else:
                consensus = 'Mixed'
            
            # Determine strength
            max_pct = max(risk_on_pct, risk_off_pct)
            if max_pct > self.params.strong_consensus_threshold:
                consensus_strength = 'Strong'
            elif max_pct > self.params.consensus_threshold:
                consensus_strength = 'Moderate'
            else:
                consensus_strength = 'Weak'
            
            consensus_confidence = total_confidence / valid_signals if valid_signals > 0 else 0.1
        
        return {
            'date': self.spy_data.datetime.datetime(0).isoformat(),
            'consensus': consensus,
            'strength': consensus_strength,
            'confidence': consensus_confidence,
            'risk_on_score': risk_on_score,
            'risk_off_score': risk_off_score,
            'valid_signals': valid_signals,
            'individual_signals': current_signals
        }
    
    def calculate_position_size(self, consensus_info: Dict[str, Any]) -> float:
        """
        Calculate position size based on consensus strength and confidence
        
        Args:
            consensus_info: Consensus information from calculate_consensus()
            
        Returns:
            Position size as fraction of capital
        """
        if consensus_info['consensus'] == 'Mixed':
            return 0.0
        
        base_size = self.params.base_position_size
        
        # Scale based on consensus strength
        strength_multiplier = {
            'Strong': 1.0,
            'Moderate': 0.75,
            'Weak': 0.5
        }.get(consensus_info['strength'], 0.5)
        
        # Scale based on confidence
        confidence_multiplier = consensus_info['confidence']
        
        # Additional scaling based on number of confirming signals
        signal_multiplier = min(consensus_info['valid_signals'] / 5.0, 1.0)
        
        # Calculate final size
        total_multiplier = strength_multiplier * confidence_multiplier * signal_multiplier
        position_size = base_size + (self.params.size_scaling_factor * total_multiplier)
        
        # Cap at maximum position size
        return min(position_size, self.params.max_position_size)
    
    def should_enter_position(self, consensus_info: Dict[str, Any]) -> bool:
        """
        Determine if we should enter a new position
        
        Args:
            consensus_info: Current consensus information
            
        Returns:
            True if should enter position
        """
        # Don't enter if already in position
        if self.position:
            return False
        
        # Require clear consensus
        if consensus_info['consensus'] == 'Mixed':
            return False
        
        # Require minimum confidence
        if consensus_info['confidence'] < 0.3:
            return False
        
        # Require minimum number of signals
        if consensus_info['valid_signals'] < self.params.min_signals_required:
            return False
        
        return True
    
    def should_exit_position(self, consensus_info: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Determine if we should exit current position
        
        Args:
            consensus_info: Current consensus information
            
        Returns:
            Tuple of (should_exit, reason)
        """
        if not self.position:
            return False, "No position"
        
        current_price = self.spy_data.close[0]
        
        # Stop loss check
        if self.position.size > 0:  # Long position
            if current_price < self.position_entry_price * (1 - self.params.stop_loss_pct):
                return True, "Stop loss"
        else:  # Short position
            if current_price > self.position_entry_price * (1 + self.params.stop_loss_pct):
                return True, "Stop loss"
        
        # Take profit check
        if self.position.size > 0:  # Long position
            if current_price > self.position_entry_price * (1 + self.params.take_profit_pct):
                return True, "Take profit"
        else:  # Short position
            if current_price < self.position_entry_price * (1 - self.params.take_profit_pct):
                return True, "Take profit"
        
        # Maximum holding period
        if self.days_in_position > self.params.max_holding_days:
            return True, "Max holding period"
        
        # Signal reversal (but only after minimum holding period)
        if self.days_in_position > self.params.min_holding_days:
            if self.position.size > 0 and consensus_info['consensus'] == 'Risk-Off':
                return True, "Signal reversal"
            elif self.position.size < 0 and consensus_info['consensus'] == 'Risk-On':
                return True, "Signal reversal"
        
        return False, "Hold"
    
    def next(self):
        """Main strategy logic executed on each bar"""
        
        # Skip if not enough data
        if len(self.spy_data) < 50:
            return
        
        # Calculate current consensus
        consensus_info = self.calculate_consensus()
        
        # Store consensus history
        if self.params.save_signal_history:
            self.consensus_signals.append(consensus_info)
            if len(self.consensus_signals) > 1000:
                self.consensus_signals = self.consensus_signals[-500:]
        
        # Update days in position
        if self.position:
            self.days_in_position += 1
        
        # Check for position exit
        should_exit, exit_reason = self.should_exit_position(consensus_info)
        if should_exit:
            self.close()
            self.log_trade('EXIT', exit_reason, consensus_info)
            self.days_in_position = 0
            self.position_entry_date = None
            self.position_entry_price = None
        
        # Check for position entry
        elif self.should_enter_position(consensus_info):
            position_size = self.calculate_position_size(consensus_info)
            
            if position_size > 0:
                if consensus_info['consensus'] == 'Risk-On':
                    # Go long
                    self.buy(size=position_size)
                    self.log_trade('LONG', 'Risk-On consensus', consensus_info)
                elif consensus_info['consensus'] == 'Risk-Off':
                    # Go short (or defensive positioning)
                    self.sell(size=position_size)
                    self.log_trade('SHORT', 'Risk-Off consensus', consensus_info)
                
                self.position_entry_date = self.spy_data.datetime.datetime(0)
                self.position_entry_price = self.spy_data.close[0]
                self.days_in_position = 0
        
        # Update performance metrics
        self.update_performance_metrics()
        
        # Store analysis data
        if self.params.track_performance:
            self.store_analysis_data(consensus_info)
    
    def log_trade(self, action: str, reason: str, consensus_info: Dict[str, Any]):
        """Log trade information"""
        print(f"{self.spy_data.datetime.date(0)} | {action} | {reason} | "
              f"Consensus: {consensus_info['consensus']} ({consensus_info['strength']}) | "
              f"Confidence: {consensus_info['confidence']:.2f} | "
              f"Price: {self.spy_data.close[0]:.2f}")
    
    def update_performance_metrics(self):
        """Update performance tracking metrics"""
        if not self.position:
            return
        
        current_value = self.broker.getvalue()
        
        # Update peak value and drawdown
        if current_value > self.performance_metrics['peak_value']:
            self.performance_metrics['peak_value'] = current_value
            self.performance_metrics['current_drawdown'] = 0.0
        else:
            drawdown = (self.performance_metrics['peak_value'] - current_value) / self.performance_metrics['peak_value']
            self.performance_metrics['current_drawdown'] = drawdown
            self.performance_metrics['max_drawdown'] = max(self.performance_metrics['max_drawdown'], drawdown)
    
    def store_analysis_data(self, consensus_info: Dict[str, Any]):
        """Store data for post-analysis"""
        analysis_record = {
            'date': self.spy_data.datetime.datetime(0).isoformat(),
            'price': self.spy_data.close[0],
            'consensus': consensus_info,
            'position_size': self.position.size if self.position else 0,
            'portfolio_value': self.broker.getvalue(),
            'individual_indicators': {}
        }
        
        # Store individual indicator data
        for name, indicator in self.indicators.items():
            try:
                analysis_record['individual_indicators'][name] = indicator.get_analysis_data()
            except:
                continue
        
        self.analysis_data['signals'].append(analysis_record)
        
        # Keep data manageable
        if len(self.analysis_data['signals']) > 2000:
            self.analysis_data['signals'] = self.analysis_data['signals'][-1000:]
    
    def get_analysis_results(self) -> Dict[str, Any]:
        """
        Get comprehensive analysis results
        
        Returns:
            Dict containing all analysis data and performance metrics
        """
        return {
            'performance_metrics': self.performance_metrics,
            'consensus_signals': self.consensus_signals[-100:] if self.consensus_signals else [],
            'analysis_data': self.analysis_data,
            'strategy_params': dict(self.params._getitems()),
            'indicator_analysis': {
                name: indicator.get_analysis_data() 
                for name, indicator in self.indicators.items()
            }
        }