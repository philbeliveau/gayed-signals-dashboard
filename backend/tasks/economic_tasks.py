"""
Celery tasks for automated economic data updates from FRED API.
"""

import asyncio
import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta

from celery import Task, current_task
from sqlalchemy.ext.asyncio import AsyncSession

from core.celery_app import celery_app
from core.database import async_session_maker
from services.fred_service import fred_service
from models.database import EconomicSeries, EconomicDataPoint

logger = logging.getLogger(__name__)


class EconomicDataTask(Task):
    """Custom task class for economic data processing with progress tracking."""
    
    def update_progress(self, current: int, total: int, status: str = "processing"):
        """Update task progress."""
        progress = int((current / total) * 100) if total > 0 else 0
        self.update_state(
            state='PROGRESS',
            meta={
                'current': current,
                'total': total,
                'status': status,
                'progress': progress
            }
        )


@celery_app.task(bind=True, base=EconomicDataTask, name="update_housing_market_data")
def update_housing_market_data(self, days_back: int = 7) -> Dict[str, Any]:
    """
    Update housing market data from FRED API.
    
    Args:
        days_back: Number of days back to fetch data
        
    Returns:
        Dictionary with update results
    """
    try:
        logger.info(f"Starting housing market data update (last {days_back} days)")
        
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def update_housing_data():
                async with fred_service:
                    housing_series = fred_service.HOUSING_SERIES
                    total_series = len(housing_series)
                    
                    results = []
                    
                    for i, (series_name, series_id) in enumerate(housing_series.items()):
                        self.update_progress(
                            i + 1, 
                            total_series, 
                            f"Updating {series_name} ({series_id})"
                        )
                        
                        try:
                            result = await fred_service.update_series_data(
                                series_id=series_id,
                                category="housing",
                                days_back=days_back
                            )
                            results.append({
                                'series_name': series_name,
                                'series_id': series_id,
                                **result
                            })
                            
                        except Exception as e:
                            logger.error(f"Error updating housing series {series_name}: {e}")
                            results.append({
                                'series_name': series_name,
                                'series_id': series_id,
                                'error': str(e),
                                'updated_count': 0,
                                'skipped_count': 0
                            })
                    
                    return results
            
            results = loop.run_until_complete(update_housing_data())
            
            # Calculate summary statistics
            total_updated = sum(r.get('updated_count', 0) for r in results)
            total_skipped = sum(r.get('skipped_count', 0) for r in results)
            total_errors = sum(1 for r in results if 'error' in r)
            
            logger.info(f"Housing market data update completed: {total_updated} updated, {total_skipped} skipped, {total_errors} errors")
            
            return {
                'status': 'success',
                'task_type': 'housing_market_update',
                'total_updated': total_updated,
                'total_skipped': total_skipped,
                'total_errors': total_errors,
                'series_results': results,
                'completed_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in housing market data update: {e}")
        raise Exception(f"Housing market data update failed: {str(e)}")


@celery_app.task(bind=True, base=EconomicDataTask, name="update_labor_market_data")
def update_labor_market_data(self, days_back: int = 7) -> Dict[str, Any]:
    """
    Update labor market data from FRED API.
    
    Args:
        days_back: Number of days back to fetch data
        
    Returns:
        Dictionary with update results
    """
    try:
        logger.info(f"Starting labor market data update (last {days_back} days)")
        
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def update_labor_data():
                async with fred_service:
                    employment_series = fred_service.EMPLOYMENT_SERIES
                    total_series = len(employment_series)
                    
                    results = []
                    
                    for i, (series_name, series_id) in enumerate(employment_series.items()):
                        self.update_progress(
                            i + 1, 
                            total_series, 
                            f"Updating {series_name} ({series_id})"
                        )
                        
                        try:
                            result = await fred_service.update_series_data(
                                series_id=series_id,
                                category="labor_market",
                                days_back=days_back
                            )
                            results.append({
                                'series_name': series_name,
                                'series_id': series_id,
                                **result
                            })
                            
                        except Exception as e:
                            logger.error(f"Error updating labor series {series_name}: {e}")
                            results.append({
                                'series_name': series_name,
                                'series_id': series_id,
                                'error': str(e),
                                'updated_count': 0,
                                'skipped_count': 0
                            })
                    
                    return results
            
            results = loop.run_until_complete(update_labor_data())
            
            # Calculate summary statistics
            total_updated = sum(r.get('updated_count', 0) for r in results)
            total_skipped = sum(r.get('skipped_count', 0) for r in results)
            total_errors = sum(1 for r in results if 'error' in r)
            
            logger.info(f"Labor market data update completed: {total_updated} updated, {total_skipped} skipped, {total_errors} errors")
            
            return {
                'status': 'success',
                'task_type': 'labor_market_update',
                'total_updated': total_updated,
                'total_skipped': total_skipped,
                'total_errors': total_errors,
                'series_results': results,
                'completed_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in labor market data update: {e}")
        raise Exception(f"Labor market data update failed: {str(e)}")


@celery_app.task(bind=True, base=EconomicDataTask, name="update_all_economic_data")
def update_all_economic_data(self, days_back: int = 7) -> Dict[str, Any]:
    """
    Update all economic data (housing and labor market).
    
    Args:
        days_back: Number of days back to fetch data
        
    Returns:
        Dictionary with update results
    """
    try:
        logger.info(f"Starting comprehensive economic data update (last {days_back} days)")
        
        self.update_progress(1, 3, "Updating housing market data")
        housing_result = update_housing_market_data.apply_async(
            args=[days_back],
            queue='economic_data'
        ).get()
        
        self.update_progress(2, 3, "Updating labor market data")
        labor_result = update_labor_market_data.apply_async(
            args=[days_back],
            queue='economic_data'
        ).get()
        
        self.update_progress(3, 3, "Completed")
        
        # Combine results
        total_updated = housing_result.get('total_updated', 0) + labor_result.get('total_updated', 0)
        total_skipped = housing_result.get('total_skipped', 0) + labor_result.get('total_skipped', 0)
        total_errors = housing_result.get('total_errors', 0) + labor_result.get('total_errors', 0)
        
        logger.info(f"Complete economic data update finished: {total_updated} updated, {total_skipped} skipped, {total_errors} errors")
        
        return {
            'status': 'success',
            'task_type': 'complete_economic_update',
            'total_updated': total_updated,
            'total_skipped': total_skipped,
            'total_errors': total_errors,
            'housing_result': housing_result,
            'labor_result': labor_result,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in complete economic data update: {e}")
        raise Exception(f"Complete economic data update failed: {str(e)}")


@celery_app.task(bind=True, base=EconomicDataTask, name="fetch_latest_indicators")
def fetch_latest_indicators(self) -> Dict[str, Any]:
    """
    Fetch latest economic indicators for dashboard display.
    
    Returns:
        Dictionary with latest indicator values
    """
    try:
        logger.info("Fetching latest economic indicators")
        
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def get_latest():
                async with fred_service:
                    return await fred_service.get_latest_indicators()
            
            indicators = loop.run_until_complete(get_latest())
            
            logger.info("Successfully fetched latest economic indicators")
            
            return {
                'status': 'success',
                'task_type': 'latest_indicators',
                'indicators': indicators,
                'fetched_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error fetching latest indicators: {e}")
        raise Exception(f"Latest indicators fetch failed: {str(e)}")


@celery_app.task(bind=True, base=EconomicDataTask, name="validate_economic_data")
def validate_economic_data(self) -> Dict[str, Any]:
    """
    Validate economic data integrity and check for missing data.
    
    Returns:
        Dictionary with validation results
    """
    try:
        logger.info("Starting economic data validation")
        
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def validate_data():
                from sqlalchemy import select, func, and_
                
                validation_results = {
                    'total_series': 0,
                    'total_data_points': 0,
                    'series_with_recent_data': 0,
                    'series_missing_recent_data': [],
                    'data_gaps': [],
                    'validation_errors': []
                }
                
                async with async_session_maker() as session:
                    # Count total series
                    total_series_result = await session.execute(
                        select(func.count(EconomicSeries.id))
                    )
                    validation_results['total_series'] = total_series_result.scalar()
                    
                    # Count total data points
                    total_points_result = await session.execute(
                        select(func.count(EconomicDataPoint.id))
                    )
                    validation_results['total_data_points'] = total_points_result.scalar()
                    
                    # Check for series with recent data (within last 60 days)
                    recent_cutoff = datetime.utcnow() - timedelta(days=60)
                    
                    # Get all series
                    series_result = await session.execute(select(EconomicSeries))
                    all_series = series_result.scalars().all()
                    
                    for series in all_series:
                        # Check for recent data
                        recent_data_result = await session.execute(
                            select(func.count(EconomicDataPoint.id)).where(
                                and_(
                                    EconomicDataPoint.series_id == series.id,
                                    EconomicDataPoint.observation_date >= recent_cutoff
                                )
                            )
                        )
                        recent_count = recent_data_result.scalar()
                        
                        if recent_count > 0:
                            validation_results['series_with_recent_data'] += 1
                        else:
                            validation_results['series_missing_recent_data'].append({
                                'series_id': series.series_id,
                                'name': series.name,
                                'category': series.category,
                                'last_updated': series.updated_at.isoformat() if series.updated_at else None
                            })
                
                return validation_results
            
            results = loop.run_until_complete(validate_data())
            
            logger.info(f"Economic data validation completed: {results['total_series']} series, {results['total_data_points']} data points")
            
            return {
                'status': 'success',
                'task_type': 'data_validation',
                'validation_results': results,
                'validated_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in data validation: {e}")
        raise Exception(f"Data validation failed: {str(e)}")


@celery_app.task(name="cleanup_old_economic_data")
def cleanup_old_economic_data(days_to_keep: int = 365) -> Dict[str, Any]:
    """
    Clean up old economic data points to manage database size.
    
    Args:
        days_to_keep: Number of days of data to keep
        
    Returns:
        Dictionary with cleanup results
    """
    try:
        logger.info(f"Starting cleanup of economic data older than {days_to_keep} days")
        
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def cleanup_data():
                from sqlalchemy import delete
                
                cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
                
                async with async_session_maker() as session:
                    # Delete old data points
                    delete_stmt = delete(EconomicDataPoint).where(
                        EconomicDataPoint.observation_date < cutoff_date.date()
                    )
                    
                    result = await session.execute(delete_stmt)
                    deleted_count = result.rowcount
                    
                    await session.commit()
                    
                    return deleted_count
            
            deleted_count = loop.run_until_complete(cleanup_data())
            
            logger.info(f"Economic data cleanup completed: {deleted_count} old records deleted")
            
            return {
                'status': 'success',
                'task_type': 'data_cleanup',
                'deleted_count': deleted_count,
                'cutoff_date': (datetime.utcnow() - timedelta(days=days_to_keep)).isoformat(),
                'completed_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error in data cleanup: {e}")
        raise Exception(f"Data cleanup failed: {str(e)}")


# Helper functions for manual task execution

def trigger_housing_update(days_back: int = 7) -> str:
    """Manually trigger housing market data update."""
    task = update_housing_market_data.apply_async(
        args=[days_back],
        queue='economic_data'
    )
    return task.id


def trigger_labor_update(days_back: int = 7) -> str:
    """Manually trigger labor market data update."""
    task = update_labor_market_data.apply_async(
        args=[days_back],
        queue='economic_data'
    )
    return task.id


def trigger_complete_update(days_back: int = 7) -> str:
    """Manually trigger complete economic data update."""
    task = update_all_economic_data.apply_async(
        args=[days_back],
        queue='economic_data'
    )
    return task.id


def get_task_status(task_id: str) -> Dict[str, Any]:
    """Get status of economic data task."""
    from backend.core.celery_app import get_task_info
    return get_task_info(task_id)