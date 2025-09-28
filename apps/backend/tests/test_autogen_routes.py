"""
Tests for AutoGen agent conversation API routes.

These tests verify the API endpoints for:
- Creating conversation sessions
- Managing agent debates
- WebSocket streaming functionality
- Conversation export features
"""

import pytest
import json
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import WebSocket

from main import app
from models.conversation_models import (
    ContentSource,
    ContentSourceType,
    ConversationCreateRequest,
    ConversationStatus,
    AgentType
)
from services.autogen_orchestrator import AutoGenOrchestrator


# Test client
client = TestClient(app)


class TestAutoGenRoutes:
    """Test suite for AutoGen API routes."""

    @pytest.fixture
    def mock_orchestrator(self):
        """Mock AutoGen orchestrator for testing."""
        mock = AsyncMock(spec=AutoGenOrchestrator)

        # Mock session data
        mock_session = MagicMock()
        mock_session.id = "test-conversation-123"
        mock_session.status = ConversationStatus.INITIALIZED
        mock_session.created_at = datetime.utcnow()
        mock_session.content_source = ContentSource(
            type=ContentSourceType.TEXT,
            title="Test Financial Article",
            content="This is test content for financial analysis."
        )
        mock_session.messages = []

        mock.create_session.return_value = mock_session
        mock.get_session.return_value = mock_session
        mock.health_check.return_value = True

        return mock

    @pytest.fixture
    def sample_content_source(self):
        """Sample content source for testing."""
        return ContentSource(
            type=ContentSourceType.TEXT,
            title="Fed Policy Analysis",
            content="The Federal Reserve's latest policy statements suggest a shift toward more hawkish monetary policy. This could impact equity markets and bond yields significantly."
        )

    @pytest.fixture
    def sample_conversation_request(self, sample_content_source):
        """Sample conversation creation request."""
        return ConversationCreateRequest(
            content=sample_content_source,
            user_id="test-user-uuid-123",
            auto_start=False
        )

    def test_health_check_enabled(self):
        """Test AutoGen health check when service is enabled."""
        with patch('api.routes.autogen_agents.settings.ENABLE_AUTOGEN_AGENTS', True):
            with patch('api.routes.autogen_agents.get_orchestrator') as mock_get:
                mock_orchestrator = AsyncMock()
                mock_orchestrator.health_check.return_value = True
                mock_get.return_value = mock_orchestrator

                response = client.get("/api/v1/autogen/health")

                assert response.status_code == 200
                data = response.json()
                assert data["status"] in ["healthy", "unhealthy"]
                assert "autogen_enabled" in data
                assert "websocket_enabled" in data
                assert "model" in data

    def test_health_check_disabled(self):
        """Test AutoGen health check when service is disabled."""
        with patch('api.routes.autogen_agents.settings.ENABLE_AUTOGEN_AGENTS', False):
            response = client.get("/api/v1/autogen/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "disabled"
            assert "message" in data

    def test_create_conversation_success(self, sample_conversation_request, mock_orchestrator):
        """Test successful conversation creation."""
        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.post(
                "/api/v1/autogen/conversations",
                json=sample_conversation_request.model_dump(mode='json')
            )

            assert response.status_code == 200
            data = response.json()
            assert "conversation_id" in data
            assert data["status"] == ConversationStatus.INITIALIZED
            assert "created_at" in data
            assert "content_source" in data
            assert "message" in data

    def test_create_conversation_invalid_request(self):
        """Test conversation creation with invalid request data."""
        invalid_request = {
            "content": {
                "type": "invalid_type",
                "title": "",  # Empty title should fail
                "content": "short"  # Too short content
            },
            "user_id": "invalid-uuid"  # Invalid UUID format
        }

        response = client.post(
            "/api/v1/autogen/conversations",
            json=invalid_request
        )

        assert response.status_code == 422  # Validation error

    def test_get_conversation_success(self, mock_orchestrator):
        """Test successful conversation retrieval."""
        conversation_id = "test-conversation-123"

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get(f"/api/v1/autogen/conversations/{conversation_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["conversation_id"] == conversation_id
            assert "status" in data
            assert "content_source" in data
            assert "messages" in data

    def test_get_conversation_not_found(self, mock_orchestrator):
        """Test conversation retrieval when conversation doesn't exist."""
        mock_orchestrator.get_session.return_value = None

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get("/api/v1/autogen/conversations/nonexistent-id")

            assert response.status_code == 404
            data = response.json()
            assert "detail" in data

    def test_start_conversation_success(self, mock_orchestrator):
        """Test successful conversation start."""
        conversation_id = "test-conversation-123"

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.post(f"/api/v1/autogen/conversations/{conversation_id}/start")

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert data["conversation_id"] == conversation_id
            assert data["status"] == "running"

    def test_export_conversation_markdown(self, mock_orchestrator):
        """Test conversation export in markdown format."""
        conversation_id = "test-conversation-123"
        mock_orchestrator.export_markdown.return_value = "# Test Markdown Export"

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get(
                f"/api/v1/autogen/conversations/{conversation_id}/export?format=markdown"
            )

            assert response.status_code == 200
            data = response.json()
            assert data["conversation_id"] == conversation_id
            assert data["format"] == "markdown"
            assert "content" in data
            assert "exported_at" in data

    def test_export_conversation_invalid_format(self, mock_orchestrator):
        """Test conversation export with invalid format."""
        conversation_id = "test-conversation-123"

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get(
                f"/api/v1/autogen/conversations/{conversation_id}/export?format=invalid"
            )

            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert "Unsupported export format" in data["detail"]

    def test_list_conversations_success(self, mock_orchestrator):
        """Test successful conversation listing."""
        mock_conversations = [
            {
                "id": "conv-1",
                "status": ConversationStatus.COMPLETED,
                "content_title": "Test Article 1",
                "created_at": datetime.utcnow(),
                "message_count": 5
            },
            {
                "id": "conv-2",
                "status": ConversationStatus.RUNNING,
                "content_title": "Test Article 2",
                "created_at": datetime.utcnow(),
                "message_count": 3
            }
        ]
        mock_orchestrator.list_sessions.return_value = mock_conversations

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get("/api/v1/autogen/conversations")

            assert response.status_code == 200
            data = response.json()
            assert "conversations" in data
            assert "total" in data
            assert len(data["conversations"]) == 2

    def test_list_conversations_with_filters(self, mock_orchestrator):
        """Test conversation listing with query parameters."""
        mock_orchestrator.list_sessions.return_value = []

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.get(
                "/api/v1/autogen/conversations?userId=test-user&status=completed&limit=10"
            )

            assert response.status_code == 200
            mock_orchestrator.list_sessions.assert_called_once_with(
                user_id="test-user",
                status="completed",
                limit=10,
                offset=0
            )

    def test_delete_conversation_success(self, mock_orchestrator):
        """Test successful conversation deletion."""
        conversation_id = "test-conversation-123"
        mock_orchestrator.delete_session.return_value = True

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.delete(f"/api/v1/autogen/conversations/{conversation_id}")

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert data["conversation_id"] == conversation_id

    def test_delete_conversation_not_found(self, mock_orchestrator):
        """Test conversation deletion when conversation doesn't exist."""
        conversation_id = "nonexistent-id"
        mock_orchestrator.delete_session.return_value = False

        with patch('api.routes.autogen_agents.get_orchestrator', return_value=mock_orchestrator):
            response = client.delete(f"/api/v1/autogen/conversations/{conversation_id}")

            assert response.status_code == 404
            data = response.json()
            assert "detail" in data

    def test_orchestrator_initialization_failure(self):
        """Test API behavior when orchestrator fails to initialize."""
        with patch('api.routes.autogen_agents.settings.ENABLE_AUTOGEN_AGENTS', True):
            with patch('api.routes.autogen_agents.AutoGenOrchestrator') as mock_class:
                mock_class.side_effect = Exception("Failed to initialize")

                response = client.get("/api/v1/autogen/health")

                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "unhealthy"
                assert "error" in data

    def test_conversation_creation_with_orchestrator_error(self, sample_conversation_request):
        """Test conversation creation when orchestrator raises an error."""
        with patch('api.routes.autogen_agents.get_orchestrator') as mock_get:
            mock_orchestrator = AsyncMock()
            mock_orchestrator.create_session.side_effect = Exception("Orchestrator error")
            mock_get.return_value = mock_orchestrator

            response = client.post(
                "/api/v1/autogen/conversations",
                json=sample_conversation_request.model_dump(mode='json')
            )

            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Failed to create conversation" in data["detail"]


class TestAutoGenWebSocket:
    """Test suite for AutoGen WebSocket functionality."""

    def test_websocket_connection_disabled(self):
        """Test WebSocket connection when streaming is disabled."""
        with patch('api.routes.autogen_agents.settings.ENABLE_WEBSOCKET_STREAMING', False):
            with client.websocket_connect("/api/v1/autogen/conversations/test-id/stream") as websocket:
                data = websocket.receive_text()
                message = json.loads(data)
                assert "error" in message
                assert "WebSocket streaming is disabled" in message["error"]

    def test_websocket_invalid_conversation_id(self):
        """Test WebSocket connection with invalid conversation ID."""
        with patch('api.routes.autogen_agents.settings.ENABLE_WEBSOCKET_STREAMING', True):
            with patch('api.routes.autogen_agents.get_orchestrator') as mock_get:
                mock_orchestrator = AsyncMock()
                mock_orchestrator.register_websocket.side_effect = Exception("Invalid conversation")
                mock_get.return_value = mock_orchestrator

                # WebSocket test requires special handling
                # This would be tested in integration tests with actual WebSocket client


if __name__ == "__main__":
    pytest.main([__file__, "-v"])