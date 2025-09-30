"""
FRED (Federal Reserve Economic Data) API Service for Economic Data Integration.

This service provides asynchronous access to economic data from the Federal Reserve
Bank of St. Louis, using the fredapi package with rate limiting, caching, error handling,
and database integration for housing and labor market data.
"""

import asyncio
import json
import logging
import hashlib
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from fredapi import Fred
from sqlalchemy import select, and_
from core.database import async_session_maker
from core.config import settings
from services.cache_service import cache_service

logger = logging.getLogger(__name__)

class FREDSeriesFrequency:
    """FRED series frequency types for cache optimization."""
    DAILY = "d"
    WEEKLY = "w"
    MONTHLY = "m"
    QUARTERLY = "q"
    ANNUAL = "a"

@dataclass
class FREDDataPoint:
    """Single FRED data observation."""
    date: str
    value: Union[float, None]
    realtime_start: Optional[str] = None
    realtime_end: Optional[str] = None

@dataclass
class FREDSeriesInfo:
    """FRED series metadata information."""
    id: str
    title: str
    units: str
    frequency: str
    last_updated: str
    observation_start: str
    observation_end: str
    notes: Optional[str] = None
    seasonal_adjustment: Optional[str] = None

@dataclass
class FREDApiResponse:
    """FRED API response structure."""
    realtime_start: str
    realtime_end: str
    observation_start: str
    observation_end: str
    units: str
    count: int
    observations: List[FREDDataPoint]

