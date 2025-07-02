# Interactive Economic Charts

## Overview

The new interactive economic charts provide a modern, visually appealing way to analyze economic data with dynamic series selection and automatic granularity adjustment. Users can click on specific data sources to focus on them, and the graphs automatically adjust for different data frequencies (daily, weekly, monthly).

## Key Features

### 🎯 **Dynamic Series Selection**
- **Click** any series in the legend to show/hide it
- **Double-click** to focus and isolate specific indicators
- **Visual feedback** with hover effects and focus indicators

### 📊 **Automatic Granularity Adjustment**
- **Daily Data**: High-frequency indicators (mortgage rates)
- **Weekly Data**: Unemployment claims, 4-week averages
- **Monthly Data**: Housing starts, unemployment rate, payrolls
- **Quarterly Data**: House price indices
- **Automatic scaling** and axis adjustment for different frequencies

### 🎨 **Modern Visual Design**
- **Smooth animations** with 300ms transitions
- **Color-coded frequencies** (Daily: Green, Weekly: Blue, Monthly: Amber, etc.)
- **Interactive tooltips** with contextual information
- **Responsive design** that works on all screen sizes

### ⚡ **Advanced Interactions**
- **Time range brush** for zooming into specific periods
- **Multi-axis support** for different data scales
- **Quick filter presets** for common analysis scenarios
- **Export capabilities** (CSV, JSON, PNG)

## Components

### 1. `InteractiveEconomicChart`
The core chart component that handles all interactive functionality.

```tsx
import InteractiveEconomicChart from './components/charts/InteractiveEconomicChart';

<InteractiveEconomicChart
  data={chartData}
  seriesConfig={seriesConfig}
  height={600}
  onSeriesToggle={toggleSeries}
  onSeriesFocus={focusSeries}
  showBrush={true}
  allowMultipleYAxes={true}
/>
```

### 2. `EnhancedInteractiveHousingChart`
Specialized housing market chart with predefined series and quick filters.

```tsx
import EnhancedInteractiveHousingChart from './components/charts/EnhancedInteractiveHousingChart';

<EnhancedInteractiveHousingChart
  height={700}
  selectedPeriod="12m"
  region="United States"
  onPeriodChange={handlePeriodChange}
/>
```

### 3. `EnhancedInteractiveLaborChart`
Labor market chart with stress level indicators and employment metrics.

```tsx
import EnhancedInteractiveLaborChart from './components/charts/EnhancedInteractiveLaborChart';

<EnhancedInteractiveLaborChart
  height={700}
  selectedPeriod="12m"
  alerts={alertsArray}
/>
```

## Data Hook: `useInteractiveChartData`

The `useInteractiveChartData` hook manages series configuration and data fetching:

```tsx
import { useInteractiveChartData } from '../hooks/useInteractiveChartData';

const {
  data,
  seriesConfig,
  loading,
  error,
  visibleSeries,
  focusedSeries,
  toggleSeries,
  focusSeries,
  resetVisibility,
  filterByFrequency
} = useInteractiveChartData({
  category: 'housing', // 'housing' | 'labor' | 'all'
  defaultVisibleSeries: ['case_shiller', 'housing_starts'],
  autoSelectFrequency: true
});
```

## Series Configuration

Each data series is configured with metadata for optimal display:

```tsx
interface SeriesConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  dataKey: string;              // Data property key
  color: string;                // Hex color code
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  category: 'housing' | 'labor' | 'economic';
  unit: string;                 // Display unit (%, $, K, etc.)
  description: string;          // Tooltip description
  visible: boolean;             // Currently visible
  focused: boolean;             // Currently focused
  yAxisId?: string;            // Multi-axis support
  strokeWidth?: number;         // Line thickness
  strokeDashArray?: string;     // Line style
  showDots?: boolean;          // Show data points
}
```

## Pre-configured Series

### Housing Market Series
- **Case-Shiller Index** (Monthly) - Home price trends
- **Housing Starts** (Monthly) - New construction activity
- **Months Supply** (Monthly) - Inventory levels
- **New Home Sales** (Monthly) - Sales activity
- **Building Permits** (Monthly) - Construction permits
- **30-Year Mortgage Rate** (Weekly) - Financing costs
- **House Price Index** (Quarterly) - Comprehensive price measure

### Labor Market Series
- **Unemployment Rate** (Monthly) - Key employment indicator
- **Initial Claims** (Weekly) - Weekly unemployment filings
- **Continued Claims** (Weekly) - Ongoing unemployment
- **Nonfarm Payrolls** (Monthly) - Total employment
- **Labor Participation** (Monthly) - Workforce participation
- **Job Openings** (Monthly) - Available positions

