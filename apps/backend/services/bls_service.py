"""
Bureau of Labor Statistics (BLS) API Service for Employment Data Integration.

This service provides asynchronous access to employment data from the U.S. Bureau of Labor Statistics,
with rate limiting, caching, error handling, and integration with FRED data for comprehensive labor market analysis.
"""

import asyncio
import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

import aiohttp
from aiohttp import ClientTimeout, ClientError

from core.config import settings
from services.cache_service import cache_service

logger = logging.getLogger(__name__)


class BLSSeriesFrequency(Enum):
    """BLS series frequency types."""
    MONTHLY = "M"
    QUARTERLY = "Q"
    ANNUAL = "A"


@dataclass
class BLSDataPoint:
    """Single BLS data observation."""
    year: str
    period: str
    periodName: str
    value: Union[float, str]
    footnotes: Optional[List[Dict[str, str]]] = None


@dataclass
class BLSSeriesData:
    """BLS series data structure."""
    seriesID: str
    data: List[BLSDataPoint]


@dataclass
class BLSApiResponse:
    """BLS API response structure."""
    status: str
    responseTime: int
    message: List[str]
    Results: Dict[str, Any]


class BLSRateLimiter:
    """Rate limiter for BLS API requests (500/day for registered users)."""
    
    def __init__(self, max_requests: int = 500, time_window: int = 86400):  # 24 hours
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
            self.requests = [req_time for req_time in self.requests if req_time > cutoff]
            
            # Check if we can make request
            if len(self.requests) >= self.max_requests:
                # Calculate wait time
                oldest_request = min(self.requests)
                wait_until = oldest_request + timedelta(seconds=self.time_window)
                wait_seconds = (wait_until - now).total_seconds()
                
                if wait_seconds > 0:
                    logger.warning(f"BLS API rate limit reached. Waiting {wait_seconds:.1f} seconds...")
                    await asyncio.sleep(wait_seconds)
                    # Retry after waiting
                    return await self.acquire()
            
            # Record this request
            self.requests.append(now)
            
            # Add minimum delay between requests (200ms)
            await asyncio.sleep(0.2)


