# Epic 4.0: Data Pipeline Restructuring - Critical Infrastructure Fix

## Epic Goal
Complete restructuring of data pipeline to establish single source of truth, implement data persistence, centralized validation, and full provenance tracking to resolve critical data integrity issues compromising platform reliability.

## Epic Status
Ready for Development

## Background Context
Critical data integrity audit revealed severe issues: multiple disconnected data sources, no unified pipeline, missing provenance tracking, fragmented validation, and database underutilization. Platform currently cannot verify data integrity, reproduce calculations, or provide audit trails for financial signals.

## Existing System Context
- **Current relevant functionality**: EnhancedMarketClient with Tiingo/Alpha Vantage/Yahoo Finance, 30+ scattered API routes, in-memory caching, PostgreSQL for conversations only
- **Technology stack**: Next.js, TypeScript, PostgreSQL, Prisma ORM, Railway deployment
- **Integration points**: Yahoo Finance API, Tiingo API, Alpha Vantage API, FRED API, existing signal calculators

## Enhancement Details
- **What's being added/changed**: Unified data service, market data persistence, centralized validation, signal history tracking, consolidated API routes, monitoring dashboard
- **How it integrates**: Replaces scattered API calls with single service, extends database schema, standardizes all signal calculations
- **Success criteria**: 100% data provenance, reproducible calculations, unified validation standards, complete audit trail

## Stories Overview

### **Story 4.0a: Unified Data Service Implementation**
**Duration**: 16-20 hours
**Objective**: Create single entry point for all market data fetching with failover hierarchy

**Key Deliverables**:
- UnifiedDataService class in domains/data-pipeline/services/
- Primary/secondary source failover logic
- Centralized rate limiting and retry logic
- Full provenance tracking for every fetch

### **Story 4.0b: Data Persistence Layer**
**Duration**: 12-16 hours
**Objective**: Implement database schema and persistence for market data and signals

**Key Deliverables**:
- market_data table with unique constraints
- data_provenance table for fetch tracking
- signal_history table for calculation audit
- Prisma schema updates and migrations

### **Story 4.0c: Centralized Validation Framework**
**Duration**: 12-16 hours
**Objective**: Create unified data quality validation system

**Key Deliverables**:
- DataQualityValidator class with comprehensive checks
- Quality scoring algorithm
- Validation result persistence
- Confidence impact calculations

### **Story 4.0d: Signal Calculation Standardization**
**Duration**: 20-24 hours
**Objective**: Refactor all signal calculators to use base factory pattern

**Key Deliverables**:
- BaseSignalCalculator abstract class
- Refactored signal calculators (utilities-spy, lumber-gold, etc.)
- Confidence adjustment based on data quality
- Signal persistence to database

### **Story 4.0e: API Route Consolidation**
**Duration**: 16-20 hours
**Objective**: Replace 30+ scattered routes with unified v2 API

**Key Deliverables**:
- /api/v2/signals unified endpoint
- SignalOrchestratorV2 service
- Mode support (fast/full/historical)
- Backward compatibility layer

### **Story 4.0f: Monitoring & Observability**
**Duration**: 16-20 hours
**Objective**: Implement data quality dashboard and audit logging

**Key Deliverables**:
- DataQualityDashboard component
- Real-time monitoring metrics
- AuditService for all operations
- Admin interface for quality tracking

### **Story 4.0g: Integration Testing Suite**
**Duration**: 12-16 hours
**Objective**: Comprehensive testing of entire data pipeline

**Key Deliverables**:
- Integration tests for data fetching
- Failover scenario testing
- Signal calculation validation
- Performance benchmark tests

## Compatibility Requirements
- [x] **Existing APIs remain functional** (v2 API alongside existing)
- [x] **Database changes are additive** (new tables only)
- [x] **UI continues working** (backward compatible)
- [x] **Performance maintained** (caching strategy preserved)

## Risk Mitigation
- **Primary Risk**: Breaking existing signal calculations during refactoring
- **Mitigation**: Parallel v2 implementation, extensive testing, gradual migration
- **Rollback Plan**: Feature flag for v1/v2 switching, database migrations reversible

## Dependencies and Enablement

### **Prerequisite Dependencies**
- Epic 1.0 Database Infrastructure (completed)
- Access to all API keys (Yahoo, Tiingo, Alpha Vantage)
- Understanding of existing signal calculation logic

### **Stories Enabled by This Epic**
- Future real-time signal improvements
- Historical performance analytics
- Regulatory compliance features
- Advanced backtesting capabilities
- Multi-strategy signal combinations

### **Critical Impact Without This Epic**
- ❌ Cannot verify signal accuracy
- ❌ Cannot audit financial calculations
- ❌ Cannot reproduce historical signals
- ❌ Cannot ensure data freshness
- ❌ Cannot track data source reliability

## Definition of Done
- [x] **All seven stories completed** with acceptance criteria met
- [x] **100% data provenance** for all signals
- [x] **Unified validation** across all data sources
- [x] **Complete audit trail** for all calculations
- [x] **Performance benchmarks met**:
  - Data fetch: <2s for standard symbols
  - Signal calculation: <500ms
  - Quality validation: <100ms
  - Database persistence: <50ms

## Validation Checklist

### **Technical Verification**
```bash
# 1. Verify unified data service
npm test -- unified-data-service.test.ts

# 2. Verify database schema
npx prisma migrate status

# 3. Verify signal calculations
npm test -- signal-calculators.test.ts

# 4. Verify API v2 endpoint
curl http://localhost:3000/api/v2/signals?mode=full

# 5. Check data quality metrics
npm run analyze:data-quality
```

### **Functional Verification**
- [ ] All signals show data source provenance
- [ ] Quality scores visible for each calculation
- [ ] Failover works when primary source fails
- [ ] Historical signals can be reproduced
- [ ] Audit trail shows complete data lineage
- [ ] Monitoring dashboard displays real-time metrics

## Success Metrics
1. **Data Quality Score**: >0.95 average across all signals
2. **Source Availability**: 99.9% uptime with failover
3. **Calculation Reproducibility**: 100% match on recalculation
4. **Audit Coverage**: 100% of operations logged
5. **Performance**: All operations within specified limits

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-31 | 1.0 | Epic created from critical data restructuring plan | John (PM) |

## 🚨 CRITICAL PRIORITY

This epic addresses **CRITICAL** platform reliability issues. Without completion:
- Platform is **not production-ready** for financial decisions
- Signal calculations **cannot be trusted**
- **No audit trail** exists for compliance
- Data integrity **cannot be verified**

**Recommendation**: Pause all feature development and prioritize this epic immediately.

## Estimated Timeline
- **Total Duration**: 5-6 weeks (220 hours)
- **Phase 1 (Stories a-c)**: Week 1-2
- **Phase 2 (Stories d-e)**: Week 2-3
- **Phase 3 (Story f)**: Week 3-4
- **Phase 4 (Story g)**: Week 4

## Post-Implementation State
✅ **Financial-grade data integrity**
✅ **Full audit trail for compliance**
✅ **Reproducible calculations**
✅ **Real-time quality monitoring**
✅ **Single source of truth**
✅ **Clear failover hierarchy**
✅ **Unified validation standards**

---

*Epic created from CRITICAL-DATA-ISSUES-AND-RESTRUCTURING-PLAN.md by Winston 🏗️*