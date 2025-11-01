# Vercel-Railway Connection Fix

## Issue
Vercel frontend was not connecting to Railway backend due to:
1. ❌ Wrong authentication header (`Authorization: Bearer` instead of `X-API-Key`)
2. ❌ API key not accessible in browser (wasn't `NEXT_PUBLIC_` prefixed)
3. ❌ Frontend components calling local `/api/signals` instead of Railway backend

## Fix Applied

### 1. Updated Railway Client Authentication
**File:** `apps/web/src/lib/api/railway-client.ts`
- Changed from `Authorization: Bearer ${apiKey}` to `X-API-Key: ${apiKey}`
- Updated to use `NEXT_PUBLIC_RAILWAY_API_KEY` environment variable

### 2. Created Unified Signals Client
**File:** `apps/web/src/lib/api/signals-client.ts`
- Automatically routes to Railway backend when feature flag is enabled
- Falls back to local API if Railway fails
- Includes retry logic and error handling

### 3. Updated Frontend Components
**File:** `apps/web/src/shared/components/charts/EnhancedSignalsChart.tsx`
- Now uses unified signals client instead of direct fetch
- Respects `NEXT_PUBLIC_USE_RAILWAY_BACKEND` feature flag

## Vercel Environment Variables Required

Add these to **Vercel Dashboard → Project Settings → Environment Variables**:

```bash
# Railway Backend Configuration
NEXT_PUBLIC_RAILWAY_BACKEND_URL=https://gayed-backend-production.up.railway.app
NEXT_PUBLIC_USE_RAILWAY_BACKEND=true
NEXT_PUBLIC_RAILWAY_API_KEY=gayed-signals-dev-key-2024
```

### Steps to Add in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **gayed-signals-dashboard**
3. Settings → Environment Variables
4. Add each variable:
   - **Name:** `NEXT_PUBLIC_RAILWAY_BACKEND_URL`
   - **Value:** `https://gayed-backend-production.up.railway.app`
   - **Environment:** Production, Preview, Development

5. Repeat for:
   - `NEXT_PUBLIC_USE_RAILWAY_BACKEND` = `true`
   - `NEXT_PUBLIC_RAILWAY_API_KEY` = `gayed-signals-dev-key-2024`

6. **Redeploy** the application after adding variables

## Verification

### Test Railway Backend Directly
```bash
curl -H "X-API-Key: gayed-signals-dev-key-2024" \
  https://gayed-backend-production.up.railway.app/api/v2/signals
```

Expected: JSON response with signals data

### Check Frontend Console
After deployment, open browser console and look for:
```
[Signal Fetch] Using Railway backend: https://gayed-backend-production.up.railway.app
[Railway Client] Request to https://gayed-backend-production.up.railway.app/api/v2/signals
```

### Verify Data Flow
1. Open the Gayed Signals Dashboard
2. Click to fetch signals
3. Check Network tab for requests to `gayed-backend-production.up.railway.app`
4. Backend console should show incoming requests

## Rollback Plan

If Railway backend has issues, disable the feature flag:

**Vercel Environment Variables:**
```bash
NEXT_PUBLIC_USE_RAILWAY_BACKEND=false
```

This will automatically fall back to local Next.js API routes in `/api/signals`.

## Files Changed

1. `apps/web/src/lib/api/railway-client.ts` - Fixed authentication header
2. `apps/web/src/lib/api/signals-client.ts` - Created unified client (NEW)
3. `apps/web/src/shared/components/charts/EnhancedSignalsChart.tsx` - Uses new client
4. `apps/web/.env.local` - Updated env var names
5. `apps/web/.env.example` - Updated documentation

## Next Steps

- [ ] Add `NEXT_PUBLIC_RAILWAY_API_KEY` to Vercel environment variables
- [ ] Redeploy Vercel app
- [ ] Test frontend-backend connection
- [ ] Monitor Railway backend logs for incoming requests
- [ ] Update other signal components to use unified client (if needed)

## Security Note

⚠️ **API Key Exposure**: The `NEXT_PUBLIC_RAILWAY_API_KEY` is exposed in the browser bundle. For production:

1. Consider implementing a proxy endpoint in Next.js API routes
2. Keep the API key server-side
3. Have the proxy add the API key to Railway requests
4. Frontend calls proxy instead of Railway directly

This prevents API key leakage while maintaining the same architecture.