class BLSService:
    """BLS API Service with async HTTP client, caching, and integration with FRED data."""
    
    # Core Employment Series IDs
    EMPLOYMENT_SERIES = {
        'UNEMPLOYMENT_RATE': 'LNS14000000',          # Unemployment Rate (16 years and over)
        'EMPLOYMENT_LEVEL': 'LNS12000000',           # Employment Level (16 years and over)
        'LABOR_FORCE': 'LNS11000000',                # Labor Force Level (16 years and over)
        'PARTICIPATION_RATE': 'LNS11300000',         # Labor Force Participation Rate
        'EMPLOYMENT_POP_RATIO': 'LNS12300000',       # Employment-Population Ratio
        'NONFARM_PAYROLLS': 'CES0000000001',         # Total Nonfarm Employment
        'PRIVATE_PAYROLLS': 'CES0500000001',         # Total Private Employment
        'GOVERNMENT_PAYROLLS': 'CES9000000001',      # Government Employment
        'MANUFACTURING_PAYROLLS': 'CES3000000001',   # Manufacturing Employment
        'CONSTRUCTION_PAYROLLS': 'CES2000000001',    # Construction Employment
        'PROFESSIONAL_PAYROLLS': 'CES6054000001',    # Professional and Business Services
        'LEISURE_PAYROLLS': 'CES7000000001',         # Leisure and Hospitality
        'AVERAGE_HOURLY_EARNINGS': 'CES0500000003',  # Average Hourly Earnings (Private)
        'AVERAGE_WEEKLY_HOURS': 'CES0500000002',     # Average Weekly Hours (Private)
        'JOB_OPENINGS_TOTAL': 'JTU000000000000000JOL', # Job Openings: Total Nonfarm
        'HIRES_TOTAL': 'JTU000000000000000HIL',      # Hires: Total Nonfarm
        'SEPARATIONS_TOTAL': 'JTU000000000000000TSL', # Total Separations: Total Nonfarm
        'QUITS_TOTAL': 'JTU000000000000000QUL',      # Quits: Total Nonfarm
        'LAYOFFS_TOTAL': 'JTU000000000000000LDL'     # Layoffs and Discharges: Total Nonfarm
    }
    
    # Consumer Price Index Series
    CPI_SERIES = {
        'CPI_ALL_ITEMS': 'CUUR0000SA0',              # CPI for All Urban Consumers: All Items
        'CPI_CORE': 'CUUR0000SA0L1E',                # CPI Core (All Items Less Food and Energy)
        'CPI_ENERGY': 'CUUR0000SA0E',                # CPI Energy
        'CPI_FOOD': 'CUUR0000SAF1',                  # CPI Food
        'CPI_HOUSING': 'CUUR0000SAH1',               # CPI Housing
        'CPI_TRANSPORTATION': 'CUUR0000SAT1'         # CPI Transportation
    }
    
    def __init__(self):
        """Initialize BLS service with async HTTP client and rate limiting."""
        self.base_url = "https://api.bls.gov/publicAPI/v2"
        self.api_key = self._get_api_key()
        self.rate_limiter = BLSRateLimiter()
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Cache TTL settings
        self.MONTHLY_CACHE_TTL = 60 * 60 * 12      # 12 hours for monthly data
        self.QUARTERLY_CACHE_TTL = 60 * 60 * 24    # 24 hours for quarterly data
        self.ANNUAL_CACHE_TTL = 60 * 60 * 48       # 48 hours for annual data
        
        # Error tracking
        self.error_count = 0
        self.last_error_time = None
    
    def _get_api_key(self) -> str:
        """Get BLS API key from settings."""
        api_key = getattr(settings, 'BUREAU_OF_STATISTIC_KEY', None)
        if not api_key:
            logger.warning(
                "BUREAU_OF_STATISTIC_KEY not found in settings. Using public API (limited requests)."
            )
            return ""
        return api_key
    
    @property
    def is_enabled(self) -> bool:
        """Check if BLS service is enabled (public API available even without key)."""
        return True  # BLS public API is always available
    
    @property
    def is_registered(self) -> bool:
        """Check if we have a registered API key for higher rate limits."""
        return bool(self.api_key)
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self) -> None:
        """Ensure HTTP session is available."""
        if self.session is None or self.session.closed:
            timeout = ClientTimeout(total=30, connect=10)
            connector = aiohttp.TCPConnector(
                limit=10,
                limit_per_host=5,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=30
            )
            
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers={
                    'User-Agent': 'Gayed-Signals-Dashboard/1.0 (+https://example.com)',
                    'Content-Type': 'application/json'
                }
            )
    
    async def close(self) -> None:
        """Close HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            await asyncio.sleep(0.1)
    
    def _get_cache_key(self, endpoint: str, data: Dict[str, Any]) -> str:
        """Generate cache key for API request."""
        cache_input = f"{endpoint}:{json.dumps(data, sort_keys=True)}"
        return f"bls_api:{hashlib.md5(cache_input.encode()).hexdigest()}"
    
    def _determine_cache_ttl(self, series_id: str) -> int:
        """Determine appropriate cache TTL based on series type."""
        # Monthly employment data gets shorter cache
        if series_id.startswith('LNS') or series_id.startswith('CES'):
            return self.MONTHLY_CACHE_TTL
        
        # JOLTS data (quarterly) gets medium cache
        if series_id.startswith('JTU'):
            return self.QUARTERLY_CACHE_TTL
        
        # Annual data gets longest cache
        return self.ANNUAL_CACHE_TTL
    
    async def _make_request(self, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make request to BLS API with rate limiting and caching."""
        if data is None:
            data = {}
        
        # Add API key if available
        if self.api_key:
            data['registrationkey'] = self.api_key
        
        # Check cache first
        cache_key = self._get_cache_key(endpoint, data)
        cached_data = None
        
        try:
            if await cache_service._ensure_connection():
                cached_response = await cache_service.redis.get(cache_key)
                if cached_response:
                    if isinstance(cached_response, bytes):
                        cached_response = cached_response.decode('utf-8')
                    cached_data = json.loads(cached_response)
                    logger.debug(f"Cache hit for BLS endpoint: {endpoint}")
                    return cached_data
        except Exception as cache_error:
            logger.warning(f"Redis cache read failed: {cache_error}")
        
        # Rate limiting
        await self.rate_limiter.acquire()
        
        # Ensure session exists
        await self._ensure_session()
        
        url = f"{self.base_url}/{endpoint}"
        
        try:
            logger.debug(f"Making BLS API request: {endpoint} with data: {data}")
            
            async with self.session.post(url, json=data) as response:
                if response.status == 200:
                    response_data = await response.json()
                    
                    # Cache successful response
                    cache_ttl = self.MONTHLY_CACHE_TTL  # Default TTL
                    if 'seriesid' in data and data['seriesid']:
                        # Use first series ID for TTL determination
                        first_series = data['seriesid'][0] if isinstance(data['seriesid'], list) else data['seriesid']
                        cache_ttl = self._determine_cache_ttl(first_series)
                    
                    try:
                        if await cache_service._ensure_connection():
                            await cache_service.redis.setex(
                                cache_key,
                                cache_ttl,
                                json.dumps(response_data)
                            )
                    except Exception as cache_error:
                        logger.warning(f"Redis cache write failed: {cache_error}")
                    
                    logger.info(f"Successfully retrieved BLS data: {endpoint}")
                    return response_data
                
                elif response.status == 429:
                    # Rate limit exceeded
                    logger.warning("BLS API rate limit exceeded")
                    await asyncio.sleep(60)
                    return await self._make_request(endpoint, data)
                
                else:
                    error_text = await response.text()
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"BLS API error: {error_text}"
                    )
        
        except ClientError as e:
            self.error_count += 1
            self.last_error_time = datetime.utcnow()
            logger.error(f"BLS API request failed: {e}")
            raise Exception(f"Failed to connect to BLS API: {e}")
        
        except Exception as e:
            self.error_count += 1
            self.last_error_time = datetime.utcnow()
            logger.error(f"Unexpected error in BLS API request: {e}")
            raise
    
    async def fetch_series_data(
        self,
        series_ids: Union[str, List[str]],
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        catalog: bool = False,
        calculations: bool = False,
        annual_averages: bool = False
    ) -> List[BLSSeriesData]:
        """
        Fetch time series data from BLS API.
        
        Args:
            series_ids: BLS series identifier(s)
            start_year: Start year for data
            end_year: End year for data
            catalog: Include catalog metadata
            calculations: Include calculations (12-month percent change, etc.)
            annual_averages: Include annual averages for monthly/quarterly data
            
        Returns:
            List of BLSSeriesData objects
        """
        if not self.is_enabled:
            logger.warning("BLS service disabled - returning empty data")
            return []
        
        # Normalize series_ids to list
        if isinstance(series_ids, str):
            series_ids = [series_ids]
        
        # Prepare request data
        request_data = {
            'seriesid': series_ids,
            'catalog': catalog,
            'calculations': calculations,
            'annualaverage': annual_averages
        }
        
        # Add date range if specified
        if start_year and end_year:
            request_data['startyear'] = str(start_year)
            request_data['endyear'] = str(end_year)
        elif start_year:
            request_data['startyear'] = str(start_year)
            request_data['endyear'] = str(datetime.now().year)
        
        try:
            response = await self._make_request('timeseries/data', request_data)
            
            if response.get('status') != 'REQUEST_SUCCEEDED':
                logger.warning(f"BLS API request failed: {response.get('message', ['Unknown error'])}")
                return []
            
            results = response.get('Results', {})
            series_list = results.get('series', [])
            
            bls_series_data = []
            for series in series_list:
                data_points = []
                for data_item in series.get('data', []):
                    # Convert value to float if possible
                    try:
                        value = float(data_item['value']) if data_item['value'] != '' else None
                    except (ValueError, TypeError):
                        value = data_item['value']  # Keep as string if not numeric
                    
                    data_points.append(BLSDataPoint(
                        year=data_item['year'],
                        period=data_item['period'],
                        periodName=data_item['periodName'],
                        value=value,
                        footnotes=data_item.get('footnotes', [])
                    ))
                
                bls_series_data.append(BLSSeriesData(
                    seriesID=series['seriesID'],
                    data=data_points
                ))
            
            logger.info(f"Retrieved {len(bls_series_data)} BLS series with total {sum(len(s.data) for s in bls_series_data)} observations")
            return bls_series_data
        
        except Exception as e:
            logger.error(f"Error fetching BLS series data: {e}")
            raise
    
    async def fetch_employment_data(
        self,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        include_industry_detail: bool = False
    ) -> Dict[str, BLSSeriesData]:
        """
        Fetch comprehensive employment data from BLS.
        
        Args:
            start_year: Start year for data
            end_year: End year for data
            include_industry_detail: Include detailed industry employment data
            
        Returns:
            Dictionary mapping series names to BLS data
        """
        logger.info("Fetching comprehensive employment data from BLS...")
        
        # Core employment series
        core_series = [
            self.EMPLOYMENT_SERIES['UNEMPLOYMENT_RATE'],
            self.EMPLOYMENT_SERIES['EMPLOYMENT_LEVEL'],
            self.EMPLOYMENT_SERIES['LABOR_FORCE'],
            self.EMPLOYMENT_SERIES['PARTICIPATION_RATE'],
            self.EMPLOYMENT_SERIES['EMPLOYMENT_POP_RATIO'],
            self.EMPLOYMENT_SERIES['NONFARM_PAYROLLS'],
            self.EMPLOYMENT_SERIES['AVERAGE_HOURLY_EARNINGS'],
            self.EMPLOYMENT_SERIES['AVERAGE_WEEKLY_HOURS']
        ]
        
        # Add industry detail if requested
        if include_industry_detail:
            core_series.extend([
                self.EMPLOYMENT_SERIES['PRIVATE_PAYROLLS'],
                self.EMPLOYMENT_SERIES['GOVERNMENT_PAYROLLS'],
                self.EMPLOYMENT_SERIES['MANUFACTURING_PAYROLLS'],
                self.EMPLOYMENT_SERIES['CONSTRUCTION_PAYROLLS'],
                self.EMPLOYMENT_SERIES['PROFESSIONAL_PAYROLLS'],
                self.EMPLOYMENT_SERIES['LEISURE_PAYROLLS']
            ])
        
        try:
            series_data_list = await self.fetch_series_data(
                series_ids=core_series,
                start_year=start_year,
                end_year=end_year,
                calculations=True  # Include 12-month changes
            )
            
            # Map series IDs back to names
            id_to_name = {v: k for k, v in self.EMPLOYMENT_SERIES.items()}
            results = {}
            
            for series_data in series_data_list:
                series_name = id_to_name.get(series_data.seriesID, series_data.seriesID)
                results[series_name] = series_data
            
            return results
        
        except Exception as e:
            logger.error(f"Error fetching employment data: {e}")
            return {}
    
    async def fetch_jolts_data(
        self,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None
    ) -> Dict[str, BLSSeriesData]:
        """
        Fetch Job Openings and Labor Turnover Survey (JOLTS) data.
        
        Args:
            start_year: Start year for data
            end_year: End year for data
            
        Returns:
            Dictionary mapping JOLTS series names to BLS data
        """
        logger.info("Fetching JOLTS data from BLS...")
        
        jolts_series = [
            self.EMPLOYMENT_SERIES['JOB_OPENINGS_TOTAL'],
            self.EMPLOYMENT_SERIES['HIRES_TOTAL'],
            self.EMPLOYMENT_SERIES['SEPARATIONS_TOTAL'],
            self.EMPLOYMENT_SERIES['QUITS_TOTAL'],
            self.EMPLOYMENT_SERIES['LAYOFFS_TOTAL']
        ]
        
        try:
            series_data_list = await self.fetch_series_data(
                series_ids=jolts_series,
                start_year=start_year,
                end_year=end_year
            )
            
            # Map series IDs back to names
            id_to_name = {v: k for k, v in self.EMPLOYMENT_SERIES.items()}
            results = {}
            
            for series_data in series_data_list:
                series_name = id_to_name.get(series_data.seriesID, series_data.seriesID)
                results[series_name] = series_data
            
            return results
        
        except Exception as e:
            logger.error(f"Error fetching JOLTS data: {e}")
            return {}
    
    async def fetch_cpi_data(
        self,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None
    ) -> Dict[str, BLSSeriesData]:
        """
        Fetch Consumer Price Index (CPI) data.
        
        Args:
            start_year: Start year for data
            end_year: End year for data
            
        Returns:
            Dictionary mapping CPI series names to BLS data
        """
        logger.info("Fetching CPI data from BLS...")
        
        cpi_series = list(self.CPI_SERIES.values())
        
        try:
            series_data_list = await self.fetch_series_data(
                series_ids=cpi_series,
                start_year=start_year,
                end_year=end_year,
                calculations=True  # Include 12-month changes
            )
            
            # Map series IDs back to names
            id_to_name = {v: k for k, v in self.CPI_SERIES.items()}
            results = {}
            
            for series_data in series_data_list:
                series_name = id_to_name.get(series_data.seriesID, series_data.seriesID)
                results[series_name] = series_data
            
            return results
        
        except Exception as e:
            logger.error(f"Error fetching CPI data: {e}")
            return {}
    
    def convert_to_standard_format(self, bls_data: BLSSeriesData, series_name: str) -> List[Dict[str, Any]]:
        """
        Convert BLS data format to standardized format compatible with FRED data.
        
        Args:
            bls_data: BLS series data
            series_name: Name of the series for identification
            
        Returns:
            List of standardized data points
        """
        standardized_data = []
        
        for data_point in bls_data.data:
            # Convert BLS period format to date
            year = int(data_point.year)
            period = data_point.period
            
            # Handle different period formats
            if period.startswith('M'):  # Monthly data (M01-M12)
                month = int(period[1:])
                date_str = f"{year}-{month:02d}-01"
            elif period.startswith('Q'):  # Quarterly data (Q01-Q04)
                quarter = int(period[1:])
                month = (quarter - 1) * 3 + 1
                date_str = f"{year}-{month:02d}-01"
            elif period == 'A01':  # Annual data
                date_str = f"{year}-01-01"
            else:
                # Default to January for unknown periods
                date_str = f"{year}-01-01"
            
            # Skip invalid values
            if data_point.value is None or data_point.value == '':
                continue
            
            standardized_data.append({
                'date': date_str,
                'value': float(data_point.value) if isinstance(data_point.value, str) else data_point.value,
                'symbol': bls_data.seriesID,
                'series_name': series_name,
                'source': 'BLS',
                'period': data_point.period,
                'period_name': data_point.periodName,
                'footnotes': data_point.footnotes
            })
        
        # Sort by date
        standardized_data.sort(key=lambda x: x['date'])
        
        return standardized_data
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check of BLS service.
        
        Returns:
            Dictionary with health status information
        """
        health_info = {
            'status': 'healthy',
            'api_key_configured': self.is_registered,
            'error_count': self.error_count,
            'last_error_time': self.last_error_time.isoformat() if self.last_error_time else None,
            'session_active': self.session is not None and not self.session.closed,
            'rate_limit_type': 'registered' if self.is_registered else 'public'
        }
        
        # Test API connectivity with a simple request
        try:
            test_data = await self.fetch_series_data(
                series_ids=[self.EMPLOYMENT_SERIES['UNEMPLOYMENT_RATE']],
                start_year=datetime.now().year,
                end_year=datetime.now().year
            )
            health_info['api_connectivity'] = len(test_data) > 0
            health_info['last_test_time'] = datetime.utcnow().isoformat()
        except Exception as e:
            health_info['status'] = 'unhealthy'
            health_info['api_connectivity'] = False
            health_info['api_error'] = str(e)
        
        return health_info


# Global service instance
bls_service = BLSService()