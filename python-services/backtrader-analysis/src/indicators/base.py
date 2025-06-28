"""
Base Indicator for Gayed Signals

Provides common functionality for all Gayed signal indicators including
signal strength calculation, confidence measurement, and validation.
"""

import backtrader as bt
import numpy as np
from typing import Dict, Any, Optional, Tuple
from enum import Enum


class SignalType(Enum):
    """Signal types aligned with Node.js dashboard"""
    RISK_ON = "Risk-On"
    RISK_OFF = "Risk-Off"  
    NEUTRAL = "Neutral"


class SignalStrength(Enum):
    """Signal strength levels"""
    STRONG = "Strong"
    MODERATE = "Moderate"
    WEAK = "Weak"


class GayedBaseIndicator(bt.Indicator):
    """
    Base class for all Gayed signal indicators
    
    Provides common functionality including:
    - Signal type determination (Risk-On/Risk-Off/Neutral)
    - Strength calculation (Strong/Moderate/Weak)
    - Confidence scoring (0-1 scale)
    - Data validation
    - Metadata tracking
    """
    
    # Common parameters for all Gayed indicators
    params = (
        ('lookback', 21),          # Default lookback period
        ('min_periods', 10),       # Minimum periods for valid calculation
        ('strong_threshold', 0.05), # Threshold for strong signals
        ('moderate_threshold', 0.02), # Threshold for moderate signals
    )
    
    # Output lines - all indicators will have these
    lines = (
        'signal',         # Numeric signal value
        'strength',       # Signal strength (0=Weak, 1=Moderate, 2=Strong)  
        'confidence',     # Confidence level (0-1)
        'raw_value',      # Raw indicator value before processing
    )
    
    # Plotting configuration
    plotinfo = dict(
        plot=True,
        subplot=True,
        plotname='Gayed Signal',
        plotskip=False,
    )
    
    plotlines = dict(
        signal=dict(marker='o', markersize=4.0, color='blue'),
        strength=dict(marker='s', markersize=3.0, color='green'),
        confidence=dict(marker='^', markersize=3.0, color='red'),
    )
    
    def __init__(self):
        super().__init__()
        
        # Initialize metadata storage
        self.metadata = {}
        self.signal_history = []
        
        # Validation flags
        self._data_valid = False
        self._calculation_valid = False
        
    def validate_data(self, *data_feeds) -> bool:
        """
        Validate input data feeds for calculation
        
        Args:
            *data_feeds: Variable number of data feeds to validate
            
        Returns:
            bool: True if all data is valid for calculation
        """
        if not data_feeds:
            return False
            
        # Check if we have enough data points
        min_length = self.params.lookback + self.params.min_periods
        
        for feed in data_feeds:
            if len(feed) < min_length:
                return False
                
            # Check for valid numeric values
            recent_values = feed.get(size=min_length)
            if any(np.isnan(recent_values)) or any(np.isinf(recent_values)):
                return False
                
            # Check for non-positive values (common in price data)
            if any(val <= 0 for val in recent_values):
                return False
                
        self._data_valid = True
        return True
    
    def calculate_signal_strength(self, raw_value: float, baseline: float = 1.0) -> Tuple[SignalStrength, float]:
        """
        Calculate signal strength and confidence based on raw value
        
        Args:
            raw_value: Raw indicator value
            baseline: Baseline value for comparison (default 1.0 for ratios)
            
        Returns:
            Tuple of (SignalStrength, confidence_score)
        """
        if not np.isfinite(raw_value):
            return SignalStrength.WEAK, 0.1
            
        # Calculate deviation from baseline
        deviation = abs(raw_value - baseline)
        
        # Determine strength
        if deviation > self.params.strong_threshold:
            strength = SignalStrength.STRONG
        elif deviation > self.params.moderate_threshold:
            strength = SignalStrength.MODERATE
        else:
            strength = SignalStrength.WEAK
            
        # Calculate confidence (0-1 scale)
        confidence = min(deviation * 10, 1.0)
        
        return strength, confidence
    
    def determine_signal_type(self, raw_value: float, baseline: float = 1.0) -> SignalType:
        """
        Determine signal type based on raw value
        
        Args:
            raw_value: Raw indicator value
            baseline: Baseline for comparison
            
        Returns:
            SignalType: Risk-On, Risk-Off, or Neutral
        """
        if not np.isfinite(raw_value):
            return SignalType.NEUTRAL
            
        if raw_value > baseline:
            return SignalType.RISK_OFF
        elif raw_value < baseline:
            return SignalType.RISK_ON
        else:
            return SignalType.NEUTRAL
    
    def update_metadata(self, **kwargs):
        """Update indicator metadata"""
        self.metadata.update(kwargs)
        self.metadata['timestamp'] = self.datas[0].datetime.datetime(0).isoformat()
    
    def get_signal_info(self) -> Dict[str, Any]:
        """
        Get current signal information in format compatible with Node.js dashboard
        
        Returns:
            Dict containing signal information
        """
        if len(self.lines.signal) == 0:
            return {}
            
        current_signal = self.lines.signal[0]
        current_strength = self.lines.strength[0] 
        current_confidence = self.lines.confidence[0]
        current_raw = self.lines.raw_value[0]
        
        # Convert numeric values to string representations
        signal_type = (SignalType.RISK_OFF if current_signal > 0 
                      else SignalType.RISK_ON if current_signal < 0 
                      else SignalType.NEUTRAL)
        
        strength_map = {0: SignalStrength.WEAK, 1: SignalStrength.MODERATE, 2: SignalStrength.STRONG}
        strength = strength_map.get(int(current_strength), SignalStrength.WEAK)
        
        return {
            'type': self.__class__.__name__.lower().replace('indicator', ''),
            'signal': signal_type.value,
            'strength': strength.value,
            'confidence': float(current_confidence),
            'rawValue': float(current_raw),
            'date': self.datas[0].datetime.datetime(0).isoformat(),
            'metadata': self.metadata.copy()
        }
    
    def next(self):
        """
        Main calculation method - to be implemented by subclasses
        
        This method should:
        1. Validate input data
        2. Calculate raw indicator value
        3. Determine signal type and strength
        4. Update output lines
        5. Store metadata
        """
        raise NotImplementedError("Subclasses must implement next() method")
    
    def _safe_division(self, numerator: float, denominator: float, default: float = 1.0) -> float:
        """
        Perform safe division with fallback
        
        Args:
            numerator: Numerator value
            denominator: Denominator value  
            default: Default value if division fails
            
        Returns:
            Division result or default value
        """
        if abs(denominator) < 1e-10:  # Near zero
            return default
            
        result = numerator / denominator
        return result if np.isfinite(result) else default
    
    def _calculate_returns(self, prices, periods: int = 1) -> np.ndarray:
        """
        Calculate returns over specified periods
        
        Args:
            prices: Price data feed
            periods: Number of periods for return calculation
            
        Returns:
            Array of returns
        """
        if len(prices) < periods + 1:
            return np.array([])
            
        current_prices = np.array(prices.get(size=len(prices)))
        lagged_prices = np.array(prices.get(size=len(prices), ago=periods))
        
        # Calculate returns: (current / lagged) - 1
        returns = (current_prices / lagged_prices) - 1
        
        # Filter out invalid returns
        valid_returns = returns[np.isfinite(returns)]
        return valid_returns