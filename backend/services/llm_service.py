"""
LLM service for generating video summaries with multiple provider support.
Supports OpenAI GPT models and Anthropic Claude models.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

import openai
import anthropic
from pydantic import BaseModel

from core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class SummaryMode(str, Enum):
    """Supported summary modes."""
    BULLET = "bullet"
    EXECUTIVE = "executive"
    ACTION_ITEMS = "action_items"
    TIMELINE = "timeline"
    CUSTOM = "custom"


class LLMResponse(BaseModel):
    """Response model for LLM generation."""
    summary_text: str
    provider: str
    model: str
    token_count: Optional[int] = None
    processing_cost: Optional[int] = None  # Cost in cents
    processing_time: float
    confidence_score: Optional[float] = None


class LLMService:
    """Service for generating summaries using various LLM providers."""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.openai_client = openai
            logger.info("Initialized OpenAI client")
        else:
            logger.warning("OpenAI API key not configured")
        
        # Initialize Anthropic client
        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = anthropic.Anthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )
            logger.info("Initialized Anthropic client")
        else:
            logger.warning("Anthropic API key not configured")
        
        # Default models for each provider
        self.default_models = {
            LLMProvider.OPENAI: "gpt-4",
            LLMProvider.ANTHROPIC: "claude-3-sonnet-20240229"
        }
        
        # Token costs per 1K tokens (in cents)
        self.token_costs = {
            "gpt-4": {"input": 3.0, "output": 6.0},
            "gpt-4-turbo": {"input": 1.0, "output": 3.0},
            "gpt-3.5-turbo": {"input": 0.15, "output": 0.2},
            "claude-3-sonnet-20240229": {"input": 1.5, "output": 7.5},
            "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
            "claude-3-opus-20240229": {"input": 15.0, "output": 75.0}
        }
    
    def _get_summary_prompt(self, mode: str, transcript: str, metadata: Dict[str, Any], user_prompt: Optional[str] = None) -> str:
        """
        Generate appropriate prompt based on summary mode.
        
        Args:
            mode: Summary mode
            transcript: Video transcript text
            metadata: Video metadata
            user_prompt: Optional custom user prompt
            
        Returns:
            Formatted prompt string
        """
        # Video context
        video_context = f"""
Video Title: {metadata.get('title', 'Unknown')}
Channel: {metadata.get('channel_name', 'Unknown')}
Duration: {metadata.get('duration', 0)} seconds
Description: {metadata.get('description', 'No description')[:200]}...
"""
        
        # Base instruction
        base_instruction = f"""
Please analyze the following video transcript and provide a summary based on the specified format.

{video_context}

Transcript:
{transcript}

"""
        
        # Mode-specific prompts
        mode_prompts = {
            SummaryMode.BULLET: """
Provide a bullet-point summary with the following structure:
• Key Points: 3-5 main points discussed in the video
• Important Details: Supporting information and context
• Conclusions: Main takeaways or conclusions

Format your response with clear bullet points and organize information logically.
""",
            
            SummaryMode.EXECUTIVE: """
Provide an executive summary suitable for business or professional use:

1. Overview: Brief description of the video content (2-3 sentences)
2. Key Insights: Most important information and findings (3-4 points)
3. Actionable Items: Concrete steps or recommendations mentioned
4. Impact/Relevance: Why this information matters

Keep the summary concise but comprehensive, suitable for decision-makers.
""",
            
            SummaryMode.ACTION_ITEMS: """
Extract and organize actionable items from the video:

1. Immediate Actions: Tasks that can be done right away
2. Short-term Actions: Tasks for the next few weeks
3. Long-term Actions: Strategic or ongoing initiatives
4. Resources Mentioned: Tools, books, websites, or other resources
5. Follow-up Items: Things to research or investigate further

Only include items that are clearly actionable or implementable.
""",
            
            SummaryMode.TIMELINE: """
Create a chronological timeline of the video content:

