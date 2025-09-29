# Test Environment - Real Data Only Requirements

## 🚨 CRITICAL: REAL DATA ONLY ENFORCEMENT

### **FINANCIAL-GRADE DATA INTEGRITY REQUIREMENTS**

**NO FALLBACK DATA POLICY**: This project enforces strict financial-grade data integrity. ALL agents must operate exclusively with REAL data from actual external services:

#### **REAL DATA SOURCES REQUIRED**:
- **FRED API**: Live Federal Reserve economic data only - NO synthetic economic indicators
- **Perplexity MCP**: Real-time market intelligence only - NO simulated market news
- **OpenAI GPT**: Actual GPT-4 responses only - NO placeholder or mock responses
- **Web Search Services**: Live web search results only - NO fabricated news articles
- **Yahoo Finance**: Real market data only - NO synthetic price feeds

#### **PROHIBITED PRACTICES**:
- ❌ **NO Mock Data in Production**: Never use placeholder, synthetic, or estimated data
- ❌ **NO Fallback Responses**: Never generate fake data when real sources are unavailable
- ❌ **NO Synthetic Economic Data**: Never create artificial employment, inflation, or market indicators
- ❌ **NO Simulated Market News**: Never fabricate breaking news or market analysis
- ❌ **NO Placeholder Content**: Never use "example.com" or test data in production

#### **REQUIRED BEHAVIOR WHEN DATA UNAVAILABLE**:
- ✅ **Explicit Transparency**: "FRED API currently unavailable - analysis proceeding without employment data"
- ✅ **Confidence Degradation**: Reduce confidence scores when real data sources are missing
- ✅ **Source Attribution**: Specify exactly which data sources are accessible/inaccessible
- ✅ **Graceful Degradation**: Continue operation with reduced capability, never fabricate data

#### **ENFORCEMENT MECHANISMS**:
- **SAFLA Protocol**: Source Authentication, Fact validation, Link verification, Authority checking
- **Data Provenance Tracking**: Every data point must have verifiable real-world source
- **Audit Trail Requirements**: All data access attempts must be logged with success/failure status
- **Test Environment Exceptions**: Mock data ONLY allowed in test environments with explicit markers

#### **EXAMPLE CORRECT PATTERNS**:
```typescript
// ✅ CORRECT: Explicit unavailability with no fallback
if (!this.fredClient) {
  console.log('⚠️ FRED API unavailable - no economic indicators accessed');
  dataAvailability.missingDataSources.push('FRED Economic Data');
  dataAvailability.confidenceReduction += 25;
  return [];
}

// ✅ CORRECT: Transparent error handling
catch (error) {
  console.error('❌ Perplexity API failed:', error);
  console.log('⚠️ Market intelligence unavailable - no synthetic fallback');
  return [];
}
```

#### **EXAMPLE PROHIBITED PATTERNS**:
```typescript
// ❌ PROHIBITED: Synthetic fallback data
if (!this.fredClient) {
  return [{ value: 3.7, source: 'estimated' }]; // NEVER DO THIS
}

// ❌ PROHIBITED: Fabricated responses
catch (error) {
  return "Based on typical market conditions..."; // NEVER DO THIS
}
```

### **TESTING REQUIREMENTS WITH REAL DATA**

All tests involving external services (Perplexity, FRED, GPT, etc.) must use REAL data connections:

- **Integration Tests**: Must connect to actual API endpoints
- **Agent Tests**: Must validate real data extraction capabilities
- **Performance Tests**: Must measure actual API response times
- **Error Handling Tests**: Must test real API failure scenarios

**Exception**: Unit tests may use mocks, but integration and end-to-end tests MUST use real services.

---

## 🧪 **MANDATORY REAL DATA SERVICES FOR TESTS**

### **All Agent Tests Must Use LIVE APIs**:

#### **FRED API Integration**
- ✅ **REAL**: Connect to actual Federal Reserve Economic Data API
- ✅ **REAL**: Fetch live unemployment rates, employment data, housing indicators
- ❌ **PROHIBITED**: Mock FRED responses, synthetic economic data, placeholder indicators

```typescript
// ✅ REQUIRED: Real FRED API connection
const fredClient = createFREDClient(); // Must use real API key
const realData = await fredClient.getLatestIndicators(); // Live data only

// ❌ PROHIBITED: Mock data
const mockData = { UNRATE: { value: 3.7, source: 'estimated' } }; // NEVER
```

#### **Perplexity MCP Integration**
- ✅ **REAL**: Connect to actual Perplexity search API via MCP
- ✅ **REAL**: Fetch live market intelligence, breaking news, economic analysis
- ❌ **PROHIBITED**: Simulated market news, fake search results, placeholder articles

```typescript
// ✅ REQUIRED: Real Perplexity search
const realResults = await webSearchService.searchForEvidence(query, config);

// ❌ PROHIBITED: Mock search results
const mockResults = [{ title: 'Fake News', content: 'Placeholder...' }]; // NEVER
```

#### **OpenAI GPT Integration**
- ✅ **REAL**: Use actual GPT-4 API for agent reasoning and analysis
- ✅ **REAL**: Generate live responses based on real financial data
- ❌ **PROHIBITED**: Hardcoded responses, simulated AI output, placeholder reasoning

```typescript
// ✅ REQUIRED: Real GPT API call
const analysis = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: realMarketData
});

// ❌ PROHIBITED: Fake AI responses
const fakeAnalysis = "The market looks good"; // NEVER
```

