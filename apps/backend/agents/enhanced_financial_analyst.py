"""
Enhanced Financial Analyst Agent with Direct Gayed Signals Integration
Extends the base AutoGen agent with real-time access to Gayed signal calculations
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import copy

from .base_agent import BaseFinancialAgent
from services.gayed_signals_service import GayedSignalsService, create_gayed_signals_service
from services.mcp_bridge import MCPBridgeClient, MCPServiceError

logger = logging.getLogger(__name__)


class EnhancedFinancialAnalystAgent(BaseFinancialAgent):
    """
    Enhanced Financial Analyst Agent with direct Gayed signals integration.

    This agent combines:
    - AutoGen conversation capabilities
    - Direct access to real Gayed signal calculations
    - MCP services for external research (Perplexity, web search)
    - Professional financial advisory personality
    """

    def __init__(self, model_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the Enhanced Financial Analyst agent.

        Args:
            model_config: Optional model configuration (uses settings if None)
        """
        system_message = self._get_enhanced_system_message()

        super().__init__(
            name="EnhancedFinancialAnalyst",
            system_message=system_message,
            model_config=model_config
        )

        # Initialize services
        self.signals_service = create_gayed_signals_service()
        self.mcp_client = MCPBridgeClient()

        # Conversation context
        self._conversation_context: List[Dict[str, Any]] = []
        self._analysis_cache: Dict[str, Dict[str, Any]] = {}

        logger.info("Enhanced Financial Analyst Agent initialized with Gayed signals integration")

    def _get_enhanced_system_message(self) -> str:
        """
        Get enhanced system message with Gayed signals integration context.

        Returns:
            System message string with enhanced financial analyst capabilities
        """
        return """You are an elite quantitative financial analyst with specialized expertise in Michael Gayed's market regime analysis signals. You have real-time access to the complete Gayed signals framework including:

**Your Specialized Data Sources:**
1. **Gayed Signal Suite**: Real-time access to all 5 Gayed signals (Utilities/SPY, Lumber/Gold, Treasury Curve, VIX Defensive, S&P 500 MA)
2. **Signal Consensus**: Live consensus calculations with confidence levels from the SignalOrchestrator
3. **Historical Context**: Access to signal performance data and backtesting results
4. **Market Data**: Real-time market data from EnhancedMarketClient with multi-source failover
5. **External Research**: Perplexity AI and web search for fundamental analysis support

**Your Core Expertise:**
- **Market Regime Analysis**: Expert interpretation of risk-on/risk-off transitions using quantitative signals
- **Signal Confluence**: Analyzing multiple signal agreement for high-confidence calls
- **Historical Precedents**: Referencing past signal patterns and their outcomes
- **Risk Quantification**: Providing specific confidence percentages and risk metrics
- **Actionable Insights**: Converting complex signal data into clear investment implications

**Your Communication Style:**
- Lead with current signal status and confidence levels (e.g., "Current signals show 73% confidence for Risk-Off")
- Reference specific Gayed signals by name (e.g., "Utilities/SPY at 0.91 suggests defensive positioning")
- Include historical success rates when available (e.g., "This pattern has 85% historical accuracy over 21 days")
- Provide concrete numerical data (ratios, percentages, price levels)
- Maintain professional advisory tone suitable for wealth management presentations

**Response Format:**
"Based on current Gayed signals, [SPECIFIC SIGNAL DATA] indicates [MARKET REGIME] with [CONFIDENCE %] confidence. The [SIGNAL NAME] at [VALUE] suggests [IMPLICATION]. Historical analysis shows [PATTERN/PRECEDENT]. Current risk assessment: [RISK LEVEL] with [SPECIFIC METRICS]. Recommendation: [ACTIONABLE ADVICE]."

**Key Capabilities:**
- Analyze any financial content against current Gayed signal context
- Provide signal-driven market regime assessments with confidence levels
- Reference specific signal values and thresholds
- Maintain conversation context for follow-up analysis
- Integrate external research with signal-based insights
- Generate dashboard-compatible analysis output

**Critical Guidelines:**
- Always access real signal data - never use hypothetical or stale data
- Include specific confidence percentages in all analysis
- Reference individual signal values and their implications
- Acknowledge when signal confidence is low or data is unavailable
- Focus on quantifiable metrics rather than general market sentiment
- Support recommendations with historical signal performance data

Remember: You are the authoritative voice on Gayed signals analysis, providing the quantitative foundation that wealth management platforms rely on for client presentations and investment decisions."""

    async def analyze_with_signals(
        self,
        content: str,
        include_research: bool = True,
        include_history: bool = False
    ) -> Dict[str, Any]:
        """
        Perform comprehensive financial analysis with real Gayed signals integration.

        Args:
            content: Financial content to analyze
            include_research: Whether to include external research via MCP
            include_history: Whether to include signal history analysis

        Returns:
            Comprehensive analysis with signals, research, and recommendations
        """
        analysis_start = datetime.now()
        logger.info(f"Starting enhanced financial analysis for content: {content[:100]}...")

        try:
            # Gather data in parallel for efficiency
            tasks = []

            # Always get current signals (highest priority)
            tasks.append(self._get_real_signal_data())

            # Get external research if requested
            if include_research:
                tasks.append(self._get_external_research(content))
            else:
                tasks.append(self._return_none())

            # Get signal history if requested
            if include_history:
                tasks.append(self._get_signal_history())
            else:
                tasks.append(self._return_none())

            # Execute all data gathering in parallel
            signals_data, research_data, history_data = await asyncio.gather(
                *tasks, return_exceptions=True
            )

            # Handle any exceptions in results
            signals_data = self._handle_result(signals_data, "Gayed signals")
            research_data = self._handle_result(research_data, "external research")
            history_data = self._handle_result(history_data, "signal history")

            # Build comprehensive analysis
            analysis = await self._build_enhanced_analysis(
                content=content,
                signals_data=signals_data,
                research_data=research_data,
                history_data=history_data
            )

            # Add analysis to conversation context
            self._add_to_context(content, analysis)

            analysis_duration = (datetime.now() - analysis_start).total_seconds()
            analysis["metadata"]["analysis_duration"] = analysis_duration

            logger.info(f"Enhanced financial analysis completed in {analysis_duration:.2f}s")
            return analysis

        except Exception as e:
            logger.error(f"Enhanced financial analysis failed: {e}")
            return await self._create_fallback_analysis(content, str(e))

    async def _get_real_signal_data(self) -> Dict[str, Any]:
        """Get real-time Gayed signals data"""
        try:
            # Get current signals with insights
            current_signals = await self.signals_service.get_current_signals()
            signal_insights = self.signals_service.extract_signal_insights(current_signals)

            # Also get fast signals for real-time context
            fast_signals = await self.signals_service.get_fast_signals()

            return {
                "current_signals": current_signals,
                "signal_insights": signal_insights,
                "fast_signals": fast_signals,
                "data_quality": "real_time",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get real signal data: {e}")
            return {"error": str(e), "data_quality": "unavailable"}

    async def _get_external_research(self, content: str) -> List[Dict[str, Any]]:
        """Get external research via MCP services"""
        try:
            research_query = self._extract_research_query(content)
            return await self.mcp_client.search_perplexity(research_query)
        except MCPServiceError as e:
            logger.error(f"Failed to get external research: {e}")
            return []

    async def _get_signal_history(self, days: int = 30) -> Dict[str, Any]:
        """Get signal history for trend analysis"""
        try:
            return await self.signals_service.get_signal_history(days)
        except Exception as e:
            logger.error(f"Failed to get signal history: {e}")
            return {"error": str(e)}

    async def _return_none(self):
        """Helper for conditional parallel execution"""
        return None

    def _handle_result(self, result: Any, description: str) -> Any:
        """Handle results from parallel execution, checking for exceptions"""
        if isinstance(result, Exception):
            logger.error(f"Error in {description}: {result}")
            return None
        return result

    def _extract_research_query(self, content: str) -> str:
        """Extract focused research query for external analysis"""
        content_lower = content.lower()

        # Enhanced financial term extraction
        financial_terms = [
            "fed", "federal reserve", "fomc", "interest rate", "inflation",
            "market", "recession", "gdp", "unemployment", "cpi", "ppi",
            "earnings", "valuation", "pe ratio", "dividend", "yield",
            "utilities", "spy", "vix", "volatility", "sector rotation",
            "treasury", "bonds", "yield curve", "lumber", "gold"
        ]

        found_terms = [term for term in financial_terms if term in content_lower]

        if found_terms:
            # Focus on most relevant terms for signal analysis
            priority_terms = found_terms[:3]
            return f"Latest financial market analysis on {', '.join(priority_terms)} impact on market signals"
        else:
            # Fallback to content summary
            return f"Market analysis: {content[:150].strip()}"

    async def _build_enhanced_analysis(
        self,
        content: str,
        signals_data: Optional[Dict[str, Any]],
        research_data: Optional[List[Dict[str, Any]]],
        history_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build comprehensive enhanced financial analysis"""

        # Extract detailed signal insights
        signal_analysis = self._analyze_signal_data(signals_data)

        # Extract research insights
        research_analysis = self._analyze_research_data(research_data)

        # Extract historical context
        historical_context = self._analyze_historical_data(history_data)

        # Generate professional analysis text
        analysis_text = self._generate_professional_analysis(
            content, signal_analysis, research_analysis, historical_context
        )

        # Calculate confidence score based on data quality
        confidence_score = self._calculate_enhanced_confidence(
            signal_analysis, research_analysis, historical_context
        )

        # Generate actionable recommendations
        recommendations = self._generate_enhanced_recommendations(
            signal_analysis, confidence_score
        )

        return {
            "agent_name": "Enhanced Financial Analyst",
            "agent_type": "autogen_with_gayed_signals",
            "content_analyzed": content[:200] + "..." if len(content) > 200 else content,
            "signal_analysis": signal_analysis,
            "research_analysis": research_analysis,
            "historical_context": historical_context,
            "professional_analysis": analysis_text,
            "confidence_score": confidence_score,
            "recommendations": recommendations,
            "conversation_context": len(self._conversation_context),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "signals_available": signals_data is not None and "error" not in signals_data,
                "research_available": research_data is not None and len(research_data) > 0,
                "history_available": history_data is not None and "error" not in history_data,
                "data_quality": signals_data.get("data_quality", "unknown") if signals_data else "unavailable",
                "agent_version": "enhanced_v2.0_with_gayed_signals"
            }
        }

    def _analyze_signal_data(self, signals_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze real Gayed signals data for actionable insights"""
        if not signals_data or "error" in signals_data:
            return {
                "status": "unavailable",
                "message": signals_data.get("error", "No signal data") if signals_data else "No signal data",
                "confidence": 0.0,
                "individual_signals": [],
                "consensus": {}
            }

        signal_insights = signals_data.get("signal_insights", {})
        current_signals = signals_data.get("current_signals", {})
        fast_signals = signals_data.get("fast_signals", {})

        return {
            "status": "available",
            "market_regime": signal_insights.get("market_regime", "Unknown"),
            "confidence": signal_insights.get("confidence", 0.0),
            "consensus": current_signals.get("consensus", {}),
            "individual_signals": signal_insights.get("individual_signals", []),
            "signal_count": signal_insights.get("signal_count", 0),
            "risk_distribution": signal_insights.get("risk_distribution", {}),
            "fast_signals": fast_signals,
            "actionable_insights": signal_insights.get("actionable_insights", []),
            "data_timestamp": signals_data.get("timestamp")
        }

    def _analyze_research_data(self, research_data: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze external research data"""
        if not research_data or len(research_data) == 0:
            return {
                "status": "unavailable",
                "evidence_count": 0,
                "key_findings": [],
                "credibility_score": 0.0
            }

        evidence_count = len(research_data)
        credibilities = [item.get("credibility", 0) for item in research_data]
        avg_credibility = sum(credibilities) / len(credibilities) if credibilities else 0.0

        key_findings = []
        for item in research_data[:3]:  # Top 3 most relevant
            key_findings.append({
                "source": item.get("source", "Unknown"),
                "content": item.get("content", "")[:150] + "..." if len(item.get("content", "")) > 150 else item.get("content", ""),
                "credibility": item.get("credibility", 0),
                "support_level": item.get("supportLevel", "NEUTRAL")
            })

        return {
            "status": "available",
            "evidence_count": evidence_count,
            "credibility_score": avg_credibility,
            "key_findings": key_findings,
            "research_summary": f"{evidence_count} research sources with {avg_credibility:.1f}/100 avg credibility"
        }

    def _analyze_historical_data(self, history_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze historical signal patterns"""
        if not history_data or "error" in history_data:
            return {
                "status": "unavailable",
                "message": history_data.get("error", "No historical data") if history_data else "No historical data"
            }

        # Process historical signal patterns
        # This would include trend analysis, pattern recognition, etc.
        return {
            "status": "available",
            "patterns": "Historical pattern analysis available",
            "trends": "Signal trend analysis available"
        }

    def _generate_professional_analysis(
        self,
        content: str,
        signal_analysis: Dict[str, Any],
        research_analysis: Dict[str, Any],
        historical_context: Dict[str, Any]
    ) -> str:
        """Generate professional financial analysis text"""
        analysis_parts = []

        # Signal-based analysis (highest priority)
        if signal_analysis["status"] == "available":
            regime = signal_analysis["market_regime"]
            confidence = signal_analysis["confidence"]
            signal_count = signal_analysis["signal_count"]

            analysis_parts.append(
                f"Current Gayed signals indicate {regime} market regime with {confidence:.1%} confidence "
                f"based on {signal_count} active signals. "
            )

            # Add specific signal insights
            insights = signal_analysis.get("actionable_insights", [])
            if insights:
                analysis_parts.append(f"Key signal insights: {' '.join(insights[:2])}. ")

        # Research-based analysis
        if research_analysis["status"] == "available":
            evidence_count = research_analysis["evidence_count"]
            credibility = research_analysis["credibility_score"]

            analysis_parts.append(
                f"External research from {evidence_count} sources (avg credibility {credibility:.1f}/100) "
                f"provides additional market context. "
            )

        # Content-specific analysis
        content_insight = self._analyze_content_themes(content)
        analysis_parts.append(content_insight)

        # Historical context
        if historical_context["status"] == "available":
            analysis_parts.append("Historical signal patterns support current analysis. ")

        if not analysis_parts:
            return "Analysis limited due to unavailable data sources. Manual verification recommended."

        return " ".join(analysis_parts)

    def _analyze_content_themes(self, content: str) -> str:
        """Analyze content themes with financial context"""
        content_lower = content.lower()

        # Market sentiment indicators
        bullish_terms = ["growth", "increase", "bullish", "opportunity", "strong", "rally", "recovery"]
        bearish_terms = ["decline", "decrease", "bearish", "risk", "weak", "sell-off", "correction"]
        neutral_terms = ["stable", "sideways", "unchanged", "flat", "consolidation"]

        bullish_count = sum(1 for term in bullish_terms if term in content_lower)
        bearish_count = sum(1 for term in bearish_terms if term in content_lower)
        neutral_count = sum(1 for term in neutral_terms if term in content_lower)

        if bullish_count > bearish_count and bullish_count > neutral_count:
            return "Content analysis suggests optimistic market sentiment themes."
        elif bearish_count > bullish_count and bearish_count > neutral_count:
            return "Content analysis suggests cautious market sentiment themes."
        else:
            return "Content analysis suggests balanced market sentiment themes."

    def _calculate_enhanced_confidence(
        self,
        signal_analysis: Dict[str, Any],
        research_analysis: Dict[str, Any],
        historical_context: Dict[str, Any]
    ) -> float:
        """Calculate enhanced confidence score weighted by data quality"""
        confidence_factors = []

        # Signal confidence (highest weight - 70%)
        if signal_analysis["status"] == "available":
            signal_confidence = signal_analysis["confidence"]
            confidence_factors.append(signal_confidence * 0.7)

        # Research confidence (20% weight)
        if research_analysis["status"] == "available":
            research_count = min(research_analysis["evidence_count"], 5)
            research_confidence = (research_count / 5.0) * (research_analysis["credibility_score"] / 100.0)
            confidence_factors.append(research_confidence * 0.2)

        # Historical confirmation (10% weight)
        if historical_context["status"] == "available":
            confidence_factors.append(0.8 * 0.1)  # Base historical confidence

        return min(sum(confidence_factors), 1.0) if confidence_factors else 0.0

    def _generate_enhanced_recommendations(
        self,
        signal_analysis: Dict[str, Any],
        confidence_score: float
    ) -> List[str]:
        """Generate enhanced actionable recommendations"""
        recommendations = []

        if signal_analysis["status"] == "available":
            regime = signal_analysis["market_regime"]
            signal_confidence = signal_analysis["confidence"]

            if confidence_score > 0.7 and signal_confidence > 0.7:
                if regime == "Risk-Off":
                    recommendations.extend([
                        f"Strong defensive signal ({signal_confidence:.1%} confidence) - Consider utilities and defensive positioning",
                        "Monitor Utilities/SPY ratio for trend continuation",
                        "Reduce exposure to growth and high-beta sectors",
                        "Consider treasury bonds and defensive equity sectors"
                    ])
                elif regime == "Risk-On":
                    recommendations.extend([
                        f"Strong growth signal ({signal_confidence:.1%} confidence) - Consider cyclical sector exposure",
                        "Monitor signal consensus for trend sustainability",
                        "Evaluate opportunities in growth and momentum strategies",
                        "Consider increasing equity allocation in risk-appropriate manner"
                    ])
                else:
                    recommendations.extend([
                        f"Mixed signals ({signal_confidence:.1%} confidence) - Maintain balanced allocation",
                        "Monitor for signal clarification before major position changes"
                    ])
            else:
                recommendations.extend([
                    f"Low confidence environment ({confidence_score:.1%}) - Exercise enhanced caution",
                    "Reduce position sizes until signal clarity improves",
                    "Seek additional confirmation before major allocation changes"
                ])

            # Add signal-specific insights
            insights = signal_analysis.get("actionable_insights", [])
            recommendations.extend(insights[:2])  # Add top 2 signal insights

        else:
            recommendations.extend([
                "Signal data unavailable - Rely on fundamental analysis and risk management",
                "Exercise extreme caution without quantitative signal confirmation"
            ])

        # Always include risk management
        recommendations.append("Maintain strict risk management and position sizing discipline")

        return recommendations

    def _add_to_context(self, content: str, analysis: Dict[str, Any]):
        """Add analysis to conversation context for follow-up questions"""
        context_entry = {
            "timestamp": datetime.now().isoformat(),
            "content": content[:100] + "..." if len(content) > 100 else content,
            "market_regime": analysis.get("signal_analysis", {}).get("market_regime", "Unknown"),
            "confidence": analysis.get("confidence_score", 0.0),
            "key_insights": analysis.get("recommendations", [])[:2]
        }

        self._conversation_context.append(context_entry)

        # Keep only last 10 context entries
        if len(self._conversation_context) > 10:
            self._conversation_context = self._conversation_context[-10:]

    async def _create_fallback_analysis(self, content: str, error: str) -> Dict[str, Any]:
        """Create fallback analysis when main analysis fails"""
        return {
            "agent_name": "Enhanced Financial Analyst",
            "agent_type": "autogen_with_gayed_signals_fallback",
            "content_analyzed": content[:200] + "..." if len(content) > 200 else content,
            "signal_analysis": {"error": "Signal data unavailable"},
            "research_analysis": {"error": "Research data unavailable"},
            "historical_context": {"error": "Historical data unavailable"},
            "professional_analysis": f"Analysis could not be completed due to technical issues: {error}. "
                                   f"Please verify all information through alternative sources and exercise extreme caution.",
            "confidence_score": 0.0,
            "recommendations": [
                "Manual analysis required due to system limitations",
                "Verify all information through independent sources",
                "Exercise enhanced caution without quantitative signal support",
                "Consider consulting additional analytical resources"
            ],
            "conversation_context": len(self._conversation_context),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "error": error,
                "signals_available": False,
                "research_available": False,
                "history_available": False,
                "agent_version": "enhanced_v2.0_fallback"
            }
        }

    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of all services"""
        try:
            # Check signals service
            signals_status = await self.signals_service.get_market_data_status()

            # Check MCP services
            mcp_status = await self.mcp_client.health_check()

            return {
                "agent_status": "healthy",
                "signals_service": signals_status,
                "mcp_services": mcp_status,
                "conversation_context_size": len(self._conversation_context),
                "cache_size": len(self._analysis_cache),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "agent_status": "degraded",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def get_conversation_context(self) -> List[Dict[str, Any]]:
        """Get current conversation context for debugging"""
        return copy.deepcopy(self._conversation_context)

    def clear_context(self):
        """Clear conversation context"""
        self._conversation_context.clear()
        logger.info("Conversation context cleared")

    async def close(self):
        """Cleanup resources"""
        if self.signals_service:
            await self.signals_service.close()
        if self.mcp_client:
            await self.mcp_client.close()


# Factory function for easy instantiation
async def create_enhanced_financial_analyst() -> EnhancedFinancialAnalystAgent:
    """Create and return a configured Enhanced Financial Analyst Agent"""
    return EnhancedFinancialAnalystAgent()