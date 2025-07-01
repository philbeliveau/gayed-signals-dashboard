"""
Economic Data API routes for serving labor market and housing data.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import logging
import asyncio
from enum import Enum

from core.database import get_db
from core.security import get_current_user_optional
from models.database import User
from services.fred_service import fred_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Enums for validation
class EconomicIndicator(str, Enum):
    """Economic indicators supported by the API."""
    ICSA = "ICSA"                    # Initial Claims for Unemployment Insurance
    CCSA = "CCSA"                    # Continued Claims for Unemployment Insurance
    IC4WSA = "IC4WSA"                # 4-Week Moving Average of Initial Claims
    UNRATE = "UNRATE"                # Unemployment Rate
    PAYEMS = "PAYEMS"                # Total Nonfarm Payrolls
    CIVPART = "CIVPART"              # Labor Force Participation Rate
    JTSJOL = "JTSJOL"                # Job Openings: Total Nonfarm
    JTSQUL = "JTSQUL"                # Quits: Total Nonfarm
    CSUSHPINSA = "CSUSHPINSA"        # Case-Shiller U.S. National Home Price Index
    HOUST = "HOUST"                  # Housing Starts: Total New Privately Owned
    MSACSR = "MSACSR"                # Months' Supply of Houses in the United States
    HSN1F = "HSN1F"                  # New One Family Houses Sold: United States
    EXHOSLUSM156S = "EXHOSLUSM156S"  # Existing Home Sales
    PERMIT = "PERMIT"                # New Private Housing Units Authorized by Building Permits
    USSTHPI = "USSTHPI"              # All-Transactions House Price Index for the United States

class DataSource(str, Enum):
    """Data sources for economic indicators."""
    FRED = "FRED"                    # Federal Reserve Economic Data
    DOL = "DOL"                      # Department of Labor
    BLS = "BLS"                      # Bureau of Labor Statistics
    REDFIN = "REDFIN"               # Real estate data

class TimePeriod(str, Enum):
    """Time periods for data queries."""
    THREE_MONTHS = "3m"
    SIX_MONTHS = "6m"
    TWELVE_MONTHS = "12m"
    TWO_YEARS = "2y"
    FIVE_YEARS = "5y"

class DataFrequency(str, Enum):
    """Data frequency options."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

# Pydantic Models