#### **Web Search Services**
- ✅ **REAL**: Live searches of Reuters, Bloomberg, WSJ, Federal Reserve sites
- ✅ **REAL**: Current market news, economic reports, policy announcements
- ❌ **PROHIBITED**: Fabricated news articles, placeholder URLs, synthetic market reports

---

## 📋 **TEST CATEGORIES AND REQUIREMENTS**

### **Integration Tests** (REAL DATA MANDATORY)
```typescript
describe('MarketContextAgent Integration', () => {
  it('should fetch REAL employment data from FRED API', async () => {
    // Must use actual FRED API - NO MOCKS ALLOWED
    const agent = new MarketContextAgent();
    const investigation = await agent.investigateClaim(realClaim);

    // Verify REAL data was retrieved
    expect(investigation.evidenceFound).toContainRealFREDData();
    expect(investigation.saflaCompliant).toBe(true);
  });
});
```

### **End-to-End Tests** (REAL DATA MANDATORY)
- Must test complete agent workflow with live external services
- Must validate actual API response times and rate limiting
- Must verify real data provenance and source attribution
- Must test graceful degradation when real services are unavailable

### **Performance Tests** (REAL DATA MANDATORY)
- Must measure actual API response times from FRED, Perplexity, etc.
- Must test rate limiting behavior with real external services
- Must validate memory usage with actual data volumes
- Must benchmark real agent conversation generation times

---

## 🛡️ **DATA INTEGRITY ENFORCEMENT**

### **SAFLA Protocol Testing**
Every test must validate:
- **S**ource Authentication: Real API endpoints only
- **A**uthenticity: Verify actual data provenance
- **F**act Validation: Check real data consistency
- **L**ink Verification: Ensure real URLs and references
- **A**uthority: Validate official data sources

### **Required Test Patterns**

#### **✅ CORRECT: Real Data Validation**
```typescript
it('should handle FRED API unavailability transparently', async () => {
  // Test with REAL API that might be down
  const agent = new MarketContextAgent();
  // Temporarily disable real FRED client
  agent.fredClient = null;

  const investigation = await agent.investigateClaim(claim);

  // Must explicitly state unavailability, never use fallback
  expect(investigation.reasoning).toContain('FRED API currently unavailable');
  expect(investigation.reasoning).toContain('no synthetic data used');
  expect(investigation.evidenceFound).not.toContainSyntheticData();
});
```

#### **❌ PROHIBITED: Mock Data Patterns**
```typescript
// NEVER DO THIS IN AGENT TESTS
it('should use mock data when API fails', async () => {
  mockFREDClient.getLatestIndicators.mockResolvedValue({
    employment: { UNRATE: { value: 3.7, source: 'mock' } } // PROHIBITED
  });
});
```

---

## 🧪 **TEST ENVIRONMENT SETUP**

### **Required Environment Variables**
```bash
# REAL API credentials required for integration tests
FRED_API_KEY=your_real_fred_api_key
OPENAI_API_KEY=your_real_openai_key
PERPLEXITY_API_KEY=your_real_perplexity_key

# Test flags
NODE_ENV=test
REAL_DATA_TESTING=true
ENABLE_SAFLA_ENFORCEMENT=true
```

### **Test Data Source Requirements**
- **Real FRED Series**: UNRATE, PAYEMS, CSUSHPINSA, HOUSTNSA, etc.
- **Real Market Sources**: federalreserve.gov, bls.gov, reuters.com, bloomberg.com
- **Real Economic Indicators**: Current employment data, inflation rates, housing starts
- **Real Market News**: Live breaking news, Federal Reserve announcements, economic reports

---

## 📊 **QUALITY GATES FOR REAL DATA TESTING**

### **Mandatory Success Criteria**
1. **100% Real Data Usage**: No synthetic or mock data in agent evidence
2. **Source Attribution**: Every data point has verifiable real-world source
3. **Transparency Compliance**: Explicit reporting when real data is unavailable
4. **SAFLA Validation**: All external data passes authentication checks
5. **Performance Benchmarks**: Real API response times within acceptable limits

### **Test Failure Triggers**
- Any use of synthetic, estimated, or placeholder data
- Missing source attribution for external data
- Fabricated responses when real APIs are unavailable
- SAFLA protocol violations
- Performance degradation beyond acceptable thresholds

---

## 🎯 **AGENT-SPECIFIC TESTING REQUIREMENTS**

### **Market Context Agent**
- Must fetch REAL FRED economic indicators
- Must connect to REAL Perplexity market intelligence
- Must search REAL financial news sources
- Must provide REAL Federal Reserve policy context

### **Financial Analyst Agent**
- Must use REAL Gayed signal calculations
- Must access REAL market data feeds
- Must integrate REAL economic context

### **Risk Challenger Agent**
- Must use REAL backtesting data
- Must access REAL historical market performance
- Must validate REAL risk scenarios

---

## ⚠️ **CRITICAL REMINDERS**

### **NEVER ACCEPTABLE IN AGENT TESTS**:
- Mock external API responses for integration tests
- Synthetic economic data or market indicators
- Fabricated news articles or market analysis
- Placeholder URLs or fake source references
- Estimated data when real data is available
- Fallback responses that simulate real market conditions

### **ALWAYS REQUIRED IN AGENT TESTS**:
- Real API connections to external services
- Live data retrieval and validation
- Transparent error handling when real data unavailable
- Source provenance tracking for all data points
- SAFLA protocol enforcement
- Performance measurement with actual external services

---

**Remember: This is a financial intelligence platform. Data integrity is paramount. Real data only, always.**