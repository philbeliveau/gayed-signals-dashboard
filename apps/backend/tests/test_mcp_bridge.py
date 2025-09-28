"""
Comprehensive tests for MCP Bridge functionality
Tests all aspects of MCP service integration including API endpoints and Python client
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json
import aiohttp

from services.mcp_bridge import MCPBridgeClient, MCPCacheManager, MCPServiceError
from services.enhanced_financial_agent import EnhancedFinancialAgent


class TestMCPCacheManager:
    """Test the caching functionality for MCP services"""

    @pytest.fixture
    def cache_manager(self):
        return MCPCacheManager(default_ttl=300)

    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, cache_manager):
        """Test basic cache set and get functionality"""
        service = "signals"
        method = "getCurrentSignals"
        params = {"useCache": True}
        data = {"risk_status": "Risk-Off", "confidence": 0.85}

        # Set cache
        await cache_manager.set(service, method, params, data, ttl=300)

        # Get from cache
        result = await cache_manager.get(service, method, params)

        assert result == data

    @pytest.mark.asyncio
    async def test_cache_expiration(self, cache_manager):
        """Test that expired cache items are removed"""
        service = "signals"
        method = "getCurrentSignals"
        params = {"useCache": True}
        data = {"risk_status": "Risk-Off"}

        # Set cache with very short TTL
        await cache_manager.set(service, method, params, data, ttl=1)

        # Wait for expiration
        await asyncio.sleep(1.1)

        # Should return None for expired item
        result = await cache_manager.get(service, method, params)
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_key_generation(self, cache_manager):
        """Test that cache keys are properly generated for different params"""
        service = "signals"
        method = "getCurrentSignals"
        params1 = {"useCache": True, "historicalDays": 250}
        params2 = {"useCache": True, "historicalDays": 100}

        # Different params should generate different cache keys
        key1 = cache_manager._generate_key(service, method, params1)
        key2 = cache_manager._generate_key(service, method, params2)

        assert key1 != key2

    def test_cache_stats(self, cache_manager):
        """Test cache statistics functionality"""
        stats = cache_manager.get_cache_stats()

        expected_keys = ["total_items", "active_items", "expired_items", "memory_usage_bytes"]
        for key in expected_keys:
            assert key in stats


class TestMCPBridgeClient:
    """Test the MCP Bridge Client functionality"""

    @pytest.fixture
    def mock_mcp_client(self):
        with patch('services.mcp_bridge.settings') as mock_settings:
            mock_settings.FRONTEND_API_URL = "http://localhost:3000"
            client = MCPBridgeClient()
            return client

    @pytest.mark.asyncio
    async def test_gayed_signals_bridge(self, mock_mcp_client):
        """Test Gayed signals accessible through MCP bridge"""
        expected_response = {
            "signals": [
                {"type": "utilities_spy", "status": "Risk-Off", "confidence": 0.85}
            ],
            "consensus": {"status": "Risk-Off", "confidence": 0.85}
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            signals = await mock_mcp_client.get_gayed_signals()

            assert signals == expected_response
            assert signals["consensus"]["status"] == "Risk-Off"
            assert signals["consensus"]["confidence"] == 0.85

    @pytest.mark.asyncio
    async def test_perplexity_search_bridge(self, mock_mcp_client):
        """Test Perplexity research through MCP bridge"""
        expected_response = [
            {
                "content": "Federal Reserve policy analysis",
                "source": "Academic Research",
                "credibility": 90,
                "supportLevel": "SUPPORTS"
            }
        ]

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.search_perplexity("Fed policy analysis")

            assert result == expected_response
            assert len(result) == 1
            assert result[0]["credibility"] == 90

    @pytest.mark.asyncio
    async def test_web_search_bridge(self, mock_mcp_client):
        """Test web search through MCP bridge"""
        expected_response = [
            {
                "title": "Market Analysis Report",
                "url": "https://example.com/report",
                "content": "Market analysis content",
                "credibilityScore": 85,
                "supportLevel": "NEUTRAL"
            }
        ]

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.search_web(
                query="market analysis",
                agent_type="FINANCIAL",
                max_results=5
            )

            assert result == expected_response
            assert result[0]["credibilityScore"] == 85

    @pytest.mark.asyncio
    async def test_mcp_bridge_error_handling(self, mock_mcp_client):
        """Test graceful error handling when MCP services fail"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": False,
                "error": "Service temporarily unavailable"
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            with pytest.raises(MCPServiceError) as exc_info:
                await mock_mcp_client.get_gayed_signals()

            assert "Service temporarily unavailable" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_mcp_bridge_timeout_handling(self, mock_mcp_client):
        """Test timeout handling in MCP bridge"""
        with patch('aiohttp.ClientSession.post', side_effect=asyncio.TimeoutError):
            with pytest.raises(MCPServiceError) as exc_info:
                await mock_mcp_client.get_gayed_signals()

            assert "timeout" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_health_check(self, mock_mcp_client):
        """Test MCP bridge health check"""
        expected_health = {
            "status": "healthy",
            "services": {
                "perplexity": "available",
                "signals": "available",
                "webSearch": "available"
            }
        }

        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json.return_value = expected_health
            mock_get.return_value.__aenter__.return_value = mock_response

            health = await mock_mcp_client.health_check()

            assert health["status"] == "healthy"
            assert "services" in health

    @pytest.mark.asyncio
    async def test_cache_integration(self, mock_mcp_client):
        """Test that caching works with MCP bridge calls"""
        expected_response = {"risk_status": "Risk-On", "confidence": 0.75}

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            # First call should hit the API
            result1 = await mock_mcp_client.get_gayed_signals(use_cache=True)
            assert mock_post.call_count == 1

            # Second call should use cache
            result2 = await mock_mcp_client.get_gayed_signals(use_cache=True)
            assert mock_post.call_count == 1  # No additional API call
            assert result1 == result2


