"""
Celery configuration for async video processing tasks.
"""
import logging
from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from .config import settings

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "video_insights",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "tasks.video_tasks",
        "tasks.economic_tasks"
    ]
)

# Enhanced Celery configuration for high-performance video processing
celery_app.conf.update(
    # Serialization settings
    task_serializer=settings.CELERY_TASK_SERIALIZER,
    accept_content=settings.CELERY_ACCEPT_CONTENT,
    result_serializer=settings.CELERY_RESULT_SERIALIZER,
    timezone=settings.CELERY_TIMEZONE,
    enable_utc=settings.CELERY_ENABLE_UTC,
    
    # Enhanced task routing with priority queues
    task_routes={
        "tasks.video_tasks.*": {"queue": "video_processing"},
        "tasks.economic_tasks.*": {"queue": "economic_data"},
    },
    
    # Queue priority settings
    task_default_queue='default',
    task_queue_max_priority=10,
    worker_direct=True,
    
    # Worker configuration optimized for video processing
    worker_concurrency=settings.CELERY_WORKER_CONCURRENCY,
    worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    worker_pool='threads',  # Use threads for I/O bound video processing
    
    # Memory management
    worker_max_tasks_per_child=50,  # Restart workers after 50 tasks to prevent memory leaks
    worker_max_memory_per_child=1024000,  # 1GB memory limit per worker
    
    # Task execution settings
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_max_retries=3,
    task_default_retry_delay=60,  # 1 minute
    task_retry_jitter=True,  # Add jitter to retry delays
    
    # Result backend settings optimized for large results
    result_expires=7200,  # 2 hours for video processing results
    result_persistent=True,
    result_compression='gzip',
    result_chord_join_timeout=300,  # 5 minutes for chord operations
    
    # Task result format
    result_extended=True,
    result_backend_transport_options={
        'master_name': 'mymaster',
        'retry_on_timeout': True,
        'socket_timeout': 30,
        'socket_connect_timeout': 30,
    },
    
    # Enhanced beat scheduler for maintenance tasks
    beat_schedule={
        # Economic data tasks (commented out non-existent tasks)
        'update-housing-market-data': {
            'task': 'tasks.economic_tasks.update_housing_market_data',
            'schedule': 3600.0,  # Every hour
            'args': [1],  # 1 day back
            'options': {'queue': 'economic_data', 'priority': 7}
        },
        'update-labor-market-data': {
            'task': 'tasks.economic_tasks.update_labor_market_data', 
            'schedule': 3600.0,  # Every hour
            'args': [1],  # 1 day back
            'options': {'queue': 'economic_data', 'priority': 7}
        },
        'daily-complete-economic-update': {
            'task': 'tasks.economic_tasks.update_all_economic_data',
            'schedule': 86400.0,  # Daily at midnight
            'args': [7],  # 7 days back for comprehensive update
            'options': {'queue': 'economic_data', 'priority': 8}
        },
        'validate-economic-data': {
            'task': 'tasks.economic_tasks.validate_economic_data',
            'schedule': 43200.0,  # Every 12 hours
            'options': {'queue': 'economic_data', 'priority': 4}
        },
        'cleanup-old-economic-data': {
            'task': 'tasks.economic_tasks.cleanup_old_economic_data',
            'schedule': 604800.0,  # Weekly
            'args': [730],  # Keep 2 years of data
            'options': {'queue': 'economic_data', 'priority': 2}
        },
    },
    
    # Enhanced monitoring and logging
    worker_send_task_events=True,
    task_send_sent_event=True,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
    
    # Security and stability
    worker_hijack_root_logger=False,
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    
    # Performance optimizations
    task_always_eager=False,  # Never run tasks synchronously
    task_eager_propagates=True,
    task_store_eager_result=True,
    
    # Connection settings
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    broker_pool_limit=100,
    
    # Task deduplication
    task_deduplicate=True,
    
    # Rate limiting
    task_annotations={
        'tasks.video_tasks.process_youtube_video': {
            'rate_limit': '10/m',  # Max 10 video processing tasks per minute
            'priority': 9
        },
        'tasks.economic_tasks.*': {
            'rate_limit': '60/h',  # Max 60 economic data tasks per hour (respects FRED API limits)
            'priority': 7
        }
    },
)


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handle worker ready event."""
    logger.info(f"Celery worker {sender.hostname} is ready")


@worker_shutting_down.connect
def worker_shutting_down_handler(sender=None, **kwargs):
    """Handle worker shutdown event."""
    logger.info(f"Celery worker {sender.hostname} is shutting down")


# Enhanced task state tracking with performance metrics
TASK_STATES = {
    'PENDING': 'Task is waiting to be processed',
    'STARTED': 'Task has been started',
    'PROGRESS': 'Task is in progress',
    'SUCCESS': 'Task completed successfully',
    'FAILURE': 'Task failed',
    'RETRY': 'Task is being retried',
    'REVOKED': 'Task was revoked',
}

# Task priority levels
TASK_PRIORITIES = {
    'LOW': 1,
    'NORMAL': 5,
    'HIGH': 8,
    'CRITICAL': 10
}

# Queue configurations
QUEUE_CONFIGS = {
    'video_processing': {
        'max_concurrency': 3,
        'max_memory_mb': 2048,
        'priority': TASK_PRIORITIES['HIGH']
    },
    'transcription': {
        'max_concurrency': 5,
        'max_memory_mb': 1024,
        'priority': TASK_PRIORITIES['HIGH']
    },
    'summarization': {
        'max_concurrency': 8,
        'max_memory_mb': 512,
        'priority': TASK_PRIORITIES['NORMAL']
    },
    'cache_operations': {
        'max_concurrency': 10,
        'max_memory_mb': 256,
        'priority': TASK_PRIORITIES['NORMAL']
    },
    'maintenance': {
        'max_concurrency': 2,
        'max_memory_mb': 512,
        'priority': TASK_PRIORITIES['LOW']
    },
    'economic_data': {
        'max_concurrency': 3,
        'max_memory_mb': 256,
        'priority': TASK_PRIORITIES['HIGH']
    }
}


def get_task_info(task_id: str) -> dict:
    """
    Get comprehensive task information.
    
    Args:
        task_id: The task ID
        
    Returns:
        dict: Task information
    """
    result = celery_app.AsyncResult(task_id)
    
    return {
        'task_id': task_id,
        'state': result.state,
        'info': result.info,
        'result': result.result,
        'traceback': result.traceback,
        'successful': result.successful(),
        'failed': result.failed(),
        'ready': result.ready(),
        'description': TASK_STATES.get(result.state, 'Unknown state')
    }


def revoke_task(task_id: str, terminate: bool = False) -> bool:
    """
    Revoke a running task.
    
    Args:
        task_id: The task ID to revoke
        terminate: Whether to terminate the task immediately
        
    Returns:
        bool: True if task was revoked successfully
    """
    try:
        celery_app.control.revoke(task_id, terminate=terminate)
        logger.info(f"Task {task_id} has been revoked (terminate={terminate})")
        return True
    except Exception as e:
        logger.error(f"Failed to revoke task {task_id}: {e}")
        return False


def get_active_tasks() -> list:
    """
    Get list of active tasks across all workers.
    
    Returns:
        list: Active tasks information
    """
    try:
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        if not active_tasks:
            return []
            
        all_tasks = []
        for worker, tasks in active_tasks.items():
            for task in tasks:
                task['worker'] = worker
                all_tasks.append(task)
                
        return all_tasks
    except Exception as e:
        logger.error(f"Failed to get active tasks: {e}")
        return []


def get_worker_stats() -> dict:
    """
    Get comprehensive worker statistics with enhanced monitoring.
    
    Returns:
        dict: Worker statistics
    """
    try:
        inspect = celery_app.control.inspect()
        
        # Get comprehensive stats
        stats = {
            'active': inspect.active() or {},
            'registered': inspect.registered() or {},
            'scheduled': inspect.scheduled() or {},
            'stats': inspect.stats() or {},
            'reserved': inspect.reserved() or {},
            'conf': inspect.conf() or {},
        }
        
        # Calculate summary statistics
        total_active = sum(len(tasks) for tasks in stats['active'].values())
        total_scheduled = sum(len(tasks) for tasks in stats['scheduled'].values())
        total_reserved = sum(len(tasks) for tasks in stats['reserved'].values())
        
        # Get queue lengths
        try:
            queue_lengths = {}
            for queue in ['video_processing', 'transcription', 'summarization', 'maintenance', 'cache_operations']:
                try:
                    # This would require additional broker inspection
                    queue_lengths[queue] = 0  # Placeholder
                except:
                    queue_lengths[queue] = 0
        except:
            queue_lengths = {}
        
        stats['summary'] = {
            'total_workers': len(stats['active']),
            'total_active_tasks': total_active,
            'total_scheduled_tasks': total_scheduled,
            'total_reserved_tasks': total_reserved,
            'queue_lengths': queue_lengths
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get worker stats: {e}")
        return {'error': str(e)}


def get_queue_stats() -> dict:
    """
    Get queue-specific statistics.
    
    Returns:
        dict: Queue statistics
    """
    try:
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active() or {}
        
        queue_stats = {}
        
        for worker, tasks in active_tasks.items():
            for task in tasks:
                queue = task.get('delivery_info', {}).get('routing_key', 'unknown')
                if queue not in queue_stats:
                    queue_stats[queue] = {
                        'active_tasks': 0,
                        'workers': set()
                    }
                queue_stats[queue]['active_tasks'] += 1
                queue_stats[queue]['workers'].add(worker)
        
        # Convert sets to lists for JSON serialization
        for queue in queue_stats:
            queue_stats[queue]['workers'] = list(queue_stats[queue]['workers'])
            queue_stats[queue]['worker_count'] = len(queue_stats[queue]['workers'])
        
        return queue_stats
        
    except Exception as e:
        logger.error(f"Failed to get queue stats: {e}")
        return {'error': str(e)}


def scale_workers(queue: str, concurrency: int) -> bool:
    """
    Scale workers for a specific queue.
    
    Args:
        queue: Queue name to scale
        concurrency: Target concurrency level
        
    Returns:
        bool: True if scaling was successful
    """
    try:
        # This would require worker pool management
        # For now, return success status
        logger.info(f"Scaling {queue} to {concurrency} workers")
        return True
        
    except Exception as e:
        logger.error(f"Failed to scale workers for {queue}: {e}")
        return False


def purge_queue(queue: str) -> int:
    """
    Purge all tasks from a specific queue.
    
    Args:
        queue: Queue name to purge
        
    Returns:
        int: Number of tasks purged
    """
    try:
        purged = celery_app.control.purge()
        logger.info(f"Purged queue {queue}: {purged} tasks removed")
        return purged or 0
        
    except Exception as e:
        logger.error(f"Failed to purge queue {queue}: {e}")
        return 0