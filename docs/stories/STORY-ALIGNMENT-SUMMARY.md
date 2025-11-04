# Story Alignment Summary: Railway Backend Integration

**Date:** November 1, 2025
**Author:** Scrum Master (Bob)
**Status:** ✅ Stories Aligned

---

## Overview

This document summarizes the alignment between Story 4.0h (Frontend Railway Integration) and Story 4.0i (Backtesting Railway Backend Integration) following **Option A: Unified Railway Backend Pattern**.

---

## Story Structure

### Story 4.0h: Frontend Railway Integration
- **Status:** ✅ Completed
- **File:** `docs/stories/4.0h.frontend-railway-integration.md`
- **Purpose:** Migrate frontend dashboard signals to Railway backend V2 API
- **Scope:** Main dashboard, signal components, Railway client infrastructure

### Story 4.0i: Backtesting Railway Backend Integration (RENAMED)
- **Status:** 📝 Draft (Ready for Implementation)
- **File:** `docs/stories/4.0i.backtest-data-integration.md`
- **Purpose:** Migrate backtesting system to Railway backend V2 API
- **Scope:** Backtesting orchestrator, API routes, data validation

**Note:** Story renamed from 4.0h to 4.0i to avoid ID conflict.

---

## Architecture Alignment: Option A

### Unified Data Flow

```
┌─────────────────────────────────────────────────────┐
│  Frontend Application (Vercel Next.js)              │
│  ├─ Dashboard Signals (Story 4.0h) ✅               │
│  └─ Backtesting System (Story 4.0i) 📝              │
└────────────────────┬───────────────────┬────────────┘
                     │                   │
                     ↓                   ↓
            ┌────────────────┐  ┌────────────────────┐
            │ Railway Backend│  │ Railway Backend    │
            │ /api/v2/signals│  │ /api/v2/signals    │
            │ (Signals)      │  │ (Backtest Data)    │
            └────────┬───────┘  └────────┬───────────┘
                     │                   │
                     └─────────┬─────────┘
                               ↓
                   ┌───────────────────────┐
                   │  UnifiedDataService   │
                   │  (Railway Backend)    │
                   │  • PostgreSQL         │
                   │  • Redis Cache        │
                   │  • Data Validation    │
                   │  • Provenance         │
                   └───────────────────────┘
```

### Key Principle: Single Source of Truth

**All data flows through Railway backend → UnifiedDataService**

---

## Alignment Matrix

| Aspect | Story 4.0h (Frontend) | Story 4.0i (Backtesting) | Status |
|--------|----------------------|--------------------------|---------|
| **Data Source** | Railway Backend V2 API | Railway Backend V2 API | ✅ Aligned |
| **PostgreSQL** | Via Railway (automatic) | Via Railway (automatic) | ✅ Aligned |
| **Redis Cache** | Via Railway (automatic) | Via Railway (automatic) | ✅ Aligned |
| **Quality Validation** | Railway response metadata | Railway response metadata | ✅ Aligned |
| **Provenance Tracking** | Railway response data | Railway response data | ✅ Aligned |
| **Synthetic Data** | Removed (real data only) | Removed (real data only) | ✅ Aligned |
| **Feature Flag** | NEXT_PUBLIC_USE_RAILWAY_BACKEND | NEXT_PUBLIC_USE_RAILWAY_BACKEND | ✅ Aligned |
| **Fallback Pattern** | Railway → Local API | Railway → Local API | ✅ Aligned |
| **Import Paths** | `@/lib/api/railway-client` | `@/lib/api/railway-client` | ✅ Aligned |
| **Client Reuse** | Implements Railway client | Reuses existing client | ✅ Aligned |

---

## Shared Infrastructure (from Story 4.0h)

Story 4.0i **reuses** all Railway client infrastructure created in Story 4.0h:

### Shared Files (No Duplication)

```typescript
// Railway Client Infrastructure (Story 4.0h - Already Implemented)
apps/web/src/lib/api/
├── railway-client.ts          // ✅ Reuse: Base HTTP client
├── signals-v2.ts              // ✅ Reuse: V2 API service
├── fetch-signals.ts           // ✅ Reuse: Unified fetch with fallback
├── performance-monitor.ts     // ✅ Reuse: Performance tracking
└── types.ts                   // ✅ Reuse: Railway API types

apps/web/src/lib/adapters/
└── signals-adapter.ts         // ✅ Reuse: V2 → Legacy transformer

apps/web/src/lib/
└── feature-flags.ts           // ✅ Reuse: Feature flag utilities

apps/web/src/types/
└── env.d.ts                   // ✅ Reuse: Environment types
```

