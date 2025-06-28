"""
Lumber/Gold Ratio Indicator

Implementation of Michael Gayed's Lumber vs Gold ratio signal for
economic growth vs safety sentiment analysis.

When lumber outperforms gold, it indicates economic optimism and growth expectations.
When gold outperforms lumber, it suggests economic concerns and flight to safety.
"""

import backtrader as bt
import numpy as np
from .base import GayedBaseIndicator, SignalType


class LumberGoldIndicator(GayedBaseIndicator):
    """
    Lumber/Gold Ratio Signal Indicator
    
    Calculates the relative performance of lumber vs gold over a specified
    lookback period. Lumber represents economic growth expectations while
    gold represents safety/defensive positioning.
    
    Signal Logic:
    - Ratio > baseline: Risk-On (lumber outperforming, growth optimism)
    - Ratio < baseline: Risk-Off (gold outperforming, defensive positioning)
    - Ratio ≈ baseline: Neutral
    """
    
    params = (
        ('lookback', 21),           # Lookback period for return calculation
        ('min_periods', 10),        # Minimum periods required
        ('strong_threshold', 0.08), # Strong signal threshold (lumber/gold more volatile)
        ('moderate_threshold', 0.04), # Moderate signal threshold
        ('baseline_period', 252),   # Period for calculating baseline ratio
    )
    
    lines = (
        'lumber_return',    # Lumber return over lookback period
        'gold_return',      # Gold return over lookback period
        'ratio',           # Lumber/Gold performance ratio
        'baseline',        # Moving baseline for ratio comparison
    )
    
    plotinfo = dict(
        plotname='Lumber/Gold Ratio',
        subplot=True,
    )
    
    plotlines = dict(
        ratio=dict(color='brown', width=2.0),
        baseline=dict(color='gold', width=1.0, ls='--'),
        signal=dict(color='red', marker='o', markersize=6.0),
    )
    
    def __init__(self):
        super().__init__()
        
        # Ensure we have at least 2 data feeds (Lumber and Gold)
        if len(self.datas) < 2:
            raise ValueError("LumberGoldIndicator requires 2 data feeds: Lumber and Gold")
            
        self.lumber_data = self.datas[0]  # First data feed should be Lumber
        self.gold_data = self.datas[1]    # Second data feed should be Gold
        
        # Initialize baseline calculation
        self.baseline_values = []
        
    def calculate_baseline(self) -> float:
        """
        Calculate the baseline ratio for comparison
        Uses a moving average of historical ratios to establish normal levels
        """
        if len(self.baseline_values) < self.params.baseline_period:
            return 1.0  # Default baseline
            
        # Use median instead of mean for more robust baseline
        return np.median(self.baseline_values[-self.params.baseline_period:])
    
    def next(self):
        """Calculate the Lumber/Gold ratio signal"""
        
        # Validate we have enough data
        if not self.validate_data(self.lumber_data.close, self.gold_data.close):
            # Set default neutral values
            self.lines.signal[0] = 0.0
            self.lines.strength[0] = 0.0
            self.lines.confidence[0] = 0.1
            self.lines.raw_value[0] = 1.0
            self.lines.lumber_return[0] = 0.0
            self.lines.gold_return[0] = 0.0
            self.lines.ratio[0] = 1.0
            self.lines.baseline[0] = 1.0
            return
        
        lookback = self.params.lookback
        
        # Calculate Lumber return over lookback period
        lumber_current = self.lumber_data.close[0]
        lumber_past = (self.lumber_data.close[-lookback] 
                      if len(self.lumber_data.close) > lookback 
                      else self.lumber_data.close[0])
        lumber_return = (lumber_current / lumber_past) - 1 if lumber_past > 0 else 0.0
        
        # Calculate Gold return over lookback period
        gold_current = self.gold_data.close[0]
        gold_past = (self.gold_data.close[-lookback] 
                    if len(self.gold_data.close) > lookback 
                    else self.gold_data.close[0])
        gold_return = (gold_current / gold_past) - 1 if gold_past > 0 else 0.0
        
        # Store individual returns
        self.lines.lumber_return[0] = lumber_return
        self.lines.gold_return[0] = gold_return
        
        # Calculate ratio: (1 + Lumber return) / (1 + Gold return)
        lumber_total_return = 1 + lumber_return
        gold_total_return = 1 + gold_return
        
        # Safe division with fallback
        ratio = self._safe_division(lumber_total_return, gold_total_return, 1.0)
        
        # Validate ratio
        if not np.isfinite(ratio):
            ratio = 1.0
            
        self.lines.ratio[0] = ratio
        self.lines.raw_value[0] = ratio
        
        # Update baseline values and calculate current baseline
        self.baseline_values.append(ratio)
        current_baseline = self.calculate_baseline()
        self.lines.baseline[0] = current_baseline
        
        # Determine signal type using dynamic baseline
        signal_type = self.determine_signal_type(ratio, baseline=current_baseline)
        
        # Calculate strength and confidence using baseline
        deviation = abs(ratio - current_baseline) / current_baseline if current_baseline > 0 else 0
        
        if deviation > self.params.strong_threshold:
            strength_value = "Strong"
            strength_numeric = 2.0
        elif deviation > self.params.moderate_threshold:
            strength_value = "Moderate"
            strength_numeric = 1.0
        else:
            strength_value = "Weak"
            strength_numeric = 0.0
            
        confidence = min(deviation * 5, 1.0)  # Scale confidence for lumber/gold volatility
        
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
            lumber_return=lumber_return,
            gold_return=gold_return,
            lookback=lookback,
            ratio=ratio,
            baseline=current_baseline,
            deviation=deviation,
            signal_type=signal_type.value,
            strength=strength_value
        )
        
        # Store signal history
        signal_info = {
            'date': self.lumber_data.datetime.datetime(0).isoformat(),
            'ratio': ratio,
            'baseline': current_baseline,
            'signal': signal_type.value,
            'strength': strength_value,
            'confidence': confidence,
            'lumber_return': lumber_return,
            'gold_return': gold_return,
            'deviation': deviation
        }
        self.signal_history.append(signal_info)
        
        # Keep only recent history
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
            
        # Keep baseline values manageable
        if len(self.baseline_values) > self.params.baseline_period * 2:
            self.baseline_values = self.baseline_values[-self.params.baseline_period:]
    
    def get_analysis_data(self) -> dict:
        """Get analysis data for correlation and performance studies"""
        if not self.signal_history:
            return {}
            
        ratios = [s['ratio'] for s in self.signal_history]
        baselines = [s['baseline'] for s in self.signal_history]
        signals = [s['signal'] for s in self.signal_history]
        deviations = [s['deviation'] for s in self.signal_history]
        
        return {
            'indicator_type': 'lumber_gold',
            'signal_count': len(self.signal_history),
            'ratio_stats': {
                'mean': np.mean(ratios),
                'std': np.std(ratios),
                'min': np.min(ratios),
                'max': np.max(ratios)
            },
            'baseline_stats': {
                'mean': np.mean(baselines),
                'std': np.std(baselines),
                'current': baselines[-1] if baselines else 1.0
            },
            'deviation_stats': {
                'mean': np.mean(deviations),
                'std': np.std(deviations),
                'max': np.max(deviations)
            },
            'signal_distribution': {
                'risk_on': signals.count('Risk-On'),
                'risk_off': signals.count('Risk-Off'),
                'neutral': signals.count('Neutral')
            },
            'recent_signals': self.signal_history[-50:] if len(self.signal_history) >= 50 else self.signal_history,
            'correlation_ready': True
        }