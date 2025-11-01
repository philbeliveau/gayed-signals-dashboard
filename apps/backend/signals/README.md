# Signal Calculation Framework

**Story 4.0d**: Signal Calculation Standardization
**Status**: Base Framework Complete (Tasks 1-2 Done)
**Railway**: PostgreSQL + Redis Integration

## Overview

This directory contains the standardized signal calculation framework for the Gayed Signals Dashboard. All signal calculators extend `BaseSignalCalculator` and follow a unified lifecycle for data fetching, validation, calculation, and persistence.

## Architecture

```
signals/
├── types/                  # Type definitions (Pydantic models)
│   ├── signal_types.py    # Core types: SignalConfig, SignalResult, etc.
│   └── __init__.py
├── calculators/            # Signal calculator implementations
│   ├── base_calculator.py # Abstract base class
│   └── __init__.py
├── services/               # Configuration and orchestration
│   ├── signal_config_loader.py  # PostgreSQL config loader
│   └── __init__.py
├── utils/                  # Utility functions
│   ├── redis_client.py    # Railway Redis caching
│   └── __init__.py
└── README.md              # This file
```

## Core Components

### 1. BaseSignalCalculator (`calculators/base_calculator.py`)

Abstract base class providing standardized signal calculation lifecycle:

```python
from signals.calculators import BaseSignalCalculator
from signals.types import SignalConfig, CalculationContext

class MySignal(BaseSignalCalculator[MyInput, MyOutput, MyParams]):
    async def fetch_data(self, context: CalculationContext) -> MyInput:
        # Fetch from Railway PostgreSQL
        pass

    async def calculate(self, data: MyInput, context: CalculationContext) -> MyOutput:
        # Core calculation logic
        pass

    def get_signal_metadata(self) -> Dict[str, Any]:
        return {
            'description': 'My signal',
            'interpretation': 'Bullish when...',
        }

    def extract_numeric_value(self, result: MyOutput) -> float:
        return result.value

    def calculate_strength(self, result: MyOutput) -> float:
        return result.strength

    def determine_status(self, result: MyOutput) -> SignalStatus:
        return SignalStatus.BULLISH if result.value > 0 else SignalStatus.BEARISH
```

**Lifecycle Steps**:
1. ✅ Check Railway Redis cache
2. ✅ Fetch data from Railway PostgreSQL (via Prisma)
3. ✅ Validate data quality (Story 4.0c)
4. ✅ Prepare/transform data
5. ✅ Calculate signal value
6. ✅ Post-process result (add metadata)
7. ✅ Persist to Railway PostgreSQL
8. ✅ Update Railway Redis cache
9. ✅ Record performance metrics

### 2. Type System (`types/signal_types.py`)

Pydantic models for type safety:

- **SignalType**: Enum (timing, momentum, volatility, trend, composite)
- **SignalStatus**: Enum (bullish, bearish, neutral, defensive, error)
- **SignalConfig[TParams]**: Configuration with parameters
- **CalculationContext**: Execution context (date, symbol, options)
- **SignalResult[TOutput]**: Calculation result with metadata
- **ValidationResult**: Data quality validation
- **OHLCData**: Market data with OHLC validation

### 3. Railway Redis Caching (`utils/redis_client.py`)

Railway Redis integration for high-performance caching:

```python
from signals.utils import get_signal_cache

cache = await get_signal_cache()

# Get cached result
result = await cache.get('gayed_8_month', date, params)

# Set cached result
await cache.set('gayed_8_month', date, result, params, ttl=3600)

# Cache statistics
stats = await cache.get_stats('gayed_8_month')
```

**Features**:
- Automatic cache key generation
- TTL management
- Hit count tracking
- Pattern-based clearing
- Health checking

### 4. Configuration Management (`services/signal_config_loader.py`)

Loads signal configuration from Railway PostgreSQL:

```python
from signals.services import SignalConfigLoader

loader = SignalConfigLoader(prisma_client)

# Get single config
config = await loader.get_config('gayed_8_month')

# Get all enabled configs
configs = await loader.get_all_configs(enabled_only=True)

# Update config at runtime
await loader.update_config('gayed_8_month', new_params)
```

**Features**:
- PostgreSQL-backed configuration
- Environment variable fallback
- 5-minute configuration cache
- Runtime parameter updates
- Signal type inference