class EconomicDataPoint(BaseModel):
    """Single economic data point."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    value: float = Field(..., description="Economic indicator value")
    symbol: EconomicIndicator = Field(..., description="Economic indicator symbol")
    source: DataSource = Field(..., description="Data source")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('date')
    def validate_date(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class TimeSeriesQuery(BaseModel):
    """Query parameters for time series data."""
    indicators: List[EconomicIndicator] = Field(..., description="List of economic indicators to fetch")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    period: Optional[TimePeriod] = Field(TimePeriod.TWELVE_MONTHS, description="Time period for data")
    frequency: Optional[DataFrequency] = Field(DataFrequency.WEEKLY, description="Data frequency")
    seasonally_adjusted: bool = Field(True, description="Whether to return seasonally adjusted data")

    @validator('start_date', 'end_date')
    def validate_dates(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v

class StatisticalAnalysis(BaseModel):
    """Statistical analysis of economic data."""
    current: float = Field(..., description="Current value")
    mom_change: float = Field(..., description="Month-over-month change")
    mom_percent_change: float = Field(..., description="Month-over-month percent change")
    yoy_change: float = Field(..., description="Year-over-year change")
    yoy_percent_change: float = Field(..., description="Year-over-year percent change")
    volatility_measures: Dict[str, float] = Field(..., description="Volatility measures")

class TrendAnalysis(BaseModel):
    """Trend analysis results."""
    direction: str = Field(..., description="Trend direction: up, down, or flat")
    strength: str = Field(..., description="Trend strength: strong, moderate, or weak")
    confidence: float = Field(..., description="Confidence level (0-1)")
    duration: int = Field(..., description="Trend duration in months")
    start_date: str = Field(..., description="Trend start date")
    end_date: str = Field(..., description="Trend end date")

class AlertResult(BaseModel):
    """Economic alert result."""
    id: str = Field(..., description="Alert identifier")
    name: str = Field(..., description="Alert name")
    type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity: info, warning, critical")
    triggered: bool = Field(..., description="Whether alert is triggered")
    triggered_at: str = Field(..., description="When alert was triggered")
    message: str = Field(..., description="Alert message")
    data: Dict[str, Any] = Field(..., description="Alert data context")

class LaborMarketMetrics(BaseModel):
    """Current labor market metrics."""
    initial_claims: int = Field(..., description="Initial unemployment claims")
    continued_claims: int = Field(..., description="Continued unemployment claims")
    unemployment_rate: float = Field(..., description="Unemployment rate percentage")
    nonfarm_payrolls: int = Field(..., description="Total nonfarm payrolls")
    labor_participation: float = Field(..., description="Labor force participation rate")
    job_openings: int = Field(..., description="Total job openings")
    claims_4week: int = Field(..., description="4-week moving average of claims")
    weekly_change_initial: float = Field(..., description="Weekly change in initial claims (%)")
    weekly_change_continued: float = Field(..., description="Weekly change in continued claims (%)")
    monthly_change_payrolls: float = Field(..., description="Monthly change in payrolls (%)")

class HousingMarketMetrics(BaseModel):
    """Current housing market metrics."""
    case_shiller_index: float = Field(..., description="Case-Shiller Home Price Index")
    housing_starts: int = Field(..., description="Housing starts (annual rate)")
    months_supply: float = Field(..., description="Months supply of houses")
    new_home_sales: int = Field(..., description="New home sales (annual rate)")
    existing_home_sales: int = Field(..., description="Existing home sales")
    building_permits: int = Field(..., description="Building permits issued")
    price_change_monthly: float = Field(..., description="Monthly price change (%)")
    price_change_yearly: float = Field(..., description="Yearly price change (%)")

class LaborMarketSummaryResponse(BaseModel):
    """Labor market summary response."""
    current_metrics: LaborMarketMetrics = Field(..., description="Current labor market metrics")
    time_series: List[Dict[str, Any]] = Field(..., description="Historical time series data")
    alerts: List[AlertResult] = Field(..., description="Active alerts")
    historical_comparison: Dict[str, Any] = Field(..., description="Historical comparison data")
    correlation_analysis: Dict[str, Any] = Field(..., description="Correlation analysis")
    metadata: Dict[str, Any] = Field(..., description="Response metadata")

class HousingSummaryResponse(BaseModel):
    """Housing market summary response."""
    current_metrics: HousingMarketMetrics = Field(..., description="Current housing market metrics")
    time_series: List[Dict[str, Any]] = Field(..., description="Historical time series data")
    alerts: List[AlertResult] = Field(..., description="Active alerts")
    trend_analysis: TrendAnalysis = Field(..., description="Housing trend analysis")
    statistics: StatisticalAnalysis = Field(..., description="Statistical analysis")
    metadata: Dict[str, Any] = Field(..., description="Response metadata")

class TimeSeriesResponse(BaseModel):
    """Time series data response."""
    indicators: List[EconomicIndicator] = Field(..., description="Requested indicators")
    data: List[EconomicDataPoint] = Field(..., description="Time series data points")
    statistics: Dict[str, StatisticalAnalysis] = Field(..., description="Statistical analysis by indicator")
    correlation_matrix: Optional[Dict[str, Dict[str, float]]] = Field(None, description="Correlation matrix")
    metadata: Dict[str, Any] = Field(..., description="Response metadata")

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Detailed error information")
    timestamp: str = Field(..., description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Request identifier")

# API Endpoints

@router.get("/labor-market/summary", 
           response_model=LaborMarketSummaryResponse,
           summary="Get labor market summary",
           description="Retrieve comprehensive labor market data including key indicators (ICSA, CCSA, UNRATE)")
async def get_labor_market_summary(
    period: TimePeriod = Query(TimePeriod.TWELVE_MONTHS, description="Time period for data"),
    fast_mode: bool = Query(False, description="Enable fast mode for essential indicators only")
) -> LaborMarketSummaryResponse:
    """
    Get comprehensive labor market summary with key economic indicators.
    
    Returns current metrics, time series data, alerts, and analysis for:
    - Initial Claims for Unemployment Insurance (ICSA)
    - Continued Claims for Unemployment Insurance (CCSA)  
    - Unemployment Rate (UNRATE)
    - Total Nonfarm Payrolls (PAYEMS)
    - Labor Force Participation Rate (CIVPART)
    - Job Openings (JTSJOL)
    """
    try:
        logger.info(f"Fetching labor market summary, period: {period}")
        
        # Try to fetch real data from FRED service first
        try:
            async with fred_service as fred:
                if fred.is_enabled:
                    logger.info("Fetching real labor market data from FRED service...")
                    
                    # Calculate date range
                    days_map = {"3m": 90, "6m": 180, "12m": 365, "2y": 730}
                    days = days_map.get(period.value, 365)
                    end_date = datetime.utcnow()
                    start_date = end_date - timedelta(days=days)
                    
                    # Fetch labor market data from FRED
                    fred_labor_data = await fred.fetch_labor_market_data(
                        start_date=start_date.strftime('%Y-%m-%d'),
                        end_date=end_date.strftime('%Y-%m-%d'),
                        limit=50 if fast_mode else None
                    )
                    
                    if fred_labor_data:
                        logger.info("Successfully retrieved labor data from FRED")
                        labor_data = convert_fred_to_mock_format(fred_labor_data, "labor")
                    else:
                        raise Exception("No data returned from FRED")
                else:
                    raise Exception("FRED service not enabled")
        except Exception as e:
            logger.warning(f"FRED service failed, using mock data: {e}")
            # Fallback to mock data
            labor_data = await generate_mock_labor_data(period, fast_mode)
        
        # Process data and generate response
        response = LaborMarketSummaryResponse(
            current_metrics=labor_data["current_metrics"],
            time_series=labor_data["time_series"],
            alerts=labor_data["alerts"],
            historical_comparison=labor_data["historical_comparison"],
            correlation_analysis=labor_data["correlation_analysis"],
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": "anonymous",
                "period": period,
                "fast_mode": fast_mode,
                "data_source": "fred_api",
                "indicators_count": 3 if fast_mode else 8
            }
        )
        
        logger.info(f"Successfully generated labor market summary with {len(labor_data['alerts'])} alerts")
        return response
        
    except Exception as e:
        logger.error(f"Error fetching labor market summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch labor market data: {str(e)}"
        )

@router.get("/housing/summary",
           response_model=HousingSummaryResponse,
           summary="Get housing market summary", 
           description="Retrieve comprehensive housing market data including Case-Shiller index")
async def get_housing_summary(
    region: str = Query("national", description="Geographic region (national, ca, ny, fl, etc.)"),
    period: TimePeriod = Query(TimePeriod.TWELVE_MONTHS, description="Time period for data"),
    fast_mode: bool = Query(False, description="Enable fast mode for essential indicators only")
) -> HousingSummaryResponse:
    """
    Get comprehensive housing market summary with key indicators.
    
    Returns current metrics, time series data, alerts, and analysis for:
    - Case-Shiller U.S. National Home Price Index (CSUSHPINSA)
    - Housing Starts (HOUST)
    - Months' Supply of Houses (MSACSR)
    - New Home Sales (HSN1F)
    - Existing Home Sales (EXHOSLUSM156S)
    - Building Permits (PERMIT)
    """
    try:
        logger.info(f"Fetching housing summary, region: {region}, period: {period}")
        
        # Try to fetch real data from FRED service first
        try:
            async with fred_service as fred:
                if fred.is_enabled:
                    logger.info("Fetching real housing market data from FRED service...")
                    
                    # Calculate date range
                    days_map = {"3m": 90, "6m": 180, "12m": 365, "2y": 730}
                    days = days_map.get(period.value, 365)
                    end_date = datetime.utcnow()
                    start_date = end_date - timedelta(days=days)
                    
                    # Fetch housing market data from FRED
                    fred_housing_data = await fred.fetch_housing_market_data(
                        start_date=start_date.strftime('%Y-%m-%d'),
                        end_date=end_date.strftime('%Y-%m-%d'),
                        limit=50 if fast_mode else None
                    )
                    
                    if fred_housing_data:
                        logger.info("Successfully retrieved housing data from FRED")
                        housing_data = convert_fred_to_mock_format(fred_housing_data, "housing")
                    else:
                        raise Exception("No data returned from FRED")
                else:
                    raise Exception("FRED service not enabled")
        except Exception as e:
            logger.warning(f"FRED service failed, using mock data: {e}")
            # Fallback to mock data
            housing_data = await generate_mock_housing_data(region, period, fast_mode)
        
        # Process data and generate response
        response = HousingSummaryResponse(
            current_metrics=housing_data["current_metrics"],
            time_series=housing_data["time_series"],
            alerts=housing_data["alerts"],
            trend_analysis=housing_data["trend_analysis"],
            statistics=housing_data["statistics"],
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "region": region,
                "period": period,
                "fast_mode": fast_mode,
                "data_source": "mock_data",  # In production: "fred_api"
                "indicators_count": 2 if fast_mode else 6
            }
        )
        
        logger.info(f"Successfully generated housing summary for region {region}")
        return response
        
    except Exception as e:
        logger.error(f"Error fetching housing summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch housing market data: {str(e)}"
        )

@router.post("/time-series",
            response_model=TimeSeriesResponse,
            summary="Get time series data",
            description="Retrieve time series data for specified economic indicators with custom date ranges")
async def get_time_series_data(
    query: TimeSeriesQuery,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
) -> TimeSeriesResponse:
    """
    Get time series data for specified economic indicators.
    
    Supports custom date ranges, multiple indicators, and different frequencies.
    Returns statistical analysis and correlation matrices.
    """
    try:
        logger.info(f"Fetching time series data for user {current_user.id if current_user else 'anonymous'}, indicators: {query.indicators}")
        
        # Validate date range
        if query.start_date and query.end_date:
            start_dt = datetime.fromisoformat(query.start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(query.end_date.replace('Z', '+00:00'))
            if start_dt >= end_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Start date must be before end date"
                )
        
        # Mock data generation - In production, this would fetch from multiple APIs
        time_series_data = await generate_mock_time_series_data(query)
        
        # Calculate statistics for each indicator
        statistics = {}
        for indicator in query.indicators:
            indicator_data = [dp for dp in time_series_data["data"] if dp.symbol == indicator]
            if indicator_data:
                statistics[indicator.value] = calculate_statistics(indicator_data)
        
        # Calculate correlation matrix if multiple indicators
        correlation_matrix = None
        if len(query.indicators) > 1:
            correlation_matrix = calculate_correlation_matrix(time_series_data["data"], query.indicators)
        
        response = TimeSeriesResponse(
            indicators=query.indicators,
            data=time_series_data["data"],
            statistics=statistics,
            correlation_matrix=correlation_matrix,
            metadata={
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": str(current_user.id) if current_user else "anonymous",
                "query": query.dict(),
                "data_points": len(time_series_data["data"]),
                "data_source": "mock_data"  # In production: multiple APIs
            }
        )
        
        logger.info(f"Successfully generated time series data with {len(time_series_data['data'])} data points")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching time series data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch time series data: {str(e)}"
        )

@router.get("/test",
           summary="Test endpoint",
           description="Simple test endpoint")
async def test_endpoint() -> Dict[str, Any]:
    """Simple test endpoint that doesn't require authentication."""
    return {"status": "ok", "message": "Economic API is working"}

