# Real Data Testing Requirements for AI Agents

## 🚨 CRITICAL: FINANCIAL-GRADE DATA INTEGRITY ENFORCEMENT

### **NO MOCK DATA POLICY FOR AGENT DOMAIN TESTS**

All tests in the `/domains/ai-agents/` directory must enforce **REAL DATA ONLY** principles. This is a financial intelligence platform where data accuracy is paramount.

---

## 📋 **DOMAIN-SPECIFIC REAL DATA REQUIREMENTS**

### **🧠 AI Agents Domain (`/domains/ai-agents/`)**

#### **Market Context Agent Tests**
```typescript
// ✅ REQUIRED: Real FRED API integration
describe('MarketContextAgent - FRED Integration', () => {
  it('must fetch real employment data from Federal Reserve', async () => {
    const agent = new MarketContextAgent();
    const claim = { claimText: 'unemployment rate analysis' };

    // Must connect to actual FRED API
    const investigation = await agent.investigateClaim(claim);

    // Verify REAL Federal Reserve data was used
    expect(investigation.evidenceFound.some(e =>
      e.source === 'Federal Reserve Economic Data (FRED)' &&
      e.url.startsWith('https://fred.stlouisfed.org/')
    )).toBe(true);
  });
});

// ✅ REQUIRED: Real Perplexity MCP integration
describe('MarketContextAgent - Perplexity Integration', () => {
  it('must fetch real market intelligence via MCP', async () => {
    const agent = new MarketContextAgent();
    const claim = { claimText: 'Federal Reserve policy analysis' };

    // Must use actual Perplexity MCP service
    const investigation = await agent.investigateClaim(claim);

    // Verify real market intelligence was retrieved
    expect(investigation.mcpUsed).toContain('@jschuller/perplexity-mcp');
    expect(investigation.evidenceFound.some(e =>
      e.source === 'Perplexity Market Intelligence'
    )).toBe(true);
  });
});
```

#### **Financial Analyst Agent Tests**
```typescript
// ✅ REQUIRED: Real Gayed signal calculations
it('must use real Gayed signal data for analysis', async () => {
  const agent = new FinancialAnalystAgent();

  // Must access actual signal calculations
  const signals = await agent.getCurrentSignals();

  // Verify real signal data structure
  expect(signals.utilitiesSpyRatio).toBeTypeOf('number');
  expect(signals.vixDefensive).toBeTypeOf('number');
  expect(signals.dataSource).toBe('real-market-data');
});
```

#### **Risk Challenger Agent Tests**
```typescript
// ✅ REQUIRED: Real backtesting data
it('must access real historical market data for risk assessment', async () => {
  const agent = new RiskChallengerAgent();

  // Must use actual backtesting data
  const riskAssessment = await agent.assessHistoricalRisk(scenario);

  // Verify real historical data was used
  expect(riskAssessment.dataSource).toBe('historical-market-data');
  expect(riskAssessment.backtestPeriod).toBeGreaterThan(0);
});
```

---

## 🔒 **MANDATORY EXTERNAL SERVICE INTEGRATIONS**

### **FRED API Testing**
- **Environment**: Must have valid `FRED_API_KEY` for all tests
- **Endpoints**: Must connect to actual `api.stlouisfed.org`
- **Data Series**: Must fetch real UNRATE, PAYEMS, CSUSHPINSA, etc.
- **Rate Limiting**: Must respect Federal Reserve API rate limits

### **Perplexity MCP Testing**
- **Environment**: Must have valid Perplexity API credentials
- **MCP Server**: Must connect to actual `@jschuller/perplexity-mcp`
- **Search Results**: Must return live market intelligence
- **Source Validation**: Must verify real news source URLs

### **OpenAI GPT Integration**
- **Environment**: Must have valid `OPENAI_API_KEY`
- **Model**: Must use actual GPT-4 Turbo for agent reasoning
- **Responses**: Must generate live AI analysis, no hardcoded responses
- **Token Usage**: Must track real token consumption

### **Web Search Services**
- **Sources**: Must search real Reuters, Bloomberg, WSJ, Federal Reserve sites
- **Results**: Must return live market news and economic reports
- **URLs**: Must validate actual source URLs, no "example.com" placeholders

---

## 🧪 **TEST EXECUTION REQUIREMENTS**

### **Pre-Test Validation**
Before running any agent domain tests:

```bash
# Verify real API credentials are configured
echo "FRED_API_KEY: ${FRED_API_KEY:0:10}..."
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "PERPLEXITY_API_KEY: ${PERPLEXITY_API_KEY:0:10}..."

# Verify MCP services are accessible
npm run test:verify-mcp-connectivity
```

