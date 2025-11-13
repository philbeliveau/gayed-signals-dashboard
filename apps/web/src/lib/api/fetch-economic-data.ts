/**
 * Unified Economic Data Fetching with Railway Backend Fallback
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Provides graceful fallback: Railway backend → local API
 * with migration metrics tracking
 * CRITICAL: Frontend MUST use this wrapper, NOT direct API calls
 */

import { EconomicDataV2Service } from './economic-data-v2';
import {
  USE_RAILWAY_BACKEND,
  isRailwayBackendAvailable,
  logMigrationMetric,
} from '../feature-flags';
import { performanceMonitor } from './performance-monitor';
import type { EconomicDataResponse, EconomicDataQueryParams } from './economic-data-v2';

/**
 * Fetch economic data with automatic fallback
 *
 * Flow:
 * 1. If Railway backend enabled and available → try Railway V2 API
 * 2. If Railway fails or disabled → fallback to local API
 * 3. Track migration metrics for both paths
 * 4. NEVER use mock/synthetic data - real data only
 */
export async function fetchEconomicDataWithFallback(
  options: EconomicDataQueryParams
): Promise<EconomicDataResponse> {
  const startTime = Date.now();

  // Try Railway backend if enabled
  if (USE_RAILWAY_BACKEND && isRailwayBackendAvailable()) {
    try {
      console.log(`[Economic Data Fetch] Attempting Railway backend for ${options.category}...`);

      const v2Service = new EconomicDataV2Service();
      const v2Response = await v2Service.getEconomicData(options);

      const duration = Date.now() - startTime;

      // Validate we got real data
      const timeSeries = v2Response.data.timeSeries || 
                        v2Response.data.laborData || 
                        v2Response.data.housingData || [];
      
      if (!timeSeries || timeSeries.length === 0) {
        throw new Error('Railway backend returned empty data');
      }

      logMigrationMetric('railway', true, {
        endpoint: `/api/v1/economic/${options.category === 'labor' ? 'labor-market' : 'housing-market'}`,
        duration,
      });

      // Record performance metric
      performanceMonitor.record({
        endpoint: `/api/v1/economic/${options.category === 'labor' ? 'labor-market' : 'housing-market'}`,
        duration,
        cached: false, // Economic data doesn't have cached flag in current response
        source: 'railway',
        timestamp: new Date().toISOString(),
        success: true,
      });

      console.log(
        `[Economic Data Fetch] Railway backend succeeded in ${duration}ms (${timeSeries.length} data points)`
      );

      return v2Response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.warn(
        `[Economic Data Fetch] Railway backend failed after ${duration}ms:`,
        errorMessage
      );
      console.warn('[Economic Data Fetch] Falling back to local API...');

      logMigrationMetric('railway', false, {
        endpoint: `/api/v1/economic/${options.category === 'labor' ? 'labor-market' : 'housing-market'}`,
        duration,
        error: errorMessage,
      });

      // Record failed Railway attempt
      performanceMonitor.record({
        endpoint: `/api/v1/economic/${options.category === 'labor' ? 'labor-market' : 'housing-market'}`,
        duration,
        cached: false,
        source: 'railway',
        timestamp: new Date().toISOString(),
        success: false,
      });

      // Fall through to local API
    }
  }

  // Fallback: Use local API (which should proxy to Railway backend)
  try {
    const localStartTime = Date.now();
    const apiUrl = options.category === 'labor' 
      ? `/api/labor?period=${options.period || '12m'}&fast=${options.fast || false}`
      : `/api/housing?period=${options.period || '12m'}&fast=${options.fast || false}${options.region ? `&region=${options.region}` : ''}`;

    console.log(`[Economic Data Fetch] Using local API: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Local API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - localStartTime;

    // Transform local API response to match Railway format
    const transformedResponse: EconomicDataResponse = {
      success: true,
      data: {
        timeSeries: data.timeSeries || data.laborData || data.housingData || [],
        laborData: options.category === 'labor' ? (data.timeSeries || data.laborData || []) : undefined,
        housingData: options.category === 'housing' ? (data.timeSeries || data.housingData || []) : undefined,
        alerts: data.alerts || [],
        metadata: {
          timestamp: data.metadata?.timestamp || new Date().toISOString(),
          dataSource: data.metadata?.dataSource || 'local_api',
          period: options.period || '12m',
          fastMode: options.fast || false,
          dataPoints: data.metadata?.dataPoints || (data.timeSeries || data.laborData || data.housingData || []).length,
          region: options.region,
        },
      },
    };

    logMigrationMetric('local', true, {
      endpoint: apiUrl,
      duration,
    });

    // Record local API performance
    performanceMonitor.record({
      endpoint: apiUrl,
      duration,
      cached: data.metadata?.cached || false,
      source: 'local',
      timestamp: new Date().toISOString(),
      success: true,
    });

    console.log(`[Economic Data Fetch] Local API succeeded in ${duration}ms`);

    return transformedResponse;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logMigrationMetric('local', false, {
      endpoint: options.category === 'labor' ? '/api/labor' : '/api/housing',
      duration,
      error: errorMessage,
    });

    console.error('[Economic Data Fetch] Both Railway and local API failed:', error);
    
    // CRITICAL: NO MOCK DATA - throw error instead
    throw new Error(
      `Failed to fetch ${options.category} data from all sources: ${errorMessage}. ` +
      `Real data only - no synthetic fallback available.`
    );
  }
}

/**
 * Force Railway backend fetch (no fallback)
 * Useful for testing Railway backend specifically
 */
export async function fetchEconomicDataFromRailway(
  options: EconomicDataQueryParams
): Promise<EconomicDataResponse> {
  if (!isRailwayBackendAvailable()) {
    throw new Error('Railway backend not available');
  }

  const v2Service = new EconomicDataV2Service();
  return await v2Service.getEconomicData(options);
}

/**
 * Force local API fetch (no Railway)
 * Useful for testing local API specifically
 */
export async function fetchEconomicDataFromLocal(
  options: EconomicDataQueryParams
): Promise<EconomicDataResponse> {
  const apiUrl = options.category === 'labor' 
    ? `/api/labor?period=${options.period || '12m'}&fast=${options.fast || false}`
    : `/api/housing?period=${options.period || '12m'}&fast=${options.fast || false}${options.region ? `&region=${options.region}` : ''}`;
  
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Local API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    success: true,
    data: {
      timeSeries: data.timeSeries || data.laborData || data.housingData || [],
      laborData: options.category === 'labor' ? (data.timeSeries || data.laborData || []) : undefined,
      housingData: options.category === 'housing' ? (data.timeSeries || data.housingData || []) : undefined,
      alerts: data.alerts || [],
      metadata: {
        timestamp: data.metadata?.timestamp || new Date().toISOString(),
        dataSource: data.metadata?.dataSource || 'local_api',
        period: options.period || '12m',
        fastMode: options.fast || false,
        dataPoints: data.metadata?.dataPoints || (data.timeSeries || data.laborData || data.housingData || []).length,
        region: options.region,
      },
    },
  };
}

