/**
 * MCP Service Bridge API
 * Provides access to existing MCP services for the Python backend AutoGen agents
 *
 * This bridge allows the Python backend to access:
 * - Perplexity MCP client
 * - Web search service
 * - Gayed signal data
 * - Economic data (FRED API)
 */

import { NextRequest, NextResponse } from 'next/server';
import { perplexityMCPClient } from '../../../lib/fact-check/perplexity-mcp-client';
import { webSearchService } from '../../../lib/fact-check/web-search-service';
import { signalService } from '../../../domains/trading-signals/services/signalService';

export interface MCPBridgeRequest {
  service: 'perplexity' | 'signals' | 'web-search' | 'economic-data';
  method: string;
  params: Record<string, any>;
}

export interface MCPBridgeResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  service: string;
  method: string;
}

/**
 * Handle MCP service requests from Python backend
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MCPBridgeRequest = await request.json();

    // Validate request structure
    if (!body.service || !body.method) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: service, method',
        timestamp: new Date().toISOString(),
        service: body.service || 'unknown',
        method: body.method || 'unknown'
      } as MCPBridgeResponse, { status: 400 });
    }

    // Route to appropriate service handler
    let result: any;

    switch (body.service) {
      case 'perplexity':
        result = await handlePerplexityRequest(body.method, body.params || {});
        break;

      case 'signals':
        result = await handleSignalsRequest(body.method, body.params || {});
        break;

      case 'web-search':
        result = await handleWebSearchRequest(body.method, body.params || {});
        break;

      case 'economic-data':
        result = await handleEconomicDataRequest(body.method, body.params || {});
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown service: ${body.service}`,
          timestamp: new Date().toISOString(),
          service: body.service,
          method: body.method
        } as MCPBridgeResponse, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      service: body.service,
      method: body.method
    } as MCPBridgeResponse);

  } catch (error) {
    console.error('MCP Bridge error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      service: 'unknown',
      method: 'unknown'
    } as MCPBridgeResponse, { status: 500 });
  }
}

/**
 * Handle Perplexity MCP service requests
 */
async function handlePerplexityRequest(method: string, params: Record<string, any>): Promise<any> {
  switch (method) {
    case 'researchClaim':
      if (!params.claimText) {
        throw new Error('Missing required parameter: claimText');
      }
      return await perplexityMCPClient.researchClaim(params.claimText);

    case 'testConnection':
      return await perplexityMCPClient.testConnection();

    default:
      throw new Error(`Unknown Perplexity method: ${method}`);
  }
}

/**
 * Handle signals service requests
 */
async function handleSignalsRequest(method: string, params: Record<string, any>): Promise<any> {
  switch (method) {
    case 'getCurrentSignals':
      return await signalService.calculateAllSignals({
        useCache: params.useCache ?? true,
        cacheTTL: params.cacheTTL ?? 5 * 60 * 1000,
        historicalDays: params.historicalDays ?? 250
      });

    case 'getFastSignals':
      return await signalService.calculateFastSignals({
        useCache: params.useCache ?? true,
        cacheTTL: params.cacheTTL ?? 2 * 60 * 1000
      });

    case 'getSignalByType':
      if (!params.signalType) {
        throw new Error('Missing required parameter: signalType');
      }
      return await signalService.calculateSignal(params.signalType, {
        useCache: params.useCache ?? true,
        historicalDays: params.historicalDays ?? 250
      });

    case 'getCacheStats':
      return signalService.getCacheStats();

    default:
      throw new Error(`Unknown signals method: ${method}`);
  }
}

/**
 * Handle web search service requests
 */
async function handleWebSearchRequest(method: string, params: Record<string, any>): Promise<any> {
  switch (method) {
    case 'search':
      if (!params.query) {
        throw new Error('Missing required parameter: query');
      }

      const config = {
        agentType: params.agentType || 'NEWS',
        maxResults: params.maxResults || 5,
        includeDomains: params.includeDomains,
        excludeDomains: params.excludeDomains
      };

      return await webSearchService.searchForEvidence(params.query, config);

    case 'testConnectivity':
      return await webSearchService.testConnectivity();

    default:
      throw new Error(`Unknown web search method: ${method}`);
  }
}

/**
 * Handle economic data requests (FRED API, etc.)
 */
