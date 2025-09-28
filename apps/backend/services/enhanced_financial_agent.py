"""
Enhanced Financial Agent with MCP Bridge Integration
Uses existing Gayed signals, Perplexity research, and web search through MCP bridge
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from services.mcp_bridge import MCPBridgeClient, MCPServiceError

logger = logging.getLogger(__name__)


class EnhancedFinancialAgent:
    """Financial analyst agent enhanced with real Gayed signals and MCP services"""

    def __init__(self, mcp_client: Optional[MCPBridgeClient] = None):
        self.name = "Enhanced Financial Analyst"
        self.mcp_client = mcp_client or MCPBridgeClient()
        self.specialization = "Quantitative market analysis with Gayed signals integration"

    async def analyze_with_signals(
        self,
        content: str,
        include_fast_signals: bool = False,
        include_research: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze financial content with current Gayed signals context

        Args:
            content: Financial content to analyze
            include_fast_signals: Whether to include fast signals for real-time analysis
            include_research: Whether to include Perplexity research

        Returns:
            Comprehensive analysis with signals, research, and recommendations
        """
        analysis_start = datetime.now()

        try:
            # Gather data in parallel for efficiency
            tasks = []

            # Always get current signals
            tasks.append(self._get_current_signals())

            # Get fast signals if requested
            if include_fast_signals:
                tasks.append(self._get_fast_signals())
            else:
                tasks.append(asyncio.create_task(self._return_none()))

            # Get research if requested
            if include_research:
                tasks.append(self._research_content(content))
            else:
                tasks.append(asyncio.create_task(self._return_none()))

            # Execute all tasks in parallel
            current_signals, fast_signals, research_data = await asyncio.gather(
                *tasks, return_exceptions=True
            )

            # Handle any exceptions in the results
            current_signals = self._handle_result(current_signals, "current signals")
            fast_signals = self._handle_result(fast_signals, "fast signals")
            research_data = self._handle_result(research_data, "research")

            # Build comprehensive analysis
            analysis = await self._build_analysis(
                content=content,
                current_signals=current_signals,
                fast_signals=fast_signals,
                research_data=research_data
            )

            analysis_duration = (datetime.now() - analysis_start).total_seconds()
            analysis["metadata"]["analysis_duration_seconds"] = analysis_duration

            logger.info(f"Financial analysis completed in {analysis_duration:.2f}s")
            return analysis

        except Exception as e:
            logger.error(f"Financial analysis failed: {str(e)}")
            return await self._create_fallback_analysis(content, str(e))

    async def _get_current_signals(self) -> Dict[str, Any]:
        """Get current Gayed signals through MCP bridge"""
        try:
            return await self.mcp_client.get_gayed_signals()
        except MCPServiceError as e:
            logger.error(f"Failed to get current signals: {e}")
            return None

    async def _get_fast_signals(self) -> Dict[str, Any]:
        """Get fast Gayed signals for real-time analysis"""
        try:
            return await self.mcp_client.get_fast_signals()
        except MCPServiceError as e:
            logger.error(f"Failed to get fast signals: {e}")
            return None

    async def _research_content(self, content: str) -> List[Dict[str, Any]]:
        """Research content using Perplexity MCP service"""
        try:
            # Extract key financial topics for research
            research_query = self._extract_research_query(content)
            return await self.mcp_client.search_perplexity(research_query)
        except MCPServiceError as e:
            logger.error(f"Failed to research content: {e}")
            return []

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
        """Extract a focused research query from financial content"""
        # Simple extraction - in production, use more sophisticated NLP
        content_lower = content.lower()

        # Look for key financial terms to focus research
        financial_terms = [
            "fed", "federal reserve", "inflation", "interest rate",
            "market", "recession", "gdp", "unemployment",
            "earnings", "valuation", "pe ratio", "dividend"
        ]

        found_terms = [term for term in financial_terms if term in content_lower]

        if found_terms:
            # Focus on the first few key terms found
            query_terms = found_terms[:3]
            return f"Latest financial analysis on {', '.join(query_terms)}"
        else:
            # Fallback to first 100 characters
            return content[:100].strip()

    async def _build_analysis(
        self,
        content: str,
        current_signals: Optional[Dict[str, Any]],
        fast_signals: Optional[Dict[str, Any]],
        research_data: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Build comprehensive financial analysis from all data sources"""

        # Extract signal insights
        signal_insights = self._extract_signal_insights(current_signals, fast_signals)

        # Extract research insights
        research_insights = self._extract_research_insights(research_data)

        # Generate analysis and recommendations
        analysis_text = self._generate_analysis_text(
            content, signal_insights, research_insights
        )

        confidence_score = self._calculate_confidence_score(
            current_signals, research_data
        )

        return {
            "agent_name": self.name,
            "content_analyzed": content[:200] + "..." if len(content) > 200 else content,
            "signal_insights": signal_insights,
            "research_insights": research_insights,
            "analysis": analysis_text,
            "confidence_score": confidence_score,
            "recommendations": self._generate_recommendations(signal_insights, confidence_score),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "signals_available": current_signals is not None,
                "fast_signals_available": fast_signals is not None,
                "research_available": research_data is not None and len(research_data) > 0,
                "agent_version": "enhanced_v1.0"
            }
        }

    def _extract_signal_insights(
        self,
        current_signals: Optional[Dict[str, Any]],
        fast_signals: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract actionable insights from Gayed signals"""
        insights = {
            "risk_status": "Unknown",
            "confidence": 0,
            "key_signals": [],
            "signal_summary": "No signal data available"
        }

        if current_signals and "consensus" in current_signals:
            consensus = current_signals["consensus"]
            insights.update({
                "risk_status": consensus.get("status", "Unknown"),
                "confidence": consensus.get("confidence", 0),
                "signal_summary": f"Gayed signals show {consensus.get('status', 'Unknown')} with {consensus.get('confidence', 0):.1%} confidence"
            })

            # Extract key individual signals
            if "signals" in current_signals:
                for signal in current_signals["signals"]:
                    insights["key_signals"].append({
                        "type": signal.get("type", "unknown"),
                        "status": signal.get("status", "unknown"),
                        "value": signal.get("value", 0),
                        "confidence": signal.get("confidence", 0)
                    })

        return insights

    def _extract_research_insights(
        self,
        research_data: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Extract insights from Perplexity research"""
        insights = {
            "evidence_count": 0,
            "credibility_score": 0,
            "support_level": "NEUTRAL",
            "key_findings": [],
            "research_summary": "No research data available"
        }

        if research_data and len(research_data) > 0:
            insights["evidence_count"] = len(research_data)

            # Calculate average credibility
            credibilities = [item.get("credibility", 0) for item in research_data]
            insights["credibility_score"] = sum(credibilities) / len(credibilities) if credibilities else 0

            # Extract key findings
            for item in research_data[:3]:  # Top 3 most relevant
                insights["key_findings"].append({
                    "source": item.get("source", "Unknown"),
                    "content": item.get("content", "")[:200] + "..." if len(item.get("content", "")) > 200 else item.get("content", ""),
                    "support_level": item.get("supportLevel", "NEUTRAL")
                })

            insights["research_summary"] = f"Found {len(research_data)} research sources with avg credibility {insights['credibility_score']:.1f}/100"

        return insights

    def _generate_analysis_text(
        self,
        content: str,
        signal_insights: Dict[str, Any],
        research_insights: Dict[str, Any]
    ) -> str:
        """Generate professional financial analysis text"""

        analysis_parts = []

        # Signal-based analysis
        if signal_insights["confidence"] > 0:
            analysis_parts.append(
                f"Current Gayed signals indicate {signal_insights['risk_status']} market conditions "
                f"with {signal_insights['confidence']:.1%} confidence. {signal_insights['signal_summary']}"
            )

        # Research-based analysis
        if research_insights["evidence_count"] > 0:
            analysis_parts.append(
                f"Research analysis found {research_insights['evidence_count']} relevant sources "
                f"with average credibility of {research_insights['credibility_score']:.1f}/100. "
                f"{research_insights['research_summary']}"
            )

        # Content-specific insights
        content_insight = self._analyze_content_sentiment(content)
        analysis_parts.append(content_insight)

        if not analysis_parts:
            return "Analysis limited due to unavailable data sources. Recommend manual verification."

        return " ".join(analysis_parts)

    def _analyze_content_sentiment(self, content: str) -> str:
        """Basic content sentiment analysis"""
        content_lower = content.lower()

        positive_terms = ["growth", "increase", "bullish", "opportunity", "strong", "positive"]
        negative_terms = ["decline", "decrease", "bearish", "risk", "weak", "negative"]

        positive_count = sum(1 for term in positive_terms if term in content_lower)
        negative_count = sum(1 for term in negative_terms if term in content_lower)

        if positive_count > negative_count:
            return "Content sentiment analysis suggests optimistic market outlook."
        elif negative_count > positive_count:
            return "Content sentiment analysis suggests cautious market outlook."
        else:
            return "Content sentiment analysis suggests neutral market outlook."

    def _calculate_confidence_score(
        self,
        current_signals: Optional[Dict[str, Any]],
        research_data: Optional[List[Dict[str, Any]]]
    ) -> float:
        """Calculate overall confidence score for the analysis"""
        confidence_factors = []

        # Signal confidence factor
        if current_signals and "consensus" in current_signals:
            signal_confidence = current_signals["consensus"].get("confidence", 0)
            confidence_factors.append(signal_confidence * 0.6)  # 60% weight for signals

        # Research confidence factor
        if research_data and len(research_data) > 0:
            research_count = min(len(research_data), 5)  # Cap at 5 for confidence calc
            research_confidence = research_count / 5.0  # Normalize to 0-1
            confidence_factors.append(research_confidence * 0.4)  # 40% weight for research

        return sum(confidence_factors) if confidence_factors else 0.0

    def _generate_recommendations(
        self,
        signal_insights: Dict[str, Any],
        confidence_score: float
    ) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []

        risk_status = signal_insights.get("risk_status", "Unknown")
        confidence = signal_insights.get("confidence", 0)

        if confidence_score > 0.7:
            if risk_status == "Risk-Off":
                recommendations.extend([
                    "Consider defensive positioning with utilities and bonds",
                    "Monitor VIX levels for volatility changes",
                    "Reduce exposure to growth stocks and high-beta assets"
                ])
            elif risk_status == "Risk-On":
                recommendations.extend([
                    "Consider increasing equity exposure in cyclical sectors",
                    "Monitor for continuation of risk-on conditions",
                    "Evaluate opportunities in growth and momentum stocks"
                ])
            else:
                recommendations.append("Maintain balanced portfolio allocation during neutral signals")
        else:
            recommendations.extend([
                "Exercise caution due to low confidence in current analysis",
                "Seek additional data sources for validation",
                "Consider smaller position sizes until clarity improves"
            ])

        # Always include general risk management
        recommendations.append("Maintain appropriate risk management and position sizing")

        return recommendations

    async def _create_fallback_analysis(self, content: str, error: str) -> Dict[str, Any]:
        """Create fallback analysis when main analysis fails"""
        return {
            "agent_name": self.name,
            "content_analyzed": content[:200] + "..." if len(content) > 200 else content,
            "signal_insights": {"error": "Signal data unavailable"},
            "research_insights": {"error": "Research data unavailable"},
            "analysis": f"Analysis could not be completed due to technical issues: {error}",
            "confidence_score": 0.0,
            "recommendations": [
                "Manual analysis recommended due to system limitations",
                "Verify all information through alternative sources",
                "Exercise extreme caution in trading decisions"
            ],
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "error": error,
                "agent_version": "enhanced_v1.0_fallback"
            }
        }

    async def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all MCP services"""
        try:
            health_status = await self.mcp_client.health_check()
            cache_stats = self.mcp_client.get_cache_stats()

            return {
                "agent_status": "healthy",
                "mcp_services": health_status,
                "cache_stats": cache_stats,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "agent_status": "degraded",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def close(self):
        """Cleanup resources"""
        if self.mcp_client:
            await self.mcp_client.close()


# Factory function for easy instantiation
async def create_enhanced_financial_agent() -> EnhancedFinancialAgent:
    """Create and return a configured Enhanced Financial Agent"""
    mcp_client = MCPBridgeClient()
    return EnhancedFinancialAgent(mcp_client)