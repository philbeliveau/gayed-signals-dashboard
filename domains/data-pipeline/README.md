# Unified Data Pipeline

**Story**: 4.0a - Unified Data Service
**Status**: Implementation Complete
**Deployed On**: Railway with PostgreSQL

## Overview

The Unified Data Service is the **single entry point** for all external data fetching operations in the Gayed Signals Dashboard. It provides:

- ✅ Failover between data sources
- ✅ Intelligent caching with Redis
- ✅ Complete provenance tracking
- ✅ Data quality validation
- ✅ Circuit breaker protection
- ✅ PostgreSQL persistence

## Architecture

```
External APIs → Unified Data Service → Cache/DB → Signal Calculators → Frontend
```

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Railway credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Railway Deployment

```bash
# Deploy Prisma schema
npm run prisma:deploy

# Railway will automatically build and deploy using railway.toml
```

## Environment Variables

Required variables (see `.env.example`):

```env
DATABASE_URL=postgresql://...          # Internal Railway URL
DATABASE_PUBLIC_URL=postgresql://...   # Public URL for migrations
REDIS_URL=redis://...                  # Railway Redis
PORT=3001                              # Server port
```

## API Endpoints

### Health Check
```
GET /health
```

Returns system health status including database, Redis, and data source health.

### Market Data
```
GET /api/v2/market-data?symbols=SPY,XLU&useCache=true&fallbackEnabled=true
```

Parameters:
- `symbols` (required): Comma-separated list of symbols
- `useCache` (optional): Use cached data if available (default: true)
- `fallbackEnabled` (optional): Enable failover to secondary sources (default: true)

Response:
```json
{
  "success": true,
  "result": {
    "data": [...],
    "source": "YAHOO_FINANCE",
    "quality": {
      "score": 0.95,
      "status": "VALID",
      "confidence": 0.95
    },
    "provenance": {
      "fetchId": "uuid",
      "source": "YAHOO_FINANCE",
      "symbols": ["SPY"],
      "fetchedAt": "2025-10-31T...",
      "apiSuccess": true,
      "confidence": 0.95
    },
    "cached": false,
    "timestamp": "2025-10-31T..."
  }
}
```

## Database Schema

### MarketData
Stores all fetched market data with source and quality information.

### DataProvenance
Tracks every data fetch operation for audit and compliance.

### DataSourceHealth
Monitors health and availability of external data sources.

### CacheMetadata
Metadata for Redis cache entries.

### SignalHistory
Historical record of calculated signals.

## Data Sources

1. **Yahoo Finance** (Priority 1)
   - Primary source for market data
   - High availability, free tier

2. **Tiingo** (Priority 2)
   - Backup source for market data
   - Requires API key

3. **Alpha Vantage** (Priority 3)
   - Tertiary source
   - Rate limited, requires API key

## Circuit Breaker

Each data source has a circuit breaker that:
- Opens after 5 consecutive failures
- Stays open for 60 seconds
- Transitions to half-open to test recovery
- Closes after 2 successful requests

## Caching Strategy

- **L1 Cache**: Redis (5 minutes TTL)
- **L2 Cache**: PostgreSQL (persistent)
- **Stale-While-Revalidate**: Serve stale cache during failures

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Monitoring

### Key Metrics
- Data quality score (target: >0.85)
- Cache hit rate (target: >80%)
- API response time (p95 < 1000ms)
- Failover frequency

### Health Checks
Railway automatically monitors `/health` endpoint.

## Development Guidelines

### CRITICAL RULES

1. **ALL data fetching MUST go through UnifiedDataService**
   ```typescript
   // ✅ CORRECT
   const data = await unifiedDataService.fetchMarketData(['SPY']);

   // ❌ WRONG
   const data = await yahooFinance.quote('SPY');
   ```

2. **NEVER use synthetic/mock data in production**
   ```typescript
   // ❌ NEVER DO THIS
   catch (error) {
     return { close: 450, synthetic: true }; // FORBIDDEN
   }
   ```

3. **ALWAYS validate data quality**
   ```typescript
   const result = await unifiedDataService.fetchMarketData(symbols);
   if (result.quality.score < 0.8) {
     console.warn('Low quality data:', result.quality);
   }
   ```

4. **Provenance tracking is MANDATORY**
   Every fetch includes provenance information for audit compliance.

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run prisma:studio

# Reset database
npm run prisma:migrate reset
```

### Redis Connection Issues
```bash
# Check Redis URL
echo $REDIS_URL

# Test connection
redis-cli -u $REDIS_URL ping
```

### Circuit Breaker Stuck Open
Circuit breakers auto-reset after 60 seconds. To manually reset:
```typescript
const breaker = dataService['circuitBreakers'].get('SOURCE_NAME');
breaker.reset();
```

## Related Stories

- **4.0b**: Data Persistence Layer
- **4.0c**: Validation Framework
- **4.0e**: API Consolidation
- **4.0f**: Monitoring & Observability

## Support

For issues or questions, refer to:
- Architecture docs: `/docs/architecture/data-pipeline-architecture.md`
- Story details: `/docs/stories/4.0a.unified-data-service.md`
- CLAUDE.md for project guidelines
