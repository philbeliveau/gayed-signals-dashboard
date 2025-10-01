# Real Data Validation - Quick Reference Guide

## 🚀 Quick Start

Validate that your signals use real data:

```bash
# Run integration tests with real APIs
npm run test:integration

# Or run specific data integrity tests
npm test signal-data-integrity.test.ts
```

---

## ✅ Validation Checklist

Use this checklist when implementing or reviewing data-dependent features:

### Before Writing Code

- [ ] Identify required data sources (Yahoo Finance, FRED, etc.)
- [ ] Check if API keys are configured
- [ ] Review existing API clients for reuse
- [ ] Plan error handling strategy (NO FALLBACKS)

### While Writing Code

- [ ] Use `SignalDataValidator` for data validation
- [ ] Include data provenance in signal metadata
- [ ] Handle API failures with explicit warnings
- [ ] Degrade confidence when data unavailable
- [ ] Log all data access attempts

### Before Committing

- [ ] Run data integrity tests
- [ ] Check for synthetic data generation
- [ ] Verify explicit warnings on failures
- [ ] Review provenance tracking
- [ ] Update tests if needed

---

## 🛠️ Tools & Utilities

### 1. SignalDataValidator

**Location**: `domains/trading-signals/utils/data-validator.ts`

**Usage**:
```typescript
import { SignalDataValidator } from '@/domains/trading-signals/utils/data-validator';

// Validate market data integrity
const validation = SignalDataValidator.validateDataIntegrity(marketData, ['SPY', 'XLU']);

if (!validation.valid) {
  console.log('❌ Data validation failed:');
  validation.issues.forEach(issue => console.log(issue));
}

// Validate individual signal
const signalValidation = SignalDataValidator.validateSignal(signal, marketData);
console.log(signalValidation.dataIntegrityValid); // true/false

// Generate comprehensive report
const report = SignalDataValidator.validateSignals(signals, marketData);
console.log(report.summary); // Human-readable report
```

### 2. RealEconomicDataFetcher

**Location**: `domains/market-data/services/real-economic-data-fetcher.ts`

**Usage**:
```typescript
import { RealEconomicDataFetcher } from '@/domains/market-data/services/real-economic-data-fetcher';

const fetcher = new RealEconomicDataFetcher(process.env.FRED_API_KEY);

// Fetch real housing data (FRED only)
const housingData = await fetcher.fetchRealHousingData(12); // 12 months

// Fetch real labor data (FRED only)
const laborData = await fetcher.fetchRealLaborData(52); // 52 weeks

// Get provenance for audit
const provenance = fetcher.getProvenanceLog();
console.log(provenance); // Full audit trail
```

### 3. Data Provenance Types

**Location**: `domains/trading-signals/types/index.ts`

```typescript
import { type DataProvenance, type Signal } from '@/domains/trading-signals/types';

// Include provenance in your signals
const signal: Signal = {
  type: 'utilities_spy',
  signal: 'Risk-Off',
  strength: 'Moderate',
  confidence: 0.75,
  rawValue: 1.05,
  date: new Date().toISOString(),
  provenance: {
    sources: [
      {
        name: 'yahoo-finance',
        symbols: ['SPY', 'XLU'],
        fetchedAt: new Date().toISOString(),
        dataPoints: 500,
        apiSuccess: true
      }
    ],
    validationPassed: true,
    confidenceReduction: 0,
    missingDataSources: []
  }
};
```

---

## 📋 Common Patterns

### Pattern 1: Fetching Real Market Data

```typescript
import { YahooFinanceClient } from '@/domains/market-data/services/yahoo-finance';
import { SignalDataValidator } from '@/domains/trading-signals/utils/data-validator';

async function getValidatedMarketData(symbols: string[]) {
  const client = new YahooFinanceClient();

  try {
    const marketData = await client.fetchMarketData(symbols);

    // Validate integrity
    const validation = SignalDataValidator.validateDataIntegrity(marketData, symbols);

    if (!validation.valid) {
      console.log('⚠️ Data integrity issues detected:');
      validation.issues.forEach(issue => console.log(issue));
    }

    return { marketData, validation };

  } catch (error) {
    console.error('❌ Failed to fetch market data:', error);
    console.log('⚠️ NO SYNTHETIC FALLBACK - returning empty');
    return { marketData: {}, validation: null };
  }
}
```

### Pattern 2: Calculating Signals with Validation

```typescript
import { SignalDataValidator } from '@/domains/trading-signals/utils/data-validator';
import type { Signal, DataProvenance } from '@/domains/trading-signals/types';

function calculateSignalWithProvenance(
  marketData: Record<string, MarketData[]>,
  requiredSymbols: string[]
): Signal | null {
  // 1. Validate data first
  const validation = SignalDataValidator.validateDataIntegrity(marketData, requiredSymbols);

  if (!validation.valid) {
    console.log('⚠️ Cannot calculate signal - insufficient real data');
    return null;
  }

  // 2. Perform calculation
  const rawValue = performCalculation(marketData);

  // 3. Build provenance
  const provenance: DataProvenance = {
    sources: requiredSymbols.map(symbol => ({
      name: 'yahoo-finance',
      symbols: [symbol],
      fetchedAt: new Date().toISOString(),
      dataPoints: marketData[symbol]?.length || 0,
      apiSuccess: !!marketData[symbol]
    })),
    validationPassed: validation.valid,
    confidenceReduction: validation.confidenceImpact,
    missingDataSources: validation.missingDataSources
  };

  // 4. Calculate confidence with degradation
  const baseConfidence = calculateConfidence(rawValue);
  const finalConfidence = baseConfidence * (1 - validation.confidenceImpact / 100);

  return {
    type: 'utilities_spy',
    signal: determineSignal(rawValue),
    strength: determineStrength(rawValue),
    confidence: finalConfidence,
    rawValue,
    date: new Date().toISOString(),
    provenance
  };
}
```

