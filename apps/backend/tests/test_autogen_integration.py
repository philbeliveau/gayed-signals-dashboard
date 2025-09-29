"""
Comprehensive test suite for AutoGen integration.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.conversation_manager import (
    AutoGenConversationManager,
    ConversationError,
    ConversationTimeoutError
)
from agents import FinancialAnalystAgent, MarketContextAgent, RiskChallengerAgent


class MockChatMessage:
    """Mock ChatMessage for testing."""

    def __init__(self, content: str, role: str = "assistant", name: str = "test_agent"):
        self.content = content
        self.role = role
        self.name = name


class MockTaskResult:
    """Mock TaskResult for testing."""

    def __init__(self, messages=None, summary=None):
        self.messages = messages or [
            MockChatMessage("Test response 1", "assistant", "FinancialAnalyst"),
            MockChatMessage("Test response 2", "assistant", "MarketContext"),
            MockChatMessage("Test response 3", "assistant", "RiskChallenger")
        ]
        self.summary = summary or "Test conversation summary"


class MockGroupChat:
    """Mock RoundRobinGroupChat for testing."""

    def __init__(self, participants, max_turns):
        self.participants = participants
        self.max_turns = max_turns

    async def run(self, task):
        # Simulate conversation delay
        await asyncio.sleep(0.1)
        return MockTaskResult()


@pytest.fixture
def mock_model_config():
    """Mock model configuration for testing."""
    return {
        "model": "gpt-4",
        "api_key": "test_api_key",
        "organization": "test_org",
        "temperature": 0.1,
        "max_tokens": 500,
        "timeout": 30
    }


@pytest.fixture
def mock_conversation_manager(mock_model_config):
    """Create a mocked conversation manager for testing."""
    with patch('services.conversation_manager.FinancialAnalystAgent'), \
         patch('services.conversation_manager.MarketContextAgent'), \
         patch('services.conversation_manager.RiskChallengerAgent'):

        manager = AutoGenConversationManager(mock_model_config)
        # Replace agents with mocks that have required attributes
        manager.agents = [
            Mock(name="FinancialAnalyst", get_agent_info=Mock(return_value={"name": "FinancialAnalyst"})),
            Mock(name="MarketContext", get_agent_info=Mock(return_value={"name": "MarketContext"})),
            Mock(name="RiskChallenger", get_agent_info=Mock(return_value={"name": "RiskChallenger"}))
        ]
        return manager


@pytest.mark.asyncio
async def test_conversation_manager_initialization(mock_model_config):
    """Test that conversation manager initializes correctly."""
    with patch('services.conversation_manager.FinancialAnalystAgent'), \
         patch('services.conversation_manager.MarketContextAgent'), \
         patch('services.conversation_manager.RiskChallengerAgent'):

        manager = AutoGenConversationManager(mock_model_config)

        assert manager.model_config == mock_model_config
        assert len(manager.agents) == 3
        assert isinstance(manager.active_conversations, dict)


@pytest.mark.asyncio
async def test_start_conversation_success(mock_conversation_manager):
    """Test successful conversation completion."""
    with patch('services.conversation_manager.RoundRobinGroupChat', MockGroupChat):

        result = await mock_conversation_manager.start_conversation(
            "Test financial analysis question",
            max_turns=3,
            timeout=5
        )

        assert result["status"] == "completed"
        assert "conversation_id" in result
        assert result["initial_message"] == "Test financial analysis question"
        assert "messages" in result
        assert "summary" in result
        assert result["duration"] > 0
        assert result["participant_count"] == 3
        assert result["performance"]["within_target"] is True


@pytest.mark.asyncio
async def test_conversation_timeout_handling(mock_conversation_manager):
    """Test graceful handling of conversation timeouts."""

    async def slow_run(task):
        await asyncio.sleep(2)  # Longer than timeout
        return MockTaskResult()

    with patch('services.conversation_manager.RoundRobinGroupChat') as mock_chat:
        mock_chat.return_value.run = slow_run

        result = await mock_conversation_manager.start_conversation(
            "Test timeout scenario",
            timeout=1  # Very short timeout
        )

        assert result["status"] == "timeout"
        assert "timeout" in result["summary"]
        assert result["performance"]["within_target"] is False


@pytest.mark.asyncio
async def test_conversation_error_handling(mock_conversation_manager):
    """Test error handling in conversations."""

    async def failing_run(task):
        raise Exception("Simulated conversation failure")

    with patch('services.conversation_manager.RoundRobinGroupChat') as mock_chat:
        mock_chat.return_value.run = failing_run

        with pytest.raises(ConversationError, match="AutoGen conversation failed"):
            await mock_conversation_manager.start_conversation("Test error scenario")


@pytest.mark.asyncio
async def test_agent_initialization():
    """Test individual agent initialization."""
    mock_config = {
        "model": "gpt-4",
        "api_key": "test_key",
        "temperature": 0.1,
        "max_tokens": 500
    }

    with patch('agents.base_agent.OpenAIChatCompletionClient') as mock_client:
        mock_client.return_value = Mock()

        # Test Financial Analyst Agent
        with patch('agents.base_agent.AssistantAgent.__init__') as mock_init:
            mock_init.return_value = None
            agent = FinancialAnalystAgent(mock_config)
            assert agent.name == "FinancialAnalyst"
            mock_init.assert_called_once()

        # Test Market Context Agent
        with patch('agents.base_agent.AssistantAgent.__init__') as mock_init:
            mock_init.return_value = None
            agent = MarketContextAgent(mock_config)
            assert agent.name == "MarketContext"
            mock_init.assert_called_once()

        # Test Risk Challenger Agent
        with patch('agents.base_agent.AssistantAgent.__init__') as mock_init:
            mock_init.return_value = None
            agent = RiskChallengerAgent(mock_config)
            assert agent.name == "RiskChallenger"
            mock_init.assert_called_once()


def test_agent_specialization_info():
    """Test agent specialization information."""
    mock_config = {"model": "gpt-4", "api_key": "test_key"}

    with patch('agents.base_agent.OpenAIChatCompletionClient'), \
         patch('agents.base_agent.AssistantAgent.__init__'):

        # Test Financial Analyst specialization
        agent = FinancialAnalystAgent(mock_config)
        info = agent.get_specialization_info()
        assert info["specialization"] == "quantitative_analysis"
        assert "market_signals" in info["focus_areas"]

        # Test Market Context specialization
        agent = MarketContextAgent(mock_config)
        info = agent.get_specialization_info()
        assert info["specialization"] == "market_intelligence"
        assert "current_market_conditions" in info["focus_areas"]

        # Test Risk Challenger specialization
        agent = RiskChallengerAgent(mock_config)
        info = agent.get_specialization_info()
        assert info["specialization"] == "risk_assessment"
        assert "assumption_challenging" in info["focus_areas"]


@pytest.mark.asyncio
async def test_conversation_status_tracking(mock_conversation_manager):
    """Test conversation status tracking functionality."""
    with patch('services.conversation_manager.RoundRobinGroupChat', MockGroupChat):

        # Start a conversation
        result = await mock_conversation_manager.start_conversation(
            "Test status tracking",
            conversation_id="test_conv_123"
        )

        # Check status tracking
        status = mock_conversation_manager.get_conversation_status("test_conv_123")
        assert status is not None
        assert status["status"] == "completed"
        assert "duration" in status


def test_performance_metrics(mock_conversation_manager):
    """Test performance metrics collection."""
    # Add some mock conversation data
    mock_conversation_manager.active_conversations = {
        "conv1": {"status": "completed", "duration": 45.5},
        "conv2": {"status": "completed", "duration": 67.2},
        "conv3": {"status": "timeout", "duration": 95.0},
        "conv4": {"status": "error", "duration": 12.3}
    }

    metrics = mock_conversation_manager.get_performance_metrics()

    assert metrics["total_conversations"] == 4
    assert metrics["success_rate"] == 0.5  # 2 out of 4 successful
    assert metrics["average_duration"] > 0
    assert metrics["agent_count"] == 3


def test_agent_info_retrieval(mock_conversation_manager):
    """Test agent information retrieval."""
    agent_info = mock_conversation_manager.get_agent_info()

    assert len(agent_info) == 3
    assert all("name" in info for info in agent_info)


@pytest.mark.asyncio
async def test_conversation_result_processing(mock_conversation_manager):
    """Test conversation result processing and formatting."""
    with patch('services.conversation_manager.RoundRobinGroupChat', MockGroupChat):

        result = await mock_conversation_manager.start_conversation(
            "Test result processing",
            max_turns=4
        )

        # Verify result structure
        required_fields = [
            "conversation_id", "status", "initial_message", "messages",
            "summary", "duration", "participant_count", "message_count",
            "performance", "metadata"
        ]

        for field in required_fields:
            assert field in result, f"Missing required field: {field}"

        # Verify performance metrics
        assert "avg_response_time" in result["performance"]
        assert "within_target" in result["performance"]
        assert "efficiency_score" in result["performance"]

        # Verify metadata
        assert "timestamp" in result["metadata"]
        assert "model_config" in result["metadata"]


@pytest.mark.asyncio
async def test_conversation_cleanup(mock_conversation_manager):
    """Test conversation tracking cleanup for memory management."""
    # Add many mock conversations to trigger cleanup
    for i in range(150):
        mock_conversation_manager.active_conversations[f"conv_{i}"] = {
            "start_time": i,
            "status": "completed"
        }

    # Start a new conversation to trigger cleanup
    with patch('services.conversation_manager.RoundRobinGroupChat', MockGroupChat):
        await mock_conversation_manager.start_conversation("Cleanup test")

        # Verify cleanup occurred (should keep last 100 + 1 new = 101 max, but cleanup removes 50)
        assert len(mock_conversation_manager.active_conversations) <= 101


@pytest.mark.asyncio
async def test_invalid_model_config():
    """Test handling of invalid model configuration."""
    invalid_config = {"model": "gpt-4"}  # Missing API key

    with pytest.raises(ValueError, match="OpenAI API key is required"):
        AutoGenConversationManager(invalid_config)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])