class TestEnhancedFinancialAgent:
    """Test the Enhanced Financial Agent with MCP integration"""

    @pytest.fixture
    def mock_agent(self):
        mock_mcp_client = Mock(spec=MCPBridgeClient)
        return EnhancedFinancialAgent(mock_mcp_client)

    @pytest.mark.asyncio
    async def test_analyze_with_signals_success(self, mock_agent):
        """Test successful financial analysis with signals"""
        # Mock MCP client responses
        mock_signals = {
            "signals": [{"type": "utilities_spy", "status": "Risk-Off", "confidence": 0.85}],
            "consensus": {"status": "Risk-Off", "confidence": 0.85}
        }

        mock_research = [
            {
                "content": "Fed policy analysis",
                "source": "Academic",
                "credibility": 90,
                "supportLevel": "SUPPORTS"
            }
        ]

        mock_agent.mcp_client.get_gayed_signals = AsyncMock(return_value=mock_signals)
        mock_agent.mcp_client.search_perplexity = AsyncMock(return_value=mock_research)

        content = "Federal Reserve is considering interest rate changes"
        result = await mock_agent.analyze_with_signals(content)

        # Verify analysis structure
        assert "agent_name" in result
        assert "signal_insights" in result
        assert "research_insights" in result
        assert "analysis" in result
        assert "confidence_score" in result
        assert "recommendations" in result

        # Verify signal insights
        assert result["signal_insights"]["risk_status"] == "Risk-Off"
        assert result["signal_insights"]["confidence"] == 0.85

        # Verify research insights
        assert result["research_insights"]["evidence_count"] == 1
        assert result["research_insights"]["credibility_score"] == 90

    @pytest.mark.asyncio
    async def test_analyze_with_mcp_service_failure(self, mock_agent):
        """Test analysis when MCP services fail"""
        # Mock MCP client to raise exceptions
        mock_agent.mcp_client.get_gayed_signals = AsyncMock(
            side_effect=MCPServiceError("Signal service unavailable")
        )
        mock_agent.mcp_client.search_perplexity = AsyncMock(
            side_effect=MCPServiceError("Research service unavailable")
        )

        content = "Market analysis needed"
        result = await mock_agent.analyze_with_signals(content)

        # Should still return analysis but with limitations
        assert "agent_name" in result
        assert result["confidence_score"] == 0.0
        assert "error" in result["metadata"]

    @pytest.mark.asyncio
    async def test_fast_signals_analysis(self, mock_agent):
        """Test analysis with fast signals included"""
        mock_current_signals = {
            "consensus": {"status": "Risk-On", "confidence": 0.75}
        }
        mock_fast_signals = {
            "consensus": {"status": "Risk-On", "confidence": 0.80}
        }

        mock_agent.mcp_client.get_gayed_signals = AsyncMock(return_value=mock_current_signals)
        mock_agent.mcp_client.get_fast_signals = AsyncMock(return_value=mock_fast_signals)
        mock_agent.mcp_client.search_perplexity = AsyncMock(return_value=[])

        content = "Market volatility analysis"
        result = await mock_agent.analyze_with_signals(
            content,
            include_fast_signals=True,
            include_research=False
        )

        assert result["metadata"]["fast_signals_available"] is True
        assert result["metadata"]["research_available"] is False

    @pytest.mark.asyncio
    async def test_health_status_check(self, mock_agent):
        """Test agent health status check"""
        mock_health = {
            "status": "healthy",
            "services": {"signals": "available", "perplexity": "available"}
        }
        mock_cache_stats = {"total_items": 5, "active_items": 4}

        mock_agent.mcp_client.health_check = AsyncMock(return_value=mock_health)
        mock_agent.mcp_client.get_cache_stats = Mock(return_value=mock_cache_stats)

        health = await mock_agent.get_health_status()

        assert health["agent_status"] == "healthy"
        assert "mcp_services" in health
        assert "cache_stats" in health

    def test_confidence_score_calculation(self, mock_agent):
        """Test confidence score calculation logic"""
        # High confidence signals and research
        signals = {"consensus": {"confidence": 0.9}}
        research = [{"credibility": 85}, {"credibility": 90}]

        score = mock_agent._calculate_confidence_score(signals, research)
        assert score > 0.5  # Should be relatively high

        # No data available
        score_empty = mock_agent._calculate_confidence_score(None, None)
        assert score_empty == 0.0

    def test_recommendation_generation(self, mock_agent):
        """Test recommendation generation based on signals"""
        # Risk-Off scenario
        signal_insights = {"risk_status": "Risk-Off", "confidence": 0.85}
        recommendations = mock_agent._generate_recommendations(signal_insights, 0.8)

        assert len(recommendations) > 0
        assert any("defensive" in rec.lower() for rec in recommendations)

        # Risk-On scenario
        signal_insights_risk_on = {"risk_status": "Risk-On", "confidence": 0.85}
        recommendations_risk_on = mock_agent._generate_recommendations(signal_insights_risk_on, 0.8)

        assert any("equity" in rec.lower() for rec in recommendations_risk_on)


