# Data Pipeline Architecture

**Version**: 2.0
**Status**: In Development
**Last Updated**: October 31, 2025

## Executive Summary

This document defines the unified data pipeline architecture for the Gayed Signals Dashboard, addressing critical data integrity issues identified in the system analysis. The new architecture ensures financial-grade data quality, complete provenance tracking, and reliable signal calculations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     External Data Sources                     │
├───────────────┬──────────────┬───────────────┬──────────────┤
│ Yahoo Finance │   Tiingo API │  Alpha Vantage │   FRED API   │
└───────┬───────┴──────┬───────┴───────┬───────┴──────┬───────┘
        │              │                │              │
        └──────────────┴────────┬───────┴──────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Unified Data Service  │
                    │  (Single Entry Point)   │
                    └───────────┬────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Validator  │ │  Cache Layer │ │  Persistence │
        │   Framework  │ │   (Redis)    │ │ (PostgreSQL) │
        └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
               │                 │                 │
               └─────────────────┼─────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Signal Calculator    │
                    │   (Factory Pattern)     │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │     API Endpoints      │
                    │    (Consolidated)      │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Frontend Consumer    │
                    │   (Dashboard/Agents)   │
                    └────────────────────────┘
```

## Core Components

### 1. Unified Data Service

**Location**: `domains/data-pipeline/services/UnifiedDataService.ts`

**Responsibilities**:
- Single entry point for ALL data fetching operations
- Manages failover between data sources
- Handles rate limiting and retry logic
- Ensures data provenance tracking
- Coordinates with cache and persistence layers

**Key Methods**:
```typescript
class UnifiedDataService {
  async fetchMarketData(symbols: string[], options: FetchOptions): Promise<MarketDataResult>
  async fetchHistoricalData(symbol: string, range: DateRange): Promise<HistoricalDataResult>
  async fetchEconomicData(indicators: string[]): Promise<EconomicDataResult>
  async validateDataQuality(data: MarketData[]): Promise<ValidationResult>
}
```

### 2. Data Validation Framework

**Location**: `domains/data-pipeline/validators/`

**Components**:
- `DataQualityValidator` - Overall data quality assessment
- `MarketDataValidator` - Market-specific validation rules
- `ProvenanceValidator` - Source tracking validation
- `IntegrityValidator` - Data integrity checks

**Validation Criteria**:
- Completeness: All required fields present
- Freshness: Data within acceptable time window
- Consistency: Data follows expected patterns
- Accuracy: Values within reasonable ranges
- Sequentiality: Proper time series ordering

### 3. Data Persistence Layer

**Location**: `domains/data-pipeline/repositories/`

**Database Schema**:
```sql
-- Market data storage
CREATE TABLE market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  date TIMESTAMP NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2) NOT NULL,
  volume BIGINT,
  source VARCHAR(50) NOT NULL,
  fetch_timestamp TIMESTAMP NOT NULL,
  validation_status VARCHAR(20),
  quality_score DECIMAL(3,2),
  UNIQUE(symbol, date, source)
);

-- Data provenance tracking
CREATE TABLE data_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetch_id UUID NOT NULL,
  source VARCHAR(50) NOT NULL,
  symbols TEXT[],
  fetched_at TIMESTAMP NOT NULL,
  data_points INTEGER,
  api_success BOOLEAN,
  error_message TEXT,
  confidence_impact DECIMAL(5,2),
  request_metadata JSONB,
  response_metadata JSONB
);

-- Signal calculation history
CREATE TABLE signal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type VARCHAR(50) NOT NULL,
  signal_value VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,2),
  raw_value DECIMAL(10,4),
  calculated_at TIMESTAMP NOT NULL,
  data_provenance_id UUID REFERENCES data_provenance(id),
  input_data_ids UUID[],
  calculation_metadata JSONB,
  quality_metrics JSONB
);

-- Cache metadata
CREATE TABLE cache_metadata (
  key VARCHAR(255) PRIMARY KEY,
  data_hash VARCHAR(64),
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INTEGER DEFAULT 0,
  source VARCHAR(50),
  is_stale BOOLEAN DEFAULT false
);
```

### 4. Cache Strategy

**Technology**: Redis
**Location**: `domains/data-pipeline/cache/`

**Cache Layers**:
1. **L1 - Hot Cache** (60 seconds)
   - Live market data
   - Current signals
   - Active calculations

2. **L2 - Warm Cache** (5 minutes)
   - Recent historical data
   - Completed calculations
   - API responses

3. **L3 - Cold Cache** (1 hour)
   - Historical patterns
   - Reference data
   - Computed aggregates

**Cache Key Pattern**:
```
{domain}:{entity}:{identifier}:{timestamp}:{hash}
Example: market:spy:daily:2025-10-31:a3f5d8
```

## Data Flow Patterns

### 1. Real-Time Signal Calculation

```typescript
async function calculateSignals(request: SignalRequest): Promise<SignalResponse> {
  // Step 1: Validate request
  const validation = await validateRequest(request);
  if (!validation.isValid) throw new ValidationError(validation.errors);

  // Step 2: Fetch data through unified service
  const marketData = await unifiedDataService.fetchMarketData(
    request.symbols,
    {
      useCache: true,
      fallbackEnabled: true,
      requireProvenance: true
    }
  );

  // Step 3: Validate data quality
  const quality = await dataQualityValidator.validate(marketData);
  if (quality.score < 0.7) {
    logger.warn('Low quality data detected', quality);
  }

  // Step 4: Calculate signals with factory pattern
  const signals = await signalFactory.calculateAll(marketData, quality);

  // Step 5: Persist results
  await signalRepository.save(signals);

  // Step 6: Return with full provenance
  return {
    signals,
    provenance: marketData.provenance,
    quality: quality.score,
    timestamp: new Date().toISOString()
  };
}
```

### 2. Data Source Failover

```typescript
class DataSourceFailover {
  private sources = [
    { name: 'yahoo', priority: 1, healthScore: 1.0 },
    { name: 'tiingo', priority: 2, healthScore: 0.9 },
    { name: 'alphaVantage', priority: 3, healthScore: 0.8 }
  ];

