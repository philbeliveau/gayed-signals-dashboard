# Unified Data Service - Railway Deployment Guide

**Story**: 4.0a - Unified Data Service
**Status**: ✅ Implementation Complete - Ready for Deployment

## Prerequisites

- Railway account with PostgreSQL database provisioned
- Redis instance on Railway
- API keys for data sources (Tiingo, Alpha Vantage, FRED)
- Railway CLI installed (optional, for local testing)

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
cd domains/data-pipeline
npm install
```

### 2. Set Environment Variables in Railway

Configure these variables in your Railway project:

```env
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
DATABASE_PUBLIC_URL=postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:PORT/railway

# Redis (Railway Redis)
REDIS_URL=redis://default:PASSWORD@HOST:PORT

# Runtime Environment
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
PORT=${PORT}  # Railway provides this automatically

# Data Source API Keys
TIINGO_API_KEY=your_tiingo_api_key_here
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
FRED_API_KEY=your_fred_api_key_here
```

### 3. Generate Prisma Client (Local)

```bash
npm run prisma:generate
```

This creates the Prisma client in `generated/client` directory.

### 4. Deploy Database Schema

**Option A: Via Railway Dashboard**
1. Go to Railway project
2. Open database service
3. Connect with `DATABASE_PUBLIC_URL`
4. Run migration:

```bash
npm run prisma:deploy
```

**Option B: Via Railway CLI**

```bash
railway run npm run prisma:deploy
```

### 5. Build TypeScript

```bash
npm run build
```

This compiles TypeScript to `dist/` directory.

### 6. Deploy to Railway

**Option A: GitHub Integration (Recommended)**
1. Push code to GitHub repository
2. Connect Railway to your GitHub repo
3. Railway auto-deploys on push to main branch
4. Railway will run build commands from `railway.toml`

**Option B: Railway CLI**

```bash
railway up
```

### 7. Verify Deployment

#### Check Health Endpoint

```bash
curl https://your-railway-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "unified-data-service",
  "timestamp": "2025-10-31T...",
  "checks": {
    "database": true,
    "redis": true,
    "dataSources": [
      { "name": "YAHOO_FINANCE", "healthy": true, "score": 1.0 },
      { "name": "TIINGO", "healthy": true, "score": 0.9 },
      { "name": "ALPHA_VANTAGE", "healthy": true, "score": 0.8 }
    ]
  }
}
```

#### Test Market Data Endpoint

```bash
curl "https://your-railway-app.railway.app/api/v2/market-data?symbols=SPY"
```

### 8. Monitor Logs

```bash
# Via Railway CLI
railway logs

# Or via Railway Dashboard
# Go to your project → Deployments → View Logs
```

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**:
1. Verify `DATABASE_URL` uses internal Railway URL: `postgres.railway.internal`
2. Check database is running in Railway dashboard
3. Verify network connectivity within Railway

```bash
# Test database connection
railway run npm run prisma:studio
```

### Redis Connection Issues

**Error**: `Redis connection failed`

**Solution**:
1. Verify Redis instance is provisioned in Railway
2. Check `REDIS_URL` format: `redis://default:PASSWORD@HOST:PORT`
3. Test connection:

```bash
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

### Migration Failures

**Error**: `Migration failed to apply`

**Solution**:
1. Check if database is empty or has existing schema
2. Reset database if needed:

```bash
railway run npm run prisma:migrate reset
```

3. Apply migrations again:

```bash
railway run npm run prisma:deploy
```

### Build Failures

**Error**: `tsc: command not found`

**Solution**:
Ensure all dependencies are installed:

```bash
npm install
npm run build
```

### API Key Issues

**Error**: `TIINGO_API_KEY is not defined`

**Solution**:
Set all API keys in Railway environment variables. Missing keys will cause data source failures.

## Rollback Procedure

If deployment fails:

1. **Revert Code**:
```bash
git revert HEAD
git push
```

2. **Rollback Database**:
```bash
railway run npm run prisma:migrate reset
# Re-apply previous migration
```

3. **Check Previous Deployment**:
Railway keeps deployment history. Select previous deployment in dashboard.

## Performance Monitoring

### Key Metrics to Watch

1. **Response Times**
   - Health check: <100ms
   - Market data: <1000ms (with external API)
   - Cache hit: <10ms

2. **Error Rates**
   - Target: <0.1% errors
   - Monitor failover frequency
   - Track circuit breaker states

3. **Database Performance**
   - Query time: <100ms (p95)
   - Connection pool usage
   - Migration performance

### Railway Monitoring

Railway provides built-in monitoring:
- CPU usage
- Memory usage
- Network I/O
- Request count
- Error rates

Access via: Railway Dashboard → Metrics

## Scaling Considerations

### Horizontal Scaling

Railway supports auto-scaling. Configure in `railway.toml`:

```toml
[deploy]
replicas = 2
minReplicas = 1
maxReplicas = 5
```

### Database Scaling

For high load:
1. Enable connection pooling
2. Add read replicas
3. Implement database sharding (future story)

### Redis Scaling

For cache-heavy workloads:
1. Increase Redis memory allocation
2. Implement Redis clustering
3. Add cache warming strategies

## Security Best Practices

1. **API Keys**: Never commit to git, use Railway secrets
2. **Database**: Use internal URLs for Railway services
3. **CORS**: Configure allowed origins in production
4. **Rate Limiting**: Implement per-user rate limits
5. **Logging**: Remove sensitive data from logs

## Next Steps After Deployment

1. **Monitor Initial Traffic**
   - Watch error rates
   - Verify data quality scores
   - Check cache hit rates

2. **Integration with Frontend**
   - Update web app to use new `/api/v2/market-data` endpoint
   - Migrate existing signal calculations to use UnifiedDataService

3. **Related Stories**
   - Story 4.0b: Data Persistence Layer (enhance storage)
   - Story 4.0c: Validation Framework (improve quality checks)
   - Story 4.0e: API Consolidation (migrate all endpoints)

## Support

- Architecture Docs: `/docs/architecture/data-pipeline-architecture.md`
- Story Details: `/docs/stories/4.0a.unified-data-service.md`
- Railway Support: https://railway.app/help

---

**Deployment Checklist**:
- [ ] Dependencies installed
- [ ] Environment variables set in Railway
- [ ] Prisma client generated
- [ ] Database migrations deployed
- [ ] TypeScript compiled
- [ ] Code pushed to Railway
- [ ] Health endpoint verified
- [ ] Market data endpoint tested
- [ ] Logs monitored
- [ ] Performance metrics baseline established
