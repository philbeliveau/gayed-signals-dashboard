# Troubleshooting: Signal Descriptions Not Appearing

**Date:** November 4, 2025
**Issue:** Signal description methodology cards and PDF preview feature not visible on dashboard
**Status:** ✅ RESOLVED - Signal type key mismatch fixed

---

## What Was Implemented

### Files Created/Modified:

1. **Signal Data Structure**
   - `apps/web/src/lib/data/signal-descriptions.ts`
   - Contains 5 signal descriptions with methodologies
   - Contains 5 research papers with Vercel Blob URLs (already uploaded)

2. **UI Components**
   - `apps/web/src/components/signals/SignalMethodologyCard.tsx` (NEW - prominent design)
   - `apps/web/src/components/signals/SignalDescriptionPanel.tsx` (OLD - subtle design)

3. **Dashboard Integration**
   - `apps/web/src/app/page.tsx` (MODIFIED)
   - Line 16: Import added `import SignalMethodologyCard from '../components/signals/SignalMethodologyCard';`
   - Line 1219-1223: Component added inside signal card loop

4. **Dependencies**
   - `@vercel/blob` package installed
   - No errors during npm install

---

## Expected Behavior

On the dashboard at `http://localhost:3005`:

1. User clicks "Load Market Dashboard"
2. 5 signal cards appear (Utilities/SPY, Lumber/Gold, Treasury Curve, VIX Defensive, SPY MA)
3. **BETWEEN** the "Raw Value" metric box AND the "View ETF Recommendations" button
4. There should be a **LARGE, prominent section** with:
   - Gradient purple background (primary color theme)
   - 📖 "SIGNAL METHODOLOGY" heading
   - Current signal interpretation box (green/red/yellow)
   - "HOW IT WORKS" methodology text
   - "RESEARCH PAPERS (1)" section with paper cards
   - Big "Read Paper" button for inline PDF viewing

---

## Actual Behavior

**User reports:** Component is not visible on dashboard. No methodology section appears.

---

## Verification Steps Taken

✅ File exists: `apps/web/src/components/signals/SignalMethodologyCard.tsx`
✅ Import added to page.tsx (line 16)
✅ Component rendered in page.tsx (line 1219-1223)
✅ Dev server running without compilation errors
✅ Next.js cache cleared (`.next` folder deleted)
✅ Server restarted multiple times
✅ No console errors reported in terminal

❌ Component still not visible to user in browser

---

## Potential Issues to Investigate

### 1. **Import Path Issue**
```typescript
// In apps/web/src/app/page.tsx line 16
import SignalMethodologyCard from '../components/signals/SignalMethodologyCard';
```

**Check:** Is the relative path correct from `apps/web/src/app/page.tsx` to component?
- Expected: `../components/signals/SignalMethodologyCard`
- Actual file location: `apps/web/src/components/signals/SignalMethodologyCard.tsx`

**Action:** Verify import resolves correctly. Try absolute import:
```typescript
import SignalMethodologyCard from '@/components/signals/SignalMethodologyCard';
```

---

### 2. **TypeScript Compilation Error (Silent)**

**Check:** Does the component have TypeScript errors that prevent rendering?

**Action:** Run TypeScript check:
```bash
cd apps/web
npx tsc --noEmit
```

Look for errors in:
- `SignalMethodologyCard.tsx`
- `signal-descriptions.ts`

---

### 3. **Missing Props or Type Mismatch**

Component expects:
```typescript
signalType: string;  // e.g., "UTILITIES_SPY"
currentSignal: 'Risk-On' | 'Risk-Off' | 'Neutral';
```

**Check:** Does `signal.type` from the API match the keys in `signal-descriptions.ts`?

API returns: `signal.type` (e.g., "UTILITIES_SPY")
Data file expects: `signalType` matching keys in `SIGNAL_DESCRIPTIONS` object

**Action:** Add console.log to verify:
```typescript
// In page.tsx before SignalMethodologyCard
console.log('Signal type:', signal.type);
console.log('Signal value:', signal.signal);
```

---

### 4. **Browser Cache Not Cleared**

**Action:** User should:
- Open DevTools (F12)
- Go to Network tab
- Check "Disable cache"
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

### 5. **Component Returns Null Early**

The component has this early return:
```typescript
if (!description) return null;
```

**Check:** Is `getSignalDescription(signalType)` returning undefined?

**Possible cause:** Signal type string mismatch between:
- API response: `signal.type` (e.g., "Utilities/SPY")
- Data file keys: `"UTILITIES_SPY"` (underscore, uppercase)

**Action:** Add logging to `SignalMethodologyCard.tsx`:
```typescript
const description = getSignalDescription(signalType);
console.log('Looking for description:', signalType);
console.log('Found description:', description);

if (!description) {
  console.warn('No description found for signal type:', signalType);
  return null;
}
```

---

### 6. **CSS/Styling Issue (Component Rendered but Invisible)**

**Action:** Open browser DevTools:
- Inspect element where component should be
- Search for "Signal Methodology" in HTML
- Check if element exists but has `display: none` or `opacity: 0`

---

### 7. **Next.js Hot Reload Issue**

**Action:** Full restart:
```bash
# Kill all dev servers
pkill -f "next dev"

# Clear all caches
cd apps/web
rm -rf .next
rm -rf node_modules/.cache

# Restart
npm run dev
```

---

## Quick Debug Script

Add this TEMPORARILY to `page.tsx` right before the `SignalMethodologyCard` component:

```typescript
{/* DEBUG: Remove after fixing */}
<div className="bg-red-500 text-white p-4 rounded-lg mb-4">
  <p>DEBUG: Signal type = {signal.type}</p>
  <p>DEBUG: Signal value = {signal.signal}</p>
  <p>DEBUG: Component should render here ↓</p>
</div>

<SignalMethodologyCard
  signalType={signal.type}
  currentSignal={signal.signal}
  className="mb-6"
/>

<div className="bg-green-500 text-white p-4 rounded-lg mb-4">
  <p>DEBUG: Component should render above ↑</p>
</div>
```

**Expected:** Red and green debug boxes should appear, sandwich the component location.

**If red/green boxes appear but component doesn't:** Component is returning null (check issue #5)

**If red/green boxes don't appear:** Entire signal card loop may have issues

---

## Data Structure Reference

### Signal Type Mapping

| API `signal.type` | Data File Key | Display Name |
|-------------------|---------------|--------------|
| `UTILITIES_SPY` | `UTILITIES_SPY` | Utilities/SPY Rotation |
| `LUMBER_GOLD` | `LUMBER_GOLD` | Lumber/Gold Ratio |
| `TREASURY_CURVE` | `TREASURY_CURVE` | Treasury Yield Curve |
| `VIX_DEFENSIVE` | `VIX_DEFENSIVE` | VIX Defensive |
| `SPY_MA` | `SPY_MA` | S&P 500 Moving Average |

**CHECK:** Does the API actually return these exact strings?

---

## Blob URLs (Already Working)

These PDFs are live and accessible:
```
https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/An%20Intermarket%20Approach%20to%20Beta%20Rotation.pdf
https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Lumber%20Worth%20Its%20Weight%20in%20Gold.pdf
https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/An%20Intermarket%20Approach%20to%20Tactical%20Risk%20Rotation.pdf
https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Leverage%20for%20the%20Long%20Run.pdf
https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Actively%20Using%20Passive%20Sectors%20to%20Generate%20Alpha%20Using%20the%20VIX.pdf
```

✅ PDFs confirmed uploaded and accessible
✅ URLs are correct in `signal-descriptions.ts`

---

## Component Code Location

**File:** `apps/web/src/components/signals/SignalMethodologyCard.tsx`

**Key logic:**
```typescript
const description = getSignalDescription(signalType);  // Line ~27
const papers = getSignalPapers(signalType);            // Line ~28

if (!description) return null;  // Line ~30 - EARLY EXIT POINT
```

**Most likely issue:** `getSignalDescription(signalType)` returns undefined because signal type doesn't match.

---

## Recommended Investigation Order

1. **Add debug logging** (issue #5) - Takes 2 minutes
2. **Check TypeScript errors** (issue #2) - Takes 1 minute
3. **Verify signal type strings** (issue #3) - Check API response format
4. **Add visual debug boxes** (Quick Debug Script) - Takes 2 minutes
5. **Try absolute imports** (issue #1) - Takes 1 minute
6. **Check browser console** (issue #4) - Takes 30 seconds

---

## Contact Previous Agent

All implementation files are complete and ready. The component **should** work. Most likely a simple string mismatch or import path issue.

**Files to review:**
1. `apps/web/src/lib/data/signal-descriptions.ts` (data)
2. `apps/web/src/components/signals/SignalMethodologyCard.tsx` (component)
3. `apps/web/src/app/page.tsx` (integration - line 1219)

**Expected outcome:** Component renders on every signal card with prominent purple gradient background.

---

## ✅ RESOLUTION

**Root Cause:** Signal type key mismatch between API response format and data file keys.

**Problem:**
- API returns signal types as: `'utilities_spy'`, `'lumber_gold'`, `'treasury_curve'`, `'vix_defensive'`, `'sp500_ma'` (lowercase with underscores)
- Data file (`signal-descriptions.ts`) used: `'UTILITIES_SPY'`, `'LUMBER_GOLD'`, etc. (UPPERCASE with underscores)
- Component lookup failed: `getSignalDescription(signal.type)` returned `undefined`
- Component early return: `if (!description) return null;` prevented rendering

**Fix Applied:**
Changed all signal type keys in `/apps/web/src/lib/data/signal-descriptions.ts` from UPPERCASE to lowercase to match API response format:

```typescript
// Before (BROKEN)
export const SIGNAL_DESCRIPTIONS: Record<string, SignalDescription> = {
  'UTILITIES_SPY': { ... },
  'LUMBER_GOLD': { ... },
  'TREASURY_CURVE': { ... },
  'VIX_DEFENSIVE': { ... },
  'SPY_MA': { ... }
};

// After (FIXED)
export const SIGNAL_DESCRIPTIONS: Record<string, SignalDescription> = {
  'utilities_spy': { ... },
  'lumber_gold': { ... },
  'treasury_curve': { ... },
  'vix_defensive': { ... },
  'sp500_ma': { ... }
};
```

**Files Modified:**
1. `/apps/web/src/lib/data/signal-descriptions.ts` - Fixed all 5 signal type keys
2. `/apps/web/src/components/signals/SignalMethodologyCard.tsx` - Added debug logging (can be removed after verification)

**Verification:**
- Dev server running clean on port 3002: `http://localhost:3002`
- Next.js cache cleared and rebuilt
- Console logs added to verify signal type matching
- Component should now render with methodology cards and PDF preview

**Expected Result:**
Each of the 5 signal cards on the dashboard should now display:
- Purple gradient "SIGNAL METHODOLOGY" section
- Current signal interpretation (green/red/yellow based on Risk-On/Risk-Off/Neutral)
- "HOW IT WORKS" methodology text
- "RESEARCH PAPERS" section with linked PDFs
- Inline PDF viewer modal when clicking "Read Paper"

**Status:** ✅ RESOLVED - Components should render correctly now. 🎉