### New Files (Story 4.0i)

```typescript
// Backtesting-Specific Services
apps/web/src/domains/backtesting/
├── services/                          // 🆕 Create
│   ├── DataAvailabilityService.ts    // 🆕 Railway-based availability checks
│   └── BacktestValidator.ts          // 🆕 Data validation wrapper
└── __tests__/                         // 🆕 Create
    ├── railway-integration.test.ts   // 🆕 Railway backend tests
    ├── data-availability.test.ts     // 🆕 Availability service tests
    └── validation.test.ts            // 🆕 Validation tests
```

---

## Key Changes from Original Story 4.0h → 4.0i

### What Changed

#### **1. Story ID**
- **Before:** 4.0h (conflict with Frontend story)
- **After:** 4.0i (no conflict)

#### **2. Data Source**
- **Before:** Direct UnifiedDataService import
- **After:** Railway backend V2 API (follows frontend pattern)

#### **3. Import Pattern**
```typescript
// BEFORE (Original Story):
import { UnifiedDataService } from '@/domains/data-pipeline/services/UnifiedDataService';
const data = await unifiedDataService.fetchMarketData(['LBS', 'GC=F']);

// AFTER (Aligned Story):
import { fetchSignalsWithFallback } from '@/lib/api/fetch-signals';
const data = await fetchSignalsWithFallback({ symbols: ['LBS', 'GC=F'] });
```

#### **4. PostgreSQL Access**
- **Before:** Direct database queries
- **After:** Via Railway backend (automatic)

#### **5. Redis Access**
- **Before:** Direct Redis connection
- **After:** Via Railway backend (automatic)

#### **6. Feature Flags**
- **Before:** Not mentioned
- **After:** Respects NEXT_PUBLIC_USE_RAILWAY_BACKEND

#### **7. Fallback Strategy**
- **Before:** No fallback specified
- **After:** Railway → Local API → Error

---

## Implementation Dependencies

### Story 4.0i Depends On Story 4.0h

**Prerequisites:**
- ✅ Railway backend deployed and accessible
- ✅ Railway client infrastructure implemented (`@/lib/api/*`)
- ✅ Adapter layer created (`@/lib/adapters/*`)
- ✅ Feature flags configured
- ✅ Environment variables set

**Cannot Start Until:**
- Story 4.0h is fully completed and deployed
- Railway backend V2 API is accessible from Vercel
- All Railway client tests pass

---

## Testing Alignment

### Shared Testing Patterns

Both stories follow the same testing approach:

```typescript
// Railway Backend Integration Test Pattern
describe('Railway Backend Integration', () => {
  it('should fetch data from Railway backend', async () => {
    const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });
    expect(data.metadata.sources.primary).toBe('postgresql');
    expect(data.metadata.quality.averageScore).toBeGreaterThan(0.8);
  });

  it('should fallback to local API when Railway unavailable', async () => {
    // Mock Railway failure
    const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });
    expect(data).toBeDefined(); // Should not throw
  });

  it('should respect feature flag', async () => {
    process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND = 'false';
    const data = await fetchSignalsWithFallback({ symbols: ['SPY'] });
    // Should use local API
  });
});
```

### Test Coverage Requirements

- **Story 4.0h:** Integration tests for signals dashboard
- **Story 4.0i:** Integration tests for backtesting system
- **Shared:** Railway client, adapter, feature flags (tested once in 4.0h)

---

## Performance Requirements (Both Stories)

| Metric | Target | Source |
|--------|--------|--------|
| Cached responses | <500ms | Railway Redis |
| Fresh data requests | <2s | Railway PostgreSQL |
| Fallback to local | <3s | Local Next.js API |
| Quality score minimum | 0.8 | Railway validation |

---

## Environment Configuration

### Shared Environment Variables

```bash
# Railway Backend Configuration (Story 4.0h)
NEXT_PUBLIC_RAILWAY_BACKEND_URL=https://gayed-signals-backend-production.up.railway.app/
NEXT_PUBLIC_USE_RAILWAY_BACKEND=true
RAILWAY_API_KEY=<secret-key>

# Database (managed by Railway backend)
DATABASE_URL=<railway-internal-url>
REDIS_URL=<railway-internal-url>
```

**Note:** Story 4.0i uses the SAME environment variables. No new configuration needed.

---

## Critical Rules (Both Stories)