## Quick Filters

### Housing Market
- **Price Trends**: Focus on price-related indicators
- **Supply & Demand**: Housing supply and sales activity
- **Construction Activity**: Building permits and starts
- **Monthly Data**: All monthly frequency indicators

### Labor Market
- **Unemployment Focus**: Key unemployment indicators
- **Employment Health**: Employment levels and participation
- **Claims Analysis**: Weekly unemployment claims
- **Weekly Data**: High-frequency weekly indicators
- **Stress Indicators**: Market stress signals

## Usage Examples

### Basic Housing Chart
```tsx
function HousingDashboard() {
  const [period, setPeriod] = useState('12m');
  
  return (
    <EnhancedInteractiveHousingChart
      height={600}
      selectedPeriod={period}
      onPeriodChange={setPeriod}
      region="National"
    />
  );
}
```

### Labor Market with Alerts
```tsx
function LaborDashboard() {
  const alerts = [
    { id: 1, severity: 'medium', message: 'Claims trending up' }
  ];
  
  return (
    <EnhancedInteractiveLaborChart
      height={600}
      alerts={alerts}
    />
  );
}
```

### Custom Chart with Specific Series
```tsx
function CustomEconomicChart() {
  const {
    data,
    seriesConfig,
    toggleSeries,
    focusSeries
  } = useInteractiveChartData({
    category: 'all',
    defaultVisibleSeries: ['unemployment_rate', 'case_shiller']
  });
  
  return (
    <InteractiveEconomicChart
      data={data}
      seriesConfig={seriesConfig}
      onSeriesToggle={toggleSeries}
      onSeriesFocus={focusSeries}
      height={500}
    />
  );
}
```

## User Interactions

### Series Management
1. **Show/Hide Series**: Click any series legend item
2. **Focus Series**: Double-click to isolate
3. **Reset View**: Use the reset button to restore all series
4. **Quick Filters**: Use preset filters for common scenarios

### Time Navigation
1. **Period Selection**: Choose 3M, 6M, 1Y, 2Y, or 5Y periods
2. **Time Brush**: Drag on the bottom brush to zoom
3. **Auto-adjust**: Charts automatically handle different frequencies

### Data Exploration
1. **Hover Tooltips**: Rich information on data points
2. **Trend Indicators**: Visual trend arrows and percentages
3. **Stress Levels**: Automatic calculation for labor market
4. **Export Options**: Download data as CSV, JSON, or PNG

## Performance Optimizations

- **Dynamic imports** for Recharts components to prevent SSR issues
- **Memoized calculations** for visible/focused series
- **Efficient re-renders** with useCallback hooks
- **Responsive containers** that adapt to screen size
- **Smooth animations** with CSS transitions

## Integration with FRED API

The charts are designed to work seamlessly with the refactored FRED API service:

```tsx
// Example API integration
useEffect(() => {
  const fetchHousingData = async () => {
    const response = await fetch('/api/housing');
    const data = await response.json();
    // Data automatically formatted for chart consumption
  };
  
  fetchHousingData();
}, []);
```

## Accessibility Features

- **Keyboard navigation** support
- **Screen reader friendly** with proper ARIA labels
- **High contrast** color schemes
- **Responsive design** for mobile and desktop
- **Clear visual hierarchy** with proper heading structure

## Browser Support

- **Modern browsers** (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- **Mobile responsive** design
- **Touch interactions** supported
- **Graceful fallbacks** for older browsers

## Demo Page

Visit `/interactive-charts` to see a comprehensive demonstration of all features with sample data and usage examples.

---

## Summary of Improvements

✅ **Visual Appeal**: Modern design with smooth animations and color-coded frequencies  
✅ **Interactive Series**: Click to show/hide, double-click to focus individual data sources  
✅ **Automatic Granularity**: Charts adjust for daily, weekly, monthly, and quarterly data  
✅ **Multi-axis Support**: Different data scales handled with separate Y-axes  
✅ **Quick Filters**: Preset combinations for common analysis scenarios  
✅ **Export Capabilities**: Download data and charts in multiple formats  
✅ **Real-time Updates**: Integration with FRED API for live data  
✅ **Responsive Design**: Works seamlessly on desktop, tablet, and mobile  

The new interactive charts provide a significant upgrade in both functionality and visual appeal, making economic data analysis more intuitive and engaging for users.