class FREDRateLimiter:
    """Rate limiter for FRED API requests (120/hour)."""

    def __init__(self, max_requests: int = 120, time_window: int = 3600):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self.lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire rate limit token."""
        async with self.lock:
            now = datetime.utcnow()

            # Remove old requests outside time window
            cutoff = now - timedelta(seconds=self.time_window)
            self.requests = [
                req_time for req_time in self.requests if req_time > cutoff
            ]

            # Check if we can make request
            if len(self.requests) >= self.max_requests:
                # Calculate wait time
                oldest_request = min(self.requests)
                wait_until = oldest_request + timedelta(seconds=self.time_window)
                wait_seconds = (wait_until - now).total_seconds()

                if wait_seconds > 0:
                    logger.warning(
                        f"FRED API rate limit reached. Waiting {wait_seconds:.1f} seconds..."
                    )
                    await asyncio.sleep(wait_seconds)
                    # Retry after waiting
                    return await self.acquire()

            # Record this request
            self.requests.append(now)

            # Add minimum delay between requests (500ms)
            await asyncio.sleep(0.5)

class FREDService:
    """FRED API Service using fredapi package with caching and database integration."""

    # Housing Market Series IDs
    HOUSING_SERIES = {
        'CASE_SHILLER': 'CSUSHPINSA',      # Case-Shiller U.S. National Home Price Index
        'HOUSING_STARTS': 'HOUST',          # Housing Starts: Total: New Privately Owned
        'MONTHS_SUPPLY': 'MSACSR',          # Monthly Supply of Houses
        'NEW_HOME_SALES': 'HSN1F',          # New One Family Houses Sold
        'EXISTING_HOME_SALES': 'EXHOSLUSM495S',  # Existing Home Sales
        'HOUSING_PERMITS': 'PERMIT',        # New Private Housing Units Authorized
        'MORTGAGE_RATES': 'MORTGAGE30US',   # 30-Year Fixed Rate Mortgage Average
        'HOUSE_PRICE_INDEX': 'USSTHPI'      # All-Transactions House Price Index
    }

    # Employment Series IDs
    EMPLOYMENT_SERIES = {
        'UNEMPLOYMENT_RATE': 'UNRATE',      # Unemployment Rate
        'NONFARM_PAYROLLS': 'PAYEMS',       # All Employees, Total Nonfarm
        'INITIAL_CLAIMS': 'ICSA',           # Initial Claims
        'CONTINUED_CLAIMS': 'CCSA',         # Continued Claims
        'CLAIMS_4WK_AVG': 'IC4WSA',         # 4-Week Moving Average
        'LABOR_PARTICIPATION': 'CIVPART',   # Labor Force Participation Rate
        'EMPLOYMENT_POPULATION': 'EMRATIO',  # Employment-Population Ratio
        'UNEMPLOYED': 'UNEMPLOY',           # Unemployed
        'JOB_OPENINGS': 'JTSJOL',           # Job Openings: Total Nonfarm
        'QUITS_RATE': 'JTSQUR'              # Quits: Total Nonfarm
    }

    def __init__(self):
        """Initialize FRED service with fredapi client and rate limiting."""
        self.api_key = self._get_api_key()
        self.fred_client: Optional[Fred] = None
        self.rate_limiter = FREDRateLimiter()
        self.executor = ThreadPoolExecutor(max_workers=4)  # For async execution

        # FRED API configuration
        self.base_url = "https://api.stlouisfed.org/fred"

        # Cache TTL settings
        self.DAILY_CACHE_TTL = 60 * 60 * 24      # 24 hours for daily data
        self.WEEKLY_CACHE_TTL = 60 * 60 * 12     # 12 hours for weekly data
        self.MONTHLY_CACHE_TTL = 60 * 60 * 6     # 6 hours for monthly data
        self.METADATA_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days for metadata

        # Error tracking
        self.error_count = 0
        self.last_error_time = None

    def _get_api_key(self) -> str:
        """Get FRED API key from settings configuration."""
        api_key = settings.FRED_API_KEY
        if not api_key:
            logger.warning(
                "FRED_API_KEY not configured in settings. "
                "Please set FRED_API_KEY in your .env file or configuration."
            )
            raise ValueError("FRED_API_KEY is required for FRED service functionality")
        return api_key

    @property
    def is_enabled(self) -> bool:
        """Check if FRED service is enabled (has valid API key)."""
        try:
            return bool(self.api_key)
        except ValueError:
            return False

    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def _ensure_client(self) -> None:
        """Ensure FRED client is available."""
        if self.fred_client is None:
            try:
                # Initialize fredapi client in thread pool to avoid blocking
                self.fred_client = await asyncio.get_event_loop().run_in_executor(
                    self.executor, lambda: Fred(api_key=self.api_key)
                )
                logger.info("FRED client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize FRED client: {e}")
                raise

    async def close(self) -> None:
        """Close thread pool executor."""
        if self.executor:
            self.executor.shutdown(wait=True)

    def _get_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generate cache key for API request."""
        # Create deterministic hash from endpoint and params
        param_str = json.dumps(params, sort_keys=True)
        cache_input = f"{endpoint}:{param_str}"
        return f"fred_api:{hashlib.md5(cache_input.encode()).hexdigest()}"

    def _determine_cache_ttl(self, series_id: str) -> int:
        """Determine appropriate cache TTL based on series frequency."""
        # Weekly series get shorter cache
        weekly_series = ['ICSA', 'CCSA', 'IC4WSA']
        if series_id in weekly_series:
            return self.WEEKLY_CACHE_TTL

        # Monthly series get medium cache
        monthly_series = ['HOUST', 'MSACSR', 'HSN1F', 'UNRATE', 'PAYEMS', 'CIVPART']
        if series_id in monthly_series:
            return self.MONTHLY_CACHE_TTL

        # Default to daily cache
        return self.DAILY_CACHE_TTL

    def _pandas_series_to_datapoints(
        self, series: pd.Series, series_id: str
    ) -> List[FREDDataPoint]:
        """Convert pandas Series from fredapi to FREDDataPoint list."""
        data_points = []
        for date_index, value in series.items():
            # Handle NaN values
            if pd.isna(value):
                continue

            data_points.append(FREDDataPoint(
                date=date_index.strftime('%Y-%m-%d'),
                value=float(value),
                realtime_start=None,  # fredapi doesn't provide realtime info by default
                realtime_end=None
            ))

        return data_points

    async def _fetch_series_with_fredapi(
        self,
        series_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        sort_order: str = 'asc'
    ) -> List[FREDDataPoint]:
        """Fetch series data using fredapi with async execution."""
        # Check cache first
        cache_params = {
            'series_id': series_id,
            'start_date': start_date or '',
            'end_date': end_date or '',
            'limit': limit or 0,
            'sort_order': sort_order
        }
        cache_key = self._get_cache_key('series_data', cache_params)

        # Try to get from cache
        try:
            if await cache_service._ensure_connection():
                cached_data = await cache_service.redis.get(cache_key)
                if cached_data:
                    if isinstance(cached_data, bytes):
                        cached_data = cached_data.decode('utf-8')
                    cached_points = json.loads(cached_data)
                    logger.debug(f"Cache hit for FRED series: {series_id}")
                    return [
                        FREDDataPoint(
                            date=point['date'],
                            value=point['value'],
                            realtime_start=point.get('realtime_start'),
                            realtime_end=point.get('realtime_end')
                        ) for point in cached_points
                    ]
        except Exception as cache_error:
            logger.warning(f"Redis cache read failed: {cache_error}")

        # Rate limiting
        await self.rate_limiter.acquire()

        # Ensure client exists
        await self._ensure_client()

        try:
            logger.debug(f"Fetching FRED series {series_id} with fredapi")

            # Execute fredapi call in thread pool
            def fetch_series():
                kwargs = {}
                if start_date:
                    kwargs['observation_start'] = start_date
                if end_date:
                    kwargs['observation_end'] = end_date
                if limit:
                    kwargs['limit'] = limit

                series_data = self.fred_client.get_series(series_id, **kwargs)

                # Sort if needed
                if sort_order == 'desc':
                    series_data = series_data.sort_index(ascending=False)

                return series_data

            # Run in executor
            series_data = await asyncio.get_event_loop().run_in_executor(
                self.executor, fetch_series
            )

            # Convert to our format
            data_points = self._pandas_series_to_datapoints(series_data, series_id)

            # Cache the results
            cache_ttl = self._determine_cache_ttl(series_id)
            try:
                if await cache_service._ensure_connection():
                    cache_data = [
                        {
                            'date': point.date,
                            'value': point.value,
                            'realtime_start': point.realtime_start,
                            'realtime_end': point.realtime_end
                        } for point in data_points
                    ]
                    await cache_service.redis.setex(
                        cache_key,
                        cache_ttl,
                        json.dumps(cache_data)
                    )
            except Exception as cache_error:
                logger.warning(f"Redis cache write failed: {cache_error}")

            logger.info(
                f"Successfully retrieved {len(data_points)} observations for series: {series_id}")
            return data_points

        except Exception as e:
            self.error_count += 1
            self.last_error_time = datetime.utcnow()
            logger.error(f"Error fetching FRED series {series_id} with fredapi: {e}")
            raise

    async def fetch_series_data(
        self,
        series_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        sort_order: str = 'asc'
    ) -> List[FREDDataPoint]:
        """
        Fetch time series data from FRED API using fredapi.

        Args:
            series_id: FRED series identifier
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of observations
            offset: Offset for pagination (Note: fredapi doesn't support offset)
            sort_order: 'asc' or 'desc'

        Returns:
            List of FREDDataPoint objects

        Raises:
            Exception: If API request fails or data is invalid
        """
        if not self.is_enabled:
            logger.warning(f"FRED service disabled - returning empty data for {series_id}")
            return []

        try:
            # Use the new fredapi-based method
            data_points = await self._fetch_series_with_fredapi(
                series_id=series_id,
                start_date=start_date,
                end_date=end_date,
                limit=limit,
                sort_order=sort_order
            )

            # Handle offset manually if specified (since fredapi doesn't support offset)
            if offset and offset > 0:
                if offset < len(data_points):
                    data_points = data_points[offset:]
                else:
                    data_points = []

            return data_points

        except Exception as e:
            logger.error(f"Error fetching FRED series {series_id}: {e}")
            raise

    async def fetch_series_info(self, series_id: str) -> FREDSeriesInfo:
        """
        Fetch metadata for a FRED series using fredapi.

        Args:
            series_id: FRED series identifier

        Returns:
            FREDSeriesInfo object with series metadata

        Raises:
            Exception: If API request fails or series not found
        """
        if not self.is_enabled:
            logger.warning(f"FRED service disabled - returning default info for {series_id}")
            return FREDSeriesInfo(
                id=series_id,
                title=f"Series {series_id} (FRED service disabled)",
                units="N/A",
                frequency="N/A",
                last_updated="N/A",
                observation_start="N/A",
                observation_end="N/A",
                notes="FRED service disabled - no API key configured"
            )

        try:
            # Ensure client exists
            await self._ensure_client()

            # Execute fredapi call in thread pool
            def fetch_info():
                return self.fred_client.get_series_info(series_id)

            # Run in executor
            series_info = await asyncio.get_event_loop().run_in_executor(
                self.executor, fetch_info
            )

            # Convert pandas Series to our format
            if series_info is None or len(series_info) == 0:
                raise Exception(f"Series not found: {series_id}")

            return FREDSeriesInfo(
                id=str(series_info.get('id', series_id)),
                title=str(series_info.get('title', f'Series {series_id}')),
                units=str(series_info.get('units', 'Unknown')),
                frequency=str(series_info.get('frequency', 'Unknown')),
                last_updated=str(series_info.get('last_updated', 'Unknown')),
                observation_start=str(series_info.get('observation_start', 'Unknown')),
                observation_end=str(series_info.get('observation_end', 'Unknown')),
                notes=str(series_info.get('notes', '')),
                seasonal_adjustment=str(series_info.get('seasonal_adjustment', ''))
            )

        except Exception as e:
            logger.error(f"Error fetching FRED series info for {series_id}: {e}")
            raise

    async def fetch_housing_market_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Dict[str, List[FREDDataPoint]]:
        """
        Fetch all housing market data series.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of observations per series

        Returns:
            Dictionary mapping series names to data points
        """
        if not self.is_enabled:
            logger.warning("FRED service disabled - returning empty housing market data")
            return {}

        logger.info("Fetching comprehensive housing market data from FRED...")

        tasks = []
        for series_name, series_id in self.HOUSING_SERIES.items():
            task = self.fetch_series_data(
                series_id=series_id,
                start_date=start_date,
                end_date=end_date,
                limit=limit
            )
            tasks.append((series_name, task))

        results = {}
        for series_name, task in tasks:
            try:
                data = await task
                results[series_name] = data
            except Exception as e:
                logger.error(f"Error fetching housing series {series_name}: {e}")
                results[series_name] = []

        return results

    async def fetch_labor_market_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Dict[str, List[FREDDataPoint]]:
        """
        Fetch all labor market data series.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            limit: Maximum number of observations per series

        Returns:
            Dictionary mapping series names to data points
        """
        if not self.is_enabled:
            logger.warning("FRED service disabled - returning empty labor market data")
            return {}

        logger.info("Fetching comprehensive labor market data from FRED...")

        tasks = []
        for series_name, series_id in self.EMPLOYMENT_SERIES.items():
            task = self.fetch_series_data(
                series_id=series_id,
                start_date=start_date,
                end_date=end_date,
                limit=limit
            )
            tasks.append((series_name, task))

        results = {}
        for series_name, task in tasks:
            try:
                data = await task
                results[series_name] = data
            except Exception as e:
                logger.error(f"Error fetching labor series {series_name}: {e}")
                results[series_name] = []

        return results

    async def update_series_data(
        self,
        series_id: str,
        category: str,  # 'housing' or 'labor_market'
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Update database with latest series data.

        Args:
            series_id: FRED series identifier
            category: Category of series ('housing' or 'labor_market')
            days_back: How many days back to fetch data

        Returns:
            Dictionary with update results
        """
        from backend.models.database import EconomicSeries, EconomicDataPoint

        # Calculate start date
        start_date = (datetime.utcnow() - timedelta(days=days_back)).strftime('%Y-%m-%d')

        try:
            # Fetch latest data
            data_points = await self.fetch_series_data(
                series_id=series_id,
                start_date=start_date,
                sort_order='desc'
            )

            if not data_points:
                return {
                    'series_id': series_id,
                    'updated_count': 0,
                    'skipped_count': 0,
                    'error': 'No data retrieved'
                }

            # Get or create series info
            try:
                series_info = await self.fetch_series_info(series_id)
            except Exception as e:
                logger.warning(f"Could not fetch series info for {series_id}: {e}")
                series_info = None

            updated_count = 0
            skipped_count = 0

            async with async_session_maker() as session:
                # Ensure series exists in database
                series_stmt = select(EconomicSeries).where(EconomicSeries.series_id == series_id)
                series_result = await session.execute(series_stmt)
                db_series = series_result.scalar_one_or_none()

                if not db_series:
                    # Create new series record
                    db_series = EconomicSeries(
                        series_id=series_id,
                        name=series_info.title if series_info else f"Series {series_id}",
                        description=series_info.notes if series_info else None,
                        category=category,
                        frequency=self._map_frequency(
                            series_info.frequency if series_info else "unknown"),
                        units=series_info.units if series_info else "Unknown",
                        seasonal_adjustment=self._detect_seasonal_adjustment(series_id)
                    )
                    session.add(db_series)
                    await session.flush()  # Get the ID

                # Update series data points
                for data_point in data_points:
                    # Parse observation date
                    obs_date = datetime.strptime(data_point.date, '%Y-%m-%d')

                    # Check if data point already exists
                    existing_stmt = select(EconomicDataPoint).where(
                        and_(
                            EconomicDataPoint.series_id == db_series.id,
                            EconomicDataPoint.observation_date == obs_date
                        )
                    )
                    existing_result = await session.execute(existing_stmt)
                    existing_point = existing_result.scalar_one_or_none()

                    # Convert value to string (as stored in DB) and numeric
                    value_str = str(data_point.value) if data_point.value is not None else "."
                    numeric_value = int(data_point.value) if data_point.value is not None else None

                    if existing_point:
                        # Update existing point if value changed
                        if existing_point.value != value_str:
                            existing_point.value = value_str
                            existing_point.numeric_value = numeric_value
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        # Create new data point
                        new_point = EconomicDataPoint(
                            series_id=db_series.id,
                            observation_date=obs_date,
                            value=value_str,
                            numeric_value=numeric_value,
                            is_preliminary=False  # FRED data is usually final
                        )
                        session.add(new_point)
                        updated_count += 1

                # Update series timestamp
                db_series.updated_at = datetime.utcnow()

                await session.commit()

                logger.info(
                    f"Updated series {series_id}: {updated_count} new/updated, "
                    f"{skipped_count} skipped"
                )

                return {
                    'series_id': series_id,
                    'updated_count': updated_count,
                    'skipped_count': skipped_count,
                    'latest_date': data_points[0].date if data_points else None
                }

        except Exception as e:
            logger.error(f"Error updating series data for {series_id}: {e}")
            return {
                'series_id': series_id,
                'updated_count': 0,
                'skipped_count': 0,
                'error': str(e)
            }

    def _map_frequency(self, fred_frequency: str) -> str:
        """Map FRED frequency to our database enum values."""
        frequency_map = {
            'Daily': 'daily',
            'Weekly': 'weekly',
            'Monthly': 'monthly',
            'Quarterly': 'quarterly',
            'Annual': 'annual',
            'Semiannual': 'annual'
        }
        return frequency_map.get(fred_frequency, 'monthly')

    def _detect_seasonal_adjustment(self, series_id: str) -> bool:
        """Detect if series is seasonally adjusted based on series ID."""
        # Series ending with 'SA' are usually seasonally adjusted
        return series_id.endswith('SA') or series_id.endswith('NSA')

    async def get_latest_indicators(self) -> Dict[str, Dict[str, Any]]:
        """
        Get latest values for key economic indicators.

        Returns:
            Dictionary with housing and labor market indicators
        """
        logger.info("Fetching latest economic indicators...")

        # Get latest data for key series (1 observation each)
        key_series = {
            'housing': {
                'case_shiller': self.HOUSING_SERIES['CASE_SHILLER'],
                'housing_starts': self.HOUSING_SERIES['HOUSING_STARTS'],
                'mortgage_rates': self.HOUSING_SERIES['MORTGAGE_RATES']
            },
            'labor': {
                'unemployment_rate': self.EMPLOYMENT_SERIES['UNEMPLOYMENT_RATE'],
                'nonfarm_payrolls': self.EMPLOYMENT_SERIES['NONFARM_PAYROLLS'],
                'initial_claims': self.EMPLOYMENT_SERIES['INITIAL_CLAIMS']
            }
        }

        results = {'housing': {}, 'labor': {}}

        for category, series_dict in key_series.items():
            for indicator_name, series_id in series_dict.items():
                try:
                    data = await self.fetch_series_data(
                        series_id=series_id,
                        limit=1,
                        sort_order='desc'
                    )

                    if data:
                        latest_point = data[0]
                        results[category][indicator_name] = {
                            'value': latest_point.value,
                            'date': latest_point.date,
                            'series_id': series_id
                        }
                    else:
                        results[category][indicator_name] = {
                            'value': None,
                            'date': None,
                            'series_id': series_id,
                            'error': 'No data available'
                        }

                except Exception as e:
                    logger.error(f"Error fetching latest {indicator_name}: {e}")
                    results[category][indicator_name] = {
                        'value': None,
                        'date': None,
                        'series_id': series_id,
                        'error': str(e)
                    }

        return results

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check of FRED service.

        Returns:
            Dictionary with health status information
        """
        health_info = {
            'status': 'healthy',
            'api_key_configured': self.is_enabled,
            'error_count': self.error_count,
            'last_error_time': self.last_error_time.isoformat() if self.last_error_time else None,
            'fredapi_client_active': self.fred_client is not None,
            'using_fredapi': True
        }

        # Test API connectivity with a simple request
        try:
            test_data = await self.fetch_series_data('UNRATE', limit=1)
            health_info['api_connectivity'] = len(test_data) > 0
            health_info['last_test_time'] = datetime.utcnow().isoformat()
        except Exception as e:
            health_info['status'] = 'unhealthy'
            health_info['api_connectivity'] = False
            health_info['api_error'] = str(e)

        return health_info

# Global service instance (lazy initialization to avoid import-time API key requirement)
_fred_service_instance = None

def get_fred_service() -> FREDService:
    """Get the global FRED service instance with lazy initialization."""
    global _fred_service_instance
    if _fred_service_instance is None:
        _fred_service_instance = FREDService()
    return _fred_service_instance

# Create a class that provides lazy access to the service

class _FREDServiceProxy:
    """Proxy class for lazy FRED service initialization."""

    def __getattr__(self, name):
        return getattr(get_fred_service(), name)

    def __call__(self, *args, **kwargs):
        return get_fred_service()(*args, **kwargs)

# For backward compatibility - this won't initialize until actually used
fred_service = _FREDServiceProxy()