### ALWAYS
✅ Use Railway backend for ALL data fetching
✅ Respect feature flag (NEXT_PUBLIC_USE_RAILWAY_BACKEND)
✅ Implement Railway → Local fallback
✅ Validate quality scores (minimum 0.8)
✅ Extract provenance from Railway responses
✅ Log migration metrics

### NEVER
❌ Generate synthetic data
❌ Connect directly to PostgreSQL from frontend
❌ Connect directly to Redis from frontend
❌ Import UnifiedDataService directly in frontend code
❌ Create duplicate Railway clients

---

## Implementation Order

### Phase 1: Story 4.0h (Frontend Railway Integration)
1. ✅ Create Railway client infrastructure
2. ✅ Create adapter layer
3. ✅ Implement feature flags
4. ✅ Migrate dashboard signals
5. ✅ Test Railway integration
6. ✅ Deploy to production

### Phase 2: Story 4.0i (Backtesting Railway Integration)
1. 📝 Create directory structure (Task 0)
2. 📝 Remove synthetic data generation (Task 1)
3. 📝 Integrate Railway backend client (Task 2)
4. 📝 Create DataAvailabilityService (Task 3)
5. 📝 Implement validation framework (Task 4)
6. 📝 Update API routes (Task 5)
7. 📝 Add feature flag support (Task 6)
8. 📝 Create tests (Task 7)

---

## Success Criteria

### Story 4.0h (Completed ✅)
- [x] Railway backend accessible from frontend
- [x] All signals use Railway V2 API
- [x] Feature flag toggles between Railway and local
- [x] Graceful fallback works
- [x] Performance targets met (<500ms cached)
- [x] No synthetic data generated

### Story 4.0i (Ready for Implementation 📝)
- [ ] Backtesting uses Railway V2 API
- [ ] All synthetic data removed from backtesting
- [ ] Quality validation enforced (0.8 minimum)
- [ ] Feature flag support implemented
- [ ] Fallback to local API works
- [ ] Tests pass with Railway staging environment
- [ ] Performance targets met

---

## Next Steps

### For Development Team

1. **Review Story 4.0i** - Ensure understanding of Railway backend pattern
2. **Verify Story 4.0h completion** - All tests passing, deployed to production
3. **Start Story 4.0i implementation** - Follow tasks in order (0 → 7)
4. **Reuse Railway client** - Import from `@/lib/api/*`, don't duplicate
5. **Test with Railway staging** - Use real Railway backend for integration tests

### For QA Team

1. **Validate Story 4.0h** - Signals dashboard using Railway backend
2. **Test feature flag toggle** - Railway ↔ Local API switching
3. **Test fallback behavior** - Railway failure → Local API success
4. **Validate Story 4.0i** - After implementation, verify backtesting integration

---

## Questions & Answers

### Q: Why did we choose Option A?
**A:** Single source of truth through Railway backend ensures consistency, eliminates duplicate data infrastructure, and simplifies maintenance.

### Q: Can backtesting bypass Railway backend?
**A:** No. All data must flow through Railway backend to maintain data quality, provenance, and validation standards.

### Q: What if Railway backend is unavailable?
**A:** Graceful fallback to local Next.js API routes. If both fail, system returns error (NO synthetic data generation).

### Q: Do we need to deploy UnifiedDataService to frontend?
**A:** No. UnifiedDataService runs on Railway backend. Frontend calls Railway API.

### Q: How do we test Railway integration?
**A:** Use Railway staging environment for integration tests. Feature flag allows toggling between staging and production.

---

## Conclusion

Stories 4.0h and 4.0i are now **fully aligned** following Option A (Unified Railway Backend Pattern). Story 4.0i can proceed with implementation after Story 4.0h is verified in production.

### Key Achievements
✅ Eliminated story ID conflict (4.0h → 4.0i rename)
✅ Unified data access pattern (all through Railway)
✅ Shared Railway client infrastructure (no duplication)
✅ Consistent quality validation and provenance tracking
✅ Feature flag support for gradual rollout
✅ Graceful fallback strategy defined

### Benefits
- **Single source of truth:** All data via Railway backend
- **No code duplication:** Reuse Story 4.0h infrastructure
- **Consistent data quality:** Same validation everywhere
- **Easier maintenance:** One client to maintain
- **Gradual migration:** Feature flags allow safe rollout

---

**Status:** ✅ Ready for Story 4.0i Implementation
**Blocker:** Story 4.0h must be verified in production first
**Estimated Start Date:** After Story 4.0h production validation

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Next Review:** After Story 4.0i completion
