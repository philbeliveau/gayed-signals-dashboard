"""
Gayed Signals Service - Direct integration with frontend SignalOrchestrator
Provides Python backend access to real Gayed signal calculations
"""

import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from core.config import settings

logger = logging.getLogger(__name__)


class GayedSignalsService:
    """Service for accessing real Gayed signals from the frontend infrastructure"""

    def __init__(self, frontend_url: Optional[str] = None):
        self.frontend_url = frontend_url or settings.FRONTEND_URL or "http://localhost:3000"
        self.session: Optional[aiohttp.ClientSession] = None
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 300  # 5 minutes

    async def _ensure_session(self):
        """Ensure aiohttp session is available"""
        if not self.session:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )

    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to frontend API"""
        await self._ensure_session()

        url = f"{self.frontend_url}/api/{endpoint}"

        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    logger.error(f"Frontend API error {response.status}: {error_text}")
                    raise Exception(f"Frontend API error: {response.status}")

        except aiohttp.ClientError as e:
            logger.error(f"Network error accessing frontend API: {e}")
            raise Exception(f"Network error: {e}")

    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self._cache:
            return False

        cache_entry = self._cache[cache_key]
        cache_time = cache_entry.get("timestamp", 0)
        return (datetime.now().timestamp() - cache_time) < self._cache_ttl

    def _set_cache(self, cache_key: str, data: Dict[str, Any]):
        """Store data in cache with timestamp"""
        self._cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now().timestamp()
        }

    def _get_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve data from cache if valid"""
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]["data"]
        return None

    async def get_current_signals(self) -> Dict[str, Any]:
        """
        Get current Gayed signals from SignalOrchestrator

        Returns:
            Dict containing consensus signal and individual signals
        """
        cache_key = "current_signals"

        # Check cache first
        cached_data = self._get_cache(cache_key)
        if cached_data:
            logger.debug("Returning cached signal data")
            return cached_data

        try:
            logger.info("Fetching current Gayed signals from frontend")
            data = await self._make_request("signals/current")

            # Cache the response
            self._set_cache(cache_key, data)

            logger.info(f"Successfully retrieved {len(data.get('signals', []))} signals")
            return data

        except Exception as e:
            logger.error(f"Failed to get current signals: {e}")
            return self._get_fallback_signals("Failed to retrieve current signals")

    async def get_fast_signals(self) -> Dict[str, Any]:
        """
        Get fast Gayed signals (Utilities/SPY + S&P 500 MA) for quick analysis

        Returns:
            Dict containing essential signals for fast market regime assessment
        """
        cache_key = "fast_signals"

        # Check cache first (shorter TTL for fast signals)
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            cache_time = cache_entry.get("timestamp", 0)
            if (datetime.now().timestamp() - cache_time) < 60:  # 1 minute cache for fast signals
                logger.debug("Returning cached fast signal data")
                return cache_entry["data"]

        try:
            logger.info("Fetching fast Gayed signals from frontend")
            data = await self._make_request("signals/fast")

            # Cache with shorter TTL
            self._cache[cache_key] = {
                "data": data,
                "timestamp": datetime.now().timestamp()
            }

            logger.info(f"Successfully retrieved fast signals")
            return data

        except Exception as e:
            logger.error(f"Failed to get fast signals: {e}")
            return self._get_fallback_signals("Failed to retrieve fast signals")

    async def get_signal_history(self, days: int = 30) -> Dict[str, Any]:
        """
        Get historical signal data for trend analysis

        Args:
            days: Number of days of history to retrieve

        Returns:
            Dict containing historical signal data
        """
        try:
            logger.info(f"Fetching {days} days of signal history")
            params = {"days": days}
            data = await self._make_request("signals/history", params)

            logger.info(f"Successfully retrieved {days} days of signal history")
            return data

        except Exception as e:
            logger.error(f"Failed to get signal history: {e}")
            return {"error": f"Failed to retrieve signal history: {e}"}

    async def get_market_data_status(self) -> Dict[str, Any]:
        """
        Get status of market data sources and signal calculation health

        Returns:
            Dict containing market data source status and signal health info
        """
        try:
            logger.info("Fetching market data status")
            data = await self._make_request("signals/status")

            logger.info("Successfully retrieved market data status")
            return data

        except Exception as e:
            logger.error(f"Failed to get market data status: {e}")
            return {
                "status": "error",
                "message": f"Failed to retrieve market data status: {e}",
                "timestamp": datetime.now().isoformat()
            }

    def _get_fallback_signals(self, error_message: str) -> Dict[str, Any]:
        """
        Return fallback signal data when real data is unavailable

        Args:
            error_message: Description of the error that occurred

        Returns:
            Dict with error information and fallback structure
        """
        return {
            "consensus": {
                "status": "Unknown",
                "confidence": 0.0,
                "risk_on_count": 0,
                "risk_off_count": 0,
                "neutral_count": 0,
                "timestamp": datetime.now().isoformat()
            },
            "signals": [],
            "error": error_message,
            "fallback": True,
            "timestamp": datetime.now().isoformat()
        }

    def extract_signal_insights(self, signals_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract actionable insights from raw signal data

        Args:
            signals_data: Raw signal data from get_current_signals()

        Returns:
            Dict with structured signal insights for agent analysis
        """
        if signals_data.get("fallback"):
            return {
                "status": "error",
                "message": signals_data.get("error", "Unknown error"),
                "confidence": 0.0,
                "actionable_insights": []
            }

        consensus = signals_data.get("consensus", {})
        signals = signals_data.get("signals", [])

        insights = {
            "market_regime": consensus.get("status", "Unknown"),
            "confidence": consensus.get("confidence", 0.0),
            "signal_count": len(signals),
            "risk_distribution": {
                "risk_on": consensus.get("risk_on_count", 0),
                "risk_off": consensus.get("risk_off_count", 0),
                "neutral": consensus.get("neutral_count", 0)
            },
            "individual_signals": [],
            "actionable_insights": []
        }

        # Process individual signals
        for signal in signals:
            signal_info = {
                "type": signal.get("type", "unknown"),
                "status": signal.get("signal", "unknown"),
                "value": signal.get("value", 0),
                "confidence": signal.get("confidence", 0),
                "last_update": signal.get("timestamp", "unknown")
            }
            insights["individual_signals"].append(signal_info)

        # Generate actionable insights
        if insights["confidence"] > 0.7:
            if insights["market_regime"] == "Risk-Off":
                insights["actionable_insights"] = [
                    f"Strong defensive signal with {insights['confidence']:.1%} confidence",
                    f"Current signal distribution: {insights['risk_distribution']['risk_off']} defensive signals",
                    "Consider utilities, bonds, and defensive sectors"
                ]
            elif insights["market_regime"] == "Risk-On":
                insights["actionable_insights"] = [
                    f"Strong growth signal with {insights['confidence']:.1%} confidence",
                    f"Current signal distribution: {insights['risk_distribution']['risk_on']} growth signals",
                    "Consider cyclical sectors and growth strategies"
                ]
            else:
                insights["actionable_insights"] = [
                    f"Mixed signals with {insights['confidence']:.1%} confidence",
                    "Market regime uncertainty - maintain balanced approach"
                ]
        else:
            insights["actionable_insights"] = [
                f"Low confidence signals ({insights['confidence']:.1%})",
                "Exercise caution and seek additional confirmation"
            ]

        return insights

    async def close(self):
        """Close the HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None

    def clear_cache(self):
        """Clear the signal cache"""
        self._cache.clear()
        logger.info("Gayed signals cache cleared")


# Factory function for easy instantiation
def create_gayed_signals_service() -> GayedSignalsService:
    """Create and return a configured Gayed Signals Service"""
    return GayedSignalsService()