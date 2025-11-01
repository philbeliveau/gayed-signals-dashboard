"""
Story 4.0d Task 2.6: Base Test Utilities
Mock implementations for testing signal calculators
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from signals.types import (
    SignalConfig,
    SignalType,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    OHLCData,
)


# ===== MOCK PRISMA CLIENT =====

class MockPrismaClient:
    """Mock Prisma client for testing"""

    def __init__(self):
        self.signalconfiguration = MockSignalConfigurationTable()
        self.signalhistory = MockSignalHistoryTable()
        self.signalcache = MockSignalCacheTable()
        self.marketdata = MockMarketDataTable()
        self.dataprovenance = MockDataProvenanceTable()

    async def connect(self):
        """Mock connect"""
        pass

    async def disconnect(self):
        """Mock disconnect"""
        pass


class MockSignalConfigurationTable:
    """Mock SignalConfiguration table"""

    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}

    async def find_unique(self, query: Dict):
        """Find single configuration"""
        signal_type = query.get('where', {}).get('signalType')
        return self._data.get(signal_type)

    async def find_many(self, query: Dict):
        """Find multiple configurations"""
        where = query.get('where', {})
        enabled_only = where.get('enabled', None)

        results = list(self._data.values())

        if enabled_only is not None:
            results = [r for r in results if r.get('enabled') == enabled_only]

        return results

    async def create(self, query: Dict):
        """Create configuration"""
        data = query['data']
        signal_type = data['signalType']
        self._data[signal_type] = data
        return data

    async def update(self, query: Dict):
        """Update configuration"""
        signal_type = query['where']['signalType']
        if signal_type in self._data:
            self._data[signal_type].update(query['data'])
            return self._data[signal_type]
        return None

    def seed(self, signal_type: str, config: Dict[str, Any]):
        """Seed test data"""
        self._data[signal_type] = config


class MockSignalHistoryTable:
    """Mock SignalHistory table"""

    def __init__(self):
        self._data: List[Dict[str, Any]] = []
        self._id_counter = 1

    async def create(self, query: Dict):
        """Create signal history record"""
        data = query['data']
        data['id'] = self._id_counter
        self._id_counter += 1
        self._data.append(data)
        return data

    async def find_many(self, query: Dict):
        """Find signal history records"""
        where = query.get('where', {})
        results = self._data.copy()

        if 'signalName' in where:
            results = [r for r in results if r.get('signalName') == where['signalName']]

        if 'calculationDate' in where:
            results = [r for r in results if r.get('calculationDate') == where['calculationDate']]

        return results

    def get_all(self):
        """Get all records (for testing)"""
        return self._data


class MockSignalCacheTable:
    """Mock SignalCache table"""

    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}

    async def find_unique(self, query: Dict):
        """Find cache entry"""
        cache_key = query.get('where', {}).get('cacheKey')
        entry = self._data.get(cache_key)

        # Check expiration
        if entry and entry.get('expiresAt'):
            if datetime.now() > entry['expiresAt']:
                del self._data[cache_key]
                return None

        return entry

    async def create(self, query: Dict):
        """Create cache entry"""
        data = query['data']
        cache_key = data['cacheKey']
        self._data[cache_key] = data
        return data

    async def update(self, query: Dict):
        """Update cache entry"""
        cache_key = query['where']['cacheKey']
        if cache_key in self._data:
            self._data[cache_key].update(query['data'])
            return self._data[cache_key]
        return None


class MockMarketDataTable:
    """Mock MarketData table"""

    def __init__(self):
        self._data: List[Dict[str, Any]] = []

    async def find_many(self, query: Dict):
        """Find market data"""
        where = query.get('where', {})
        results = self._data.copy()

        if 'symbol' in where:
            results = [r for r in results if r.get('symbol') == where['symbol']]

        if 'date' in where:
            date_filter = where['date']
            if 'gte' in date_filter:
                results = [r for r in results if r.get('date') >= date_filter['gte']]
            if 'lte' in date_filter:
                results = [r for r in results if r.get('date') <= date_filter['lte']]

        # Apply ordering
        order_by = query.get('orderBy', {})
        if 'date' in order_by:
            reverse = order_by['date'] == 'desc'
            results.sort(key=lambda x: x.get('date'), reverse=reverse)

        return results

    def seed(self, data: List[Dict[str, Any]]):
        """Seed test data"""
        self._data.extend(data)


class MockDataProvenanceTable:
    """Mock DataProvenance table"""

    def __init__(self):
        self._data: List[Dict[str, Any]] = []

    async def create(self, query: Dict):
        """Create provenance record"""
        data = query['data']
        self._data.append(data)
        return data


# ===== MOCK REDIS CLIENT =====

class MockRedisClient:
    """Mock Redis client for testing"""

    def __init__(self):
        self._data: Dict[str, str] = {}
        self._ttls: Dict[str, float] = {}

    async def get(self, key: str) -> Optional[str]:
        """Get value"""
        # Check TTL
        if key in self._ttls:
            if datetime.now().timestamp() > self._ttls[key]:
                del self._data[key]
                del self._ttls[key]
                return None

        return self._data.get(key)

    async def set(self, key: str, value: str):
        """Set value"""
        self._data[key] = value

    async def setex(self, key: str, seconds: int, value: str):
        """Set value with expiration"""
        self._data[key] = value
        self._ttls[key] = datetime.now().timestamp() + seconds

    async def delete(self, key: str):
        """Delete value"""
        if key in self._data:
            del self._data[key]
        if key in self._ttls:
            del self._ttls[key]

    async def keys(self, pattern: str):
        """Get keys matching pattern"""
        import re
        regex_pattern = pattern.replace('*', '.*')
        return [k for k in self._data.keys() if re.match(regex_pattern, k)]

    async def incr(self, key: str):
        """Increment counter"""
        current = int(self._data.get(key, '0'))
        self._data[key] = str(current + 1)
        return current + 1

    async def ping(self):
        """Ping"""
        return True

    def clear(self):
        """Clear all data (for testing)"""
        self._data.clear()
        self._ttls.clear()


# ===== MOCK VALIDATOR =====

class MockDataValidator:
    """Mock data validation service"""

    def __init__(self, default_score: float = 1.0):
        self.default_score = default_score
        self._validate_calls: List[Dict[str, Any]] = []
        self._errors: List[ValidationError] = []
        self._warnings: List[ValidationWarning] = []

    async def validate(
        self,
        data: Any,
        options: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Mock validation - main interface used by BaseSignalCalculator"""
        self._validate_calls.append({
            'data_type': type(data).__name__,
            'options': options,
            'timestamp': datetime.now()
        })

        return ValidationResult(
            score=self.default_score,
            errors=self._errors.copy(),
            warnings=self._warnings.copy()
        )

    async def validate_market_data(
        self,
        data: List[OHLCData],
        validation_rules: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Mock validation for market data"""
        self._validate_calls.append({
            'data_count': len(data),
            'rules': validation_rules,
            'timestamp': datetime.now()
        })

        return ValidationResult(
            score=self.default_score,
            errors=self._errors.copy(),
            warnings=self._warnings.copy()
        )

    async def validate_data_quality(
        self,
        data: Any,
        rules: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """Mock general validation"""
        return ValidationResult(
            score=self.default_score,
            errors=self._errors.copy(),
            warnings=self._warnings.copy()
        )

    def set_score(self, score: float):
        """Set validation score for testing"""
        self.default_score = score

    def add_error(self, category: str, message: str):
        """Add validation error for testing"""
        self._errors.append(ValidationError(
            category=category,
            severity='error',
            message=message,
            field=None
        ))

    def add_warning(self, category: str, message: str):
        """Add validation warning for testing"""
        self._warnings.append(ValidationWarning(
            category=category,
            severity='warning',
            message=message,
            field=None
        ))

    def clear_issues(self):
        """Clear errors and warnings"""
        self._errors.clear()
        self._warnings.clear()


# ===== MOCK MARKET DATA REPOSITORY =====

class MockMarketDataRepository:
    """Mock market data repository"""

    def __init__(self):
        self._data: Dict[str, List[OHLCData]] = {}

    async def get_market_data(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        data_type: str = 'price'
    ) -> List[OHLCData]:
        """Get market data"""
        symbol_data = self._data.get(symbol, [])

        # Filter by date range
        filtered = [
            d for d in symbol_data
            if start_date <= d.date <= end_date
        ]

        return filtered

    def seed(self, symbol: str, data: List[OHLCData]):
        """Seed test data"""
        self._data[symbol] = data

    async def get_latest_price(self, symbol: str) -> Optional[OHLCData]:
        """Get latest price"""
        symbol_data = self._data.get(symbol, [])
        return symbol_data[-1] if symbol_data else None


# ===== TEST DATA GENERATORS =====

def generate_ohlc_data(
    symbol: str,
    start_date: datetime,
    days: int,
    base_price: float = 100.0,
    volatility: float = 0.02
) -> List[OHLCData]:
    """Generate synthetic OHLC data for testing"""
    import random

    data = []
    current_price = Decimal(str(base_price))

    for i in range(days):
        date = start_date + timedelta(days=i)

        # Generate random price movement
        change = Decimal(str(random.uniform(-volatility, volatility)))
        current_price = current_price * (Decimal('1') + change)

        # Generate OHLC with realistic intraday movement
        intraday_range = current_price * Decimal(str(volatility * 0.5))

        open_price = current_price
        close_price = current_price * (Decimal('1') + Decimal(str(random.uniform(-volatility/2, volatility/2))))
        high_price = max(open_price, close_price) + Decimal(str(random.uniform(0, float(intraday_range))))
        low_price = min(open_price, close_price) - Decimal(str(random.uniform(0, float(intraday_range))))

        volume = random.randint(1000000, 10000000)

        data.append(OHLCData(
            date=date,
            timestamp=date,
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            volume=volume,
            adjusted_close=close_price
        ))

    return data


def generate_uptrend_data(
    symbol: str,
    start_date: datetime,
    days: int,
    start_price: float = 100.0,
    daily_gain: float = 0.002
) -> List[OHLCData]:
    """Generate uptrending OHLC data"""
    data = []
    current_price = Decimal(str(start_price))

    for i in range(days):
        date = start_date + timedelta(days=i)

        # Consistent uptrend with small variations
        daily_change = Decimal(str(daily_gain))
        current_price = current_price * (Decimal('1') + daily_change)

        data.append(OHLCData(
            date=date,
            timestamp=date,
            open=current_price * Decimal('0.995'),
            high=current_price * Decimal('1.005'),
            low=current_price * Decimal('0.990'),
            close=current_price,
            volume=5000000,
            adjusted_close=current_price
        ))

    return data


def generate_downtrend_data(
    symbol: str,
    start_date: datetime,
    days: int,
    start_price: float = 100.0,
    daily_loss: float = 0.002
) -> List[OHLCData]:
    """Generate downtrending OHLC data"""
    return generate_uptrend_data(symbol, start_date, days, start_price, -daily_loss)


# ===== TEST CONFIGURATION FACTORY =====

def create_test_config(
    name: str,
    signal_type: SignalType,
    parameters: Dict[str, Any],
    **kwargs
) -> SignalConfig:
    """Create test signal configuration"""
    return SignalConfig(
        name=name,
        type=signal_type,
        version=kwargs.get('version', '1.0.0-test'),
        parameters=parameters,
        cache_ttl=kwargs.get('cache_ttl', 60),
        timeout_ms=kwargs.get('timeout_ms', 1000),
        required_data_sources=kwargs.get('required_data_sources', []),
        description=kwargs.get('description', f'Test configuration for {name}'),
        tags=kwargs.get('tags', ['test'])
    )


# ===== EXPORT ALL UTILITIES =====

__all__ = [
    'MockPrismaClient',
    'MockRedisClient',
    'MockDataValidator',
    'MockMarketDataRepository',
    'generate_ohlc_data',
    'generate_uptrend_data',
    'generate_downtrend_data',
    'create_test_config',
]
