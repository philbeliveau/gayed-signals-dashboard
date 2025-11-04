---- Console logs

[Signal Fetch] Attempting Railway backend V2 API...
3598.08910a5db7a113a1.js:1 [Railway Client] Request to https://gayed-backend-production.up.railway.app/api/v2/signals?fast=false (attempt 1/3)
3598.08910a5db7a113a1.js:1 [Railway Client] Response from https://gayed-backend-production.up.railway.app/api/v2/signals?fast=false (attempt 1): {success: true, cached: false, totalMs: 0}
3598.08910a5db7a113a1.js:1 [Signal Fetch] Railway backend failed after 905ms: Cannot read properties of undefined (reading 'sources')
h @ 3598.08910a5db7a113a1.js:1
await in h
(anonymous) @ page-5176f23ab819a01f.js:1
await in (anonymous)
onClick @ page-5176f23ab819a01f.js:1
iX @ 87c73c54-3a1e7b0b8b132ec6.js:1
(anonymous) @ 87c73c54-3a1e7b0b8b132ec6.js:1
nS @ 87c73c54-3a1e7b0b8b132ec6.js:1
i2 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s7 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s5 @ 87c73c54-3a1e7b0b8b132ec6.js:1
3598.08910a5db7a113a1.js:1 [Signal Fetch] Falling back to local API...
h @ 3598.08910a5db7a113a1.js:1
await in h
(anonymous) @ page-5176f23ab819a01f.js:1
await in (anonymous)
onClick @ page-5176f23ab819a01f.js:1
iX @ 87c73c54-3a1e7b0b8b132ec6.js:1
(anonymous) @ 87c73c54-3a1e7b0b8b132ec6.js:1
nS @ 87c73c54-3a1e7b0b8b132ec6.js:1
i2 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s7 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s5 @ 87c73c54-3a1e7b0b8b132ec6.js:1
3598.08910a5db7a113a1.js:1 [Migration Metrics] {"source":"railway","success":false,"timestamp":"2025-11-04T00:06:06.404Z","endpoint":"/api/v2/signals","duration":905,"error":"Cannot read properties of undefined (reading 'sources')"}
3598.08910a5db7a113a1.js:1 [Signal Fetch] Using local API: /api/signals

------

3598.08910a5db7a113a1.js:1  GET https://gayed-signals-dashboard.vercel.app/api/signals 504 (Gateway Timeout)
h @ 3598.08910a5db7a113a1.js:1
await in h
(anonymous) @ page-5176f23ab819a01f.js:1
await in (anonymous)
onClick @ page-5176f23ab819a01f.js:1
iX @ 87c73c54-3a1e7b0b8b132ec6.js:1
(anonymous) @ 87c73c54-3a1e7b0b8b132ec6.js:1
nS @ 87c73c54-3a1e7b0b8b132ec6.js:1
i2 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s7 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s5 @ 87c73c54-3a1e7b0b8b132ec6.js:1
3598.08910a5db7a113a1.js:1 [Migration Metrics] {"source":"local","success":false,"timestamp":"2025-11-04T00:06:36.535Z","endpoint":"/api/signals","duration":31036,"error":"Local API error: 504"}
8315-9655f2aed4f0704e.js:1 [Signal Fetch] Both Railway and local API failed: Error: Local API error: 504
    at h (3598.08910a5db7a113a1.js:1:8693)
    at async page-5176f23ab819a01f.js:1:44812
push.35482.window.console.error @ 8315-9655f2aed4f0704e.js:1
h @ 3598.08910a5db7a113a1.js:1
await in h
(anonymous) @ page-5176f23ab819a01f.js:1
await in (anonymous)
onClick @ page-5176f23ab819a01f.js:1
iX @ 87c73c54-3a1e7b0b8b132ec6.js:1
(anonymous) @ 87c73c54-3a1e7b0b8b132ec6.js:1
nS @ 87c73c54-3a1e7b0b8b132ec6.js:1
i2 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s7 @ 87c73c54-3a1e7b0b8b132ec6.js:1
s5 @ 87c73c54-3a1e7b0b8b132ec6.js:1
8315-9655f2aed4f0704e.js:1 Failed to fetch signals: Error: Failed to fetch signals from all sources: Local API error: 504
    at h (3598.08910a5db7a113a1.js:1:9243)
    at async page-5176f23ab819a01f.js:1:44812

----- VERCEL LOGS 

Status
Host
Request
Messages
Nov 03 19:06:06.50
GET
504
gayed-signals-dashboard.vercel.app
/api/signals
4
Vercel Runtime Timeout Error: Task timed out after 30 seconds
Nov 03 19:06:04.15
GET
200
gayed-signals-dashboard.vercel.app
/interactive-charts
Nov 03 19:06:04.15
GET
200
gayed-signals-dashboard.vercel.app
/backtrader
Nov 03 19:06:03.52
GET
200
gayed-signals-dashboard.vercel.app
/
Nov 03 19:06:03.45
GET
307
gayed-signals-dashboard.vercel.app
/
Nov 03 19:05:55.19
GET
200
gayed-signals-dashboard.vercel.app
/

---- Railway logs
PostgreSQL empty - calculating signals on-demand
Fetching market data
Fetching from ALPHA_VANTAGE
Data stored with provenance
Cache updated
Request metrics
