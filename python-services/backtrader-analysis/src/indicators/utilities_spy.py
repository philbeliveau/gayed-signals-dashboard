"""
Utilities/SPY Ratio Indicator

Implementation of Michael Gayed's Utilities vs SPY ratio signal for
risk-on/risk-off market regime identification.

When utilities outperform the broader market (SPY), it typically indicates
a risk-off environment as investors seek defensive assets.
"""

import backtrader as bt
import numpy as np
from .base import GayedBaseIndicator, SignalType


class UtilitiesSpyIndicator(GayedBaseIndicator):
    """
    Utilities/SPY Ratio Signal Indicator
    
    Calculates the relative performance of utilities (XLU) vs the broader market (SPY)
    over a specified lookback period. A ratio > 1.0 indicates utilities outperformance
    and suggests a risk-off environment.
    
    Signal Logic:
    - Ratio > 1.0: Risk-Off (utilities outperforming)
    - Ratio < 1.0: Risk-On (market outperforming utilities)
    - Ratio ≈ 1.0: Neutral
    """
    
    # Specific parameters for this indicator
    params = (
        ('lookback', 21),           # Lookback period for return calculation
        ('min_periods', 10),        # Minimum periods required
        ('strong_threshold', 0.05), # Strong signal threshold
        ('moderate_threshold', 0.02), # Moderate signal threshold
    )
    
    # This indicator requires two data feeds: XLU and SPY
    lines = (
        'xlu_return',    # XLU return over lookback period
        'spy_return',    # SPY return over lookback period  
        'ratio',         # XLU/SPY performance ratio
    )
    
    plotinfo = dict(
        plotname='Utilities/SPY Ratio',
        subplot=True,
    )
    
    plotlines = dict(
        ratio=dict(color='blue', width=2.0),
        signal=dict(color='red', marker='o', markersize=6.0),
    )
    
    def __init__(self):
        super().__init__()
        
        # Ensure we have at least 2 data feeds (XLU and SPY)
        if len(self.datas) < 2:
            raise ValueError("UtilitiesSpyIndicator requires 2 data feeds: XLU and SPY")
            
        self.xlu_data = self.datas[0]  # First data feed should be XLU
        self.spy_data = self.datas[1]  # Second data feed should be SPY
        
        # Add reference lines for visualization
        self.plotlines.append(('baseline', dict(color='black', ls='--', alpha=0.5)))
        
    def next(self):
        """Calculate the Utilities/SPY ratio signal"""
        
        # Validate we have enough data
        if not self.validate_data(self.xlu_data.close, self.spy_data.close):
            # Set default neutral values
            self.lines.signal[0] = 0.0
            self.lines.strength[0] = 0.0  # Weak
            self.lines.confidence[0] = 0.1
            self.lines.raw_value[0] = 1.0
            self.lines.xlu_return[0] = 0.0
            self.lines.spy_return[0] = 0.0
            self.lines.ratio[0] = 1.0
            return
        
        # Get current and historical prices
        lookback = self.params.lookback
        
        # Calculate XLU return over lookback period
        xlu_current = self.xlu_data.close[0]
        xlu_past = self.xlu_data.close[-lookback] if len(self.xlu_data.close) > lookback else self.xlu_data.close[0]
        xlu_return = (xlu_current / xlu_past) - 1 if xlu_past > 0 else 0.0
        
        # Calculate SPY return over lookback period  
        spy_current = self.spy_data.close[0]
        spy_past = self.spy_data.close[-lookback] if len(self.spy_data.close) > lookback else self.spy_data.close[0]
        spy_return = (spy_current / spy_past) - 1 if spy_past > 0 else 0.0
        
        # Store individual returns
        self.lines.xlu_return[0] = xlu_return
        self.lines.spy_return[0] = spy_return
        
        # Calculate ratio: (1 + XLU return) / (1 + SPY return)
        xlu_total_return = 1 + xlu_return
        spy_total_return = 1 + spy_return
        
        # Safe division with fallback
        ratio = self._safe_division(xlu_total_return, spy_total_return, 1.0)
        
        # Validate ratio
        if not np.isfinite(ratio):
            ratio = 1.0
            
        self.lines.ratio[0] = ratio
        self.lines.raw_value[0] = ratio
        
        # Determine signal type
        signal_type = self.determine_signal_type(ratio, baseline=1.0)
        
        # Calculate strength and confidence
        strength, confidence = self.calculate_signal_strength(ratio, baseline=1.0)
        
        # Convert to numeric values for lines
        signal_numeric = 1.0 if signal_type == SignalType.RISK_OFF else -1.0 if signal_type == SignalType.RISK_ON else 0.0
        strength_numeric = 2.0 if strength.value == "Strong" else 1.0 if strength.value == "Moderate" else 0.0
        
        # Update output lines
        self.lines.signal[0] = signal_numeric
        self.lines.strength[0] = strength_numeric
        self.lines.confidence[0] = confidence
        
        # Update metadata
        self.update_metadata(
            xlu_return=xlu_return,
            spy_return=spy_return,
            lookback=lookback,
            ratio=ratio,
            signal_type=signal_type.value,
            strength=strength.value
        )
        
        # Store signal history for analysis
        signal_info = {
            'date': self.spy_data.datetime.datetime(0).isoformat(),
            'ratio': ratio,
            'signal': signal_type.value,
            'strength': strength.value,
            'confidence': confidence,
            'xlu_return': xlu_return,
            'spy_return': spy_return
        }
        self.signal_history.append(signal_info)
        
        # Keep only recent history (for memory management)
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
    
    def get_analysis_data(self) -> dict:
        """
        Get analysis data for correlation and performance studies
        
        Returns:
            Dict containing historical signal data and statistics
        """
        if not self.signal_history:
            return {}
            
        ratios = [s['ratio'] for s in self.signal_history]
        signals = [s['signal'] for s in self.signal_history]
        
        return {
            'indicator_type': 'utilities_spy',
            'signal_count': len(self.signal_history),
            'ratio_stats': {
                'mean': np.mean(ratios),
                'std': np.std(ratios),
                'min': np.min(ratios),
                'max': np.max(ratios)
            },
            'signal_distribution': {
                'risk_on': signals.count('Risk-On'),
                'risk_off': signals.count('Risk-Off'),
                'neutral': signals.count('Neutral')
            },
            'recent_signals': self.signal_history[-50:] if len(self.signal_history) >= 50 else self.signal_history,
            'correlation_ready': True
        }