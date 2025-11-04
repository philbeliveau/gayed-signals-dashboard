# Gayed Signals Dashboard - Platform Status & Configuration

**Branch:** `fix/data-pipeline-restructuring`
**Status:** ✅ Railway Backend Integration Complete | 📝 Backtesting Migration In Progress
**Last Updated:** November 1, 2025

---

## 🚀 **CURRENT PLATFORM STATE**

### **✅ What's Working (Production Ready)**

#### **1. Railway Backend V2 API Integration (Story 4.0h)**
- ✅ **Railway client infrastructure** fully implemented
- ✅ **Feature flag system** for gradual rollout (`NEXT_PUBLIC_USE_RAILWAY_BACKEND`)
- ✅ **Graceful fallback** from Railway → Local API
- ✅ **Performance monitoring** tracks data source usage
- ✅ **Data quality metrics** from Railway backend
- ✅ **Provenance tracking** included in all responses
- ✅ **Dashboard signals** migrated to Railway backend

**Implementation:**
```typescript
// Frontend uses Railway backend via unified client
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';

const data = await fetchSignalsWithFallback({
  symbols: ['SPY', 'XLU', 'GLD'],
  fast: false
});

// Automatic quality validation, provenance tracking, caching
// Fallback to local API if Railway unavailable
```

**Railway Backend:** `https://gayed-backend-production.up.railway.app`
- Endpoint: `/api/v2/signals`
- PostgreSQL persistence (automatic)
- Redis caching (automatic)
- Quality score validation (minimum 0.8)
- Data provenance tracking (all sources logged)

---

#### **2. UnifiedDataService (Backend Infrastructure)**
- ✅ **Single data source coordinator** for Railway backend
- ✅ **Circuit breaker pattern** for API fault tolerance
- ✅ **Quality validation framework** (scores 0-1.0)
- ✅ **Provenance tracking system** (all data sources logged)
- ✅ **PostgreSQL persistence** via Railway
- ✅ **Redis caching** for performance

**Location:** `domains/data-pipeline/services/UnifiedDataService.ts`

---

### **📝 In Progress**

#### **1. Simple Gayed Backtesting Platform (Story 4.0j)**
- 📝 **Create `MarketDataV2Service`** (Railway wrapper for historical data)
- 📝 **Build simple backtesting engine** (signal → position → track performance)
- 📝 **Integrate existing signal calculators** (5 Gayed signals)
- 📝 **Replace broken `/backtrader` system** (expects localhost:5000 Python backend)
- ⚠️ **Backend Task 0 BLOCKED:** Requires Railway backend team access (Python FastAPI codebase)

**See:** `docs/stories/4.0j.simple-gayed-backtesting.md`

---

### **🎨 UI State**

#### **Visible Components**
- ✅ **Main Dashboard** - 5 core Gayed signals with Railway backend
- ✅ **Signal Charts** - Historical visualization
- ✅ **Performance Metrics** - Real-time quality indicators
- ✅ **Backtesting UI** - Lumber/Gold strategy (using local API for now)

#### **Hidden Components** (Available via Direct URL)
- 🔗 **AI Agent Debates** (`/demo/live-conversation`) - AutoGen multi-agent system
- 🔗 **Video Analysis** (`/simple-youtube`) - Content analysis feature
- 🔒 **Direct Text Analysis Box** - Hidden from main dashboard

#### **Disabled Endpoints** (Not Needed Currently)
- ❌ `/api/mcp-bridge` - Perplexity MCP integration
- ❌ `/api/metrics` - Prometheus metrics (returns 503)

---

## 🚨 **CRITICAL DEVELOPMENT RULES**

### **1. RAILWAY BACKEND PATTERN (Mandatory)**

```typescript
// ✅ CORRECT: Use Railway backend via fetch utilities
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';
const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });

// ❌ WRONG: Direct API calls
const spy = await yahooFinance.quote('SPY');

// ❌ WRONG: Direct UnifiedDataService import in frontend
import { UnifiedDataService } from '@/domains/data-pipeline/services/UnifiedDataService';
```

**Why:** Railway backend provides:
- Automatic PostgreSQL persistence
- Automatic Redis caching
- Data quality validation
- Provenance tracking
- Unified data source coordination

---

### **2. REAL DATA ONLY - NO EXCEPTIONS**

```typescript
// ✅ CORRECT: Fail gracefully when data unavailable
try {
  const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });
  return data;
} catch (error) {
  console.error('Railway and local API unavailable');
  return {
    error: 'Data unavailable',
    available: false,
    reason: 'ALL_SOURCES_FAILED'
  };
}

// ❌ WRONG: Never generate synthetic fallbacks
catch (error) {
  return { value: 450.00, synthetic: true }; // NEVER DO THIS
}
```

**No synthetic data allowed in:**
- Production
- Staging
- Development (for testing real data flows)

---

### **3. FEATURE FLAG SUPPORT (Required)**