async function handleEconomicDataRequest(method: string, params: Record<string, any>): Promise<any> {
  const { createFREDClient } = await import('@/domains/market-data/services/fred-api-client');

  switch (method) {
    case 'getIndicator':
      if (!params.indicator) {
        throw new Error('Missing required parameter: indicator');
      }

      try {
        const fredClient = createFREDClient();

        // Parse optional parameters
        const options: any = {};
        if (params.startDate) options.startDate = params.startDate;
        if (params.endDate) options.endDate = params.endDate;
        if (params.limit) options.limit = parseInt(params.limit);
        if (params.transform) options.transform = params.transform;

        // Get series observations
        const observations = await fredClient.getSeriesObservations(params.indicator, options);

        // Get series metadata for additional context
        let seriesInfo;
        try {
          seriesInfo = await fredClient.getSeriesInfo(params.indicator);
        } catch (error) {
          console.warn(`Could not fetch series info for ${params.indicator}:`, error);
          seriesInfo = null;
        }

        return {
          indicator: params.indicator,
          data: observations,
          metadata: seriesInfo ? {
            title: seriesInfo.title,
            units: seriesInfo.units,
            frequency: seriesInfo.frequency,
            lastUpdated: seriesInfo.last_updated,
            notes: seriesInfo.notes
          } : null,
          timestamp: new Date().toISOString(),
          count: observations.length
        };
      } catch (error) {
        console.error('FRED API integration error:', error);
        return {
          indicator: params.indicator,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown FRED API error',
          timestamp: new Date().toISOString()
        };
      }

    case 'getBatchIndicators':
      if (!params.indicators || !Array.isArray(params.indicators)) {
        throw new Error('Missing required parameter: indicators (array)');
      }

      try {
        const fredClient = createFREDClient();

        // Parse optional parameters
        const options: any = {};
        if (params.startDate) options.startDate = params.startDate;
        if (params.endDate) options.endDate = params.endDate;
        if (params.limit) options.limit = parseInt(params.limit);

        // Get batch series data
        const batchData = await fredClient.getBatchSeriesData(params.indicators, options);

        return {
          indicators: params.indicators,
          data: batchData,
          timestamp: new Date().toISOString(),
          count: Object.keys(batchData).length
        };
      } catch (error) {
        console.error('FRED batch API integration error:', error);
        return {
          indicators: params.indicators,
          data: {},
          error: error instanceof Error ? error.message : 'Unknown FRED batch API error',
          timestamp: new Date().toISOString()
        };
      }

    case 'getLatestIndicators':
      try {
        const fredClient = createFREDClient();
        const latestData = await fredClient.getLatestIndicators();

        return {
          data: latestData,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('FRED latest indicators error:', error);
        return {
          data: { housing: {}, employment: {} },
          error: error instanceof Error ? error.message : 'Unknown FRED latest indicators error',
          timestamp: new Date().toISOString()
        };
      }

    case 'getHousingData':
      try {
        const fredClient = createFREDClient();

        const options: any = {};
        if (params.startDate) options.startDate = params.startDate;
        if (params.endDate) options.endDate = params.endDate;
        if (params.limit) options.limit = parseInt(params.limit);

        const housingData = await fredClient.getHousingMarketData(options);

        return {
          category: 'housing',
          data: housingData,
          timestamp: new Date().toISOString(),
          seriesCount: Object.keys(housingData).length
        };
      } catch (error) {
        console.error('FRED housing data error:', error);
        return {
          category: 'housing',
          data: {},
          error: error instanceof Error ? error.message : 'Unknown FRED housing data error',
          timestamp: new Date().toISOString()
        };
      }

    case 'getEmploymentData':
      try {
        const fredClient = createFREDClient();

        const options: any = {};
        if (params.startDate) options.startDate = params.startDate;
        if (params.endDate) options.endDate = params.endDate;
        if (params.limit) options.limit = parseInt(params.limit);

        const employmentData = await fredClient.getEmploymentMarketData(options);

        return {
          category: 'employment',
          data: employmentData,
          timestamp: new Date().toISOString(),
          seriesCount: Object.keys(employmentData).length
        };
      } catch (error) {
        console.error('FRED employment data error:', error);
        return {
          category: 'employment',
          data: {},
          error: error instanceof Error ? error.message : 'Unknown FRED employment data error',
          timestamp: new Date().toISOString()
        };
      }

    default:
      throw new Error(`Unknown economic data method: ${method}`);
  }
}

/**
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    services: {
      perplexity: 'available',
      signals: 'available',
      webSearch: 'available',
      economicData: 'partial' // Not fully implemented yet
    },
    timestamp: new Date().toISOString()
  });
}