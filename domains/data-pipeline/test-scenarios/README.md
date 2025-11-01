# Load Testing for Data Pipeline API

This directory contains Artillery load testing configurations for validating API performance targets.

## Prerequisites

### 1. Install Artillery

```bash
npm install -g artillery@latest
```

### 2. Set up test environment

```bash
# Set your API key for authenticated requests
export ARTILLERY_API_KEY="your_api_key_here"

# Optional: Configure Redis URL for caching performance
export REDIS_URL="redis://localhost:6379"
export RAILWAY_REDIS_URL="redis://default:password@host:port"
```

### 3. Ensure backend is running

```bash
# Local development
cd domains/data-pipeline
npm run dev

# Or test against staging
# Edit api-v2-load.yml and change target URL to staging environment
```

## Running Load Tests

### Basic load test

```bash
artillery run test-scenarios/api-v2-load.yml
```

### Generate HTML report

```bash
artillery run --output report.json test-scenarios/api-v2-load.yml
artillery report report.json --output report.html
open report.html  # View detailed results
```

### Test against staging

```bash
# Edit api-v2-load.yml first to change target URL
artillery run test-scenarios/api-v2-load.yml
```

## Performance Targets (Story 4.0e)

The load test validates these acceptance criteria:

- **Cached responses**: <500ms (p95 latency)
- **Fresh data**: <2s (p95 latency)
- **Target load**: 1000 requests/minute
- **Error rate**: <1%

## Test Scenarios

The configuration includes 5 scenarios with weighted distribution:

1. **Fetch recent signals (50%)** - Most common query, should hit cache
2. **Date range query (20%)** - Filtered by date range
3. **Filter by type (15%)** - Filtered by signal type
4. **Pagination (10%)** - Tests cursor-based pagination
5. **Health check (5%)** - Lightweight endpoint validation

## Test Phases

1. **Warm-up (60s)**: 5 req/sec - Populate caches
2. **Ramp-up (120s)**: 5→17 req/sec - Gradually increase load
3. **Sustained (300s)**: 17 req/sec - Maintain target load (1000 req/min)
4. **Spike (60s)**: 50 req/sec - Brief traffic spike test
5. **Cool-down (60s)**: 10 req/sec - Return to normal

Total duration: ~10 minutes

## Interpreting Results

### Key metrics to monitor

```
Summary report @ HH:MM:SS

Scenarios launched:  6000
Scenarios completed: 6000
Requests completed:  6500

Response time (msec):
  min: 15
  max: 980
  median: 120
  p95: 450      ← Should be <500ms for cached
  p99: 890      ← Should be <2000ms

Scenario counts:
  Fetch recent signals: 3000 (50%)
  Date range query: 1200 (20%)
  ...

Codes:
  200: 6450 (99.2%)
  500: 50 (0.8%)   ← Should be <1% error rate
```

### Success criteria

✅ **PASS** if:
- p95 latency <500ms for cached requests
- p99 latency <2000ms for fresh data
- Error rate <1%
- No timeout errors

⚠️ **CONCERNS** if:
- p95 latency 500-800ms (approaching limit)
- Error rate 1-5% (some failures)
- High p99 latency >2000ms

❌ **FAIL** if:
- p95 latency >800ms (exceeds target significantly)
- Error rate >5%
- Timeout errors present

## Troubleshooting

### High latency

- Check PostgreSQL query performance
- Verify Redis is connected and working
- Check circuit breaker status
- Review server logs for slow queries

### High error rate

- Check database connection pool settings
- Verify API keys are valid
- Review error logs for specific failure patterns
- Check if circuit breakers are opening

### Memory issues

- Adjust memory cache size in SignalOrchestratorV2
- Tune Redis memory limits
- Check for memory leaks in server logs

## Advanced Testing

### Custom scenarios

Create additional YAML files in this directory:

```yaml
# test-scenarios/custom-load.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: 'Custom scenario'
    flow:
      - get:
          url: '/api/v2/signals'
          qs:
            custom: 'params'
```

### Distributed load testing

```bash
# Run on multiple machines for higher load
artillery run --target https://staging.example.com test-scenarios/api-v2-load.yml
```

## CI/CD Integration

Add to GitHub Actions or Railway deployment pipeline:

```yaml
# .github/workflows/performance-test.yml
- name: Run load tests
  run: |
    npm install -g artillery
    artillery run test-scenarios/api-v2-load.yml --output report.json
    artillery report report.json --output report.html

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: performance-report
    path: report.html
```

## Notes

- **Database state**: Load tests assume database is populated with test data
- **Cache warming**: First phase warms caches; real metrics start in ramp-up phase
- **Production testing**: Always test against staging first, never production without coordination
- **Rate limits**: Ensure rate limiting is disabled or configured appropriately for load testing

## References

- [Artillery Documentation](https://www.artillery.io/docs)
- [Story 4.0e: API Route Consolidation](../../docs/stories/4.0e.api-consolidation.md)
- [Performance Requirements](../../docs/architecture/data-pipeline-architecture.md)
