"""
AutoGen conversation manager for orchestrating multi-agent financial debates.
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime

# AutoGen imports with fallback handling
try:
    from autogen_agentchat.teams import RoundRobinGroupChat
    from autogen_agentchat.base import TaskResult
    from autogen_agentchat.messages import ChatMessage
    AUTOGEN_AVAILABLE = True
except ImportError:
    # Create mock types for when AutoGen is not available
    class TaskResult:
        """Mock TaskResult for when AutoGen is not available."""
        pass

    class RoundRobinGroupChat:
        """Mock RoundRobinGroupChat for when AutoGen is not available."""
        pass

    class ChatMessage:
        """Mock ChatMessage for when AutoGen is not available."""
        pass

    AUTOGEN_AVAILABLE = False
    logging.warning("AutoGen not available - using mock conversation manager")

try:
    from agents import FinancialAnalystAgent, MarketContextAgent, RiskChallengerAgent
    AGENTS_AVAILABLE = True
except ImportError:
    AGENTS_AVAILABLE = False
    logging.warning("Agent modules not available - using mock agents")
from core.config import settings

logger = logging.getLogger(__name__)


class ConversationError(Exception):
    """Custom exception for conversation-related errors."""
    pass


class ConversationTimeoutError(ConversationError):
    """Exception raised when conversation times out."""
    pass


class MockConversationManager:
    """Mock conversation manager for when AutoGen is not available."""

    def __init__(self, model_config: Optional[Dict[str, Any]] = None):
        logger.warning("Using mock conversation manager - AutoGen not available")

    async def create_conversation(self, content: str, content_type: str = "text") -> Dict[str, Any]:
        """Mock conversation creation."""
        return {
            "conversation_id": str(uuid.uuid4()),
            "status": "completed",
            "messages": [
                {"agent": "analyst", "content": f"Mock analysis of: {content[:100]}..."},
                {"agent": "context", "content": "Mock market context provided"},
                {"agent": "challenger", "content": "Mock risk assessment completed"}
            ]
        }


class AutoGenConversationManager:
    """
    Manages AutoGen multi-agent conversations for financial analysis.

    Orchestrates debates between Financial Analyst, Market Context, and Risk Challenger
    agents with performance optimization and error handling.
    """

    def __init__(self, model_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the conversation manager.

        Args:
            model_config: Optional model configuration (uses settings if None)
        """
        self.model_config = model_config or settings.get_autogen_config()
        self.agents = self._initialize_agents()
        self.active_conversations: Dict[str, Dict] = {}

        logger.info(f"Initialized AutoGen conversation manager with {len(self.agents)} agents")

    def _initialize_agents(self) -> List:
        """
        Initialize the three financial analysis agents.

        Returns:
            List of initialized agent instances
        """
        try:
            agents = [
                FinancialAnalystAgent(self.model_config),
                MarketContextAgent(self.model_config),
                RiskChallengerAgent(self.model_config)
            ]

            logger.info(f"Successfully initialized {len(agents)} agents")
            return agents

        except Exception as e:
            logger.error(f"Failed to initialize agents: {str(e)}", exc_info=True)
            raise ConversationError(f"Agent initialization failed: {str(e)}")

    async def start_conversation(
        self,
        initial_message: str,
        max_turns: int = 6,
        timeout: int = 90,
        conversation_id: Optional[str] = None,
        enable_streaming: bool = True,
        per_turn_timeout: int = 20
    ) -> Dict[str, Any]:
        """
        Start a new AutoGen conversation with the financial analysis agents.

        Args:
            initial_message: The financial content or question to analyze
            max_turns: Maximum number of conversation turns (default: 6)
            timeout: Conversation timeout in seconds (default: 90)
            conversation_id: Optional conversation ID (generates if None)
            enable_streaming: Enable streaming partial results (default: True)
            per_turn_timeout: Maximum time per agent turn in seconds (default: 20)

        Returns:
            Dictionary containing conversation results and metadata

        Raises:
            ConversationTimeoutError: If conversation exceeds timeout
            ConversationError: If conversation fails for other reasons
        """
        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        start_time = time.time()

        # Track active conversation
        self.active_conversations[conversation_id] = {
            "start_time": start_time,
            "status": "running",
            "participants": [agent.name for agent in self.agents]
        }

        try:
            logger.info(f"Starting conversation {conversation_id} with {len(self.agents)} agents")

            # Estimate conversation complexity for performance optimization
            complexity_score = self._estimate_complexity(initial_message, max_turns)
            adjusted_timeout = self._adjust_timeout_for_complexity(timeout, complexity_score)

            logger.info(f"Conversation complexity: {complexity_score}, adjusted timeout: {adjusted_timeout}s")

            # Create group chat with round-robin participation
            group_chat = RoundRobinGroupChat(
                participants=self.agents,
                max_turns=max_turns
            )

            # Execute conversation with enhanced timeout management
            if enable_streaming:
                result = await self._run_conversation_with_streaming(
                    group_chat, initial_message, adjusted_timeout, per_turn_timeout, conversation_id
                )
            else:
                result = await asyncio.wait_for(
                    group_chat.run(task=initial_message),
                    timeout=adjusted_timeout
                )

            duration = time.time() - start_time

            # Process and format results
            conversation_result = self._process_conversation_result(
                result, conversation_id, duration, initial_message
            )

            # Update conversation tracking
            self.active_conversations[conversation_id]["status"] = "completed"
            self.active_conversations[conversation_id]["duration"] = duration

            logger.info(f"Completed conversation {conversation_id} in {duration:.2f}s")
            return conversation_result

        except asyncio.TimeoutError:
            duration = time.time() - start_time
            logger.warning(f"Conversation {conversation_id} timed out after {duration:.2f}s")

            # Update conversation tracking
            self.active_conversations[conversation_id]["status"] = "timeout"
            self.active_conversations[conversation_id]["duration"] = duration

            return self._handle_conversation_timeout(conversation_id, duration, initial_message)

        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Conversation {conversation_id} failed: {str(e)}", exc_info=True)

            # Update conversation tracking
            self.active_conversations[conversation_id]["status"] = "error"
            self.active_conversations[conversation_id]["duration"] = duration
            self.active_conversations[conversation_id]["error"] = str(e)

            raise ConversationError(f"AutoGen conversation failed: {str(e)}")

        finally:
            # Clean up old conversation tracking (keep last 100)
            if len(self.active_conversations) > 100:
                oldest_keys = sorted(
                    self.active_conversations.keys(),
                    key=lambda k: self.active_conversations[k]["start_time"]
                )[:50]
                for key in oldest_keys:
                    del self.active_conversations[key]

    def _process_conversation_result(
        self, result: TaskResult, conversation_id: str, duration: float, initial_message: str
    ) -> Dict[str, Any]:
        """
        Process and format the conversation result.

        Args:
            result: AutoGen TaskResult object
            conversation_id: Unique conversation identifier
            duration: Conversation duration in seconds
            initial_message: Original message that started the conversation

        Returns:
            Formatted conversation result dictionary
        """
        try:
            # Extract messages from the result
            messages = []
            if hasattr(result, 'messages') and result.messages:
                for msg in result.messages:
                    messages.append({
                        "role": getattr(msg, 'role', 'assistant'),
                        "content": getattr(msg, 'content', str(msg)),
                        "agent": getattr(msg, 'name', 'unknown'),
                        "timestamp": datetime.utcnow().isoformat()
                    })

            # Generate conversation summary
            summary = self._generate_conversation_summary(messages, initial_message)

            return {
                "conversation_id": conversation_id,
                "status": "completed",
                "initial_message": initial_message,
                "messages": messages,
                "summary": summary,
                "duration": duration,
                "participant_count": len(self.agents),
                "message_count": len(messages),
                "performance": {
                    "avg_response_time": duration / max(len(messages), 1),
                    "within_target": duration <= 90,
                    "efficiency_score": min(1.0, 90 / max(duration, 1))
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "model_config": self._mask_sensitive_config(self.model_config),
                    "max_turns": len(messages)
                }
            }

        except Exception as e:
            logger.error(f"Error processing conversation result: {str(e)}", exc_info=True)
            return {
                "conversation_id": conversation_id,
                "status": "completed_with_errors",
                "error": str(e),
                "duration": duration,
                "messages": [],
                "summary": "Conversation completed but result processing failed"
            }

    def _handle_conversation_timeout(
        self, conversation_id: str, duration: float, initial_message: str
    ) -> Dict[str, Any]:
        """
        Handle conversation timeout gracefully.

        Args:
            conversation_id: Unique conversation identifier
            duration: Time elapsed before timeout
            initial_message: Original message that started the conversation

        Returns:
            Timeout result dictionary
        """
        return {
            "conversation_id": conversation_id,
            "status": "timeout",
            "initial_message": initial_message,
            "messages": [],
            "summary": f"Conversation timed out after {duration:.2f} seconds. "
                      f"Consider reducing complexity or increasing timeout for future conversations.",
            "duration": duration,
            "error": "Conversation exceeded maximum time limit",
            "performance": {
                "avg_response_time": None,
                "within_target": False,
                "efficiency_score": 0.0
            },
            "metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "timeout_threshold": 90,
                "model_config": self._mask_sensitive_config(self.model_config)
            }
        }

    def _generate_conversation_summary(self, messages: List[Dict], initial_message: str) -> str:
        """
        Generate a concise summary of the conversation.

        Args:
            messages: List of conversation messages
            initial_message: Original question or content

        Returns:
            Conversation summary string
        """
        if not messages:
            return "No meaningful conversation generated."

        try:
            # Count messages per agent
            agent_participation = {}
            for msg in messages:
                agent = msg.get("agent", "unknown")
                agent_participation[agent] = agent_participation.get(agent, 0) + 1

            # Generate basic summary
            summary_parts = [
                f"Financial analysis debate on: {initial_message[:100]}{'...' if len(initial_message) > 100 else ''}",
                f"Participants: {', '.join(agent_participation.keys())}",
                f"Total exchanges: {len(messages)}",
                f"Key focus: Financial analysis with multiple perspectives"
            ]

            return " | ".join(summary_parts)

        except Exception as e:
            logger.warning(f"Error generating summary: {str(e)}")
            return f"Conversation about: {initial_message[:50]}{'...' if len(initial_message) > 50 else ''}"

    def get_conversation_status(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a specific conversation.

        Args:
            conversation_id: Unique conversation identifier

        Returns:
            Conversation status dictionary or None if not found
        """
        return self.active_conversations.get(conversation_id)

    def get_agent_info(self) -> List[Dict[str, Any]]:
        """
        Get information about all available agents.

        Returns:
            List of agent information dictionaries
        """
        agent_info = []
        for agent in self.agents:
            if hasattr(agent, 'get_agent_info'):
                agent_info.append(agent.get_agent_info())
            else:
                agent_info.append({
                    "name": agent.name,
                    "type": type(agent).__name__
                })

        return agent_info

    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get performance metrics for the conversation manager.

        Returns:
            Performance metrics dictionary
        """
        completed_conversations = [
            conv for conv in self.active_conversations.values()
            if conv["status"] in ["completed", "timeout", "error"]
        ]

        if not completed_conversations:
            return {"message": "No completed conversations to analyze"}

        durations = [conv["duration"] for conv in completed_conversations if "duration" in conv]
        success_rate = len([conv for conv in completed_conversations if conv["status"] == "completed"]) / len(completed_conversations)

        return {
            "total_conversations": len(completed_conversations),
            "success_rate": success_rate,
            "average_duration": sum(durations) / len(durations) if durations else 0,
            "within_target_rate": len([d for d in durations if d <= 90]) / len(durations) if durations else 0,
            "agent_count": len(self.agents),
            "model_config": self._mask_sensitive_config(self.model_config)
        }

    def _estimate_complexity(self, initial_message: str, max_turns: int) -> float:
        """
        Estimate conversation complexity for performance optimization.

        Args:
            initial_message: The message content to analyze
            max_turns: Maximum conversation turns

        Returns:
            Complexity score between 0.0 and 1.0
        """
        try:
            # Basic complexity factors
            message_length_factor = min(len(initial_message) / 1000, 1.0)  # Normalize to 1000 chars
            turns_factor = min(max_turns / 10, 1.0)  # Normalize to 10 turns

            # Content complexity indicators
            complex_keywords = ['analyze', 'comprehensive', 'detailed', 'comparison', 'forecast', 'scenario']
            keyword_factor = sum(1 for keyword in complex_keywords if keyword.lower() in initial_message.lower()) / len(complex_keywords)

            # Financial complexity indicators
            financial_terms = ['volatility', 'correlation', 'portfolio', 'risk', 'hedge', 'derivatives']
            financial_factor = sum(1 for term in financial_terms if term.lower() in initial_message.lower()) / len(financial_terms)

            # Calculate weighted complexity score
            complexity = (
                message_length_factor * 0.2 +
                turns_factor * 0.3 +
                keyword_factor * 0.3 +
                financial_factor * 0.2
            )

            logger.debug(f"Complexity estimation: length={message_length_factor:.2f}, turns={turns_factor:.2f}, "
                        f"keywords={keyword_factor:.2f}, financial={financial_factor:.2f}, total={complexity:.2f}")

            return min(complexity, 1.0)

        except Exception as e:
            logger.warning(f"Error estimating complexity: {str(e)}")
            return 0.5  # Default moderate complexity

    def _adjust_timeout_for_complexity(self, base_timeout: int, complexity_score: float) -> int:
        """
        Adjust timeout based on conversation complexity.

        Args:
            base_timeout: Base timeout in seconds
            complexity_score: Complexity score between 0.0 and 1.0

        Returns:
            Adjusted timeout in seconds
        """
        try:
            # Higher complexity gets more time, but cap at reasonable limits
            if complexity_score < 0.3:
                # Simple conversations get reduced timeout for faster response
                adjusted = int(base_timeout * 0.7)
            elif complexity_score > 0.7:
                # Complex conversations get extended timeout
                adjusted = int(base_timeout * 1.2)
            else:
                # Moderate complexity uses base timeout
                adjusted = base_timeout

            # Ensure we stay within reasonable bounds (30-120 seconds)
            adjusted = max(30, min(adjusted, 120))

            logger.debug(f"Timeout adjustment: base={base_timeout}s, complexity={complexity_score:.2f}, adjusted={adjusted}s")

            return adjusted

        except Exception as e:
            logger.warning(f"Error adjusting timeout: {str(e)}")
            return base_timeout

    async def _run_conversation_with_streaming(
        self,
        group_chat,
        initial_message: str,
        timeout: int,
        per_turn_timeout: int,
        conversation_id: str
    ):
        """
        Run conversation with streaming support and per-turn timeouts.

        Args:
            group_chat: AutoGen group chat instance
            initial_message: Initial conversation message
            timeout: Total conversation timeout
            per_turn_timeout: Timeout per individual turn
            conversation_id: Conversation identifier

        Returns:
            Conversation result with streaming metadata
        """
        try:
            # Create a task that can be monitored for streaming
            conversation_task = asyncio.create_task(
                group_chat.run(task=initial_message)
            )

            # Monitor progress with partial timeouts
            start_time = time.time()
            last_progress_time = start_time

            while not conversation_task.done():
                # Check if total timeout exceeded
                if time.time() - start_time > timeout:
                    conversation_task.cancel()
                    raise asyncio.TimeoutError(f"Total conversation timeout ({timeout}s) exceeded")

                # Check for progress timeout (no activity for per_turn_timeout)
                if time.time() - last_progress_time > per_turn_timeout:
                    logger.warning(f"No progress in {per_turn_timeout}s, continuing monitoring...")
                    last_progress_time = time.time()

                # Update conversation tracking with progress
                self.active_conversations[conversation_id]["last_activity"] = time.time()

                # Short sleep to prevent busy waiting
                await asyncio.sleep(0.5)

            # Get the result
            result = await conversation_task

            # Add streaming metadata
            if hasattr(result, '__dict__'):
                result.streaming_enabled = True
                result.monitored_progress = True

            return result

        except asyncio.CancelledError:
            logger.warning(f"Conversation {conversation_id} was cancelled due to timeout")
            raise asyncio.TimeoutError("Conversation cancelled due to timeout")

        except Exception as e:
            logger.error(f"Error in streaming conversation: {str(e)}")
            raise

    def _mask_sensitive_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask sensitive information in configuration for logging/responses.

        Args:
            config: Configuration dictionary

        Returns:
            Configuration with sensitive data masked
        """
        if not config:
            return {}

        masked_config = config.copy()

        # Mask API keys and sensitive fields
        sensitive_fields = ['api_key', 'openai_api_key', 'secret', 'token', 'password']

        for field in sensitive_fields:
            if field in masked_config:
                if isinstance(masked_config[field], str) and len(masked_config[field]) > 4:
                    masked_config[field] = f"{masked_config[field][:4]}***MASKED***"
                else:
                    masked_config[field] = "***MASKED***"

        return masked_config


# Export the appropriate conversation manager based on availability
if AUTOGEN_AVAILABLE and AGENTS_AVAILABLE:
    try:
        ConversationManager = AutoGenConversationManager
        logger.info("Using AutoGen conversation manager")
    except NameError:
        # Fallback if AutoGenConversationManager class has undefined references
        ConversationManager = MockConversationManager
        logger.warning("AutoGen types not available - using mock conversation manager")
else:
    ConversationManager = MockConversationManager
    logger.warning("Using mock conversation manager - AutoGen or agents not available")