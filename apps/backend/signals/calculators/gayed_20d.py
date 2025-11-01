"""
Story 4.0d Task 4: Gayed 20-Day Utilities/SPY Ratio Signal
Refactored from apps/web/src/domains/trading-signals/engines/gayed-signals/utilities-spy.ts
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

class Gayed20DInput:
    """Input data for Gayed 20-Day signal"""

    def __init__(self, xlu: List[OHLCData], spy: List[OHLCData], date: datetime):
        self.xlu = xlu
        self.spy = spy
        self.date = date


class Gayed20DOutput:
    """Output data for Gayed 20-Day signal"""

    def __init__(
        self,
        ratio: Decimal,
        xlu_return: Decimal,
        spy_return: Decimal,
        signal: str,
        strength: str,
        confidence: float,
        deviation: Decimal,
    ):
        self.ratio = ratio
        self.xlu_return = xlu_return
        self.spy_return = spy_return
        self.signal = signal
        self.strength = strength
        self.confidence = confidence
        self.deviation = deviation


# ===== PARAMETERS =====

class Gayed20DParams:
    """Parameters for Gayed 20-Day signal"""
    lookback_period: int = 21  # ~20 trading days
    minimum_data_points: int = 40


# ===== CALCULATOR =====

class Gayed20DCalculator(
    BaseSignalCalculator[
        Gayed20DInput,
        Gayed20DOutput,
        Gayed20DParams
    ]
):
    """
    Gayed 20-Day Utilities/SPY Ratio Signal Calculator

    Calculates the relative performance of Utilities (XLU) vs SPY over a 20-day period.
    Uses return ratios to determine defensive vs offensive market positioning.

    Signal Logic:
    - Risk-Off: XLU outperforming SPY (ratio > 1.0) - defensive positioning
    - Risk-On: SPY outperforming XLU (ratio < 1.0) - offensive positioning

    Strength based on:
    - Magnitude of ratio deviation from 1.0
    - Larger deviations = stronger signal
    """

    async def fetch_data(
        self,
        context: CalculationContext
    ) -> Gayed20DInput:
        """
        Fetch XLU and SPY price data from Railway PostgreSQL

        Args:
            context: Calculation context with date

        Returns:
            Gayed20DInput with XLU and SPY data
        """
        params = self.config.parameters
        lookback = params.get('lookbackPeriod', 21)
        min_data_points = params.get('minimumDataPoints', 40)

        start_date = context.date - timedelta(days=min_data_points * 2)

        # Fetch XLU and SPY data in parallel would be ideal, but we'll do sequentially
        xlu_data = await self.market_data_repo.get_market_data(
            symbol='XLU',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        spy_data = await self.market_data_repo.get_market_data(
            symbol='SPY',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        return Gayed20DInput(xlu=xlu_data, spy=spy_data, date=context.date)

    async def calculate(
        self,
        data: Gayed20DInput,
        context: CalculationContext
    ) -> Gayed20DOutput:
        """
        Calculate 20-day utilities/SPY ratio signal

        Args:
            data: Input data with XLU and SPY prices
            context: Calculation context

        Returns:
            Gayed20DOutput with signal calculation

        Raises:
            InsufficientDataError: If not enough data points
        """
        params = self.config.parameters
        lookback = params.get('lookbackPeriod', 21)
        min_data_points = params.get('minimumDataPoints', 40)

        # Filter data up to calculation date
        xlu_relevant = [d for d in data.xlu if d.date <= data.date]
        spy_relevant = [d for d in data.spy if d.date <= data.date]

        # Validate sufficient data
        if len(xlu_relevant) < lookback + 1:
            raise InsufficientDataError(
                f"Need {lookback + 1} XLU points, got {len(xlu_relevant)}",
                required=lookback + 1,
                actual=len(xlu_relevant)
            )

        if len(spy_relevant) < lookback + 1:
            raise InsufficientDataError(
                f"Need {lookback + 1} SPY points, got {len(spy_relevant)}",
                required=lookback + 1,
                actual=len(spy_relevant)
            )

        # Calculate returns over lookback period
        xlu_start = xlu_relevant[-lookback - 1].close
        xlu_end = xlu_relevant[-1].close
        spy_start = spy_relevant[-lookback - 1].close
        spy_end = spy_relevant[-1].close

        xlu_return = (xlu_end / xlu_start) - Decimal('1')
        spy_return = (spy_end / spy_start) - Decimal('1')

        # Handle division by zero or near-zero scenarios
        denominator = Decimal('1') + spy_return

        if abs(denominator) < Decimal('0.0001'):
            # Near-zero SPY return - neutral signal
            return Gayed20DOutput(
                ratio=Decimal('1.0'),
                xlu_return=xlu_return,
                spy_return=spy_return,
                signal='Neutral',
                strength='Weak',
                confidence=0.1,
                deviation=Decimal('0.0'),
            )

        # Calculate ratio: (1 + XLU return) / (1 + SPY return)
        ratio = (Decimal('1') + xlu_return) / denominator

        # Validate ratio
        if not self._is_valid_decimal(ratio):
            raise ValueError(f"Invalid ratio calculation: {ratio}")

        # Determine signal
        # Ratio > 1.0 means XLU outperforming SPY (defensive = Risk-Off)
        # Ratio < 1.0 means SPY outperforming XLU (offensive = Risk-On)
        signal = 'Risk-Off' if ratio > Decimal('1.0') else 'Risk-On'

        # Calculate deviation from 1.0
        deviation = abs(ratio - Decimal('1.0'))

        # Determine strength based on magnitude of deviation
        if deviation > Decimal('0.05'):
            strength = 'Strong'
        elif deviation > Decimal('0.02'):
            strength = 'Moderate'
        else:
            strength = 'Weak'

        # Calculate confidence (0-1 scale)
        # Larger deviations = higher confidence
        confidence = min(float(deviation) * 10.0, 1.0)

        return Gayed20DOutput(
            ratio=ratio,
            xlu_return=xlu_return,
            spy_return=spy_return,
            signal=signal,
            strength=strength,
            confidence=confidence,
            deviation=deviation,
        )

    def get_signal_metadata(self) -> Dict[str, Any]:
        """Get signal metadata for documentation"""
        return {
            'description': 'Gayed 20-Day Utilities/SPY Relative Strength Signal',
            'interpretation': 'Risk-Off when Utilities (XLU) outperform SPY, indicating defensive positioning',
            'thresholds': {
                'strong_defensive': 1.05,    # XLU +5% vs SPY
                'moderate_defensive': 1.02,  # XLU +2% vs SPY
                'neutral': 1.0,
                'moderate_offensive': 0.98,  # SPY +2% vs XLU
                'strong_offensive': 0.95,    # SPY +5% vs XLU
            },
            'signal_meanings': {
                'Risk-Off': 'Utilities outperforming - defensive positioning favored',
                'Risk-On': 'SPY outperforming - offensive positioning favored',
                'Neutral': 'Equal performance - no clear preference',
            },
            'methodology': '20-day relative return comparison between XLU and SPY'
        }

    def extract_numeric_value(self, result: Gayed20DOutput) -> float:
        """
        Extract numeric value for signal strength
        Returns ratio as percentage deviation from 1.0
        """
        return float((result.ratio - Decimal('1.0')) * Decimal('100'))

    def calculate_strength(self, result: Gayed20DOutput) -> float:
        """
        Calculate signal strength normalized to -1 to 1 range
        Clips at ±10% deviation
        """
        deviation_pct = float((result.ratio - Decimal('1.0')) * Decimal('100'))
        return max(-1.0, min(1.0, deviation_pct / 10.0))

    def determine_status(self, result: Gayed20DOutput) -> SignalStatus:
        """
        Determine signal status from result

        - DEFENSIVE: Ratio > 1.02 (XLU outperforming)
        - BULLISH: Ratio < 0.98 (SPY outperforming)
        - NEUTRAL: Between 0.98 and 1.02
        """
        ratio = float(result.ratio)

        if ratio > 1.02:
            return SignalStatus.DEFENSIVE
        elif ratio < 0.98:
            return SignalStatus.BULLISH
        else:
            return SignalStatus.NEUTRAL

    # ===== PRIVATE HELPER METHODS =====

    def _is_valid_decimal(self, value: Decimal) -> bool:
        """Check if Decimal value is valid (not NaN or Infinity)"""
        try:
            if value.is_nan() or value.is_infinite():
                return False
            return True
        except:
            return False
