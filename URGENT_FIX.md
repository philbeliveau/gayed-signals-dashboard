# 🚨 URGENT: Fix Truncated Railway URL

## Problem
The Railway backend URL is being truncated in production:
- **Expected:** `https://gayed-backend-production.up.railway.app`
- **Actual:** `https://gayed-backend-production.u`

This causes `ERR_NAME_NOT_RESOLVED` errors.

## Root Cause
The Vercel environment variable `NEXT_PUBLIC_RAILWAY_BACKEND_URL` is either:
1. Not set correctly
2. Being truncated during deployment
3. Not deployed after being set

## Immediate Fix Required

### Step 1: Verify Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Check that these variables exist with **EXACT** values:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_RAILWAY_BACKEND_URL` | `https://gayed-backend-production.up.railway.app` | Production, Preview, Development |
| `NEXT_PUBLIC_USE_RAILWAY_BACKEND` | `true` | Production, Preview, Development |
| `NEXT_PUBLIC_RAILWAY_API_KEY` | `gayed-signals-dev-key-2024` | Production, Preview, Development |

### Step 2: Check for Truncation

If the variable shows as truncated in Vercel dashboard:
1. **Delete** the existing `NEXT_PUBLIC_RAILWAY_BACKEND_URL` variable
2. **Re-add** it with the full URL: `https://gayed-backend-production.up.railway.app`
3. Make sure to select **all three environments** (Production, Preview, Development)

### Step 3: Force Redeploy

After updating environment variables:
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **three dots (...)** menu
4. Select **Redeploy**
5. ✅ Check **"Use existing Build Cache"** is **UNCHECKED**
6. Click **Redeploy**

### Step 4: Verify After Deployment

Once redeployed, open browser console and check:

```javascript
// Should show the FULL URL
console.log(process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL)
// Expected: "https://gayed-backend-production.up.railway.app"
```

## Alternative: Use vercel CLI

If dashboard isn't working, use the CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_RAILWAY_BACKEND_URL
# Paste: https://gayed-backend-production.up.railway.app
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_USE_RAILWAY_BACKEND
# Paste: true
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_RAILWAY_API_KEY
# Paste: gayed-signals-dev-key-2024
# Select: Production, Preview, Development

# Force redeploy
vercel --prod --force
```

## Debug: Check Current Environment

Add this temporary page to verify environment variables:

**File:** `apps/web/src/app/debug-env/page.tsx`

```tsx
export default function DebugEnv() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Debug</h1>
      <table border={1} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px' }}>Variable</th>
            <th style={{ padding: '10px' }}>Value</th>
            <th style={{ padding: '10px' }}>Length</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px' }}>NEXT_PUBLIC_RAILWAY_BACKEND_URL</td>
            <td style={{ padding: '10px', wordBreak: 'break-all' }}>
              {process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL || 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL?.length || 0}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px' }}>NEXT_PUBLIC_USE_RAILWAY_BACKEND</td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND || 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND?.length || 0}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px' }}>NEXT_PUBLIC_RAILWAY_API_KEY</td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_RAILWAY_API_KEY ? '***SET***' : 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_RAILWAY_API_KEY?.length || 0}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Expected Values:</h2>
      <ul>
        <li>NEXT_PUBLIC_RAILWAY_BACKEND_URL: https://gayed-backend-production.up.railway.app (52 chars)</li>
        <li>NEXT_PUBLIC_USE_RAILWAY_BACKEND: true (4 chars)</li>
        <li>NEXT_PUBLIC_RAILWAY_API_KEY: 28 chars</li>
      </ul>
    </div>
  );
}
```

After deploying, visit: `https://your-app.vercel.app/debug-env`

## Expected URL Length
- **Full URL:** `https://gayed-backend-production.up.railway.app`
- **Character count:** 52 characters
- **What we're seeing:** `https://gayed-backend-production.u` (37 characters)
- **Missing:** `.up.railway.app` (15 characters)

## Common Vercel Issues

### Issue 1: Variable Not Applied to All Environments
**Fix:** Ensure variable is checked for Production, Preview, AND Development

### Issue 2: Old Build Cache
**Fix:** Redeploy with cache cleared (uncheck "Use existing Build Cache")

### Issue 3: Environment Variables Not Refreshed
**Fix:** Variables only apply to NEW deployments, not existing ones

### Issue 4: Typo in Variable Name
**Fix:** Must be EXACTLY `NEXT_PUBLIC_RAILWAY_BACKEND_URL` (case-sensitive)

## Verify Fix Worked

After redeploying, you should see in browser console:

```
✅ [Signal Fetch] Using Railway backend: https://gayed-backend-production.up.railway.app/api/v2/signals
✅ [Railway Client] Request to https://gayed-backend-production.up.railway.app/api/v2/signals (attempt 1/3)
✅ [Railway Client] Response from https://gayed-backend-production.up.railway.app/api/v2/signals (attempt 1): {success: true, ...}
```

**NOT:**
```
❌ GET https://gayed-backend-production.u/api/v2/signals net::ERR_NAME_NOT_RESOLVED
```

## Still Not Working?

If URL is still truncated after following all steps:

1. **Check Vercel project settings** - Ensure no build overrides
2. **Check for `.env` files** in repo that might override
3. **Try different browser/incognito** to rule out caching
4. **Contact Vercel support** - May be a platform issue

## Timeline
- **This fix should take:** 5 minutes
- **Expected result:** Railway backend connects successfully
- **Fallback active:** Local API will work even if Railway fails
