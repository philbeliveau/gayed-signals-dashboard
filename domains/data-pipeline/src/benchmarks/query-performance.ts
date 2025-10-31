/**
 * Query Performance Benchmarking
 *
 * Benchmarks common query patterns and validates performance targets
 * Story 4.0b Task 4.1
 *
 * Target: < 100ms for typical queries
 */

import { PrismaClient } from '../../generated/client';

interface BenchmarkResult {
  queryName: string;
  executionTimeMs: number;
  rowsReturned: number;
  passed: boolean;
  threshold: number;
}

interface BenchmarkSummary {
  totalQueries: number;
  passed: number;
  failed: number;
  averageExecutionTime: number;
  results: BenchmarkResult[];
}

export class QueryPerformanceBenchmark {
  private prisma: PrismaClient;
  private threshold: number = 100; // 100ms target

  constructor(prisma: PrismaClient, threshold: number = 100) {
    this.prisma = prisma;
    this.threshold = threshold;
  }

  /**
   * Run all performance benchmarks
   */
  async runAllBenchmarks(): Promise<BenchmarkSummary> {
    console.log('[Benchmark] Starting query performance benchmarks...');
    console.log(`[Benchmark] Target threshold: ${this.threshold}ms\n`);

    const results: BenchmarkResult[] = [];

    // Market Data queries
    results.push(await this.benchmarkQuery('Market Data: Latest by Symbol', () =>
      this.prisma.marketData.findFirst({
        where: { symbol: 'SPY', dataType: 'price' },
        orderBy: { date: 'desc' }
      })
    ));

    results.push(await this.benchmarkQuery('Market Data: Date Range (30 days)', () =>
      this.prisma.marketData.findMany({
        where: {
          symbol: 'SPY',
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lte: new Date()
          }
        },
        orderBy: { date: 'asc' }
      })
    ));

    results.push(await this.benchmarkQuery('Market Data: Multiple Symbols', () =>
      this.prisma.marketData.findMany({
        where: {
          symbol: { in: ['SPY', 'XLU', 'VIX'] },
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'desc' }
      })
    ));

    results.push(await this.benchmarkQuery('Market Data: With Provenance Join', () =>
      this.prisma.marketData.findMany({
        where: { symbol: 'SPY' },
        include: { provenance: true },
        take: 100,
        orderBy: { date: 'desc' }
      })
    ));

    // Provenance queries
    results.push(await this.benchmarkQuery('Provenance: By Source System', () =>
      this.prisma.dataProvenance.findMany({
        where: { sourceSystem: 'yahoo_finance' },
        orderBy: { requestTimestamp: 'desc' },
        take: 50
      })
    ));

