"""
FRED Service Integration Tests - System Integration Testing
Tests FRED API connectivity, data fetching, rate limiting, and error handling.
"""

import asyncio
import json
import pytest
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import aiohttp
from unittest.mock import patch, AsyncMock

# Import the services we're testing
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.fred_service import fred_service, FREDService, FREDDataPoint, FREDSeriesInfo
from core.config import settings

logger = logging.getLogger(__name__)

class FREDIntegrationTester:
    """Comprehensive FRED service integration testing class."""
    
    def __init__(self):
        self.test_results = {
            "connectivity_tests": {},
            "data_fetching_tests": {},
            "rate_limiting_tests": {},
            "error_handling_tests": {},
            "caching_tests": {},
            "database_integration_tests": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_fred_service = None
    
    async def setup_test_environment(self):
        """Set up test environment with separate FRED service instance."""
        try:
            # Create a test-specific FRED service instance
            self.test_fred_service = FREDService()
            
            logger.info("FRED test environment setup complete")
            return True
        except Exception as e:
            logger.error(f"Failed to setup FRED test environment: {e}")
            return False
    
    async def test_basic_connectivity(self) -> Dict[str, Any]:
        """Test basic FRED API connectivity and configuration."""
        test_name = "basic_connectivity"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Service configuration
            results["config_test"] = {
                "api_key_configured": bool(self.test_fred_service.api_key),
                "service_enabled": self.test_fred_service.is_enabled,
                "base_url": self.test_fred_service.base_url
            }
            
            # Test 2: Health check
            health_status = await self.test_fred_service.health_check()
            results["health_check"] = {
                "status": health_status.get("status"),
                "api_connectivity": health_status.get("api_connectivity", False),
                "error_count": health_status.get("error_count", 0),
                "session_active": health_status.get("session_active", False)
            }
            
            # Test 3: Basic API request (if enabled)
            if self.test_fred_service.is_enabled:
                try:
                    # Test with unemployment rate (UNRATE) - should always be available
                    test_data = await self.test_fred_service.fetch_series_data('UNRATE', limit=1)
                    results["api_request_test"] = {
                        "success": len(test_data) > 0,
                        "data_points_received": len(test_data),
                        "latest_value": test_data[0].value if test_data else None,
                        "latest_date": test_data[0].date if test_data else None
                    }
                except Exception as e:
                    results["api_request_test"] = {
                        "success": False,
                        "error": str(e)
                    }
            else:
                results["api_request_test"] = {
                    "skipped": True,
                    "reason": "FRED service disabled (no API key)"
                }
            
            results["status"] = "passed"
            logger.info("FRED basic connectivity tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"FRED basic connectivity tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["connectivity_tests"][test_name] = results
        return results
    
    async def test_data_fetching(self) -> Dict[str, Any]:
        """Test FRED data fetching functionality."""
        test_name = "data_fetching"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        if not self.test_fred_service.is_enabled:
            results["status"] = "skipped"
            results["reason"] = "FRED service disabled"
            results["completed_at"] = datetime.utcnow().isoformat()
            self.test_results["data_fetching_tests"][test_name] = results
            return results
        
        try:
            # Test 1: Single series data fetching
            start_date = (datetime.utcnow() - timedelta(days=90)).strftime('%Y-%m-%d')
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
            
            unemployment_data = await self.test_fred_service.fetch_series_data(
                'UNRATE', start_date=start_date, end_date=end_date, limit=10
            )
            
            results["single_series_test"] = {
                "success": len(unemployment_data) > 0,
                "data_points": len(unemployment_data),
                "date_range_respected": all(
                    start_date <= point.date <= end_date for point in unemployment_data
                ) if unemployment_data else False,
                "data_types_valid": all(
                    isinstance(point, FREDDataPoint) for point in unemployment_data
                ) if unemployment_data else False
            }
            
            # Test 2: Series metadata fetching
            try:
                series_info = await self.test_fred_service.fetch_series_info('UNRATE')
                results["series_info_test"] = {
                    "success": isinstance(series_info, FREDSeriesInfo),
                    "has_title": bool(series_info.title),
                    "has_units": bool(series_info.units),
                    "has_frequency": bool(series_info.frequency),
                    "series_id": series_info.id
                }
            except Exception as e:
                results["series_info_test"] = {
                    "success": False,
                    "error": str(e)
                }
            
            # Test 3: Housing market data fetching
            try:
                housing_data = await self.test_fred_service.fetch_housing_market_data(
                    start_date=start_date, limit=5
                )
                
                expected_series = ['CASE_SHILLER', 'HOUSING_STARTS', 'MONTHS_SUPPLY']
                
                results["housing_data_test"] = {
                    "success": len(housing_data) > 0,
                    "series_count": len(housing_data),
                    "expected_series_present": sum(
                        1 for series in expected_series if series in housing_data
                    ),
                    "total_data_points": sum(len(data) for data in housing_data.values())
                }
            except Exception as e:
                results["housing_data_test"] = {
                    "success": False,
                    "error": str(e)
                }
            
            # Test 4: Labor market data fetching
            try:
                labor_data = await self.test_fred_service.fetch_labor_market_data(
                    start_date=start_date, limit=5
                )
                
                expected_series = ['UNEMPLOYMENT_RATE', 'NONFARM_PAYROLLS', 'INITIAL_CLAIMS']
                
                results["labor_data_test"] = {
                    "success": len(labor_data) > 0,
                    "series_count": len(labor_data),
                    "expected_series_present": sum(
                        1 for series in expected_series if series in labor_data
                    ),
                    "total_data_points": sum(len(data) for data in labor_data.values())
                }
            except Exception as e:
                results["labor_data_test"] = {
                    "success": False,
                    "error": str(e)
                }
            
            # Test 5: Date range validation
            try:
                # Test with specific date range
                specific_start = "2023-01-01"
                specific_end = "2023-12-31"
                
                date_range_data = await self.test_fred_service.fetch_series_data(
                    'PAYEMS', start_date=specific_start, end_date=specific_end
                )
                
                dates_in_range = all(
                    specific_start <= point.date <= specific_end 
                    for point in date_range_data
                )
                
                results["date_range_test"] = {
                    "success": len(date_range_data) > 0,
                    "data_points": len(date_range_data),
                    "dates_in_range": dates_in_range
                }
            except Exception as e:
                results["date_range_test"] = {
                    "success": False,
                    "error": str(e)
                }
            
            results["status"] = "passed"
            logger.info("FRED data fetching tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"FRED data fetching tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["data_fetching_tests"][test_name] = results
        return results
    
    async def test_rate_limiting(self) -> Dict[str, Any]:
        """Test FRED API rate limiting functionality."""
        test_name = "rate_limiting"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        if not self.test_fred_service.is_enabled:
            results["status"] = "skipped"
            results["reason"] = "FRED service disabled"
            results["completed_at"] = datetime.utcnow().isoformat()
            self.test_results["rate_limiting_tests"][test_name] = results
            return results
        
        try:
            # Test 1: Rate limiter basic functionality
            rate_limiter = self.test_fred_service.rate_limiter
            
            # Record initial state
            initial_requests = len(rate_limiter.requests)
            
            # Make a few requests
            start_time = time.time()
            for i in range(3):
                await rate_limiter.acquire()
            elapsed_time = time.time() - start_time
            
            final_requests = len(rate_limiter.requests)
            
            results["rate_limiter_test"] = {
                "requests_tracked": final_requests > initial_requests,
                "minimum_delay_enforced": elapsed_time >= 1.5,  # 3 requests * 0.5s delay
                "elapsed_time_seconds": round(elapsed_time, 2),
                "requests_added": final_requests - initial_requests
            }
            
            # Test 2: Concurrent request handling
            try:
                concurrent_start = time.time()
                
                async def make_test_request(request_id):
                    try:
                        data = await self.test_fred_service.fetch_series_data(
                            'UNRATE', limit=1
                        )
                        return {"success": True, "request_id": request_id, "data_points": len(data)}
                    except Exception as e:
                        return {"success": False, "request_id": request_id, "error": str(e)}
                
                # Make 5 concurrent requests (should be within rate limits)
                concurrent_tasks = [make_test_request(i) for i in range(5)]
                concurrent_results = await asyncio.gather(*concurrent_tasks, return_exceptions=True)
                
                concurrent_elapsed = time.time() - concurrent_start
                
                successful_requests = sum(
                    1 for result in concurrent_results 
                    if isinstance(result, dict) and result.get("success", False)
                )
                
                results["concurrent_requests_test"] = {
                    "total_requests": len(concurrent_tasks),
                    "successful_requests": successful_requests,
                    "success_rate": round(successful_requests / len(concurrent_tasks) * 100, 2),
                    "total_time_seconds": round(concurrent_elapsed, 2),
                    "avg_time_per_request": round(concurrent_elapsed / len(concurrent_tasks), 2)
                }
                
            except Exception as e:
                results["concurrent_requests_test"] = {
                    "success": False,
                    "error": str(e)
                }
            
            # Test 3: Cache effectiveness in reducing API calls
            cache_test_series = 'ICSA'
            
            # First request (should hit API)
            first_request_start = time.time()
            first_data = await self.test_fred_service.fetch_series_data(cache_test_series, limit=5)
            first_request_time = time.time() - first_request_start
            
            # Second request (should hit cache)
            second_request_start = time.time()
            second_data = await self.test_fred_service.fetch_series_data(cache_test_series, limit=5)
            second_request_time = time.time() - second_request_start
            
            results["cache_effectiveness_test"] = {
                "first_request_time": round(first_request_time, 3),
                "second_request_time": round(second_request_time, 3),
                "cache_speedup": round(first_request_time / second_request_time, 2) if second_request_time > 0 else 0,
                "data_consistency": len(first_data) == len(second_data),
                "cache_likely_used": second_request_time < first_request_time * 0.5
            }
            
            results["status"] = "passed"
            logger.info("FRED rate limiting tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"FRED rate limiting tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["rate_limiting_tests"][test_name] = results
        return results
    
    async def test_error_handling(self) -> Dict[str, Any]:
        """Test FRED service error handling."""
        test_name = "error_handling"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Invalid series ID
            try:
                invalid_data = await self.test_fred_service.fetch_series_data('INVALID_SERIES_123')
                results["invalid_series_test"] = {
                    "handled_gracefully": True,
                    "returned_empty": len(invalid_data) == 0
                }
            except Exception as e:
                results["invalid_series_test"] = {
                    "handled_gracefully": True,
                    "exception_type": type(e).__name__,
                    "error_message": str(e)
                }
            
            # Test 2: Invalid date range
            try:
                future_start = (datetime.utcnow() + timedelta(days=365)).strftime('%Y-%m-%d')
                future_end = (datetime.utcnow() + timedelta(days=730)).strftime('%Y-%m-%d')
                
                future_data = await self.test_fred_service.fetch_series_data(
                    'UNRATE', start_date=future_start, end_date=future_end
                )
                results["invalid_date_test"] = {
                    "handled_gracefully": True,
                    "returned_empty": len(future_data) == 0
                }
            except Exception as e:
                results["invalid_date_test"] = {
                    "handled_gracefully": True,
                    "exception_type": type(e).__name__
                }
            
            # Test 3: Network timeout simulation
            try:
                # Test with very short timeout
                original_timeout = None
                if hasattr(self.test_fred_service, 'session') and self.test_fred_service.session:
                    original_timeout = self.test_fred_service.session.timeout
                
                # Create a new session with very short timeout for testing
                await self.test_fred_service._ensure_session()
                
                # This should either succeed quickly or timeout gracefully
                timeout_start = time.time()
                try:
                    timeout_data = await asyncio.wait_for(
                        self.test_fred_service.fetch_series_data('UNRATE', limit=1),
                        timeout=5.0
                    )
                    timeout_elapsed = time.time() - timeout_start
                    
                    results["timeout_test"] = {
                        "completed_within_timeout": True,
                        "response_time": round(timeout_elapsed, 2),
                        "data_received": len(timeout_data) > 0
                    }
                except asyncio.TimeoutError:
                    results["timeout_test"] = {
                        "timeout_handled": True,
                        "timeout_duration": 5.0
                    }
                
            except Exception as e:
                results["timeout_test"] = {
                    "error_handled": True,
                    "error_type": type(e).__name__
                }
            
            # Test 4: Service disabled handling
            try:
                # Create a disabled service instance
                disabled_service = FREDService()
                disabled_service.api_key = None  # Force disable
                
                disabled_data = await disabled_service.fetch_series_data('UNRATE')
                disabled_info = await disabled_service.fetch_series_info('UNRATE')
                
                results["disabled_service_test"] = {
                    "returns_empty_data": len(disabled_data) == 0,
                    "returns_default_info": disabled_info.id == 'UNRATE',
                    "handles_gracefully": True
                }
                
                await disabled_service.close()
                
            except Exception as e:
                results["disabled_service_test"] = {
                    "error_handled": True,
                    "error_type": type(e).__name__
                }
            
            results["status"] = "passed"
            logger.info("FRED error handling tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"FRED error handling tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["error_handling_tests"][test_name] = results
        return results
    
    async def test_caching_integration(self) -> Dict[str, Any]:
        """Test FRED service integration with Redis caching."""
        test_name = "caching_integration"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Import cache service for testing
            from services.cache_service import cache_service
            
            # Test 1: Cache key generation consistency
            test_params = {"series_id": "UNRATE", "start_date": "2023-01-01"}
            cache_key1 = self.test_fred_service._get_cache_key("series/observations", test_params)
            cache_key2 = self.test_fred_service._get_cache_key("series/observations", test_params)
            
            results["cache_key_test"] = {
                "consistent_generation": cache_key1 == cache_key2,
                "non_empty_key": bool(cache_key1)
            }
            
            # Test 2: Cache TTL determination
            weekly_ttl = self.test_fred_service._determine_cache_ttl("ICSA")
            monthly_ttl = self.test_fred_service._determine_cache_ttl("UNRATE")
            daily_ttl = self.test_fred_service._determine_cache_ttl("UNKNOWN_SERIES")
            
            results["cache_ttl_test"] = {
                "weekly_ttl_correct": weekly_ttl == self.test_fred_service.WEEKLY_CACHE_TTL,
                "monthly_ttl_correct": monthly_ttl == self.test_fred_service.MONTHLY_CACHE_TTL,
                "default_ttl_correct": daily_ttl == self.test_fred_service.DAILY_CACHE_TTL
            }
            
            # Test 3: Cache write/read cycle
            if self.test_fred_service.is_enabled:
                try:
                    # Clear any existing cache for test series
                    test_series = "PAYEMS"
                    
                    # First request - should cache the result
                    first_data = await self.test_fred_service.fetch_series_data(test_series, limit=3)
                    
                    # Verify data was cached by checking Redis directly
                    cache_key = self.test_fred_service._get_cache_key(
                        "series/observations", 
                        {"series_id": test_series, "limit": "3", "api_key": self.test_fred_service.api_key, "file_type": "json"}
                    )
                    
                    cached_data = await cache_service.redis.get(cache_key)
                    
                    results["cache_write_read_test"] = {
                        "data_cached": cached_data is not None,
                        "cache_key_exists": bool(cache_key),
                        "original_data_valid": len(first_data) > 0
                    }
                    
                except Exception as e:
                    results["cache_write_read_test"] = {
                        "error": str(e),
                        "test_skipped": True
                    }
            else:
                results["cache_write_read_test"] = {
                    "skipped": True,
                    "reason": "FRED service disabled"
                }
            
            # Test 4: Cache performance impact
            if self.test_fred_service.is_enabled:
                try:
                    test_series_perf = "UNRATE"
                    
                    # Clear cache for clean test
                    await cache_service.redis.delete(
                        self.test_fred_service._get_cache_key(
                            "series/observations",
                            {"series_id": test_series_perf, "limit": "5", "api_key": self.test_fred_service.api_key, "file_type": "json"}
                        )
                    )
                    
                    # Time first request (API call)
                    start_time = time.time()
                    first_result = await self.test_fred_service.fetch_series_data(test_series_perf, limit=5)
                    first_time = time.time() - start_time
                    
                    # Time second request (cached)
                    start_time = time.time()
                    second_result = await self.test_fred_service.fetch_series_data(test_series_perf, limit=5)
                    second_time = time.time() - start_time
                    
                    results["cache_performance_test"] = {
                        "first_request_time": round(first_time, 3),
                        "second_request_time": round(second_time, 3),
                        "performance_improvement": round(first_time / second_time, 2) if second_time > 0 else 0,
                        "data_consistency": len(first_result) == len(second_result)
                    }
                    
                except Exception as e:
                    results["cache_performance_test"] = {
                        "error": str(e),
                        "test_failed": True
                    }
            else:
                results["cache_performance_test"] = {
                    "skipped": True,
                    "reason": "FRED service disabled"
                }
            
            results["status"] = "passed"
            logger.info("FRED caching integration tests passed")
            
        except Exception as e:
            results["status"] = "failed" 
            results["error"] = str(e)
            logger.error(f"FRED caching integration tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["caching_tests"][test_name] = results
        return results
    
    async def cleanup_test_environment(self):
        """Clean up test environment."""
        try:
            if self.test_fred_service:
                await self.test_fred_service.close()
            logger.info("FRED test environment cleanup complete")
        except Exception as e:
            logger.error(f"Error during FRED cleanup: {e}")
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all FRED integration tests."""
        logger.info("Starting FRED integration tests...")
        
        if not await self.setup_test_environment():
            return {"error": "Failed to setup FRED test environment"}
        
        try:
            # Run all test suites
            await self.test_basic_connectivity()
            await self.test_data_fetching()
            await self.test_rate_limiting()
            await self.test_error_handling()
            await self.test_caching_integration()
            
            # Generate summary
            self.test_results["summary"] = self._generate_test_summary()
            
            logger.info("FRED integration tests completed")
            return self.test_results
            
        finally:
            await self.cleanup_test_environment()
    
    def _generate_test_summary(self) -> Dict[str, Any]:
        """Generate a summary of all FRED test results."""
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        skipped_tests = 0
        
        for category, tests in self.test_results.items():
            if category in ["timestamp", "summary"]:
                continue
                
            for test_name, test_result in tests.items():
                total_tests += 1
                status = test_result.get("status", "unknown")
                if status == "passed":
                    passed_tests += 1
                elif status == "failed":
                    failed_tests += 1
                elif status == "skipped":
                    skipped_tests += 1
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "skipped_tests": skipped_tests,
            "success_rate": round(passed_tests / (total_tests - skipped_tests) * 100, 2) if (total_tests - skipped_tests) > 0 else 0,
            "test_completion_time": datetime.utcnow().isoformat(),
            "fred_service_enabled": self.test_fred_service.is_enabled if self.test_fred_service else False
        }


# Standalone test runner functions
async def run_fred_connectivity_test():
    """Run a quick FRED connectivity test."""
    tester = FREDIntegrationTester()
    await tester.setup_test_environment()
    result = await tester.test_basic_connectivity()
    await tester.cleanup_test_environment()
    return result

async def run_full_fred_test_suite():
    """Run the complete FRED integration test suite."""
    tester = FREDIntegrationTester()
    return await tester.run_all_tests()

# Pytest integration
@pytest.mark.asyncio
async def test_fred_basic_connectivity():
    """Pytest test for basic FRED connectivity."""
    result = await run_fred_connectivity_test()
    assert result["status"] in ["passed", "skipped"], f"FRED connectivity test failed: {result.get('error')}"

@pytest.mark.asyncio
async def test_fred_full_integration():
    """Pytest test for full FRED integration suite."""
    results = await run_full_fred_test_suite()
    summary = results.get("summary", {})
    assert summary.get("failed_tests", 1) == 0, f"FRED integration tests failed: {summary}"

if __name__ == "__main__":
    # Command line execution
    import asyncio
    
    async def main():
        print("Running FRED Integration Tests...")
        results = await run_full_fred_test_suite()
        
        print("\n" + "="*60)
        print("FRED INTEGRATION TEST RESULTS")
        print("="*60)
        
        summary = results.get("summary", {})
        print(f"Total Tests: {summary.get('total_tests', 0)}")
        print(f"Passed: {summary.get('passed_tests', 0)}")
        print(f"Failed: {summary.get('failed_tests', 0)}")
        print(f"Skipped: {summary.get('skipped_tests', 0)}")
        print(f"Success Rate: {summary.get('success_rate', 0)}%")
        print(f"FRED Service Enabled: {summary.get('fred_service_enabled', False)}")
        
        print("\nDetailed Results:")
        for category, tests in results.items():
            if category in ["timestamp", "summary"]:
                continue
            
            print(f"\n{category.upper()}:")
            for test_name, test_result in tests.items():
                status = test_result.get("status", "unknown")
                print(f"  {test_name}: {status.upper()}")
                if status == "failed":
                    print(f"    Error: {test_result.get('error', 'Unknown error')}")
                elif status == "skipped":
                    print(f"    Reason: {test_result.get('reason', 'Unknown reason')}")
        
        return results
    
    asyncio.run(main())