(()=>{var t={};t.id=390,t.ids=[390],t.modules={3295:t=>{"use strict";t.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:t=>{"use strict";t.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48106:(t,e,r)=>{"use strict";t.exports=r(44870)},63033:t=>{"use strict";t.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},80408:()=>{},82493:(t,e,r)=>{"use strict";r.r(e),r.d(e,{patchFetch:()=>c,routeModule:()=>p,serverHooks:()=>h,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>x});var i={};r.r(i),r.d(i,{GET:()=>n});var o=r(48106),a=r(48819),l=r(12050),s=r(4235);async function n(t){let{searchParams:e}=new URL(t.url),r=e.get("symbols")?.split(",")||["SPY"],i=e.get("signals")?.split(",")||["utilities_spy"],o=e.get("startDate")||"2020-01-01",a=e.get("endDate")||"2023-12-31";try{let t=await f(r,i,o,a);return new s.NextResponse(t,{status:200,headers:{"Content-Type":"image/svg+xml","Cache-Control":"public, max-age=3600"}})}catch(e){var l,n;console.error("Chart generation error:",e);let t=(l=r,n=i,`
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#0F172A"/>
      <rect x="50" y="50" width="700" height="300" fill="#1E293B" stroke="#374151" stroke-width="2" rx="8"/>
      
      <text x="400" y="180" text-anchor="middle" fill="#6B7280" font-size="24" font-family="Arial">
        📊 Chart Generation
      </text>
      <text x="400" y="210" text-anchor="middle" fill="#9CA3AF" font-size="16" font-family="Arial">
        ${l.join(", ")} - ${n.join(", ")}
      </text>
      <text x="400" y="240" text-anchor="middle" fill="#6B7280" font-size="14" font-family="Arial">
        Python Backtrader service not available
      </text>
      <text x="400" y="260" text-anchor="middle" fill="#6B7280" font-size="12" font-family="Arial">
        Start Python service for interactive charts
      </text>
    </svg>
  `);return new s.NextResponse(t,{status:200,headers:{"Content-Type":"image/svg+xml"}})}}async function f(t,e,r,i){let o={top:20,right:20,bottom:40,left:60},a=800-o.left-o.right,l=400-o.top-o.bottom,s=[],n=100,f=new Date(r),p=(new Date(i).getTime()-f.getTime())/100;for(let t=0;t<100;t++){let e=new Date(f.getTime()+t*p);n*=1.0002+(Math.random()-.5)*.02,s.push({date:e.toISOString().split("T")[0],price:n,x:o.left+t/99*a,y:o.top+l-(n-80)/40*l})}let d=[];for(let t=0;t<8;t++){let t=s[Math.floor(100*Math.random())],e=Math.random()>.5?"Risk-On":"Risk-Off";d.push({x:t.x,y:t.y-10,type:e,color:"Risk-On"===e?"#10B981":"#EF4444"})}return`
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0.05" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="400" fill="#0F172A"/>
      
      <!-- Chart area background -->
      <rect x="${o.left}" y="${o.top}" width="${a}" height="${l}" 
            fill="#1E293B" stroke="#374151" stroke-width="1"/>
      
      <!-- Grid lines -->
      ${function(t,e,r){let i=[];for(let o=0;o<=10;o++){let a=t.left+o/10*e;i.push(`<line x1="${a}" y1="${t.top}" x2="${a}" y2="${t.top+r}" stroke="#374151" stroke-width="0.5" opacity="0.5"/>`)}for(let o=0;o<=5;o++){let a=t.top+o/5*r;i.push(`<line x1="${t.left}" y1="${a}" x2="${t.left+e}" y2="${a}" stroke="#374151" stroke-width="0.5" opacity="0.5"/>`)}return i.join("")}(o,a,l)}
      
      <!-- Price line -->
      <path d="M ${s.map(t=>`${t.x},${t.y}`).join(" L ")}" 
            stroke="#3B82F6" stroke-width="2" fill="none"/>
      
      <!-- Price area -->
      <path d="M ${o.left},${o.top+l} L ${s.map(t=>`${t.x},${t.y}`).join(" L ")} L ${o.left+a},${o.top+l} Z" 
            fill="url(#chartGradient)"/>
      
      <!-- Signal markers -->
      ${d.map(t=>`
        <circle cx="${t.x}" cy="${t.y}" r="6" fill="${t.color}" filter="url(#shadow)"/>
        <text x="${t.x}" y="${t.y-15}" text-anchor="middle" fill="white" font-size="10" font-family="Arial">
          ${"Risk-On"===t.type?"\uD83D\uDCC8":"\uD83D\uDCC9"}
        </text>
      `).join("")}
      
      <!-- Axes -->
      <line x1="${o.left}" y1="${o.top}" x2="${o.left}" y2="${o.top+l}" 
            stroke="#6B7280" stroke-width="1"/>
      <line x1="${o.left}" y1="${o.top+l}" x2="${o.left+a}" y2="${o.top+l}" 
            stroke="#6B7280" stroke-width="1"/>
      
      <!-- Labels -->
      <text x="400" y="390" text-anchor="middle" fill="#9CA3AF" font-size="12" font-family="Arial">
        ${t.join(", ")} - Gayed Signals Analysis (${r} to ${i})
      </text>
      
      <text x="15" y="200" text-anchor="middle" fill="#9CA3AF" font-size="12" font-family="Arial" 
            transform="rotate(-90, 15, 200)">Price</text>
      
      <!-- Legend -->
      <g transform="translate(650, 30)">
        <rect x="0" y="0" width="130" height="60" fill="#1E293B" stroke="#374151" stroke-width="1" rx="4"/>
        <circle cx="15" cy="20" r="5" fill="#10B981"/>
        <text x="25" y="24" fill="#10B981" font-size="11" font-family="Arial">Risk-On Signal</text>
        <circle cx="15" cy="40" r="5" fill="#EF4444"/>
        <text x="25" y="44" fill="#EF4444" font-size="11" font-family="Arial">Risk-Off Signal</text>
      </g>
      
      <!-- Title -->
      <text x="${o.left}" y="15" fill="white" font-size="14" font-family="Arial" font-weight="bold">
        ${e.map(t=>t.replace("_","/").toUpperCase()).join(", ")} Analysis
      </text>
    </svg>
  `}let p=new o.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/chart/route",pathname:"/api/chart",filename:"route",bundlePath:"app/api/chart/route"},resolvedPagePath:"/Users/philippebeliveau/Desktop/Notebook/gayed-signals-dashboard/apps/web/src/app/api/chart/route.ts",nextConfigOutput:"",userland:i}),{workAsyncStorage:d,workUnitAsyncStorage:x,serverHooks:h}=p;function c(){return(0,l.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:x})}},87032:()=>{}};var e=require("../../../webpack-runtime.js");e.C(t);var r=t=>e(e.s=t),i=e.X(0,[620],()=>r(82493));module.exports=i})();