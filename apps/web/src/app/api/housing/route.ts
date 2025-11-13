/**
 * Housing Market Data API Route
 * CRITICAL: Follows Railway backend pattern - proxies to Railway backend
 * Story: 4.0h - Frontend Railway Backend Integration
 * 
 * This route proxies requests to Railway backend /api/v1/economic/housing-market
 * Following coding standards: Frontend MUST use Railway backend wrappers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isRailwayBackendAvailable, getRailwayBackendURL } from '../../../lib/feature-flags';

// Simple logger for this API
const logger = {
  info: (message: string) => console.log(`ℹ️ Housing API: ${message}`),
  warn: (message: string) => console.warn(`⚠️ Housing API: ${message}`),
  error: (message: string, error?: any) => console.error(`❌ Housing API: ${message}`, error)
};

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Auth-First Pattern - check authentication BEFORE parsing request
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError) {
      // Optional auth for economic data endpoints
      logger.info('Optional auth - proceeding without user authentication');
    }

    // Parse query parameters AFTER auth check
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '12m';
    const fast = url.searchParams.get('fast') === 'true';
    const region = url.searchParams.get('region') || 'national';
    
    logger.info(`🏠 Proxying housing data request to Railway backend: period=${period}, fast=${fast}, region=${region}`);
    
    // CRITICAL: Proxy to Railway backend if available
    if (isRailwayBackendAvailable()) {
      const railwayURL = getRailwayBackendURL();
      const railwayEndpoint = `${railwayURL}/api/v1/economic/housing-market?period=${period}&fast=${fast}&region=${region}`;
      
      try {
        const railwayResponse = await fetch(railwayEndpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.NEXT_PUBLIC_RAILWAY_API_KEY && {
              'X-API-Key': process.env.NEXT_PUBLIC_RAILWAY_API_KEY
            }),
          },
        });

        if (!railwayResponse.ok) {
          throw new Error(`Railway backend error: ${railwayResponse.status}`);
        }

        const railwayData = await railwayResponse.json();
        logger.info(`✅ Successfully proxied housing data from Railway backend`);
        
        return NextResponse.json(railwayData);
      } catch (railwayError) {
        logger.warn(`Railway backend failed, falling back to local FRED client: ${railwayError}`);
        // Fall through to local FRED client
      }
    }
    
    // Fallback: Use local FRED client (for development/testing)
    // CRITICAL: This should only be used when Railway backend is unavailable
    logger.warn('⚠️ Using local FRED client - Railway backend not available');
    
    const { FREDAPIClient, createFREDClient } = await import('../../../domains/market-data/services/fred-api-client');
    const fredClient = createFREDClient();
    
    const housingSeriesIds = [
      'CSUSHPINSA',    // Case-Shiller Index
      'HOUST',         // Housing Starts
      'MSACSR',        // Months Supply
      'HSN1F',         // New Home Sales
      'EXHOSLUSM495S', // Existing Home Sales
      'PERMIT',        // Building Permits
      'MORTGAGE30US',  // 30-Year Mortgage Rate
      'USSTHPI'        // All-Transactions House Price Index
    ];
    
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'max' || period === 'all') {
      startDate.setFullYear(1987, 0, 1);
    } else if (period.endsWith('y')) {
      const years = parseInt(period) || 1;
      startDate.setFullYear(endDate.getFullYear() - years);
    } else if (period.endsWith('m')) {
      const months = parseInt(period) || 12;
      startDate.setMonth(endDate.getMonth() - months);
    } else {
      startDate.setMonth(endDate.getMonth() - 12);
    }
    
    const seriesToFetch = fast ? housingSeriesIds.slice(0, 4) : housingSeriesIds;
    const housingData = await fredClient.getBatchSeriesData(seriesToFetch, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    if (!housingData || Object.keys(housingData).length === 0) {
      logger.warn('No housing data received from FRED');
      return NextResponse.json({ 
        error: 'No housing data available',
        period,
        fast,
        seriesIds: seriesToFetch
      }, { status: 404 });
    }
    
    const transformedData = transformHousingData(housingData);
    
    return NextResponse.json({
      timeSeries: transformedData,
      metadata: {
        timestamp: new Date().toISOString(),
        period,
        fast,
        dataPoints: transformedData.length,
        seriesCount: fast ? 4 : 8,
        dataSource: 'FRED',
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error fetching housing data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch housing data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function OPTIONS(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Transform FRED data to time series format
function transformHousingData(fredData: Record<string, any[]>): any[] {
  const dateMap = new Map<string, any>();
  
  // Process each series
  Object.entries(fredData).forEach(([seriesId, dataPoints]) => {
    dataPoints.forEach((point: any) => {
      const date = point.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      
      const entry = dateMap.get(date);
      const value = typeof point.value === 'number' ? point.value : parseFloat(point.value);
      
      // Map FRED series IDs to data keys
      switch (seriesId) {
        case 'CSUSHPINSA':
          entry.caseSillerIndex = value;
          break;
        case 'HOUST':
          entry.housingStarts = value;
          break;
        case 'MSACSR':
          entry.monthsSupply = value;
          break;
        case 'HSN1F':
          entry.newHomeSales = value;
          break;
        case 'EXHOSLUSM495S':
          entry.existingHomeSales = value;
          break;
        case 'PERMIT':
          entry.housingPermits = value;
          break;
        case 'MORTGAGE30US':
          entry.mortgageRates = value;
          break;
        case 'USSTHPI':
          entry.housePriceIndex = value;
          break;
      }
    });
  });
  
  // Convert to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}