    results.push(await this.benchmarkQuery('Provenance: Recent with Status Filter', () =>
      this.prisma.dataProvenance.findMany({
        where: {
          status: 'completed',
          requestTimestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { requestTimestamp: 'desc' }
      })
    ));

    // Signal History queries
    results.push(await this.benchmarkQuery('Signal: Latest by Name', () =>
      this.prisma.signalHistory.findFirst({
        where: { signalName: 'gayed_8_month' },
        orderBy: { calculationDate: 'desc' }
      })
    ));

    results.push(await this.benchmarkQuery('Signal: History Range (90 days)', () =>
      this.prisma.signalHistory.findMany({
        where: {
          signalName: 'gayed_8_month',
          calculationDate: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { calculationDate: 'asc' }
      })
    ));

    results.push(await this.benchmarkQuery('Signal: By Status', () =>
      this.prisma.signalHistory.findMany({
        where: {
          signalStatus: 'defensive',
          calculationDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { calculationDate: 'desc' }
      })
    ));

    results.push(await this.benchmarkQuery('Signal: Status Changes', () =>
      this.prisma.signalHistory.findMany({
        where: { statusChanged: true },
        orderBy: { calculationTimestamp: 'desc' },
        take: 20
      })
    ));

    // Aggregate queries
    results.push(await this.benchmarkQuery('Count: Market Data Records', () =>
      this.prisma.marketData.count({
        where: { symbol: 'SPY' }
      })
    ));

    results.push(await this.benchmarkQuery('Count: Signal History by Type', () =>
      this.prisma.signalHistory.count({
        where: { signalType: 'timing' }
      })
    ));

    // Calculate summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;

    return {
      totalQueries: results.length,
      passed,
      failed,
      averageExecutionTime,
      results
    };
  }

  /**
   * Benchmark a single query
   */
  private async benchmarkQuery(
    queryName: string,
    queryFn: () => Promise<any>
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const result = await queryFn();
    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    const rowsReturned = Array.isArray(result) ? result.length : result ? 1 : 0;
    const passed = executionTimeMs < this.threshold;

    console.log(`[Benchmark] ${queryName}`);
    console.log(`  - Execution time: ${executionTimeMs.toFixed(2)}ms`);
    console.log(`  - Rows returned: ${rowsReturned}`);
    console.log(`  - Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
      queryName,
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      rowsReturned,
      passed,
      threshold: this.threshold
    };
  }

  /**
   * Analyze query execution plans using EXPLAIN
   */
  async analyzeQueryPlans(): Promise<void> {
    console.log('[Benchmark] Analyzing query execution plans...\n');

    // Market Data - Latest by Symbol
    console.log('Query: Latest Market Data by Symbol');
    const plan1 = await this.prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM market_data
      WHERE symbol = 'SPY' AND data_type = 'price'
      ORDER BY date DESC
      LIMIT 1
    `;
    console.log(plan1);
    console.log('');

    // Market Data - Date Range with Index
    console.log('Query: Market Data Date Range');
    const plan2 = await this.prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM market_data
      WHERE symbol = 'SPY'
        AND date >= CURRENT_DATE - INTERVAL '30 days'
        AND date <= CURRENT_DATE
      ORDER BY date ASC
    `;
    console.log(plan2);
    console.log('');

    // Signal History - Latest
    console.log('Query: Latest Signal History');
    const plan3 = await this.prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM signal_history
      WHERE signal_name = 'gayed_8_month'
      ORDER BY calculation_date DESC
      LIMIT 1
    `;
    console.log(plan3);
    console.log('');
  }

  /**
   * Test bulk insert performance
   */
  async benchmarkBulkInsert(recordCount: number = 1000): Promise<BenchmarkResult> {
    console.log(`[Benchmark] Testing bulk insert of ${recordCount} records...\n`);

    // Create test provenance
    const provenance = await this.prisma.dataProvenance.create({
      data: {
        sourceSystem: 'benchmark_test',
        requestTimestamp: new Date(),
        status: 'completed'
      }
    });

    // Generate test data
    const testData = Array.from({ length: recordCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);

      return {
        symbol: 'BENCH',
        dataType: 'price',
        timestamp: new Date(date.getTime() + i * 1000), // Unique timestamp
        date: date,
        close: 100 + Math.random() * 10,
        volume: BigInt(Math.floor(1000000 + Math.random() * 500000)),
        provenanceId: provenance.id
      };
    });

    const startTime = performance.now();

    // Use transaction for bulk insert
    await this.prisma.$transaction(
      testData.map(data => this.prisma.marketData.create({ data }))
    );

    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;
    const recordsPerSecond = (recordCount / executionTimeMs) * 1000;

    console.log(`[Benchmark] Bulk Insert Results:`);
    console.log(`  - Total time: ${executionTimeMs.toFixed(2)}ms`);
    console.log(`  - Records inserted: ${recordCount}`);
    console.log(`  - Records/second: ${recordsPerSecond.toFixed(0)}`);
    console.log(`  - Time per record: ${(executionTimeMs / recordCount).toFixed(2)}ms\n`);

    // Cleanup
    await this.prisma.marketData.deleteMany({
      where: { symbol: 'BENCH' }
    });
    await this.prisma.dataProvenance.delete({
      where: { id: provenance.id }
    });

    return {
      queryName: `Bulk Insert (${recordCount} records)`,
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      rowsReturned: recordCount,
      passed: recordsPerSecond > 100, // Target: > 100 records/second
      threshold: 100
    };
  }

  /**
   * Print benchmark summary
   */
  printSummary(summary: BenchmarkSummary): void {
    console.log('\n========================================');
    console.log('PERFORMANCE BENCHMARK SUMMARY');
    console.log('========================================\n');
    console.log(`Total Queries: ${summary.totalQueries}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Success Rate: ${((summary.passed / summary.totalQueries) * 100).toFixed(1)}%`);
    console.log(`Average Execution Time: ${summary.averageExecutionTime.toFixed(2)}ms`);
    console.log(`Target Threshold: ${this.threshold}ms\n`);

    if (summary.failed > 0) {
      console.log('Failed Queries:');
      summary.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.queryName}: ${r.executionTimeMs}ms (threshold: ${r.threshold}ms)`);
        });
      console.log('');
    }

    console.log('========================================\n');
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const prisma = new PrismaClient();

  (async () => {
    const benchmark = new QueryPerformanceBenchmark(prisma);

    // Run query benchmarks
    const summary = await benchmark.runAllBenchmarks();
    benchmark.printSummary(summary);

    // Analyze query plans
    console.log('\n--- Query Execution Plans ---\n');
    await benchmark.analyzeQueryPlans();

    // Bulk insert benchmark
    console.log('\n--- Bulk Operations Benchmark ---\n');
    const bulkResult = await benchmark.benchmarkBulkInsert(1000);

    await prisma.$disconnect();

    // Exit with error code if benchmarks failed
    process.exit(summary.failed > 0 ? 1 : 0);
  })();
}

export default QueryPerformanceBenchmark;