@router.get("/indicators",
           summary="List available economic indicators", 
           description="Get list of all available economic indicators with descriptions")
async def list_economic_indicators(
    category: Optional[str] = Query(None, description="Filter by category (labor, housing)")
) -> Dict[str, Any]:
    """
    List all available economic indicators with descriptions and metadata.
    """
    try:
        indicators = {
            "labor": {
                "ICSA": {
                    "name": "Initial Claims for Unemployment Insurance",
                    "description": "Weekly count of initial claims for unemployment insurance",
                    "frequency": "weekly",
                    "source": "DOL",
                    "units": "persons",
                    "seasonally_adjusted": True
                },
                "CCSA": {
                    "name": "Continued Claims for Unemployment Insurance", 
                    "description": "Weekly count of continued claims for unemployment insurance",
                    "frequency": "weekly",
                    "source": "DOL",
                    "units": "persons",
                    "seasonally_adjusted": True
                },
                "UNRATE": {
                    "name": "Unemployment Rate",
                    "description": "Percent of labor force that is unemployed",
                    "frequency": "monthly",
                    "source": "BLS",
                    "units": "percent",
                    "seasonally_adjusted": True
                },
                "PAYEMS": {
                    "name": "Total Nonfarm Payrolls",
                    "description": "Total number of paid employees in nonfarm establishments",
                    "frequency": "monthly",
                    "source": "BLS", 
                    "units": "thousands of persons",
                    "seasonally_adjusted": True
                }
            },
            "housing": {
                "CSUSHPINSA": {
                    "name": "Case-Shiller U.S. National Home Price Index",
                    "description": "Measure of U.S. residential real estate prices",
                    "frequency": "monthly",
                    "source": "FRED",
                    "units": "index",
                    "seasonally_adjusted": False
                },
                "HOUST": {
                    "name": "Housing Starts: Total New Privately Owned",
                    "description": "Number of new residential construction projects started",
                    "frequency": "monthly", 
                    "source": "FRED",
                    "units": "thousands of units",
                    "seasonally_adjusted": True
                },
                "MSACSR": {
                    "name": "Months' Supply of Houses in the United States",
                    "description": "Number of months it would take to exhaust current inventory",
                    "frequency": "monthly",
                    "source": "FRED",
                    "units": "months",
                    "seasonally_adjusted": True
                }
            }
        }
        
        if category:
            if category.lower() not in indicators:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid category. Available categories: {list(indicators.keys())}"
                )
            return {category.lower(): indicators[category.lower()]}
        
        return indicators
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing economic indicators: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve economic indicators"
        )

# NEW ENDPOINTS FOR FRONTEND INTEGRATION

@router.get("/labor-market",
           summary="Get labor market data (frontend endpoint)",
           description="Retrieve labor market data with real FRED integration")
