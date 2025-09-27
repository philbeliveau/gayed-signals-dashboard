# 🎯 Gayed Signals Dashboard

A professional market regime analysis platform implementing **Michael Gayed's 5 Market Regime Signals** with real-time data integration, advanced backtesting, and AI-powered insights.

## 🚀 Platform Overview

### Core Features
- **5 Gayed Trading Signals** - Utilities/SPY, Lumber/Gold, Treasury Curve, VIX Defensive, S&P 500 MA
- **Real-time Market Data** - FRED, Yahoo Finance, Department of Labor integration
- **Interactive Charts** - Housing and labor market visualizations
- **Backtrader Analysis** - Professional backtesting with performance metrics
- **AI YouTube Processing** - Transcription and summarization with folder organization
- **Risk Management** - SAFLA (Safety First Loss Avoidance) validation system

### Platform Status: ✅ FULLY OPERATIONAL
- **Homepage** - All 5 signals working with real-time consensus calculation
- **Backtrader Analysis** - Professional charting and strategy visualization
- **Interactive Charts** - Economic data visualization (housing/labor markets)
- **YouTube Processor** - AI-powered video analysis and organization

---

## 🏗️ Architecture: Domain-Driven Design

This platform follows **enterprise-grade domain-driven design** principles with clear separation of concerns:

### 📁 Core Business Domains
```
src/domains/
├── trading-signals/     # 🎯 Michael Gayed's 5 market regime signals
├── market-data/         # 📊 FRED, Yahoo Finance, economic data pipeline  
├── backtesting/         # 📈 Backtrader analysis engines and metrics
├── risk-management/     # 🛡️ SAFLA validator and safety systems
├── authentication/      # 🔐 User auth, permissions, security
└── ai-agents/          # 🤖 AI orchestration and analysis
```

### 🔗 Shared Infrastructure
```
src/shared/
├── components/          # Reusable React components and charts
├── contexts/           # React contexts (Theme, Auth, UserPreferences)  
├── types/              # Common TypeScript definitions
└── utils/              # Utility functions and helpers
```

> **📚 Architecture Documentation**: See [`docs/DOMAIN_ARCHITECTURE_GUIDE.md`](docs/DOMAIN_ARCHITECTURE_GUIDE.md) for detailed technical specifications.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js 18+** 
- **npm/yarn/pnpm**
- **Environment Variables** (API keys for market data)

