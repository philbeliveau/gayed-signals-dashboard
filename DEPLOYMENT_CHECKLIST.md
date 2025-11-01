# Vercel Deployment Checklist - Fix Truncated URL

## Problem
Environment variables are set in Vercel dashboard, but the URL is still showing as truncated:
`https://gayed-backend-production.u` instead of `https://gayed-backend-production.up.railway.app`

## Root Cause
Environment variables in Vercel only apply to **NEW deployments**, not existing ones. Even if you set them, you MUST redeploy.

---

## ✅ DEPLOYMENT CHECKLIST

### [ ] Step 1: Verify Environment Variables

Go to: **Vercel Dashboard → [Your Project] → Settings → Environment Variables**

For each variable, click to view/edit and verify:

#### Variable 1: Railway Backend URL
- [ ] Name is **EXACTLY**: `NEXT_PUBLIC_RAILWAY_BACKEND_URL`
- [ ] Value is **EXACTLY**: `https://gayed-backend-production.up.railway.app`
- [ ] Character count: **52 characters** (not 37!)
- [ ] Environments checked: ✅ Production ✅ Preview ✅ Development

#### Variable 2: Railway Feature Flag
- [ ] Name is **EXACTLY**: `NEXT_PUBLIC_USE_RAILWAY_BACKEND`
- [ ] Value is **EXACTLY**: `true`
- [ ] Environments checked: ✅ Production ✅ Preview ✅ Development

#### Variable 3: Railway API Key
- [ ] Name is **EXACTLY**: `NEXT_PUBLIC_RAILWAY_API_KEY`
- [ ] Value is **EXACTLY**: `gayed-signals-dev-key-2024`
- [ ] Character count: **28 characters**
- [ ] Environments checked: ✅ Production ✅ Preview ✅ Development

**If ANY of these are wrong:**
1. Delete the variable
2. Re-add it with the correct value
3. Select all three environments
4. Save

---

### [ ] Step 2: Check for Variable Name Typos

Common mistakes to check for:
- ❌ `NEXT_PUBLIC_RAILWAY_BACKEND_UR` (missing L)
- ❌ `NEXT_PUBLIC_RAILWAY_BACKEND_URL ` (space at end)
- ❌ `NEXT_PUBLIC_RAILWAY_BACKENDURL` (missing underscore)
- ❌ `RAILWAY_BACKEND_URL` (missing NEXT_PUBLIC_ prefix)
- ✅ `NEXT_PUBLIC_RAILWAY_BACKEND_URL` (CORRECT)

The name must be **EXACTLY** as shown above, case-sensitive.

---

### [ ] Step 3: Force Redeploy (CRITICAL STEP)

**This is the most important step.** Environment variables only apply to NEW deployments.

1. [ ] Go to **Deployments** tab in Vercel
2. [ ] Find the **most recent deployment** (top of list)
3. [ ] Click the **three dots (...)** menu on the right
4. [ ] Click **"Redeploy"**
5. [ ] In the popup:
   - [ ] **UNCHECK** ❌ "Use existing Build Cache"
   - [ ] This ensures fresh build with new environment variables
6. [ ] Click **"Redeploy"** button
7. [ ] Wait for deployment to complete (~2-3 minutes)

**Why this matters:**
- Vercel caches builds for speed
- Cached builds use OLD environment variables
- Must clear cache to pick up NEW variables

---

### [ ] Step 4: Verify Deployment

Once the new deployment completes:

1. [ ] Go to your deployed site: `https://[your-project].vercel.app`
2. [ ] Navigate to: `/debug-env`
3. [ ] Check the table shows:
   - [ ] `NEXT_PUBLIC_RAILWAY_BACKEND_URL`: **52 characters**
   - [ ] Value shows: `https://gayed-backend-production.up.railway.app` (FULL URL)
   - [ ] Status: ✅ **Correct**

**If still showing wrong:**
- Screenshot the `/debug-env` page
- Screenshot the Vercel environment variables page
- This will help diagnose the issue

---

### [ ] Step 5: Test Signals Fetching