## Database Schema

Signal-specific tables (Railway PostgreSQL):

### SignalConfiguration
```sql
CREATE TABLE signal_configuration (
    id UUID PRIMARY KEY,
    signal_type VARCHAR(100) UNIQUE NOT NULL,
    parameters JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### SignalHistory
```sql
CREATE TABLE signal_history (
    id INT PRIMARY KEY,
    signal_name VARCHAR(100) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    calculation_date DATE NOT NULL,
    signal_value DECIMAL(12,6),
    signal_strength DECIMAL(5,4),
    signal_status VARCHAR(20),
    confidence_score DECIMAL(5,4),
    data_quality_score DECIMAL(5,4),
    -- ... additional fields
    UNIQUE(signal_name, calculation_date)
);
```

### SignalCache
```sql
CREATE TABLE signal_cache (
    id UUID PRIMARY KEY,
    cache_key VARCHAR(500) UNIQUE NOT NULL,
    signal_type VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hit_count INT DEFAULT 0
);
```

## Environment Variables

Required for Railway deployment:

```bash
# Railway Auto-Provided
DATABASE_URL=${{POSTGRES.DATABASE_URL}}
REDIS_URL=${{REDIS.REDIS_URL}}
PORT=${{PORT}}

# Signal Configuration
SIGNAL_CALCULATION_ENABLED=true
SIGNAL_CALCULATION_INTERVAL=3600000  # 1 hour
SIGNAL_CACHE_TTL=3600                # 1 hour
SIGNAL_MIN_DATA_QUALITY_SCORE=0.8

# Signal-Specific (optional, overrides PostgreSQL)
GAYED_8M_ENABLED=true
GAYED_8M_SHORT_PERIOD=8
GAYED_8M_LONG_PERIOD=9
```

## Usage Example

### Complete Signal Implementation

```python
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List

from signals.calculators import BaseSignalCalculator
from signals.types import (
    SignalConfig,
    SignalType,
    SignalStatus,
    CalculationContext,
    OHLCData,
)

# Define input/output types
class Gayed8MonthInput:
    spy: List[OHLCData]
    date: datetime

class Gayed8MonthOutput:
    short_ma: Decimal
    long_ma: Decimal
    spread: Decimal
    signal: str
    confidence: float

# Define parameters
class Gayed8MonthParams:
    short_period: int = 8
    long_period: int = 9
    minimum_data_points: int = 20

# Implement calculator
class Gayed8MonthCalculator(
    BaseSignalCalculator[
        Gayed8MonthInput,
        Gayed8MonthOutput,
        Gayed8MonthParams
    ]
):
    async def fetch_data(
        self,
        context: CalculationContext
    ) -> Gayed8MonthInput:
        """Fetch SPY data from Railway PostgreSQL"""
        start_date = context.date - timedelta(days=365)

        spy_data = await self.market_data_repo.get_market_data(
            symbol='SPY',
            start_date=start_date,
            end_date=context.date,
            data_type='price'
        )

        return Gayed8MonthInput(spy=spy_data, date=context.date)

    async def calculate(
        self,
        data: Gayed8MonthInput,
        context: CalculationContext
    ) -> Gayed8MonthOutput:
        """Calculate 8-month moving average signal"""
        params = self.config.parameters

        # Filter data up to calculation date
        relevant = [d for d in data.spy if d.date <= data.date]

        if len(relevant) < params['minimumDataPoints']:
            raise InsufficientDataError(
                f"Need {params['minimumDataPoints']} points, got {len(relevant)}",
                required=params['minimumDataPoints'],
                actual=len(relevant)
            )

        # Calculate moving averages
        short_ma = self._calculate_ma(relevant, params['shortPeriod'])
        long_ma = self._calculate_ma(relevant, params['longPeriod'])

        # Calculate spread
        spread = ((short_ma - long_ma) / long_ma) * 100

        # Determine signal
        signal = 'bullish' if short_ma > long_ma else 'bearish'

        # Calculate confidence
        confidence = min(1.0, abs(spread) / 5.0)

        return Gayed8MonthOutput(
            short_ma=short_ma,
            long_ma=long_ma,
            spread=spread,
            signal=signal,
            confidence=confidence
        )

    def get_signal_metadata(self) -> Dict[str, Any]:
        return {
            'description': 'Gayed 8-Month Timing Signal',
            'interpretation': 'Bullish when 8-month MA > 9-month MA',
            'thresholds': {
                'strong_bullish': 2.0,
                'weak_bullish': 0.5,
                'neutral': 0.0,
                'weak_bearish': -0.5,
                'strong_bearish': -2.0,
            }
        }

    def extract_numeric_value(self, result: Gayed8MonthOutput) -> float:
        return float(result.spread)

    def calculate_strength(self, result: Gayed8MonthOutput) -> float:
        # Normalize to -1 to 1 range (clip at ±10%)
        return max(-1, min(1, float(result.spread) / 10))

    def determine_status(self, result: Gayed8MonthOutput) -> SignalStatus:
        spread = float(result.spread)
        if spread > 2.0:
            return SignalStatus.BULLISH
        elif spread < -2.0:
            return SignalStatus.BEARISH
        else:
            return SignalStatus.NEUTRAL

    def _calculate_ma(self, data: List[OHLCData], period: int) -> Decimal:
        """Calculate simple moving average"""
        recent = data[-period:]
        total = sum(d.close for d in recent)
        return total / period
