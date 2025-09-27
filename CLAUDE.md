# AutoGen Financial Intelligence Multi-Agent Demo

## 🎯 Project Goal
Transform the existing static Gayed signals consensus calculation into an intelligent multi-agent system where specialized AI agents engage in structured conversations to provide transparent, reasoned trading decisions.

## 📋 Current State Analysis

### ✅ **Existing Infrastructure (DO NOT RECREATE)**
- **Complete 5 Gayed Signal Implementation** - `SignalOrchestrator` with real algorithms
- **Advanced AI Agent Framework** - Multi-agent orchestrator with MCP integration
- **SAFLA Safety System** - Production-ready validation and circuit breakers  
- **Real Data Sources** - FRED, Yahoo Finance, Department of Labor APIs
- **Domain Architecture** - Clean separation with `trading-signals/`, `ai-agents/`, `market-data/`

### ❌ **Current Limitations**
- API uses mock data instead of real `SignalOrchestrator`
- Static consensus calculation via confidence-weighted voting
- No agent-to-agent conversations or transparent reasoning
- Missing real-time market context integration

---

## 🚀 Implementation Plan

### **Phase 1: Connect Real Signals to API (1-2 hours)**
**File:** `src/app/api/signals/route.ts`
```typescript
// REPLACE mock data with:
import { SignalOrchestrator } from '@/domains/trading-signals/engines/gayed-signals';
import { EnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

// Use real signal calculation:
const signals = SignalOrchestrator.calculateAllSignals(marketData);
const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
```

### **Phase 2: Create Financial Signal Agents (2-3 hours)**
**Location:** `src/domains/ai-agents/agents/financial-signal-agents/`

#### **2.1 Signal Analyst Agent**
```typescript
// File: signal-analyst-agent.ts
// Extends existing base-agent.ts
export class SignalAnalystAgent extends BaseAgent {
  agentType: 'SIGNAL_ANALYST'
  specialization: ['gayed_signals', 'technical_analysis']
  
  async analyzeSignals(signals: Signal[]): Promise<AgentAnalysis> {
    // Interprets each of the 5 Gayed signals
    // Returns statistical context and confidence levels
  }
}
```

#### **2.2 Market Context Agent**
```typescript
// File: market-context-agent.ts  
// Extends existing news-agent.ts
export class MarketContextAgent extends NewsAgent {
  agentType: 'MARKET_CONTEXT'
  mcpServices: ['perplexity_mcp', 'news_api'] // Add Perplexity MCP
  
  async getMarketContext(signalDate: string): Promise<MarketContext> {
    // Uses Perplexity MCP to get real-time market context
    // Fed meetings, economic data, geopolitical events
  }
}
```

#### **2.3 Risk Challenger Agent**  
```typescript
// File: risk-challenger-agent.ts
// Adversarial agent that challenges other analyses
export class RiskChallengerAgent extends BaseAgent {
  agentType: 'RISK_CHALLENGER'
  
  async challengeAnalysis(analyses: AgentAnalysis[]): Promise<RiskChallenge> {
    // Provides contrarian viewpoints and "what if" scenarios
    // Uses historical data to find signal failure cases
  }
}
```

### **Phase 3: Multi-Agent Signal Orchestrator (2-3 hours)**
**File:** `src/domains/ai-agents/orchestrators/signal-debate-orchestrator.ts`

```typescript
export class SignalDebateOrchestrator extends FactCheckOrchestrator {
  
  // REPLACE SignalOrchestrator.calculateConsensusSignal() 
  async conductSignalDebate(signals: Signal[]): Promise<{
    consensus: ConsensusSignal;
    agentConversation: AgentMessage[];
    reasoning: string[];
  }> {
    
    // 1. Signal Analyst presents findings
    const signalAnalysis = await this.signalAnalyst.analyzeSignals(signals);
    
    // 2. Market Context Agent adds real-time context
    const marketContext = await this.contextAgent.getMarketContext(new Date().toISOString());
    
    // 3. Risk Challenger questions assumptions  
    const riskChallenges = await this.riskChallenger.challengeAnalysis([signalAnalysis]);
    
    // 4. Structured debate with visible reasoning
    const conversation = this.generateAgentConversation(signalAnalysis, marketContext, riskChallenges);
    
    // 5. Final consensus with full reasoning trail
    return {
      consensus: this.calculateDebatedConsensus(conversation),
      agentConversation: conversation,
      reasoning: this.extractReasoningSteps(conversation)
    };
  }
}
```

### **Phase 4: Enhanced API Integration (1 hour)**
**File:** `src/app/api/signals/route.ts` (continued)