1. [ ] Open your app in production
2. [ ] Open browser **DevTools → Console** (F12)
3. [ ] Click to fetch signals
4. [ ] Look for these logs:

**Expected (Success):**
```
✅ [Signal Fetch] Using Railway backend: https://gayed-backend-production.up.railway.app/api/v2/signals
✅ [Railway Client] Request to https://gayed-backend-production.up.railway.app/api/v2/signals (attempt 1/3)
✅ [Railway Client] Response from ... (attempt 1): {success: true, cached: false, totalMs: 250}
```

**NOT This (Failure):**
```
❌ GET https://gayed-backend-production.u/api/v2/signals net::ERR_NAME_NOT_RESOLVED
```

---

### [ ] Step 6: Check Railway Backend Logs

If signals are loading:

1. [ ] Go to **Railway Dashboard**
2. [ ] Select your backend project
3. [ ] Check **Deployment Logs**
4. [ ] Look for incoming requests:

```
[API] GET /api/v2/signals - 200 OK - 250ms
[Auth] API key validated: gayed-signals-dev-key-2024
[Signals] Calculated 5 signals successfully
```

If you see these logs, **the connection is working!** ✅

---

## 🔄 Alternative: Use Vercel CLI

If the dashboard isn't working, use the CLI:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to your project
cd /path/to/gayed-signals-dashboard

# Pull current environment
vercel env pull

# Check current values
cat .env.local

# Set environment variables (if needed)
vercel env add NEXT_PUBLIC_RAILWAY_BACKEND_URL production
# Paste: https://gayed-backend-production.up.railway.app

vercel env add NEXT_PUBLIC_RAILWAY_BACKEND_URL preview
# Paste: https://gayed-backend-production.up.railway.app

vercel env add NEXT_PUBLIC_RAILWAY_BACKEND_URL development
# Paste: https://gayed-backend-production.up.railway.app

# Force redeploy
vercel --prod --force
```

---

## 🐛 Troubleshooting

### Issue: URL still truncated after redeploy

**Check:**
1. Did you uncheck "Use existing Build Cache"?
2. Is the variable applied to the correct environment (Production)?
3. Is there a `.env` file in the repo overriding it?
4. Clear browser cache and try again

**Solution:**
```bash
# Check for .env files that might override
cd apps/web
ls -la .env*

# Remove any .env files that might be committed (should be in .gitignore)
git status
```

### Issue: Variable shows correctly in /debug-env but still fails

**Check:**
1. Is the Railway backend actually running?
2. Test directly: `curl -H "X-API-Key: gayed-signals-dev-key-2024" https://gayed-backend-production.up.railway.app/api/v2/signals`
3. Check Railway logs for errors

### Issue: Can't find deployment in Vercel

**Solution:**
1. Make sure you're logged into the correct Vercel account
2. Check if project is in a team workspace
3. Verify project name matches

---

## ✅ Success Criteria

You'll know it's working when:

1. [ ] `/debug-env` shows full 52-character URL
2. [ ] Browser console shows successful Railway requests
3. [ ] No `ERR_NAME_NOT_RESOLVED` errors
4. [ ] Railway backend logs show incoming requests
5. [ ] Signals load and display correctly
6. [ ] No fallback to local API needed

---

## 📊 Expected Timeline

- Verify variables: **2 minutes**
- Redeploy with cache clear: **3 minutes**
- Verify deployment: **1 minute**
- Test in production: **1 minute**

**Total: ~7 minutes**

---

## 🆘 Still Not Working?

If you've completed all steps and it's still not working:

1. **Take screenshots:**
   - Vercel environment variables page
   - `/debug-env` page output
   - Browser console errors

2. **Check these files in repo:**
   - `apps/web/.env.local` (should NOT be committed)
   - `vercel.json` (check for overrides)
   - `next.config.js` (check for env overrides)

3. **Contact for help with screenshots and error messages**

---

## 📝 Notes

- Environment variables in Vercel are **deployment-time**, not runtime
- Changing them requires a new deployment
- Build cache can cause old values to persist
- Always clear cache when troubleshooting env issues