[Timestamp] Topic/Event
- Key points discussed
- Important details

Organize the content in chronological order as it appears in the video.
Include approximate timestamps when possible and focus on topic transitions.
""",
            
            SummaryMode.CUSTOM: user_prompt or """
Provide a comprehensive summary of the video content.
Include the main topics, key insights, and important details.
"""
        }
        
        mode_prompt = mode_prompts.get(mode, mode_prompts[SummaryMode.BULLET])
        
        return base_instruction + mode_prompt
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text (rough approximation).
        
        Args:
            text: Input text
            
        Returns:
            Estimated token count
        """
        # Rough estimation: 1 token ≈ 4 characters
        return len(text) // 4
    
    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> int:
        """
        Calculate cost in cents for token usage.
        
        Args:
            model: Model name
            input_tokens: Input token count
            output_tokens: Output token count
            
        Returns:
            Cost in cents
        """
        if model not in self.token_costs:
            return 0
        
        costs = self.token_costs[model]
        input_cost = (input_tokens / 1000) * costs["input"]
        output_cost = (output_tokens / 1000) * costs["output"]
        
        return int((input_cost + output_cost) * 100)  # Convert to cents
    
    async def generate_summary(
        self,
        transcript: str,
        metadata: Dict[str, Any],
        mode: str = "bullet",
        user_prompt: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> LLMResponse:
        """
        Generate summary using specified LLM provider.
        
        Args:
            transcript: Video transcript text
            metadata: Video metadata
            mode: Summary mode
            user_prompt: Optional custom prompt
            provider: Optional specific provider to use
            model: Optional specific model to use
            
        Returns:
            LLM response with summary and metadata
            
        Raises:
            Exception: If generation fails
        """
        start_time = datetime.now()
        
        try:
            # Determine provider and model
            if not provider:
                # Auto-select based on availability
                if self.openai_client:
                    provider = LLMProvider.OPENAI
                elif self.anthropic_client:
                    provider = LLMProvider.ANTHROPIC
                else:
                    raise Exception("No LLM providers configured")
            
            if not model:
                model = self.default_models.get(provider)
            
            # Generate prompt
            prompt = self._get_summary_prompt(mode, transcript, metadata, user_prompt)
            
            # Estimate input tokens
            input_tokens = self._estimate_tokens(prompt)
            
            # Check token limits
            max_tokens = 128000  # Conservative limit for most models
            if input_tokens > max_tokens:
                # Truncate transcript if too long
                max_transcript_length = max_tokens * 4 - len(prompt) + len(transcript)
                truncated_transcript = transcript[:max_transcript_length]
                prompt = self._get_summary_prompt(mode, truncated_transcript, metadata, user_prompt)
                input_tokens = self._estimate_tokens(prompt)
                logger.warning(f"Truncated transcript from {len(transcript)} to {len(truncated_transcript)} characters")
            
            # Generate summary based on provider
            if provider == LLMProvider.OPENAI:
                response = await self._generate_openai_summary(prompt, model)
            elif provider == LLMProvider.ANTHROPIC:
                response = await self._generate_anthropic_summary(prompt, model)
            else:
                raise Exception(f"Unsupported provider: {provider}")
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Estimate output tokens and cost
            output_tokens = self._estimate_tokens(response)
            cost = self._calculate_cost(model, input_tokens, output_tokens)
            
            logger.info(f"Generated summary using {provider}/{model} in {processing_time:.2f}s")
            
            return LLMResponse(
                summary_text=response,
                provider=provider,
                model=model,
                token_count=input_tokens + output_tokens,
                processing_cost=cost,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    async def _generate_openai_summary(self, prompt: str, model: str) -> str:
        """
        Generate summary using OpenAI API.
        
        Args:
            prompt: Formatted prompt
            model: Model name
            
        Returns:
            Generated summary text
        """
        try:
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert content summarizer. Provide clear, concise, and well-structured summaries based on the user's requirements."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=4000,
                temperature=0.3,
                timeout=60
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise Exception(f"OpenAI generation failed: {str(e)}")
    
    async def _generate_anthropic_summary(self, prompt: str, model: str) -> str:
        """
        Generate summary using Anthropic API.
        
        Args:
            prompt: Formatted prompt
            model: Model name
            
        Returns:
            Generated summary text
        """
        try:
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model=model,
                max_tokens=4000,
                temperature=0.3,
                system="You are an expert content summarizer. Provide clear, concise, and well-structured summaries based on the user's requirements.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise Exception(f"Anthropic generation failed: {str(e)}")
    
    async def test_providers(self) -> Dict[str, bool]:
        """
        Test availability of LLM providers.
        
        Returns:
            Dictionary of provider availability
        """
        results = {}
        
        # Test OpenAI
        if self.openai_client:
            try:
                await asyncio.to_thread(
                    openai.ChatCompletion.create,
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "user", "content": "Test"}
                    ],
                    max_tokens=5
                )
                results[LLMProvider.OPENAI] = True
            except Exception:
                results[LLMProvider.OPENAI] = False
        else:
            results[LLMProvider.OPENAI] = False
        
        # Test Anthropic
        if self.anthropic_client:
            try:
                await asyncio.to_thread(
                    self.anthropic_client.messages.create,
                    model="claude-3-haiku-20240307",
                    max_tokens=5,
                    messages=[
                        {"role": "user", "content": "Test"}
                    ]
                )
                results[LLMProvider.ANTHROPIC] = True
            except Exception:
                results[LLMProvider.ANTHROPIC] = False
        else:
            results[LLMProvider.ANTHROPIC] = False
        
        return results
    
    def get_available_models(self) -> Dict[str, List[str]]:
        """
        Get list of available models by provider.
        
        Returns:
            Dictionary of provider -> model list
        """
        models = {}
        
        if self.openai_client:
            models[LLMProvider.OPENAI] = [
                "gpt-4",
                "gpt-4-turbo",
                "gpt-3.5-turbo"
            ]
        
        if self.anthropic_client:
            models[LLMProvider.ANTHROPIC] = [
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ]
        
        return models
    
    def get_model_info(self, model: str) -> Dict[str, Any]:
        """
        Get information about a specific model.
        
        Args:
            model: Model name
            
        Returns:
            Model information dictionary
        """
        model_info = {
            "gpt-4": {
                "provider": "openai",
                "description": "Most capable GPT-4 model",
                "max_tokens": 128000,
                "cost_per_1k_input": 3.0,
                "cost_per_1k_output": 6.0
            },
            "gpt-4-turbo": {
                "provider": "openai",
                "description": "Faster and cheaper GPT-4",
                "max_tokens": 128000,
                "cost_per_1k_input": 1.0,
                "cost_per_1k_output": 3.0
            },
            "gpt-3.5-turbo": {
                "provider": "openai",
                "description": "Fast and cost-effective model",
                "max_tokens": 16385,
                "cost_per_1k_input": 0.15,
                "cost_per_1k_output": 0.2
            },
            "claude-3-opus-20240229": {
                "provider": "anthropic",
                "description": "Most capable Claude model",
                "max_tokens": 200000,
                "cost_per_1k_input": 15.0,
                "cost_per_1k_output": 75.0
            },
            "claude-3-sonnet-20240229": {
                "provider": "anthropic",
                "description": "Balanced performance and cost",
                "max_tokens": 200000,
                "cost_per_1k_input": 1.5,
                "cost_per_1k_output": 7.5
            },
            "claude-3-haiku-20240307": {
                "provider": "anthropic",
                "description": "Fastest and most cost-effective",
                "max_tokens": 200000,
                "cost_per_1k_input": 0.25,
                "cost_per_1k_output": 1.25
            }
        }
        
        return model_info.get(model, {})


# Global service instance
llm_service = LLMService()
