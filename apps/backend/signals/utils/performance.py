"""
Story 4.0d Task 7: Performance Monitoring and Optimization
Utilities for tracking and optimizing signal calculation performance
"""

import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics for signal calculations"""
    signal_name: str
    start_time: float
    end_time: Optional[float] = None
    duration_ms: float = 0.0

    # Breakdown timings
    fetch_time_ms: float = 0.0
    validation_time_ms: float = 0.0
    calculation_time_ms: float = 0.0
    persistence_time_ms: float = 0.0
    cache_time_ms: float = 0.0

    # Resource usage
    cache_hit: bool = False
    data_points: int = 0
    validation_score: float = 0.0

    # Metadata
    context: Dict[str, Any] = field(default_factory=dict)

    def finalize(self):
        """Finalize metrics calculation"""
        if self.end_time is None:
            self.end_time = time.time()
        self.duration_ms = (self.end_time - self.start_time) * 1000

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/storage"""
        return {
            'signal_name': self.signal_name,
            'duration_ms': round(self.duration_ms, 2),
            'fetch_time_ms': round(self.fetch_time_ms, 2),
            'validation_time_ms': round(self.validation_time_ms, 2),
            'calculation_time_ms': round(self.calculation_time_ms, 2),
            'persistence_time_ms': round(self.persistence_time_ms, 2),
            'cache_time_ms': round(self.cache_time_ms, 2),
            'cache_hit': self.cache_hit,
            'data_points': self.data_points,
            'validation_score': round(self.validation_score, 3),
            'timestamp': datetime.fromtimestamp(self.start_time).isoformat(),
        }


class PerformanceTracker:
    """
    Performance tracking utility for signal calculations

    Usage:
        tracker = PerformanceTracker()
        metrics = tracker.start_tracking('gayed_8_month')

        # Track individual phases
        tracker.track_phase(metrics, 'fetch', fetch_duration)
        tracker.track_phase(metrics, 'calculate', calc_duration)

        # Finalize and log
        tracker.finalize_tracking(metrics)
    """

    def __init__(self):
        self._metrics_history: List[PerformanceMetrics] = []
        self._max_history = 1000

    def start_tracking(
        self,
        signal_name: str,
        context: Optional[Dict[str, Any]] = None
    ) -> PerformanceMetrics:
        """
        Start tracking performance for a signal calculation

        Args:
            signal_name: Name of the signal being calculated
            context: Optional context information

        Returns:
            PerformanceMetrics object for this calculation
        """
        metrics = PerformanceMetrics(
            signal_name=signal_name,
            start_time=time.time(),
            context=context or {}
        )
        return metrics

    def track_phase(
        self,
        metrics: PerformanceMetrics,
        phase: str,
        duration_ms: float
    ):
        """
        Track a specific phase duration

        Args:
            metrics: PerformanceMetrics object
            phase: Phase name (fetch, validation, calculation, persistence, cache)
            duration_ms: Duration in milliseconds
        """
        if phase == 'fetch':
            metrics.fetch_time_ms = duration_ms
        elif phase == 'validation':
            metrics.validation_time_ms = duration_ms
        elif phase == 'calculation':
            metrics.calculation_time_ms = duration_ms
        elif phase == 'persistence':
            metrics.persistence_time_ms = duration_ms
        elif phase == 'cache':
            metrics.cache_time_ms = duration_ms

    def set_cache_hit(self, metrics: PerformanceMetrics, hit: bool):
        """Mark if calculation used cache"""
        metrics.cache_hit = hit

    def set_data_points(self, metrics: PerformanceMetrics, count: int):
        """Set number of data points processed"""
        metrics.data_points = count

    def set_validation_score(self, metrics: PerformanceMetrics, score: float):
        """Set data validation score"""
        metrics.validation_score = score

    def finalize_tracking(self, metrics: PerformanceMetrics):
        """
        Finalize tracking and log results

        Args:
            metrics: PerformanceMetrics to finalize
        """
        metrics.finalize()

        # Log performance
        logger.info(
            f"Signal calculation performance: {metrics.signal_name} "
            f"completed in {metrics.duration_ms:.2f}ms "
            f"(fetch: {metrics.fetch_time_ms:.1f}ms, "
            f"calc: {metrics.calculation_time_ms:.1f}ms)"
        )

        # Store in history
        self._metrics_history.append(metrics)

        # Trim history if needed
        if len(self._metrics_history) > self._max_history:
            self._metrics_history = self._metrics_history[-self._max_history:]

    def get_statistics(
        self,
        signal_name: Optional[str] = None,
        last_n: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get performance statistics

        Args:
            signal_name: Optional filter by signal name
            last_n: Optional limit to last N calculations

        Returns:
            Dictionary with performance statistics
        """
        filtered_metrics = self._metrics_history

        if signal_name:
            filtered_metrics = [m for m in filtered_metrics if m.signal_name == signal_name]

        if last_n:
            filtered_metrics = filtered_metrics[-last_n:]

        if not filtered_metrics:
            return {
                'count': 0,
                'signal_name': signal_name,
            }

        durations = [m.duration_ms for m in filtered_metrics]
        cache_hits = sum(1 for m in filtered_metrics if m.cache_hit)

        return {
            'count': len(filtered_metrics),
            'signal_name': signal_name,
            'avg_duration_ms': sum(durations) / len(durations),
            'min_duration_ms': min(durations),
            'max_duration_ms': max(durations),
            'cache_hit_rate': cache_hits / len(filtered_metrics) if filtered_metrics else 0,
            'avg_data_points': sum(m.data_points for m in filtered_metrics) / len(filtered_metrics),
        }


# Global performance tracker instance
_global_tracker: Optional[PerformanceTracker] = None


def get_performance_tracker() -> PerformanceTracker:
    """Get global performance tracker instance"""
    global _global_tracker
    if _global_tracker is None:
        _global_tracker = PerformanceTracker()
    return _global_tracker
