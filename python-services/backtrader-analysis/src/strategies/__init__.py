"""
Gayed Signal Trading Strategies

This module implements Backtrader strategies based on Michael Gayed's
market regime signals for integrated risk-on/risk-off analysis.
"""

from .gayed_consensus import GayedConsensusStrategy
from .signal_analyzer import SignalAnalyzerStrategy

__all__ = [
    'GayedConsensusStrategy',
    'SignalAnalyzerStrategy'
]