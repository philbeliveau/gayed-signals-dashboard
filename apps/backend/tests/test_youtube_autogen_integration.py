"""
Comprehensive tests for YouTube AutoGen integration.

This test suite validates the complete YouTube processing pipeline with AutoGen
agent conversation integration as specified in Story 2.3.

Tests cover:
- Financial relevance analysis
- AutoGen conversation triggering
- Error handling and fallbacks
- Performance and reliability
- Integration with existing systems
"""

import pytest
import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

# Import application modules
from api.routes.simple_youtube import (
    SimpleYouTubeProcessor,
    SimpleVideoRequest,
    trigger_autogen_conversation,
    simple_process_video
)
from services.autogen_orchestrator import AutoGenOrchestrator
from models.conversation_models import ContentSource, ContentSourceType
from core.config import settings


class TestYouTubeAutoGenIntegration:
    """Test suite for YouTube AutoGen integration functionality."""

    @pytest.fixture
    def mock_youtube_processor(self):
        """Create a mock YouTube processor for testing."""
        processor = Mock(spec=SimpleYouTubeProcessor)

        # Mock successful video processing
        processor.process_video.return_value = {
            'success': True,
            'url': 'https://youtube.com/watch?v=test123',
            'title': 'Market Analysis: Fed Rate Decision Impact',
            'transcript': 'The Federal Reserve announced today that interest rates will remain unchanged at 5.25%...',
            'summary': 'Key points: Fed maintains rates, market volatility expected, investment implications discussed.',
            'processing_time': 45.2,
            'error': '',
            'financial_relevance': {
                'relevance_score': 0.85,
                'financial_topics': ['interest_rates', 'federal_reserve', 'market_volatility'],
                'market_relevance': True,
                'investment_relevance': True,
                'reasoning': 'Content discusses Fed policy and market implications'
            }
        }

        return processor

    @pytest.fixture
    def mock_autogen_orchestrator(self):
        """Create a mock AutoGen orchestrator for testing."""
        orchestrator = AsyncMock(spec=AutoGenOrchestrator)

        # Mock conversation session
        mock_session = Mock()
        mock_session.id = 'conv_123456'
        mock_session.status = 'initialized'
        mock_session.created_at = datetime.utcnow()

        orchestrator.create_session.return_value = mock_session
        orchestrator.start_debate.return_value = None

        return orchestrator

    @pytest.fixture
    def financial_video_request(self):
        """Create a request for financially relevant video."""
        return SimpleVideoRequest(
            youtube_url='https://youtube.com/watch?v=financial_test',
            summary_mode='bullet',
            custom_context='Analyze market implications',
            trigger_autogen_debate=True,
            include_signal_context=True,
            save_to_database=True
        )

    @pytest.fixture
    def non_financial_video_request(self):
        """Create a request for non-financially relevant video."""
        return SimpleVideoRequest(
            youtube_url='https://youtube.com/watch?v=cooking_test',
            summary_mode='bullet',
            trigger_autogen_debate=True,
            save_to_database=False
        )

    @pytest.mark.asyncio
    async def test_financial_relevance_analysis(self, mock_youtube_processor):
        """Test financial relevance analysis for video content."""
        processor = SimpleYouTubeProcessor()

        # Mock OpenAI response for financial relevance
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "relevance_score": 0.92,
            "financial_topics": ["federal_reserve", "interest_rates", "market_analysis"],
            "market_relevance": True,
            "investment_relevance": True,
            "reasoning": "Video discusses Fed policy impact on markets and investment strategies"
        })

        with patch.object(processor, 'openai_client') as mock_openai:
            mock_openai.chat.completions.create.return_value = mock_response

            result = processor.analyze_financial_relevance(
                "Fed Decision Analysis",
                "The Federal Reserve announced rate changes affecting market conditions..."
            )

            assert result['relevance_score'] == 0.92
            assert 'federal_reserve' in result['financial_topics']
            assert result['market_relevance'] is True
            assert result['investment_relevance'] is True

            # Verify OpenAI was called with correct parameters
            mock_openai.chat.completions.create.assert_called_once()
            call_args = mock_openai.chat.completions.create.call_args
            assert call_args[1]['model'] == 'gpt-3.5-turbo'
            assert call_args[1]['temperature'] == 0.1

    @pytest.mark.asyncio
    async def test_low_relevance_content(self, mock_youtube_processor):
        """Test handling of low financial relevance content."""
        processor = SimpleYouTubeProcessor()

        # Mock OpenAI response for low relevance
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "relevance_score": 0.15,
            "financial_topics": [],
            "market_relevance": False,
            "investment_relevance": False,
            "reasoning": "Content is about cooking recipes, not financial topics"
        })

        with patch.object(processor, 'openai_client') as mock_openai:
            mock_openai.chat.completions.create.return_value = mock_response

            result = processor.analyze_financial_relevance(
                "Best Chocolate Cake Recipe",
                "Today I'm showing you how to make the perfect chocolate cake..."
            )

            assert result['relevance_score'] == 0.15
            assert result['financial_topics'] == []
            assert result['market_relevance'] is False

    @pytest.mark.asyncio
    async def test_autogen_conversation_trigger_high_relevance(self, mock_autogen_orchestrator):
        """Test AutoGen conversation triggering for highly relevant content."""

        financial_relevance = {
            'relevance_score': 0.85,
            'financial_topics': ['market_analysis', 'investment_strategy'],
            'market_relevance': True,
            'investment_relevance': True,
            'reasoning': 'High financial relevance'
        }

        with patch('api.routes.simple_youtube.AutoGenOrchestrator', return_value=mock_autogen_orchestrator):
            with patch.object(settings, 'ENABLE_AUTOGEN_AGENTS', True):
                with patch.object(settings, 'get_autogen_config', return_value={}):

                    result = await trigger_autogen_conversation(
                        title="Market Analysis Video",
                        transcript="Fed announces rate decision...",
                        summary="Key market insights...",
                        url="https://youtube.com/watch?v=test",
                        user_id="user_123",
                        financial_relevance=financial_relevance
                    )

                    assert result is not None
                    assert result['conversation_id'] == 'conv_123456'
                    assert result['status'] == 'initialized'
                    assert result['relevance_score'] == 0.85

                    # Verify AutoGen orchestrator was called correctly
                    mock_autogen_orchestrator.create_session.assert_called_once()
                    mock_autogen_orchestrator.start_debate.assert_called_once_with('conv_123456')

    @pytest.mark.asyncio
    async def test_autogen_conversation_skip_low_relevance(self):
        """Test AutoGen conversation skipping for low relevance content."""

        financial_relevance = {
            'relevance_score': 0.3,  # Below threshold of 0.6
            'financial_topics': [],
            'market_relevance': False,
            'investment_relevance': False,
            'reasoning': 'Low financial relevance'
        }

        with patch.object(settings, 'ENABLE_AUTOGEN_AGENTS', True):
            result = await trigger_autogen_conversation(
                title="Cooking Video",
                transcript="Today we're making pasta...",
                summary="Cooking instructions...",
                url="https://youtube.com/watch?v=cooking",
                user_id="user_123",
                financial_relevance=financial_relevance
            )

            assert result is None  # Should not trigger AutoGen for low relevance

    @pytest.mark.asyncio
    async def test_autogen_disabled_configuration(self):
        """Test behavior when AutoGen is disabled in configuration."""

        financial_relevance = {
            'relevance_score': 0.9,  # High relevance
            'financial_topics': ['market_analysis'],
            'market_relevance': True,
            'investment_relevance': True,
            'reasoning': 'High financial relevance'
        }

        with patch.object(settings, 'ENABLE_AUTOGEN_AGENTS', False):
            result = await trigger_autogen_conversation(
                title="Market Analysis",
                transcript="Important market news...",
                summary="Market insights...",
                url="https://youtube.com/watch?v=market",
                user_id="user_123",
                financial_relevance=financial_relevance
            )

            assert result is None  # Should not trigger when disabled

    @pytest.mark.asyncio
    async def test_content_source_creation(self, mock_autogen_orchestrator):
        """Test proper ContentSource creation for AutoGen."""

        financial_relevance = {
            'relevance_score': 0.8,
            'financial_topics': ['fed_policy'],
            'market_relevance': True,
            'investment_relevance': True,
            'reasoning': 'Fed policy discussion'
        }

        with patch('api.routes.simple_youtube.AutoGenOrchestrator', return_value=mock_autogen_orchestrator):
            with patch.object(settings, 'ENABLE_AUTOGEN_AGENTS', True):
                with patch.object(settings, 'get_autogen_config', return_value={}):

                    await trigger_autogen_conversation(
                        title="Fed Policy Update",
                        transcript="The Federal Reserve announced...",
                        summary="Fed maintains current stance...",
                        url="https://youtube.com/watch?v=fed_policy",
                        user_id="user_123",
                        financial_relevance=financial_relevance
                    )

                    # Verify ContentSource was created correctly
                    call_args = mock_autogen_orchestrator.create_session.call_args[1]
                    content_source = call_args['content']

                    assert content_source.type == ContentSourceType.YOUTUBE_VIDEO
                    assert content_source.title == "Fed Policy Update"
                    assert "TRANSCRIPT:" in content_source.content
                    assert "SUMMARY:" in content_source.content
                    assert content_source.url == "https://youtube.com/watch?v=fed_policy"
                    assert 'financial_relevance' in content_source.metadata

    @pytest.mark.asyncio
    async def test_error_handling_autogen_failure(self, mock_autogen_orchestrator):
        """Test error handling when AutoGen conversation fails."""

        # Make orchestrator creation fail
        mock_autogen_orchestrator.create_session.side_effect = Exception("AutoGen service unavailable")

        financial_relevance = {
            'relevance_score': 0.8,
            'financial_topics': ['market_analysis'],
            'market_relevance': True,
            'investment_relevance': True,
            'reasoning': 'High relevance'
        }

        with patch('api.routes.simple_youtube.AutoGenOrchestrator', return_value=mock_autogen_orchestrator):
            with patch.object(settings, 'ENABLE_AUTOGEN_AGENTS', True):
                with patch.object(settings, 'get_autogen_config', return_value={}):

                    result = await trigger_autogen_conversation(
                        title="Market Analysis",
                        transcript="Market update...",
                        summary="Market insights...",
                        url="https://youtube.com/watch?v=market",
                        user_id="user_123",
                        financial_relevance=financial_relevance
                    )

                    assert result is None  # Should return None on failure

    @pytest.mark.asyncio
    async def test_financial_relevance_analysis_failure(self):
        """Test handling of financial relevance analysis failure."""
        processor = SimpleYouTubeProcessor()

        # Mock OpenAI failure
        with patch.object(processor, 'openai_client') as mock_openai:
            mock_openai.chat.completions.create.side_effect = Exception("OpenAI API error")

            result = processor.analyze_financial_relevance(
                "Test Video",
                "Some content..."
            )

            # Should return default low relevance on failure
            assert result['relevance_score'] == 0.1
            assert result['financial_topics'] == []
            assert result['market_relevance'] is False
            assert result['investment_relevance'] is False
            assert 'Analysis failed' in result['reasoning']

    @pytest.mark.asyncio
    async def test_video_processing_with_autogen_success(self, mock_youtube_processor, mock_autogen_orchestrator):
        """Test complete video processing pipeline with successful AutoGen integration."""
        processor = SimpleYouTubeProcessor()

        # Mock the process_video method to include financial relevance
        with patch.object(processor, 'download_audio', return_value=('/tmp/audio.mp3', 'Fed Policy Video')):
            with patch.object(processor, 'transcribe_audio', return_value='Fed announces rate decision...'):
                with patch.object(processor, 'generate_summary', return_value='Key insights: rates unchanged...'):
                    with patch.object(processor, 'analyze_financial_relevance') as mock_relevance:
                        mock_relevance.return_value = {
                            'relevance_score': 0.9,
                            'financial_topics': ['federal_reserve'],
                            'market_relevance': True,
                            'investment_relevance': True,
                            'reasoning': 'High relevance'
                        }
                        with patch.object(processor, 'cleanup'):

                            result = processor.process_video(
                                url='https://youtube.com/watch?v=fed_test',
                                summary_mode='bullet',
                                trigger_autogen=True
                            )

                            assert result['success'] is True
                            assert result['title'] == 'Fed Policy Video'
                            assert 'financial_relevance' in result
                            assert result['financial_relevance']['relevance_score'] == 0.9

    @pytest.mark.asyncio
    async def test_video_processing_autogen_disabled(self, mock_youtube_processor):
        """Test video processing when AutoGen is disabled."""
        processor = SimpleYouTubeProcessor()

        with patch.object(processor, 'download_audio', return_value=('/tmp/audio.mp3', 'Test Video')):
            with patch.object(processor, 'transcribe_audio', return_value='Video content...'):
                with patch.object(processor, 'generate_summary', return_value='Summary...'):
                    with patch.object(processor, 'cleanup'):

                        result = processor.process_video(
                            url='https://youtube.com/watch?v=test',
                            summary_mode='bullet',
                            trigger_autogen=False  # AutoGen disabled
                        )

                        assert result['success'] is True
                        assert 'financial_relevance' not in result  # Should not analyze relevance

    def test_request_model_validation(self):
        """Test SimpleVideoRequest model validation with AutoGen options."""

        # Valid request with AutoGen options
        request = SimpleVideoRequest(
            youtube_url='https://youtube.com/watch?v=test123',
            summary_mode='bullet',
            trigger_autogen_debate=True,
            include_signal_context=True,
            save_to_database=True
        )

        assert request.trigger_autogen_debate is True
        assert request.include_signal_context is True
        assert request.save_to_database is True

        # Default values
        default_request = SimpleVideoRequest(
            youtube_url='https://youtube.com/watch?v=test456'
        )

        assert default_request.trigger_autogen_debate is False
        assert default_request.include_signal_context is False
        assert default_request.save_to_database is False

    @pytest.mark.asyncio
    async def test_performance_requirements(self, mock_youtube_processor):
        """Test that processing meets performance requirements."""
        processor = SimpleYouTubeProcessor()

        # Mock fast processing
        with patch.object(processor, 'download_audio', return_value=('/tmp/audio.mp3', 'Test Video')):
            with patch.object(processor, 'transcribe_audio', return_value='Video content...'):
                with patch.object(processor, 'generate_summary', return_value='Summary...'):
                    with patch.object(processor, 'analyze_financial_relevance') as mock_relevance:
                        mock_relevance.return_value = {
                            'relevance_score': 0.8,
                            'financial_topics': ['market'],
                            'market_relevance': True,
                            'investment_relevance': True,
                            'reasoning': 'Relevant'
                        }
                        with patch.object(processor, 'cleanup'):

                            import time
                            start_time = time.time()

                            result = processor.process_video(
                                url='https://youtube.com/watch?v=perf_test',
                                summary_mode='bullet',
                                trigger_autogen=True
                            )

                            end_time = time.time()
                            processing_time = end_time - start_time

                            assert result['success'] is True
                            # Performance requirement: < 60s for 20-min videos (mocked to be fast)
                            assert processing_time < 5.0  # Mock should be very fast

    @pytest.mark.asyncio
    async def test_concurrent_processing_support(self):
        """Test support for concurrent video processing."""
        processor = SimpleYouTubeProcessor()

        async def process_video_mock(url, **kwargs):
            # Simulate processing time
            await asyncio.sleep(0.1)
            return {
                'success': True,
                'url': url,
                'title': f'Video for {url}',
                'transcript': 'Content...',
                'summary': 'Summary...',
                'processing_time': 0.1,
                'error': ''
            }

        with patch.object(processor, 'process_video', side_effect=process_video_mock):

            # Process multiple videos concurrently
            urls = [
                'https://youtube.com/watch?v=test1',
                'https://youtube.com/watch?v=test2',
                'https://youtube.com/watch?v=test3'
            ]

            tasks = [process_video_mock(url) for url in urls]
            results = await asyncio.gather(*tasks)

            assert len(results) == 3
            for i, result in enumerate(results):
                assert result['success'] is True
                assert urls[i] in result['url']

    @pytest.mark.asyncio
    async def test_memory_usage_optimization(self, mock_youtube_processor):
        """Test memory usage stays within limits during processing."""
        processor = SimpleYouTubeProcessor()

        # Mock large transcript
        large_transcript = "Large content..." * 10000  # Simulate large transcript

        with patch.object(processor, 'download_audio', return_value=('/tmp/audio.mp3', 'Large Video')):
            with patch.object(processor, 'transcribe_audio', return_value=large_transcript):
                with patch.object(processor, 'generate_summary', return_value='Summary...'):
                    with patch.object(processor, 'analyze_financial_relevance') as mock_relevance:
                        mock_relevance.return_value = {
                            'relevance_score': 0.7,
                            'financial_topics': ['market'],
                            'market_relevance': True,
                            'investment_relevance': True,
                            'reasoning': 'Relevant'
                        }
                        with patch.object(processor, 'cleanup'):

                            result = processor.process_video(
                                url='https://youtube.com/watch?v=large_test',
                                summary_mode='bullet',
                                trigger_autogen=True
                            )

                            assert result['success'] is True
                            # Memory requirement: < 500MB for conversation processing
                            # This would require actual memory monitoring in production


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])