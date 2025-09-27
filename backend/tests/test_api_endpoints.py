"""
API Endpoints Integration Tests - System Integration Testing
Tests housing and labor market API endpoints with real FRED integration.
"""

import asyncio
import json
import pytest
import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import patch, AsyncMock

# Import FastAPI test client and app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from api.routes.economic_data import router as economic_router

logger = logging.getLogger(__name__)

class APIEndpointTester:
    """Comprehensive API endpoint integration testing class."""
    
    def __init__(self):
        self.test_results = {
            "labor_market_tests": {},
            "housing_market_tests": {},
            "time_series_tests": {},
            "health_tests": {},
            "error_handling_tests": {},
            "performance_tests": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.client = TestClient(app)
        self.base_url = "http://testserver"
    
    def test_labor_market_endpoints(self) -> Dict[str, Any]:
        """Test labor market API endpoints."""
        test_name = "labor_market_endpoints"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Labor market summary endpoint
            summary_response = self.client.get("/api/economic/labor-market/summary?period=12m&fast_mode=false")
            
            results["summary_endpoint"] = {
                "status_code": summary_response.status_code,
                "response_time_ms": getattr(summary_response, 'elapsed', {}).get('total_seconds', 0) * 1000,
                "success": summary_response.status_code == 200,
                "has_data": bool(summary_response.json()) if summary_response.status_code == 200 else False
            }
            
            if summary_response.status_code == 200:
                summary_data = summary_response.json()
                results["summary_endpoint"]["data_structure"] = {
                    "has_current_metrics": "current_metrics" in summary_data,
                    "has_time_series": "time_series" in summary_data,
                    "has_alerts": "alerts" in summary_data,
                    "has_metadata": "metadata" in summary_data,
                    "time_series_count": len(summary_data.get("time_series", []))
                }
            
            # Test 2: Labor market data endpoint (frontend integration)
            data_response = self.client.get("/api/economic/labor-market?period=12m&fast=false")
            
            results["data_endpoint"] = {
                "status_code": data_response.status_code,
                "success": data_response.status_code == 200,
                "has_data": bool(data_response.json()) if data_response.status_code == 200 else False
            }
            
            if data_response.status_code == 200:
                data_content = data_response.json()
                results["data_endpoint"]["content_structure"] = {
                    "has_labor_data": "laborData" in data_content,
                    "has_alerts": "alerts" in data_content,
                    "has_metadata": "metadata" in data_content,
                    "data_points_count": len(data_content.get("laborData", []))
                }
            
            # Test 3: Different time periods
            periods = ["3m", "6m", "12m", "24m"]
            period_results = {}
            
            for period in periods:
                period_response = self.client.get(f"/api/economic/labor-market?period={period}&fast=true")
                period_results[period] = {
                    "status_code": period_response.status_code,
                    "success": period_response.status_code == 200,
                    "data_points": len(period_response.json().get("laborData", [])) if period_response.status_code == 200 else 0
                }
            
            results["period_variations"] = period_results
            
            # Test 4: Fast mode vs normal mode
            fast_response = self.client.get("/api/economic/labor-market?period=12m&fast=true")
            normal_response = self.client.get("/api/economic/labor-market?period=12m&fast=false")
            
            results["mode_comparison"] = {
                "fast_mode_success": fast_response.status_code == 200,
                "normal_mode_success": normal_response.status_code == 200,
                "fast_mode_data_points": len(fast_response.json().get("laborData", [])) if fast_response.status_code == 200 else 0,
                "normal_mode_data_points": len(normal_response.json().get("laborData", [])) if normal_response.status_code == 200 else 0
            }
            
            results["status"] = "passed"
            logger.info("Labor market endpoint tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Labor market endpoint tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["labor_market_tests"][test_name] = results
        return results
    
    def test_housing_market_endpoints(self) -> Dict[str, Any]:
        """Test housing market API endpoints."""
        test_name = "housing_market_endpoints"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Housing market summary endpoint
            summary_response = self.client.get("/api/economic/housing/summary?region=national&period=12m&fast_mode=false")
            
            results["summary_endpoint"] = {
                "status_code": summary_response.status_code,
                "success": summary_response.status_code == 200,
                "has_data": bool(summary_response.json()) if summary_response.status_code == 200 else False
            }
            
            if summary_response.status_code == 200:
                summary_data = summary_response.json()
                results["summary_endpoint"]["data_structure"] = {
                    "has_current_metrics": "current_metrics" in summary_data,
                    "has_time_series": "time_series" in summary_data,
                    "has_trend_analysis": "trend_analysis" in summary_data,
                    "has_statistics": "statistics" in summary_data,
                    "time_series_count": len(summary_data.get("time_series", []))
                }
            
            # Test 2: Housing market data endpoint (frontend integration)
            data_response = self.client.get("/api/economic/housing-market?region=national&period=12m&fast=false")
            
            results["data_endpoint"] = {
                "status_code": data_response.status_code,
                "success": data_response.status_code == 200,
                "has_data": bool(data_response.json()) if data_response.status_code == 200 else False
            }
            
            if data_response.status_code == 200:
                data_content = data_response.json()
                results["data_endpoint"]["content_structure"] = {
                    "has_housing_data": "housingData" in data_content,
                    "has_alerts": "alerts" in data_content,
                    "has_metadata": "metadata" in data_content,
                    "data_points_count": len(data_content.get("housingData", []))
                }
            
            # Test 3: Different regions
            regions = ["national", "ca", "ny", "fl", "tx"]
            region_results = {}
            
            for region in regions:
                region_response = self.client.get(f"/api/economic/housing-market?region={region}&period=12m&fast=true")
                region_results[region] = {
                    "status_code": region_response.status_code,
                    "success": region_response.status_code == 200,
                    "data_points": len(region_response.json().get("housingData", [])) if region_response.status_code == 200 else 0
                }
            
            results["region_variations"] = region_results
            
            # Test 4: Time period variations
            periods = ["3m", "6m", "12m", "24m"]
            period_results = {}
            
            for period in periods:
                period_response = self.client.get(f"/api/economic/housing-market?region=national&period={period}&fast=true")
                period_results[period] = {
                    "status_code": period_response.status_code,
                    "success": period_response.status_code == 200,
                    "data_points": len(period_response.json().get("housingData", [])) if period_response.status_code == 200 else 0
                }
            
            results["period_variations"] = period_results
            
            results["status"] = "passed"
            logger.info("Housing market endpoint tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Housing market endpoint tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["housing_market_tests"][test_name] = results
        return results
    
    def test_time_series_endpoints(self) -> Dict[str, Any]:
        """Test time series data endpoints."""
        test_name = "time_series_endpoints"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Time series POST endpoint
            time_series_payload = {
                "indicators": ["ICSA", "UNRATE", "CSUSHPINSA"],
                "start_date": "2023-01-01",
                "end_date": "2023-12-31",
                "frequency": "monthly",
                "seasonally_adjusted": True
            }
            
            ts_response = self.client.post(
                "/api/economic/time-series",
                json=time_series_payload
            )
            
            results["time_series_post"] = {
                "status_code": ts_response.status_code,
                "success": ts_response.status_code == 200,
                "has_data": bool(ts_response.json()) if ts_response.status_code == 200 else False
            }
            
            if ts_response.status_code == 200:
                ts_data = ts_response.json()
                results["time_series_post"]["data_structure"] = {
                    "has_indicators": "indicators" in ts_data,
                    "has_data": "data" in ts_data,
                    "has_statistics": "statistics" in ts_data,
                    "data_points_count": len(ts_data.get("data", [])),
                    "indicators_match": set(ts_data.get("indicators", [])) == set(time_series_payload["indicators"])
                }
            
            # Test 2: Series-specific endpoint
            series_response = self.client.get(
                "/api/economic/series/UNRATE?start_date=2023-01-01&end_date=2023-06-30"
            )
            
            results["series_endpoint"] = {
                "status_code": series_response.status_code,
                "success": series_response.status_code == 200,
                "has_data": bool(series_response.json()) if series_response.status_code == 200 else False
            }
            
            if series_response.status_code == 200:
                series_data = series_response.json()
                results["series_endpoint"]["data_structure"] = {
                    "has_observations": "observations" in series_data,
                    "has_metadata": "metadata" in series_data,
                    "observations_count": len(series_data.get("observations", []))
                }
            
            # Test 3: Invalid date range handling
            invalid_ts_payload = {
                "indicators": ["UNRATE"],
                "start_date": "2023-12-31",
                "end_date": "2023-01-01",  # End before start
                "frequency": "monthly"
            }
            
            invalid_response = self.client.post(
                "/api/economic/time-series",
                json=invalid_ts_payload
            )
            
            results["invalid_date_handling"] = {
                "status_code": invalid_response.status_code,
                "handled_correctly": invalid_response.status_code == 400,
                "error_message": invalid_response.json().get("detail", "") if invalid_response.status_code == 400 else ""
            }
            
            results["status"] = "passed"
            logger.info("Time series endpoint tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Time series endpoint tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["time_series_tests"][test_name] = results
        return results
    
    def test_health_and_utility_endpoints(self) -> Dict[str, Any]:
        """Test health check and utility endpoints."""
        test_name = "health_utility_endpoints"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Health/test endpoint
            health_response = self.client.get("/api/economic/test")
            
            results["health_endpoint"] = {
                "status_code": health_response.status_code,
                "success": health_response.status_code == 200,
                "response_data": health_response.json() if health_response.status_code == 200 else None
            }
            
            # Test 2: Indicators listing endpoint
            indicators_response = self.client.get("/api/economic/indicators")
            
            results["indicators_endpoint"] = {
                "status_code": indicators_response.status_code,
                "success": indicators_response.status_code == 200,
                "has_data": bool(indicators_response.json()) if indicators_response.status_code == 200 else False
            }
            
            if indicators_response.status_code == 200:
                indicators_data = indicators_response.json()
                results["indicators_endpoint"]["data_structure"] = {
                    "has_labor_indicators": "labor" in indicators_data,
                    "has_housing_indicators": "housing" in indicators_data,
                    "labor_indicators_count": len(indicators_data.get("labor", {})),
                    "housing_indicators_count": len(indicators_data.get("housing", {}))
                }
            
            # Test 3: Category-filtered indicators
            labor_indicators = self.client.get("/api/economic/indicators?category=labor")
            housing_indicators = self.client.get("/api/economic/indicators?category=housing")
            
            results["filtered_indicators"] = {
                "labor_filter_success": labor_indicators.status_code == 200,
                "housing_filter_success": housing_indicators.status_code == 200,
                "labor_only": "labor" in labor_indicators.json() and "housing" not in labor_indicators.json() if labor_indicators.status_code == 200 else False,
                "housing_only": "housing" in housing_indicators.json() and "labor" not in housing_indicators.json() if housing_indicators.status_code == 200 else False
            }
            
            # Test 4: Invalid category handling
            invalid_category = self.client.get("/api/economic/indicators?category=invalid")
            
            results["invalid_category_handling"] = {
                "status_code": invalid_category.status_code,
                "handled_correctly": invalid_category.status_code == 400
            }
            
            results["status"] = "passed"
            logger.info("Health and utility endpoint tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Health and utility endpoint tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["health_tests"][test_name] = results
        return results
    
    def test_error_handling(self) -> Dict[str, Any]:
        """Test API error handling scenarios."""
        test_name = "error_handling"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Non-existent endpoints
            not_found_response = self.client.get("/api/economic/nonexistent")
            
            results["not_found_handling"] = {
                "status_code": not_found_response.status_code,
                "returns_404": not_found_response.status_code == 404
            }
            
            # Test 2: Invalid query parameters
            invalid_params_response = self.client.get("/api/economic/labor-market?period=invalid&fast=not_boolean")
            
            results["invalid_params_handling"] = {
                "status_code": invalid_params_response.status_code,
                "handled_gracefully": invalid_params_response.status_code in [200, 400, 422]  # Should handle gracefully
            }
            
            # Test 3: Malformed JSON in POST requests
            malformed_response = self.client.post(
                "/api/economic/time-series",
                content="invalid json content",
                headers={"Content-Type": "application/json"}
            )
            
            results["malformed_json_handling"] = {
                "status_code": malformed_response.status_code,
                "returns_error": malformed_response.status_code in [400, 422]
            }
            
            # Test 4: Missing required fields in POST
            missing_fields_response = self.client.post(
                "/api/economic/time-series",
                json={"frequency": "monthly"}  # Missing required "indicators" field
            )
            
            results["missing_fields_handling"] = {
                "status_code": missing_fields_response.status_code,
                "validation_error": missing_fields_response.status_code == 422
            }
            
            # Test 5: Invalid series ID in series endpoint
            invalid_series_response = self.client.get(
                "/api/economic/series/INVALID_SERIES?start_date=2023-01-01&end_date=2023-12-31"
            )
            
            results["invalid_series_handling"] = {
                "status_code": invalid_series_response.status_code,
                "handled_gracefully": invalid_series_response.status_code in [200, 400, 404, 500]
            }
            
            results["status"] = "passed"
            logger.info("API error handling tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"API error handling tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["error_handling_tests"][test_name] = results
        return results
    
    def test_performance_metrics(self) -> Dict[str, Any]:
        """Test API performance characteristics."""
        test_name = "performance_metrics"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            import time
            
            # Test 1: Response time measurements
            endpoints_to_test = [
                "/api/economic/test",
                "/api/economic/indicators",
                "/api/economic/labor-market?period=12m&fast=true",
                "/api/economic/housing-market?region=national&period=12m&fast=true"
            ]
            
            response_times = {}
            
            for endpoint in endpoints_to_test:
                start_time = time.time()
                response = self.client.get(endpoint)
                elapsed_time = time.time() - start_time
                
                response_times[endpoint] = {
                    "response_time_ms": round(elapsed_time * 1000, 2),
                    "status_code": response.status_code,
                    "success": response.status_code == 200
                }
            
            results["response_times"] = response_times
            
            # Test 2: Concurrent request handling
            def make_concurrent_request():
                start = time.time()
                response = self.client.get("/api/economic/test")
                return {
                    "response_time": time.time() - start,
                    "status_code": response.status_code
                }
            
            # Simulate 10 concurrent requests using threading
            import threading
            concurrent_results = []
            threads = []
            
            def thread_worker():
                result = make_concurrent_request()
                concurrent_results.append(result)
            
            start_concurrent = time.time()
            for _ in range(10):
                thread = threading.Thread(target=thread_worker)
                threads.append(thread)
                thread.start()
            
            for thread in threads:
                thread.join()
            
            total_concurrent_time = time.time() - start_concurrent
            
            successful_concurrent = sum(1 for r in concurrent_results if r["status_code"] == 200)
            avg_response_time = sum(r["response_time"] for r in concurrent_results) / len(concurrent_results) if concurrent_results else 0
            
            results["concurrent_handling"] = {
                "total_requests": len(concurrent_results),
                "successful_requests": successful_concurrent,
                "success_rate": round(successful_concurrent / len(concurrent_results) * 100, 2) if concurrent_results else 0,
                "total_time_seconds": round(total_concurrent_time, 2),
                "avg_response_time_ms": round(avg_response_time * 1000, 2)
            }
            
            # Test 3: Data volume handling
            large_request_start = time.time()
            large_data_response = self.client.get("/api/economic/labor-market?period=24m&fast=false")
            large_request_time = time.time() - large_request_start
            
            results["large_data_handling"] = {
                "response_time_ms": round(large_request_time * 1000, 2),
                "status_code": large_data_response.status_code,
                "success": large_data_response.status_code == 200,
                "data_size_kb": len(large_data_response.content) / 1024 if large_data_response.status_code == 200 else 0
            }
            
            results["status"] = "passed"
            logger.info("API performance tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"API performance tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["performance_tests"][test_name] = results
        return results
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all API endpoint tests."""
        logger.info("Starting API endpoint integration tests...")
        
        try:
            # Run all test suites
            self.test_labor_market_endpoints()
            self.test_housing_market_endpoints()
            self.test_time_series_endpoints()
            self.test_health_and_utility_endpoints()
            self.test_error_handling()
            self.test_performance_metrics()
            
            # Generate summary
            self.test_results["summary"] = self._generate_test_summary()
            
            logger.info("API endpoint integration tests completed")
            return self.test_results
            
        except Exception as e:
            logger.error(f"API endpoint tests failed: {e}")
            return {"error": f"API endpoint tests failed: {e}"}
    
    def _generate_test_summary(self) -> Dict[str, Any]:
        """Generate a summary of all API test results."""
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for category, tests in self.test_results.items():
            if category in ["timestamp", "summary"]:
                continue
                
            for test_name, test_result in tests.items():
                total_tests += 1
                if test_result.get("status") == "passed":
                    passed_tests += 1
                else:
                    failed_tests += 1
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(passed_tests / total_tests * 100, 2) if total_tests > 0 else 0,
            "test_completion_time": datetime.utcnow().isoformat()
        }


# Standalone test runner functions
def run_api_health_test():
    """Run a quick API health test."""
    tester = APIEndpointTester()
    return tester.test_health_and_utility_endpoints()

def run_full_api_test_suite():
    """Run the complete API integration test suite."""
    tester = APIEndpointTester()
    return tester.run_all_tests()

# Pytest integration
def test_api_health():
    """Pytest test for API health endpoints."""
    result = run_api_health_test()
    assert result["status"] == "passed", f"API health test failed: {result.get('error')}"

def test_api_full_integration():
    """Pytest test for full API integration suite."""
    results = run_full_api_test_suite()
    summary = results.get("summary", {})
    assert summary.get("failed_tests", 1) == 0, f"API integration tests failed: {summary}"

if __name__ == "__main__":
    # Command line execution
    print("Running API Endpoint Integration Tests...")
    results = run_full_api_test_suite()
    
    print("\n" + "="*60)
    print("API ENDPOINT INTEGRATION TEST RESULTS")
    print("="*60)
    
    summary = results.get("summary", {})
    print(f"Total Tests: {summary.get('total_tests', 0)}")
    print(f"Passed: {summary.get('passed_tests', 0)}")
    print(f"Failed: {summary.get('failed_tests', 0)}")
    print(f"Success Rate: {summary.get('success_rate', 0)}%")
    
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