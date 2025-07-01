"""
Performance Validation Tests - System Integration Testing
Tests Redis caching performance, FRED API optimization, and overall system performance.
"""

import asyncio
import json
import pytest
import time
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import the services we're testing
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cache_service import cache_service, CacheService
from services.fred_service import fred_service, FREDService
from fastapi.testclient import TestClient
from main import app

logger = logging.getLogger(__name__)

class PerformanceValidator:
    """Comprehensive performance validation testing class."""
    
    def __init__(self):
        self.test_results = {
            "redis_performance": {},
            "fred_performance": {},
            "api_performance": {},
            "system_performance": {},
            "caching_efficiency": {},
            "memory_usage": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_cache_service = None
        self.test_fred_service = None
        self.client = TestClient(app)
    
    async def setup_test_environment(self):
        """Set up test environment with separate service instances."""
        try:
            self.test_cache_service = CacheService()
            await self.test_cache_service._ensure_session()
            
            self.test_fred_service = FREDService()
            
            logger.info("Performance test environment setup complete")
            return True
        except Exception as e:
            logger.error(f"Failed to setup performance test environment: {e}")
            return False
    
    async def test_redis_performance(self) -> Dict[str, Any]:
        """Test Redis performance metrics."""
        test_name = "redis_performance"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Throughput benchmarks
            operation_counts = [10, 50, 100, 500]
            throughput_results = {}
            
            for count in operation_counts:
                # Write throughput
                test_data = {"key": f"perf_test", "value": "x" * 1024}  # 1KB data
                write_times = []
                
                for i in range(count):
                    start_time = time.time()
                    await self.test_cache_service.redis.set(f"write_test_{i}", json.dumps(test_data))
                    write_times.append(time.time() - start_time)
                
                # Read throughput
                read_times = []
                for i in range(count):
                    start_time = time.time()
                    await self.test_cache_service.redis.get(f"write_test_{i}")
                    read_times.append(time.time() - start_time)
                
                # Calculate statistics
                avg_write_time = statistics.mean(write_times)
                avg_read_time = statistics.mean(read_times)
                
                throughput_results[f"{count}_operations"] = {
                    "write_ops_per_second": round(1 / avg_write_time, 2) if avg_write_time > 0 else 0,
                    "read_ops_per_second": round(1 / avg_read_time, 2) if avg_read_time > 0 else 0,
                    "avg_write_latency_ms": round(avg_write_time * 1000, 2),
                    "avg_read_latency_ms": round(avg_read_time * 1000, 2),
                    "write_p95_latency_ms": round(sorted(write_times)[int(0.95 * len(write_times))] * 1000, 2),
                    "read_p95_latency_ms": round(sorted(read_times)[int(0.95 * len(read_times))] * 1000, 2)
                }
                
                # Cleanup
                cleanup_keys = [f"write_test_{i}" for i in range(count)]
                await self.test_cache_service.redis.delete(*cleanup_keys)
            
            results["throughput_benchmarks"] = throughput_results
            
            # Test 2: Connection pool stress test
            pool_test_start = time.time()
            concurrent_operations = 50
            
            async def concurrent_redis_operation(operation_id):
                start = time.time()
                await self.test_cache_service.redis.set(f"pool_stress_{operation_id}", f"data_{operation_id}")
                result = await self.test_cache_service.redis.get(f"pool_stress_{operation_id}")
                await self.test_cache_service.redis.delete(f"pool_stress_{operation_id}")
                return time.time() - start
            
            tasks = [concurrent_redis_operation(i) for i in range(concurrent_operations)]
            operation_times = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_operations = [t for t in operation_times if isinstance(t, float)]
            pool_test_time = time.time() - pool_test_start
            
            results["connection_pool_stress"] = {
                "total_operations": concurrent_operations,
                "successful_operations": len(successful_operations),
                "success_rate": round(len(successful_operations) / concurrent_operations * 100, 2),
                "total_time_seconds": round(pool_test_time, 2),
                "avg_operation_time_ms": round(statistics.mean(successful_operations) * 1000, 2) if successful_operations else 0,
                "operations_per_second": round(len(successful_operations) / pool_test_time, 2) if pool_test_time > 0 else 0
            }
            
            # Test 3: Memory efficiency test
            memory_test_data = "x" * (1024 * 10)  # 10KB per key
            memory_keys = [f"memory_test_{i}" for i in range(100)]
            
            # Get initial memory usage
            info_before = await self.test_cache_service.redis.info()
            memory_before = info_before.get("used_memory", 0)
            
            # Add test data
            memory_start = time.time()
            for key in memory_keys:
                await self.test_cache_service.redis.set(key, memory_test_data)
            memory_write_time = time.time() - memory_start
            
            # Get memory usage after
            info_after = await self.test_cache_service.redis.info()
            memory_after = info_after.get("used_memory", 0)
            
            # Cleanup
            await self.test_cache_service.redis.delete(*memory_keys)
            
            results["memory_efficiency"] = {
                "data_size_kb": len(memory_test_data) * len(memory_keys) / 1024,
                "memory_increase_bytes": memory_after - memory_before,
                "memory_increase_mb": round((memory_after - memory_before) / 1024 / 1024, 2),
                "compression_ratio": round((len(memory_test_data) * len(memory_keys)) / (memory_after - memory_before), 2) if memory_after > memory_before else 0,
                "write_time_seconds": round(memory_write_time, 2),
                "write_throughput_mb_per_sec": round((len(memory_test_data) * len(memory_keys) / 1024 / 1024) / memory_write_time, 2) if memory_write_time > 0 else 0
            }
            
            results["status"] = "passed"
            logger.info("Redis performance tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Redis performance tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["redis_performance"][test_name] = results
        return results
    
    async def test_fred_performance(self) -> Dict[str, Any]:
        """Test FRED service performance."""
        test_name = "fred_performance"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        if not self.test_fred_service.is_enabled:
            results["status"] = "skipped"
            results["reason"] = "FRED service disabled"
            results["completed_at"] = datetime.utcnow().isoformat()
            self.test_results["fred_performance"][test_name] = results
            return results
        
        try:
            # Test 1: Single API call performance
            single_call_times = []
            test_series = ["UNRATE", "ICSA", "PAYEMS"]
            
            for series in test_series:
                start_time = time.time()
                data = await self.test_fred_service.fetch_series_data(series, limit=10)
                call_time = time.time() - start_time
                single_call_times.append({
                    "series": series,
                    "response_time_ms": round(call_time * 1000, 2),
                    "data_points": len(data)
                })
            
            results["single_api_calls"] = {
                "calls": single_call_times,
                "avg_response_time_ms": round(statistics.mean([c["response_time_ms"] for c in single_call_times]), 2),
                "total_data_points": sum(c["data_points"] for c in single_call_times)
            }
            
            # Test 2: Batch data fetching performance
            batch_start = time.time()
            housing_data = await self.test_fred_service.fetch_housing_market_data(
                start_date=(datetime.utcnow() - timedelta(days=90)).strftime('%Y-%m-%d'),
                limit=20
            )
            batch_housing_time = time.time() - batch_start
            
            batch_start = time.time()
            labor_data = await self.test_fred_service.fetch_labor_market_data(
                start_date=(datetime.utcnow() - timedelta(days=90)).strftime('%Y-%m-%d'),
                limit=20
            )
            batch_labor_time = time.time() - batch_start
            
            results["batch_operations"] = {
                "housing_data_time_ms": round(batch_housing_time * 1000, 2),
                "labor_data_time_ms": round(batch_labor_time * 1000, 2),
                "housing_series_count": len(housing_data),
                "labor_series_count": len(labor_data),
                "total_housing_points": sum(len(data) for data in housing_data.values()),
                "total_labor_points": sum(len(data) for data in labor_data.values())
            }
            
            # Test 3: Cache vs API performance comparison
            cache_test_series = "CSUSHPINSA"
            
            # Clear cache for clean test
            from services.cache_service import cache_service
            cache_key = self.test_fred_service._get_cache_key(
                "series/observations",
                {"series_id": cache_test_series, "limit": "5", "api_key": self.test_fred_service.api_key, "file_type": "json"}
            )
            await cache_service.redis.delete(cache_key)
            
            # First call (API)
            api_start = time.time()
            api_data = await self.test_fred_service.fetch_series_data(cache_test_series, limit=5)
            api_time = time.time() - api_start
            
            # Second call (cache)
            cache_start = time.time()
            cache_data = await self.test_fred_service.fetch_series_data(cache_test_series, limit=5)
            cache_time = time.time() - cache_start
            
            results["cache_vs_api"] = {
                "api_call_time_ms": round(api_time * 1000, 2),
                "cache_call_time_ms": round(cache_time * 1000, 2),
                "speedup_factor": round(api_time / cache_time, 2) if cache_time > 0 else 0,
                "data_consistency": len(api_data) == len(cache_data),
                "cache_efficiency": round((1 - cache_time / api_time) * 100, 2) if api_time > 0 else 0
            }
            
            # Test 4: Rate limiting efficiency
            rate_limit_start = time.time()
            rate_limit_calls = []
            
            for i in range(5):
                call_start = time.time()
                await self.test_fred_service.rate_limiter.acquire()
                call_time = time.time() - call_start
                rate_limit_calls.append(call_time)
            
            total_rate_limit_time = time.time() - rate_limit_start
            
            results["rate_limiting"] = {
                "total_time_seconds": round(total_rate_limit_time, 2),
                "individual_wait_times_ms": [round(t * 1000, 2) for t in rate_limit_calls],
                "avg_wait_time_ms": round(statistics.mean(rate_limit_calls) * 1000, 2),
                "rate_limit_overhead": round(total_rate_limit_time / 5, 2)
            }
            
            results["status"] = "passed"
            logger.info("FRED performance tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"FRED performance tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["fred_performance"][test_name] = results
        return results
    
    def test_api_performance(self) -> Dict[str, Any]:
        """Test API endpoint performance."""
        test_name = "api_performance"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Endpoint response times
            endpoints = [
                "/api/economic/test",
                "/api/economic/labor-market?period=12m&fast=true",
                "/api/economic/housing-market?region=national&period=12m&fast=true",
                "/api/economic/indicators"
            ]
            
            endpoint_performance = {}
            
            for endpoint in endpoints:
                response_times = []
                for _ in range(5):  # 5 calls per endpoint
                    start_time = time.time()
                    response = self.client.get(endpoint)
                    response_time = time.time() - start_time
                    response_times.append({
                        "time_ms": round(response_time * 1000, 2),
                        "status_code": response.status_code,
                        "success": response.status_code == 200
                    })
                
                successful_times = [r["time_ms"] for r in response_times if r["success"]]
                
                endpoint_performance[endpoint] = {
                    "avg_response_time_ms": round(statistics.mean(successful_times), 2) if successful_times else 0,
                    "min_response_time_ms": min(successful_times) if successful_times else 0,
                    "max_response_time_ms": max(successful_times) if successful_times else 0,
                    "success_rate": round(sum(r["success"] for r in response_times) / len(response_times) * 100, 2),
                    "all_calls": response_times
                }
            
            results["endpoint_performance"] = endpoint_performance
            
            # Test 2: Concurrent API load test
            def make_concurrent_request():
                start = time.time()
                response = self.client.get("/api/economic/test")
                return {
                    "response_time_ms": round((time.time() - start) * 1000, 2),
                    "status_code": response.status_code,
                    "success": response.status_code == 200
                }
            
            # Use ThreadPoolExecutor for concurrent requests
            concurrent_requests = 20
            load_test_start = time.time()
            
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_concurrent_request) for _ in range(concurrent_requests)]
                concurrent_results = [future.result() for future in as_completed(futures)]
            
            load_test_time = time.time() - load_test_start
            
            successful_concurrent = [r for r in concurrent_results if r["success"]]
            
            results["concurrent_load_test"] = {
                "total_requests": concurrent_requests,
                "successful_requests": len(successful_concurrent),
                "success_rate": round(len(successful_concurrent) / concurrent_requests * 100, 2),
                "total_time_seconds": round(load_test_time, 2),
                "requests_per_second": round(concurrent_requests / load_test_time, 2),
                "avg_response_time_ms": round(statistics.mean([r["response_time_ms"] for r in successful_concurrent]), 2) if successful_concurrent else 0
            }
            
            # Test 3: Data size vs response time correlation
            data_size_tests = [
                ("/api/economic/labor-market?period=3m&fast=true", "3 months fast"),
                ("/api/economic/labor-market?period=12m&fast=true", "12 months fast"),
                ("/api/economic/labor-market?period=12m&fast=false", "12 months full"),
                ("/api/economic/labor-market?period=24m&fast=false", "24 months full")
            ]
            
            data_size_performance = {}
            
            for endpoint, description in data_size_tests:
                start_time = time.time()
                response = self.client.get(endpoint)
                response_time = time.time() - start_time
                
                data_size_kb = len(response.content) / 1024 if response.status_code == 200 else 0
                
                data_size_performance[description] = {
                    "response_time_ms": round(response_time * 1000, 2),
                    "data_size_kb": round(data_size_kb, 2),
                    "throughput_kb_per_sec": round(data_size_kb / response_time, 2) if response_time > 0 else 0,
                    "status_code": response.status_code
                }
            
            results["data_size_performance"] = data_size_performance
            
            results["status"] = "passed"
            logger.info("API performance tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"API performance tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["api_performance"][test_name] = results
        return results
    
    def test_system_performance(self) -> Dict[str, Any]:
        """Test overall system performance metrics."""
        test_name = "system_performance"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Memory usage monitoring
            initial_memory = psutil.virtual_memory()
            process = psutil.Process()
            initial_process_memory = process.memory_info()
            
            # Perform memory-intensive operations
            memory_test_start = time.time()
            
            # API calls that should trigger caching
            memory_endpoints = [
                "/api/economic/labor-market?period=12m&fast=false",
                "/api/economic/housing-market?region=national&period=12m&fast=false"
            ]
            
            for endpoint in memory_endpoints:
                self.client.get(endpoint)
            
            memory_test_time = time.time() - memory_test_start
            
            final_memory = psutil.virtual_memory()
            final_process_memory = process.memory_info()
            
            results["memory_usage"] = {
                "initial_system_memory_mb": round(initial_memory.used / 1024 / 1024, 2),
                "final_system_memory_mb": round(final_memory.used / 1024 / 1024, 2),
                "system_memory_increase_mb": round((final_memory.used - initial_memory.used) / 1024 / 1024, 2),
                "initial_process_memory_mb": round(initial_process_memory.rss / 1024 / 1024, 2),
                "final_process_memory_mb": round(final_process_memory.rss / 1024 / 1024, 2),
                "process_memory_increase_mb": round((final_process_memory.rss - initial_process_memory.rss) / 1024 / 1024, 2),
                "test_duration_seconds": round(memory_test_time, 2)
            }
            
            # Test 2: CPU usage monitoring
            cpu_test_start = time.time()
            initial_cpu = psutil.cpu_percent(interval=None)
            
            # CPU-intensive operations
            cpu_endpoints = ["/api/economic/test"] * 10  # Multiple calls
            
            for endpoint in cpu_endpoints:
                self.client.get(endpoint)
            
            final_cpu = psutil.cpu_percent(interval=1)  # 1 second interval
            cpu_test_time = time.time() - cpu_test_start
            
            results["cpu_usage"] = {
                "initial_cpu_percent": initial_cpu,
                "peak_cpu_percent": final_cpu,
                "cpu_increase": round(final_cpu - initial_cpu, 2),
                "test_duration_seconds": round(cpu_test_time, 2),
                "operations_per_second": round(len(cpu_endpoints) / cpu_test_time, 2)
            }
            
            # Test 3: Disk I/O (if applicable)
            disk_io_before = psutil.disk_io_counters()
            
            # Operations that might cause disk I/O
            disk_test_start = time.time()
            for _ in range(5):
                self.client.get("/api/economic/indicators")
            disk_test_time = time.time() - disk_test_start
            
            disk_io_after = psutil.disk_io_counters()
            
            results["disk_io"] = {
                "read_bytes_increase": disk_io_after.read_bytes - disk_io_before.read_bytes,
                "write_bytes_increase": disk_io_after.write_bytes - disk_io_before.write_bytes,
                "read_operations_increase": disk_io_after.read_count - disk_io_before.read_count,
                "write_operations_increase": disk_io_after.write_count - disk_io_before.write_count,
                "test_duration_seconds": round(disk_test_time, 2)
            }
            
            results["status"] = "passed"
            logger.info("System performance tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"System performance tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["system_performance"][test_name] = results
        return results
    
    async def cleanup_test_environment(self):
        """Clean up test environment."""
        try:
            if self.test_cache_service:
                await self.test_cache_service.close()
            if self.test_fred_service:
                await self.test_fred_service.close()
            logger.info("Performance test environment cleanup complete")
        except Exception as e:
            logger.error(f"Error during performance cleanup: {e}")
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all performance validation tests."""
        logger.info("Starting performance validation tests...")
        
        if not await self.setup_test_environment():
            return {"error": "Failed to setup performance test environment"}
        
        try:
            # Run all test suites
            await self.test_redis_performance()
            await self.test_fred_performance()
            self.test_api_performance()
            self.test_system_performance()
            
            # Generate summary
            self.test_results["summary"] = self._generate_test_summary()
            
            logger.info("Performance validation tests completed")
            return self.test_results
            
        finally:
            await self.cleanup_test_environment()
    
    def _generate_test_summary(self) -> Dict[str, Any]:
        """Generate a summary of all performance test results."""
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
            "test_completion_time": datetime.utcnow().isoformat()
        }


# Standalone test runner functions
async def run_redis_performance_test():
    """Run Redis performance validation."""
    validator = PerformanceValidator()
    await validator.setup_test_environment()
    result = await validator.test_redis_performance()
    await validator.cleanup_test_environment()
    return result

async def run_full_performance_suite():
    """Run the complete performance validation test suite."""
    validator = PerformanceValidator()
    return await validator.run_all_tests()

# Pytest integration
@pytest.mark.asyncio
async def test_redis_performance():
    """Pytest test for Redis performance validation."""
    result = await run_redis_performance_test()
    assert result["status"] in ["passed", "skipped"], f"Redis performance test failed: {result.get('error')}"

@pytest.mark.asyncio
async def test_full_performance_validation():
    """Pytest test for full performance validation suite."""
    results = await run_full_performance_suite()
    summary = results.get("summary", {})
    assert summary.get("failed_tests", 1) == 0, f"Performance validation tests failed: {summary}"

if __name__ == "__main__":
    # Command line execution
    import asyncio
    
    async def main():
        print("Running Performance Validation Tests...")
        results = await run_full_performance_suite()
        
        print("\n" + "="*60)
        print("PERFORMANCE VALIDATION TEST RESULTS")
        print("="*60)
        
        summary = results.get("summary", {})
        print(f"Total Tests: {summary.get('total_tests', 0)}")
        print(f"Passed: {summary.get('passed_tests', 0)}")
        print(f"Failed: {summary.get('failed_tests', 0)}")
        print(f"Skipped: {summary.get('skipped_tests', 0)}")
        print(f"Success Rate: {summary.get('success_rate', 0)}%")
        
        print("\nPerformance Highlights:")
        for category, tests in results.items():
            if category in ["timestamp", "summary"]:
                continue
            
            print(f"\n{category.upper()}:")
            for test_name, test_result in tests.items():
                status = test_result.get("status", "unknown")
                print(f"  {test_name}: {status.upper()}")
                
                # Show key performance metrics
                if status == "passed":
                    if "throughput_benchmarks" in test_result:
                        for ops, metrics in test_result["throughput_benchmarks"].items():
                            print(f"    {ops}: {metrics.get('read_ops_per_second', 0)} reads/sec, {metrics.get('write_ops_per_second', 0)} writes/sec")
                    
                    if "endpoint_performance" in test_result:
                        for endpoint, metrics in test_result["endpoint_performance"].items():
                            print(f"    {endpoint}: {metrics.get('avg_response_time_ms', 0)}ms avg")
        
        return results
    
    asyncio.run(main())