```typescript
// Respect feature flag in ALL new code
import { USE_RAILWAY_BACKEND, logMigrationMetric } from '@/lib/feature-flags';

if (USE_RAILWAY_BACKEND) {
  // Use Railway backend
  logMigrationMetric('railway', true);
} else {
  // Use local API
  logMigrationMetric('local', true);
}
```

**Environment Variable:**
```bash
NEXT_PUBLIC_USE_RAILWAY_BACKEND=true  # Enable Railway backend
```

---

### **4. DATA QUALITY VALIDATION (Enforced)**

```typescript
// Railway responses include quality metrics
const response = await fetchSignalsWithFallback({ symbols: ['SPY'] });

// Check quality score (0-1.0 scale, minimum 0.8)
if (response.metadata.quality.averageScore < 0.8) {
  console.warn('Low quality data detected');
  // Handle degraded data appropriately
}

// Extract provenance for audit trail
const provenance = response.data.map(signal => signal.provenance);
```

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Current Data Flow**

```
┌─────────────────────────────────────────┐
│  Frontend Application (Vercel)          │
│  ├─ Dashboard Signals ✅                │
│  └─ Backtesting System 📝               │
└────────┬────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  Railway Backend (Python FastAPI)      │
│  └─ /api/v2/signals                    │
└────────┬───────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  UnifiedDataService                    │
│  ├─ Yahoo Finance                      │
│  ├─ Tiingo API                         │
│  ├─ Alpha Vantage                      │
│  └─ FRED API                           │
└────────┬───────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  Data Storage                          │
│  ├─ PostgreSQL (persistence)           │
│  └─ Redis (caching)                    │
└────────────────────────────────────────┘
```

### **Key Principles**

1. **Single Source of Truth:** All data flows through Railway backend
2. **No Direct Database Access:** Frontend calls Railway API only
3. **Automatic Caching:** Redis cache managed by Railway backend
4. **Quality Enforcement:** Minimum quality score 0.8
5. **Provenance Tracking:** Every data point has source information

---

## 📁 **PROJECT STRUCTURE**

### **Frontend (Vercel - Next.js)**
```
apps/web/src/
├── lib/
│   ├── api/                        # Railway client infrastructure
│   │   ├── railway-client.ts       # Base HTTP client with retry
│   │   ├── signals-v2.ts           # V2 API service wrapper
│   │   ├── fetch-signals.ts        # Unified fetch with fallback
│   │   ├── performance-monitor.ts  # Performance tracking
│   │   └── types.ts                # API type definitions
│   ├── adapters/
│   │   └── signals-adapter.ts      # V2 → Legacy transformer
│   └── feature-flags.ts            # Feature flag utilities
├── domains/
│   ├── trading-signals/            # Signal calculation engines
│   ├── backtesting/                # Backtesting system
│   │   ├── engines/                # Complex backtest engines
│   │   └── simple/                 # Simple Gayed backtesting (Story 4.0j)
│   ├── market-data/                # DEPRECATED - use Railway
│   └── ai-agents/                  # AutoGen agents
└── app/
    ├── page.tsx                    # Main dashboard (using Railway)
    └── api/                        # Local API routes (fallback)
```

### **Backend Infrastructure**
```
domains/data-pipeline/              # Backend data services
├── services/
│   ├── UnifiedDataService.ts       # Main data coordinator
│   ├── CircuitBreaker.ts           # Fault tolerance
│   └── Logger.ts                   # Structured logging
└── types/                          # Data type definitions
```

### **Documentation**
```
docs/
├── architecture/                   # System architecture docs
│   ├── data-pipeline-architecture.md
│   ├── source-tree.md
│   └── coding-standards.md
└── stories/                        # Implementation stories
    ├── 4.0h.frontend-railway-integration.md ✅
    ├── 4.0i.backtest-data-integration.md 📝
    └── STORY-ALIGNMENT-SUMMARY.md
```

---

## 🚀 **VERCEL DEPLOYMENT CONFIGURATION**

### **Monorepo Setup (Turborepo)**

**✅ VERIFIED WORKING CONFIGURATION:**

1. **Vercel Dashboard Settings:**
   - **Root Directory:** Leave **EMPTY** (blank)
   - Vercel builds from monorepo root, not `apps/web/`

2. **vercel.json Location:**
   - **File:** `/vercel.json` (root of monorepo)
   - **NOT** in `apps/web/` directory

3. **Complete Working Configuration:**
```json
{
  "version": 2,
  "buildCommand": "turbo run build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### **Critical Path Rules:**
- `buildCommand`: `turbo run build --filter=web` (no `cd ../..`)
- `outputDirectory`: `apps/web/.next` (full path from root)
- `functions` pattern: `src/app/api/**/*.ts` (relative to outputDirectory)

### **Common Issues:**

**Error:** `The pattern "..." doesn't match any Serverless Functions`
- **Fix:** Use `src/app/api/**/*.ts` (not `apps/web/src/app/api/**/*.ts`)

**Error:** `No Output Directory named "public" found`
- **Fix:** Set `"outputDirectory": "apps/web/.next"`

