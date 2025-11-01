"""
Story 4.0d Task 6: Aggregate Signal Calculator
Combines multiple signals into weighted composite signal
"""

from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal

from signals.calculators.base_calculator import BaseSignalCalculator
from signals.calculators.gayed_8_month import Gayed8MonthCalculator
from signals.calculators.gayed_20d import Gayed20DCalculator
from signals.calculators.bollinger_bands import BollingerBandsCalculator
from signals.types import (
    SignalType,
    SignalStatus,
    CalculationContext,
)


class AggregateSignalInput:
    """Input data for Aggregate signal"""
    def __init__(self, date: datetime):
        self.date = date


class AggregateSignalOutput:
    """Output data for Aggregate signal"""
    def __init__(
        self,
        weighted_score: Decimal,
        signal: str,
        strength: str,
        confidence: float,
        component_signals: Dict[str, Any],
    ):
        self.weighted_score = weighted_score
        self.signal = signal
        self.strength = strength
        self.confidence = confidence
        self.component_signals = component_signals


class AggregateSignalParams:
    """Parameters for Aggregate signal"""
    weights: Dict[str, float] = {
        'gayed_8_month': 0.4,
        'gayed_20d': 0.3,
        'bollinger_bands': 0.3,
    }


class AggregateSignalCalculator(
    BaseSignalCalculator[
        AggregateSignalInput,
        AggregateSignalOutput,
        AggregateSignalParams
    ]
):
    """
    Aggregate Signal Calculator

    Combines multiple signals using weighted averaging to create
    a composite market outlook signal.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Initialize component calculators
        # In production, these would be loaded from configuration
        # For now, simplified initialization
        self.component_calculators = {}

    async def fetch_data(self, context: CalculationContext) -> AggregateSignalInput:
        """No direct data fetch needed - relies on component signals"""
        return AggregateSignalInput(date=context.date)

    async def calculate(
        self,
        data: AggregateSignalInput,
        context: CalculationContext
    ) -> AggregateSignalOutput:
        """Calculate aggregate signal from components"""
        params = self.config.parameters
        weights = params.get('weights', {
            'gayed_8_month': 0.4,
            'gayed_20d': 0.3,
            'bollinger_bands': 0.3,
        })

        # In production implementation, this would:
        # 1. Load component signal values from SignalHistory table
        # 2. Apply weights to each component
        # 3. Calculate weighted aggregate score

        # Simplified implementation for now
        # This assumes component signals have been calculated

        component_signals = {
            'gayed_8_month': {'score': 0.0, 'weight': weights.get('gayed_8_month', 0.4)},
            'gayed_20d': {'score': 0.0, 'weight': weights.get('gayed_20d', 0.3)},
            'bollinger_bands': {'score': 0.0, 'weight': weights.get('bollinger_bands', 0.3)},
        }

        # Calculate weighted score
        weighted_score = Decimal('0.0')
        total_weight = Decimal('0.0')

        for signal_name, signal_data in component_signals.items():
            score = Decimal(str(signal_data['score']))
            weight = Decimal(str(signal_data['weight']))
            weighted_score += score * weight
            total_weight += weight

        if total_weight > 0:
            weighted_score = weighted_score / total_weight

        # Determine aggregate signal
        if weighted_score > Decimal('0.2'):
            signal = 'Risk-On'
            strength = 'Strong' if weighted_score > Decimal('0.5') else 'Moderate'
        elif weighted_score < Decimal('-0.2'):
            signal = 'Risk-Off'
            strength = 'Strong' if weighted_score < Decimal('-0.5') else 'Moderate'
        else:
            signal = 'Neutral'
            strength = 'Weak'

        confidence = min(abs(float(weighted_score)), 1.0)

        return AggregateSignalOutput(
            weighted_score=weighted_score,
            signal=signal,
            strength=strength,
            confidence=confidence,
            component_signals=component_signals,
        )

    def get_signal_metadata(self) -> Dict[str, Any]:
        """Get signal metadata"""
        return {
            'description': 'Aggregate Composite Signal',
            'interpretation': 'Weighted combination of multiple timing and volatility signals',
            'methodology': 'Weighted average of component signal scores'
        }

    def extract_numeric_value(self, result: AggregateSignalOutput) -> float:
        """Extract weighted score"""
        return float(result.weighted_score)

    def calculate_strength(self, result: AggregateSignalOutput) -> float:
        """Extract weighted score as strength"""
        return max(-1.0, min(1.0, float(result.weighted_score)))

    def determine_status(self, result: AggregateSignalOutput) -> SignalStatus:
        """Determine status from weighted score"""
        score = float(result.weighted_score)

        if score > 0.2:
            return SignalStatus.BULLISH
        elif score < -0.2:
            return SignalStatus.BEARISH
        else:
            return SignalStatus.NEUTRAL
