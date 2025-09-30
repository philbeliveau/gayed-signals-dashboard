/**
 * Market Data Domain - Public API
 *
 * This barrel export provides access to market data services, types, and utilities.
 * Only exports services and types needed by other domains.
 */

// Core Services
export { EnhancedMarketClient as marketDataService } from './services/enhanced-market-client';

// Types
export type { MarketData } from './types';

// Functions from services
export { loadFREDData, convertFREDToHousingData, convertFREDToLaborData, filterFREDDataByPeriod } from './services/fred-data-loader';
export { YahooFinanceClient, fetchMarketData, validateMarketData } from './services/yahoo-finance';