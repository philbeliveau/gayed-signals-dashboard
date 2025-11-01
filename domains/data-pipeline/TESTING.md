# Integration Testing Suite

**Story 4.0g:** Comprehensive integration testing for Railway backend data pipeline

## Overview

This testing suite provides end-to-end integration tests, failover/resilience tests, performance benchmarks, and load testing for the Gayed Signals Dashboard data pipeline.

## Test Coverage

- ✅ **End-to-End User Journeys** - Happy path, pagination, filtering, sorting
- ✅ **Failover & Resilience** - Connection recovery, transaction rollback, partial failures
- ✅ **Performance Benchmarks** - p50/p95/p99 latency, concurrent operations
- ✅ **Load Testing** - Sustained load (3000 req/min), peak load (6000 req/min)
- ✅ **Data Integrity** - Consistency, validation, referential integrity
- ✅ **Railway Integration** - PostgreSQL and Redis testing

## Prerequisites

### Required Environment Variables

```bash
# Railway PostgreSQL connection
DATABASE_URL=postgresql://user:password@host:port/database

# Optional: Redis for caching tests
REDIS_URL=redis://localhost:6379

# Test environment
NODE_ENV=test
```

### Install Dependencies

```bash
npm install
```

## Running Tests

### Integration Tests (Jest)

```bash
# Run all integration tests
npm run test:integration

# Run with coverage report
npm run test:coverage:integration

# Run in CI mode (sequential execution)
npm run test:integration:ci

# Watch mode for development
npm run test:watch -- --testPathPattern=integration
```

### Load Tests (Artillery)

```bash
# Standard load test (3000-6000 req/min)
npm run test:load

# Stress test (push to limits)
npm run test:stress

# Spike test (sudden traffic bursts)
npm run test:spike
```

### All Tests

```bash
# Run unit + integration + load tests
npm run test:all
```

## Test Structure

```
src/__tests__/
├── integration/
│   ├── end-to-end.test.ts           # User journey tests
│   ├── failover-resilience.test.ts  # Failover & recovery tests
│   ├── railway-integration.test.ts  # Railway PostgreSQL tests
│   └── signals-api.test.ts          # API endpoint tests
├── helpers/
│   ├── test-utilities.ts            # Test helper functions
│   ├── fixtures.ts                  # Test data fixtures
│   └── teardown.ts                  # Global teardown
└── setup.ts                         # Global test setup

test-scenarios/
├── load-test.yml       # Standard load test (1000+ req/min)
├── stress-test.yml     # Stress test (12000 req/min sustained)
└── spike-test.yml      # Traffic spike test (10x-15x bursts)
```

## Test Helper Utilities

### Data Generation

```typescript
import { createTestSignal, generateBulkSignals } from '../helpers/test-utilities';

// Create single test signal
const signal = createTestSignal({ date: '2025-10-31', type: 'bullish' });

// Generate bulk signals
const signals = generateBulkSignals(100);
```

### Database Seeding

```typescript
import { seedRailwayDatabase, clearTestData } from '../helpers/test-utilities';

// Seed test data
await seedRailwayDatabase(prisma, signals);

// Clean up after tests
await clearTestData(prisma);
```

### Performance Assertions

```typescript
import { expectPerformance, percentile } from '../helpers/test-utilities';

// Assert operation completes within threshold
expectPerformance(durationMs, 100); // <100ms

// Calculate percentiles
const p95 = percentile(responseTimes, 95);
```

## Coverage Requirements

**Story 4.0g Targets:**
- Line Coverage: **>90%**
- Branch Coverage: **>85%**
- Function Coverage: **>90%**
- Critical Path Coverage: **100%**

### Current Coverage

Run `npm run test:coverage:integration` to see detailed coverage report.

```bash
# View HTML coverage report
open coverage/integration/lcov-report/index.html
```

## Performance Targets

### Latency Benchmarks
- **p50:** <300ms (50th percentile)
- **p95:** <1000ms (95th percentile)
- **p99:** <2000ms (99th percentile)

### Throughput
- **Sustained Load:** 1000+ requests/minute
- **Peak Load:** Handle 6000 requests/minute
- **Error Rate:** <0.1% under normal load

