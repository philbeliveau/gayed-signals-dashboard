# New Source Tree Architecture

## Current Problems with Existing Structure
```
❌ /lib AND /src/lib (scattered)
❌ Auth services in multiple places
❌ Business logic mixed with UI
❌ No clear domain boundaries
❌ Hard to find and maintain files
```

## Proposed Clean Architecture

```
gayed-signals-dashboard/
├── src/
│   ├── app/                          # Next.js App Router (existing)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── signals/
│   │   │   ├── charts/
│   │   │   ├── backtesting/
│   │   │   └── risk-management/
│   │   └── api/
│   │
│   ├── domains/                      # 🏢 Domain-Driven Design
│   │   ├── authentication/           # 🔐 Auth Domain
│   │   │   ├── components/          # Auth UI components
│   │   │   ├── hooks/               # useAuth, usePermissions
│   │   │   ├── services/            # authService, tokenManager
│   │   │   ├── stores/              # Auth state management
│   │   │   ├── types/               # Auth TypeScript types
│   │   │   ├── utils/               # Auth utilities
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── trading-signals/          # 📈 Trading Signals Domain
│   │   │   ├── components/          # Signal dashboards, charts
│   │   │   │   ├── dashboards/      
│   │   │   │   ├── charts/          
│   │   │   │   └── indicators/      
│   │   │   ├── engines/             # Signal calculation engines
│   │   │   │   ├── gayed-signals/   # The 5 Gayed signals
│   │   │   │   │   ├── utilities-spy.ts
│   │   │   │   │   ├── lumber-gold.ts
│   │   │   │   │   ├── treasury-curve.ts
│   │   │   │   │   ├── vix-defensive.ts
│   │   │   │   │   └── sp500-ma.ts
│   │   │   │   ├── orchestrator.ts  # Main signal coordinator
│   │   │   │   └── consensus.ts     # Consensus calculation
│   │   │   ├── hooks/               # useSignals, useConsensus
│   │   │   ├── services/            # signalService, calculationService
│   │   │   ├── stores/              # Signal state management
│   │   │   ├── types/               # Signal TypeScript types
│   │   │   ├── utils/               # Signal utilities
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── market-data/             # 📊 Market Data Domain
│   │   │   ├── components/          # Market data displays
│   │   │   ├── services/            # Yahoo Finance, FRED, BLS APIs
│   │   │   │   ├── yahooFinanceService.ts
│   │   │   │   ├── fredService.ts
│   │   │   │   ├── blsService.ts
│   │   │   │   └── economicDataService.ts
│   │   │   ├── hooks/               # useMarketData, useEconomicData
│   │   │   ├── stores/              # Market data state
│   │   │   ├── types/               # Market data types
│   │   │   ├── utils/               # Data validation, normalization
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── backtesting/             # 🧪 Backtesting Domain
│   │   │   ├── components/          # Backtesting UI
│   │   │   ├── engines/             # Backtesting engines
│   │   │   │   ├── bootstrap.ts
│   │   │   │   ├── monte-carlo.ts
│   │   │   │   ├── walk-forward.ts
│   │   │   │   └── cross-validation.ts
│   │   │   ├── metrics/             # Performance metrics
│   │   │   │   ├── performance.ts
│   │   │   │   ├── risk-metrics.ts
│   │   │   │   └── statistical-tests.ts
│   │   │   ├── services/            # Backtesting services
│   │   │   ├── stores/              # Backtesting state
│   │   │   ├── types/               # Backtesting types
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── risk-management/         # ⚠️ Risk Management Domain
│   │   │   ├── components/          # Risk dashboards
│   │   │   ├── services/            # Risk analysis services
│   │   │   ├── utils/               # Risk calculations
│   │   │   └── index.ts             # Public API
│   │   │
│   │   ├── ai-agents/               # 🤖 AI Agents Domain (Future)
│   │   │   ├── agents/              # Individual AI agents
│   │   │   │   ├── fact-check/      # Fact-checking agents
│   │   │   │   └── analysis/        # Analysis agents
│   │   │   ├── orchestration/       # Agent coordination
│   │   │   └── index.ts             # Public API
│   │   │
│   │   └── portfolio/               # 💼 Portfolio Domain (Future)
│   │       └── index.ts             # Public API
│   │
│   ├── shared/                      # 🔄 Shared Utilities
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Base components (Button, Input, etc.)
│   │   │   ├── layouts/             # Layout components
│   │   │   ├── charts/              # Chart components
│   │   │   └── index.ts
│   │   ├── hooks/                   # Shared React hooks
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── index.ts
│   │   ├── utils/                   # Pure utility functions
│   │   │   ├── date.ts
│   │   │   ├── math.ts
│   │   │   ├── formatting.ts
│   │   │   └── index.ts
│   │   ├── types/                   # Shared TypeScript types
│   │   ├── config/                  # Configuration
│   │   ├── contexts/                # React contexts (Theme, etc.)
│   │   └── lib/                     # Third-party integrations
│   │
│   └── middleware.ts                # Next.js middleware
│
├── __tests__/                       # Testing (organized by domain)
│   ├── domains/
│   │   ├── authentication/
│   │   ├── trading-signals/
│   │   ├── market-data/
│   │   └── backtesting/
│   ├── shared/
│   └── integration/
│
├── backend/                         # Python FastAPI backend (keep existing)
├── python-services/                 # Specialized Python services (keep existing)
├── docs/                           # Documentation
├── scripts/                        # Build & deployment scripts
└── public/                         # Static assets
```

## Migration Plan

### Phase 1: Create Structure & Move Core Files
1. Create new domain directories ✅ (done)
2. Move existing signal files to `trading-signals/engines/gayed-signals/`
3. Move auth files to `authentication/`
4. Move chart components to appropriate domains

### Phase 2: Extract Shared Components
1. Move reusable UI components to `shared/components/ui/`
2. Move utilities to `shared/utils/`
3. Create proper barrel exports (index.ts files)

### Phase 3: Update Imports
1. Update all import statements to use new paths
2. Test that everything still works
3. Remove old empty directories

## Benefits of New Structure
✅ **Clear separation of concerns**
✅ **Domain-driven organization**
✅ **Easy to find files**
✅ **Scalable for AI agents**
✅ **Team-friendly development**
✅ **Consistent internal structure**