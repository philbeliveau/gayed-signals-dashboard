1. First issue related to video:
TypeError: Cannot read properties of undefined (reading 'forEach')
    at buildFolderTree (webpack-internal:///(app-pages-browser)/./src/components/video-insights/FolderSidebar.tsx:42:17)
    at FolderSidebar (webpack-internal:///(app-pages-browser)/./src/components/video-insights/FolderSidebar.tsx:59:24)
    at VideoInsightsPage (webpack-internal:///(app-pages-browser)/./src/app/video-insights/page.tsx:442:110)
    at ClientPageRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/client-page.js:20:50)

2. Housing data: 
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for Compilation/codeGeneration|javascript/auto|/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-client-module-loader.js!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-swc-loader.js??ruleSet[1].rules[16].oneOf[6].use[1]!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/recharts/es6/chart/LineChart.js|app-pages-browser|webpack from pack: Error: incorrect header check
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for Compilation/codeGeneration|javascript/auto|/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-client-module-loader.js!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-swc-loader.js??ruleSet[1].rules[16].oneOf[6].use[1]!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/recharts/es6/chart/ComposedChart.js|app-pages-browser|webpack from pack: Error: incorrect header check
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for Compilation/codeGeneration|javascript/auto|/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-client-module-loader.js!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/next/dist/build/webpack/loaders/next-swc-loader.js??ruleSet[1].rules[16].oneOf[6].use[1]!/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/node_modules/recharts/es6/util/ScatterUtils.js|app-pages-browser|webpack from pack: Error: incorrect header check
 ✓ Compiled /housing in 1145ms (2246 modules)
 GET /housing 200 in 1241ms
<w> [webpack.cache.PackFileCacheStrategy] Restoring failed for Compilation/assets|chunkapp/api/housing/route from pack: Error: incorrect header check
 ✓ Compiled /api/housing in 164ms (2249 modules)
🏠 Fetching housing market data for national (12m)...
📊 Fetching data for housing indicators: CSUSHPINSA, HOUST, MSACSR, HSN1F, EXHOSLUSM156S, PERMIT, USSTHPI
🏠 Calling Python FRED service for housing market data...
⚠️ FRED service unavailable, falling back to mock data: Error: FRED service responded with status: 404
    at GET (src/app/api/housing/route.ts:114:14)
  112 |       
  113 |       if (!fredResponse.ok) {
> 114 |         throw new Error(`FRED service responded with status: ${fredResponse.status}`);
      |              ^
  115 |       }
  116 |       
  117 |       housingMarketData = await fredResponse.json();
🔍 Checking data completeness for 12 housing data points...
📊 Found 12 complete data points out of 12 total
✅ Using 12 complete real housing data points
✅ Successfully processed housing data for national with 4 alerts
 GET /api/housing?region=national&period=12m&fast=false 200 in 299ms
🏠 Returning cached housing data for national (12m)
 GET /api/housing?region=national&period=12m&fast=false 200 in 4ms

 3. Labour data: 
  GET /labor 200 in 1086ms
 ✓ Compiled /api/labor in 457ms (2255 modules)
👥 Fetching labor market data (12m)...
📊 Fetching data for labor indicators: ICSA, CCSA
🔄 Calling Python FRED service for labor market data...
⚠️ FRED service unavailable, falling back to mock data: Error: FRED service responded with status: 404
    at GET (src/app/api/labor/route.ts:113:14)
  111 |       
  112 |       if (!fredResponse.ok) {
> 113 |         throw new Error(`FRED service responded with status: ${fredResponse.status}`);
      |              ^
  114 |       }
  115 |       
  116 |       laborMarketData = await fredResponse.json();
📊 Generated 52 mock labor data points
✅ Successfully processed labor data with 4 alerts
 GET /api/labor?fast=true 200 in 582ms
👥 Returning cached labor data (12m)
 GET /api/labor?fast=true 200 in 3ms
