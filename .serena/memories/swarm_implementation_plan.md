# SWARM IMPLEMENTATION PLAN - IMMEDIATE FIXES

## CRITICAL ISSUE RESOLUTION COORDINATION

### Issue 1: Video Processing Timeout - IMMEDIATE FIX

**Problem**: 60-second timeout in Next.js proxy causing AbortError
**Solution**: Increase timeout and add yt-dlp timeout

**Files to Change**:
1. `src/app/api/video-insights/[...path]/route.ts`
   - Change Line 11: `const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '180000');` (3 minutes)
   - Add better error handling for timeout scenarios

2. `backend/services/youtube_service.py`
   - Add timeout to yt-dlp operation in `get_video_metadata()`
   - Set maximum processing time for metadata extraction

### Issue 2: Labor Market Data Structure - IMMEDIATE FIX

**Problem**: `processLaborData` receiving empty data due to structure mismatch
**Solution**: Fix data extraction logic in labor route

**Root Cause**: 
- FRED service returns `{ time_series: [...] }` 
- Frontend expects array or specific properties
- Current logic fails to extract data correctly

**Files to Change**:
1. `src/app/api/labor/route.ts`
   - Fix Lines 118-130: Data structure extraction logic
   - Add debugging logs to trace data flow
   - Handle FRED service response format correctly

## IMPLEMENTATION SEQUENCE

### Step 1: Labor Market Data Fix (HIGH PRIORITY)
1. Analyze FRED service response structure
2. Fix data extraction in `/api/labor/route.ts`
3. Test chart rendering with real data
4. Validate data flow end-to-end

### Step 2: Video Processing Timeout Fix (HIGH PRIORITY)  
1. Increase `API_TIMEOUT` to 180 seconds
2. Add yt-dlp specific timeout handling
3. Test with slow-loading YouTube videos
4. Monitor for remaining timeout issues

### Step 3: Validation & Testing
1. Test both fixes in integration
2. Monitor logs for error patterns
3. Verify charts render correctly
4. Confirm video processing completes

## EXPECTED OUTCOMES

### Labor Market Charts
- ✅ Charts will render with real FRED data
- ✅ No more "empty or invalid data" warnings
- ✅ Time series data flows correctly to frontend

### Video Processing
- ✅ No more 60-second AbortError timeouts
- ✅ Metadata extraction completes successfully
- ✅ Background tasks start properly

## COORDINATION NOTES

- Both fixes can be implemented simultaneously
- Labor market fix is more critical (user-facing charts)
- Video processing fix prevents infrastructure failures
- Monitoring required post-implementation

## SUCCESS CRITERIA

1. **Labor Charts**: Data renders in time series charts without errors
2. **Video Processing**: No timeout errors during metadata extraction
3. **System Stability**: Both services function reliably
4. **User Experience**: Features work as expected

## NEXT PHASE ITEMS

- Add comprehensive error handling
- Implement caching for video metadata
- Add data validation layers
- Improve logging and monitoring