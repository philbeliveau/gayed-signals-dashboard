"""
Story 4.0d Task 5: Bollinger Bands Volatility Signal
Volatility-based signal using Bollinger Bands methodology
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import math

from signals.calculators.base_calculator import BaseSignalCalculator
from signals.types import (
    SignalType,
    SignalStatus,
    CalculationContext,
    OHLCData,
    InsufficientDataError,
)


class BollingerBandsInput:
    """Input data for Bollinger Bands signal"""
    def __init__(self, spy: List[OHLCData], vix: List[OHLCData], date: datetime):
        self.spy = spy
        self.vix = vix
        self.date = date


class BollingerBandsOutput:
    """Output data for Bollinger Bands signal"""
    def __init__(
        self,
        current_price: Decimal,
        middle_band: Decimal,
        upper_band: Decimal,
        lower_band: Decimal,
        bandwidth: Decimal,
        percent_b: Decimal,
        signal: str,
        strength: str,
        confidence: float,
    ):
        self.current_price = current_price
        self.middle_band = middle_band
        self.upper_band = upper_band
        self.lower_band = lower_band
        self.bandwidth = bandwidth
        self.percent_b = percent_b
        self.signal = signal
        self.strength = strength
        self.confidence = confidence


class BollingerBandsParams:
    """Parameters for Bollinger Bands signal"""
    period: int = 20
    standard_deviations: float = 2.0
    overbought_threshold: float = 0.8
    oversold_threshold: float = 0.2


class BollingerBandsCalculator(
    BaseSignalCalculator[
        BollingerBandsInput,
        BollingerBandsOutput,
        BollingerBandsParams
    ]
):
    """
    Bollinger Bands Volatility Signal Calculator

    Uses Bollinger Bands to identify overbought/oversold conditions
    and market volatility states.
    """

    async def fetch_data(self, context: CalculationContext) -> BollingerBandsInput:
        """Fetch SPY and VIX data"""
        params = self.config.parameters
        period = params.get('period', 20)

        start_date = context.date - timedelta(days=period * 3)

        spy_data = await self.market_data_repo.get_market_data(
            symbol='SPY',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        vix_data = await self.market_data_repo.get_market_data(
            symbol='VIX',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        return BollingerBandsInput(spy=spy_data, vix=vix_data, date=context.date)

    async def calculate(
        self,
        data: BollingerBandsInput,
        context: CalculationContext
    ) -> BollingerBandsOutput:
        """Calculate Bollinger Bands signal"""
        params = self.config.parameters
        period = params.get('period', 20)
        std_dev = Decimal(str(params.get('standardDeviations', 2.0)))

        spy_relevant = [d for d in data.spy if d.date <= data.date]

        if len(spy_relevant) < period:
            raise InsufficientDataError(
                f"Need {period} points, got {len(spy_relevant)}",
                required=period,
                actual=len(spy_relevant)
            )

        current_price = spy_relevant[-1].close

        # Calculate middle band (SMA)
        recent = spy_relevant[-period:]
        middle_band = sum(d.close for d in recent) / Decimal(str(period))

        # Calculate standard deviation
        variance = sum((d.close - middle_band) ** 2 for d in recent) / Decimal(str(period))
        std = Decimal(str(math.sqrt(float(variance))))

        # Calculate bands
        upper_band = middle_band + (std * std_dev)
        lower_band = middle_band - (std * std_dev)

        # Calculate %B (position within bands)
        bandwidth = upper_band - lower_band
        if bandwidth > 0:
            percent_b = (current_price - lower_band) / bandwidth
        else:
            percent_b = Decimal('0.5')

        # Determine signal
        overbought = Decimal(str(params.get('overboughtThreshold', 0.8)))
        oversold = Decimal(str(params.get('oversoldThreshold', 0.2)))

        if percent_b > overbought:
            signal = 'Risk-Off'
            strength = 'Strong' if percent_b > Decimal('0.9') else 'Moderate'
        elif percent_b < oversold:
            signal = 'Risk-On'
            strength = 'Strong' if percent_b < Decimal('0.1') else 'Moderate'
        else:
            signal = 'Neutral'
            strength = 'Weak'

        # Calculate confidence
        distance_from_neutral = abs(float(percent_b) - 0.5) * 2
        confidence = min(distance_from_neutral, 1.0)

        return BollingerBandsOutput(
            current_price=current_price,
            middle_band=middle_band,
            upper_band=upper_band,
            lower_band=lower_band,
            bandwidth=bandwidth,
            percent_b=percent_b,
            signal=signal,
            strength=strength,
            confidence=confidence,
        )

    def get_signal_metadata(self) -> Dict[str, Any]:
        """Get signal metadata"""
        return {
            'description': 'Bollinger Bands Volatility Signal',
            'interpretation': 'Identifies overbought/oversold conditions using volatility bands',
            'methodology': 'Uses %B position within Bollinger Bands to determine signal'
        }

    def extract_numeric_value(self, result: BollingerBandsOutput) -> float:
        """Extract %B as numeric value"""
        return float(result.percent_b)

    def calculate_strength(self, result: BollingerBandsOutput) -> float:
        """Calculate strength from %B position"""
        # Map %B from [0,1] to [-1,1] with 0.5 as neutral
        return (float(result.percent_b) - 0.5) * 2

    def determine_status(self, result: BollingerBandsOutput) -> SignalStatus:
        """Determine status from %B"""
        percent_b = float(result.percent_b)

        if percent_b > 0.8:
            return SignalStatus.DEFENSIVE
        elif percent_b < 0.2:
            return SignalStatus.BULLISH
        else:
            return SignalStatus.NEUTRAL
