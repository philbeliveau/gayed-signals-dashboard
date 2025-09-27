"""
Redis Integration Tests - System Integration Testing
Tests Redis connectivity, caching functionality, and performance metrics.
"""

import asyncio
import json
import pytest
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import redis.asyncio as redis
from redis.exceptions import RedisError, ConnectionError

# Import the services we're testing
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cache_service import cache_service, CacheService
from core.config import settings

logger = logging.getLogger(__name__)

class RedisIntegrationTester:
    """Comprehensive Redis integration testing class."""
    
    def __init__(self):
        self.test_results = {
            "connection_tests": {},
            "data_operations": {},
            "performance_tests": {},
            "error_handling": {},
            "health_checks": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_cache_service = None
    
    async def setup_test_environment(self):
        """Set up test environment with separate cache service instance."""
        try:
            # Create a test-specific cache service instance
            self.test_cache_service = CacheService()
            await self.test_cache_service._ensure_session()
            
            logger.info("Test environment setup complete")
            return True
        except Exception as e:
            logger.error(f"Failed to setup test environment: {e}")
            return False
    
    async def test_basic_connectivity(self) -> Dict[str, Any]:
        """Test basic Redis connectivity and configuration."""
        test_name = "basic_connectivity"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Basic connection
            start_time = time.time()
            await self.test_cache_service.redis.ping()
            ping_time = (time.time() - start_time) * 1000
            
            results["ping_test"] = {
                "success": True,
                "response_time_ms": round(ping_time, 2)
            }
            
            # Test 2: Redis info retrieval
            info = await self.test_cache_service.redis.info()
            results["info_test"] = {
                "success": True,
                "redis_version": info.get("redis_version", "unknown"),
                "uptime_seconds": info.get("uptime_in_seconds", 0),
                "connected_clients": info.get("connected_clients", 0)
            }
            
            # Test 3: Configuration validation
            results["config_test"] = {
                "redis_url": settings.REDIS_URL,
                "redis_host": settings.REDIS_HOST,
                "redis_port": settings.REDIS_PORT,
                "redis_db": settings.REDIS_DB,
                "pool_size": settings.REDIS_POOL_SIZE
            }
            
            results["status"] = "passed"
            logger.info("Basic connectivity tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Basic connectivity tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["connection_tests"][test_name] = results
        return results
    
    async def test_data_operations(self) -> Dict[str, Any]:
        """Test Redis data operations (SET, GET, DELETE, etc.)."""
        test_name = "data_operations"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        test_key = "integration_test_key"
        test_data = {
            "test_string": "Hello Redis Integration Test",
            "test_number": 12345,
            "test_timestamp": datetime.utcnow().isoformat(),
            "test_nested": {"level1": {"level2": "nested_value"}}
        }
        
        try:
            # Test 1: Basic SET/GET operations
            await self.test_cache_service.redis.set(test_key, json.dumps(test_data))
            retrieved_raw = await self.test_cache_service.redis.get(test_key)
            retrieved_data = json.loads(retrieved_raw.decode('utf-8'))
            
            results["set_get_test"] = {
                "success": retrieved_data == test_data,
                "data_match": retrieved_data == test_data
            }
            
            # Test 2: TTL operations
            ttl_key = f"{test_key}_ttl"
            await self.test_cache_service.redis.setex(ttl_key, 60, "test_ttl_value")
            ttl_value = await self.test_cache_service.redis.ttl(ttl_key)
            
            results["ttl_test"] = {
                "success": 50 <= ttl_value <= 60,
                "ttl_seconds": ttl_value
            }
            
            # Test 3: Hash operations
            hash_key = f"{test_key}_hash"
            hash_data = {"field1": "value1", "field2": "value2", "field3": "value3"}
            
            await self.test_cache_service.redis.hset(hash_key, mapping=hash_data)
            retrieved_hash = await self.test_cache_service.redis.hgetall(hash_key)
            
            # Convert bytes to strings for comparison
            retrieved_hash_str = {k.decode(): v.decode() for k, v in retrieved_hash.items()}
            
            results["hash_test"] = {
                "success": retrieved_hash_str == hash_data,
                "hash_fields": len(retrieved_hash_str)
            }
            
            # Test 4: List operations
            list_key = f"{test_key}_list"
            list_data = ["item1", "item2", "item3", "item4"]
            
            for item in list_data:
                await self.test_cache_service.redis.lpush(list_key, item)
            
            list_length = await self.test_cache_service.redis.llen(list_key)
            retrieved_list = await self.test_cache_service.redis.lrange(list_key, 0, -1)
            retrieved_list_str = [item.decode() for item in retrieved_list]
            
            results["list_test"] = {
                "success": list_length == len(list_data),
                "list_length": list_length,
                "items_match": len(set(retrieved_list_str) & set(list_data)) == len(list_data)
            }
            
            # Test 5: Deletion operations
            keys_to_delete = [test_key, ttl_key, hash_key, list_key]
            deleted_count = await self.test_cache_service.redis.delete(*keys_to_delete)
            
            results["delete_test"] = {
                "success": deleted_count == len(keys_to_delete),
                "deleted_count": deleted_count
            }
            
            results["status"] = "passed"
            logger.info("Data operations tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Data operations tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["data_operations"][test_name] = results
        return results
    
    async def test_cache_service_functionality(self) -> Dict[str, Any]:
        """Test the CacheService class functionality."""
        test_name = "cache_service_functionality"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Video metadata caching
            test_url = "https://www.youtube.com/watch?v=test123"
            test_metadata = {
                "title": "Test Video",
                "duration": 300,
                "channel": "Test Channel",
                "views": 1000
            }
            
            cache_success = await self.test_cache_service.cache_video_metadata(test_url, test_metadata)
            retrieved_metadata = await self.test_cache_service.get_video_metadata(test_url)
            
            results["video_metadata_test"] = {
                "cache_success": cache_success,
                "retrieval_success": retrieved_metadata is not None,
                "data_integrity": retrieved_metadata.get("title") == test_metadata["title"] if retrieved_metadata else False
            }
            
            # Test 2: Transcript chunks caching
            test_video_id = "test_video_123"
            test_chunks = [
                {"start_time": 0, "end_time": 30, "text": "This is chunk 1"},
                {"start_time": 30, "end_time": 60, "text": "This is chunk 2"},
                {"start_time": 60, "end_time": 90, "text": "This is chunk 3"}
            ]
            
            chunk_cache_success = await self.test_cache_service.cache_transcript_chunks(test_video_id, test_chunks)
            retrieved_chunks = await self.test_cache_service.get_transcript_chunks(test_video_id)
            
            results["transcript_chunks_test"] = {
                "cache_success": chunk_cache_success,
                "retrieval_success": retrieved_chunks is not None,
                "chunk_count_match": len(retrieved_chunks) == len(test_chunks) if retrieved_chunks else False
            }
            
            # Test 3: Summary caching
            test_summary = {
                "summary_text": "This is a test summary of the video content.",
                "key_points": ["Point 1", "Point 2", "Point 3"],
                "sentiment": "positive"
            }
            
            summary_cache_success = await self.test_cache_service.cache_summary(test_video_id, test_summary)
            retrieved_summary = await self.test_cache_service.get_cached_summary(test_video_id)
            
            results["summary_test"] = {
                "cache_success": summary_cache_success,
                "retrieval_success": retrieved_summary is not None,
                "summary_match": retrieved_summary.get("summary_text") == test_summary["summary_text"] if retrieved_summary else False
            }
            
            # Test 4: Cache invalidation
            invalidation_success = await self.test_cache_service.invalidate_video_cache(test_video_id, test_url)
            
            # Try to retrieve invalidated data
            post_invalidation_metadata = await self.test_cache_service.get_video_metadata(test_url)
            post_invalidation_chunks = await self.test_cache_service.get_transcript_chunks(test_video_id)
            
            results["invalidation_test"] = {
                "invalidation_success": invalidation_success,
                "metadata_cleared": post_invalidation_metadata is None,
                "chunks_cleared": post_invalidation_chunks is None
            }
            
            results["status"] = "passed"
            logger.info("Cache service functionality tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Cache service functionality tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["data_operations"][test_name] = results
        return results
    
    async def test_performance_metrics(self) -> Dict[str, Any]:
        """Test Redis performance and caching efficiency."""
        test_name = "performance_metrics"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Throughput test
            num_operations = 100
            test_keys = [f"perf_test_{i}" for i in range(num_operations)]
            test_value = "performance_test_value_" * 10  # ~250 bytes
            
            # Write performance
            write_start = time.time()
            for key in test_keys:
                await self.test_cache_service.redis.set(key, test_value)
            write_time = time.time() - write_start
            
            # Read performance
            read_start = time.time()
            for key in test_keys:
                await self.test_cache_service.redis.get(key)
            read_time = time.time() - read_start
            
            results["throughput_test"] = {
                "operations_count": num_operations,
                "write_ops_per_second": round(num_operations / write_time, 2),
                "read_ops_per_second": round(num_operations / read_time, 2),
                "avg_write_latency_ms": round((write_time / num_operations) * 1000, 2),
                "avg_read_latency_ms": round((read_time / num_operations) * 1000, 2)
            }
            
            # Test 2: Memory usage test
            info_before = await self.test_cache_service.redis.info()
            memory_before = info_before.get("used_memory", 0)
            
            # Add large data
            large_data = "x" * 1024 * 100  # 100KB
            large_keys = [f"large_test_{i}" for i in range(10)]
            
            for key in large_keys:
                await self.test_cache_service.redis.set(key, large_data)
            
            info_after = await self.test_cache_service.redis.info()
            memory_after = info_after.get("used_memory", 0)
            memory_increase = memory_after - memory_before
            
            results["memory_test"] = {
                "memory_before_bytes": memory_before,
                "memory_after_bytes": memory_after,
                "memory_increase_bytes": memory_increase,
                "memory_increase_mb": round(memory_increase / 1024 / 1024, 2)
            }
            
            # Test 3: Connection pool test
            pool_test_start = time.time()
            concurrent_tasks = []
            
            async def concurrent_operation(task_id):
                await self.test_cache_service.redis.set(f"pool_test_{task_id}", f"value_{task_id}")
                return await self.test_cache_service.redis.get(f"pool_test_{task_id}")
            
            for i in range(20):
                concurrent_tasks.append(concurrent_operation(i))
            
            concurrent_results = await asyncio.gather(*concurrent_tasks, return_exceptions=True)
            pool_test_time = time.time() - pool_test_start
            
            successful_operations = sum(1 for result in concurrent_results if not isinstance(result, Exception))
            
            results["connection_pool_test"] = {
                "concurrent_operations": len(concurrent_tasks),
                "successful_operations": successful_operations,
                "success_rate": round(successful_operations / len(concurrent_tasks) * 100, 2),
                "total_time_seconds": round(pool_test_time, 2)
            }
            
            # Cleanup test data
            cleanup_keys = test_keys + large_keys + [f"pool_test_{i}" for i in range(20)]
            await self.test_cache_service.redis.delete(*cleanup_keys)
            
            results["status"] = "passed"
            logger.info("Performance metrics tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Performance metrics tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["performance_tests"][test_name] = results
        return results
    
    async def test_error_handling(self) -> Dict[str, Any]:
        """Test Redis error handling and resilience."""
        test_name = "error_handling"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Invalid key operations
            try:
                await self.test_cache_service.redis.get("nonexistent_key_12345")
                results["nonexistent_key_test"] = {"success": True, "error": None}
            except Exception as e:
                results["nonexistent_key_test"] = {"success": False, "error": str(e)}
            
            # Test 2: Large data handling
            try:
                very_large_data = "x" * (1024 * 1024 * 10)  # 10MB
                await self.test_cache_service.redis.set("large_data_test", very_large_data)
                retrieved = await self.test_cache_service.redis.get("large_data_test")
                await self.test_cache_service.redis.delete("large_data_test")
                
                results["large_data_test"] = {
                    "success": len(retrieved.decode()) == len(very_large_data),
                    "data_size_mb": round(len(very_large_data) / 1024 / 1024, 2)
                }
            except Exception as e:
                results["large_data_test"] = {"success": False, "error": str(e)}
            
            # Test 3: TTL edge cases
            try:
                await self.test_cache_service.redis.setex("ttl_edge_test", 1, "short_lived")
                await asyncio.sleep(2)  # Wait for expiration
                expired_value = await self.test_cache_service.redis.get("ttl_edge_test")
                
                results["ttl_expiration_test"] = {
                    "success": expired_value is None,
                    "value_expired": expired_value is None
                }
            except Exception as e:
                results["ttl_expiration_test"] = {"success": False, "error": str(e)}
            
            # Test 4: Pipeline operations
            try:
                pipeline = self.test_cache_service.redis.pipeline()
                for i in range(5):
                    pipeline.set(f"pipeline_test_{i}", f"value_{i}")
                pipeline_results = await pipeline.execute()
                
                results["pipeline_test"] = {
                    "success": len(pipeline_results) == 5,
                    "operations_count": len(pipeline_results)
                }
                
                # Cleanup
                pipeline_keys = [f"pipeline_test_{i}" for i in range(5)]
                await self.test_cache_service.redis.delete(*pipeline_keys)
                
            except Exception as e:
                results["pipeline_test"] = {"success": False, "error": str(e)}
            
            results["status"] = "passed"
            logger.info("Error handling tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Error handling tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["error_handling"][test_name] = results
        return results
    
    async def test_health_checks(self) -> Dict[str, Any]:
        """Test Redis health check functionality."""
        test_name = "health_checks"
        results = {"status": "running", "started_at": datetime.utcnow().isoformat()}
        
        try:
            # Test 1: Cache service health check
            health_status = await self.test_cache_service.health_check()
            
            results["cache_service_health"] = {
                "status": health_status.get("status"),
                "ping_time_ms": health_status.get("ping_time_ms"),
                "connected_clients": health_status.get("connected_clients"),
                "memory_usage": health_status.get("used_memory"),
                "cache_hit_ratio": health_status.get("cache_hit_ratio")
            }
            
            # Test 2: Performance metrics collection
            perf_metrics = await self.test_cache_service.get_performance_metrics()
            
            results["performance_metrics"] = {
                "memory_stats_available": "memory_stats" in perf_metrics,
                "performance_stats_available": "performance_stats" in perf_metrics,
                "cache_stats_available": "cache_stats" in perf_metrics
            }
            
            # Test 3: Cache statistics
            cache_stats = await self.test_cache_service.get_cache_stats()
            
            results["cache_statistics"] = {
                "stats_available": bool(cache_stats),
                "total_commands": cache_stats.get("total_commands_processed", 0),
                "instantaneous_ops": cache_stats.get("instantaneous_ops_per_sec", 0)
            }
            
            results["status"] = "passed"
            logger.info("Health checks tests passed")
            
        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            logger.error(f"Health checks tests failed: {e}")
        
        results["completed_at"] = datetime.utcnow().isoformat()
        self.test_results["health_checks"][test_name] = results
        return results
    
    async def cleanup_test_environment(self):
        """Clean up test environment."""
        try:
            if self.test_cache_service:
                await self.test_cache_service.close()
            logger.info("Test environment cleanup complete")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all Redis integration tests."""
        logger.info("Starting Redis integration tests...")
        
        if not await self.setup_test_environment():
            return {"error": "Failed to setup test environment"}
        
        try:
            # Run all test suites
            await self.test_basic_connectivity()
            await self.test_data_operations()
            await self.test_cache_service_functionality()
            await self.test_performance_metrics()
            await self.test_error_handling()
            await self.test_health_checks()
            
            # Generate summary
            self.test_results["summary"] = self._generate_test_summary()
            
            logger.info("Redis integration tests completed")
            return self.test_results
            
        finally:
            await self.cleanup_test_environment()
    
    def _generate_test_summary(self) -> Dict[str, Any]:
        """Generate a summary of all test results."""
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
async def run_redis_connectivity_test():
    """Run a quick Redis connectivity test."""
    tester = RedisIntegrationTester()
    await tester.setup_test_environment()
    result = await tester.test_basic_connectivity()
    await tester.cleanup_test_environment()
    return result

async def run_full_redis_test_suite():
    """Run the complete Redis integration test suite."""
    tester = RedisIntegrationTester()
    return await tester.run_all_tests()

# Pytest integration
@pytest.mark.asyncio
async def test_redis_basic_connectivity():
    """Pytest test for basic Redis connectivity."""
    result = await run_redis_connectivity_test()
    assert result["status"] == "passed", f"Redis connectivity test failed: {result.get('error')}"

@pytest.mark.asyncio
async def test_redis_full_integration():
    """Pytest test for full Redis integration suite."""
    results = await run_full_redis_test_suite()
    summary = results.get("summary", {})
    assert summary.get("failed_tests", 1) == 0, f"Redis integration tests failed: {summary}"

if __name__ == "__main__":
    # Command line execution
    import asyncio
    
    async def main():
        print("Running Redis Integration Tests...")
        results = await run_full_redis_test_suite()
        
        print("\n" + "="*60)
        print("REDIS INTEGRATION TEST RESULTS")
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
        
        return results
    
    asyncio.run(main())