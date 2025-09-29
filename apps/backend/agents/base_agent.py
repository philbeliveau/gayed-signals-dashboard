"""
Base agent class for AutoGen financial analysis agents.
"""

import logging
from typing import Dict, Any, Optional
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

from core.config import settings

logger = logging.getLogger(__name__)


class BaseFinancialAgent(AssistantAgent):
    """
    Base class for all financial analysis agents using AutoGen.

    Provides common functionality for model configuration, logging,
    and error handling across all agent types.
    """

    def __init__(
        self,
        name: str,
        system_message: str,
        model_config: Optional[Dict[str, Any]] = None,
        **kwargs
    ):
        """
        Initialize the base financial agent.

        Args:
            name: Agent name for identification in conversations
            system_message: System prompt defining agent role and behavior
            model_config: Optional model configuration (uses settings if None)
            **kwargs: Additional arguments passed to AssistantAgent
        """
        # Use provided config or get from settings
        if model_config is None:
            model_config = settings.get_autogen_config()

        # Validate required configuration
        if not model_config.get("api_key"):
            raise ValueError("OpenAI API key is required for AutoGen agents")

        # Initialize OpenAI model client
        model_client = OpenAIChatCompletionClient(
            model=model_config.get("model", "gpt-4"),
            api_key=model_config["api_key"],
            organization=model_config.get("organization"),
            temperature=model_config.get("temperature", 0.1),
            max_tokens=model_config.get("max_tokens", 500)
        )

        # Log agent initialization
        logger.info(f"Initializing {name} agent with model {model_config.get('model', 'gpt-4')}")

        # Initialize parent AssistantAgent
        super().__init__(
            name=name,
            model_client=model_client,
            system_message=system_message,
            **kwargs
        )

        # Store configuration for debugging
        self._model_config = model_config
        self._logger = logging.getLogger(f"{__name__}.{name}")

    async def a_generate_reply(self, messages, sender, **kwargs):
        """
        Generate reply with enhanced error handling and logging.

        Overrides parent method to add financial-specific logging
        and error handling patterns.
        """
        try:
            self._logger.debug(f"Generating reply to {len(messages)} messages from {sender.name}")

            # Call parent implementation
            reply = await super().a_generate_reply(messages, sender, **kwargs)

            self._logger.debug(f"Generated reply with {len(reply.content) if reply.content else 0} characters")
            return reply

        except Exception as e:
            self._logger.error(f"Error generating reply: {str(e)}", exc_info=True)

            # Return graceful error response
            from autogen_agentchat.messages import ChatMessage
            return ChatMessage(
                content=f"I apologize, but I encountered an error while processing your request. "
                       f"Please try again or contact support if the issue persists.",
                role="assistant"
            )

    def get_model_config(self) -> Dict[str, Any]:
        """Get the current model configuration for debugging."""
        return self._model_config.copy()

    def get_agent_info(self) -> Dict[str, Any]:
        """Get agent information for monitoring and debugging."""
        return {
            "name": self.name,
            "model": self._model_config.get("model"),
            "temperature": self._model_config.get("temperature"),
            "max_tokens": self._model_config.get("max_tokens"),
            "system_message_length": len(self.system_message) if self.system_message else 0
        }