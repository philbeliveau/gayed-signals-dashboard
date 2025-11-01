# Gayed Signals Dashboard - Data Pipeline Restructuring

## 🚨 CRITICAL: DATA PIPELINE RESTRUCTURING IN PROGRESS

### **Current Status: Fixing Critical Data Integrity Issues**
We are actively restructuring the entire data pipeline to resolve severe data reliability problems. The platform currently has fragmented data sources, no unified validation, and inconsistent signal calculations.

**Branch:** `fix/data-pipeline-restructuring`
**Phase:** Architecture Complete → Implementation Starting

---

## 🎨 **UI CONFIGURATION**

### **Hidden Navigation Tabs**
The following navigation items are currently hidden from the sidebar but remain accessible via direct URL:
- **AI Agent Debates** (`/demo/live-conversation`) - AutoGen multi-agent debate system
- **Video Analysis** (`/simple-youtube`) - YouTube content analysis feature

### **Hidden Dashboard Components**
The following components are hidden from the main dashboard:
- **Direct Text Content Analysis Box** - Unified content input component below the 5 main signals

**Reason:** Simplifying the UI to focus on core market signal functionality during data pipeline restructuring.

### **Disabled API Endpoints**
The following API endpoints are temporarily disabled (commented out to prevent build errors):
- **`/api/mcp-bridge`** - Perplexity MCP and web search services (not currently needed)
- **`/api/metrics`** - Prometheus metrics endpoint (stub returns empty data)

**Files Affected:**
- `apps/web/src/app/api/mcp-bridge/route.ts` - Perplexity/web-search handlers commented out
- `apps/web/src/app/api/metrics/route.ts` - Metrics collection disabled, returns 503

**Reason:** These services depend on unused external integrations. Can be re-enabled when needed.

---

## 📊 **DATA INTEGRITY CRISIS - WHAT WE'RE FIXING**

### **Critical Issues Identified:**
1. **30+ Fragmented API Endpoints** - No unified data access
2. **Multiple Disconnected Data Sources** - Yahoo, Tiingo, Alpha Vantage, FRED with no coordination
3. **No Data Validation Framework** - Cannot verify data quality
4. **Missing Data Provenance** - No tracking of data sources and transformations
5. **Inconsistent Signal Calculations** - Different data sources for same signals
6. **No Data Persistence** - Market data not stored, fetched repeatedly

### **What This Means:**
- ❌ **Cannot trust signal accuracy** - Different APIs return different values
- ❌ **Cannot verify data freshness** - No timestamps or staleness checks
- ❌ **Cannot trace data sources** - No audit trail for compliance
- ❌ **Cannot ensure consistency** - Signals calculated with mixed data

---

## 🔧 **RESTRUCTURING PLAN - 4 PHASES**

### **Phase 1: Unified Data Pipeline (Week 1-2)**
**Creating Single Source of Truth**
```typescript
// NEW: All data flows through UnifiedDataService
class UnifiedDataService {
  async fetchMarketData(symbols: string[], options?: FetchOptions): Promise<MarketDataResult>
  async validateDataQuality(data: MarketData[]): Promise<ValidationResult>
  async trackProvenance(data: MarketData[]): Promise<void>
}
```

**Implementation Tasks:**
- [ ] Create `/domains/data-pipeline/` directory structure
- [ ] Implement UnifiedDataService with factory pattern
- [ ] Add comprehensive data validation framework
- [ ] Set up PostgreSQL tables for market data persistence
- [ ] Create data provenance tracking system

### **Phase 2: Signal Standardization (Week 3)**
**Ensuring Consistent Calculations**
```typescript
// BEFORE: Fragmented signal calculation
const utilities = await yahooFinance.quote('XLU')  // Source 1
const spy = await tiingo.getLatestPrice('SPY')     // Source 2
const ratio = utilities / spy  // Mixed sources!

// AFTER: Unified signal calculation
const data = await dataService.fetchMarketData(['XLU', 'SPY'])
const signal = signalFactory.calculate('utilities-spy', data)
```

### **Phase 3: Monitoring & Observability (Week 4)**
**Real-Time Data Quality Dashboard**
- Data source health monitoring
- Signal calculation audit logs
- Data freshness indicators
- Quality score visualization
- Alert system for data anomalies

### **Phase 4: Testing & Validation (Week 5)**
**Comprehensive Testing Suite**
- Integration tests with REAL APIs (no mocks)
- Data quality regression tests
- Signal accuracy validation
- Performance benchmarking
- End-to-end data flow verification

---

## 📁 **NEW ARCHITECTURE FILES**

### **Active Documentation (Keep These):**
- `/docs/architecture/CRITICAL-DATA-ISSUES-AND-RESTRUCTURING-PLAN.md` - Problem analysis
- `/docs/architecture/data-pipeline-architecture.md` - New pipeline design
- `/docs/architecture/data-flow-diagram.md` - Visual data flows
- `/docs/architecture/data-integrity-policy.md` - Data quality standards
- `/docs/architecture/source-tree.md` - Updated project structure
- `/docs/architecture/coding-standards.md` - Updated with pipeline patterns

