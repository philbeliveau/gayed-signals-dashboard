"""
VIX Defensive Indicator

Implementation of Michael Gayed's VIX-based defensive signal for
volatility regime identification and risk management.

Uses VIX levels and changes to identify when market fear is rising
and defensive positioning may be warranted.
"""

import backtrader as bt
import numpy as np
from .base import GayedBaseIndicator, SignalType


class VixDefensiveIndicator(GayedBaseIndicator):
    """
    VIX Defensive Signal Indicator
    
    Analyzes VIX levels and momentum to determine when defensive positioning
    is warranted. Uses both absolute VIX levels and rate of change.
    
    Signal Logic:
    - Rising VIX above threshold: Risk-Off (increase in fear/uncertainty)
    - Falling VIX below threshold: Risk-On (decreasing fear/uncertainty)
    - VIX in normal range: Neutral
    """
    
    params = (
        ('lookback', 21),           # Lookback period for VIX change analysis
        ('min_periods', 10),        # Minimum periods required
        ('vix_high_threshold', 25), # High VIX level threshold
        ('vix_low_threshold', 15),  # Low VIX level threshold
        ('change_strong_threshold', 0.20), # Strong change threshold (20%)
        ('change_moderate_threshold', 0.10), # Moderate change threshold (10%)
        ('momentum_period', 5),     # Period for momentum calculation
    )
    
    lines = (
        'vix_level',        # Current VIX level
        'vix_change',       # VIX change over lookback period  
        'vix_momentum',     # Short-term VIX momentum
        'vix_ma',          # Moving average of VIX
        'fear_index',      # Composite fear index (0-100)
    )
    
    plotinfo = dict(
        plotname='VIX Defensive',
        subplot=True,
    )
    
    plotlines = dict(
        vix_level=dict(color='orange', width=2.0),
        vix_ma=dict(color='blue', width=1.5, ls='--'),
        fear_index=dict(color='red', width=1.5),
        signal=dict(color='black', marker='o', markersize=6.0),
    )
    
    def __init__(self):
        super().__init__()
        
        # Ensure we have VIX data
        if len(self.datas) < 1:
            raise ValueError("VixDefensiveIndicator requires VIX data feed")
            
        self.vix_data = self.datas[0]  # VIX data feed
        
        # For moving averages and momentum
        self.vix_history = []
        
    def calculate_vix_momentum(self, current_vix: float) -> float:
        """
        Calculate short-term VIX momentum
        
        Args:
            current_vix: Current VIX level
            
        Returns:
            VIX momentum value
        """
        self.vix_history.append(current_vix)
        
        # Keep history manageable
        momentum_period = self.params.momentum_period
        if len(self.vix_history) > momentum_period * 2:
            self.vix_history = self.vix_history[-momentum_period * 2:]
        
        if len(self.vix_history) < momentum_period:
            return 0.0
        
        # Calculate momentum as rate of change over momentum period
        recent_avg = np.mean(self.vix_history[-momentum_period:])
        past_avg = np.mean(self.vix_history[-momentum_period*2:-momentum_period])
        
        if past_avg > 0:
            return (recent_avg / past_avg) - 1
        return 0.0
    
    def calculate_fear_index(self, vix_level: float, vix_change: float, vix_momentum: float) -> float:
        """
        Calculate composite fear index combining VIX level, change, and momentum
        
        Args:
            vix_level: Current VIX level
            vix_change: VIX change over lookback
            vix_momentum: Short-term VIX momentum
            
        Returns:
            Fear index value (0-100)
        """
        # Normalize VIX level (0-100 scale, with 50 being "normal" around 20 VIX)
        level_score = min(max((vix_level - 10) * 2, 0), 100)
        
        # Change score (positive change increases fear)
        change_score = max(min(vix_change * 100 + 50, 100), 0)
        
        # Momentum score (positive momentum increases fear)
        momentum_score = max(min(vix_momentum * 100 + 50, 100), 0)
        
        # Weighted composite (level has highest weight)
        fear_index = (level_score * 0.5 + change_score * 0.3 + momentum_score * 0.2)
        
        return fear_index
    
    def next(self):
        """Calculate the VIX Defensive signal"""
        
        # Validate we have enough data
        if not self.validate_data(self.vix_data.close):
            # Set default neutral values
            self.lines.signal[0] = 0.0
            self.lines.strength[0] = 0.0
            self.lines.confidence[0] = 0.1
            self.lines.raw_value[0] = 20.0  # Normal VIX level
            self.lines.vix_level[0] = 20.0
            self.lines.vix_change[0] = 0.0
            self.lines.vix_momentum[0] = 0.0
            self.lines.vix_ma[0] = 20.0
            self.lines.fear_index[0] = 50.0
            return
        
        # Get current VIX level
        current_vix = self.vix_data.close[0]
        self.lines.vix_level[0] = current_vix
        self.lines.raw_value[0] = current_vix
        
        # Calculate VIX moving average
        lookback = self.params.lookback
        if len(self.vix_data.close) >= lookback:
            vix_values = [self.vix_data.close[-i] for i in range(lookback)]
            vix_ma = np.mean(vix_values)
        else:
            vix_ma = current_vix
            
        self.lines.vix_ma[0] = vix_ma
        
        # Calculate VIX change over lookback period
        if len(self.vix_data.close) > lookback:
            past_vix = self.vix_data.close[-lookback]
            vix_change = (current_vix / past_vix) - 1 if past_vix > 0 else 0.0
        else:
            vix_change = 0.0
            
        self.lines.vix_change[0] = vix_change
        
        # Calculate VIX momentum
        vix_momentum = self.calculate_vix_momentum(current_vix)
        self.lines.vix_momentum[0] = vix_momentum
        
        # Calculate composite fear index
        fear_index = self.calculate_fear_index(current_vix, vix_change, vix_momentum)
        self.lines.fear_index[0] = fear_index
        
        # Determine signal based on multiple factors
        signal_type = SignalType.NEUTRAL
        
        # Primary signal logic
        if current_vix > self.params.vix_high_threshold and vix_change > 0:
            signal_type = SignalType.RISK_OFF
        elif current_vix < self.params.vix_low_threshold and vix_change < 0:
            signal_type = SignalType.RISK_ON
        elif fear_index > 70:  # High fear regardless of level
            signal_type = SignalType.RISK_OFF
        elif fear_index < 30:  # Low fear
            signal_type = SignalType.RISK_ON
        
        # Calculate strength based on multiple factors
        abs_change = abs(vix_change)
        level_extreme = (current_vix > 30) or (current_vix < 12)
        
        if (abs_change > self.params.change_strong_threshold) or level_extreme:
            strength_value = "Strong"
            strength_numeric = 2.0
        elif abs_change > self.params.change_moderate_threshold:
            strength_value = "Moderate"
            strength_numeric = 1.0
        else:
            strength_value = "Weak"
            strength_numeric = 0.0
        
        # Calculate confidence
        # Higher confidence for extreme VIX levels and significant changes
        level_confidence = 0.0
        if current_vix > 30:
            level_confidence = min((current_vix - 30) / 20, 1.0)
        elif current_vix < 12:
            level_confidence = min((12 - current_vix) / 5, 1.0)
        
        change_confidence = min(abs_change * 5, 1.0)
        momentum_confidence = min(abs(vix_momentum) * 5, 1.0)
        
        confidence = max(level_confidence, change_confidence, momentum_confidence)
        confidence = max(confidence, 0.1)  # Minimum confidence
        
        # Convert signal to numeric
        signal_numeric = (1.0 if signal_type == SignalType.RISK_OFF 
                         else -1.0 if signal_type == SignalType.RISK_ON 
                         else 0.0)
        
        # Update output lines
        self.lines.signal[0] = signal_numeric
        self.lines.strength[0] = strength_numeric
        self.lines.confidence[0] = confidence
        
        # Update metadata
        self.update_metadata(
            vix_level=current_vix,
            vix_change=vix_change,
            vix_momentum=vix_momentum,
            vix_ma=vix_ma,
            fear_index=fear_index,
            lookback=lookback,
            signal_type=signal_type.value,
            strength=strength_value,
            extreme_level=level_extreme
        )
        
        # Store signal history
        signal_info = {
            'date': self.vix_data.datetime.datetime(0).isoformat(),
            'vix_level': current_vix,
            'vix_change': vix_change,
            'vix_momentum': vix_momentum,
            'vix_ma': vix_ma,
            'fear_index': fear_index,
            'signal': signal_type.value,
            'strength': strength_value,
            'confidence': confidence,
            'extreme_level': level_extreme
        }
        self.signal_history.append(signal_info)
        
        # Keep only recent history
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
    
    def get_analysis_data(self) -> dict:
        """Get analysis data for correlation and performance studies"""
        if not self.signal_history:
            return {}
            
        vix_levels = [s['vix_level'] for s in self.signal_history]
        vix_changes = [s['vix_change'] for s in self.signal_history]
        fear_indices = [s['fear_index'] for s in self.signal_history]
        signals = [s['signal'] for s in self.signal_history]
        extreme_periods = [s['extreme_level'] for s in self.signal_history]
        
        return {
            'indicator_type': 'vix_defensive',
            'signal_count': len(self.signal_history),
            'vix_stats': {
                'current_level': vix_levels[-1] if vix_levels else 20.0,
                'mean_level': np.mean(vix_levels),
                'std_level': np.std(vix_levels),
                'min_level': np.min(vix_levels),
                'max_level': np.max(vix_levels),
                'median_level': np.median(vix_levels)
            },
            'change_stats': {
                'mean_change': np.mean(vix_changes),
                'std_change': np.std(vix_changes),
                'max_spike': np.max(vix_changes),
                'max_drop': np.min(vix_changes)
            },
            'fear_stats': {
                'current_fear': fear_indices[-1] if fear_indices else 50.0,
                'mean_fear': np.mean(fear_indices),
                'high_fear_periods': sum(1 for f in fear_indices if f > 70),
                'low_fear_periods': sum(1 for f in fear_indices if f < 30)
            },
            'extreme_periods': {
                'total_periods': len(extreme_periods),
                'extreme_periods': sum(extreme_periods),
                'extreme_rate': sum(extreme_periods) / len(extreme_periods) if extreme_periods else 0.0
            },
            'signal_distribution': {
                'risk_on': signals.count('Risk-On'),
                'risk_off': signals.count('Risk-Off'),
                'neutral': signals.count('Neutral')
            },
            'recent_signals': self.signal_history[-50:] if len(self.signal_history) >= 50 else self.signal_history,
            'correlation_ready': True
        }