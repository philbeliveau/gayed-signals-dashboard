"""
Tests for Gayed Signals Service
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import aiohttp

from services.gayed_signals_service import GayedSignalsService, create_gayed_signals_service


class TestGayedSignalsService:
    """Test suite for Gayed Signals Service"""

    @pytest.fixture
    def service(self):
        """Create Gayed Signals Service instance"""
        return GayedSignalsService("http://localhost:3000")

    @pytest.fixture
    async def mock_session(self):
        """Create mock aiohttp session"""
        session = AsyncMock(spec=aiohttp.ClientSession)
        return session

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test service initializes correctly"""
        service = GayedSignalsService("http://test.example.com")

        assert service.frontend_url == "http://test.example.com"
        assert service.session is None
        assert service._cache_ttl == 300
        assert len(service._cache) == 0

    @pytest.mark.asyncio
    async def test_default_frontend_url(self):
        """Test service uses default frontend URL"""
        with patch('services.gayed_signals_service.settings') as mock_settings:
            mock_settings.FRONTEND_URL = "http://configured.example.com"

            service = GayedSignalsService()
            assert service.frontend_url == "http://configured.example.com"

    @pytest.mark.asyncio
    async def test_ensure_session(self, service):
        """Test session creation"""
        assert service.session is None

        await service._ensure_session()

        assert service.session is not None
        assert isinstance(service.session, aiohttp.ClientSession)

        await service.close()

    @pytest.mark.asyncio
    async def test_make_request_success(self, service, mock_session):
        """Test successful API request"""
        # Mock response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {"test": "data"}

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        result = await service._make_request("test/endpoint")

        assert result == {"test": "data"}
        mock_session.get.assert_called_once_with(
            "http://localhost:3000/api/test/endpoint",
            params=None
        )

    @pytest.mark.asyncio
    async def test_make_request_error(self, service, mock_session):
        """Test API request error handling"""
        # Mock error response
        mock_response = AsyncMock()
        mock_response.status = 500
        mock_response.text.return_value = "Internal Server Error"

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        with pytest.raises(Exception, match="Frontend API error: 500"):
            await service._make_request("test/endpoint")

    @pytest.mark.asyncio
    async def test_make_request_network_error(self, service, mock_session):
        """Test network error handling"""
        mock_session.get.side_effect = aiohttp.ClientError("Connection failed")
        service.session = mock_session

        with pytest.raises(Exception, match="Network error"):
            await service._make_request("test/endpoint")

    @pytest.mark.asyncio
    async def test_cache_operations(self, service):
        """Test cache set and get operations"""
        cache_key = "test_key"
        test_data = {"test": "data"}

        # Initially no cache
        assert not service._is_cache_valid(cache_key)
        assert service._get_cache(cache_key) is None

        # Set cache
        service._set_cache(cache_key, test_data)

        # Should be valid and retrievable
        assert service._is_cache_valid(cache_key)
        assert service._get_cache(cache_key) == test_data

    @pytest.mark.asyncio
    async def test_cache_expiry(self, service):
        """Test cache expiry functionality"""
        cache_key = "test_key"
        test_data = {"test": "data"}

        # Set cache with manual timestamp (expired)
        expired_timestamp = datetime.now().timestamp() - 400  # 400 seconds ago
        service._cache[cache_key] = {
            "data": test_data,
            "timestamp": expired_timestamp
        }

        # Should be expired
        assert not service._is_cache_valid(cache_key)
        assert service._get_cache(cache_key) is None

    @pytest.mark.asyncio
    async def test_get_current_signals_success(self, service, mock_session):
        """Test successful current signals retrieval"""
        # Mock API response
        mock_response_data = {
            "consensus": {
                "status": "Risk-Off",
                "confidence": 0.85,
                "risk_on_count": 1,
                "risk_off_count": 3,
                "neutral_count": 1
            },
            "signals": [
                {
                    "type": "utilities_spy",
                    "signal": "Risk-Off",
                    "value": 0.91,
                    "confidence": 0.87
                }
            ]
        }

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        result = await service.get_current_signals()

        assert result == mock_response_data
        assert result["consensus"]["status"] == "Risk-Off"
        assert len(result["signals"]) == 1

        # Verify caching
        assert service._is_cache_valid("current_signals")

    @pytest.mark.asyncio
    async def test_get_current_signals_cached(self, service):
        """Test current signals retrieval from cache"""
        # Pre-populate cache
        cached_data = {"consensus": {"status": "Risk-On"}, "signals": []}
        service._set_cache("current_signals", cached_data)

        result = await service.get_current_signals()

        assert result == cached_data

    @pytest.mark.asyncio
    async def test_get_current_signals_error(self, service, mock_session):
        """Test current signals retrieval error handling"""
        mock_session.get.side_effect = Exception("API failure")
        service.session = mock_session

        result = await service.get_current_signals()

        # Should return fallback data
        assert result["consensus"]["status"] == "Unknown"
        assert result["consensus"]["confidence"] == 0.0
        assert result["error"] == "Failed to retrieve current signals"
        assert result["fallback"] is True

    @pytest.mark.asyncio
    async def test_get_fast_signals_success(self, service, mock_session):
        """Test successful fast signals retrieval"""
        mock_response_data = {
            "consensus": {"status": "Risk-On", "confidence": 0.78},
            "fast_signals": [{"type": "utilities_spy", "signal": "Risk-On"}]
        }

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        result = await service.get_fast_signals()

        assert result == mock_response_data
        mock_session.get.assert_called_once_with(
            "http://localhost:3000/api/signals/fast",
            params=None
        )

    @pytest.mark.asyncio
    async def test_get_signal_history_success(self, service, mock_session):
        """Test successful signal history retrieval"""
        mock_response_data = {
            "period": {"start_date": "2023-01-01", "end_date": "2023-01-31"},
            "historical_signals": []
        }

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        result = await service.get_signal_history(30)

        assert result == mock_response_data
        mock_session.get.assert_called_once_with(
            "http://localhost:3000/api/signals/history",
            params={"days": 30}
        )

    @pytest.mark.asyncio
    async def test_get_market_data_status_success(self, service, mock_session):
        """Test successful market data status retrieval"""
        mock_response_data = {
            "overall_status": "healthy",
            "health_score": 95,
            "signal_infrastructure": {}
        }

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_response_data

        mock_session.get.return_value.__aenter__.return_value = mock_response
        service.session = mock_session

        result = await service.get_market_data_status()

        assert result == mock_response_data
        assert result["overall_status"] == "healthy"

    @pytest.mark.asyncio
    async def test_extract_signal_insights_success(self, service):
        """Test signal insights extraction from valid data"""
        signals_data = {
            "consensus": {
                "status": "Risk-Off",
                "confidence": 0.85,
                "risk_on_count": 1,
                "risk_off_count": 3,
                "neutral_count": 1
            },
            "signals": [
                {
                    "type": "utilities_spy",
                    "signal": "Risk-Off",
                    "value": 0.91,
                    "confidence": 0.87,
                    "timestamp": "2023-01-01T00:00:00Z"
                },
                {
                    "type": "lumber_gold",
                    "signal": "Risk-Off",
                    "value": 1.15,
                    "confidence": 0.82,
                    "timestamp": "2023-01-01T00:00:00Z"
                }
            ]
        }

        insights = service.extract_signal_insights(signals_data)

        assert insights["market_regime"] == "Risk-Off"
        assert insights["confidence"] == 0.85
        assert insights["signal_count"] == 2
        assert insights["risk_distribution"]["risk_off"] == 3
        assert insights["risk_distribution"]["risk_on"] == 1
        assert len(insights["individual_signals"]) == 2
        assert len(insights["actionable_insights"]) > 0
        assert "defensive signal" in insights["actionable_insights"][0].lower()

    @pytest.mark.asyncio
    async def test_extract_signal_insights_fallback(self, service):
        """Test signal insights extraction from fallback data"""
        fallback_data = {
            "consensus": {"status": "Unknown", "confidence": 0.0},
            "signals": [],
            "error": "API failure",
            "fallback": True
        }

        insights = service.extract_signal_insights(fallback_data)

        assert insights["status"] == "error"
        assert insights["message"] == "API failure"
        assert insights["confidence"] == 0.0
        assert len(insights["actionable_insights"]) == 0

    @pytest.mark.asyncio
    async def test_extract_signal_insights_risk_on(self, service):
        """Test signal insights for Risk-On scenario"""
        signals_data = {
            "consensus": {
                "status": "Risk-On",
                "confidence": 0.92,
                "risk_on_count": 4,
                "risk_off_count": 1,
                "neutral_count": 0
            },
            "signals": [
                {"type": "utilities_spy", "signal": "Risk-On", "value": 0.85, "confidence": 0.92}
            ]
        }

        insights = service.extract_signal_insights(signals_data)

        assert insights["market_regime"] == "Risk-On"
        assert insights["confidence"] == 0.92
        assert "growth signal" in insights["actionable_insights"][0].lower()
        assert "cyclical sectors" in insights["actionable_insights"][2].lower()

    @pytest.mark.asyncio
    async def test_extract_signal_insights_low_confidence(self, service):
        """Test signal insights for low confidence scenario"""
        signals_data = {
            "consensus": {
                "status": "Mixed",
                "confidence": 0.45,
                "risk_on_count": 2,
                "risk_off_count": 2,
                "neutral_count": 1
            },
            "signals": []
        }

        insights = service.extract_signal_insights(signals_data)

        assert insights["market_regime"] == "Mixed"
        assert insights["confidence"] == 0.45
        assert "low confidence" in insights["actionable_insights"][0].lower()
        assert "caution" in insights["actionable_insights"][1].lower()

    @pytest.mark.asyncio
    async def test_close_session(self, service):
        """Test session closing"""
        # Create a session
        await service._ensure_session()
        assert service.session is not None

        # Close session
        await service.close()
        assert service.session is None

    @pytest.mark.asyncio
    async def test_clear_cache(self, service):
        """Test cache clearing"""
        # Add some cache data
        service._set_cache("test1", {"data": "value1"})
        service._set_cache("test2", {"data": "value2"})
        assert len(service._cache) == 2

        # Clear cache
        service.clear_cache()
        assert len(service._cache) == 0

    @pytest.mark.asyncio
    async def test_factory_function(self):
        """Test factory function creates service correctly"""
        service = create_gayed_signals_service()

        assert isinstance(service, GayedSignalsService)
        assert service.frontend_url.startswith("http")


