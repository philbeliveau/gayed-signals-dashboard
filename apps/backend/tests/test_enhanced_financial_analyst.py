"""
Tests for Enhanced Financial Analyst Agent with Gayed Signals Integration
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from agents.enhanced_financial_analyst import EnhancedFinancialAnalystAgent, create_enhanced_financial_analyst
from services.gayed_signals_service import GayedSignalsService


class TestEnhancedFinancialAnalystAgent:
    """Test suite for Enhanced Financial Analyst Agent"""

    @pytest.fixture
    def mock_signals_service(self):
        """Create mock signals service"""
        service = AsyncMock(spec=GayedSignalsService)
        service.get_current_signals.return_value = {
            "consensus": {
                "status": "Risk-Off",
                "confidence": 0.85,
                "risk_on_count": 1,
                "risk_off_count": 3,
                "neutral_count": 1,
                "timestamp": datetime.now().isoformat()
            },
            "signals": [
                {
                    "type": "utilities_spy",
                    "signal": "Risk-Off",
                    "value": 0.91,
                    "confidence": 0.87,
                    "timestamp": datetime.now().isoformat()
                }
            ]
        }
        service.extract_signal_insights.return_value = {
            "market_regime": "Risk-Off",
            "confidence": 0.85,
            "signal_count": 1,
            "actionable_insights": ["Strong defensive signal with 85% confidence"]
        }
        return service

    @pytest.fixture
    def mock_mcp_client(self):
        """Create mock MCP client"""
        client = AsyncMock()
        client.search_perplexity.return_value = [
            {
                "source": "Bloomberg",
                "content": "Market volatility increasing amid Fed policy uncertainty",
                "credibility": 90,
                "supportLevel": "NEUTRAL"
            }
        ]
        return client

    @pytest.fixture
    def agent(self, mock_signals_service, mock_mcp_client):
        """Create Enhanced Financial Analyst Agent with mocked services"""
        with patch('agents.enhanced_financial_analyst.create_gayed_signals_service', return_value=mock_signals_service), \
             patch('agents.enhanced_financial_analyst.MCPBridgeClient', return_value=mock_mcp_client):

            agent = EnhancedFinancialAnalystAgent()
            return agent

    @pytest.mark.asyncio
    async def test_agent_initialization(self):
        """Test agent initializes correctly"""
        with patch('agents.enhanced_financial_analyst.create_gayed_signals_service'), \
             patch('agents.enhanced_financial_analyst.MCPBridgeClient'):

            agent = EnhancedFinancialAnalystAgent()

            assert agent.name == "EnhancedFinancialAnalyst"
            assert "financial analyst" in agent.system_message
            assert "Gayed" in agent.system_message
            assert len(agent._conversation_context) == 0

    @pytest.mark.asyncio
    async def test_analyze_with_signals_success(self, agent, mock_signals_service, mock_mcp_client):
        """Test successful analysis with signals integration"""
        content = "Fed considering rate cuts amid market volatility"

        analysis = await agent.analyze_with_signals(content, include_research=True)

        # Verify analysis structure
        assert analysis["agent_name"] == "Enhanced Financial Analyst"
        assert analysis["agent_type"] == "autogen_with_gayed_signals"
        assert analysis["content_analyzed"] == content
        assert "signal_analysis" in analysis
        assert "research_analysis" in analysis
        assert "professional_analysis" in analysis
        assert "confidence_score" in analysis
        assert "recommendations" in analysis

        # Verify signal analysis
        signal_analysis = analysis["signal_analysis"]
        assert signal_analysis["status"] == "available"
        assert signal_analysis["market_regime"] == "Risk-Off"
        assert signal_analysis["confidence"] == 0.85

        # Verify professional analysis text
        assert "Risk-Off" in analysis["professional_analysis"]
        assert "85.0%" in analysis["professional_analysis"] or "85%" in analysis["professional_analysis"]

        # Verify recommendations include defensive positioning
        recommendations = analysis["recommendations"]
        assert any("defensive" in rec.lower() for rec in recommendations)

        # Verify services were called
        mock_signals_service.get_current_signals.assert_called_once()
        mock_mcp_client.search_perplexity.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_with_signals_no_research(self, agent, mock_signals_service):
        """Test analysis without external research"""
        content = "Market analysis request"

        analysis = await agent.analyze_with_signals(content, include_research=False)

        assert analysis["research_analysis"]["status"] == "unavailable"
        assert analysis["metadata"]["research_available"] is False

    @pytest.mark.asyncio
    async def test_analyze_with_signals_service_failure(self, agent, mock_signals_service, mock_mcp_client):
        """Test analysis when signals service fails"""
        mock_signals_service.get_current_signals.side_effect = Exception("Service unavailable")

        content = "Market analysis request"
        analysis = await agent.analyze_with_signals(content)

        # Should still return analysis but with unavailable signal data
        assert analysis["agent_type"] == "autogen_with_gayed_signals"
        assert analysis["signal_analysis"]["status"] == "unavailable"
        assert "Service unavailable" in analysis["signal_analysis"]["message"]
        assert analysis["confidence_score"] < 0.5  # Lower confidence due to missing signal data

    @pytest.mark.asyncio
    async def test_signal_data_analysis(self, agent):
        """Test signal data analysis functionality"""
        signals_data = {
            "signal_insights": {
                "market_regime": "Risk-On",
                "confidence": 0.78,
                "signal_count": 3,
                "actionable_insights": ["Growth signal detected"]
            },
            "current_signals": {
                "consensus": {"status": "Risk-On", "confidence": 0.78}
            },
            "data_quality": "real_time"
        }

        analysis = agent._analyze_signal_data(signals_data)

        assert analysis["status"] == "available"
        assert analysis["market_regime"] == "Risk-On"
        assert analysis["confidence"] == 0.78
        assert analysis["signal_count"] == 3
        assert "Growth signal detected" in analysis["actionable_insights"]

    @pytest.mark.asyncio
    async def test_signal_data_analysis_error(self, agent):
        """Test signal data analysis with error data"""
        signals_data = {"error": "Service unavailable"}

        analysis = agent._analyze_signal_data(signals_data)

        assert analysis["status"] == "unavailable"
        assert "Service unavailable" in analysis["message"]
        assert analysis["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_research_data_analysis(self, agent):
        """Test research data analysis functionality"""
        research_data = [
            {
                "source": "Reuters",
                "content": "Federal Reserve maintains hawkish stance on inflation",
                "credibility": 95,
                "supportLevel": "SUPPORTING"
            },
            {
                "source": "MarketWatch",
                "content": "Tech stocks under pressure",
                "credibility": 80,
                "supportLevel": "NEUTRAL"
            }
        ]

        analysis = agent._analyze_research_data(research_data)

        assert analysis["status"] == "available"
        assert analysis["evidence_count"] == 2
        assert analysis["credibility_score"] == 87.5  # Average of 95 and 80
        assert len(analysis["key_findings"]) == 2

    @pytest.mark.asyncio
    async def test_confidence_calculation(self, agent):
        """Test confidence score calculation"""
        signal_analysis = {
            "status": "available",
            "confidence": 0.9
        }
        research_analysis = {
            "status": "available",
            "evidence_count": 3,
            "credibility_score": 85.0
        }
        historical_context = {
            "status": "available"
        }

        confidence = agent._calculate_enhanced_confidence(
            signal_analysis, research_analysis, historical_context
        )

        # Should be weighted: 0.9 * 0.7 + (3/5 * 0.85) * 0.2 + 0.8 * 0.1
        expected = 0.9 * 0.7 + (3/5 * 0.85) * 0.2 + 0.8 * 0.1
        assert abs(confidence - expected) < 0.01

    @pytest.mark.asyncio
    async def test_recommendations_defensive(self, agent):
        """Test recommendations for defensive signals"""
        signal_analysis = {
            "status": "available",
            "market_regime": "Risk-Off",
            "confidence": 0.85,
            "actionable_insights": ["Defensive positioning recommended"]
        }

        recommendations = agent._generate_enhanced_recommendations(signal_analysis, 0.8)

        assert any("defensive" in rec.lower() for rec in recommendations)
        assert any("utilities" in rec.lower() for rec in recommendations)
        assert any("risk management" in rec.lower() for rec in recommendations)

    @pytest.mark.asyncio
    async def test_recommendations_growth(self, agent):
        """Test recommendations for growth signals"""
        signal_analysis = {
            "status": "available",
            "market_regime": "Risk-On",
            "confidence": 0.82,
            "actionable_insights": ["Growth opportunity identified"]
        }

        recommendations = agent._generate_enhanced_recommendations(signal_analysis, 0.75)

        assert any("growth" in rec.lower() or "cyclical" in rec.lower() for rec in recommendations)
        assert any("equity" in rec.lower() for rec in recommendations)

    @pytest.mark.asyncio
    async def test_conversation_context(self, agent):
        """Test conversation context management"""
        content = "Market analysis request"
        analysis = {
            "signal_analysis": {"market_regime": "Risk-Off"},
            "confidence_score": 0.8,
            "recommendations": ["Defensive positioning", "Monitor VIX"]
        }

        initial_context_size = len(agent._conversation_context)
        agent._add_to_context(content, analysis)

        assert len(agent._conversation_context) == initial_context_size + 1

        context_entry = agent._conversation_context[-1]
        assert context_entry["market_regime"] == "Risk-Off"
        assert context_entry["confidence"] == 0.8
        assert len(context_entry["key_insights"]) == 2

    @pytest.mark.asyncio
    async def test_conversation_context_limit(self, agent):
        """Test conversation context size limit"""
        # Add 15 context entries (more than the 10 limit)
        for i in range(15):
            analysis = {
                "signal_analysis": {"market_regime": "Mixed"},
                "confidence_score": 0.5,
                "recommendations": [f"Recommendation {i}"]
            }
            agent._add_to_context(f"Content {i}", analysis)

        # Should only keep last 10
        assert len(agent._conversation_context) == 10
        assert agent._conversation_context[0]["content"] == "Content 5"

    @pytest.mark.asyncio
    async def test_health_status(self, agent, mock_signals_service, mock_mcp_client):
        """Test health status checking"""
        mock_signals_service.get_market_data_status.return_value = {
            "status": "healthy"
        }
        mock_mcp_client.health_check.return_value = {
            "perplexity": "healthy"
        }

        health = await agent.get_health_status()

        assert health["agent_status"] == "healthy"
        assert "signals_service" in health
        assert "mcp_services" in health
        assert "conversation_context_size" in health

    @pytest.mark.asyncio
    async def test_factory_function(self):
        """Test factory function creates agent correctly"""
        with patch('agents.enhanced_financial_analyst.create_gayed_signals_service'), \
             patch('agents.enhanced_financial_analyst.MCPBridgeClient'):

            agent = await create_enhanced_financial_analyst()

            assert isinstance(agent, EnhancedFinancialAnalystAgent)
            assert agent.name == "EnhancedFinancialAnalyst"

    @pytest.mark.asyncio
    async def test_content_theme_analysis(self, agent):
        """Test content theme analysis"""
        bullish_content = "Market growth and strong rally continue with increasing opportunities"
        bearish_content = "Market decline and weak performance with bearish signals"
        neutral_content = "Market remains stable and unchanged with flat performance"

        bullish_result = agent._analyze_content_themes(bullish_content)
        bearish_result = agent._analyze_content_themes(bearish_content)
        neutral_result = agent._analyze_content_themes(neutral_content)

        assert "optimistic" in bullish_result
        assert "cautious" in bearish_result
        assert "balanced" in neutral_result

    @pytest.mark.asyncio
    async def test_research_query_extraction(self, agent):
        """Test research query extraction from content"""
        content = "Fed raising interest rates amid inflation concerns"

        query = agent._extract_research_query(content)

        assert "fed" in query.lower()
        assert "interest rate" in query.lower() or "inflation" in query.lower()
        assert "market analysis" in query.lower()

    @pytest.mark.asyncio
    async def test_clear_context(self, agent):
        """Test clearing conversation context"""
        # Add some context
        agent._conversation_context.append({"test": "data"})
        assert len(agent._conversation_context) == 1

        # Clear context
        agent.clear_context()
        assert len(agent._conversation_context) == 0

    @pytest.mark.asyncio
    async def test_get_conversation_context(self, agent):
        """Test getting conversation context"""
        # Add some context
        test_context = {"test": "data", "timestamp": datetime.now().isoformat()}
        agent._conversation_context.append(test_context)

        # Get context (should be a copy)
        context = agent.get_conversation_context()
        assert len(context) == 1
        assert context[0]["test"] == "data"

        # Modifying returned context shouldn't affect original
        context[0]["test"] = "modified"
        assert agent._conversation_context[0]["test"] == "data"


class TestIntegrationScenarios:
    """Integration test scenarios"""

    @pytest.mark.asyncio
    async def test_full_analysis_workflow(self):
        """Test complete analysis workflow end-to-end"""
        with patch('agents.enhanced_financial_analyst.create_gayed_signals_service') as mock_signals, \
             patch('agents.enhanced_financial_analyst.MCPBridgeClient') as mock_mcp_class:

            # Setup mocks
            mock_signals_service = AsyncMock(spec=GayedSignalsService)
            mock_signals_service.get_current_signals.return_value = {
                "consensus": {"status": "Risk-On", "confidence": 0.92},
                "signals": [{"type": "utilities_spy", "signal": "Risk-On", "value": 0.85}]
            }
            mock_signals_service.extract_signal_insights.return_value = {
                "market_regime": "Risk-On",
                "confidence": 0.92,
                "signal_count": 1,
                "actionable_insights": ["Strong growth signal"]
            }
            mock_signals_service.get_fast_signals.return_value = {"utilities_spy": {"value": 0.85}}
            mock_signals.return_value = mock_signals_service

            mock_mcp_client = AsyncMock()
            mock_mcp_client.search_perplexity.return_value = [
                {"source": "Test", "content": "Test content", "credibility": 85}
            ]
            mock_mcp_class.return_value = mock_mcp_client

            # Create agent and run analysis
            agent = EnhancedFinancialAnalystAgent()

            content = "Analyzing current market conditions for portfolio allocation"
            result = await agent.analyze_with_signals(content, include_research=True)

            # Verify complete workflow
            assert result["agent_type"] == "autogen_with_gayed_signals"
            assert result["signal_analysis"]["market_regime"] == "Risk-On"
            assert result["confidence_score"] > 0.5
            assert len(result["recommendations"]) > 0
            assert "Strong growth signal" in result["signal_analysis"]["actionable_insights"]

            # Verify conversation context was updated
            assert len(agent._conversation_context) == 1

            await agent.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])