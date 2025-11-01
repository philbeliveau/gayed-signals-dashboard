"""
Story 4.0d Task 3: Gayed 8-Month Timing Signal
Refactored from apps/web/src/domains/trading-signals/engines/gayed-signals/sp500-ma.ts
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

from signals.calculators.base_calculator import BaseSignalCalculator
from signals.types import (
    SignalType,
    SignalStatus,
    CalculationContext,
    OHLCData,
    InsufficientDataError,
)


# ===== INPUT/OUTPUT TYPES =====

class Gayed8MonthInput:
    """Input data for Gayed 8-Month signal"""

    def __init__(self, spy: List[OHLCData], date: datetime):
        self.spy = spy
        self.date = date


class Gayed8MonthOutput:
    """Output data for Gayed 8-Month signal"""

    def __init__(
        self,
        current_price: Decimal,
        short_ma: Decimal,
        long_ma: Decimal,
        spread: Decimal,
        signal: str,
        confidence: float,
        strength: str,
        trend_classification: str,
        ma_spread: Decimal,
        crossover: str,
        above_short_ma: bool,
        above_long_ma: bool,
    ):
        self.current_price = current_price
        self.short_ma = short_ma
        self.long_ma = long_ma
        self.spread = spread
        self.signal = signal
        self.confidence = confidence
        self.strength = strength
        self.trend_classification = trend_classification
        self.ma_spread = ma_spread
        self.crossover = crossover
        self.above_short_ma = above_short_ma
        self.above_long_ma = above_long_ma


# ===== PARAMETERS =====

class Gayed8MonthParams:
    """Parameters for Gayed 8-Month signal"""
    short_period: int = 8
    long_period: int = 9
    minimum_data_points: int = 20


# ===== CALCULATOR =====

class Gayed8MonthCalculator(
    BaseSignalCalculator[
        Gayed8MonthInput,
        Gayed8MonthOutput,
        Gayed8MonthParams
    ]
):
    """
    Gayed 8-Month Timing Signal Calculator

    Calculates moving average crossover signal using 8-month and 9-month periods.
    Originally designed for monthly data but adapted for daily granularity.

    Signal Logic:
    - Bullish: Short MA > Long MA (uptrend)
    - Bearish: Short MA < Long MA (downtrend)
    - Neutral: Mixed signals

    Strength based on:
    - Distance from moving averages
    - Crossover detection
    - Trend classification
    """

    async def fetch_data(
        self,
        context: CalculationContext
    ) -> Gayed8MonthInput:
        """
        Fetch SPY price data from Railway PostgreSQL

        Args:
            context: Calculation context with date

        Returns:
            Gayed8MonthInput with SPY data
        """
        params = self.config.parameters
        lookback_days = params.get('minimumDataPoints', 20) * 30  # Convert months to days

        start_date = context.date - timedelta(days=lookback_days)

        spy_data = await self.market_data_repo.get_market_data(
            symbol='SPY',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        return Gayed8MonthInput(spy=spy_data, date=context.date)

    async def calculate(
        self,
        data: Gayed8MonthInput,
        context: CalculationContext
    ) -> Gayed8MonthOutput:
        """
        Calculate 8-month moving average signal

        Args:
            data: Input data with SPY prices
            context: Calculation context

        Returns:
            Gayed8MonthOutput with signal calculation

        Raises:
            InsufficientDataError: If not enough data points
        """
        params = self.config.parameters
        short_period = params.get('shortPeriod', 8)
        long_period = params.get('longPeriod', 9)
        min_data_points = params.get('minimumDataPoints', 20)

        # Filter data up to calculation date
        relevant = [d for d in data.spy if d.date <= data.date]

        if len(relevant) < min_data_points:
            raise InsufficientDataError(
                f"Need {min_data_points} points, got {len(relevant)}",
                required=min_data_points,
                actual=len(relevant)
            )

        # Get current price
        current_price = relevant[-1].close

        # Calculate moving averages (using monthly periods converted to days)
        short_ma = self._calculate_ma(relevant, short_period * 20)  # ~8 months * 20 trading days
        long_ma = self._calculate_ma(relevant, long_period * 20)     # ~9 months * 20 trading days

        # Calculate spread percentage
        spread = ((short_ma - long_ma) / long_ma) * Decimal('100')

        # Determine position relative to moving averages
        above_short_ma = current_price > short_ma
        above_long_ma = current_price > long_ma

        # Classify trend and determine signal
        if above_short_ma and above_long_ma:
            signal = 'Risk-On'
            trend_classification = 'strong_uptrend'
        elif not above_short_ma and not above_long_ma:
            signal = 'Risk-Off'
            trend_classification = 'strong_downtrend'
        else:
            signal = 'Neutral'
            trend_classification = 'short_term_bullish' if above_short_ma else 'long_term_bullish'

        # Calculate signal strength based on distance from MAs
        short_ma_distance = ((current_price - short_ma) / short_ma) * Decimal('100')
        long_ma_distance = ((current_price - long_ma) / long_ma) * Decimal('100')
        avg_distance = abs((short_ma_distance + long_ma_distance) / Decimal('2'))

        if avg_distance > Decimal('5.0'):
            strength = 'Strong'
        elif avg_distance > Decimal('2.0'):
            strength = 'Moderate'
        else:
            strength = 'Weak'

        # Calculate confidence
        if signal == 'Neutral':
            # Mixed signals have lower confidence
            confidence = max(0.1, 0.5 - float(avg_distance) / 20)
        else:
            # Clear directional signals - confidence increases with distance
            base_confidence = 0.6
            distance_bonus = min(float(avg_distance) / 10, 0.4)
            confidence = min(base_confidence + distance_bonus, 1.0)

        # Calculate MA spread
        ma_spread = ((short_ma - long_ma) / long_ma) * Decimal('100')

        # Check for crossover
        crossover = self._check_ma_crossover(relevant, short_period * 20, long_period * 20)

        return Gayed8MonthOutput(
            current_price=current_price,
            short_ma=short_ma,
            long_ma=long_ma,
            spread=spread,
            signal=signal,
            confidence=confidence,
            strength=strength,
            trend_classification=trend_classification,
            ma_spread=ma_spread,
            crossover=crossover,
            above_short_ma=above_short_ma,
            above_long_ma=above_long_ma,
        )

    def get_signal_metadata(self) -> Dict[str, Any]:
        """Get signal metadata for documentation"""
        return {
            'description': 'Gayed 8-Month Timing Signal',
            'interpretation': 'Bullish when current price above both 8-month and 9-month moving averages',
            'thresholds': {
                'strong_bullish': 5.0,
                'moderate_bullish': 2.0,
                'neutral': 0.0,
                'moderate_bearish': -2.0,
                'strong_bearish': -5.0,
            },
            'signal_meanings': {
                'Risk-On': 'Price above both moving averages - bullish trend',
                'Risk-Off': 'Price below both moving averages - bearish trend',
                'Neutral': 'Mixed signals - uncertain trend',
            },
            'methodology': 'Moving average crossover using 8-month and 9-month simple moving averages'
        }

    def extract_numeric_value(self, result: Gayed8MonthOutput) -> float:
        """Extract numeric value for signal strength"""
        return float(result.spread)

    def calculate_strength(self, result: Gayed8MonthOutput) -> float:
        """
        Calculate signal strength normalized to -1 to 1 range
        Clips at ±10% spread
        """
        spread = float(result.spread)
        return max(-1.0, min(1.0, spread / 10.0))

    def determine_status(self, result: Gayed8MonthOutput) -> SignalStatus:
        """
        Determine signal status from result

        - BULLISH: Spread > 2%
        - BEARISH: Spread < -2%
        - NEUTRAL: Between -2% and 2%
        """
        spread = float(result.spread)

        if spread > 2.0:
            return SignalStatus.BULLISH
        elif spread < -2.0:
            return SignalStatus.BEARISH
        else:
            return SignalStatus.NEUTRAL

    # ===== PRIVATE HELPER METHODS =====

    def _calculate_ma(self, data: List[OHLCData], period: int) -> Decimal:
        """
        Calculate simple moving average for given period

        Args:
            data: OHLC data points
            period: Number of periods for MA

        Returns:
            Moving average value
        """
        if len(data) < period:
            period = len(data)  # Use available data if less than period

        recent = data[-period:]
        total = sum(d.close for d in recent)
        return total / Decimal(str(period))

    def _check_ma_crossover(
        self,
        data: List[OHLCData],
        short_period: int,
        long_period: int
    ) -> str:
        """
        Check for recent MA crossover

        Args:
            data: OHLC data points
            short_period: Short MA period
            long_period: Long MA period

        Returns:
            Crossover status: 'bullish_crossover', 'bearish_crossover', 'no_crossover', or 'insufficient_data'
        """
        # Need at least long_period + 5 data points to check for crossovers
        if len(data) < long_period + 5:
            return 'insufficient_data'

        # Calculate current MAs
        current_short_ma = self._calculate_ma(data, short_period)
        current_long_ma = self._calculate_ma(data, long_period)

        # Calculate MAs from 5 periods ago
        historical_data = data[:-5]
        historical_short_ma = self._calculate_ma(historical_data, short_period)
        historical_long_ma = self._calculate_ma(historical_data, long_period)

        # Check for crossover
        was_short_above_long = historical_short_ma > historical_long_ma
        is_short_above_long = current_short_ma > current_long_ma

        if not was_short_above_long and is_short_above_long:
            return 'bullish_crossover'
        elif was_short_above_long and not is_short_above_long:
            return 'bearish_crossover'
        else:
            return 'no_crossover'