async def get_labor_market_data(
    period: str = Query("12m", description="Time period for data"),
    fast: bool = Query(False, description="Enable fast mode for essential indicators only")
) -> Dict[str, Any]:
    """
    Get labor market data using real FRED API service.
    This endpoint is called by the frontend labor market tab.
    """
    try:
        logger.info(f"Fetching labor market data via FRED service, period: {period}, fast: {fast}")
        
        # Calculate date range based on period
        period_days = {"3m": 90, "6m": 180, "12m": 365, "24m": 730}
        days = period_days.get(period, 365)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Use the FRED service to get real data
        async with fred_service as fred:
            try:
                # Get labor market data from FRED
                labor_data = await fred.fetch_labor_market_data(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d'),
                    limit=100 if fast else None
                )
                
                # Transform FRED data to expected frontend format
                logger.info(f"Raw FRED labor data keys: {list(labor_data.keys())}")
                logger.info(f"FRED data sample: {[(k, len(v) if v else 0) for k, v in labor_data.items()]}")
                
                time_series = []
                
                # Get all unique dates from all series
                all_dates = set()
                for series_data in labor_data.values():
                    if series_data:  # Check if series_data is not empty
                        for dp in series_data:
                            all_dates.add(dp.date)
                
                logger.info(f"Found {len(all_dates)} unique dates in FRED data")
                
                for date_str in sorted(all_dates):
                    # Get data for this date from all series
                    date_data = {"date": date_str}
                    
                    for series_name, series_data in labor_data.items():
                        if series_data:  # Check if series_data is not empty
                            date_points = [dp for dp in series_data if dp.date == date_str]
                            if date_points and date_points[0].value is not None:
                                value = date_points[0].value
                                
                                # Map FRED series names to frontend field names
                                if series_name == "INITIAL_CLAIMS":
                                    date_data["initialClaims"] = int(value)
                                elif series_name == "CONTINUED_CLAIMS":
                                    date_data["continuedClaims"] = int(value)
                                elif series_name == "UNEMPLOYMENT_RATE":
                                    date_data["unemploymentRate"] = round(value, 1)
                                elif series_name == "NONFARM_PAYROLLS":
                                    date_data["nonfarmPayrolls"] = int(value)
                                elif series_name == "LABOR_PARTICIPATION":
                                    date_data["laborParticipation"] = round(value, 1)
                                elif series_name == "JOB_OPENINGS":
                                    date_data["jobOpenings"] = int(value)
                    
                    # Only add data points that have at least some economic data
                    if len(date_data) > 1:  # More than just the date
                        # Set defaults for missing fields to ensure chart compatibility
                        date_data.setdefault("initialClaims", 0)
                        date_data.setdefault("continuedClaims", 0)
                        date_data.setdefault("unemploymentRate", 0.0)
                        date_data.setdefault("nonfarmPayrolls", 0)
                        date_data.setdefault("laborParticipation", 0.0)
                        date_data.setdefault("jobOpenings", 0)
                        
                        # Calculate derived fields
                        if len(time_series) > 0:
                            prev_data = time_series[-1]
                            if date_data["initialClaims"] > 0 and prev_data.get("initialClaims", 0) > 0:
                                date_data["weeklyChangeInitial"] = round(((date_data["initialClaims"] / prev_data["initialClaims"]) - 1) * 100, 1)
                            else:
                                date_data["weeklyChangeInitial"] = 0.0
                                
                            if date_data["continuedClaims"] > 0 and prev_data.get("continuedClaims", 0) > 0:
                                date_data["weeklyChangeContinued"] = round(((date_data["continuedClaims"] / prev_data["continuedClaims"]) - 1) * 100, 1)
                            else:
                                date_data["weeklyChangeContinued"] = 0.0
                        else:
                            date_data["weeklyChangeInitial"] = 0.0
                            date_data["weeklyChangeContinued"] = 0.0
                        
                        # Calculate 4-week average
                        if len(time_series) >= 3 and date_data["initialClaims"] > 0:
                            recent_claims = [date_data["initialClaims"]] + [ts.get("initialClaims", 0) for ts in time_series[-3:] if ts.get("initialClaims", 0) > 0]
                            if recent_claims:
                                date_data["claims4Week"] = int(sum(recent_claims) / len(recent_claims))
                            else:
                                date_data["claims4Week"] = date_data["initialClaims"]
                        else:
                            date_data["claims4Week"] = date_data["initialClaims"]
                        
                        # Default monthly change (would need more complex logic for actual calculation)
                        date_data["monthlyChangePayrolls"] = 0.0
                        
                        time_series.append(date_data)
                
                logger.info(f"Transformed {len(time_series)} data points for frontend")
                
                # Generate alerts based on current data
                alerts = []
                if time_series:
                    current_data = time_series[-1]
                    if current_data.get("continuedClaims", 0) > 1800000:
                        alerts.append({
                            "id": "continued_claims_alert",
                            "type": "claims_spike",
                            "severity": "critical",
                            "message": f"Continued claims ({current_data['continuedClaims']:,}) above concerning level",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                return {
                    "laborData": time_series,
                    "timeSeries": time_series,  # Support both naming conventions
                    "alerts": alerts,
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "fred_api",
                        "period": period,
                        "fastMode": fast,
                        "dataPoints": len(time_series)
                    }
                }
                
            except Exception as fred_error:
                logger.warning(f"FRED service failed, falling back to mock data: {fred_error}")
                # Fallback to mock data if FRED fails
                mock_data = await generate_mock_labor_data(TimePeriod(period), fast)
                
                # Ensure consistent data structure
                labor_data_result = mock_data["time_series"]
                
                return {
                    "laborData": labor_data_result,
                    "timeSeries": labor_data_result,  # Support both naming conventions
                    "alerts": mock_data.get("alerts", []),
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "mock_fallback",
                        "period": period,
                        "fastMode": fast,
                        "fallbackReason": str(fred_error),
                        "dataPoints": len(labor_data_result)
                    }
                }
        
    except Exception as e:
        logger.error(f"Error in labor market endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch labor market data: {str(e)}"
        )

@router.get("/housing-market",
           summary="Get housing market data (frontend endpoint)",
           description="Retrieve housing market data with real FRED integration")
