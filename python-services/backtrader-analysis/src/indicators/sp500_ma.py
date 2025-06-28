"""
S&P 500 Moving Average Indicator

Implementation of Michael Gayed's S&P 500 moving average signal for
trend-following and momentum analysis.

Uses multiple moving averages to determine market trend and generate
risk-on/risk-off signals based on price momentum.
"""

import backtrader as bt
import numpy as np
from .base import GayedBaseIndicator, SignalType


class SP500MAIndicator(GayedBaseIndicator):
    """
    S&P 500 Moving Average Signal Indicator
    
    Analyzes S&P 500 price relative to multiple moving averages to determine
    trend strength and direction. Uses both short and long-term averages.
    
    Signal Logic:
    - Price above rising MA: Risk-On (uptrend)
    - Price below falling MA: Risk-Off (downtrend)
    - Price near MA with unclear trend: Neutral
    """
    
    params = (
        ('short_ma_period', 50),    # Short-term moving average period
        ('long_ma_period', 200),    # Long-term moving average period
        ('lookback', 21),           # Lookback for trend change analysis
        ('min_periods', 10),        # Minimum periods required
        ('strong_threshold', 0.05), # Strong signal threshold (5%)
        ('moderate_threshold', 0.02), # Moderate signal threshold (2%)
        ('trend_confirmation_period', 5), # Periods to confirm trend
    )
    
    lines = (
        'price',            # Current S&P 500 price
        'short_ma',         # Short-term moving average
        'long_ma',          # Long-term moving average
        'short_ma_slope',   # Slope of short MA
        'long_ma_slope',    # Slope of long MA
        'price_vs_short',   # Price relative to short MA (%)
        'price_vs_long',    # Price relative to long MA (%)
        'trend_strength',   # Overall trend strength
    )
    
    plotinfo = dict(
        plotname='S&P 500 Moving Average',
        subplot=False,  # Plot on main price chart
    )
    
    plotlines = dict(
        price=dict(color='black', width=2.0),
        short_ma=dict(color='blue', width=1.5),
        long_ma=dict(color='red', width=1.5),
        signal=dict(color='green', marker='o', markersize=6.0),
    )
    
    def __init__(self):
        super().__init__()
        
        # Ensure we have S&P 500 data
        if len(self.datas) < 1:
            raise ValueError("SP500MAIndicator requires S&P 500 data feed")
            
        self.sp500_data = self.datas[0]  # S&P 500 data feed
        
        # Initialize moving average calculations
        self.short_ma_values = []
        self.long_ma_values = []
        self.price_history = []
        
    def calculate_moving_averages(self, current_price: float) -> tuple:
        """
        Calculate short and long-term moving averages
        
        Args:
            current_price: Current S&P 500 price
            
        Returns:
            Tuple of (short_ma, long_ma)
        """
        self.price_history.append(current_price)
        
        # Keep history manageable
        max_history = max(self.params.short_ma_period, self.params.long_ma_period) * 2
        if len(self.price_history) > max_history:
            self.price_history = self.price_history[-max_history:]
        
        # Calculate short MA
        if len(self.price_history) >= self.params.short_ma_period:
            short_ma = np.mean(self.price_history[-self.params.short_ma_period:])
        else:
            short_ma = np.mean(self.price_history)
            
        # Calculate long MA
        if len(self.price_history) >= self.params.long_ma_period:
            long_ma = np.mean(self.price_history[-self.params.long_ma_period:])
        else:
            long_ma = np.mean(self.price_history)
        
        return short_ma, long_ma
    
    def calculate_ma_slope(self, ma_values: list, periods: int = 5) -> float:
        """
        Calculate the slope of a moving average
        
        Args:
            ma_values: List of moving average values
            periods: Number of periods to calculate slope over
            
        Returns:
            Slope value (positive = rising, negative = falling)
        """
        if len(ma_values) < periods:
            return 0.0
            
        recent_values = ma_values[-periods:]
        if len(recent_values) < 2:
            return 0.0
            
        # Calculate slope as percentage change per period
        start_value = recent_values[0]
        end_value = recent_values[-1]
        
        if start_value > 0:
            slope = ((end_value / start_value) ** (1/periods)) - 1
        else:
            slope = 0.0
            
        return slope
    
    def calculate_trend_strength(self, price: float, short_ma: float, long_ma: float, 
                               short_slope: float, long_slope: float) -> float:
        """
        Calculate overall trend strength
        
        Args:
            price: Current price
            short_ma: Short-term moving average
            long_ma: Long-term moving average
            short_slope: Short MA slope
            long_slope: Long MA slope
            
        Returns:
            Trend strength value (0-100)
        """
        # Price position relative to MAs
        if short_ma > 0:
            short_position = (price - short_ma) / short_ma
        else:
            short_position = 0.0
            
        if long_ma > 0:
            long_position = (price - long_ma) / long_ma
        else:
            long_position = 0.0
        
        # MA alignment (short MA vs long MA)
        if long_ma > 0:
            ma_alignment = (short_ma - long_ma) / long_ma
        else:
            ma_alignment = 0.0
        
        # Slope consistency (both MAs trending same direction)
        slope_consistency = 1.0 if (short_slope * long_slope) > 0 else 0.0
        
        # Combine factors
        position_score = (short_position * 0.4 + long_position * 0.3) * 50 + 50
        alignment_score = ma_alignment * 25 + 50
        slope_score = (short_slope * 0.6 + long_slope * 0.4) * 100 + 50
        
        # Weighted combination
        trend_strength = (position_score * 0.4 + alignment_score * 0.3 + 
                         slope_score * 0.3 + slope_consistency * 10)
        
        return max(0, min(100, trend_strength))
    
    def next(self):
        """Calculate the S&P 500 Moving Average signal"""
        
        # Validate we have enough data
        if not self.validate_data(self.sp500_data.close):
            # Set default neutral values
            self.lines.signal[0] = 0.0
            self.lines.strength[0] = 0.0
            self.lines.confidence[0] = 0.1
            self.lines.raw_value[0] = 0.0
            return
        
        # Get current price
        current_price = self.sp500_data.close[0]
        self.lines.price[0] = current_price
        
        # Calculate moving averages
        short_ma, long_ma = self.calculate_moving_averages(current_price)
        self.lines.short_ma[0] = short_ma
        self.lines.long_ma[0] = long_ma
        
        # Store MA values for slope calculation
        self.short_ma_values.append(short_ma)
        self.long_ma_values.append(long_ma)
        
        # Keep MA history manageable
        if len(self.short_ma_values) > 50:
            self.short_ma_values = self.short_ma_values[-25:]
        if len(self.long_ma_values) > 50:
            self.long_ma_values = self.long_ma_values[-25:]
        
        # Calculate MA slopes
        short_slope = self.calculate_ma_slope(self.short_ma_values)
        long_slope = self.calculate_ma_slope(self.long_ma_values)
        self.lines.short_ma_slope[0] = short_slope
        self.lines.long_ma_slope[0] = long_slope
        
        # Calculate price relative to MAs
        price_vs_short = ((current_price - short_ma) / short_ma) if short_ma > 0 else 0.0
        price_vs_long = ((current_price - long_ma) / long_ma) if long_ma > 0 else 0.0
        self.lines.price_vs_short[0] = price_vs_short
        self.lines.price_vs_long[0] = price_vs_long
        
        # Calculate trend strength
        trend_strength = self.calculate_trend_strength(current_price, short_ma, long_ma, 
                                                     short_slope, long_slope)
        self.lines.trend_strength[0] = trend_strength
        self.lines.raw_value[0] = trend_strength
        
        # Determine signal based on multiple factors
        signal_type = SignalType.NEUTRAL
        
        # Primary signal logic
        if (current_price > short_ma and current_price > long_ma and 
            short_slope > 0 and long_slope > 0):
            signal_type = SignalType.RISK_ON
        elif (current_price < short_ma and current_price < long_ma and 
              short_slope < 0 and long_slope < 0):
            signal_type = SignalType.RISK_OFF
        elif trend_strength > 70:
            signal_type = SignalType.RISK_ON
        elif trend_strength < 30:
            signal_type = SignalType.RISK_OFF
        
        # Calculate strength based on trend clarity
        price_deviation = max(abs(price_vs_short), abs(price_vs_long))
        slope_magnitude = max(abs(short_slope), abs(long_slope))
        
        if price_deviation > self.params.strong_threshold and slope_magnitude > 0.01:
            strength_value = "Strong"
            strength_numeric = 2.0
        elif price_deviation > self.params.moderate_threshold or slope_magnitude > 0.005:
            strength_value = "Moderate"
            strength_numeric = 1.0
        else:
            strength_value = "Weak"
            strength_numeric = 0.0
        
        # Calculate confidence
        # Higher confidence when price is clearly above/below MAs and MAs are trending
        position_confidence = min(price_deviation * 10, 1.0)
        slope_confidence = min(slope_magnitude * 50, 1.0)
        alignment_confidence = 0.8 if (short_slope * long_slope) > 0 else 0.3
        
        confidence = max(position_confidence, slope_confidence) * alignment_confidence
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
            price=current_price,
            short_ma=short_ma,
            long_ma=long_ma,
            short_slope=short_slope,
            long_slope=long_slope,
            price_vs_short=price_vs_short,
            price_vs_long=price_vs_long,
            trend_strength=trend_strength,
            signal_type=signal_type.value,
            strength=strength_value
        )
        
        # Store signal history
        signal_info = {
            'date': self.sp500_data.datetime.datetime(0).isoformat(),
            'price': current_price,
            'short_ma': short_ma,
            'long_ma': long_ma,
            'short_slope': short_slope,
            'long_slope': long_slope,
            'price_vs_short': price_vs_short,
            'price_vs_long': price_vs_long,
            'trend_strength': trend_strength,
            'signal': signal_type.value,
            'strength': strength_value,
            'confidence': confidence
        }
        self.signal_history.append(signal_info)
        
        # Keep only recent history
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
    
    def get_analysis_data(self) -> dict:
        """Get analysis data for correlation and performance studies"""
        if not self.signal_history:
            return {}
            
        prices = [s['price'] for s in self.signal_history]
        short_mas = [s['short_ma'] for s in self.signal_history]
        long_mas = [s['long_ma'] for s in self.signal_history]
        trend_strengths = [s['trend_strength'] for s in self.signal_history]
        signals = [s['signal'] for s in self.signal_history]
        
        return {
            'indicator_type': 'sp500_ma',
            'signal_count': len(self.signal_history),
            'price_stats': {
                'current_price': prices[-1] if prices else 0.0,
                'mean_price': np.mean(prices),
                'std_price': np.std(prices),
                'min_price': np.min(prices),
                'max_price': np.max(prices)
            },
            'ma_stats': {
                'current_short_ma': short_mas[-1] if short_mas else 0.0,
                'current_long_ma': long_mas[-1] if long_mas else 0.0,
                'short_ma_mean': np.mean(short_mas),
                'long_ma_mean': np.mean(long_mas)
            },
            'trend_stats': {
                'current_trend_strength': trend_strengths[-1] if trend_strengths else 50.0,
                'mean_trend_strength': np.mean(trend_strengths),
                'strong_trend_periods': sum(1 for t in trend_strengths if t > 70 or t < 30),
                'weak_trend_periods': sum(1 for t in trend_strengths if 40 <= t <= 60)
            },
            'signal_distribution': {
                'risk_on': signals.count('Risk-On'),
                'risk_off': signals.count('Risk-Off'),
                'neutral': signals.count('Neutral')
            },
            'recent_signals': self.signal_history[-50:] if len(self.signal_history) >= 50 else self.signal_history,
            'correlation_ready': True
        }