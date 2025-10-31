# Epic 4.0 Stories - Railway Backend Integration Guide

## ✅ PERFECT ALIGNMENT: Stories + Railway Backend

The Epic 4.0 stories were designed with a backend architecture in mind. Railway + PostgreSQL provides exactly what these stories require.

## 📊 Story-to-Infrastructure Mapping

### **Story 4.0a: Unified Data Service** ✅
**Requires:** Backend service for centralized data fetching
**Railway Provides:**
```typescript
// Deploy on Railway as Node.js service
class UnifiedDataService {
  constructor(
    private prisma: PrismaClient,  // Railway PostgreSQL
    private redis: Redis,          // Railway Redis
    private config: Config         // Railway env vars
  ) {}

  async fetchMarketData(symbols: string[]): Promise<MarketDataResult> {
    // Check cache first (Railway Redis)
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // Fetch and store in Railway PostgreSQL
    const data = await this.fetchFromSource(symbols);
    await this.prisma.marketData.createMany({ data });

    return data;
  }
}
```

### **Story 4.0b: Data Persistence Layer** ✅
**Requires:** PostgreSQL database with proper schema
**Railway Provides:**
```sql
-- Railway PostgreSQL (one-click provisioning)
-- Automatic backups, SSL, monitoring included

CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(10, 4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) NOT NULL,
    quality_score DECIMAL(3, 2)
);

CREATE TABLE data_provenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_id UUID REFERENCES market_data(id),
    source_api VARCHAR(50) NOT NULL,
    fetch_timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE signal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(50) NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    calculation_timestamp TIMESTAMPTZ NOT NULL
);
```

### **Story 4.0c: Validation Framework** ✅
**Requires:** Server-side validation logic
**Railway Provides:**
```typescript
// Backend validation service on Railway
export class DataValidationService {
  async validateMarketData(data: MarketData[]): Promise<ValidationResult> {
    const results = await Promise.all(
      data.map(async (item) => {
        // Validate against PostgreSQL historical data
        const historical = await this.prisma.marketData.findMany({
          where: { symbol: item.symbol },
          orderBy: { timestamp: 'desc' },
          take: 20
        });

        return this.runValidationRules(item, historical);
      })
    );

    // Store validation results
    await this.prisma.validationLog.createMany({ data: results });
    return results;
  }
}
```

### **Story 4.0d: Signal Standardization** ✅
**Requires:** Backend calculation engine with consistent data source
**Railway Provides:**
```typescript
// Signal calculation on Railway backend
export class SignalCalculationService {
  constructor(
    private dataService: UnifiedDataService,
    private prisma: PrismaClient
  ) {}

  async calculateSignals(): Promise<SignalResult[]> {
    // All data from single source (PostgreSQL)
    const marketData = await this.prisma.marketData.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 24*60*60*1000) }},
      orderBy: { timestamp: 'desc' }
    });

    // Standardized calculations
    const signals = [
      this.calculateUtilitiesSPY(marketData),
      this.calculateLumberGold(marketData),
      this.calculateVIXDefensive(marketData)
    ];

    // Store results
    await this.prisma.signalHistory.createMany({ data: signals });
    return signals;
  }
}
```

### **Story 4.0e: API Consolidation** ✅
**Requires:** Unified backend API endpoints
**Railway Provides:**
```typescript
// Express app on Railway
app.get('/api/v2/signals', async (req, res) => {
  // Single endpoint, all data from PostgreSQL
  const signals = await signalService.getSignals({
    dateRange: req.query.dateRange,
    signalTypes: req.query.types,
    includeProvenance: true
  });

  res.json({
    data: signals,
    metadata: {
      source: 'unified-pipeline',
      timestamp: new Date(),
      quality: await validationService.getQualityScore()
    }
  });
});

// Backward compatibility
app.get('/api/signals/*', (req, res) => {
  res.redirect(301, '/api/v2/signals');
});
```

### **Story 4.0f: Monitoring & Observability** ✅
**Requires:** Infrastructure monitoring and logging
**Railway Provides:**
- Built-in deployment logs
- PostgreSQL metrics dashboard
- Redis monitoring
- Custom metrics via Railway API
- Integration with Datadog/Sentry

```typescript
// Health check endpoint on Railway
app.get('/health', async (req, res) => {
  const health = {
    database: await checkPostgres(),
    redis: await checkRedis(),
    apis: await checkExternalAPIs(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  // Railway automatically monitors this endpoint
  res.json(health);
});
```

### **Story 4.0g: Integration Testing** ✅
**Requires:** Test environment with real databases
**Railway Provides:**
```yaml
# Railway environments
production:
  - PostgreSQL (production data)
  - Redis (production cache)
  - Backend service

staging:
  - PostgreSQL (test data)
  - Redis (test cache)
  - Backend service (with test API keys)

# Integration tests run against staging
npm run test:integration -- --env=staging
```

## 🚀 Implementation Path

