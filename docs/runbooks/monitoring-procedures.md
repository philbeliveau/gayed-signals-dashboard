# Monitoring & Observability Runbook

**Version**: 1.0
**Last Updated**: 2025-10-31
**Story**: 4.0f - Monitoring & Observability

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Alert Response Procedures](#alert-response-procedures)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Monitoring Tools](#monitoring-tools)
5. [Escalation Procedures](#escalation-procedures)
6. [Contact Information](#contact-information)

---

## Quick Reference

### Railway Platform URLs

- **Railway Dashboard**: https://railway.app/dashboard
- **PostgreSQL Metrics**: Railway Dashboard → Database → Metrics
- **Redis Metrics**: Railway Dashboard → Redis → Metrics
- **Service Logs**: Railway Dashboard → Service → Logs
- **Deployments**: Railway Dashboard → Service → Deployments

### Key Endpoints

- **Prometheus Metrics**: `GET /api/metrics`
- **Data Quality Dashboard**: `/monitoring/quality`
- **System Health**: `GET /api/health`
- **Active Alerts**: `/monitoring/alerts`

### Severity Levels

| Severity | Response Time | Description |
|----------|---------------|-------------|
| 🔴 **Critical** | < 5 minutes | System outage, data corruption, security breach |
| 🟠 **Error** | < 15 minutes | Service degradation, high error rates |
| 🟡 **Warning** | < 1 hour | Performance degradation, approaching thresholds |
| 🔵 **Info** | < 4 hours | Informational, no immediate action required |

---

## Alert Response Procedures

### 1. Critical Alerts

#### 🚨 Data Quality Score < 60

**Symptoms:**
- Overall data quality score drops below 60
- Multiple data validation failures
- Signal calculation errors

**Immediate Actions:**
1. Check Railway PostgreSQL status in dashboard
2. Verify data source availability (Yahoo Finance, FRED)
3. Review recent deployment logs in Railway
4. Check for circuit breaker trips in logs

**Investigation Steps:**
```bash
# Check Railway logs
railway logs --service backend --tail 100

# Query PostgreSQL for validation errors
SELECT * FROM validation_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

# Check data provenance
SELECT source, COUNT(*), AVG(quality_score)
FROM data_provenance
WHERE fetched_at > NOW() - INTERVAL '1 hour'
GROUP BY source;
```

**Resolution:**
- If data source outage: Enable circuit breaker, use fallback sources
- If validation rule issue: Temporarily disable failing validation, create hotfix
- If database issue: Check Railway PostgreSQL metrics, consider scaling

**Follow-up:**
- Document root cause in incident report
- Update validation rules if needed
- Schedule post-mortem if recurring

---

#### 🚨 Railway PostgreSQL Connection Failures

**Symptoms:**
- Database connection errors in logs
- 503 Service Unavailable responses
- High connection pool saturation

**Immediate Actions:**
1. Check Railway PostgreSQL dashboard for:
   - CPU usage
   - Memory usage
   - Connection count
   - Disk I/O

2. Review recent queries in Railway query insights

**Investigation Steps:**
```bash
# Check Railway PostgreSQL status
railway status

# Check connection pool from application logs
grep "connection pool" railway.log | tail -20

# Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Resolution:**
- Scale PostgreSQL instance in Railway if resource exhaustion
- Kill long-running queries if blocking
- Review and optimize slow queries
- Increase connection pool size if needed

---

### 2. Error Alerts

#### 🟠 API Error Rate > 5%

**Symptoms:**
- High 4xx/5xx response rates
- Client-side error reports
- Increased latency

**Investigation Steps:**
1. Check `/api/metrics` endpoint for error breakdown
2. Review Railway service logs for stack traces
3. Check recent deployments in Railway dashboard
4. Verify external API health (data sources)

**Common Causes:**
- Bad deployment → Rollback in Railway
- Validation errors → Review input validation logic
- External API failures → Check circuit breakers
- Database issues → Check Railway PostgreSQL metrics

**Resolution:**
```bash
# Rollback deployment in Railway
railway rollback

# Check circuit breaker status
curl https://your-app.railway.app/api/health

# Review error patterns
grep "ERROR" railway.log | sort | uniq -c | sort -nr
```

---

#### 🟠 Data Source Availability < 95%

**Symptoms:**
- Frequent data source timeouts
- Incomplete signal calculations
- Stale data warnings

**Investigation Steps:**
1. Check external API status pages:
   - Yahoo Finance: https://finance.yahoo.com
   - FRED: https://fred.stlouisfed.org/docs/api/
   - Tiingo: https://api.tiingo.com/docs/general/status

2. Review circuit breaker logs
3. Check rate limiting counters
4. Verify API keys are valid

**Resolution:**
- Enable fallback data sources
- Implement exponential backoff
- Contact API provider if prolonged outage
- Update circuit breaker thresholds if needed

---

### 3. Warning Alerts

#### 🟡 Cache Hit Rate < 70%

**Symptoms:**
- Increased database queries
- Slower response times
- Higher Railway PostgreSQL load

**Investigation Steps:**
```bash
# Check Redis metrics in Railway dashboard
railway redis metrics

# Review cache key patterns
redis-cli --scan --pattern "*" | head -20

# Check TTL distribution
redis-cli TTL "key:pattern:*"
```

**Resolution:**
- Review cache eviction policy
- Increase Redis memory in Railway if needed
- Optimize cache key structure
- Adjust TTL values for frequently accessed data

---

#### 🟡 P95 Response Time > 2 seconds

**Symptoms:**
- Slow page loads
- User complaints
- Increased timeout errors

**Investigation Steps:**
1. Check Railway service metrics:
   - CPU usage
   - Memory usage
   - Request queue depth

2. Review slow query logs in PostgreSQL
3. Check external API latencies
4. Analyze performance traces

**Resolution:**
```bash
# Scale Railway service
railway scale --replicas 3

# Identify slow endpoints
grep "duration" railway.log | awk '{print $4}' | sort -n | tail -20

# Check database query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Common Issues & Solutions

### Issue: Missing Metrics in Grafana

**Symptoms:**
- Grafana dashboards show no data
- Prometheus not scraping metrics

**Solution:**
1. Verify `/api/metrics` endpoint is accessible
2. Check Prometheus configuration:
   ```yaml
   scrape_configs:
     - job_name: 'gayed-signals'
       static_configs:
         - targets: ['your-app.railway.app']
   ```
3. Verify metrics format is valid Prometheus exposition format
4. Check firewall rules allow Prometheus scraping

---

### Issue: Alert Fatigue (Too Many Alerts)

**Symptoms:**
- Constant alert notifications
- Important alerts missed
- Alert suppression increasing

**Solution:**
1. Review alert thresholds - may be too sensitive
2. Implement alert aggregation/grouping
3. Increase alert throttle periods
4. Add alert dependencies (don't alert on downstream if upstream failing)
5. Disable non-actionable alerts

---

### Issue: Data Lineage Gaps

**Symptoms:**
- Incomplete provenance tracking
- Missing transformation steps
- Unable to trace signal origins

**Solution:**
1. Check DataLineageTracker is properly initialized
2. Verify all transformations call `recordTransformation()`
3. Check for exceptions during lineage tracking
4. Review PostgreSQL `data_provenance` table for gaps

```sql
-- Find signals without complete lineage
SELECT signal_id, COUNT(*) as transformation_count
FROM data_lineage
WHERE destination_timestamp IS NULL
GROUP BY signal_id;
```

---

## Monitoring Tools

### Railway Platform

**Dashboard Features:**
- Real-time service metrics
- Deployment history
- Environment variables management
- Log aggregation
- PostgreSQL/Redis metrics
- Resource usage monitoring

**CLI Commands:**
```bash
# View logs
railway logs --tail 100

# Check service status
railway status

# View metrics
railway metrics

# Scale service
railway scale --replicas 2
```

---

### Prometheus Queries

```promql
# Request rate
rate(api_requests_total[5m])

# Error rate
rate(api_errors_total[5m]) / rate(api_requests_total[5m])

# P95 latency
histogram_quantile(0.95, api_request_duration_seconds)

# Data quality trend
avg_over_time(data_quality_overall_score[1h])

# Source availability
source_availability_percent{source="yahoo-finance"}
```

---

### PostgreSQL Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('gayed_signals'));

-- Recent validation errors
SELECT * FROM validation_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## Escalation Procedures

### Level 1: On-Call Engineer
- **Response Time**: 5 minutes
- **Handles**: All alerts, initial triage
- **Escalates**: If unable to resolve in 30 minutes

### Level 2: Senior Engineer
- **Response Time**: 15 minutes
- **Handles**: Complex issues, database problems
- **Escalates**: If system-wide outage or security incident

### Level 3: Engineering Manager
- **Response Time**: 30 minutes
- **Handles**: Critical business impact, vendor coordination
- **Escalates**: To CTO for major incidents

### Level 4: CTO/Leadership
- **Response Time**: 1 hour
- **Handles**: Executive decisions, external communication

---

## Contact Information

### On-Call Rotation
- **Primary**: Check PagerDuty schedule
- **Backup**: Check PagerDuty schedule
- **Manager**: [Email/Phone]

### External Vendors
- **Railway Support**: support@railway.app
- **Yahoo Finance**: https://help.yahoo.com
- **FRED**: https://fred.stlouisfed.org/docs/api/api_key.html

### Internal Resources
- **Slack Channel**: #platform-alerts
- **Incident Log**: [Link to incident tracker]
- **Documentation**: https://docs.internal/monitoring

---

## Appendix

### Metrics Reference

| Metric | Type | Description | Normal Range |
|--------|------|-------------|--------------|
| `data_quality_overall_score` | Gauge | Overall data quality (0-100) | 80-100 |
| `api_request_duration_seconds` | Histogram | API latency | P95 < 2s |
| `source_availability_percent` | Gauge | Data source uptime | > 95% |
| `cache_hit_rate` | Gauge | Cache efficiency (0-1) | 0.7-0.9 |
| `nodejs_heap_used_bytes` | Gauge | Node.js memory | < 80% of heap |

### Alert Thresholds

| Alert | Metric | Threshold | Severity |
|-------|--------|-----------|----------|
| Data Quality Critical | `data_quality_overall_score` | < 60 | Critical |
| High Error Rate | `api_error_rate` | > 0.05 | Error |
| Slow Response | `api_p95_duration` | > 2000ms | Warning |
| Low Cache Hit Rate | `cache_hit_rate` | < 0.7 | Warning |

---

**Version History:**
- v1.0 (2025-10-31): Initial runbook creation