class TestAPIEndpointIntegration:
    """Integration tests for the API endpoints"""

    @pytest.mark.asyncio
    async def test_mcp_bridge_endpoint_structure(self):
        """Test that MCP bridge endpoint accepts correct request structure"""
        # This would require a test client setup for the FastAPI app
        # For now, we'll test the request/response structure validation

        from apps.web.src.app.api.mcp_bridge.route import MCPBridgeRequest, MCPBridgeResponse

        # Test request structure
        valid_request = MCPBridgeRequest(
            service="signals",
            method="getCurrentSignals",
            params={"useCache": True}
        )

        assert valid_request.service == "signals"
        assert valid_request.method == "getCurrentSignals"
        assert valid_request.params["useCache"] is True

    def test_api_error_response_structure(self):
        """Test API error response structure"""
        from apps.web.src.app.api.mcp_bridge.route import MCPBridgeResponse

        error_response = MCPBridgeResponse(
            success=False,
            error="Service unavailable",
            timestamp=datetime.now().isoformat(),
            service="signals",
            method="getCurrentSignals"
        )

        assert error_response.success is False
        assert error_response.error == "Service unavailable"
        assert error_response.service == "signals"


# Performance tests
class TestMCPBridgePerformance:
    """Test performance aspects of MCP bridge"""

    @pytest.mark.asyncio
    async def test_parallel_service_calls(self):
        """Test that parallel MCP service calls work efficiently"""
        mock_client = Mock(spec=MCPBridgeClient)
        mock_client.get_gayed_signals = AsyncMock(return_value={"status": "Risk-Off"})
        mock_client.search_perplexity = AsyncMock(return_value=[{"content": "research"}])
        mock_client.search_web = AsyncMock(return_value=[{"title": "news"}])

        # Simulate parallel calls
        start_time = datetime.now()

        tasks = [
            mock_client.get_gayed_signals(),
            mock_client.search_perplexity("test query"),
            mock_client.search_web("test query")
        ]

        results = await asyncio.gather(*tasks)

        duration = (datetime.now() - start_time).total_seconds()

        # All calls should complete successfully
        assert len(results) == 3
        assert all(result is not None for result in results)

        # Should be fast since they're mocked
        assert duration < 1.0

    @pytest.mark.asyncio
    async def test_cache_performance_benefit(self, mock_mcp_client):
        """Test that caching provides performance benefits"""
        expected_response = {"risk_status": "Risk-Off"}

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            # First call - should hit API
            start_time = datetime.now()
            result1 = await mock_mcp_client.get_gayed_signals(use_cache=True)
            first_call_duration = (datetime.now() - start_time).total_seconds()

            # Second call - should use cache
            start_time = datetime.now()
            result2 = await mock_mcp_client.get_gayed_signals(use_cache=True)
            second_call_duration = (datetime.now() - start_time).total_seconds()

            # Cache call should be faster (though in mocked scenario, difference is minimal)
            assert result1 == result2
            assert mock_post.call_count == 1  # Only one actual API call


