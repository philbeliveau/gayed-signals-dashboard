"""
Story 4.0d: Signal Calculators Module
Signal calculation framework and implementations
"""

from .base_calculator import BaseSignalCalculator
from .gayed_8_month import Gayed8MonthCalculator
from .gayed_20d import Gayed20DCalculator
from .bollinger_bands import BollingerBandsCalculator
from .aggregate_signal import AggregateSignalCalculator

__all__ = [
    'BaseSignalCalculator',
    'Gayed8MonthCalculator',
    'Gayed20DCalculator',
    'BollingerBandsCalculator',
    'AggregateSignalCalculator',
]
