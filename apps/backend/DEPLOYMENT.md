# Signal Framework Deployment Guide

**Story 4.0d: Signal Calculation Standardization**
**Status**: ✅ Complete
**Railway Backend**: PostgreSQL + Redis Integration

---

## 📦 Deployment Checklist

### 1. Railway Setup

```bash
# Install Railway CLI
npm install -g railway

# Login to Railway
railway login

# Link project
railway link

# Verify services
railway status
```

**Required Railway Services:**
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Python runtime environment

### 2. Environment Configuration

Create `.env` file with Railway variables:

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

# Optional: Signal-Specific Overrides
GAYED_8M_ENABLED=true
GAYED_8M_SHORT_PERIOD=8
GAYED_8M_LONG_PERIOD=9
```

### 3. Database Migration

```bash
# Generate Prisma client
railway run prisma generate --schema=apps/backend/prisma/schema.prisma

# Run migrations
railway run prisma migrate deploy --schema=apps/backend/prisma/schema.prisma

# Seed signal configurations
railway run prisma db seed
```

### 4. Install Dependencies

```bash
# Install Python dependencies
railway run pip install -r apps/backend/requirements.txt

# Verify Prisma installation
railway run prisma --version
```

### 5. Test Deployment

```bash
# Run health check
railway run python -m apps.backend.main --health-check

# Test signal calculation
railway run python -m apps.backend.signals.test_runner

# Verify Redis connection
railway run python -c "from signals.utils import RedisClient; import asyncio; asyncio.run(RedisClient.get_instance().ping())"
```

---

## 🔧 Signal Calculator Usage

### Initialize Calculator

```python
from signals.calculators import Gayed8MonthCalculator
from signals.services import SignalConfigLoader
from signals.utils import RedisClient
from prisma import Prisma

# Initialize dependencies
prisma = Prisma()
await prisma.connect()

redis = await RedisClient.get_instance()
config_loader = SignalConfigLoader(prisma)
config = await config_loader.get_config('gayed_8_month')

# Create calculator
calculator = Gayed8MonthCalculator(
    config=config,
    prisma_client=prisma,
    redis_client=redis,
    validator=validator,
    market_data_repo=market_data_repo,
)

# Calculate signal
from signals.types import CalculationContext
from datetime import datetime

context = CalculationContext(
    date=datetime.now(),
    validate_before_calc=True,
    save_to_database=True,
)

result = await calculator.compute(context)

print(f"Signal: {result.value.signal}")
print(f"Confidence: {result.metadata.confidence}")
print(f"Data Quality: {result.metadata.data_quality}")
```

### Available Calculators

1. **Gayed8MonthCalculator** - 8-month/9-month MA timing signal
2. **Gayed20DCalculator** - Utilities/SPY 20-day ratio
3. **BollingerBandsCalculator** - Volatility signal
4. **AggregateSignalCalculator** - Composite weighted signal

---

## 📊 Performance Monitoring

```python
from signals.utils import get_performance_tracker

tracker = get_performance_tracker()

# Get statistics
stats = tracker.get_statistics('gayed_8_month', last_n=100)

print(f"Average duration: {stats['avg_duration_ms']}ms")
print(f"Cache hit rate: {stats['cache_hit_rate']:.2%}")
```

---

## 🧪 Testing

### Run Unit Tests

```bash
# All tests
railway run pytest apps/backend/tests/unit/signals/ -v

# Specific signal
railway run pytest apps/backend/tests/unit/signals/test_gayed_8_month.py -v

# With coverage
railway run pytest apps/backend/tests/unit/signals/ --cov=signals --cov-report=html
```

### Run Integration Tests

```bash
# Integration tests use REAL Railway PostgreSQL and Redis
railway run pytest apps/backend/tests/integration/signals/ -v
```

---

## 🔍 Troubleshooting

### Redis Connection Issues

```python
# Check Redis connectivity
from signals.utils import RedisClient
import asyncio

redis = await RedisClient.get_instance()
await redis.ping()  # Should return True
```

### Database Migration Failures

```bash
# Reset database (DANGER: loses data)
railway run prisma migrate reset --schema=apps/backend/prisma/schema.prisma

# View migration status
railway run prisma migrate status --schema=apps/backend/prisma/schema.prisma
```

### Data Quality Issues

```python
# Check validation results
result = await calculator.compute(context)

if result.metadata.data_quality < 0.8:
    print(f"Low data quality: {result.metadata.data_quality}")
    # Check validation details in SignalHistory table
```

---

## 📈 Production Monitoring

### Key Metrics to Track

1. **Signal Calculation Duration**
   - Target: < 1 second per signal
   - Alert if > 5 seconds

2. **Cache Hit Rate**
   - Target: > 80%
   - Alert if < 50%

3. **Data Quality Score**
   - Target: > 0.9
   - Alert if < 0.8

4. **Database Connection Pool**
   - Monitor Prisma connection count
   - Alert if connections exhausted

### Monitoring Queries

```sql
-- Recent signal calculations
SELECT signal_name, calculation_date, signal_value, data_quality_score
FROM signal_history
ORDER BY calculation_timestamp DESC
LIMIT 100;

-- Cache performance
SELECT signal_type, COUNT(*), AVG(hit_count)
FROM signal_cache
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY signal_type;

-- Failed calculations
SELECT signal_name, error_message, created_at
FROM signal_history
WHERE signal_status = 'error'
ORDER BY created_at DESC;
```

---

## 🚀 Next Steps

1. **Task 3-6**: All core signals implemented ✅
2. **Task 7**: Performance optimization complete ✅
3. **Task 8**: Documentation complete ✅

### Future Enhancements

- [ ] Add real-time signal streaming via WebSockets
- [ ] Implement signal backtesting framework
- [ ] Add machine learning-based signal optimization
- [ ] Create admin dashboard for signal configuration
- [ ] Add alerting system for signal changes

---

## 📚 Documentation

- [Signal Framework README](./signals/README.md) - Complete framework documentation
- [Story 4.0d Specification](../../docs/stories/4.0d.signal-standardization.md) - Full requirements
- [Data Pipeline Architecture](../../docs/architecture/data-pipeline-architecture.md) - System design
- [API Documentation](./API.md) - REST API endpoints

---

## 🆘 Support

For issues or questions:
1. Check Story 4.0d Dev Notes section
2. Review BaseSignalCalculator docstrings
3. Consult example implementations in signal README
4. Review test files for usage patterns
