# Vercel-Railway Connection Fix - Summary

## Problem
The Vercel frontend was showing 404 errors and couldn't connect to the Railway backend. When clicking to fetch signals data, the backend wasn't receiving any requests.

## Root Causes Identified

### 1. **Wrong Authentication Header**
- Railway backend expects: `X-API-Key: <key>`
- Railway client was sending: `Authorization: Bearer <key>`
- Result: 401 Unauthorized errors

### 2. **API Key Not Browser-Accessible**
- Used: `RAILWAY_API_KEY` (server-side only)
- Needed: `NEXT_PUBLIC_RAILWAY_API_KEY` (client-side accessible)
- Result: Client couldn't authenticate

### 3. **No Unified API Client**
- Frontend components called `/api/signals` directly
- Feature flag `NEXT_PUBLIC_USE_RAILWAY_BACKEND` was ignored
- Railway backend URL was configured but not used

### 4. **Data Format Mismatch**
- Railway returns: `signalStatus: 'risk_on'`, `signalName: 'utilities_spy'`
- Frontend expects: `signal: 'Risk-On'`, `name: 'Utilities/SPY Ratio'`
- Result: Type mismatches and display issues

## Solutions Implemented

### ✅ 1. Fixed Railway Client Authentication
**File:** `apps/web/src/lib/api/railway-client.ts:65`

```typescript
// BEFORE
...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),

// AFTER
...(this.apiKey && { 'X-API-Key': this.apiKey }),
```

### ✅ 2. Updated Environment Variables
**Files:**
- `apps/web/.env.local`
- `apps/web/.env.example`

```bash
# BEFORE
RAILWAY_API_KEY=gayed-signals-dev-key-2024

# AFTER
NEXT_PUBLIC_RAILWAY_API_KEY=gayed-signals-dev-key-2024
```

### ✅ 3. Created Unified Signals API Client
**File:** `apps/web/src/lib/api/signals-client.ts` (NEW)

Features:
- Automatically routes to Railway when feature flag enabled
- Falls back to local API on Railway failure
- Transforms Railway response format to frontend format
- Includes retry logic and migration metrics logging

Key functions:
- `fetchSignals()` - Main API with automatic routing
- `transformRailwaySignal()` - Converts Railway format to frontend format
- `formatSignalName()` - Maps signal IDs to display names

### ✅ 4. Updated Frontend Components
**File:** `apps/web/src/shared/components/charts/EnhancedSignalsChart.tsx:127`

```typescript
// BEFORE
const response = await fetch(`/api/signals?fast=${fast}`);
const data = await response.json();

// AFTER
const { fetchSignals: fetchSignalsAPI } = await import('../../../lib/api/signals-client');
const data = await fetchSignalsAPI({ fast });
```

## Verification

### ✅ Railway Backend Health Check
```bash
curl -H "X-API-Key: gayed-signals-dev-key-2024" \
  https://gayed-backend-production.up.railway.app/api/v2/signals

# Response: 200 OK with 5 signals
```

### ✅ Build Passes
```bash
npm run build --workspace=web
# Build completed: 44 routes, 102 kB First Load JS
```

### ✅ Authentication Headers Correct
```typescript
// Railway client now sends:
{
  'Content-Type': 'application/json',
  'X-API-Key': 'gayed-signals-dev-key-2024'
}
```

## Next Steps for Deployment

### 1. Add Environment Variables to Vercel

Go to **Vercel Dashboard → Settings → Environment Variables**

Add these variables to **Production, Preview, and Development**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_RAILWAY_BACKEND_URL` | `https://gayed-backend-production.up.railway.app` |
| `NEXT_PUBLIC_USE_RAILWAY_BACKEND` | `true` |
| `NEXT_PUBLIC_RAILWAY_API_KEY` | `gayed-signals-dev-key-2024` |

### 2. Redeploy Vercel

After adding environment variables:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

### 3. Verify Connection

After deployment, check browser console for:

```
[Signal Fetch] Using Railway backend: https://gayed-backend-production.up.railway.app
[Railway Client] Request to https://gayed-backend-production.up.railway.app/api/v2/signals (attempt 1/3)
[Railway Client] Response from https://gayed-backend-production.up.railway.app/api/v2/signals (attempt 1): { success: true, cached: false, totalMs: 250 }
[Migration Metrics] {"source":"railway","success":true,"timestamp":"2025-11-01T...","endpoint":"/api/v2/signals","duration":267}
```

### 4. Check Railway Backend Logs

In Railway dashboard, verify incoming requests:
```
[API] GET /api/v2/signals - 200 OK - 250ms
[Auth] API key validated: gayed-signals-dev-key-2024
[Signals] Calculated 5 signals successfully
```

## Rollback Plan

If Railway backend has issues, disable feature flag in Vercel:

```bash
NEXT_PUBLIC_USE_RAILWAY_BACKEND=false
```

The unified signals client will automatically fall back to local `/api/signals` endpoints.

## Files Modified

1. ✅ `apps/web/src/lib/api/railway-client.ts` - Fixed auth header
2. ✅ `apps/web/src/lib/api/signals-client.ts` - Created (NEW)
3. ✅ `apps/web/src/shared/components/charts/EnhancedSignalsChart.tsx` - Uses new client
4. ✅ `apps/web/.env.local` - Updated env var name
5. ✅ `apps/web/.env.example` - Updated documentation

## Security Considerations

⚠️ **API Key Exposure**: `NEXT_PUBLIC_RAILWAY_API_KEY` is exposed in browser bundle.

**For Production:**

Option 1: **Proxy Pattern (Recommended)**
```
Frontend → Next.js API Proxy → Railway Backend
                ↑ API key added server-side
```

Option 2: **Rate Limiting on Railway**
- Implement per-IP rate limiting
- Add request throttling
- Monitor for abuse

Option 3: **JWT Authentication**
- Issue short-lived tokens server-side
- Frontend uses tokens instead of API key
- Tokens expire after 1 hour

## Testing Checklist

- [x] Railway backend returns signals successfully
- [x] Authentication header fixed (`X-API-Key`)
- [x] Environment variables renamed (`NEXT_PUBLIC_*`)
- [x] Unified signals client created
- [x] Frontend component updated to use new client
- [x] Data format transformation working
- [x] Build passes without errors
- [ ] **Deploy to Vercel with new env vars**
- [ ] **Test in production environment**
- [ ] **Verify backend logs show incoming requests**
- [ ] **Monitor for errors in Vercel logs**

## Success Metrics

When deployment is successful, you should see:

✅ No 404 errors in browser console
✅ Signals load from Railway backend
✅ Railway backend logs show authenticated requests
✅ Frontend displays 5 signals correctly
✅ Migration metrics logged in console
✅ Fallback to local API works if Railway fails

## Questions?

See `VERCEL_DEPLOYMENT_FIX.md` for detailed deployment instructions.
