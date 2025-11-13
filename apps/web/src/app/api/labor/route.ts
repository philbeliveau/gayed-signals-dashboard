/**
 * Labor Market Data API Route
 * CRITICAL: Follows Railway backend pattern - proxies to Railway backend
 * Story: 4.0h - Frontend Railway Backend Integration
 * 
 * This route proxies requests to Railway backend /api/v1/economic/labor-market
 * Following coding standards: Frontend MUST use Railway backend wrappers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isRailwayBackendAvailable, getRailwayBackendURL } from '../../../lib/feature-flags';

// Simple logger for this API
const logger = {
  info: (message: string) => console.log(`ℹ️ Labor API: ${message}`),
  warn: (message: string) => console.warn(`⚠️ Labor API: ${message}`),
  error: (message: string, error?: any) => console.error(`❌ Labor API: ${message}`, error)
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
    
    logger.info(`👥 Proxying labor data request to Railway backend: period=${period}, fast=${fast}`);
    
    // CRITICAL: Proxy to Railway backend if available
    if (isRailwayBackendAvailable()) {
      const railwayURL = getRailwayBackendURL();
      const railwayEndpoint = `${railwayURL}/api/v1/economic/labor-market?period=${period}&fast=${fast}`;
      
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
        logger.info(`✅ Successfully proxied labor data from Railway backend`);
        
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
    
    const laborSeriesIds = [
      'UNRATE',        // Unemployment Rate
      'PAYEMS',        // Nonfarm Payrolls
      'ICSA',          // Initial Claims
      'CCSA',          // Continued Claims
      'IC4WSA',        // 4-Week Claims Average
      'CIVPART',       // Labor Force Participation
      'EMRATIO',       // Employment-Population Ratio
      'UNEMPLOY',      // Unemployed Persons
      'JTSJOL',        // Job Openings
      'JTSQUR'         // Quits Rate
    ];
    
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'max' || period === 'all') {
      startDate.setFullYear(1948, 0, 1);
    } else if (period.endsWith('y')) {
      const years = parseInt(period) || 1;
      startDate.setFullYear(endDate.getFullYear() - years);
    } else if (period.endsWith('m')) {
      const months = parseInt(period) || 12;
      startDate.setMonth(endDate.getMonth() - months);
    } else {
      startDate.setMonth(endDate.getMonth() - 12);
    }
    
    const seriesToFetch = fast ? laborSeriesIds.slice(0, 5) : laborSeriesIds;
    const laborData = await fredClient.getBatchSeriesData(seriesToFetch, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    if (!laborData || Object.keys(laborData).length === 0) {
      logger.warn('No labor data received from FRED');
      return NextResponse.json({ 
        error: 'No labor data available',
        period,
        fast,
        seriesIds: seriesToFetch
      }, { status: 404 });
    }
    
    const transformedData = transformLaborData(laborData);
    
    return NextResponse.json({
      timeSeries: transformedData,
      metadata: {
        timestamp: new Date().toISOString(),
        period,
        fast,
        dataPoints: transformedData.length,
        seriesCount: fast ? 5 : 10,
        dataSource: 'FRED',
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Error fetching labor data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch labor data',
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
function transformLaborData(fredData: Record<string, any[]>): any[] {
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
        case 'UNRATE':
          entry.unemploymentRate = value;
          break;
        case 'PAYEMS':
          entry.nonfarmPayrolls = value;
          break;
        case 'ICSA':
          entry.initialClaims = value;
          break;
        case 'CCSA':
          entry.continuedClaims = value;
          break;
        case 'IC4WSA':
          entry.claims4Week = value;
          break;
        case 'CIVPART':
          entry.laborParticipation = value;
          break;
        case 'EMRATIO':
          entry.employmentPopulation = value;
          break;
        case 'UNEMPLOY':
          entry.unemployed = value;
          break;
        case 'JTSJOL':
          entry.jobOpenings = value;
          break;
        case 'JTSQUR':
          entry.quitsRate = value;
          break;
      }
    });
  });
  
  // Convert to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}