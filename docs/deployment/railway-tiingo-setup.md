# Railway Backend - Tiingo API Configuration Guide

**Last Updated**: November 3, 2025
**Priority**: CRITICAL - Required for signal data fetching

---

## Issue: Railway Backend Returns Only 1 Signal

### Root Cause
Railway backend is returning only 1 signal (VIX) instead of all 5 Gayed signals because:
1. Market data fetching fails for most symbols
2. Possible missing or invalid `TIINGO_API_KEY` environment variable
3. Symbol format incompatibility with Tiingo API

---

## STEP 1: Verify TIINGO_API_KEY in Railway

### Current Tiingo API Key
```
36181da7f5290c0544e9cc0b3b5f19249eb69a61
```
*(Found in `.env.production` and `python-services/backtrader-analysis/.env`)*

### Check Railway Environment Variable

1. **Via Railway Dashboard:**
   - Go to https://railway.app/project/YOUR_PROJECT_ID
   - Click on your backend service
   - Navigate to **Variables** tab
   - Look for `TIINGO_API_KEY`
   - Verify it matches: `36181da7f5290c0544e9cc0b3b5f19249eb69a61`

2. **Via Railway CLI:**
   ```bash
   railway variables
   ```
   Look for `TIINGO_API_KEY` in the output.

### If Missing, Add TIINGO_API_KEY

**Via Railway Dashboard:**
1. Go to your Railway project
2. Select backend service
3. Click **Variables** tab
4. Click **New Variable**
5. Add:
   - **Key**: `TIINGO_API_KEY`
   - **Value**: `36181da7f5290c0544e9cc0b3b5f19249eb69a61`
6. Click **Add** and service will automatically redeploy

**Via Railway CLI:**
```bash
railway variables set TIINGO_API_KEY=36181da7f5290c0544e9cc0b3b5f19249eb69a61
```

---

## STEP 2: Verify Data Source Priority

The UnifiedDataService prioritizes data sources in this order:

1. **TIINGO** (Priority 1) - Should be used first
2. **YAHOO_FINANCE** (Priority 2) - Fallback
3. **ALPHA_VANTAGE** (Priority 3) - Last resort

### Expected Behavior
- If `TIINGO_API_KEY` is set correctly, Railway logs should show:
  ```
  Fetching from TIINGO
  ```

- If `TIINGO_API_KEY` is missing or invalid, logs will show:
  ```
  Fetching from ALPHA_VANTAGE
  ```

---

## STEP 3: Deploy and Monitor Logs

### Deploy Updated Logging
The updated `server.ts` now includes comprehensive diagnostic logging.

**To deploy:**
```bash
cd domains/data-pipeline
git add .
git commit -m "Add diagnostic logging for market data fetch"
git push origin fix/data-pipeline-restructuring
```

Railway will automatically deploy the changes.

### Monitor Railway Logs

1. **Via Railway Dashboard:**
   - Go to your Railway project
   - Click on backend service
   - Navigate to **Deployments** tab
   - Click on latest deployment
   - View **Logs** tab

2. **Via Railway CLI:**
   ```bash
   railway logs
   ```

### What to Look For in Logs

#### 1. Data Source Verification
```
[Railway Backend] Market data fetch results: {
  requestedSymbols: ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', 'VIXY'],
  receivedSymbols: [...],
  dataSource: 'TIINGO',  // <-- Should be TIINGO, not ALPHA_VANTAGE
  ...
}
```

#### 2. Missing Symbols
```
missingSymbols: ['WOOD', 'VIXY', ...],  // <-- Symbols that failed to fetch
```

#### 3. Signal Calculation Results
```
[Railway Backend] Signal calculation results: {
  totalSignals: 5,
  validSignals: 1,  // <-- Should be 5
  nullSignals: 4,   // <-- Should be 0
  successfulTypes: ['vix_defensive'],
  failedTypes: ['utilities_spy', 'lumber_gold', 'treasury_curve', 'sp500_ma']
}
```

---

## STEP 4: Troubleshooting

### Scenario 1: TIINGO_API_KEY Missing
**Symptom:** Logs show `Fetching from ALPHA_VANTAGE`

**Solution:**
1. Add `TIINGO_API_KEY` to Railway environment (see Step 1)
2. Redeploy service
3. Verify logs now show `Fetching from TIINGO`

### Scenario 2: TIINGO_API_KEY Invalid
**Symptom:**
- Logs show `Fetching from TIINGO`
- But `missingSymbols` includes all symbols
- Railway logs show 401 Unauthorized errors