**Error:** Static assets (logo, images) return 404
- **Fix:** Ensure files in `apps/web/public/` are committed to git
  ```bash
  git add -f apps/web/public/logo.webp
  git commit -m "Add static assets"
  ```

---

## 🔧 **ENVIRONMENT VARIABLES**

### **Required Configuration**

```bash
# Railway Backend
NEXT_PUBLIC_RAILWAY_BACKEND_URL=https://gayed-backend-production.up.railway.app
NEXT_PUBLIC_USE_RAILWAY_BACKEND=true
RAILWAY_API_KEY=<secret-key>

# Database (Railway managed - no direct access from frontend)
DATABASE_URL=<railway-internal-url>
REDIS_URL=<railway-internal-url>

# External APIs (used by Railway backend)
TIINGO_API_KEY=<key>
FRED_API_KEY=<key>
ALPHA_VANTAGE_KEY=<key>
PERPLEXITY_API_KEY=<key>

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<key>
CLERK_SECRET_KEY=<secret>
```

### **Feature Flags**

```bash
# Railway Backend Toggle
NEXT_PUBLIC_USE_RAILWAY_BACKEND=true   # Use Railway backend
NEXT_PUBLIC_USE_RAILWAY_BACKEND=false  # Use local API (fallback)
```

---

## 📊 **PERFORMANCE TARGETS**

| Metric | Target | Achieved | Source |
|--------|--------|----------|--------|
| Cached responses | <500ms | ✅ ~234ms | Railway Redis |
| Fresh data requests | <2s | ✅ ~1.2s | Railway PostgreSQL |
| Fallback to local | <3s | ✅ ~2.1s | Local Next.js API |
| Quality score | ≥0.8 | ✅ ~0.95 | Railway validation |
| Data freshness | <60s | ✅ ~30s | Real-time fetch |

---

## 💡 **DEVELOPER QUICKSTART**

### **Working with Railway Backend**

```bash
# Current branch
git checkout fix/data-pipeline-restructuring

# Test Railway backend connection
curl https://gayed-backend-production.up.railway.app/api/v2/signals

# Enable Railway backend locally
echo "NEXT_PUBLIC_USE_RAILWAY_BACKEND=true" >> .env.local

# Run development server
npm run dev
```

### **Creating New Features**

```typescript
// ALWAYS follow this pattern for data fetching
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';

export async function MyNewFeature() {
  try {
    // Fetch data via Railway backend
    const data = await fetchSignalsWithFallback({
      symbols: ['SPY', 'TLT'],
      fast: false
    });

    // Access quality metrics
    console.log('Quality:', data.metadata.quality.averageScore);

    // Access provenance
    console.log('Sources:', data.data[0].provenance);

    return data;
  } catch (error) {
    // Handle both Railway and local API failure
    console.error('All data sources unavailable');
    throw error;
  }
}
```

### **Testing**

```bash
# Run tests (uses real Railway staging API)
npm test

# Run integration tests with Railway backend
npm run test:integration

# Check test coverage
npm run test:coverage
```

---

## 📝 **NEXT STEPS**

### **In Progress (Story 4.0j)**
1. 📝 Create `MarketDataV2Service` (Task 2A - Railway wrapper)
2. 📝 Build simple backtesting engine in `domains/backtesting/simple/`
3. 📝 Integrate 5 existing Gayed signal calculators
4. 📝 Create `/backtest-simple` UI (replace broken `/backtrader`)
5. ⚠️ **Backend Task 0:** Requires Railway backend team (Python FastAPI - separate codebase)

### **Upcoming**
- 🔜 Railway backend health monitoring dashboard
- 🔜 Real-time data quality visualization
- 🔜 Automated data quality alerts
- 🔜 Enhanced provenance tracking UI

---

## 📚 **KEY DOCUMENTATION**

### **Architecture**
- [Data Pipeline Architecture](/docs/architecture/data-pipeline-architecture.md)
- [Source Tree Organization](/docs/architecture/source-tree.md)
- [Coding Standards](/docs/architecture/coding-standards.md)

### **Implementation Stories**
- [Story 4.0h: Frontend Railway Integration](/docs/stories/4.0h.frontend-railway-integration.md) ✅
- [Story 4.0i: Backtesting Integration](/docs/stories/4.0i.backtest-data-integration.md) 📝
- [Story Alignment Summary](/docs/stories/STORY-ALIGNMENT-SUMMARY.md)

---

## 🚨 **REMEMBER**

1. ✅ **Always use Railway backend** for data fetching
2. ✅ **Never generate synthetic data** - fail gracefully instead
3. ✅ **Respect feature flags** - support gradual rollout
4. ✅ **Validate data quality** - enforce minimum 0.8 score
5. ✅ **Track provenance** - log all data sources
6. ✅ **Handle fallback** - Railway → Local → Error
7. ✅ **No direct database access** from frontend

---

**Platform Status:** ✅ Production Ready (Dashboard) | 📝 Migration In Progress (Backtesting)
**Last Verified:** November 1, 2025
**Next Review:** After Story 4.0i completion