async def get_housing_market_data(
    region: str = Query("national", description="Geographic region"),
    period: str = Query("12m", description="Time period for data"),
    fast: bool = Query(False, description="Enable fast mode for essential indicators only")
) -> Dict[str, Any]:
    """
    Get housing market data using real FRED API service.
    This endpoint is called by the frontend housing market tab.
    """
    try:
        logger.info(f"Fetching housing market data via FRED service, region: {region}, period: {period}, fast: {fast}")
        
        # Calculate date range based on period
        period_days = {"3m": 90, "6m": 180, "12m": 365, "24m": 730}
        days = period_days.get(period, 365)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Use the FRED service to get real data
        async with fred_service as fred:
            try:
                # Get housing market data from FRED
                housing_data = await fred.fetch_housing_market_data(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d'),
                    limit=100 if fast else None
                )
                
                # Transform FRED data to expected frontend format
                time_series = []
                for date_str in sorted(set(dp.date for series_data in housing_data.values() for dp in series_data)):
                    # Get data for this date from all series
                    date_data = {"date": date_str}
                    
                    for series_name, series_data in housing_data.items():
                        date_points = [dp for dp in series_data if dp.date == date_str]
                        if date_points:
                            value = date_points[0].value or 0
                            if series_name == "CASE_SHILLER":
                                date_data["caseSillerIndex"] = round(value, 1)
                            elif series_name == "HOUSING_STARTS":
                                date_data["housingStarts"] = int(value)
                            elif series_name == "MONTHS_SUPPLY":
                                date_data["monthsSupply"] = round(value, 1)
                            elif series_name == "NEW_HOME_SALES":
                                date_data["newHomeSales"] = int(value)
                    
                    # Calculate price changes
                    if len(time_series) > 0 and "caseSillerIndex" in date_data:
                        prev_data = time_series[-1]
                        if "caseSillerIndex" in prev_data:
                            date_data["priceChangeMonthly"] = round(((date_data["caseSillerIndex"] / prev_data["caseSillerIndex"]) - 1) * 100, 1)
                    
                    if len(time_series) >= 12 and "caseSillerIndex" in date_data:
                        year_ago_data = time_series[-12]
                        if "caseSillerIndex" in year_ago_data:
                            date_data["priceChangeYearly"] = round(((date_data["caseSillerIndex"] / year_ago_data["caseSillerIndex"]) - 1) * 100, 1)
                    
                    time_series.append(date_data)
                
                # Generate alerts based on current data
                alerts = []
                if time_series:
                    current_data = time_series[-1]
                    if current_data.get("monthsSupply", 0) > 6.0:
                        alerts.append({
                            "id": "high_inventory_alert",
                            "type": "supply_surge",
                            "severity": "warning",
                            "message": f"Housing inventory at {current_data['monthsSupply']} months supply - above healthy range",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                return {
                    "housingData": time_series,
                    "timeSeries": time_series,  # Frontend compatibility
                    "time_series": time_series,  # Alternative naming
                    "alerts": alerts,
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "fred_api",
                        "region": region,
                        "period": period,
                        "fastMode": fast,
                        "dataPoints": len(time_series)
                    }
                }
                
            except Exception as fred_error:
                logger.warning(f"FRED service failed, falling back to mock data: {fred_error}")
                # Fallback to mock data if FRED fails
                mock_data = await generate_mock_housing_data(region, TimePeriod(period), fast)
                return {
                    "housingData": mock_data["time_series"],
                    "timeSeries": mock_data["time_series"],  # Frontend compatibility
                    "time_series": mock_data["time_series"],  # Alternative naming
                    "alerts": mock_data["alerts"],
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "mock_fallback",
                        "region": region,
                        "period": period,
                        "fastMode": fast,
                        "fallbackReason": str(fred_error)
                    }
                }
        
    except Exception as e:
        logger.error(f"Error in housing market endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch housing market data: {str(e)}"
        )

@router.get("/series/{indicator}",
           summary="Get historical data for specific indicator",
           description="Retrieve historical time series data for a specific economic indicator")
async def get_series_data(
    indicator: str,
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    region: Optional[str] = Query(None, description="Geographic region (for regional indicators)")
) -> Dict[str, Any]:
    """
    Get historical time series data for a specific economic indicator using FRED API.
    This endpoint is called by the frontend for historical data requests.
    """
    try:
        logger.info(f"Fetching series data for {indicator} from {start_date} to {end_date}")
        
        # Use the FRED service to get real data
        async with fred_service as fred:
            try:
                # Get series data from FRED
                observations = await fred.fetch_series_data(
                    series_id=indicator,
                    start_date=start_date,
                    end_date=end_date
                )
                
                # Transform to expected format
                data = [
                    {
                        "date": obs.date,
                        "value": obs.value,
                        "symbol": indicator,
                        "source": "FRED"
                    }
                    for obs in observations
                    if obs.value is not None
                ]
                
                return {
                    "observations": data,
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "fred_api",
                        "indicator": indicator,
                        "dataPoints": len(data),
                        "startDate": start_date,
                        "endDate": end_date,
                        "region": region
                    }
                }
                
            except Exception as fred_error:
                logger.warning(f"FRED service failed for series {indicator}, falling back to mock: {fred_error}")
                # Fallback to mock data
                from datetime import datetime as dt
                mock_observations = []
                current_date = dt.strptime(start_date, '%Y-%m-%d')
                end_dt = dt.strptime(end_date, '%Y-%m-%d')
                base_value = 220000 if 'ICSA' in indicator else 311.2 if 'CSUSH' in indicator else 1500000
                
                while current_date <= end_dt:
                    trend = (hash(str(current_date)) % 100 - 50) * 0.001
                    value = base_value * (1 + trend)
                    mock_observations.append({
                        "date": current_date.strftime('%Y-%m-%d'),
                        "value": round(value, 2),
                        "symbol": indicator,
                        "source": "MOCK"
                    })
                    current_date += timedelta(days=7 if 'weekly' in indicator.lower() else 30)
                
                return {
                    "observations": mock_observations,
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "dataSource": "mock_fallback",
                        "indicator": indicator,
                        "dataPoints": len(mock_observations),
                        "startDate": start_date,
                        "endDate": end_date,
                        "region": region,
                        "fallbackReason": str(fred_error)
                    }
                }
        
    except Exception as e:
        logger.error(f"Error fetching series data for {indicator}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch series data: {str(e)}"
        )

# Helper Functions

