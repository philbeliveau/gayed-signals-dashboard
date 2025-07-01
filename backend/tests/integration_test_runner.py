"""
Integration Test Runner - System Integration Testing Coordinator
Runs all integration tests and stores results in Memory for swarm coordination.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List
import traceback

# Import all test modules
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from test_redis_integration import RedisIntegrationTester
from test_fred_integration import FREDIntegrationTester
from test_api_endpoints import APIEndpointTester
from test_performance_validation import PerformanceValidator
from health_monitoring import HealthMonitor

logger = logging.getLogger(__name__)

class IntegrationTestCoordinator:
    """Coordinates all integration tests and manages results."""
    
    def __init__(self):
        self.test_results = {
            "execution_info": {
                "start_time": None,
                "end_time": None,
                "duration_seconds": None,
                "executed_by": "System Integration Tester",
                "swarm_coordination_key": "swarm-auto-centralized-1751334969239/integration-tester/validation-results"
            },
            "test_suites": {},
            "summary": {},
            "health_status": {},
            "recommendations": [],
            "memory_key": "swarm-auto-centralized-1751334969239/integration-tester/validation-results"
        }
    
    async def run_redis_tests(self) -> Dict[str, Any]:
        """Run Redis integration tests."""
        logger.info("Starting Redis integration tests...")
        
        try:
            tester = RedisIntegrationTester()
            results = await tester.run_all_tests()
            
            self.test_results["test_suites"]["redis"] = {
                "status": "completed",
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Redis integration tests completed successfully")
            return results
            
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.test_results["test_suites"]["redis"] = error_result
            logger.error(f"Redis integration tests failed: {e}")
            return error_result
    
    async def run_fred_tests(self) -> Dict[str, Any]:
        """Run FRED service integration tests."""
        logger.info("Starting FRED service integration tests...")
        
        try:
            tester = FREDIntegrationTester()
            results = await tester.run_all_tests()
            
            self.test_results["test_suites"]["fred"] = {
                "status": "completed",
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("FRED service integration tests completed successfully")
            return results
            
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.test_results["test_suites"]["fred"] = error_result
            logger.error(f"FRED service integration tests failed: {e}")
            return error_result
    
    def run_api_tests(self) -> Dict[str, Any]:
        """Run API endpoint tests."""
        logger.info("Starting API endpoint tests...")
        
        try:
            tester = APIEndpointTester()
            results = tester.run_all_tests()
            
            self.test_results["test_suites"]["api"] = {
                "status": "completed",
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("API endpoint tests completed successfully")
            return results
            
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.test_results["test_suites"]["api"] = error_result
            logger.error(f"API endpoint tests failed: {e}")
            return error_result
    
    async def run_performance_tests(self) -> Dict[str, Any]:
        """Run performance validation tests."""
        logger.info("Starting performance validation tests...")
        
        try:
            validator = PerformanceValidator()
            results = await validator.run_all_tests()
            
            self.test_results["test_suites"]["performance"] = {
                "status": "completed",
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Performance validation tests completed successfully")
            return results
            
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.test_results["test_suites"]["performance"] = error_result
            logger.error(f"Performance validation tests failed: {e}")
            return error_result
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run comprehensive health checks."""
        logger.info("Starting health checks...")
        
        try:
            monitor = HealthMonitor()
            health_report = await monitor.perform_comprehensive_health_check()
            
            self.test_results["health_status"] = {
                "status": "completed",
                "report": health_report.to_dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Health checks completed successfully")
            return health_report.to_dict()
            
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.test_results["health_status"] = error_result
            logger.error(f"Health checks failed: {e}")
            return error_result
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate comprehensive test summary."""
        summary = {
            "total_test_suites": len(self.test_results["test_suites"]),
            "completed_suites": 0,
            "failed_suites": 0,
            "overall_status": "unknown",
            "critical_issues": [],
            "warnings": [],
            "successes": [],
            "performance_metrics": {},
            "health_overview": {}
        }
        
        # Analyze test suite results
        for suite_name, suite_data in self.test_results["test_suites"].items():
            if suite_data["status"] == "completed":
                summary["completed_suites"] += 1
                
                # Extract specific metrics from each suite
                if suite_name == "redis" and "results" in suite_data:
                    redis_summary = suite_data["results"].get("summary", {})
                    if redis_summary.get("failed_tests", 0) == 0:
                        summary["successes"].append(f"Redis: All {redis_summary.get('total_tests', 0)} tests passed")
                    else:
                        summary["warnings"].append(f"Redis: {redis_summary.get('failed_tests', 0)} tests failed")
                
                elif suite_name == "fred" and "results" in suite_data:
                    fred_summary = suite_data["results"].get("summary", {})
                    if fred_summary.get("failed_tests", 0) == 0:
                        summary["successes"].append(f"FRED: All {fred_summary.get('total_tests', 0)} tests passed")
                        if fred_summary.get("fred_service_enabled", False):
                            summary["successes"].append("FRED: API service operational")
                        else:
                            summary["warnings"].append("FRED: Service disabled (no API key)")
                    else:
                        summary["warnings"].append(f"FRED: {fred_summary.get('failed_tests', 0)} tests failed")
                
                elif suite_name == "api" and "results" in suite_data:
                    api_summary = suite_data["results"].get("summary", {})
                    if api_summary.get("failed_tests", 0) == 0:
                        summary["successes"].append(f"API: All {api_summary.get('total_tests', 0)} endpoint tests passed")
                    else:
                        summary["critical_issues"].append(f"API: {api_summary.get('failed_tests', 0)} endpoint tests failed")
                
                elif suite_name == "performance" and "results" in suite_data:
                    perf_summary = suite_data["results"].get("summary", {})
                    if perf_summary.get("failed_tests", 0) == 0:
                        summary["successes"].append(f"Performance: All {perf_summary.get('total_tests', 0)} validation tests passed")
                        
                        # Extract performance metrics
                        perf_results = suite_data["results"]
                        summary["performance_metrics"] = {
                            "redis_ops_per_second": self._extract_redis_performance(perf_results),
                            "api_avg_response_time": self._extract_api_performance(perf_results),
                            "system_resource_usage": self._extract_system_performance(perf_results)
                        }
                    else:
                        summary["critical_issues"].append(f"Performance: {perf_summary.get('failed_tests', 0)} tests failed")
            
            else:
                summary["failed_suites"] += 1
                summary["critical_issues"].append(f"{suite_name.upper()}: Test suite failed to complete")
        
        # Analyze health status
        if "health_status" in self.test_results and self.test_results["health_status"].get("status") == "completed":
            health_report = self.test_results["health_status"]["report"]
            overall_health = health_report.get("overall_status", "unknown")
            
            summary["health_overview"] = {
                "overall_status": overall_health,
                "healthy_components": health_report.get("summary", {}).get("healthy_count", 0),
                "warning_components": health_report.get("summary", {}).get("warning_count", 0),
                "critical_components": health_report.get("summary", {}).get("critical_count", 0)
            }
            
            if overall_health == "critical":
                summary["critical_issues"].append("System health: Critical issues detected")
            elif overall_health == "warning":
                summary["warnings"].append("System health: Warning conditions detected")
            else:
                summary["successes"].append("System health: All components healthy")
        
        # Determine overall status
        if summary["critical_issues"] or summary["failed_suites"] > 0:
            summary["overall_status"] = "critical"
        elif summary["warnings"]:
            summary["overall_status"] = "warning"
        else:
            summary["overall_status"] = "healthy"
        
        self.test_results["summary"] = summary
        return summary
    
    def _extract_redis_performance(self, perf_results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract Redis performance metrics."""
        redis_perf = perf_results.get("redis_performance", {})
        if "redis_performance" in redis_perf:
            throughput = redis_perf["redis_performance"].get("throughput_benchmarks", {})
            if "100_operations" in throughput:
                return {
                    "read_ops_per_second": throughput["100_operations"].get("read_ops_per_second", 0),
                    "write_ops_per_second": throughput["100_operations"].get("write_ops_per_second", 0)
                }
        return {}
    
    def _extract_api_performance(self, perf_results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract API performance metrics."""
        api_perf = perf_results.get("api_performance", {})
        if "api_performance" in api_perf:
            endpoint_perf = api_perf["api_performance"].get("endpoint_performance", {})
            if endpoint_perf:
                avg_times = [ep.get("avg_response_time_ms", 0) for ep in endpoint_perf.values()]
                return {"avg_response_time_ms": sum(avg_times) / len(avg_times) if avg_times else 0}
        return {}
    
    def _extract_system_performance(self, perf_results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract system performance metrics."""
        sys_perf = perf_results.get("system_performance", {})
        if "system_performance" in sys_perf:
            memory_usage = sys_perf["system_performance"].get("memory_usage", {})
            cpu_usage = sys_perf["system_performance"].get("cpu_usage", {})
            return {
                "memory_increase_mb": memory_usage.get("process_memory_increase_mb", 0),
                "cpu_percent": cpu_usage.get("peak_cpu_percent", 0)
            }
        return {}
    
    def generate_recommendations(self) -> List[str]:
        """Generate actionable recommendations based on test results."""
        recommendations = []
        
        # Check Redis performance
        redis_results = self.test_results["test_suites"].get("redis", {})
        if redis_results.get("status") == "completed":
            redis_summary = redis_results.get("results", {}).get("summary", {})
            if redis_summary.get("failed_tests", 0) > 0:
                recommendations.append("Investigate Redis connectivity issues - check configuration and network connectivity")
        
        # Check FRED service
        fred_results = self.test_results["test_suites"].get("fred", {})
        if fred_results.get("status") == "completed":
            fred_summary = fred_results.get("results", {}).get("summary", {})
            if not fred_summary.get("fred_service_enabled", False):
                recommendations.append("Configure FRED API key to enable real economic data fetching")
            elif fred_summary.get("failed_tests", 0) > 0:
                recommendations.append("Review FRED service configuration and API rate limiting")
        
        # Check API endpoints
        api_results = self.test_results["test_suites"].get("api", {})
        if api_results.get("status") == "completed":
            api_summary = api_results.get("results", {}).get("summary", {})
            if api_summary.get("failed_tests", 0) > 0:
                recommendations.append("Investigate API endpoint failures - check service dependencies and error handling")
        
        # Check performance
        perf_results = self.test_results["test_suites"].get("performance", {})
        if perf_results.get("status") == "completed":
            perf_data = perf_results.get("results", {})
            # Add performance-specific recommendations
            if "system_performance" in perf_data:
                sys_perf = perf_data["system_performance"]
                if "system_performance" in sys_perf:
                    memory_usage = sys_perf["system_performance"].get("memory_usage", {})
                    if memory_usage.get("process_memory_increase_mb", 0) > 100:
                        recommendations.append("Monitor memory usage - significant memory increase detected during testing")
        
        # Check health status
        health_status = self.test_results.get("health_status", {})
        if health_status.get("status") == "completed":
            health_report = health_status.get("report", {})
            if health_report.get("overall_status") == "critical":
                recommendations.append("Address critical system health issues immediately")
            elif health_report.get("overall_status") == "warning":
                recommendations.append("Monitor system health warnings and consider preventive measures")
        
        # General recommendations
        if not recommendations:
            recommendations.append("All systems operational - continue regular monitoring")
        
        recommendations.append("Schedule regular integration testing to catch issues early")
        recommendations.append("Monitor Redis cache hit ratios and optimize caching strategies")
        recommendations.append("Set up automated health checks for production environment")
        
        self.test_results["recommendations"] = recommendations
        return recommendations
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests and generate comprehensive report."""
        start_time = time.time()
        self.test_results["execution_info"]["start_time"] = datetime.utcnow().isoformat()
        
        logger.info("Starting comprehensive integration test suite...")
        
        try:
            # Run all test suites
            await self.run_redis_tests()
            await self.run_fred_tests()
            self.run_api_tests()
            await self.run_performance_tests()
            await self.run_health_checks()
            
            # Generate summary and recommendations
            self.generate_summary()
            self.generate_recommendations()
            
            # Update execution info
            end_time = time.time()
            self.test_results["execution_info"]["end_time"] = datetime.utcnow().isoformat()
            self.test_results["execution_info"]["duration_seconds"] = round(end_time - start_time, 2)
            
            logger.info(f"Integration test suite completed in {self.test_results['execution_info']['duration_seconds']} seconds")
            
            return self.test_results
            
        except Exception as e:
            logger.error(f"Integration test suite failed: {e}")
            self.test_results["execution_info"]["error"] = str(e)
            self.test_results["execution_info"]["end_time"] = datetime.utcnow().isoformat()
            self.test_results["execution_info"]["duration_seconds"] = round(time.time() - start_time, 2)
            return self.test_results
    
    def store_results_in_memory(self, memory_storage_function=None) -> bool:
        """Store test results in Memory for swarm coordination."""
        try:
            # In a real implementation, this would use the actual Memory storage system
            # For now, we'll write to a JSON file that can be picked up by other agents
            
            memory_file_path = "/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/memory/data/integration-test-results.json"
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(memory_file_path), exist_ok=True)
            
            # Write results to memory file
            with open(memory_file_path, 'w') as f:
                json.dump(self.test_results, f, indent=2, default=str)
            
            logger.info(f"Test results stored in memory: {memory_file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store results in memory: {e}")
            return False


# Standalone functions
async def run_complete_integration_test_suite():
    """Run the complete integration test suite."""
    coordinator = IntegrationTestCoordinator()
    results = await coordinator.run_all_tests()
    coordinator.store_results_in_memory()
    return results

if __name__ == "__main__":
    # Command line execution
    import argparse
    
    parser = argparse.ArgumentParser(description="Integration Test Coordinator")
    parser.add_argument("--suite", choices=["all", "redis", "fred", "api", "performance", "health"], 
                        default="all", help="Test suite to run")
    parser.add_argument("--store-memory", action="store_true", 
                        help="Store results in Memory for swarm coordination")
    
    args = parser.parse_args()
    
    async def main():
        coordinator = IntegrationTestCoordinator()
        
        if args.suite == "all":
            print("Running complete integration test suite...")
            results = await coordinator.run_all_tests()
        elif args.suite == "redis":
            print("Running Redis integration tests...")
            results = await coordinator.run_redis_tests()
        elif args.suite == "fred":
            print("Running FRED service tests...")
            results = await coordinator.run_fred_tests()
        elif args.suite == "api":
            print("Running API endpoint tests...")
            results = coordinator.run_api_tests()
        elif args.suite == "performance":
            print("Running performance validation tests...")
            results = await coordinator.run_performance_tests()
        elif args.suite == "health":
            print("Running health checks...")
            results = await coordinator.run_health_checks()
        
        if args.store_memory:
            coordinator.store_results_in_memory()
        
        # Display results
        print("\n" + "="*80)
        print("INTEGRATION TEST RESULTS")
        print("="*80)
        
        if args.suite == "all":
            summary = coordinator.test_results.get("summary", {})
            print(f"Overall Status: {summary.get('overall_status', 'unknown').upper()}")
            print(f"Test Suites: {summary.get('completed_suites', 0)}/{summary.get('total_test_suites', 0)} completed")
            print(f"Execution Time: {coordinator.test_results['execution_info']['duration_seconds']}s")
            
            print(f"\nSuccesses ({len(summary.get('successes', []))}):")
            for success in summary.get("successes", []):
                print(f"  ✅ {success}")
            
            print(f"\nWarnings ({len(summary.get('warnings', []))}):")
            for warning in summary.get("warnings", []):
                print(f"  ⚠️ {warning}")
            
            print(f"\nCritical Issues ({len(summary.get('critical_issues', []))}):")
            for critical in summary.get("critical_issues", []):
                print(f"  ❌ {critical}")
            
            print(f"\nRecommendations:")
            for rec in coordinator.test_results.get("recommendations", []):
                print(f"  💡 {rec}")
        
        else:
            # Display specific suite results
            if isinstance(results, dict):
                if results.get("status") == "completed":
                    print("✅ Test suite completed successfully")
                else:
                    print(f"❌ Test suite failed: {results.get('error', 'Unknown error')}")
            
        return results
    
    asyncio.run(main())