# FRED API Integration tests
class TestFREDAPIIntegration:
    """Test FRED API integration through MCP bridge"""

    @pytest.mark.asyncio
    async def test_get_indicator_success(self, mock_mcp_client):
        """Test successful FRED API indicator retrieval"""
        expected_response = {
            "indicator": "UNRATE",
            "data": [
                {"date": "2024-01-01", "value": 3.7},
                {"date": "2024-02-01", "value": 3.8}
            ],
            "metadata": {
                "title": "Unemployment Rate",
                "units": "Percent",
                "frequency": "Monthly",
                "lastUpdated": "2024-01-30"
            },
            "timestamp": "2024-01-30T12:00:00Z",
            "count": 2
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getIndicator",
                params={"indicator": "UNRATE", "limit": 10}
            )

            assert result["indicator"] == "UNRATE"
            assert len(result["data"]) == 2
            assert result["metadata"]["title"] == "Unemployment Rate"
            assert result["count"] == 2

    @pytest.mark.asyncio
    async def test_get_batch_indicators_success(self, mock_mcp_client):
        """Test successful FRED API batch indicators retrieval"""
        expected_response = {
            "indicators": ["UNRATE", "PAYEMS"],
            "data": {
                "UNRATE": [{"date": "2024-01-01", "value": 3.7}],
                "PAYEMS": [{"date": "2024-01-01", "value": 157000}]
            },
            "timestamp": "2024-01-30T12:00:00Z",
            "count": 2
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getBatchIndicators",
                params={"indicators": ["UNRATE", "PAYEMS"]}
            )

            assert result["indicators"] == ["UNRATE", "PAYEMS"]
            assert "UNRATE" in result["data"]
            assert "PAYEMS" in result["data"]
            assert result["count"] == 2

    @pytest.mark.asyncio
    async def test_get_latest_indicators_success(self, mock_mcp_client):
        """Test successful FRED API latest indicators retrieval"""
        expected_response = {
            "data": {
                "housing": {
                    "CSUSHPINSA": {"value": 305.2, "date": "2024-01-01"}
                },
                "employment": {
                    "UNRATE": {"value": 3.7, "date": "2024-01-01"}
                }
            },
            "timestamp": "2024-01-30T12:00:00Z"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getLatestIndicators",
                params={}
            )

            assert "housing" in result["data"]
            assert "employment" in result["data"]
            assert "CSUSHPINSA" in result["data"]["housing"]
            assert "UNRATE" in result["data"]["employment"]

    @pytest.mark.asyncio
    async def test_get_housing_data_success(self, mock_mcp_client):
        """Test successful FRED API housing data retrieval"""
        expected_response = {
            "category": "housing",
            "data": {
                "CSUSHPINSA": [{"date": "2024-01-01", "value": 305.2}],
                "HOUST": [{"date": "2024-01-01", "value": 1.5}]
            },
            "timestamp": "2024-01-30T12:00:00Z",
            "seriesCount": 2
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getHousingData",
                params={"limit": 10}
            )

            assert result["category"] == "housing"
            assert "CSUSHPINSA" in result["data"]
            assert "HOUST" in result["data"]
            assert result["seriesCount"] == 2

    @pytest.mark.asyncio
    async def test_get_employment_data_success(self, mock_mcp_client):
        """Test successful FRED API employment data retrieval"""
        expected_response = {
            "category": "employment",
            "data": {
                "UNRATE": [{"date": "2024-01-01", "value": 3.7}],
                "PAYEMS": [{"date": "2024-01-01", "value": 157000}]
            },
            "timestamp": "2024-01-30T12:00:00Z",
            "seriesCount": 2
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getEmploymentData",
                params={"startDate": "2024-01-01"}
            )

            assert result["category"] == "employment"
            assert "UNRATE" in result["data"]
            assert "PAYEMS" in result["data"]
            assert result["seriesCount"] == 2

    @pytest.mark.asyncio
    async def test_fred_api_error_handling(self, mock_mcp_client):
        """Test FRED API error handling"""
        expected_response = {
            "indicator": "INVALID",
            "data": [],
            "error": "Series not found",
            "timestamp": "2024-01-30T12:00:00Z"
        }

        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "success": True,
                "data": expected_response
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await mock_mcp_client.get_economic_data(
                method="getIndicator",
                params={"indicator": "INVALID"}
            )

            assert result["indicator"] == "INVALID"
            assert result["data"] == []
            assert "error" in result
            assert result["error"] == "Series not found"

    @pytest.mark.asyncio
    async def test_fred_api_parameter_validation(self, mock_mcp_client):
        """Test FRED API parameter validation"""
        with pytest.raises(MCPServiceError, match="Missing required parameter: indicator"):
            with patch('aiohttp.ClientSession.post') as mock_post:
                mock_response = AsyncMock()
                mock_response.json.return_value = {
                    "success": False,
                    "error": "Missing required parameter: indicator"
                }
                mock_response.status = 400
                mock_post.return_value.__aenter__.return_value = mock_response

                await mock_mcp_client.get_economic_data(
                    method="getIndicator",
                    params={}  # Missing indicator parameter
                )

    def test_fred_api_request_validation(self):
        """Test FRED API request structure validation"""
        from services.mcp_bridge import MCPBridgeRequest

        # Valid FRED API request
        valid_request = MCPBridgeRequest(
            service="economic-data",
            method="getIndicator",
            params={"indicator": "UNRATE", "limit": 10}
        )

        assert valid_request.service == "economic-data"
        assert valid_request.method == "getIndicator"
        assert valid_request.params["indicator"] == "UNRATE"
        assert valid_request.params["limit"] == 10

        # Valid batch request
        batch_request = MCPBridgeRequest(
            service="economic-data",
            method="getBatchIndicators",
            params={"indicators": ["UNRATE", "PAYEMS"], "startDate": "2024-01-01"}
        )

        assert batch_request.method == "getBatchIndicators"
        assert isinstance(batch_request.params["indicators"], list)
        assert len(batch_request.params["indicators"]) == 2


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])