### **Test Environment Setup**
```bash
# Required environment variables for real data testing
export NODE_ENV=test
export REAL_DATA_TESTING=true
export ENABLE_SAFLA_ENFORCEMENT=true
export FRED_API_KEY=your_real_key
export OPENAI_API_KEY=your_real_key
export PERPLEXITY_API_KEY=your_real_key
```

### **Network Connectivity Requirements**
- Tests must have internet access to external APIs
- Must handle real API rate limiting and timeouts
- Must validate actual SSL certificates for external services
- Must measure real response times and performance

---

## 📊 **QUALITY ASSURANCE CHECKS**

### **Data Integrity Validation**
Every test must verify:

```typescript
// ✅ REQUIRED: Verify no synthetic data usage
expect(investigation.evidenceFound.every(evidence =>
  !evidence.source.includes('mock') &&
  !evidence.source.includes('fake') &&
  !evidence.source.includes('synthetic') &&
  !evidence.url.includes('example.com') &&
  !evidence.content.includes('placeholder')
)).toBe(true);

// ✅ REQUIRED: Verify SAFLA compliance
expect(investigation.saflaCompliant).toBe(true);

// ✅ REQUIRED: Verify real source attribution
expect(investigation.evidenceFound.every(evidence =>
  evidence.url.startsWith('https://') &&
  (evidence.source.includes('Federal Reserve') ||
   evidence.source.includes('Bureau of Labor Statistics') ||
   evidence.source.includes('Reuters') ||
   evidence.source.includes('Bloomberg'))
)).toBe(true);
```

### **Transparency Requirements**
When real data is unavailable:

```typescript
// ✅ REQUIRED: Explicit unavailability reporting
if (dataSourceUnavailable) {
  expect(investigation.reasoning).toContain('currently unavailable');
  expect(investigation.reasoning).toContain('no synthetic data used');
  expect(investigation.confidenceScore).toBeLessThan(originalConfidence);
}
```

---

## 🚫 **PROHIBITED TEST PATTERNS**

### **❌ NEVER ACCEPTABLE**:

```typescript
// PROHIBITED: Mock external API responses
jest.mock('@/services/fred-api-client', () => ({
  getLatestIndicators: () => ({ UNRATE: { value: 3.7, source: 'mock' } })
}));

// PROHIBITED: Synthetic market data
const fakeMarketData = {
  unemployment: 3.7,
  inflation: 2.1,
  source: 'estimated'
};

// PROHIBITED: Hardcoded responses
if (apiUnavailable) {
  return "Based on typical market conditions, unemployment is around 3.7%";
}

// PROHIBITED: Placeholder URLs
const evidence = {
  url: 'https://example.com/fake-news',
  source: 'Mock News Source'
};
```

### **✅ REQUIRED PATTERNS**:

```typescript
// REQUIRED: Real API integration
const fredClient = createFREDClient(); // Uses real API key
const realData = await fredClient.getLatestIndicators(); // Live data

// REQUIRED: Transparent error handling
if (!realData) {
  console.log('⚠️ FRED API unavailable - no economic data accessed');
  return { reasoning: 'Real economic data unavailable, no fallback used' };
}

// REQUIRED: Real source validation
const isRealSource = evidence.url.startsWith('https://') &&
  !evidence.url.includes('example.com') &&
  evidence.source !== 'mock';
```

---

## ⚡ **PERFORMANCE BENCHMARKS WITH REAL DATA**

### **Expected Response Times** (with real APIs):
- FRED API calls: < 2 seconds
- Perplexity searches: < 5 seconds
- Web search operations: < 3 seconds
- Complete agent investigation: < 30 seconds

### **Rate Limiting Compliance**:
- FRED API: Max 120 requests/minute
- OpenAI API: Respect tier-based limits
- Perplexity: Follow service-specific limits

### **Error Handling**:
- Network timeouts: Must gracefully degrade
- API rate limits: Must wait and retry appropriately
- Service outages: Must report transparently, never fabricate

---

## 🎯 **SUCCESS CRITERIA**

### **✅ Test Passes When**:
1. All external APIs return real data successfully
2. Agent processes real data and provides accurate analysis
3. SAFLA protocol validates all data sources
4. Transparent reporting when real data unavailable
5. Performance meets benchmarks with actual network latency

### **❌ Test Fails When**:
1. Any mock, synthetic, or fake data is used
2. SAFLA protocol violations detected
3. Missing source attribution for external data
4. Fabricated responses when APIs unavailable
5. Performance significantly below real-world expectations

---

**Remember: This is a financial platform. Real data integrity is non-negotiable.**