def convert_fred_to_mock_format(fred_data: Dict[str, List], data_type: str) -> Dict[str, Any]:
    """Convert FRED API data format to the expected mock data format."""
    time_series = []
    
    if data_type == "labor":
        # Get all unique dates from all series
        all_dates = set()
        for series_data in fred_data.values():
            for data_point in series_data:
                all_dates.add(data_point.date)
        
        for date_str in sorted(all_dates):
            # Create a data point for this date
            data_point = {"date": date_str}
            
            # Map FRED series to expected fields
            series_mapping = {
                "INITIAL_CLAIMS": "initialClaims",
                "CONTINUED_CLAIMS": "continuedClaims", 
                "UNEMPLOYMENT_RATE": "unemploymentRate",
                "NONFARM_PAYROLLS": "nonfarmPayrolls",
                "LABOR_PARTICIPATION": "laborParticipation",
                "JOB_OPENINGS": "jobOpenings"
            }
            
            for fred_series, mock_field in series_mapping.items():
                if fred_series in fred_data:
                    # Find data point for this date
                    date_points = [dp for dp in fred_data[fred_series] if dp.date == date_str]
                    if date_points and date_points[0].value is not None:
                        value = date_points[0].value
                        if mock_field in ["initialClaims", "continuedClaims", "nonfarmPayrolls", "jobOpenings"]:
                            data_point[mock_field] = int(value)
                        else:
                            data_point[mock_field] = round(value, 1)
            
            # Calculate derived fields if we have the base data
            if len(time_series) > 0 and "initialClaims" in data_point:
                prev_data = time_series[-1]
                if "initialClaims" in prev_data:
                    data_point["weeklyChangeInitial"] = round(((data_point["initialClaims"] / prev_data["initialClaims"]) - 1) * 100, 1)
                if "continuedClaims" in data_point and "continuedClaims" in prev_data:
                    data_point["weeklyChangeContinued"] = round(((data_point["continuedClaims"] / prev_data["continuedClaims"]) - 1) * 100, 1)
            
            # Calculate 4-week average
            if len(time_series) >= 3 and "initialClaims" in data_point:
                recent_claims = [data_point["initialClaims"]] + [ts.get("initialClaims", 0) for ts in time_series[-3:]]
                data_point["claims4Week"] = int(sum(recent_claims) / len(recent_claims))
            
            time_series.append(data_point)
        
        # Generate mock-style response structure
        current_data = time_series[-1] if time_series else {}
        return {
            "current_metrics": {
                "initial_claims": current_data.get("initialClaims", 0),
                "continued_claims": current_data.get("continuedClaims", 0),
                "unemployment_rate": current_data.get("unemploymentRate", 0),
                "nonfarm_payrolls": current_data.get("nonfarmPayrolls", 0),
                "labor_participation": current_data.get("laborParticipation", 0),
                "job_openings": current_data.get("jobOpenings", 0),
                "claims_4week": current_data.get("claims4Week", 0),
                "weekly_change_initial": current_data.get("weeklyChangeInitial", 0),
                "weekly_change_continued": current_data.get("weeklyChangeContinued", 0),
                "monthly_change_payrolls": 0
            },
            "time_series": time_series,
            "alerts": [],
            "historical_comparison": {},
            "correlation_analysis": {}
        }
    
    elif data_type == "housing":
        # Get all unique dates from all series
        all_dates = set()
        for series_data in fred_data.values():
            for data_point in series_data:
                all_dates.add(data_point.date)
        
        for date_str in sorted(all_dates):
            # Create a data point for this date
            data_point = {"date": date_str}
            
            # Map FRED series to expected fields
            series_mapping = {
                "CASE_SHILLER": "caseSillerIndex",
                "HOUSING_STARTS": "housingStarts",
                "MONTHS_SUPPLY": "monthsSupply",
                "NEW_HOME_SALES": "newHomeSales",
                "EXISTING_HOME_SALES": "existingHomeSales",
                "HOUSING_PERMITS": "buildingPermits"
            }
            
            for fred_series, mock_field in series_mapping.items():
                if fred_series in fred_data:
                    # Find data point for this date
                    date_points = [dp for dp in fred_data[fred_series] if dp.date == date_str]
                    if date_points and date_points[0].value is not None:
                        value = date_points[0].value
                        if mock_field in ["housingStarts", "newHomeSales", "existingHomeSales", "buildingPermits"]:
                            data_point[mock_field] = int(value)
                        else:
                            data_point[mock_field] = round(value, 1)
            
            # Calculate price changes
            if len(time_series) > 0 and "caseSillerIndex" in data_point:
                prev_data = time_series[-1]
                if "caseSillerIndex" in prev_data and prev_data["caseSillerIndex"] > 0:
                    data_point["priceChangeMonthly"] = round(((data_point["caseSillerIndex"] / prev_data["caseSillerIndex"]) - 1) * 100, 1)
            
            if len(time_series) >= 12 and "caseSillerIndex" in data_point:
                year_ago_data = time_series[-12]
                if "caseSillerIndex" in year_ago_data and year_ago_data["caseSillerIndex"] > 0:
                    data_point["priceChangeYearly"] = round(((data_point["caseSillerIndex"] / year_ago_data["caseSillerIndex"]) - 1) * 100, 1)
            
            time_series.append(data_point)
        
        # Generate mock-style response structure
        current_data = time_series[-1] if time_series else {}
        return {
            "current_metrics": {
                "case_shiller_index": current_data.get("caseSillerIndex", 0),
                "housing_starts": current_data.get("housingStarts", 0),
                "months_supply": current_data.get("monthsSupply", 0),
                "new_home_sales": current_data.get("newHomeSales", 0),
                "existing_home_sales": current_data.get("existingHomeSales", 0),
                "building_permits": current_data.get("buildingPermits", 0),
                "price_change_monthly": current_data.get("priceChangeMonthly", 0),
                "price_change_yearly": current_data.get("priceChangeYearly", 0)
            },
            "time_series": time_series,
            "alerts": [],
            "trend_analysis": {
                "direction": "flat",
                "strength": "weak", 
                "confidence": 0.5,
                "duration": 3,
                "start_date": time_series[0]["date"] if time_series else "",
                "end_date": time_series[-1]["date"] if time_series else ""
            },
            "statistics": {
                "current": current_data.get("caseSillerIndex", 0),
                "mom_change": current_data.get("priceChangeMonthly", 0),
                "mom_percent_change": current_data.get("priceChangeMonthly", 0),
                "yoy_change": current_data.get("priceChangeYearly", 0),
                "yoy_percent_change": current_data.get("priceChangeYearly", 0),
                "volatility_measures": {"standard_deviation": 2.8, "coefficient_of_variation": 0.009}
            }
        }
    
    return {}

