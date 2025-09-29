import { NextRequest, NextResponse } from 'next/server';
import { SignalOrchestrator } from '@/domains/trading-signals/engines/orchestrator';
import { createEnhancedMarketClient } from '@/domains/market-data/services/enhanced-market-client';

/**
 * GET /api/signals/status
 *
 * Returns health status of signal calculation infrastructure
 * Used by the backend Enhanced Financial Analyst agent for health monitoring
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🏥 API: Checking signal infrastructure health status');

    // Get orchestrator configuration
    const orchestratorConfig = SignalOrchestrator.getConfiguration();

    // Create market client and get stats
    const marketClient = createEnhancedMarketClient();
    const clientStats = marketClient.getStats();
    const cacheInfo = marketClient.getCacheInfo();

    // Test signal data availability
    const requiredSymbols = SignalOrchestrator.getRequiredSymbols();
    let dataStatus = 'healthy';
    let dataIssues: string[] = [];

    try {
      // Quick test with 2 essential symbols
      const testSymbols = ['SPY', 'XLU'];
      const testData = await marketClient.fetchMarketData(testSymbols);

      const validation = marketClient.constructor.validateGayedSignalsData(testData);
      if (!validation.isValid) {
        dataStatus = 'degraded';
        dataIssues = validation.warnings;
      }
    } catch (error) {
      dataStatus = 'error';
      dataIssues.push(`Market data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Calculate overall health score
    let healthScore = 100;
    if (dataStatus === 'degraded') healthScore -= 25;
    if (dataStatus === 'error') healthScore -= 50;
    if (clientStats.failoverEvents > 0) healthScore -= 10;
    if (clientStats.cacheHits === 0 && clientStats.cacheMisses > 5) healthScore -= 15;

    const response = {
      overall_status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
      health_score: healthScore,
      signal_infrastructure: {
        orchestrator: {
          status: 'operational',
          signals_implemented: orchestratorConfig.signalsImplemented,
          signals_planned: orchestratorConfig.signalsPlanned,
          consensus_methods: orchestratorConfig.consensusMethods,
          minimum_data_requirements: orchestratorConfig.minimumDataRequirements
        },
        market_data: {
          status: dataStatus,
          issues: dataIssues,
          required_symbols: requiredSymbols,
          client_stats: {
            cache_hits: clientStats.cacheHits,
            cache_misses: clientStats.cacheMisses,
            failover_events: clientStats.failoverEvents,
            data_sources: {
              tiingo: {
                total_requests: clientStats.tiingo.totalRequests,
                successful_requests: clientStats.tiingo.successfulRequests,
                failed_requests: clientStats.tiingo.failedRequests,
                rate_limit_hits: clientStats.tiingo.rateLimitHits,
                last_request: clientStats.tiingo.lastRequestTime?.toISOString(),
                last_failure: clientStats.tiingo.lastFailureReason
              },
              alpha_vantage: {
                total_requests: clientStats.alphaVantage.totalRequests,
                successful_requests: clientStats.alphaVantage.successfulRequests,
                failed_requests: clientStats.alphaVantage.failedRequests,
                rate_limit_hits: clientStats.alphaVantage.rateLimitHits,
                last_request: clientStats.alphaVantage.lastRequestTime?.toISOString(),
                last_failure: clientStats.alphaVantage.lastFailureReason
              },
              yahoo_finance: {
                total_requests: clientStats.yahooFinance.totalRequests,
                successful_requests: clientStats.yahooFinance.successfulRequests,
                failed_requests: clientStats.yahooFinance.failedRequests,
                rate_limit_hits: clientStats.yahooFinance.rateLimitHits,
                last_request: clientStats.yahooFinance.lastRequestTime?.toISOString(),
                last_failure: clientStats.yahooFinance.lastFailureReason
              }
            }
          },
          cache_info: {
            size: cacheInfo.size,
            entries: cacheInfo.entries
          }
        }
      },
      metadata: {
        check_timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        node_version: process.version,
        platform: process.platform
      }
    };

    console.log(`✅ Health check completed: ${response.overall_status} (${healthScore}/100)`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error during health check:', error);

    return NextResponse.json({
      overall_status: 'critical',
      health_score: 0,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}