### Pattern 3: Graceful API Failure Handling

```typescript
async function fetchWithGracefulFailure<T>(
  fetchFn: () => Promise<T>,
  dataName: string
): Promise<T | null> {
  try {
    console.log(`🔄 Fetching real ${dataName} data...`);
    const data = await fetchFn();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log(`⚠️ No ${dataName} data available from API`);
      console.log('⚠️ NO SYNTHETIC FALLBACK will be used');
      return null;
    }

    console.log(`✅ Successfully fetched ${dataName} data`);
    return data;

  } catch (error) {
    console.error(`❌ Failed to fetch ${dataName} data:`, error);
    console.log(`⚠️ ${dataName} unavailable - NO SYNTHETIC FALLBACK`);
    console.log('⚠️ Analysis will proceed with reduced confidence');
    return null;
  }
}

// Usage
const marketData = await fetchWithGracefulFailure(
  () => yahooClient.fetchMarketData(['SPY']),
  'market'
);
```

---

## 🧪 Testing Patterns

### Test 1: Verify Real Data Usage

```typescript
it('should use ONLY real data from API', async () => {
  const client = new YahooFinanceClient();
  const data = await client.fetchMarketData(['SPY']);

  // Validate real data characteristics
  expect(data['SPY'].length).toBeGreaterThan(0);
  expect(data['SPY'][0]).toHaveProperty('volume');
  expect(data['SPY'][0].volume).toBeGreaterThan(0);

  // Run integrity validation
  const validation = SignalDataValidator.validateDataIntegrity(data, ['SPY']);
  expect(validation.valid).toBe(true);
  expect(validation.provenance[0].source).toBe('yahoo-finance');
});
```

### Test 2: Verify No Synthetic Fallbacks

```typescript
it('should return empty when API fails - NO FALLBACK', async () => {
  // Mock API failure
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API unavailable'));

  const client = new YahooFinanceClient();
  const data = await client.fetchMarketData(['SPY']);

  // Should be empty, NOT synthetic data
  expect(data['SPY']).toEqual([]);

  // Signal calculation should handle gracefully
  const signal = calculateSignal(data);
  expect(signal).toBeNull(); // or very low confidence
});
```

### Test 3: Verify Explicit Warnings

```typescript
it('should log explicit warnings when data unavailable', async () => {
  const consoleSpy = jest.spyOn(console, 'log');

  // Trigger failure
  const data = await fetchDataWithInvalidKey();

  // Verify warning logs
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('⚠️')
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('unavailable')
  );

  consoleSpy.mockRestore();
});
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Mistake 1: Generating Synthetic Data

```typescript
// ❌ WRONG
if (!realData) {
  return generateSyntheticData(); // NEVER DO THIS
}

// ✅ CORRECT
if (!realData) {
  console.log('⚠️ Real data unavailable - NO SYNTHETIC FALLBACK');
  return [];
}
```

### ❌ Mistake 2: Silent Failures

```typescript
// ❌ WRONG
try {
  return await fetchData();
} catch {
  return cachedData; // Silent fallback
}

// ✅ CORRECT
try {
  return await fetchData();
} catch (error) {
  console.error('❌ API failed:', error);
  console.log('⚠️ Using cached data - may be stale');
  return { ...cachedData, isStale: true };
}
```

### ❌ Mistake 3: Missing Provenance

```typescript
// ❌ WRONG
return {
  type: 'utilities_spy',
  signal: 'Risk-Off',
  confidence: 0.8,
  // Missing provenance!
};

// ✅ CORRECT
return {
  type: 'utilities_spy',
  signal: 'Risk-Off',
  confidence: 0.8,
  provenance: {
    sources: [...],
    validationPassed: true,
    confidenceReduction: 0,
    missingDataSources: []
  }
};
```

### ❌ Mistake 4: Not Degrading Confidence

```typescript
// ❌ WRONG
if (validation.missingDataSources.length > 0) {
  // Still using full confidence - WRONG
  return { confidence: 0.9 };
}

// ✅ CORRECT
const baseConfidence = 0.9;
const degradedConfidence = baseConfidence * (1 - validation.confidenceImpact / 100);
return { confidence: degradedConfidence };
```

---

## 📚 Additional Resources

- **Full Policy**: `docs/architecture/data-integrity-policy.md`
- **Integration Tests**: `__tests__/integration/signal-data-integrity.test.ts`
- **Validator Utility**: `domains/trading-signals/utils/data-validator.ts`
- **FRED Client**: `domains/market-data/services/fred-api-client.ts`
- **Economic Data Fetcher**: `domains/market-data/services/real-economic-data-fetcher.ts`

---

## 🆘 Getting Help

### Check Data Integrity Status

```bash
# Run validation report
npm run validate:data-integrity

# Or generate report programmatically
node -e "
const { SignalDataValidator } = require('./domains/trading-signals/utils/data-validator');
SignalDataValidator.validateFREDConnection().then(result => {
  console.log(result.message);
});
"
```

### Debug Data Issues

1. Enable verbose logging: `LOG_LEVEL=debug npm start`
2. Check provenance logs: Review `DataProvenance` in signal metadata
3. Run integration tests: `npm run test:integration`
4. Check API connectivity: Verify API keys in `.env`

### Report Issues

If you find data integrity violations:
1. File issue with label: `data-integrity-violation`
2. Include: Code location, violation type, impact assessment
3. Attach: Validation report output

---

**Last Updated**: 2025-10-01
**Maintained By**: QA / Test Architect (Quinn)