  async fetchWithFailover(symbol: string): Promise<MarketData> {
    for (const source of this.sources.sort((a, b) => a.priority - b.priority)) {
      try {
        const data = await this.fetchFromSource(source.name, symbol);
        this.updateHealthScore(source.name, 1.0);
        return { ...data, source: source.name };
      } catch (error) {
        this.updateHealthScore(source.name, 0.7);
        logger.warn(`Failover from ${source.name}`, error);
        continue;
      }
    }
    throw new DataUnavailableError('All data sources failed');
  }
}
```

## Error Handling

### Error Classification

1. **Critical Errors** (System Halt)
   - Database connection lost
   - All data sources unavailable
   - Authentication system failure

2. **High Priority** (Degraded Service)
   - Primary data source unavailable
   - Cache system offline
   - Validation framework errors

3. **Medium Priority** (Reduced Quality)
   - Partial data unavailable
   - Stale cache data
   - Quality score below threshold

4. **Low Priority** (Logged Only)
   - Single retry needed
   - Minor validation warnings
   - Performance degradation

### Error Recovery Patterns

```typescript
class ErrorRecovery {
  async handleDataError(error: DataError): Promise<RecoveryAction> {
    switch (error.severity) {
      case 'CRITICAL':
        await this.notifyOps(error);
        return { action: 'HALT', message: 'System halted for safety' };

      case 'HIGH':
        await this.attemptFailover(error);
        return { action: 'FAILOVER', message: 'Using backup source' };

      case 'MEDIUM':
        await this.degradeGracefully(error);
        return { action: 'DEGRADE', message: 'Running with reduced quality' };

      case 'LOW':
        await this.logAndContinue(error);
        return { action: 'CONTINUE', message: 'Logged and continuing' };
    }
  }
}
```

## Monitoring & Observability

### Key Metrics

1. **Data Quality Metrics**
   - Overall quality score (target: >0.85)
   - Validation pass rate (target: >95%)
   - Data freshness (target: <60s)
   - Completeness rate (target: 100%)

2. **System Performance**
   - API response time (p95 < 200ms)
   - Cache hit rate (target: >80%)
   - Failover frequency (target: <5/hour)
   - Database query time (p95 < 100ms)

3. **Data Source Health**
   - API availability (target: >99.5%)
   - Error rate by source
   - Average response time
   - Rate limit utilization

### Monitoring Dashboard

```typescript
interface DashboardMetrics {
  dataQuality: {
    currentScore: number;
    trend: 'improving' | 'stable' | 'degrading';
    issues: DataQualityIssue[];
  };

  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    components: ComponentHealth[];
    alerts: SystemAlert[];
  };

  dataFlow: {
    throughput: number; // requests/second
    latency: number; // ms
    errors: number; // errors/minute
  };
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Implement UnifiedDataService
- Set up PostgreSQL tables
- Create validation framework
- Add basic monitoring

### Phase 2: Integration (Week 3)
- Migrate existing endpoints
- Implement cache layer
- Add provenance tracking
- Enable failover logic

### Phase 3: Optimization (Week 4)
- Performance tuning
- Advanced monitoring
- Error recovery patterns
- Load testing

### Phase 4: Cutover (Week 5)
- Gradual traffic migration
- Monitor error rates
- Validate data quality
- Full production deployment

## Security Considerations

### Data Protection
- All API keys in environment variables
- Encrypted storage for sensitive data
- Rate limiting per user/IP
- Input validation at every layer

### Audit Requirements
- Every data fetch logged
- Signal calculations tracked
- User actions recorded
- Error conditions captured

### Compliance
- Data retention policies
- GDPR compliance for EU users
- Financial data regulations
- Security audit trails

## Performance Targets

### Response Times
- Cache hit: <10ms
- Database query: <100ms
- API fetch: <1000ms
- Signal calculation: <500ms
- Total request: <2000ms

### Throughput
- 100 requests/second sustained
- 500 requests/second burst
- 10,000 concurrent users
- 1M signals/day

### Reliability
- 99.9% uptime
- <0.1% error rate
- Zero data corruption
- Complete audit trail

## Appendices

### A. API Endpoint Consolidation

Current: 30+ endpoints → Target: 5 endpoints

```typescript
// Before (fragmented)
/api/signals/route.ts
/api/signals/current/route.ts
/api/signals/fast/route.ts
/api/signals/history/route.ts

// After (unified)
/api/v2/data/market
/api/v2/data/economic
/api/v2/signals/calculate
/api/v2/signals/history
/api/v2/system/health
```

### B. Environment Variables

```env
# Data Sources
YAHOO_FINANCE_ENABLED=true
TIINGO_API_KEY=xxx
ALPHA_VANTAGE_KEY=xxx
FRED_API_KEY=xxx

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=xxx
DATADOG_API_KEY=xxx

# Feature Flags
UNIFIED_PIPELINE_ENABLED=true
LEGACY_ENDPOINTS_ENABLED=false
STRICT_VALIDATION_MODE=true
```

### C. Testing Strategy

1. **Unit Tests**: Each component in isolation
2. **Integration Tests**: Data flow validation
3. **Load Tests**: Performance under stress
4. **Chaos Tests**: Failover scenarios
5. **E2E Tests**: Full user workflows

---

**Next Steps**: Begin implementation of Phase 1 components, starting with UnifiedDataService.