class TestIntegrationScenarios:
    """Integration test scenarios"""

    @pytest.mark.asyncio
    async def test_full_signal_workflow(self):
        """Test complete signal retrieval workflow"""
        service = GayedSignalsService("http://localhost:3000")

        # Mock successful responses for all endpoints
        with patch.object(service, '_make_request') as mock_request:
            # Setup different responses for different endpoints
            def mock_response(endpoint, params=None):
                if endpoint == "signals/current":
                    return {
                        "consensus": {"status": "Risk-Off", "confidence": 0.85},
                        "signals": [{"type": "utilities_spy", "signal": "Risk-Off"}]
                    }
                elif endpoint == "signals/fast":
                    return {
                        "consensus": {"status": "Risk-Off", "confidence": 0.87},
                        "fast_signals": [{"type": "utilities_spy", "signal": "Risk-Off"}]
                    }
                elif endpoint == "signals/status":
                    return {"overall_status": "healthy", "health_score": 95}
                elif endpoint == "signals/history":
                    return {"historical_signals": [], "period": {}}

            mock_request.side_effect = mock_response

            # Test all endpoints
            current = await service.get_current_signals()
            fast = await service.get_fast_signals()
            status = await service.get_market_data_status()
            history = await service.get_signal_history(30)

            # Verify all calls succeeded
            assert current["consensus"]["status"] == "Risk-Off"
            assert fast["consensus"]["status"] == "Risk-Off"
            assert status["overall_status"] == "healthy"
            assert "historical_signals" in history

            # Verify extract insights works
            insights = service.extract_signal_insights(current)
            assert insights["market_regime"] == "Risk-Off"

        await service.close()

    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self):
        """Test error recovery and fallback behavior"""
        service = GayedSignalsService("http://localhost:3000")

        # Mock API failures
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = Exception("Network failure")

            # Test error handling
            current = await service.get_current_signals()
            fast = await service.get_fast_signals()

            # Verify fallback responses
            assert current["fallback"] is True
            assert current["consensus"]["status"] == "Unknown"
            assert fast["fallback"] is True

            # Verify insights extraction handles fallback data
            insights = service.extract_signal_insights(current)
            assert insights["status"] == "error"

        await service.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])