### **Week 1: Infrastructure Setup**
```bash
# 1. Create Railway project
railway init gayed-signals

# 2. Add PostgreSQL
railway add postgresql

# 3. Add Redis
railway add redis

# 4. Deploy backend
cd apps/backend
railway up
```

### **Week 1-2: Foundation Phase**
**Story 4.0b (Database)** → **Story 4.0a (Data Service)**
- Run Prisma migrations for database schema
- Deploy UnifiedDataService to Railway
- Test data persistence layer

### **Week 3: Validation & Standards**
**Story 4.0c (Validation)** → **Story 4.0d (Signals)**
- Deploy validation framework
- Implement signal standardization
- All calculations use PostgreSQL data

### **Week 4: API & Monitoring**
**Story 4.0e (API)** → **Story 4.0f (Monitoring)**
- Consolidate API endpoints
- Set up monitoring dashboards
- Configure alerts and metrics

### **Week 5: Testing & Validation**
**Story 4.0g (Integration Testing)**
- Run comprehensive integration tests
- Performance benchmarking
- Production readiness validation

**⚠️ CRITICAL:** Execute stories in order 4.0b → 4.0a → 4.0c → 4.0d → 4.0e → 4.0f → 4.0g
**See:** `/docs/stories/EXECUTION-SEQUENCE.md` for detailed dependency graph

## 📋 Environment Variables

```env
# Railway automatically provides these
DATABASE_URL=${{POSTGRES.DATABASE_URL}}
REDIS_URL=${{REDIS.REDIS_URL}}

# You add these in Railway dashboard
TIINGO_API_KEY=your_key
ALPHA_VANTAGE_KEY=your_key
FRED_API_KEY=your_key

# Railway generates these
RAILWAY_ENVIRONMENT=production
RAILWAY_PROJECT_ID=xxx
RAILWAY_SERVICE_ID=xxx
```

## 💰 Cost Breakdown for Epic 4.0

| Component | Monthly Cost | What It Provides |
|-----------|-------------|------------------|
| Railway Pro | $20 | Platform access |
| PostgreSQL | ~$15 | 10GB storage, automatic backups |
| Redis | ~$10 | 1GB memory, persistence |
| Backend Service | ~$10 | 2GB RAM, 1 vCPU |
| **Total** | **~$55/month** | Complete backend infrastructure |

## ✅ Why Railway is Perfect for Epic 4.0

### **1. Direct Story Support**
- Every story assumes backend infrastructure
- PostgreSQL required for persistence (4.0b)
- Backend service needed for validation (4.0c)
- Centralized API requires server (4.0e)

### **2. Development Speed**
- One-click database provisioning
- Automatic SSL/TLS setup
- Built-in monitoring (4.0f)
- GitHub integration for CI/CD

### **3. Scalability**
- Horizontal scaling when needed
- Database connection pooling
- Redis for caching layer
- Load balancing built-in

### **4. Cost Effective**
- ~$55/month vs $500+/month for AWS equivalent
- No DevOps expertise required
- Includes backups and monitoring

## 🎯 Next Steps

1. **Create Railway Account**
   ```bash
   # Sign up at https://railway.app
   # Install CLI
   npm install -g @railway/cli
   ```

2. **Initialize Backend Structure**
   ```bash
   # Create backend app
   mkdir apps/backend
   cd apps/backend
   npm init -y
   npm install express prisma @prisma/client
   ```

3. **Deploy First Service**
   ```bash
   # Deploy to Railway
   railway login
   railway init
   railway add postgresql
   railway up
   ```

4. **Start Story 4.0a**
   - Implement UnifiedDataService
   - Deploy to Railway
   - Test with real APIs

## 🔄 Migration Timeline

| Week | Stories | Railway Tasks |
|------|---------|---------------|
| 1 | Setup | Create project, add databases |
| 2 | 4.0a, 4.0b | Deploy services, run migrations |
| 3 | 4.0c, 4.0d | Add validation, standardize signals |
| 4 | 4.0e, 4.0f, 4.0g | Consolidate API, monitoring, testing |

## ✨ Final Architecture

```
┌─────────────────────────────────────────────┐
│              Vercel (Frontend)               │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────┐
│             Railway Backend                  │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │     Express API Server (4.0e)        │   │
│  ├─────────────────────────────────────┤   │
│  │  • UnifiedDataService (4.0a)        │   │
│  │  • ValidationFramework (4.0c)        │   │
│  │  • SignalCalculation (4.0d)         │   │
│  └──────────┬──────────┬───────────────┘   │
│             │          │                    │
│      ┌──────▼───┐ ┌───▼──────┐            │
│      │PostgreSQL│ │  Redis   │            │
│      │  (4.0b)  │ │  Cache   │            │
│      └──────────┘ └──────────┘            │
└─────────────────────────────────────────────┘
```

**Conclusion:** Railway + PostgreSQL is not just compatible with Epic 4.0 stories - it's the exact infrastructure these stories were designed for. Every acceptance criteria can be met using Railway's platform.