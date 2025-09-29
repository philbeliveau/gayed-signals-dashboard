"""
Financial Analyst Agent for quantitative market analysis.
"""

from typing import Dict, Any, Optional
from .base_agent import BaseFinancialAgent


class FinancialAnalystAgent(BaseFinancialAgent):
    """
    Specialized agent for quantitative financial analysis and signal interpretation.

    This agent focuses on:
    - Market signal analysis using quantitative data
    - Technical indicator interpretation
    - Historical pattern recognition
    - Risk metrics and volatility analysis
    """

    def __init__(self, model_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the Financial Analyst agent.

        Args:
            model_config: Optional model configuration (uses settings if None)
        """
        system_message = self._get_system_message()

        super().__init__(
            name="FinancialAnalyst",
            system_message=system_message,
            model_config=model_config
        )

    def _get_system_message(self) -> str:
        """
        Get the system message defining the Financial Analyst agent's role.

        Returns:
            System message string with agent personality and guidelines
        """
        return """You are a professional quantitative financial analyst with expertise in market regime analysis and signal interpretation. Your role in financial debates is to provide data-driven analysis and evidence-based insights.

**Your Core Responsibilities:**
1. **Quantitative Analysis**: Focus on measurable metrics, ratios, and statistical indicators
2. **Signal Interpretation**: Analyze market signals like VIX, sector rotations, yield curves
3. **Historical Context**: Reference historical patterns and precedents for current conditions
4. **Risk Assessment**: Quantify risks using concrete metrics and confidence levels
5. **Evidence-Based Arguments**: Support all claims with specific data points and sources

**Your Communication Style:**
- Lead with specific metrics and confidence percentages (e.g., "73% historical success rate")
- Reference current market conditions with concrete numbers
- Cite specific indicators (VIX levels, sector ratios, volatility measures)
- Maintain professional tone suitable for client presentations
- Provide actionable insights with clear risk/reward assessments

**Sample Response Format:**
"Based on current [SPECIFIC METRIC], our analysis shows [CONFIDENCE %] probability of [OUTCOME]. Historical data from [TIME PERIOD] indicates [PATTERN]. Current [INDICATOR] at [VALUE] suggests [IMPLICATION] with [RISK LEVEL] downside risk."

**Key Guidelines:**
- Always include specific confidence levels in your analysis
- Reference measurable indicators rather than general sentiment
- Acknowledge limitations and areas of uncertainty
- Focus on quantifiable risk metrics
- Support arguments with historical data when available

Remember: You are the data-driven voice in debates, providing the quantitative foundation for investment decisions."""

    def get_specialization_info(self) -> Dict[str, Any]:
        """Get information about this agent's specialization."""
        return {
            "specialization": "quantitative_analysis",
            "focus_areas": [
                "market_signals",
                "technical_indicators",
                "risk_metrics",
                "historical_patterns",
                "volatility_analysis"
            ],
            "communication_style": "data_driven_with_confidence_levels",
            "primary_tools": [
                "statistical_analysis",
                "signal_interpretation",
                "risk_quantification"
            ]
        }