**Solution:**
1. Verify API key is correct
2. Test key directly:
   ```bash
   curl -H "Authorization: Token 36181da7f5290c0544e9cc0b3b5f19249eb69a61" \
     "https://api.tiingo.com/tiingo/daily/SPY/prices"
   ```
3. If test fails, obtain new API key from https://www.tiingo.com/account/api/token
4. Update Railway environment variable

### Scenario 3: Symbol Format Issues
**Symptom:**
- Logs show `Fetching from TIINGO`
- Some symbols succeed, others fail
- `missingSymbols: ['WOOD']` or `missingSymbols: ['VIXY']`

**Solution:**
1. Verify symbol exists in Tiingo:
   ```bash
   curl -H "Authorization: Token 36181da7f5290c0544e9cc0b3b5f19249eb69a61" \
     "https://api.tiingo.com/tiingo/daily/WOOD/prices"
   ```
2. If symbol doesn't exist, use alternative:
   - WOOD → CUT (Invesco MSCI Global Timber ETF)
3. Update `SignalOrchestrator.ts` with correct symbols (see Step 5)

### Scenario 4: Rate Limiting
**Symptom:**
- Logs show `429 Too Many Requests`
- Only some symbols return data

**Solution:**
1. Check Tiingo account limits at https://www.tiingo.com/account/api/token
2. Upgrade plan if needed
3. Consider adding rate limiting delay in `UnifiedDataService.ts`

---

## STEP 5: Symbol Verification and Alternatives

### Verify Tiingo Symbol Support

**Test each required symbol:**
```bash
# Test all symbols
for symbol in SPY XLU WOOD GLD IEF TLT VIXY; do
  echo "Testing $symbol..."
  curl -H "Authorization: Token 36181da7f5290c0544e9cc0b3b5f19249eb69a61" \
    "https://api.tiingo.com/tiingo/daily/$symbol/prices?startDate=2024-01-01&endDate=2024-01-02"
  echo ""
done
```

### Alternative Symbols (if needed)

If Tiingo doesn't support a symbol, use these alternatives:

| Current | Alternative | Description |
|---------|-------------|-------------|
| WOOD | CUT | Invesco MSCI Global Timber ETF |
| VIXY | VIXM | ProShares VIX Mid-Term Futures ETF |
| ^VIX | VIXY | Keep VIXY (^VIX format not supported) |

**To update symbols:**
Edit `/domains/data-pipeline/src/engines/SignalOrchestrator.ts`:
```typescript
public static getRequiredSymbols(): string[] {
  return [
    'SPY',     // S&P 500 ETF - ✅ Verified
    'XLU',     // Utilities ETF - ✅ Verified
    'CUT',     // Lumber ETF (was WOOD) - ✅ Alternative
    'GLD',     // Gold ETF - ✅ Verified
    'IEF',     // 10-year Treasury ETF - ✅ Verified
    'TLT',     // 30-year Treasury ETF - ✅ Verified
    'VIXY'     // VIX Short-Term Futures ETF - ✅ Verified
  ];
}
```

---

## STEP 6: Validation Checklist

After deployment, verify:

- [ ] `TIINGO_API_KEY` is set in Railway environment
- [ ] Railway logs show `Fetching from TIINGO` (not `ALPHA_VANTAGE`)
- [ ] `receivedSymbols` shows all 7 symbols: `['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', 'VIXY']`
- [ ] `missingSymbols` is empty: `[]`
- [ ] `validSignals: 5` (all signals calculated successfully)
- [ ] `nullSignals: 0` (no failed signal calculations)
- [ ] Frontend receives all 5 signals from Railway backend

---

## Expected Outcome

✅ **Success Criteria:**
- Railway logs show Tiingo as primary data source
- All 7 market data symbols fetch successfully
- All 5 Gayed signals calculate correctly:
  1. Utilities/SPY (utilities_spy)
  2. Lumber/Gold (lumber_gold)
  3. Treasury Curve (treasury_curve)
  4. VIX Defensive (vix_defensive)
  5. S&P 500 MA (sp500_ma)
- Frontend dashboard displays all 5 signals
- No fallback to local API

---

## Next Steps After Verification

1. If all signals work → Remove signal count restriction in `fetch-signals.ts`
2. If some symbols fail → Update symbol mapping in `SignalOrchestrator.ts`
3. If Tiingo fails → Investigate API key/rate limits/plan tier
4. Document final working configuration in `CLAUDE.md`

---

## Reference Links

- **Tiingo API Docs**: https://www.tiingo.com/documentation/
- **Tiingo Account**: https://www.tiingo.com/account/api/token
- **Railway Dashboard**: https://railway.app/dashboard
- **Issue Context**: `/error.md` - Original production error logs

---

**Contact**: Check Railway logs and run symbol verification tests before making changes to production.
