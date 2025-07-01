Solve these issue, use MCP to help you: 

1. ✓ Compiled /api/video-insights/[...path] in 450ms (448 modules)
🔄 Proxying POST request to FastAPI: http://localhost:8002/api/v1/videos/process
🔄 Proxying DELETE request to FastAPI: http://localhost:8002/api/v1/videos/2185f428-fa92-4a74-83cc-6ab531a36b65
 DELETE /api/video-insights/videos/2185f428-fa92-4a74-83cc-6ab531a36b65 200 in 75ms
🔄 Proxying DELETE request to FastAPI: http://localhost:8002/api/v1/videos/690818f6-b84e-45bf-b6c7-d3c20eb42e21
 DELETE /api/video-insights/videos/690818f6-b84e-45bf-b6c7-d3c20eb42e21 200 in 43ms
🔄 Proxying DELETE request to FastAPI: http://localhost:8002/api/v1/videos/d4ae047e-f112-4029-abd9-743be86d2fd8
 DELETE /api/video-insights/videos/d4ae047e-f112-4029-abd9-743be86d2fd8 200 in 122ms
❌ FastAPI proxy error: Error [AbortError]: This operation was aborted
    at async proxyToFastAPI (src/app/api/video-insights/[...path]/route.ts:154:21)
  152 |
  153 |     // Make request to FastAPI
> 154 |     const response = await fetch(targetUrl, requestOptions);
      |                     ^
  155 |     clearTimeout(timeoutId);
  156 |
  157 |     // Handle different response types {
  code: 20,
  INDEX_SIZE_ERR: 1,
  DOMSTRING_SIZE_ERR: 2,
  HIERARCHY_REQUEST_ERR: 3,
  WRONG_DOCUMENT_ERR: 4,
  INVALID_CHARACTER_ERR: 5,
  NO_DATA_ALLOWED_ERR: 6,
  NO_MODIFICATION_ALLOWED_ERR: 7,
  NOT_FOUND_ERR: 8,
  NOT_SUPPORTED_ERR: 9,
  INUSE_ATTRIBUTE_ERR: 10,
  INVALID_STATE_ERR: 11,
  SYNTAX_ERR: 12,
  INVALID_MODIFICATION_ERR: 13,
  NAMESPACE_ERR: 14,
  INVALID_ACCESS_ERR: 15,
  VALIDATION_ERR: 16,
  TYPE_MISMATCH_ERR: 17,
  SECURITY_ERR: 18,
  NETWORK_ERR: 19,
  ABORT_ERR: 20,
  URL_MISMATCH_ERR: 21,
  QUOTA_EXCEEDED_ERR: 22,
  TIMEOUT_ERR: 23,
  INVALID_NODE_TYPE_ERR: 24,
  DATA_CLONE_ERR: 25
}
 POST /api/video-insights/videos/process 408 in 60699ms
 ✓ Compiled / in 469ms (501 modules)
 GET / 200 in 638ms
 ○ Compiling /api/signals ...
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for Compilation/assets|chunkapp/api/signals/route from pack: Error: incorrect header check
 ✓ Compiled /api/signals in 558ms (1037 modules)
🔄 Fetching fast market data for Gayed signals...
📊 Fetching data for symbols: SPY, XLU
ℹ️ Enhanced Market Client: Fetching data for 2 symbols [{"operation":"bulk_fetch_start","symbolCount":2,"symbols":"SPY,XLU"}]
ℹ️ Fetching SPY from Tiingo [{"symbol":"SPY","dataSource":"tiingo","operation":"fetch_start"}]
(node:40353) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
ℹ️ Fetching XLU from Tiingo [{"symbol":"XLU","dataSource":"tiingo","operation":"fetch_start"}]
ℹ️ Data fetch successful for SPY [{"symbol":"SPY","dataSource":"tiingo","operation":"data_fetch","duration":292,"dataPoints":500}]
ℹ️ Data validation passed for SPY [{"symbol":"SPY","operation":"data_validation","isValid":true,"warningCount":0}]
ℹ️ Data fetch successful for XLU [{"symbol":"XLU","dataSource":"tiingo","operation":"data_fetch","duration":281,"dataPoints":500}]
ℹ️ Data validation passed for XLU [{"symbol":"XLU","operation":"data_validation","isValid":true,"warningCount":0}]
ℹ️ Enhanced Market Client Summary [{"operation":"bulk_fetch_complete","totalSymbols":2,"successfulSymbols":2,"failedSymbols":0,"cacheHits":0,"cacheMisses":2,"failoverEvents":0,"successfulSymbolsList":["SPY","XLU"],"failedSymbolsList":[]}]
ℹ️ Data source statistics: tiingo [{"operation":"source_statistics","dataSource":"tiingo","totalRequests":2,"successfulRequests":2,"failedRequests":0,"rateLimitHits":0,"successRate":100,"lastRequestTime":"2025-07-01T20:36:49.114Z"}]
🧮 Calculating Gayed signals...
✅ Successfully calculated 2 signals with Risk-On consensus (80.0% confidence)
 GET /api/signals?fast=true 200 in 1646ms
🚀 Returning cached signals (fast mode)
 GET /api/signals?fast=true 200 in 3ms
🚀 Returning cached signals (fast mode)
 GET /api/signals?fast=true 200 in 3ms
 ○ Compiling /housing ...


2. Labor market graph: Nothing appear. It seems no data are able to be fecth. It receives nothing. 

👥 Fetching labor market data (12m)...
📊 Fetching data for labor indicators: ICSA, CCSA
🔄 Calling Python FRED service for labor market data...
✅ Successfully received labor market data from FRED service
⚠️ processLaborData received empty or invalid data, using defaults
✅ Successfully processed labor data with 0 alerts
 GET /api/labor?fast=true 200 in 2322ms
👥 Returning cached labor data (12m)
 GET /api/labor?fast=true 200 in 6ms
 GET /labor 200 in 295ms
 ✓ Compiled /favicon.ico in 290ms (1278 modules)