### Resource Utilization
- **Memory Leaks:** None detected under sustained load
- **Connection Pooling:** Efficient reuse, no leaks
- **Database Performance:** Query latency <100ms (p95)

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Push to `main`, `develop`, `fix/data-pipeline-restructuring`
- Pull requests to `main`, `develop`
- Manual trigger via `workflow_dispatch`

### Workflow Steps

1. **Setup** - Node.js 20, PostgreSQL 15, Redis 7
2. **Install** - Dependencies and Prisma client generation
3. **Migrate** - Run database migrations
4. **Test** - Execute integration tests
5. **Coverage** - Generate and upload coverage reports
6. **Artifacts** - Save test results and reports

### View Results

- **GitHub Actions:** Check workflow runs in Actions tab
- **Coverage Reports:** Uploaded to Codecov
- **Test Artifacts:** Available in workflow run artifacts (30-day retention)

## Load Testing with Artillery

### Test Scenarios

**Load Test** (`load-test.yml`)
- Warm-up: 5 req/sec for 1 min
- Ramp-up: 10→50 req/sec over 2 min
- Sustained: 50 req/sec for 5 min (3000 req/min)
- Peak: 100 req/sec for 2 min (6000 req/min)
- Cool-down: 10 req/sec for 1 min

**Stress Test** (`stress-test.yml`)
- Push system to 200 req/sec sustained (12000 req/min)
- Gradually ramp to 500 req/sec to find breaking point

**Spike Test** (`spike-test.yml`)
- Baseline: 20 req/sec
- Spike: Sudden jump to 200 req/sec (10x increase)
- Recovery: Return to baseline
- Second spike: 300 req/sec (15x increase)

### Interpreting Results

```bash
# Run load test with HTML report
artillery run test-scenarios/load-test.yml --output results.json
artillery report results.json --output report.html
open report.html
```

**Key Metrics:**
- HTTP response times (p50, p95, p99)
- Request rate (requests/second)
- Error rate (percentage)
- Scenarios completed successfully
- Resource utilization

## Troubleshooting

### Tests Fail to Connect to Database

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection manually
npx prisma db execute --sql "SELECT 1" --schema=./prisma/schema.prisma
```

### Coverage Below Threshold

```bash
# View detailed coverage report
npm run test:coverage:integration
open coverage/integration/lcov-report/index.html

# Focus on uncovered lines
# Add tests for red-highlighted code sections
```

### Flaky Tests

```bash
# Run specific test file multiple times
npm run test:integration -- --testPathPattern=end-to-end --runInBand --verbose
```

### Load Tests Fail

```bash
# Verify server is running
curl http://localhost:3001/health

# Check Artillery installation
artillery --version

# Run with debug output
DEBUG=* artillery run test-scenarios/load-test.yml
```

## Best Practices

### Writing Integration Tests

1. **Isolation** - Each test should be independent
2. **Cleanup** - Always clean up test data in `afterEach`
3. **Real Data** - Use real Railway database, no mocks
4. **Descriptive Names** - Clear test descriptions
5. **Performance** - Assert on timing when relevant

### Example Test Pattern

```typescript
describe('Feature Name', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await setupTestEnvironment(prisma);
  });

  afterAll(async () => {
    await teardownTestEnvironment(prisma);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await clearTestData(prisma);
  });

  it('should perform expected behavior', async () => {
    // Arrange
    const testData = createTestSignal();
    await seedRailwayDatabase(prisma, [testData]);

    // Act
    const result = await performOperation();

    // Assert
    expect(result).toBeDefined();
    expectPerformance(duration, 100);
  });
});
```

## Contributing

When adding new tests:

1. Follow existing patterns in `end-to-end.test.ts`
2. Use test utilities from `test-utilities.ts`
3. Add fixtures to `fixtures.ts` if reusable
4. Update this README if adding new test categories
5. Ensure coverage thresholds are met

## Related Documentation

- [Data Pipeline Architecture](../../docs/architecture/data-pipeline-architecture.md)
- [Story 4.0g - Integration Testing](../../docs/stories/4.0g.integration-testing.md)
- [Railway Deployment Guide](./DEPLOYMENT.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Artillery Documentation](https://www.artillery.io/docs)

---

**Last Updated:** 2025-10-31
**Story:** 4.0g - Integration Testing Suite
**Coverage Target:** >90% line, >85% branch
