"""
Treasury Curve Indicator

Implementation of Michael Gayed's Treasury yield curve signal for
interest rate environment and economic cycle analysis.

Analyzes the slope and shape of the yield curve to determine risk-on/risk-off
environments. Flattening or inverted curves often signal economic concerns.
"""

import backtrader as bt
import numpy as np
from .base import GayedBaseIndicator, SignalType


class TreasuryCarveIndicator(GayedBaseIndicator):
    """
    Treasury Curve Signal Indicator
    
    Analyzes the yield curve slope and changes to determine market regime.
    Uses multiple yield maturities to assess curve steepness and direction.
    
    Signal Logic:
    - Steepening curve: Risk-On (economic growth expectations)
    - Flattening/Inverting curve: Risk-Off (economic concerns)
    - Stable curve: Neutral
    """
    
    params = (
        ('lookback', 21),           # Lookback period for curve change analysis
        ('min_periods', 10),        # Minimum periods required
        ('strong_threshold', 0.15), # Strong signal threshold (basis points)
        ('moderate_threshold', 0.05), # Moderate signal threshold
        ('curve_smooth_period', 5), # Smoothing period for curve calculations
    )
    
    lines = (
        'curve_slope',      # Current yield curve slope (10Y - 2Y)
        'curve_change',     # Change in curve slope over lookback
        'curve_smooth',     # Smoothed curve slope
        'two_year',         # 2-year yield
        'ten_year',         # 10-year yield
    )
    
    plotinfo = dict(
        plotname='Treasury Curve',
        subplot=True,
    )
    
    plotlines = dict(
        curve_slope=dict(color='blue', width=2.0),
        curve_change=dict(color='green', width=1.5),
        curve_smooth=dict(color='purple', width=1.0, ls='--'),
        signal=dict(color='red', marker='o', markersize=6.0),
    )
    
    def __init__(self):
        super().__init__()
        
        # Ensure we have at least 2 data feeds (2Y and 10Y yields)
        if len(self.datas) < 2:
            raise ValueError("TreasuryCarveIndicator requires 2 data feeds: 2Y and 10Y yields")
            
        self.two_year_data = self.datas[0]  # 2-year Treasury yield (DGS2)
        self.ten_year_data = self.datas[1]  # 10-year Treasury yield (DGS10)
        
        # For smoothing calculations
        self.slope_history = []
        
    def calculate_curve_slope(self) -> tuple:
        """
        Calculate yield curve slope and related metrics
        
        Returns:
            Tuple of (slope, two_year_yield, ten_year_yield)
        """
        two_year_yield = self.two_year_data.close[0]
        ten_year_yield = self.ten_year_data.close[0]
        
        # Curve slope is typically 10Y - 2Y (in percentage points)
        curve_slope = ten_year_yield - two_year_yield
        
        return curve_slope, two_year_yield, ten_year_yield
    
    def smooth_curve_slope(self, current_slope: float) -> float:
        """
        Apply smoothing to curve slope to reduce noise
        
        Args:
            current_slope: Current curve slope value
            
        Returns:
            Smoothed slope value
        """
        self.slope_history.append(current_slope)
        
        # Keep only recent history
        smooth_period = self.params.curve_smooth_period
        if len(self.slope_history) > smooth_period:
            self.slope_history = self.slope_history[-smooth_period:]
            
        # Calculate simple moving average
        return np.mean(self.slope_history)
    
    def next(self):
        """Calculate the Treasury Curve signal"""
        
        # Validate we have enough data
        if not self.validate_data(self.two_year_data.close, self.ten_year_data.close):
            # Set default neutral values
            self.lines.signal[0] = 0.0
            self.lines.strength[0] = 0.0
            self.lines.confidence[0] = 0.1
            self.lines.raw_value[0] = 0.0
            self.lines.curve_slope[0] = 0.0
            self.lines.curve_change[0] = 0.0
            self.lines.curve_smooth[0] = 0.0
            self.lines.two_year[0] = 0.0
            self.lines.ten_year[0] = 0.0
            return
        
        # Calculate current curve metrics
        current_slope, two_year_yield, ten_year_yield = self.calculate_curve_slope()
        
        # Update basic lines
        self.lines.curve_slope[0] = current_slope
        self.lines.two_year[0] = two_year_yield
        self.lines.ten_year[0] = ten_year_yield
        
        # Calculate smoothed slope
        smoothed_slope = self.smooth_curve_slope(current_slope)
        self.lines.curve_smooth[0] = smoothed_slope
        
        # Calculate change in curve slope over lookback period
        lookback = self.params.lookback
        if len(self.slope_history) >= lookback:
            past_slope = self.slope_history[-lookback]
            curve_change = current_slope - past_slope
        else:
            curve_change = 0.0
            
        self.lines.curve_change[0] = curve_change
        self.lines.raw_value[0] = curve_change
        
        # Determine signal based on curve change
        # Positive change (steepening) = Risk-On
        # Negative change (flattening/inverting) = Risk-Off
        if curve_change > 0:
            signal_type = SignalType.RISK_ON
        elif curve_change < 0:
            signal_type = SignalType.RISK_OFF
        else:
            signal_type = SignalType.NEUTRAL
        
        # Calculate strength based on magnitude of change
        abs_change = abs(curve_change)
        
        if abs_change > self.params.strong_threshold:
            strength_value = "Strong"
            strength_numeric = 2.0
        elif abs_change > self.params.moderate_threshold:
            strength_value = "Moderate"  
            strength_numeric = 1.0
        else:
            strength_value = "Weak"
            strength_numeric = 0.0
        
        # Calculate confidence based on change magnitude and curve level
        confidence = min(abs_change * 10, 1.0)
        
        # Additional confidence adjustment for extreme curve positions
        if current_slope < 0:  # Inverted curve is high confidence signal
            confidence = max(confidence, 0.8)
        elif current_slope > 3.0:  # Very steep curve
            confidence = max(confidence, 0.7)
        
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
            curve_slope=current_slope,
            curve_change=curve_change,
            smoothed_slope=smoothed_slope,
            two_year_yield=two_year_yield,
            ten_year_yield=ten_year_yield,
            lookback=lookback,
            signal_type=signal_type.value,
            strength=strength_value,
            inverted=current_slope < 0
        )
        
        # Store signal history
        signal_info = {
            'date': self.two_year_data.datetime.datetime(0).isoformat(),
            'curve_slope': current_slope,
            'curve_change': curve_change,
            'smoothed_slope': smoothed_slope,
            'signal': signal_type.value,
            'strength': strength_value,
            'confidence': confidence,
            'two_year_yield': two_year_yield,
            'ten_year_yield': ten_year_yield,
            'inverted': current_slope < 0
        }
        self.signal_history.append(signal_info)
        
        # Keep only recent history
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
    
    def get_analysis_data(self) -> dict:
        """Get analysis data for correlation and performance studies"""
        if not self.signal_history:
            return {}
            
        slopes = [s['curve_slope'] for s in self.signal_history]
        changes = [s['curve_change'] for s in self.signal_history]
        signals = [s['signal'] for s in self.signal_history]
        inversions = [s['inverted'] for s in self.signal_history]
        
        return {
            'indicator_type': 'treasury_curve',
            'signal_count': len(self.signal_history),
            'curve_stats': {
                'current_slope': slopes[-1] if slopes else 0.0,
                'mean_slope': np.mean(slopes),
                'std_slope': np.std(slopes),
                'min_slope': np.min(slopes),
                'max_slope': np.max(slopes),
                'currently_inverted': slopes[-1] < 0 if slopes else False
            },
            'change_stats': {
                'mean_change': np.mean(changes),
                'std_change': np.std(changes),
                'max_steepening': np.max(changes),
                'max_flattening': np.min(changes)
            },
            'inversion_stats': {
                'total_periods': len(inversions),
                'inverted_periods': sum(inversions),
                'inversion_rate': sum(inversions) / len(inversions) if inversions else 0.0
            },
            'signal_distribution': {
                'risk_on': signals.count('Risk-On'),
                'risk_off': signals.count('Risk-Off'),
                'neutral': signals.count('Neutral')
            },
            'recent_signals': self.signal_history[-50:] if len(self.signal_history) >= 50 else self.signal_history,
            'correlation_ready': True
        }