"""
Signal Context Service for AutoGen Agent Integration.

This service provides current Gayed signal data and market context
for AutoGen agent conversations, enabling agents to make informed
financial analysis decisions based on real-time market signals.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import aiohttp
from dataclasses import dataclass

from core.config import settings


@dataclass
class SignalData:
    """Individual signal data."""
    signal_type: str
    direction: str  # Risk-On, Risk-Off, Neutral
    strength: str   # Strong, Moderate, Weak
    confidence: float  # 0-1
    raw_value: float
    timestamp: datetime
    metadata: Dict[str, Any]


@dataclass
class MarketContextData:
    """Enhanced market context data."""
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: Optional[float]
    timestamp: datetime


@dataclass
class SignalContext:
    """Complete signal context for agent conversations."""
    consensus_signal: str  # Risk-On, Risk-Off, Mixed
    consensus_confidence: float
    individual_signals: List[SignalData]
    market_data: List[MarketContextData]
    context_timestamp: datetime
    summary: str


class SignalContextService:
    """
    Service for retrieving current signal context for AutoGen agents.

    This service integrates with the existing Gayed signals infrastructure
    to provide real-time market signal data for agent conversations.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.cache_duration = 300  # 5 minutes cache
        self._cached_context: Optional[SignalContext] = None
        self._cache_timestamp: Optional[datetime] = None

        # API endpoints (these should match existing signal API routes)
        self.signals_api_base = f"{settings.WEB_APP_URL}/api/signals"
        self.market_data_api_base = f"{settings.WEB_APP_URL}/api/market-data"

    async def get_current_signal_context(self) -> Optional[SignalContext]:
        """
        Get current signal context with caching.

        Returns comprehensive signal data including:
        - Current Gayed signal consensus
        - Individual signal values
        - Market data context
        - Formatted summary for agents
        """
        try:
            # Check cache first
            if self._is_cache_valid():
                self.logger.debug("Returning cached signal context")
                return self._cached_context

            # Fetch fresh signal data
            self.logger.info("Fetching fresh signal context")
            context = await self._fetch_signal_context()

            # Update cache
            self._cached_context = context
            self._cache_timestamp = datetime.utcnow()

            return context

        except Exception as e:
            self.logger.error(f"Failed to get signal context: {e}")

            # Log specific error type for monitoring
            error_type = type(e).__name__
            self.logger.error(f"Signal context error type: {error_type}")

            # Return cached data if available, even if stale, but only for non-critical errors
            if self._cached_context and not isinstance(e, (ValueError, TypeError)):
                age_minutes = (datetime.utcnow() - self._cache_timestamp).total_seconds() / 60
                self.logger.warning(f"Returning stale cached signal context (age: {age_minutes:.1f} minutes) due to {error_type}")
                return self._cached_context

            # For critical errors or no cache, return None
            self.logger.error("⚠️ No signal context available - both real API and cache failed")
            return None

    def _is_cache_valid(self) -> bool:
        """Check if cached signal context is still valid."""
        if not self._cached_context or not self._cache_timestamp:
            return False

        cache_age = (datetime.utcnow() - self._cache_timestamp).total_seconds()
        return cache_age < self.cache_duration

    async def _fetch_signal_context(self) -> SignalContext:
        """Fetch current signal context from APIs."""
        try:
            # Fetch current signals
            signals_data = await self._fetch_current_signals()

            # Fetch market data
            market_data = await self._fetch_market_data()

            # Calculate consensus
            consensus_info = self._calculate_consensus(signals_data)

            # Generate summary for agents
            summary = self._generate_agent_summary(signals_data, consensus_info, market_data)

            context = SignalContext(
                consensus_signal=consensus_info["consensus"],
                consensus_confidence=consensus_info["confidence"],
                individual_signals=signals_data,
                market_data=market_data,
                context_timestamp=datetime.utcnow(),
                summary=summary
            )

            self.logger.info(f"Signal context fetched: {consensus_info['consensus']} with {consensus_info['confidence']:.1%} confidence")
            return context

        except Exception as e:
            self.logger.error(f"Failed to fetch signal context: {e}")
            raise

    async def _fetch_current_signals(self) -> List[SignalData]:
        """Fetch current Gayed signal values from real API."""
        try:
            # Call the existing real signals API endpoint
            signals_url = f"{self.signals_api_base}/current"

            async with aiohttp.ClientSession() as session:
                async with session.get(signals_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 206:  # Partial content due to missing data
                        data = await response.json()
                        self.logger.warning(f"Partial signal data: {data.get('warnings', [])}")
                        # Continue with available data
                        if 'availableSymbols' in data:
                            self.logger.info(f"Available symbols: {data['availableSymbols']}")
                    elif response.status != 200:
                        error_data = await response.text()
                        raise Exception(f"Signals API returned {response.status}: {error_data}")

                    api_data = await response.json()

                    # Convert API response to SignalData objects
                    signals = []
                    for signal_info in api_data.get('signals', []):
                        # Map signal strength based on confidence
                        confidence = signal_info.get('confidence', 0.0)
                        if confidence >= 0.8:
                            strength = "Strong"
                        elif confidence >= 0.6:
                            strength = "Moderate"
                        else:
                            strength = "Weak"

                        # Parse timestamp
                        timestamp_str = signal_info.get('timestamp')
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) if timestamp_str else datetime.utcnow()

                        signals.append(SignalData(
                            signal_type=signal_info.get('type', 'unknown'),
                            direction=signal_info.get('signal', 'Neutral'),
                            strength=strength,
                            confidence=confidence,
                            raw_value=signal_info.get('value', 0.0),
                            timestamp=timestamp,
                            metadata=signal_info.get('metadata', {})
                        ))

                    self.logger.info(f"✅ Fetched {len(signals)} real signal values from API")
                    return signals

        except aiohttp.ClientError as e:
            self.logger.error(f"Network error fetching signals: {e}")
            # In production, we must NOT provide fallback data
            self.logger.warning("⚠️ Signals API unavailable - no synthetic fallback")
            raise Exception(f"Real signals data unavailable: {e}")
        except Exception as e:
            self.logger.error(f"Failed to fetch real signals: {e}")
            raise

    async def _fetch_market_data(self) -> List[MarketContextData]:
        """Fetch current market data from real API."""
        try:
            # Call the real market data API endpoint
            market_data_url = f"{self.market_data_api_base}/current"

            async with aiohttp.ClientSession() as session:
                async with session.get(market_data_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status != 200:
                        error_data = await response.text()
                        raise Exception(f"Market data API returned {response.status}: {error_data}")

                    api_data = await response.json()

                    # Convert API response to MarketContextData objects
                    market_data = []
                    for market_info in api_data.get('market_data', []):
                        # Parse timestamp
                        timestamp_str = market_info.get('timestamp')
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) if timestamp_str else datetime.utcnow()

                        market_data.append(MarketContextData(
                            symbol=market_info.get('symbol', 'UNKNOWN'),
                            price=market_info.get('price', 0.0),
                            change=market_info.get('change', 0.0),
                            change_percent=market_info.get('change_percent', 0.0),
                            volume=market_info.get('volume'),
                            timestamp=timestamp
                        ))

                    self.logger.info(f"✅ Fetched {len(market_data)} real market data points from API")
                    return market_data

        except aiohttp.ClientError as e:
            self.logger.error(f"Network error fetching market data: {e}")
            # In production, we must NOT provide fallback data
            self.logger.warning("⚠️ Market data API unavailable - no synthetic fallback")
            raise Exception(f"Real market data unavailable: {e}")
        except Exception as e:
            self.logger.error(f"Failed to fetch real market data: {e}")
            raise

    def _calculate_consensus(self, signals: List[SignalData]) -> Dict[str, Any]:
        """Calculate consensus from individual signals."""
        if not signals:
            return {"consensus": "Mixed", "confidence": 0.0}

        # Count signal directions
        risk_on_count = sum(1 for s in signals if s.direction == "Risk-On")
        risk_off_count = sum(1 for s in signals if s.direction == "Risk-Off")
        neutral_count = sum(1 for s in signals if s.direction == "Neutral")

        total_signals = len(signals)

        # Determine consensus
        if risk_on_count > risk_off_count and risk_on_count > neutral_count:
            consensus = "Risk-On"
            consensus_confidence = risk_on_count / total_signals
        elif risk_off_count > risk_on_count and risk_off_count > neutral_count:
            consensus = "Risk-Off"
            consensus_confidence = risk_off_count / total_signals
        else:
            consensus = "Mixed"
            consensus_confidence = max(risk_on_count, risk_off_count) / total_signals

        # Weight by individual signal confidence
        weighted_confidence = sum(s.confidence for s in signals) / total_signals
        final_confidence = (consensus_confidence + weighted_confidence) / 2

        return {
            "consensus": consensus,
            "confidence": final_confidence,
            "risk_on_count": risk_on_count,
            "risk_off_count": risk_off_count,
            "neutral_count": neutral_count
        }

    def _generate_agent_summary(
        self,
        signals: List[SignalData],
        consensus_info: Dict[str, Any],
        market_data: List[MarketContextData]
    ) -> str:
        """Generate formatted summary for AutoGen agents."""
        summary_lines = [
            "=== CURRENT MARKET SIGNAL CONTEXT ===",
            f"Consensus: {consensus_info['consensus']} ({consensus_info['confidence']:.1%} confidence)",
            f"Signal Distribution: {consensus_info['risk_on_count']} Risk-On, {consensus_info['risk_off_count']} Risk-Off, {consensus_info['neutral_count']} Neutral",
            "",
            "Individual Signals:"
        ]

        # Add individual signal details
        for signal in signals:
            summary_lines.append(
                f"  • {signal.signal_type}: {signal.direction} ({signal.strength}, {signal.confidence:.1%} confidence, value: {signal.raw_value:.2f})"
            )

        summary_lines.extend([
            "",
            "Key Market Data:"
        ])

        # Add key market data
        for data in market_data[:3]:  # Limit to top 3 for brevity
            change_sign = "+" if data.change >= 0 else ""
            summary_lines.append(
                f"  • {data.symbol}: ${data.price:.2f} ({change_sign}{data.change_percent:.2f}%)"
            )

        summary_lines.extend([
            "",
            f"Data as of: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
            "=== END SIGNAL CONTEXT ==="
        ])

        return "\n".join(summary_lines)

    async def get_signal_history(self, hours: int = 24) -> List[SignalContext]:
        """Get historical signal context for analysis."""
        # This would typically fetch from a database
        # For now, return empty list as placeholder
        self.logger.info(f"Signal history request for last {hours} hours")
        return []

    async def health_check(self) -> bool:
        """Perform health check for signal context service."""
        try:
            # Try to fetch a minimal signal context
            context = await self.get_current_signal_context()
            return context is not None

        except Exception as e:
            self.logger.error(f"Signal context service health check failed: {e}")
            return False

    async def clear_cache(self) -> None:
        """Clear cached signal context."""
        self._cached_context = None
        self._cache_timestamp = None
        self.logger.info("Signal context cache cleared")

    def get_cache_status(self) -> Dict[str, Any]:
        """Get current cache status."""
        if not self._cache_timestamp:
            return {"cached": False, "age_seconds": None}

        age_seconds = (datetime.utcnow() - self._cache_timestamp).total_seconds()
        return {
            "cached": True,
            "age_seconds": age_seconds,
            "valid": self._is_cache_valid(),
            "expires_in_seconds": max(0, self.cache_duration - age_seconds)
        }