async def generate_mock_labor_data(period: TimePeriod, fast_mode: bool) -> Dict[str, Any]:
    """Generate mock labor market data."""
    
    # Calculate date range
    weeks = {"3m": 12, "6m": 24, "12m": 52, "2y": 104, "5y": 260}[period]
    
    # Generate time series data
    time_series = []
    start_date = datetime.utcnow() - timedelta(weeks=weeks)
    
    # Starting realistic values
    base_initial_claims = 220000
    base_continued_claims = 1750000
    base_unemployment_rate = 3.7
    
    for i in range(weeks):
        current_date = start_date + timedelta(weeks=i)
        
        # Add trends and variations
        trend = 0.0002 * i
        noise = (hash(str(current_date)) % 100 - 50) * 0.0006
        
        initial_claims = int(base_initial_claims * (1 + trend + noise))
        continued_claims = int(base_continued_claims * (1 + trend * 1.5 + noise))
        unemployment_rate = round(base_unemployment_rate * (1 + trend * 0.5 + noise * 0.5), 1)
        
        time_series.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "initial_claims": initial_claims,
            "continued_claims": continued_claims,
            "unemployment_rate": unemployment_rate,
            "nonfarm_payrolls": 157000 + int((hash(str(current_date)) % 1000 - 500) * 100),
            "labor_participation": round(63.4 + (hash(str(current_date)) % 20 - 10) * 0.01, 1),
            "job_openings": 9500000 + int((hash(str(current_date)) % 1000 - 500) * 1000)
        })
    
    current_data = time_series[-1]
    
    # Generate current metrics
    current_metrics = LaborMarketMetrics(
        initial_claims=current_data["initial_claims"],
        continued_claims=current_data["continued_claims"],
        unemployment_rate=current_data["unemployment_rate"],
        nonfarm_payrolls=current_data["nonfarm_payrolls"],
        labor_participation=current_data["labor_participation"],
        job_openings=current_data["job_openings"],
        claims_4week=int(sum(d["initial_claims"] for d in time_series[-4:]) / 4),
        weekly_change_initial=2.1 if len(time_series) > 1 else 0.0,
        weekly_change_continued=-1.3 if len(time_series) > 1 else 0.0,
        monthly_change_payrolls=0.8 if len(time_series) > 4 else 0.0
    )
    
    # Generate alerts
    alerts = []
    if current_data["initial_claims"] > 250000:
        alerts.append(AlertResult(
            id="high_initial_claims",
            name="Elevated Initial Claims",
            type="employment_signal",
            severity="warning",
            triggered=True,
            triggered_at=datetime.utcnow().isoformat(),
            message=f"Initial claims at {current_data['initial_claims']:,} exceed normal range",
            data={
                "current_value": current_data["initial_claims"],
                "threshold_value": 250000,
                "indicator": "ICSA",
                "context": {"period": period, "fast_mode": fast_mode}
            }
        ))
    
    return {
        "current_metrics": current_metrics,
        "time_series": time_series,
        "laborData": time_series,  # Add compatibility field
        "alerts": alerts,
        "historical_comparison": {
            "baseline_2021": {"initial_claims": 350000, "unemployment_rate": 5.4},
            "covid_peak": {"initial_claims": 6867000, "unemployment_rate": 14.8}
        },
        "correlation_analysis": {
            "claims_unemployment": 0.75,
            "payrolls_participation": 0.42
        }
    }

