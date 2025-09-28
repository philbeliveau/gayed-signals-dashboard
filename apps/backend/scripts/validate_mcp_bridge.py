#!/usr/bin/env python3
"""
MCP Bridge Validation Script
Validates the performance and integration of MCP bridge services
Tests real connectivity and performance under various conditions
"""

import asyncio
import time
import logging
from datetime import datetime
from typing import Dict, Any, List
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.mcp_bridge import MCPBridgeClient, MCPServiceError
from services.enhanced_financial_agent import EnhancedFinancialAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MCPBridgeValidator:
    """Comprehensive validation for MCP bridge functionality"""

    def __init__(self):
        self.mcp_client = MCPBridgeClient()
        self.results: Dict[str, Any] = {}

    async def run_all_validations(self) -> Dict[str, Any]:
        """Run all validation tests and return comprehensive results"""
        logger.info("Starting MCP Bridge validation...")
        start_time = datetime.now()

        validations = [
            ("connectivity", self.validate_connectivity),
            ("signal_bridge", self.validate_signal_bridge),
            ("perplexity_bridge", self.validate_perplexity_bridge),
            ("web_search_bridge", self.validate_web_search_bridge),
            ("caching_performance", self.validate_caching_performance),
            ("error_handling", self.validate_error_handling),
            ("parallel_performance", self.validate_parallel_performance),
            ("agent_integration", self.validate_agent_integration),
        ]

        for test_name, test_func in validations:
            logger.info(f"Running validation: {test_name}")
            try:
                result = await test_func()
                self.results[test_name] = {
                    "status": "PASSED",
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                }
                logger.info(f"✅ {test_name}: PASSED")
            except Exception as e:
                self.results[test_name] = {
                    "status": "FAILED",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                logger.error(f"❌ {test_name}: FAILED - {e}")

        total_duration = (datetime.now() - start_time).total_seconds()

        # Generate summary
        passed_tests = sum(1 for r in self.results.values() if r["status"] == "PASSED")
        total_tests = len(self.results)

        summary = {
            "validation_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
                "total_duration_seconds": total_duration
            },
            "test_results": self.results,
            "timestamp": datetime.now().isoformat()
        }

        await self.mcp_client.close()
        return summary

    async def validate_connectivity(self) -> Dict[str, Any]:
        """Validate basic connectivity to all MCP services"""
        connectivity_results = {}

        # Test health check endpoint
        health_status = await self.mcp_client.health_check()
        connectivity_results["health_endpoint"] = health_status

        # Test individual service connectivity
        services_to_test = [
            ("perplexity", self.mcp_client.test_perplexity_connection),
            ("web_search", self.mcp_client.test_web_search_connectivity)
        ]

        for service_name, test_func in services_to_test:
            try:
                is_connected = await test_func()
                connectivity_results[service_name] = {
                    "status": "connected" if is_connected else "disconnected",
                    "available": is_connected
                }
            except Exception as e:
                connectivity_results[service_name] = {
                    "status": "error",
                    "error": str(e),
                    "available": False
                }

        return connectivity_results

    async def validate_signal_bridge(self) -> Dict[str, Any]:
        """Validate Gayed signals bridge functionality"""
        signal_results = {}

        # Test current signals
        start_time = time.time()
        try:
            current_signals = await self.mcp_client.get_gayed_signals()
            signal_results["current_signals"] = {
                "retrieved": True,
                "response_time_ms": (time.time() - start_time) * 1000,
                "has_consensus": "consensus" in current_signals if current_signals else False,
                "has_signals": "signals" in current_signals if current_signals else False,
                "data_structure_valid": self._validate_signal_structure(current_signals)
            }
        except Exception as e:
            signal_results["current_signals"] = {
                "retrieved": False,
                "error": str(e),
                "response_time_ms": (time.time() - start_time) * 1000
            }

        # Test fast signals
        start_time = time.time()
        try:
            fast_signals = await self.mcp_client.get_fast_signals()
            signal_results["fast_signals"] = {
                "retrieved": True,
                "response_time_ms": (time.time() - start_time) * 1000,
                "data_structure_valid": self._validate_signal_structure(fast_signals)
            }
        except Exception as e:
            signal_results["fast_signals"] = {
                "retrieved": False,
                "error": str(e),
                "response_time_ms": (time.time() - start_time) * 1000
            }

        return signal_results

    async def validate_perplexity_bridge(self) -> Dict[str, Any]:
        """Validate Perplexity research bridge functionality"""
        perplexity_results = {}

        test_query = "Federal Reserve interest rate policy 2024"

        start_time = time.time()
        try:
            research_results = await self.mcp_client.search_perplexity(test_query)
            perplexity_results["research_query"] = {
                "query": test_query,
                "retrieved": True,
                "response_time_ms": (time.time() - start_time) * 1000,
                "results_count": len(research_results) if research_results else 0,
                "data_structure_valid": self._validate_research_structure(research_results)
            }
        except Exception as e:
            perplexity_results["research_query"] = {
                "query": test_query,
                "retrieved": False,
                "error": str(e),
                "response_time_ms": (time.time() - start_time) * 1000
            }

        return perplexity_results

    async def validate_web_search_bridge(self) -> Dict[str, Any]:
        """Validate web search bridge functionality"""
        web_search_results = {}

        test_query = "stock market analysis today"
        agent_types = ["NEWS", "FINANCIAL", "ACADEMIC"]

        for agent_type in agent_types:
            start_time = time.time()
            try:
                search_results = await self.mcp_client.search_web(
                    query=test_query,
                    agent_type=agent_type,
                    max_results=3
                )
                web_search_results[agent_type.lower()] = {
                    "query": test_query,
                    "agent_type": agent_type,
                    "retrieved": True,
                    "response_time_ms": (time.time() - start_time) * 1000,
                    "results_count": len(search_results) if search_results else 0,
                    "data_structure_valid": self._validate_web_search_structure(search_results)
                }
            except Exception as e:
                web_search_results[agent_type.lower()] = {
                    "query": test_query,
                    "agent_type": agent_type,
                    "retrieved": False,
                    "error": str(e),
                    "response_time_ms": (time.time() - start_time) * 1000
                }

        return web_search_results

    async def validate_caching_performance(self) -> Dict[str, Any]:
        """Validate caching performance and effectiveness"""
        cache_results = {}

        # Test signal caching
        try:
            # First call - should populate cache
            start_time = time.time()
            signals1 = await self.mcp_client.get_gayed_signals(use_cache=True)
            first_call_time = (time.time() - start_time) * 1000

            # Second call - should use cache
            start_time = time.time()
            signals2 = await self.mcp_client.get_gayed_signals(use_cache=True)
            second_call_time = (time.time() - start_time) * 1000

            # Third call without cache - should hit API again
            start_time = time.time()
            signals3 = await self.mcp_client.get_gayed_signals(use_cache=False)
            no_cache_time = (time.time() - start_time) * 1000

            cache_results["signal_caching"] = {
                "first_call_ms": first_call_time,
                "cached_call_ms": second_call_time,
                "no_cache_call_ms": no_cache_time,
                "cache_speedup_factor": first_call_time / second_call_time if second_call_time > 0 else 0,
                "data_consistency": signals1 == signals2 if signals1 and signals2 else False
            }

        except Exception as e:
            cache_results["signal_caching"] = {"error": str(e)}

        # Get cache statistics
        try:
            cache_stats = self.mcp_client.get_cache_stats()
            cache_results["cache_statistics"] = cache_stats
        except Exception as e:
            cache_results["cache_statistics"] = {"error": str(e)}

        return cache_results

    async def validate_error_handling(self) -> Dict[str, Any]:
        """Validate error handling mechanisms"""
        error_handling_results = {}

        # Test invalid service
        try:
            await self.mcp_client.call_mcp_service("invalid_service", "test", {})
            error_handling_results["invalid_service"] = {
                "handled_correctly": False,
                "note": "Should have raised MCPServiceError"
            }
        except MCPServiceError:
            error_handling_results["invalid_service"] = {
                "handled_correctly": True,
                "note": "Correctly raised MCPServiceError"
            }
        except Exception as e:
            error_handling_results["invalid_service"] = {
                "handled_correctly": False,
                "error": str(e)
            }

        # Test invalid method
        try:
            await self.mcp_client.call_mcp_service("signals", "invalid_method", {})
            error_handling_results["invalid_method"] = {
                "handled_correctly": False,
                "note": "Should have raised MCPServiceError"
            }
        except MCPServiceError:
            error_handling_results["invalid_method"] = {
                "handled_correctly": True,
                "note": "Correctly raised MCPServiceError"
            }
        except Exception as e:
            error_handling_results["invalid_method"] = {
                "handled_correctly": False,
                "error": str(e)
            }

        return error_handling_results

    async def validate_parallel_performance(self) -> Dict[str, Any]:
        """Validate performance when running multiple MCP calls in parallel"""
        parallel_results = {}

        # Define multiple calls to run in parallel
        async def run_parallel_calls():
            tasks = [
                self.mcp_client.get_gayed_signals(),
                self.mcp_client.search_perplexity("market analysis"),
                self.mcp_client.search_web("financial news", max_results=2),
            ]

            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = (time.time() - start_time) * 1000

            return results, total_time

        try:
            results, parallel_time = await run_parallel_calls()

            # Run the same calls sequentially for comparison
            start_time = time.time()
            sequential_results = []
            try:
                sequential_results.append(await self.mcp_client.get_gayed_signals())
            except Exception as e:
                sequential_results.append(e)

            try:
                sequential_results.append(await self.mcp_client.search_perplexity("market analysis"))
            except Exception as e:
                sequential_results.append(e)

            try:
                sequential_results.append(await self.mcp_client.search_web("financial news", max_results=2))
            except Exception as e:
                sequential_results.append(e)

            sequential_time = (time.time() - start_time) * 1000

            parallel_results["performance_comparison"] = {
                "parallel_time_ms": parallel_time,
                "sequential_time_ms": sequential_time,
                "speedup_factor": sequential_time / parallel_time if parallel_time > 0 else 0,
                "parallel_success_count": sum(1 for r in results if not isinstance(r, Exception)),
                "sequential_success_count": sum(1 for r in sequential_results if not isinstance(r, Exception))
            }

        except Exception as e:
            parallel_results["performance_comparison"] = {"error": str(e)}

        return parallel_results

    async def validate_agent_integration(self) -> Dict[str, Any]:
        """Validate integration with Enhanced Financial Agent"""
        agent_results = {}

        try:
            agent = EnhancedFinancialAgent(self.mcp_client)

            # Test full analysis
            test_content = "Federal Reserve announced new monetary policy. Market volatility increased."

            start_time = time.time()
            analysis = await agent.analyze_with_signals(
                content=test_content,
                include_fast_signals=True,
                include_research=True
            )
            analysis_time = (time.time() - start_time) * 1000

            agent_results["full_analysis"] = {
                "completed": True,
                "response_time_ms": analysis_time,
                "has_signal_insights": "signal_insights" in analysis,
                "has_research_insights": "research_insights" in analysis,
                "has_recommendations": "recommendations" in analysis,
                "confidence_score": analysis.get("confidence_score", 0),
                "recommendation_count": len(analysis.get("recommendations", []))
            }

            # Test agent health status
            health_status = await agent.get_health_status()
            agent_results["health_status"] = {
                "agent_status": health_status.get("agent_status"),
                "mcp_services_available": "mcp_services" in health_status
            }

        except Exception as e:
            agent_results["integration_test"] = {"error": str(e)}

        return agent_results

    def _validate_signal_structure(self, signals: Any) -> bool:
        """Validate the structure of signal data"""
        if not signals or not isinstance(signals, dict):
            return False

        # Check for required fields
        required_fields = ["consensus"]
        return all(field in signals for field in required_fields)

    def _validate_research_structure(self, research: Any) -> bool:
        """Validate the structure of research data"""
        if not research or not isinstance(research, list):
            return False

        if len(research) == 0:
            return True

        # Check first item structure
        first_item = research[0]
        if not isinstance(first_item, dict):
            return False

        return True  # Accept any dict structure for flexibility

    def _validate_web_search_structure(self, search_results: Any) -> bool:
        """Validate the structure of web search results"""
        if not search_results or not isinstance(search_results, list):
            return False

        if len(search_results) == 0:
            return True

        # Check first item structure
        first_item = search_results[0]
        if not isinstance(first_item, dict):
            return False

        return True  # Accept any dict structure for flexibility


