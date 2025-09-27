"""
Health Check and Monitoring Procedures - System Integration Testing
Comprehensive health monitoring for Redis, FRED service, and API endpoints.
"""

import asyncio
import json
import logging
import time
import psutil
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Import the services we're monitoring
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cache_service import cache_service, CacheService
from services.fred_service import fred_service, FREDService
from fastapi.testclient import TestClient
from main import app

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """Health check status levels."""
    HEALTHY = "healthy"
    WARNING = "warning" 
    CRITICAL = "critical"
    UNKNOWN = "unknown"

@dataclass
class HealthCheckResult:
    """Individual health check result."""
    component: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    timestamp: str
    response_time_ms: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class SystemHealthReport:
    """Complete system health report."""
    overall_status: HealthStatus
    timestamp: str
    checks: List[HealthCheckResult]
    summary: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_status": self.overall_status.value,
            "timestamp": self.timestamp,
            "checks": [check.to_dict() for check in self.checks],
            "summary": self.summary
        }

class HealthMonitor:
    """Comprehensive health monitoring system."""
    
    def __init__(self):
        self.client = TestClient(app)
        self.health_history: List[SystemHealthReport] = []
        self.cache_service_instance = None
        self.fred_service_instance = None
    
    async def setup_monitoring(self):
        """Set up monitoring instances."""
        try:
            self.cache_service_instance = CacheService()
            await self.cache_service_instance._ensure_session()
            
            self.fred_service_instance = FREDService()
            
            logger.info("Health monitoring setup complete")
            return True
        except Exception as e:
            logger.error(f"Failed to setup health monitoring: {e}")
            return False
    
    async def check_redis_health(self) -> HealthCheckResult:
        """Check Redis service health."""
        start_time = time.time()
        component = "Redis"
        
        try:
            # Basic connectivity test
            health_data = await self.cache_service_instance.health_check()
            response_time = (time.time() - start_time) * 1000
            
            # Determine status based on health data
            if health_data.get("status") == "healthy":
                ping_time = health_data.get("ping_time_ms", 0)
                memory_usage = health_data.get("used_memory", "0B")
                
                # Check for warning conditions
                if ping_time > 100:  # > 100ms response time
                    status = HealthStatus.WARNING
                    message = f"Redis responsive but slow (ping: {ping_time}ms)"
                elif "GB" in memory_usage and float(memory_usage.replace("GB", "")) > 1:
                    status = HealthStatus.WARNING
                    message = f"Redis memory usage high ({memory_usage})"
                else:
                    status = HealthStatus.HEALTHY
                    message = "Redis operating normally"
            else:
                status = HealthStatus.CRITICAL
                message = f"Redis health check failed: {health_data.get('error', 'Unknown error')}"
            
            return HealthCheckResult(
                component=component,
                status=status,
                message=message,
                details=health_data,
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                component=component,
                status=HealthStatus.CRITICAL,
                message=f"Redis check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def check_fred_service_health(self) -> HealthCheckResult:
        """Check FRED service health."""
        start_time = time.time()
        component = "FRED Service"
        
        try:
            # FRED service health check
            health_data = await self.fred_service_instance.health_check()
            response_time = (time.time() - start_time) * 1000
            
            # Determine status
            if not self.fred_service_instance.is_enabled:
                status = HealthStatus.WARNING
                message = "FRED service disabled (no API key configured)"
            elif health_data.get("status") == "healthy" and health_data.get("api_connectivity"):
                error_count = health_data.get("error_count", 0)
                if error_count > 10:
                    status = HealthStatus.WARNING
                    message = f"FRED service operational but has {error_count} recent errors"
                else:
                    status = HealthStatus.HEALTHY
                    message = "FRED service operating normally"
            elif health_data.get("api_connectivity") is False:
                status = HealthStatus.CRITICAL
                message = "FRED API connectivity failed"
            else:
                status = HealthStatus.CRITICAL
                message = f"FRED service unhealthy: {health_data.get('api_error', 'Unknown error')}"
            
            return HealthCheckResult(
                component=component,
                status=status,
                message=message,
                details=health_data,
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                component=component,
                status=HealthStatus.CRITICAL,
                message=f"FRED check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    def check_api_endpoints_health(self) -> HealthCheckResult:
        """Check API endpoints health."""
        start_time = time.time()
        component = "API Endpoints"
        
        try:
            # Test key endpoints
            endpoints_to_check = [
                ("/api/economic/test", "Basic API"),
                ("/api/economic/indicators", "Indicators"),
                ("/api/economic/labor-market?period=12m&fast=true", "Labor Market"),
                ("/api/economic/housing-market?region=national&period=12m&fast=true", "Housing Market")
            ]
            
            endpoint_results = {}
            overall_healthy = True
            total_errors = 0
            
            for endpoint, name in endpoints_to_check:
                try:
                    endpoint_start = time.time()
                    response = self.client.get(endpoint)
                    endpoint_time = (time.time() - endpoint_start) * 1000
                    
                    endpoint_results[name] = {
                        "status_code": response.status_code,
                        "response_time_ms": round(endpoint_time, 2),
                        "success": response.status_code == 200,
                        "endpoint": endpoint
                    }
                    
                    if response.status_code != 200:
                        overall_healthy = False
                        total_errors += 1
                        
                except Exception as e:
                    endpoint_results[name] = {
                        "error": str(e),
                        "success": False,
                        "endpoint": endpoint
                    }
                    overall_healthy = False
                    total_errors += 1
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine overall status
            if overall_healthy:
                status = HealthStatus.HEALTHY
                message = "All API endpoints responding normally"
            elif total_errors <= 1:
                status = HealthStatus.WARNING
                message = f"{total_errors} API endpoint(s) having issues"
            else:
                status = HealthStatus.CRITICAL
                message = f"Multiple API endpoints failing ({total_errors} errors)"
            
            return HealthCheckResult(
                component=component,
                status=status,
                message=message,
                details={"endpoints": endpoint_results, "total_errors": total_errors},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                component=component,
                status=HealthStatus.CRITICAL,
                message=f"API health check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    def check_system_resources_health(self) -> HealthCheckResult:
        """Check system resource health."""
        start_time = time.time()
        component = "System Resources"
        
        try:
            # Get system metrics
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            disk = psutil.disk_usage('/')
            
            # Process-specific metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            process_cpu = process.cpu_percent()
            
            details = {
                "memory": {
                    "total_gb": round(memory.total / 1024 / 1024 / 1024, 2),
                    "used_gb": round(memory.used / 1024 / 1024 / 1024, 2),
                    "available_gb": round(memory.available / 1024 / 1024 / 1024, 2),
                    "percent_used": memory.percent
                },
                "cpu": {
                    "system_percent": cpu_percent,
                    "process_percent": process_cpu
                },
                "disk": {
                    "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
                    "used_gb": round(disk.used / 1024 / 1024 / 1024, 2),
                    "free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
                    "percent_used": round((disk.used / disk.total) * 100, 2)
                },
                "process": {
                    "memory_mb": round(process_memory.rss / 1024 / 1024, 2),
                    "cpu_percent": process_cpu
                }
            }
            
            # Determine status based on thresholds
            warnings = []
            critical_issues = []
            
            if memory.percent > 90:
                critical_issues.append(f"Memory usage critical: {memory.percent}%")
            elif memory.percent > 80:
                warnings.append(f"Memory usage high: {memory.percent}%")
            
            if cpu_percent > 95:
                critical_issues.append(f"CPU usage critical: {cpu_percent}%")
            elif cpu_percent > 80:
                warnings.append(f"CPU usage high: {cpu_percent}%")
            
            disk_percent = (disk.used / disk.total) * 100
            if disk_percent > 95:
                critical_issues.append(f"Disk usage critical: {disk_percent:.1f}%")
            elif disk_percent > 85:
                warnings.append(f"Disk usage high: {disk_percent:.1f}%")
            
            # Determine overall status
            if critical_issues:
                status = HealthStatus.CRITICAL
                message = f"Critical system issues: {'; '.join(critical_issues)}"
            elif warnings:
                status = HealthStatus.WARNING
                message = f"System warnings: {'; '.join(warnings)}"
            else:
                status = HealthStatus.HEALTHY
                message = "System resources within normal ranges"
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                component=component,
                status=status,
                message=message,
                details=details,
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                component=component,
                status=HealthStatus.CRITICAL,
                message=f"System resource check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def check_cache_performance_health(self) -> HealthCheckResult:
        """Check cache performance health."""
        start_time = time.time()
        component = "Cache Performance"
        
        try:
            # Test cache operations
            test_key = "health_check_cache_test"
            test_data = {"timestamp": datetime.utcnow().isoformat(), "test": "performance"}
            
            # Write test
            write_start = time.time()
            await self.cache_service_instance.redis.set(test_key, json.dumps(test_data))
            write_time = (time.time() - write_start) * 1000
            
            # Read test
            read_start = time.time()
            cached_data = await self.cache_service_instance.redis.get(test_key)
            read_time = (time.time() - read_start) * 1000
            
            # Delete test
            delete_start = time.time()
            await self.cache_service_instance.redis.delete(test_key)
            delete_time = (time.time() - delete_start) * 1000
            
            # Get cache statistics
            cache_stats = await self.cache_service_instance.get_cache_stats()
            performance_metrics = await self.cache_service_instance.get_performance_metrics()
            
            details = {
                "operation_times": {
                    "write_ms": round(write_time, 2),
                    "read_ms": round(read_time, 2),
                    "delete_ms": round(delete_time, 2)
                },
                "cache_stats": cache_stats,
                "performance_metrics": performance_metrics,
                "data_integrity": json.loads(cached_data.decode()) == test_data if cached_data else False
            }
            
            # Determine status based on performance
            warnings = []
            critical_issues = []
            
            if write_time > 100:  # > 100ms for write
                critical_issues.append(f"Cache write slow: {write_time:.1f}ms")
            elif write_time > 50:
                warnings.append(f"Cache write elevated: {write_time:.1f}ms")
            
            if read_time > 50:  # > 50ms for read
                critical_issues.append(f"Cache read slow: {read_time:.1f}ms")
            elif read_time > 25:
                warnings.append(f"Cache read elevated: {read_time:.1f}ms")
            
            if not details["data_integrity"]:
                critical_issues.append("Cache data integrity failed")
            
            # Check hit ratio if available
            hit_ratio = cache_stats.get("keyspace_hits", 0) / (cache_stats.get("keyspace_hits", 0) + cache_stats.get("keyspace_misses", 1))
            if hit_ratio < 0.5:  # < 50% hit ratio
                warnings.append(f"Cache hit ratio low: {hit_ratio:.1%}")
            
            # Determine overall status
            if critical_issues:
                status = HealthStatus.CRITICAL
                message = f"Cache performance issues: {'; '.join(critical_issues)}"
            elif warnings:
                status = HealthStatus.WARNING
                message = f"Cache performance warnings: {'; '.join(warnings)}"
            else:
                status = HealthStatus.HEALTHY
                message = "Cache performing optimally"
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheckResult(
                component=component,
                status=status,
                message=message,
                details=details,
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                component=component,
                status=HealthStatus.CRITICAL,
                message=f"Cache performance check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.utcnow().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def perform_comprehensive_health_check(self) -> SystemHealthReport:
        """Perform comprehensive health check of all components."""
        logger.info("Starting comprehensive health check...")
        
        if not await self.setup_monitoring():
            return SystemHealthReport(
                overall_status=HealthStatus.CRITICAL,
                timestamp=datetime.utcnow().isoformat(),
                checks=[],
                summary={"error": "Failed to setup monitoring"}
            )
        
        try:
            # Run all health checks
            checks = await asyncio.gather(
                self.check_redis_health(),
                self.check_fred_service_health(),
                self.check_cache_performance_health(),
                return_exceptions=True
            )
            
            # Add synchronous checks
            checks.extend([
                self.check_api_endpoints_health(),
                self.check_system_resources_health()
            ])
            
            # Filter out exceptions and convert to HealthCheckResult
            valid_checks = []
            for check in checks:
                if isinstance(check, HealthCheckResult):
                    valid_checks.append(check)
                elif isinstance(check, Exception):
                    valid_checks.append(HealthCheckResult(
                        component="Unknown",
                        status=HealthStatus.CRITICAL,
                        message=f"Health check failed: {str(check)}",
                        details={"error": str(check)},
                        timestamp=datetime.utcnow().isoformat(),
                        response_time_ms=0
                    ))
            
            # Determine overall status
            critical_count = sum(1 for check in valid_checks if check.status == HealthStatus.CRITICAL)
            warning_count = sum(1 for check in valid_checks if check.status == HealthStatus.WARNING)
            healthy_count = sum(1 for check in valid_checks if check.status == HealthStatus.HEALTHY)
            
            if critical_count > 0:
                overall_status = HealthStatus.CRITICAL
            elif warning_count > 0:
                overall_status = HealthStatus.WARNING
            else:
                overall_status = HealthStatus.HEALTHY
            
            # Generate summary
            summary = {
                "total_checks": len(valid_checks),
                "healthy_count": healthy_count,
                "warning_count": warning_count,
                "critical_count": critical_count,
                "avg_response_time_ms": round(sum(check.response_time_ms for check in valid_checks) / len(valid_checks), 2) if valid_checks else 0,
                "components_checked": [check.component for check in valid_checks]
            }
            
            health_report = SystemHealthReport(
                overall_status=overall_status,
                timestamp=datetime.utcnow().isoformat(),
                checks=valid_checks,
                summary=summary
            )
            
            # Store in history
            self.health_history.append(health_report)
            
            # Keep only last 100 reports
            if len(self.health_history) > 100:
                self.health_history = self.health_history[-100:]
            
            logger.info(f"Health check completed. Overall status: {overall_status.value}")
            return health_report
            
        finally:
            await self.cleanup_monitoring()
    
    async def cleanup_monitoring(self):
        """Clean up monitoring resources."""
        try:
            if self.cache_service_instance:
                await self.cache_service_instance.close()
            if self.fred_service_instance:
                await self.fred_service_instance.close()
            logger.info("Health monitoring cleanup complete")
        except Exception as e:
            logger.error(f"Error during health monitoring cleanup: {e}")
    
    def get_health_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get health trends over specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent_reports = [
            report for report in self.health_history
            if datetime.fromisoformat(report.timestamp) >= cutoff_time
        ]
        
        if not recent_reports:
            return {"message": "No recent health data available"}
        
        # Analyze trends
        status_counts = {status.value: 0 for status in HealthStatus}
        component_trends = {}
        
        for report in recent_reports:
            status_counts[report.overall_status.value] += 1
            
            for check in report.checks:
                if check.component not in component_trends:
                    component_trends[check.component] = []
                component_trends[check.component].append({
                    "timestamp": check.timestamp,
                    "status": check.status.value,
                    "response_time_ms": check.response_time_ms
                })
        
        return {
            "time_period_hours": hours,
            "total_reports": len(recent_reports),
            "status_distribution": status_counts,
            "component_trends": component_trends,
            "latest_status": recent_reports[-1].overall_status.value if recent_reports else "unknown"
        }


# Utility functions for external use
async def quick_health_check() -> Dict[str, Any]:
    """Perform a quick health check and return results."""
    monitor = HealthMonitor()
    report = await monitor.perform_comprehensive_health_check()
    return report.to_dict()

async def monitor_system_continuously(interval_minutes: int = 5, duration_hours: int = 1) -> List[Dict[str, Any]]:
    """Monitor system continuously for specified duration."""
    monitor = HealthMonitor()
    reports = []
    
    end_time = datetime.utcnow() + timedelta(hours=duration_hours)
    
    while datetime.utcnow() < end_time:
        try:
            report = await monitor.perform_comprehensive_health_check()
            reports.append(report.to_dict())
            
            print(f"Health check at {report.timestamp}: {report.overall_status.value}")
            
            # Wait for next interval
            await asyncio.sleep(interval_minutes * 60)
            
        except KeyboardInterrupt:
            print("Monitoring stopped by user")
            break
        except Exception as e:
            print(f"Error during monitoring: {e}")
            await asyncio.sleep(30)  # Wait 30 seconds before retry
    
    return reports

if __name__ == "__main__":
    # Command line execution
    import argparse
    
    parser = argparse.ArgumentParser(description="System Health Monitoring")
    parser.add_argument("--mode", choices=["single", "continuous"], default="single", help="Monitoring mode")
    parser.add_argument("--interval", type=int, default=5, help="Check interval in minutes (for continuous mode)")
    parser.add_argument("--duration", type=int, default=1, help="Duration in hours (for continuous mode)")
    
    args = parser.parse_args()
    
    async def main():
        if args.mode == "single":
            print("Performing comprehensive health check...")
            result = await quick_health_check()
            
            print("\n" + "="*60)
            print("SYSTEM HEALTH CHECK RESULTS")
            print("="*60)
            print(f"Overall Status: {result['overall_status'].upper()}")
            print(f"Timestamp: {result['timestamp']}")
            print(f"Components Checked: {result['summary']['total_checks']}")
            print(f"Healthy: {result['summary']['healthy_count']}")
            print(f"Warnings: {result['summary']['warning_count']}")
            print(f"Critical: {result['summary']['critical_count']}")
            
            print("\nComponent Details:")
            for check in result['checks']:
                status_emoji = {"healthy": "✅", "warning": "⚠️", "critical": "❌"}.get(check['status'], "❓")
                print(f"  {status_emoji} {check['component']}: {check['message']} ({check['response_time_ms']}ms)")
        
        else:
            print(f"Starting continuous monitoring for {args.duration} hours...")
            print(f"Check interval: {args.interval} minutes")
            reports = await monitor_system_continuously(args.interval, args.duration)
            
            print(f"\nCompleted {len(reports)} health checks")
            if reports:
                final_status = reports[-1]['overall_status']
                print(f"Final status: {final_status}")
    
    asyncio.run(main())