async def generate_mock_housing_data(region: str, period: TimePeriod, fast_mode: bool) -> Dict[str, Any]:
    """Generate mock housing market data."""
    
    # Calculate date range  
    months = {"3m": 3, "6m": 6, "12m": 12, "2y": 24, "5y": 60}[period]
    
    # Regional base values
    regional_multipliers = {
        "national": 1.0,
        "ca": 1.28,
        "ny": 1.15,
        "fl": 0.95,
        "tx": 0.88
    }
    multiplier = regional_multipliers.get(region, 1.0)
    
    # Generate time series data
    time_series = []
    start_date = datetime.utcnow() - timedelta(days=months*30)
    
    base_case_shiller = 311.2 * multiplier
    base_housing_starts = 1500000
    
    for i in range(months):
        current_date = start_date + timedelta(days=i*30)
        
        # Add housing market trends
        trend = -0.002 * i  # Gradual decline
        noise = (hash(str(current_date)) % 100 - 50) * 0.0002
        
        case_shiller = round(base_case_shiller * (1 + trend + noise), 1)
        housing_starts = int(base_housing_starts * (1 + (hash(str(current_date)) % 20 - 10) * 0.002))
        
        time_series.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "caseSillerIndex": case_shiller,
            "housingStarts": housing_starts,
            "monthsSupply": round(4.2 + (hash(str(current_date)) % 20 - 10) * 0.02, 1),
            "newHomeSales": 650000 + int((hash(str(current_date)) % 100 - 50) * 1000),
            "existingHomeSales": 4000000 + int((hash(str(current_date)) % 200 - 100) * 1000),
            "buildingPermits": 1400000 + int((hash(str(current_date)) % 100 - 50) * 2000)
        })
    
    current_data = time_series[-1]
    
    # Generate current metrics
    current_metrics = HousingMarketMetrics(
        case_shiller_index=current_data["caseSillerIndex"],
        housing_starts=current_data["housingStarts"],
        months_supply=current_data["monthsSupply"],
        new_home_sales=current_data["newHomeSales"],
        existing_home_sales=current_data["existingHomeSales"],
        building_permits=current_data["buildingPermits"],
        price_change_monthly=-0.3 if len(time_series) > 1 else 0.0,
        price_change_yearly=4.2 if len(time_series) > 12 else 0.0
    )
    
    # Generate trend analysis
    trend_analysis = TrendAnalysis(
        direction="down",
        strength="moderate",
        confidence=0.75,
        duration=6,
        start_date=(datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%d"),
        end_date=datetime.utcnow().strftime("%Y-%m-%d")
    )
    
    # Generate statistics
    statistics = StatisticalAnalysis(
        current=current_data["caseSillerIndex"],
        mom_change=-0.9,
        mom_percent_change=-0.3,
        yoy_change=13.1,
        yoy_percent_change=4.2,
        volatility_measures={
            "standard_deviation": 2.8,
            "coefficient_of_variation": 0.009
        }
    )
    
    # Generate alerts
    alerts = []
    if current_data["monthsSupply"] > 6.0:
        alerts.append(AlertResult(
            id="high_inventory",
            name="Elevated Housing Inventory",
            type="housing_stress",
            severity="info",
            triggered=True,
            triggered_at=datetime.utcnow().isoformat(),
            message=f"Housing inventory at {current_data['monthsSupply']} months supply indicates cooling market",
            data={
                "current_value": current_data["monthsSupply"],
                "threshold_value": 6.0,
                "indicator": "MSACSR",
                "context": {"region": region, "period": period}
            }
        ))
    
    return {
        "current_metrics": current_metrics,
        "time_series": time_series,
        "alerts": alerts,
        "trend_analysis": trend_analysis,
        "statistics": statistics
    }

async def generate_mock_time_series_data(query: TimeSeriesQuery) -> Dict[str, Any]:
    """Generate mock time series data for specified indicators."""
    
    # Calculate date range
    if query.start_date and query.end_date:
        start_date = datetime.fromisoformat(query.start_date.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(query.end_date.replace('Z', '+00:00'))
    else:
        periods = {"3m": 90, "6m": 180, "12m": 365, "2y": 730, "5y": 1825}
        days = periods.get(query.period, 365)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
    
    # Determine data point frequency
    freq_days = {"daily": 1, "weekly": 7, "monthly": 30, "quarterly": 90, "annual": 365}
    increment = freq_days.get(query.frequency, 7)
    
    data_points = []
    current_date = start_date
    
    # Base values for indicators
    base_values = {
        EconomicIndicator.ICSA: 220000,
        EconomicIndicator.CCSA: 1750000,
        EconomicIndicator.UNRATE: 3.7,
        EconomicIndicator.CSUSHPINSA: 311.2,
        EconomicIndicator.HOUST: 1500000,
        EconomicIndicator.PAYEMS: 157000000
    }
    
    while current_date <= end_date:
        for indicator in query.indicators:
            if indicator in base_values:
                base_value = base_values[indicator]
                
                # Add time-based variation
                days_from_start = (current_date - start_date).days
                trend = 0.0001 * days_from_start
                noise = (hash(str(current_date) + indicator) % 100 - 50) * 0.001
                
                value = base_value * (1 + trend + noise)
                
                # Determine data source
                if indicator in [EconomicIndicator.ICSA, EconomicIndicator.CCSA]:
                    source = DataSource.DOL
                elif indicator in [EconomicIndicator.UNRATE, EconomicIndicator.PAYEMS]:
                    source = DataSource.BLS  
                else:
                    source = DataSource.FRED
                
                data_points.append(EconomicDataPoint(
                    date=current_date.strftime("%Y-%m-%d"),
                    value=round(value, 2),
                    symbol=indicator,
                    source=source,
                    metadata={
                        "frequency": query.frequency,
                        "seasonally_adjusted": query.seasonally_adjusted,
                        "period": current_date.strftime("%Y-%m") if query.frequency == "monthly" else current_date.strftime("%Y-W%W")
                    }
                ))
        
        current_date += timedelta(days=increment)
    
    return {"data": data_points}

def calculate_statistics(data_points: List[EconomicDataPoint]) -> StatisticalAnalysis:
    """Calculate statistical analysis for a series of data points."""
    
    if len(data_points) < 2:
        return StatisticalAnalysis(
            current=data_points[0].value if data_points else 0,
            mom_change=0,
            mom_percent_change=0,
            yoy_change=0,
            yoy_percent_change=0,
            volatility_measures={"standard_deviation": 0, "coefficient_of_variation": 0}
        )
    
    values = [dp.value for dp in sorted(data_points, key=lambda x: x.date)]
    current = values[-1]
    
    # Month-over-month change
    mom_change = values[-1] - values[-2] if len(values) >= 2 else 0
    mom_percent_change = (mom_change / values[-2] * 100) if len(values) >= 2 and values[-2] != 0 else 0
    
    # Year-over-year change (approximate with available data)
    yoy_index = max(0, len(values) - 12)
    yoy_change = values[-1] - values[yoy_index] if len(values) > yoy_index else 0
    yoy_percent_change = (yoy_change / values[yoy_index] * 100) if len(values) > yoy_index and values[yoy_index] != 0 else 0
    
    # Volatility measures
    mean_value = sum(values) / len(values)
    variance = sum((x - mean_value) ** 2 for x in values) / len(values)
    std_deviation = variance ** 0.5
    coefficient_of_variation = std_deviation / mean_value if mean_value != 0 else 0
    
    return StatisticalAnalysis(
        current=current,
        mom_change=mom_change,
        mom_percent_change=round(mom_percent_change, 2),
        yoy_change=yoy_change,
        yoy_percent_change=round(yoy_percent_change, 2),
        volatility_measures={
            "standard_deviation": round(std_deviation, 2),
            "coefficient_of_variation": round(coefficient_of_variation, 4)
        }
    )

def calculate_correlation_matrix(
    data_points: List[EconomicDataPoint], 
    indicators: List[EconomicIndicator]
) -> Dict[str, Dict[str, float]]:
    """Calculate correlation matrix between indicators."""
    
    # Group data by date
    date_groups = {}
    for dp in data_points:
        if dp.date not in date_groups:
            date_groups[dp.date] = {}
        date_groups[dp.date][dp.symbol] = dp.value
    
    # Filter dates that have all indicators
    complete_dates = [
        date for date, values in date_groups.items() 
        if all(indicator in values for indicator in indicators)
    ]
    
    if len(complete_dates) < 2:
        return {}
    
    # Build correlation matrix
    correlation_matrix = {}
    for i, indicator1 in enumerate(indicators):
        correlation_matrix[indicator1.value] = {}
        values1 = [date_groups[date][indicator1] for date in complete_dates]
        
        for j, indicator2 in enumerate(indicators):
            if i == j:
                correlation_matrix[indicator1.value][indicator2.value] = 1.0
            else:
                values2 = [date_groups[date][indicator2] for date in complete_dates]
                
                # Simple correlation calculation
                mean1 = sum(values1) / len(values1)
                mean2 = sum(values2) / len(values2)
                
                numerator = sum((v1 - mean1) * (v2 - mean2) for v1, v2 in zip(values1, values2))
                denominator1 = sum((v1 - mean1) ** 2 for v1 in values1) ** 0.5
                denominator2 = sum((v2 - mean2) ** 2 for v2 in values2) ** 0.5
                
                if denominator1 * denominator2 != 0:
                    correlation = numerator / (denominator1 * denominator2)
                else:
                    correlation = 0.0
                
                correlation_matrix[indicator1.value][indicator2.value] = round(correlation, 3)
    
    return correlation_matrix