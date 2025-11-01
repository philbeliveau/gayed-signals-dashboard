# 🚀 Cleanup Quick Reference Card

## ⏰ When Can We Clean Up?

**NOT NOW!** Current date: 2025-11-01

**Cleanup Available:** ~2025-02-01 (3 months from now)

**Requirements:**
```
✓ Railway backend running for 30+ days
✓ Success rate > 99.5%
✓ Zero critical incidents
✓ Local fallback usage < 0.5%
✓ Team approval
```

---

## 📁 What Gets Deleted?

### Files to DELETE (5 main files):
```bash
apps/web/src/domains/trading-signals/services/signalService.ts
apps/web/src/domains/market-data/services/enhanced-market-client.ts
apps/web/src/domains/market-data/services/fred-api-client.ts
apps/web/src/domains/market-data/services/dol-api-client.ts
apps/web/src/app/api/signals/route.ts
apps/web/src/lib/feature-flags.ts
```

### Dependencies to REMOVE (after verification):
```bash
npm uninstall tiingo alpha-vantage node-fred
```

---

## 🎯 Cleanup in 3 Steps

### Step 1: Validate (1 hour)
```bash
# Check Railway metrics
import { performanceMonitor } from '@/lib/api/performance-monitor';
console.log(performanceMonitor.getStats());

# Verify:
# - railwaySuccessRate > 0.995
# - localFallbackRate < 0.005
# - No critical incidents
```

### Step 2: Delete & Replace (8 hours)
```bash
# Delete legacy files
git rm apps/web/src/domains/trading-signals/services/signalService.ts
git rm apps/web/src/domains/market-data/services/*.ts
git rm apps/web/src/app/api/signals/route.ts

# Update all imports:
# BEFORE: import { SignalService } from '@/domains/...'
# AFTER:  import { fetchSignals } from '@/lib/api/fetch-signals'
```

### Step 3: Test & Deploy (6 hours)
```bash
# Run full validation
npx tsc --noEmit
npm run lint
npm run test
npm run build

# Deploy to staging → production
```

---

## 📊 Current Status

```
TODAY: Story 4.0h Complete ✅
  ├─ Railway backend integrated
  ├─ Feature flag: disabled
  └─ Both systems coexist

WEEK 1-2: Deploy to staging
  └─ Test Railway backend

WEEK 3-8: Gradual rollout
  ├─ 10% → 25% → 50% → 100%
  └─ Monitor performance

MONTH 3: Story 4.0i Cleanup
  └─ Delete old code
```

---

## 🚨 Current State (Don't Touch!)

**What we have NOW:**
- ✅ Railway backend (NEW) - feature flag disabled
- ✅ Local API (OLD) - still active
- ✅ Both working side-by-side

**This is GOOD! It's the safe migration pattern.**

**DO NOT delete anything until Month 3!**

---

## 📞 Quick Commands

### Check if ready to cleanup:
```bash
# View performance stats
cd apps/web && node -e "
  import('./src/lib/api/performance-monitor.ts').then(m => {
    console.log(m.performanceMonitor.getStats());
  });
"

# Check Railway backend uptime
# (Manual: Check Railway dashboard)
```

### Start cleanup (when ready):
```bash
# Create cleanup branch
git checkout -b cleanup/remove-legacy-code

# Follow Story 4.0i tasks
# See: docs/stories/4.0i-cleanup-old-code.md
```

---

## 🎓 Remember

1. **Don't clean up yet** - Railway needs 30+ days validation
2. **The "mess" is intentional** - It's a safety net
3. **Cleanup is Story 4.0i** - Follow that plan
4. **Timeline: 3-4 months** - Be patient!

**Current Priority:** Monitor Railway backend, not cleanup.

---

## 📚 Full Documentation

- **Full Story:** `docs/stories/4.0i-cleanup-old-code.md`
- **Roadmap:** `docs/stories/4.0i-CLEANUP-ROADMAP.md`
- **Original Plan:** `docs/stories/4.0h-CLEANUP-PLAN.md`

**Last Updated:** 2025-11-01
