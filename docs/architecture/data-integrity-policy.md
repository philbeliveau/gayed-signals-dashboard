# Data Integrity Policy

## 🚨 CRITICAL: REAL DATA ONLY ENFORCEMENT

This document defines the **financial-grade data integrity requirements** for the Gayed Signals Dashboard / AutoGen Financial Intelligence platform.

**POLICY VERSION**: 1.0
**EFFECTIVE DATE**: 2025-10-01
**LAST UPDATED**: 2025-10-01

---

## Table of Contents

1. [Core Policy](#core-policy)
2. [Required Data Sources](#required-data-sources)
3. [Prohibited Practices](#prohibited-practices)
4. [Implementation Requirements](#implementation-requirements)
5. [Testing Requirements](#testing-requirements)
6. [Compliance Validation](#compliance-validation)
7. [Audit Trail](#audit-trail)

---

## Core Policy

### NO FALLBACK DATA POLICY

This project enforces strict **financial-grade data integrity**. ALL systems must operate exclusively with **REAL data** from actual external services.

#### Core Principles

1. **REAL DATA ONLY**: All market signals, economic indicators, and financial analysis must use authentic data from verified external APIs
2. **NO SYNTHETIC FALLBACKS**: When real data is unavailable, systems must fail gracefully with explicit warnings - never generate placeholder data
3. **EXPLICIT TRANSPARENCY**: All data unavailability must be logged clearly and communicated to users
4. **CONFIDENCE DEGRADATION**: Missing data sources must reduce confidence scores proportionally
5. **SOURCE ATTRIBUTION**: Every data point must have verifiable real-world source provenance

### Policy Enforcement

- ✅ **REQUIRED**: Real data from verified APIs (Yahoo Finance, FRED, Tiingo)
- ❌ **PROHIBITED**: Synthetic, estimated, mock, placeholder, or calculated fallback data
- ⚠️ **MANDATORY**: Explicit warnings when real data sources are unavailable

---

## Required Data Sources

### Market Data Sources

#### Yahoo Finance (Primary Market Data)
- **Library**: `yahoo-finance2` npm package
- **Symbols**: SPY, XLU, WOOD, GLD, IEF, TLT, ^VIX
- **Update Frequency**: Daily close prices
- **Historical Period**: Minimum 2 years (504 trading days)
- **Client**: `YahooFinanceClient` in `market-data/services/yahoo-finance.ts`

**Validation Requirements**:
```typescript
✅ Price > 0
✅ isFinite(price)
✅ !isNaN(price)
✅ Volume data present
✅ Date sequential (trading days only)
```

#### FRED API (Economic Indicators)
- **API**: Federal Reserve Economic Data (St. Louis Fed)
- **Key Series**:
  - `UNRATE` - Unemployment Rate
  - `PAYEMS` - Nonfarm Payrolls
  - `ICSA` - Initial Jobless Claims
  - `CCSA` - Continued Claims
  - `CSUSHPINSA` - Case-Shiller Home Price Index
  - `HOUST` - Housing Starts
- **Client**: `FREDAPIClient` in `market-data/services/fred-api-client.ts`

**Rate Limits**:
- 120 requests per hour
- Enforced with exponential backoff
- Cached with appropriate TTLs (1 hour - 30 days based on series frequency)

#### Tiingo API (Supplementary Market Data)
- **API**: Tiingo Market Data
- **Usage**: Backup/supplementary market data (NOT for economic synthesis)
- **Validation**: Same as Yahoo Finance requirements

---

## Prohibited Practices

### ❌ NEVER DO THIS

#### 1. Synthetic Data Generation
```typescript
// ❌ PROHIBITED: Calculating economic indicators from market data
const baseInitialClaims = 220000 + (marketStress * 80000); // NEVER

// ✅ CORRECT: Use real FRED API data or return empty
const claimsData = await fredClient.getSeriesObservations('ICSA');
if (!claimsData || claimsData.length === 0) {
  console.log('⚠️ FRED API unavailable - no claims data');
  return [];
}
```

#### 2. Fallback Responses
```typescript
// ❌ PROHIBITED: Generating fake data when API fails
catch (error) {
  return [{ value: 3.7, source: 'estimated' }]; // NEVER
}

// ✅ CORRECT: Explicit transparency about unavailability
catch (error) {
  console.error('❌ FRED API failed:', error);
  console.log('⚠️ Economic data unavailable - no synthetic fallback');
  return [];
}
```

#### 3. Mock Data in Production
```typescript
// ❌ PROHIBITED: Using test/mock data in production
if (isProd && !realData) {
  return mockData; // NEVER
}

// ✅ CORRECT: Graceful degradation with explicit warnings
if (!realData) {
  console.log('⚠️ Real data unavailable - analysis proceeding with reduced capability');
  confidenceScore *= 0.5; // Degrade confidence
  return { data: [], confidence: confidenceScore };
}
```

#### 4. Silent Failures
```typescript
// ❌ PROHIBITED: Silently using old/cached data without disclosure
if (apiError) {
  return cachedData; // NEVER without explicit warning
}

// ✅ CORRECT: Explicit disclosure of data staleness
if (apiError && cachedData) {
  console.log('⚠️ Using cached data from ' + cachedData.timestamp);
  console.log('⚠️ Real-time data unavailable');
  return { ...cachedData, isStale: true, staleness: Date.now() - cachedData.timestamp };
}
```

---

## Implementation Requirements

### Signal Calculation Pattern

All signal calculations MUST follow this pattern:

```typescript
import { SignalDataValidator, type DataProvenance } from '@/domains/trading-signals/utils/data-validator';

export function calculateSignal(marketData: Record<string, MarketData[]>): Signal | null {
  // 1. Validate data integrity FIRST
  const validation = SignalDataValidator.validateDataIntegrity(
    marketData,
    ['SPY', 'XLU'] // Required symbols
  );

  // 2. Handle validation failures explicitly
  if (!validation.valid) {
    console.log('⚠️ Data validation failed for signal calculation');
    validation.issues.forEach(issue => console.log(issue));

    // Return null or low-confidence signal, never synthetic data
    return null;
  }

  // 3. Extract validated real data
  const spyData = marketData['SPY'];
  const xluData = marketData['XLU'];

  // 4. Perform calculations on real data only
  const ratio = calculateRatio(xluData, spyData);

  // 5. Include provenance in signal
  const provenance: DataProvenance = {
    sources: [
      {
        name: 'yahoo-finance',
        symbols: ['SPY', 'XLU'],
        fetchedAt: new Date().toISOString(),
        dataPoints: spyData.length + xluData.length,
        apiSuccess: true
      }
    ],
    validationPassed: true,
    confidenceReduction: validation.confidenceImpact,
    missingDataSources: validation.missingDataSources
  };

  // 6. Calculate confidence with degradation
  const baseConfidence = calculateBaseConfidence(ratio);
  const finalConfidence = baseConfidence * (1 - validation.confidenceImpact / 100);

  return {
    type: 'utilities_spy',
    signal: ratio > 1.0 ? 'Risk-Off' : 'Risk-On',
    strength: determineStrength(ratio),
    confidence: finalConfidence,
    rawValue: ratio,
    date: new Date().toISOString(),
    provenance // Include provenance
  };
}
```

### API Client Pattern

All API clients MUST implement these methods:

```typescript
export class RealDataAPIClient {
  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('⚠️ API key not provided - data will be unavailable');
      console.warn('⚠️ NO SYNTHETIC DATA will be generated as fallback');
      return null; // Fail fast
    }
  }

  async fetchData(params: any): Promise<DataPoint[]> {
    try {
      const response = await this.makeAPIRequest(params);

      if (!response || response.length === 0) {
        console.log('⚠️ API returned no data');
        return []; // Empty array, not synthetic data
      }

      return this.validateAndTransform(response);

    } catch (error) {
      console.error('❌ API request failed:', error);
      console.log('⚠️ Returning empty array - NO SYNTHETIC FALLBACK');
      return []; // Always return empty on error
    }
  }

  private validateAndTransform(data: any[]): DataPoint[] {
    // Filter invalid data points
    return data.filter(point =>
      point.value !== null &&
      point.value !== '.' &&
      !isNaN(parseFloat(point.value))
    ).map(point => ({
      date: point.date,
      value: parseFloat(point.value)
    }));
  }
}
```

---

## Testing Requirements

### Integration Tests with Real APIs

All data-dependent functionality MUST have integration tests that connect to real APIs:

```typescript
describe('Signal Data Integrity', () => {
  it('should use REAL Yahoo Finance data', async () => {
    const client = new YahooFinanceClient();
    const data = await client.fetchMarketData(['SPY']);

    // Validate real data characteristics
    expect(data['SPY'].length).toBeGreaterThan(250);
    expect(data['SPY'][0].volume).toBeGreaterThan(0);

    // Validate data integrity
    const validation = SignalDataValidator.validateDataIntegrity(data, ['SPY']);
    expect(validation.valid).toBe(true);
  });

  it('should fail gracefully with NO FALLBACK when API unavailable', async () => {
    // Mock API failure
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API down'));

    const client = new YahooFinanceClient();
    const data = await client.fetchMarketData(['SPY']);

    // Should return empty, NOT synthetic data
    expect(data['SPY']).toEqual([]);
  });
});
```

### Synthetic Data Detection Tests

```typescript
it('should detect and reject synthetic data patterns', () => {
  const syntheticData = generatePerfectLinearData(); // Test helper
  const validation = SignalDataValidator.validateDataIntegrity({ 'TEST': syntheticData });

  expect(validation.valid).toBe(false);
  expect(validation.issues.some(i => i.includes('SYNTHETIC'))).toBe(true);
});
```

---

## Compliance Validation

### Automated Validation Tools

#### 1. SignalDataValidator
```bash
# Location: domains/trading-signals/utils/data-validator.ts
# Purpose: Validates signal data integrity and provenance
```

**Usage**:
```typescript
const validation = SignalDataValidator.validateDataIntegrity(marketData);
console.log(validation.summary); // Human-readable report
```

#### 2. Integration Test Suite
```bash
# Location: __tests__/integration/signal-data-integrity.test.ts
# Purpose: Validates real API connections and fallback behavior
```

**Run Tests**:
```bash
npm run test:integration
```

### Manual Validation Checklist

Before deploying any data-related changes:

- [ ] All data sources are from verified APIs (Yahoo Finance, FRED, Tiingo)
- [ ] No synthetic data generation in codebase
- [ ] API failures return empty arrays with explicit warnings
- [ ] Confidence scores degrade when data unavailable
- [ ] Provenance tracking included in all signals
- [ ] Integration tests pass with real API connections
- [ ] No mock data in production code paths
- [ ] All data validation checks implemented

---

## Audit Trail

### Data Provenance Logging

All data fetches must be logged with provenance:

```typescript
class DataProvenanceLogger {
  private log: DataProvenanceRecord[] = [];

  recordFetch(record: DataProvenanceRecord): void {
    this.log.push({
      timestamp: new Date().toISOString(),
      source: record.source,
      symbol: record.symbol,
      apiSuccess: record.apiSuccess,
      dataPoints: record.dataPoints,
      errorMessage: record.errorMessage
    });
  }

  getAuditTrail(): DataProvenanceRecord[] {
    return [...this.log];
  }
}
```

### Compliance Reports

Generate compliance reports:

```typescript
const report = SignalDataValidator.validateSignals(signals, marketData);
console.log(report.summary);

// Export to file for audit
fs.writeFileSync('data-integrity-report.json', JSON.stringify(report, null, 2));
```

---

## Policy Violations

### Severity Levels

#### CRITICAL (Deployment Blocker)
- Synthetic data generation in production code
- Silent API failures without warnings
- Missing data provenance in signals
- Fallback to mock data in production

#### HIGH (Must Fix Before Release)
- Insufficient data validation
- Missing integration tests for real APIs
- Undocumented data transformations
- Cache used without staleness warnings

#### MEDIUM (Should Fix)
- Suboptimal confidence degradation
- Incomplete provenance logging
- Missing validation warnings

### Reporting Violations

File issues with:
- **Label**: `data-integrity-violation`
- **Priority**: Critical/High/Medium
- **Evidence**: Code location and violation type
- **Impact**: What real data requirement is violated

---

## References

- CLAUDE.md: Project-level real data enforcement policy
- `domains/trading-signals/utils/data-validator.ts`: Validation implementation
- `__tests__/integration/signal-data-integrity.test.ts`: Compliance tests
- `domains/market-data/services/real-economic-data-fetcher.ts`: Compliant FRED integration example

---

**Last Review**: 2025-10-01
**Next Review Due**: Quarterly or when data sources change
**Policy Owner**: QA / Test Architect (Quinn)