### Installation
```bash
# Clone repository
git clone [repository-url]
cd gayed-signals-dashboard

# Install dependencies  
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys (TIINGO_API_KEY, ALPHA_VANTAGE_KEY, etc.)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📊 Signal Algorithms

### Michael Gayed's 5 Market Regime Signals

#### 1. 🔌 Utilities/SPY Signal (`utilities-spy.ts`)
- **Logic**: 21-day performance ratio of Utilities (XLU) vs S&P 500 (SPY)
- **Risk-On**: Utilities underperforming (ratio < 1.0) 
- **Risk-Off**: Utilities outperforming (ratio > 1.0)

#### 2. 🏗️ Lumber/Gold Signal (`lumber-gold.ts`) 
- **Logic**: 13-week performance ratio of Lumber vs Gold
- **Risk-On**: Lumber outperforming Gold (growth > safety)
- **Risk-Off**: Gold outperforming Lumber (safety > growth)

#### 3. 📈 Treasury Curve Signal (`treasury-curve.ts`)
- **Logic**: 10-year vs 30-year Treasury performance analysis
- **Risk-On**: Steep yield curve (economic expansion)
- **Risk-Off**: Flat/inverted curve (recession risk)

#### 4. 😱 VIX Defensive Signal (`vix-defensive.ts`)
- **Logic**: Counter-intuitive VIX analysis
- **Risk-On**: High VIX (fear creates opportunities)
- **Risk-Off**: Low VIX (complacency increases risk)

#### 5. 📊 S&P 500 Moving Average (`sp500-ma.ts`)
- **Logic**: Trend-following based on 50/200-day moving averages
- **Risk-On**: Above moving average with positive momentum
- **Risk-Off**: Below moving average with negative momentum

### Consensus Calculation
The **SignalOrchestrator** (`src/domains/trading-signals/engines/gayed-signals/index.ts`) combines all signals using confidence-weighted voting to generate overall market regime assessment.

---

## 🔌 API Endpoints

### Core Trading APIs
- **`GET /api/signals`** - Calculate all 5 Gayed signals with consensus
- **`GET /api/signals?fast=true`** - Quick signal calculation (essentials only)

### Economic Data APIs  
- **`GET /api/housing`** - Housing market indicators (FRED data)
- **`GET /api/labor`** - Labor market data (unemployment, claims, etc.)

### Analysis APIs
- **`GET /api/backtrader`** - Backtesting and performance analysis
- **`POST /api/simple-youtube`** - AI video processing and summarization

> **🔧 Development**: All APIs support CORS and include comprehensive error handling with production-ready logging.

---

## 🎨 Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

### Backend & Data
- **Next.js API Routes** 
- **FRED API** (Federal Reserve Economic Data)
- **Yahoo Finance API** 
- **Department of Labor API**
- **Tiingo API** (financial data)

### AI & Processing
- **OpenAI API** for YouTube processing
- **AI Agent Orchestration** for multi-source analysis
- **Claim Extraction** for content validation

### Safety & Risk
- **SAFLA Validator** (Safety First Loss Avoidance)
- **Rate Limiting** and circuit breakers
- **Comprehensive error handling** and fallbacks

---

## 🔒 Security & Safety Features

### SAFLA Safety System
- **Data Integrity Validation** - Ensures all market data is valid and complete
- **Circuit Breakers** - Automatic system protection during anomalies
- **Emergency Failsafes** - Safe defaults when data sources fail
- **Audit Logging** - Complete audit trail for compliance

### Production Safeguards
- **Rate Limiting** on all API endpoints
- **Input Validation** and sanitization
- **CORS Configuration** for secure cross-origin requests
- **Error Boundary Components** for graceful failure handling

---

## 📈 Recent Major Updates

### 🏗️ Architectural Refactor (Dec 25, 2024)
- **✅ Implemented Domain-Driven Design** - Complete restructure from `/lib` chaos to organized domains
- **✅ Fixed Critical Theme Context Errors** - Resolved React context provider issues  
- **✅ Updated All Import Paths** - 80+ files moved with corrected dependencies
- **✅ Enhanced API Reliability** - Fixed broken import paths in housing/labor endpoints
- **✅ Platform Testing** - Comprehensive Playwright-based debugging and verification

> **📋 Full Details**: See [`docs/ARCHITECTURAL_REFACTOR_SUMMARY.md`](docs/ARCHITECTURAL_REFACTOR_SUMMARY.md) for complete refactoring documentation.

---

## 📚 Documentation

### Technical Documentation
- [`docs/DOMAIN_ARCHITECTURE_GUIDE.md`](docs/DOMAIN_ARCHITECTURE_GUIDE.md) - Complete domain specifications and development guidelines
- [`docs/ARCHITECTURAL_REFACTOR_SUMMARY.md`](docs/ARCHITECTURAL_REFACTOR_SUMMARY.md) - Recent refactoring summary and fixes
- [`docs/NEW_SOURCE_TREE.md`](docs/NEW_SOURCE_TREE.md) - Original architecture design document

### Domain-Specific Docs
- **Trading Signals**: See `src/domains/trading-signals/` for signal calculation logic
- **Market Data**: See `src/domains/market-data/` for data pipeline documentation  
- **Risk Management**: See `src/domains/risk-management/` for SAFLA system details

---

## 🤝 Contributing

### Development Guidelines
1. **Follow Domain Boundaries** - Keep business logic in appropriate domains
2. **Update Import Paths** - Use correct domain-based imports  
3. **Maintain Type Safety** - Use TypeScript strictly throughout
4. **Test Domain Integration** - Ensure changes don't break cross-domain functionality
5. **Document Changes** - Update relevant documentation for new features

### Code Organization
- **New trading features** → `src/domains/trading-signals/`
- **Data source integrations** → `src/domains/market-data/`
- **UI components** → `src/shared/components/`
- **Risk/safety features** → `src/domains/risk-management/`

---

## 📄 License

This project implements Michael Gayed's published research on market regime signals. All original research credit goes to Michael Gayed. Implementation is for educational and analytical purposes.

---

## 🙋‍♂️ Support

For technical questions or issues:
1. Check the [documentation](docs/) for architectural guidance
2. Review domain-specific code in `src/domains/`
3. Test your changes against the existing functionality
4. Follow the established patterns within each domain

---

*Built with ❤️ using Next.js, TypeScript, and domain-driven design principles. Implementing Michael Gayed's market regime signals with enterprise-grade architecture and production-ready safety systems.*