```

### Using the Calculator

```python
# Initialize dependencies
prisma_client = PrismaClient()
redis_client = await RedisClient.get_instance()
validator = DataValidationService()
market_data_repo = MarketDataRepository(prisma_client)

# Load configuration from PostgreSQL
config_loader = SignalConfigLoader(prisma_client)
config = await config_loader.get_config('gayed_8_month')

# Create calculator instance
calculator = Gayed8MonthCalculator(
    config=config,
    prisma_client=prisma_client,
    redis_client=redis_client,
    validator=validator,
    market_data_repo=market_data_repo,
)

# Calculate signal
context = CalculationContext(
    date=datetime.now(),
    validate_before_calc=True,
    save_to_database=True,
)

result = await calculator.compute(context)

print(f"Signal: {result.value.signal}")
print(f"Spread: {result.value.spread}%")
print(f"Confidence: {result.metadata.confidence}")
print(f"Data Quality: {result.metadata.data_quality}")
```

## Testing

Create tests in `apps/backend/tests/unit/signals/`:

```python
import pytest
from datetime import datetime
from signals.calculators import MySignalCalculator

@pytest.mark.asyncio
async def test_signal_calculation():
    # Mock dependencies
    mock_prisma = MockPrismaClient()
    mock_redis = MockRedisClient()
    mock_validator = MockValidator()

    # Create calculator
    calculator = MySignalCalculator(
        config=test_config,
        prisma_client=mock_prisma,
        redis_client=mock_redis,
        validator=mock_validator,
        market_data_repo=mock_repo,
    )

    # Execute calculation
    result = await calculator.compute(test_context)

    # Assertions
    assert result.signal_name == 'my_signal'
    assert result.metadata.data_quality > 0.8
```

## Next Steps

### Task 3-5: Individual Signal Refactoring
- [ ] 3. Gayed 8-Month Signal (move from `apps/web/src/domains/trading-signals/engines/gayed-signals/`)
- [ ] 4. Gayed 20-Day Signal
- [ ] 5. Bollinger Band Signal
- [ ] 6. Aggregate Signal

### Task 6: Optimization
- [ ] Batch calculation support
- [ ] Incremental calculation
- [ ] Parallel execution
- [ ] Performance benchmarking

### Task 7: Testing
- [ ] Unit tests (>90% coverage)
- [ ] Integration tests (real Railway PostgreSQL)
- [ ] Snapshot tests (regression detection)
- [ ] Performance tests

## Railway Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Generate Prisma client
prisma generate --schema=prisma/schema.prisma

# Run migrations
railway run npx prisma migrate deploy

# Seed configurations
railway run npx prisma db seed

# Deploy
railway up

# Verify
curl https://your-app.railway.app/health
```

## Documentation

- [Story 4.0d](../../../docs/stories/4.0d.signal-standardization.md) - Full specification
- [Data Pipeline Architecture](../../../docs/architecture/data-pipeline-architecture.md) - System design
- [Coding Standards](../../../docs/architecture/coding-standards.md) - Development patterns

## Support

Questions? Check:
1. Story 4.0d Dev Notes section
2. BaseSignalCalculator docstrings
3. Example implementations in this README
