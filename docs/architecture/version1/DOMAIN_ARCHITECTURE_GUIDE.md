# 🏗️ Domain Architecture Guide - Gayed Signals Dashboard

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Domain Specifications](#domain-specifications)
3. [Import Path Guidelines](#import-path-guidelines)
4. [Development Workflow](#development-workflow)
5. [Best Practices](#best-practices)

---

## 🎯 Architecture Overview

### Design Philosophy
The Gayed Signals Dashboard follows **Domain-Driven Design (DDD)** principles, organizing code around business domains rather than technical layers. This approach ensures:

- **Business Logic Clarity**: Each domain encapsulates specific business functionality
- **Scalability**: New features can be added without affecting other domains
- **Maintainability**: Developers can quickly locate and modify domain-specific code
- **Testing**: Domain isolation enables focused unit and integration testing

### High-Level Structure
```
src/
├── app/                    # Next.js App Router (pages, layouts, API routes)
├── domains/                # Business logic organized by domain
├── shared/                 # Cross-domain shared infrastructure
├── components/             # Global UI components
├── contexts/               # Global React contexts
└── config/                 # Application configuration
```

---

## 🏛️ Domain Specifications

### 1. 🎯 Trading Signals Domain
**Path**: `src/domains/trading-signals/`

**Purpose**: Implements Michael Gayed's 5 market regime signals and consensus calculation.

```
trading-signals/
├── engines/
│   ├── gayed-signals/           # Core signal calculators
│   │   ├── index.ts            # SignalOrchestrator (main entry)
│   │   ├── utilities-spy.ts    # Utilities vs SPY performance
│   │   ├── lumber-gold.ts      # Lumber vs Gold 13-week performance
│   │   ├── treasury-curve.ts   # 10Y vs 30Y Treasury analysis
│   │   ├── vix-defensive.ts    # VIX-based defensive signals
│   │   └── sp500-ma.ts         # S&P 500 moving average trends
│   └── orchestrator.ts         # Multi-signal orchestration
├── services/
│   └── signalService.ts        # Signal calculation services
├── types/
│   └── index.ts               # TypeScript signal definitions
├── utils/
│   └── etf-recommendations.ts  # ETF allocation strategies
└── index.ts                   # Domain exports
```

**Key Classes**:
- `SignalOrchestrator`: Main coordinator for all 5 Gayed signals
- `GayedSignalCalculator`: Utilities/SPY signal logic
- `LumberGoldSignalCalculator`: Lumber/Gold ratio analysis
- `TreasuryCurveSignalCalculator`: Yield curve analysis
- `VixDefensiveSignalCalculator`: VIX-based market fear gauge
- `SP500MovingAverageSignalCalculator`: Trend-following analysis

**API Integration**: 
- Used by `/api/signals` endpoint
- Consumed by homepage dashboard
- Powers backtrader analysis charts

---

### 2. 📊 Market Data Domain
**Path**: `src/domains/market-data/`

**Purpose**: Handles all external data sources and real-time market data integration.

```
market-data/
└── services/
    ├── enhanced-market-client.ts      # Primary market data orchestrator
    ├── fred-api-client.ts            # Federal Reserve Economic Data
    ├── yahoo-finance.ts              # Yahoo Finance API integration
    ├── economic-data-pipeline.ts     # Data processing & transformation
    ├── housing-labor-processor.ts    # Specialized economic data
    ├── real-data-fetcher.ts         # Real-time data fetching
    ├── production-logger.ts          # Data pipeline logging
    └── dol-api-client.ts            # Department of Labor API
```

**Key Features**:
- **Multi-source data aggregation** (FRED, Yahoo Finance, DOL)
- **Rate limiting and caching** for API efficiency
- **Data validation and transformation**
- **Real-time and historical data support**
- **Robust error handling and fallback mechanisms**

**API Integration**:
- Powers `/api/housing` and `/api/labor` endpoints
- Feeds signal calculation engines
- Supports interactive charts data visualization

---

### 3. 📈 Backtesting Domain  
**Path**: `src/domains/backtesting/`

**Purpose**: Implements sophisticated backtesting engines for strategy validation.

```
backtesting/
├── engines/
│   ├── bootstrap.ts              # Bootstrap sampling for robustness
│   ├── cross-validation.ts       # Time series cross-validation
│   ├── monte-carlo.ts           # Monte Carlo simulations
│   ├── synthetic-data.ts        # Synthetic data generation
│   ├── walk-forward.ts          # Walk-forward analysis
│   └── orchestrator.ts          # Backtesting orchestration
└── metrics/
    ├── performance.ts            # Return and risk metrics
    ├── risk-metrics.ts          # Advanced risk calculations
    └── statistical-tests.ts     # Statistical significance tests
```

**Key Capabilities**:
- **Multiple validation methodologies** (bootstrap, cross-validation, Monte Carlo)
- **Advanced performance metrics** (Sharpe ratio, maximum drawdown, etc.)
- **Statistical significance testing**
- **Walk-forward optimization**
- **Synthetic data generation** for stress testing

**Integration Points**:
- Used by `/api/backtrader` endpoint
- Powers backtrader analysis page
- Validates signal effectiveness

---

### 4. 🛡️ Risk Management Domain
**Path**: `src/domains/risk-management/`

**Purpose**: Implements SAFLA (Safety First Loss Avoidance) and comprehensive risk controls.

```
risk-management/
├── services/
│   ├── risk-manager.ts              # Core risk management logic
│   ├── data-fallback.ts            # Data source fallback mechanisms
│   ├── enhanced-api-route.ts        # API safety wrappers
│   ├── graceful-degradation.ts     # System degradation handling
│   ├── production-config.ts        # Production safety configuration
│   ├── security.ts                 # Security utilities
│   └── monitoring-dashboard.tsx    # Risk monitoring UI
└── utils/
    ├── safla-validator.ts          # SAFLA safety validation system
    ├── emergency-failsafe.ts       # Emergency shutdown mechanisms
    ├── real-data-enforcer.ts       # Data authenticity validation
    ├── source-authenticator.ts     # Data source verification
    └── test-utils.ts               # Risk system testing utilities
```

**SAFLA System Features**:
- **Comprehensive validation** of market data integrity
- **Circuit breaker mechanisms** for system protection
- **Rate limiting and abuse prevention**
- **Audit logging** for compliance
- **Emergency failsafe procedures**
- **Production-ready safety defaults**

---

### 5. 🔐 Authentication Domain
**Path**: `src/domains/authentication/`

**Purpose**: Handles user authentication, authorization, and security.

```
authentication/
├── components/                   # Auth UI components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── RouteGuard.tsx
│   ├── PermissionGuard.tsx
│   └── [other auth components]
├── services/                     # Auth business logic
│   ├── authService.ts           # Core authentication service
│   ├── tokenManager.ts          # JWT token management
│   ├── rateLimiting.ts          # Auth rate limiting
│   ├── csrfProtection.ts        # CSRF attack prevention
│   └── xssProtection.ts         # XSS attack prevention
└── types/
    └── auth.ts                  # Authentication type definitions
```

**Security Features**:
- **JWT token management** with refresh logic
- **Role-based access control** (RBAC)
- **Rate limiting** on authentication attempts
- **CSRF and XSS protection**
- **Route guards** for protected pages
- **Permission-based UI rendering**

---

### 6. 🤖 AI Agents Domain
**Path**: `src/domains/ai-agents/`

**Purpose**: AI-powered analysis and automation systems.

```
ai-agents/
└── agents/
    ├── agents/                   # Specialized AI agents
    │   ├── academic-agent.ts    # Academic research analysis
    │   ├── financial-agent.ts   # Financial data processing
    │   ├── government-agent.ts  # Government data analysis
    │   ├── news-agent.ts        # News sentiment analysis
    │   └── social-agent.ts      # Social media monitoring
    ├── base-architecture.ts     # Agent base classes
    ├── claim-extractor.ts       # AI claim validation
    ├── orchestrator.ts          # Multi-agent coordination
    └── fast-init-orchestrator.ts # Quick initialization
```

**AI Capabilities**:
- **Multi-source analysis** (academic, financial, government, social)
- **Claim extraction and validation**
- **Sentiment analysis** of news and social media
- **Automated research** and data processing
- **Agent orchestration** for complex workflows

---

## 🌐 Shared Infrastructure

### Shared Components
**Path**: `src/shared/components/`

```
shared/
├── components/
│   └── charts/                   # Reusable chart components
│       ├── EnhancedSignalsChart.tsx
│       ├── EnhancedHousingChart.tsx
│       ├── EnhancedLaborChart.tsx
│       ├── InteractiveEconomicChart.tsx
│       └── signals/              # Individual signal charts
├── contexts/                     # Global React contexts
│   ├── ThemeContext.tsx         # Dark/light theme management
│   ├── AuthContext.tsx          # Authentication state
│   └── UserPreferencesContext.tsx # User preferences
├── types/
│   ├── common.ts                # Common type definitions
│   └── video-insights.ts        # YouTube processing types
└── utils/                       # Utility functions
    ├── chartTheme.ts           # Chart theming utilities
    ├── dataValidation.ts       # Data validation helpers
    └── dateFormatting.ts       # Date formatting utilities
```

---

## 🔗 Import Path Guidelines

### Domain Imports (Internal)
```typescript
// Within the same domain
import { SignalOrchestrator } from '../engines/gayed-signals';
import { Signal } from '../types';

// Cross-domain imports (should be minimal)
import { EnhancedMarketClient } from '../../market-data/services/enhanced-market-client';
```

### Shared Infrastructure Imports
```typescript
// From pages/components to domains
import { SignalOrchestrator } from '../../domains/trading-signals/engines/gayed-signals';

// Shared components and utilities
import { useTheme } from '../../contexts/ThemeContext';
import { EnhancedSignalsChart } from '../../shared/components/charts/EnhancedSignalsChart';
```

### App Router Imports
```typescript
// API routes importing from domains
import { SignalOrchestrator } from '../../../domains/trading-signals/engines/gayed-signals';
import { EnhancedMarketClient } from '../../../domains/market-data/services/enhanced-market-client';

// Pages importing from domains
import { useTheme } from '../../contexts/ThemeContext';
import { ETF_RECOMMENDATIONS } from '../../domains/trading-signals/utils/etf-recommendations';
```

---

## 🔄 Development Workflow

### Adding New Features

#### 1. Identify the Correct Domain
- **Trading logic**: → `trading-signals`
- **Data fetching**: → `market-data`  
- **Risk controls**: → `risk-management`
- **User features**: → `authentication`
- **UI components**: → `shared/components`

#### 2. Follow Domain Structure
```typescript
// Add new signal calculator
src/domains/trading-signals/engines/gayed-signals/my-new-signal.ts

// Add new data source
src/domains/market-data/services/my-new-api-client.ts

// Add new risk control
src/domains/risk-management/utils/my-new-validator.ts
```

#### 3. Update Domain Exports
```typescript
// In domain index.ts
export { MyNewSignalCalculator } from './engines/gayed-signals/my-new-signal';
export type { MyNewSignalType } from './types';
```

#### 4. Test Domain Isolation
Ensure new features:
- Work independently within their domain
- Have minimal cross-domain dependencies
- Follow consistent patterns within the domain

---

## 🎯 Best Practices

### 1. Domain Boundaries
- **Keep domains focused** on their specific business area
- **Minimize cross-domain dependencies** 
- **Use shared infrastructure** for common functionality
- **Define clear interfaces** between domains

### 2. Import Management
- **Use relative imports** within domains
- **Use absolute imports** from outside domains
- **Avoid circular dependencies** between domains
- **Group imports logically** (external, domains, shared, relative)

### 3. File Organization
- **Group related files** in appropriate directories
- **Use consistent naming conventions**
- **Keep files focused** on single responsibilities
- **Document complex business logic**

### 4. Type Safety
- **Define domain-specific types** in `types/` directories
- **Export types** through domain index files
- **Use strict TypeScript settings**
- **Document type relationships**

---

## 🔧 Migration Guidelines

### When Moving Existing Code
1. **Identify the business domain** the code belongs to
2. **Move to appropriate domain structure**
3. **Update all import statements**
4. **Test functionality thoroughly**
5. **Update documentation**

### When Adding New Dependencies
1. **Determine if dependency is domain-specific** or shared
2. **Place in appropriate domain** or shared infrastructure
3. **Update domain exports** if needed
4. **Document usage patterns**

---

## 📚 Additional Resources

- **Domain-Driven Design**: Eric Evans' foundational concepts
- **Clean Architecture**: Robert Martin's architectural principles  
- **Next.js App Router**: Official documentation for file-based routing
- **TypeScript Best Practices**: Type safety and organization guidelines

---

*This guide serves as the definitive reference for understanding and working with the Gayed Signals Dashboard domain architecture. Follow these guidelines to maintain consistency and quality across the codebase.*