```typescript
// REPLACE static consensus with agent debate:
const debateOrchestrator = new SignalDebateOrchestrator({
  sessionId: `signals-${Date.now()}`,
  agentCount: 3
});

const debateResult = await debateOrchestrator.conductSignalDebate(signals);

return NextResponse.json({
  signals,
  consensus: debateResult.consensus,
  agentConversation: debateResult.agentConversation,
  reasoning: debateResult.reasoning,
  metadata: { 
    // ... existing metadata
    transparentDecision: true,
    agentDebateEnabled: true
  }
});
```

### **Phase 5: Frontend Agent Conversation Display (2-3 hours)**
**File:** `src/shared/components/agent-conversation/AgentDebateView.tsx`

```typescript
export function AgentDebateView({ agentConversation, reasoning }: {
  agentConversation: AgentMessage[];
  reasoning: string[];
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">🤖 Agent Analysis</h3>
      
      {agentConversation.map((message, index) => (
        <div key={index} className="mb-4 border-l-4 border-blue-200 pl-4">
          <div className="font-medium text-blue-600">
            {message.agentType}: {message.agentName}
          </div>
          <div className="text-gray-800 mt-1">
            {message.content}
          </div>
        </div>
      ))}
      
      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h4 className="font-semibold mb-2">📝 Decision Reasoning:</h4>
        <ul className="list-disc list-inside space-y-1">
          {reasoning.map((step, index) => (
            <li key={index} className="text-gray-700">{step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### **Phase 6: Perplexity MCP Integration (30 minutes)**
**File:** MCP configuration (existing pattern)

```typescript
// Add to existing MCP services in agent configuration:
mcpServices: ['perplexity_mcp', 'fred_api', 'yahoo_finance']

// Use existing MCP integration pattern from base-architecture.ts
const contextData = await this.queryPerplexityMCP({
  query: `Federal Reserve policy market conditions ${currentDate}`,
  includeDomains: ['federalreserve.gov', 'reuters.com', 'bloomberg.com'],
  maxResults: 3
});
```

---

## 🎭 Agent Conversation Sample

```
🤖 SOPHIA (Signal Analyst): "Utilities/SPY at 0.89 shows defensive rotation. VIX defensive at 3.2 confirms. Historical success: 73% over 21 days."

🌍 MARCUS (Market Context): "However, Fed Powell speaks at 2pm today. Treasury yields spiking 15bp on hawkish preview. This could disrupt defensive positioning."

⚠️ VERA (Risk Challenger): "That's my concern! March 2020 - utilities signal was defensive right before both utilities AND bonds crashed. What if rates spike unexpectedly?"

🤖 SOPHIA: "Fair point. Signal confidence drops to 0.65 given Fed uncertainty. Recommend 60% defensive vs normal 80%."

🎯 CONSENSUS: Risk-Off (65% confidence) - Defensive positioning with Fed policy hedge
```

---

## 🔧 Technical Integration Points

### **Leverage Existing:**
- `SignalOrchestrator` for signal calculation
- `FactCheckOrchestrator` pattern for agent coordination  
- `EnhancedMarketClient` for data fetching
- Existing MCP integration framework
- Domain-driven architecture structure

### **Add Minimal:**
- 3 new financial-specific agents
- Signal debate orchestrator
- Agent conversation UI component
- Perplexity MCP integration

### **Replace:**
- Static consensus calculation with agent debate
- Mock API data with real SignalOrchestrator
- Hidden decision logic with transparent reasoning

---

## ⏱️ Estimated Timeline

**Total Implementation: 8-12 hours**
- Phase 1: 1-2 hours (API connection)
- Phase 2: 2-3 hours (Agent creation)  
- Phase 3: 2-3 hours (Debate orchestrator)
- Phase 4: 1 hour (API integration)
- Phase 5: 2-3 hours (Frontend display)
- Phase 6: 30 minutes (Perplexity MCP)

---

## 🎯 Demo Scenarios

### **Scenario 1: Clear Consensus**
All signals align, agents agree, strong confidence

### **Scenario 2: Mixed Signals**  
Signals conflict, agents debate, moderate confidence with hedge recommendations

### **Scenario 3: Context Override**
Signals say one thing, breaking news changes everything, agents adapt reasoning

---

## 🚨 Success Criteria

1. **Real Signal Integration** ✅ Uses actual SignalOrchestrator
2. **Agent Conversations** ✅ Visible reasoning between 3 specialized agents
3. **Market Context** ✅ Perplexity integration for real-time context
4. **Transparent Decisions** ✅ Full reasoning trail for every consensus
5. **Professional Demo** ✅ Clean UI showing agent interactions

**Key Innovation:** Replace "black box" consensus with transparent AI agent debates that users can follow and trust.