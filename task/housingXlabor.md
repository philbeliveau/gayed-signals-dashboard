Here's a comprehensive prompt for Claude Code to add housing and labor market tabs to your platform:

```
I need you to add two new tabs to our existing market analysis platform: "Housing Market" and "Labor Market". These tabs should integrate with our current architecture and provide real-time monitoring of key economic indicators mentioned in recent market analysis.

## Current Platform Context
We have an existing market analysis platform with tabs for market signals. The new tabs should follow the same design patterns and data fetching architecture as the existing implementation.

*Note: don't ever use fake data, no fallback either. It always has to be real data. 

## Tab 1: Housing Market

### Key Data Sources & APIs
1. **Case-Shiller Home Price Index** (via FRED API)
   - Series: CSUSHPINSA (National Home Price Index)
   - Track month-over-month changes to detect declining prices
   - Alert when 2+ consecutive months of decline occur

2. **Housing Supply Metrics** (via FRED API)
   - HOUST: Housing Starts
   - MSACSR: Months' Supply of Houses  
   - HSN1F: New One Family Houses Sold
   - Track increasing supply trends

3. **Redfin Housing Data** (via their data API/CSV)
   - Housing inventory levels
   - Days on market
   - New listings vs. pending sales

### UI Components Needed
- **Price Trends Chart**: Line chart showing Case-Shiller index with trend indicators
- **Supply/Demand Dashboard**: Cards showing current inventory levels, months of supply
- **Alert System**: Visual indicators when housing stress signals activate
- **Regional Breakdown**: Dropdown to view metro-area specific data
- **Trend Analysis**: YoY and MoM percentage changes with color coding

## Tab 2: Labor Market

### Key Data Sources & APIs
1. **Jobless Claims** (via DOL API & FRED)
   - ICSA: Initial Claims (weekly)
   - CCSA: Continued Claims (weekly)
   - IC4WSA: 4-week moving average
   - Track rising trends in continuing claims

2. **Employment Metrics** (via BLS API & FRED)
   - UNRATE: Unemployment Rate
   - PAYEMS: Total Nonfarm Payrolls
   - CIVPART: Labor Force Participation Rate

### UI Components Needed
- **Claims Trend Chart**: Time series showing initial vs. continuing claims
- **Employment Dashboard**: Key metrics cards with trend indicators
- **Historical Context**: Compare current levels to post-COVID recovery
- **Alert System**: Highlight when continuing claims reach highest levels since 2021
- **Correlation Analysis**: Show relationship between claims and market volatility

## Technical Requirements

### API Integration
```javascript
// FRED API setup (free)
const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

// DOL API setup (free)
const DOL_API_KEY = process.env.DOL_API_KEY;
const DOL_BASE_URL = 'https://api.dol.gov/v1/statistics';

// Implement rate limiting and error handling
// Cache data to minimize API calls
// Update housing data monthly, employment data weekly
```

### Data Processing
- Calculate month-over-month and year-over-year changes
- Implement trend detection algorithms
- Create alert triggers based on economic thresholds:
  - Housing: 2+ consecutive months of price decline
  - Employment: Continuing claims above 2021 levels
  - Both: Correlation with VIX spikes

### State Management
- Add housing and labor market data to existing Redux/state store
- Implement data fetching hooks consistent with current architecture
- Cache API responses with appropriate TTL

## Design Specifications

### Follow Existing Patterns
- Use same color scheme and typography as current tabs
- Implement responsive design for mobile/desktop
- Add loading states and error handling
- Include data source attribution and last updated timestamps

### New Visual Elements
- **Stress Indicators**: Red/yellow/green status lights for market conditions
- **Trend Arrows**: Up/down arrows with percentage changes
- **Historical Comparisons**: "vs. last month" and "vs. last year" callouts
- **Correlation Heatmaps**: Show relationships between housing/employment/market data

## Integration Points

### Existing Signal System
- Connect housing stress signals to overall market regime detection
- Add employment data as confirmation for risk-on/risk-off signals
- Include housing/labor correlations in signal strength calculations

### Alert System
- Integrate with existing notification system
- Create email/push notifications for threshold breaches
- Add housing/employment alerts to dashboard summary

## Implementation Steps
1. Set up API connections and data fetching functions
2. Create data processing and calculation logic
3. Build UI components following existing design system
4. Implement state management integration
5. Add alert/notification functionality
6. Create responsive layouts for both tabs
7. Add comprehensive error handling and loading states
8. Write unit tests for data processing functions
9. Update navigation to include new tabs

## Sample API Calls Needed
```javascript
// Case-Shiller Data
GET https://api.stlouisfed.org/fred/series/observations?series_id=CSUSHPINSA&api_key={key}&file_type=json

// Initial Claims
GET https://api.stlouisfed.org/fred/series/observations?series_id=ICSA&api_key={key}&file_type=json

// Continuing Claims  
GET https://api.stlouisfed.org/fred/series/observations?series_id=CCSA&api_key={key}&file_type=json
```

## Success Criteria
- Both tabs load data within 3 seconds
- Real-time alerts trigger when thresholds are met
- Mobile-responsive design matches existing quality
- Data updates automatically on schedule (daily for employment, monthly for housing)
- Clear visual indicators of economic stress levels
- Integration with existing market regime signals

Please implement these tabs using our existing codebase patterns and ensure they integrate seamlessly with the current platform architecture. Focus on creating actionable insights that help users understand housing market stress and employment trends as leading economic indicators.
```

This prompt provides Claude Code with:
1. **Clear context** about what needs to be built
2. **Specific data sources** and API endpoints to use
3. **Detailed UI requirements** for both tabs
4. **Technical specifications** for implementation
5. **Integration requirements** with existing platform
6. **Success criteria** to guide development

The prompt is structured to help Claude Code understand both the business requirements (tracking housing stress and employment trends) and the technical implementation details needed to integrate with your existing platform.