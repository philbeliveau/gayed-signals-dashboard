"""
MCP Bridge Client
Connects Python backend to existing MCP services in the Next.js frontend
Enables AutoGen agents to access Perplexity, signals, and web search services
"""

import asyncio
import aiohttp
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class MCPServiceError(Exception):
    """Custom exception for MCP service errors"""
    pass


class MCPCacheManager:
    """Manages caching for MCP service responses to avoid redundant API calls"""

    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl

    def _generate_key(self, service: str, method: str, params: Dict) -> str:
        """Generate cache key from service call parameters."""
        content = f"{service}.{method}.{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()

    async def get(
        self,
        service: str,
        method: str,
        params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached MCP service response."""
        key = self._generate_key(service, method, params)
        cached_item = self.cache.get(key)

        if cached_item:
            if datetime.now() < cached_item["expires_at"]:
                logger.debug(f"Cache hit for {service}.{method}")
                return cached_item["data"]
            else:
                # Clean up expired item
                del self.cache[key]
                logger.debug(f"Cache expired for {service}.{method}")

        return None

    async def set(
        self,
        service: str,
        method: str,
        params: Dict[str, Any],
        data: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache MCP service response."""
        key = self._generate_key(service, method, params)
        expires_at = datetime.now() + timedelta(seconds=ttl or self.default_ttl)

        self.cache[key] = {
            "data": data,
            "expires_at": expires_at,
            "created_at": datetime.now()
        }

        logger.debug(f"Cached response for {service}.{method}")

    def clear_cache(self):
        """Clear all cached items"""
        self.cache.clear()
        logger.info("MCP cache cleared")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_items = len(self.cache)
        expired_items = sum(
            1 for item in self.cache.values()
            if datetime.now() >= item["expires_at"]
        )

        return {
            "total_items": total_items,
            "active_items": total_items - expired_items,
            "expired_items": expired_items,
            "memory_usage_bytes": len(json.dumps(list(self.cache.values())))
        }


class MCPBridgeRequest(BaseModel):
    """Request model for MCP bridge calls"""
    service: str
    method: str
    params: Dict[str, Any] = {}
    use_cache: bool = True


class MCPBridgeResponse(BaseModel):
    """Response model for MCP bridge calls"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str
    service: Optional[str] = None
    method: Optional[str] = None


class MCPBridgeClient:
    """Client for connecting to MCP services through Next.js bridge"""

    def __init__(self):
        self.base_url = settings.FRONTEND_API_URL
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache = MCPCacheManager()

    async def get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()

    async def call_mcp_service(
        self,
        service: str,
        method: str,
        params: Dict[str, Any],
        timeout: int = 30,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Call MCP service through Next.js bridge."""

        # Check cache first
        if use_cache:
            cached_result = await self.cache.get(service, method, params)
            if cached_result is not None:
                return cached_result

        session = await self.get_session()

        try:
            async with session.post(
                f"{self.base_url}/api/mcp-bridge",
                json={
                    "service": service,
                    "method": method,
                    "params": params
                },
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                result = await response.json()

                if not result.get("success"):
                    error_msg = result.get("error", "Unknown MCP service error")
                    logger.error(f"MCP service error: {service}.{method} - {error_msg}")
                    raise MCPServiceError(f"MCP service error: {error_msg}")

                data = result.get("data")

                # Cache successful results
                if use_cache and data is not None:
                    # Different TTL for different services
                    ttl = self._get_cache_ttl(service, method)
                    await self.cache.set(service, method, params, data, ttl)

                logger.info(f"MCP service call successful: {service}.{method}")
                return data

        except asyncio.TimeoutError:
            error_msg = f"MCP service timeout: {service}.{method}"
            logger.error(error_msg)
            raise MCPServiceError(error_msg)
        except aiohttp.ClientError as e:
            error_msg = f"MCP bridge connection error: {str(e)}"
            logger.error(error_msg)
            raise MCPServiceError(error_msg)
        except Exception as e:
            error_msg = f"MCP bridge error: {str(e)}"
            logger.error(error_msg)
            raise MCPServiceError(error_msg)

    def _get_cache_ttl(self, service: str, method: str) -> int:
        """Get appropriate cache TTL for different services"""
        cache_ttls = {
            "signals": {
                "getCurrentSignals": 300,  # 5 minutes
                "getFastSignals": 120,     # 2 minutes
                "getSignalByType": 300,    # 5 minutes
            },
            "perplexity": {
                "researchClaim": 3600,     # 1 hour - research is stable
                "testConnection": 60,      # 1 minute
            },
            "web-search": {
                "search": 1800,            # 30 minutes - news changes
                "testConnectivity": 60,    # 1 minute
            },
            "economic-data": {
                "getIndicator": 3600,      # 1 hour - economic data is stable
            }
        }

        return cache_ttls.get(service, {}).get(method, 300)  # Default 5 minutes

    # Gayed Signals Methods
    async def get_gayed_signals(self, use_cache: bool = True) -> Dict[str, Any]:
        """Get current Gayed signal calculations."""
        return await self.call_mcp_service(
            "signals",
            "getCurrentSignals",
            {},
            use_cache=use_cache
        )

    async def get_fast_signals(self, use_cache: bool = True) -> Dict[str, Any]:
        """Get fast Gayed signal calculations for quick analysis."""
        return await self.call_mcp_service(
            "signals",
            "getFastSignals",
            {},
            use_cache=use_cache
        )

    async def get_signal_by_type(
        self,
        signal_type: str,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get specific signal type calculation."""
        return await self.call_mcp_service(
            "signals",
            "getSignalByType",
            {"signalType": signal_type},
            use_cache=use_cache
        )

    # Perplexity Methods
    async def search_perplexity(
        self,
        query: str,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """Search using Perplexity MCP service for academic research."""
        return await self.call_mcp_service(
            "perplexity",
            "researchClaim",
            {"claimText": query},
            use_cache=use_cache
        )

    async def test_perplexity_connection(self) -> bool:
        """Test Perplexity MCP service connection."""
        try:
            result = await self.call_mcp_service(
                "perplexity",
                "testConnection",
                {},
                use_cache=False
            )
            return bool(result)
        except Exception:
            return False

    # Web Search Methods
    async def search_web(
        self,
        query: str,
        agent_type: str = "NEWS",
        max_results: int = 5,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """Search web using existing web-search-service."""
        params = {
            "query": query,
            "agentType": agent_type,
            "maxResults": max_results
        }

        if include_domains:
            params["includeDomains"] = include_domains
        if exclude_domains:
            params["excludeDomains"] = exclude_domains

        return await self.call_mcp_service(
            "web-search",
            "search",
            params,
            use_cache=use_cache
        )

    async def test_web_search_connectivity(self) -> bool:
        """Test web search service connectivity."""
        try:
            result = await self.call_mcp_service(
                "web-search",
                "testConnectivity",
                {},
                use_cache=False
            )
            return bool(result)
        except Exception:
            return False

    # Economic Data Methods (FRED API integration)
    async def get_economic_data(
        self,
        method: str,
        params: Dict[str, Any],
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get economic data from FRED API through MCP bridge."""
        return await self.call_mcp_service(
            "economic-data",
            method,
            params,
            use_cache=use_cache
        )

    async def get_fred_indicator(
        self,
        indicator: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        transform: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get specific FRED indicator data."""
        params = {"indicator": indicator}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if limit:
            params["limit"] = limit
        if transform:
            params["transform"] = transform

        return await self.get_economic_data("getIndicator", params, use_cache)

    async def get_fred_batch_indicators(
        self,
        indicators: List[str],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get multiple FRED indicators in batch."""
        params = {"indicators": indicators}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if limit:
            params["limit"] = limit

        return await self.get_economic_data("getBatchIndicators", params, use_cache)

    async def get_fred_latest_indicators(
        self,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get latest housing and employment indicators."""
        return await self.get_economic_data("getLatestIndicators", {}, use_cache)

    async def get_fred_housing_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get comprehensive housing market data."""
        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if limit:
            params["limit"] = limit

        return await self.get_economic_data("getHousingData", params, use_cache)

    async def get_fred_employment_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Get comprehensive employment market data."""
        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if limit:
            params["limit"] = limit

        return await self.get_economic_data("getEmploymentData", params, use_cache)

    # Utility Methods
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all MCP services."""
        session = await self.get_session()

        try:
            async with session.get(
                f"{self.base_url}/api/mcp-bridge"
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"status": "unhealthy", "error": f"HTTP {response.status}"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return self.cache.get_cache_stats()

    def clear_cache(self):
        """Clear all cached MCP responses."""
        self.cache.clear_cache()


# Singleton instance for use throughout the application
mcp_bridge_client = MCPBridgeClient()


# Context manager for proper cleanup
class MCPBridgeContext:
    """Context manager for MCP bridge client with proper cleanup"""

    def __init__(self):
        self.client = mcp_bridge_client

    async def __aenter__(self):
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.close()


# Convenience function for quick access
async def get_mcp_client() -> MCPBridgeClient:
    """Get the singleton MCP bridge client"""
    return mcp_bridge_client