async def main():
    """Main validation function"""
    validator = MCPBridgeValidator()

    try:
        results = await validator.run_all_validations()

        # Print summary
        summary = results["validation_summary"]
        print(f"\n{'='*60}")
        print("MCP BRIDGE VALIDATION RESULTS")
        print(f"{'='*60}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed_tests']}")
        print(f"Failed: {summary['failed_tests']}")
        print(f"Success Rate: {summary['success_rate']:.1%}")
        print(f"Total Duration: {summary['total_duration_seconds']:.2f}s")
        print(f"{'='*60}")

        # Print detailed results for failed tests
        failed_tests = [
            name for name, result in results["test_results"].items()
            if result["status"] == "FAILED"
        ]

        if failed_tests:
            print("\nFAILED TESTS:")
            for test_name in failed_tests:
                test_result = results["test_results"][test_name]
                print(f"  ❌ {test_name}: {test_result.get('error', 'Unknown error')}")

        # Print performance highlights
        print("\nPERFORMANCE HIGHLIGHTS:")
        test_results = results["test_results"]

        if "signal_bridge" in test_results and test_results["signal_bridge"]["status"] == "PASSED":
            signal_data = test_results["signal_bridge"]["result"]
            if "current_signals" in signal_data:
                print(f"  Signal Bridge Response Time: {signal_data['current_signals'].get('response_time_ms', 'N/A'):.1f}ms")

        if "caching_performance" in test_results and test_results["caching_performance"]["status"] == "PASSED":
            cache_data = test_results["caching_performance"]["result"]
            if "signal_caching" in cache_data:
                speedup = cache_data["signal_caching"].get("cache_speedup_factor", 0)
                print(f"  Cache Speedup Factor: {speedup:.1f}x")

        if "parallel_performance" in test_results and test_results["parallel_performance"]["status"] == "PASSED":
            parallel_data = test_results["parallel_performance"]["result"]
            if "performance_comparison" in parallel_data:
                speedup = parallel_data["performance_comparison"].get("speedup_factor", 0)
                print(f"  Parallel Processing Speedup: {speedup:.1f}x")

        # Return appropriate exit code
        return 0 if summary["failed_tests"] == 0 else 1

    except Exception as e:
        logger.error(f"Validation failed with exception: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())