### **Archived Documentation (Reference Only):**
- `/docs/architecture/_archive/` - Previous architecture docs moved here

---

## 🚨 **CRITICAL DEVELOPMENT RULES**

### **1. REAL DATA ONLY - NO EXCEPTIONS**
```typescript
// ✅ CORRECT: Real data with explicit failure handling
try {
  const data = await fredAPI.getEmploymentData()
  return data
} catch (error) {
  console.error('FRED API unavailable - cannot provide employment data')
  return { available: false, reason: 'API_UNAVAILABLE' }
}

// ❌ WRONG: Never use synthetic fallbacks
catch (error) {
  return { value: 3.7, synthetic: true }  // NEVER DO THIS
}
```

### **2. UNIFIED DATA SERVICE PATTERN**
```typescript
// ✅ ALWAYS use UnifiedDataService
const dataService = new UnifiedDataService()
const marketData = await dataService.fetchMarketData(['SPY', 'XLU'])

// ❌ NEVER fetch directly from APIs
const spy = await yahooFinance.quote('SPY')  // DON'T DO THIS
```

### **3. DATA VALIDATION REQUIRED**
```typescript
// Every data fetch must be validated
const data = await dataService.fetchMarketData(symbols)
const validation = await dataService.validateDataQuality(data)

if (validation.score < 0.8) {
  console.warn('Data quality below threshold:', validation)
}
```

### **4. PROVENANCE TRACKING MANDATORY**
```typescript
// Track every data transformation
await dataService.trackProvenance({
  source: 'YAHOO_FINANCE',
  symbols: ['SPY'],
  timestamp: new Date(),
  transformations: ['price_adjustment', 'split_handling'],
  confidence: 0.95
})
```

---

## 🎯 **IMMEDIATE PRIORITIES**

### **Today's Focus:**
1. **Implement UnifiedDataService core** - Basic fetch/validate/store operations
2. **Set up database schema** - PostgreSQL tables for market_data, provenance
3. **Create validation framework** - Quality scoring system

### **This Week's Goals:**
- Complete Phase 1: Unified Data Pipeline
- Migrate one signal (Utilities/SPY) to new pipeline
- Validate data quality improvements
- Document API changes for team

---

## 📊 **SUCCESS METRICS**

### **Data Quality Targets:**
- **Validation Score:** >95% for all market data
- **Data Freshness:** <5 seconds for real-time quotes
- **Source Consistency:** 100% single-source per symbol
- **Provenance Coverage:** 100% of data tracked

### **Signal Accuracy Targets:**
- **Calculation Consistency:** Zero mixed-source calculations
- **Historical Accuracy:** >99% match with official sources
- **Real-time Latency:** <1 second for signal updates

---

## 🔄 **MIGRATION STRATEGY**

### **Incremental Migration (No Big Bang):**
1. **New endpoints use UnifiedDataService** - Start immediately
2. **Migrate existing endpoints one-by-one** - Preserve functionality
3. **Parallel operation during transition** - Old and new side-by-side
4. **Deprecate old patterns gradually** - With clear warnings

### **Current Migration Status:**
- [ ] `/api/signals/` - Primary signals endpoint (HIGH PRIORITY)
- [ ] `/api/market-data/` - Market data endpoints
- [ ] `/api/analysis/` - Analysis endpoints
- [ ] Signal calculation engines
- [ ] Frontend data fetching

---

## 💡 **DEVELOPER QUICKSTART**

### **Working on Data Pipeline:**
```bash
# Branch with restructuring work
git checkout fix/data-pipeline-restructuring

# Key directories
/domains/data-pipeline/     # NEW unified pipeline
/docs/architecture/         # Updated architecture docs

# Run tests (REAL APIs required)
npm run test:integration    # Must use real data sources
```

### **Creating New Data Endpoints:**
```typescript
// ALWAYS follow this pattern
import { UnifiedDataService } from '@/domains/data-pipeline/services'

export async function GET(request: Request) {
  const dataService = new UnifiedDataService()

  // Fetch with validation
  const data = await dataService.fetchMarketData(['SPY'])
  const validation = await dataService.validateDataQuality(data)

  // Check quality before returning
  if (validation.score < 0.8) {
    return Response.json({
      error: 'Data quality below threshold',
      validation
    }, { status: 503 })
  }

  return Response.json({ data, validation })
}
```

---

## 📝 **CONTACT & RESOURCES**

### **Key Documentation:**
- [Critical Issues Analysis](/docs/architecture/CRITICAL-DATA-ISSUES-AND-RESTRUCTURING-PLAN.md)
- [Pipeline Architecture](/docs/architecture/data-pipeline-architecture.md)
- [Data Flow Diagrams](/docs/architecture/data-flow-diagram.md)

### **Questions?**
Check the architecture docs or review the restructuring plan. All data pipeline work must follow the patterns defined in the architecture documentation.

---

**Remember:** We're fixing critical data integrity issues. Every line of code matters. No shortcuts, no synthetic data, no mixed sources. Build it right.