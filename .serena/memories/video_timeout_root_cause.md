# Video Processing Timeout Root Cause

## Root Cause Identified
The timeout is caused by `youtube_service.get_video_metadata()` in the FastAPI endpoint taking >60 seconds to complete.

## Technical Details
- **Location**: `backend/services/youtube_service.py` lines 84-155
- **Operation**: `yt-dlp.YoutubeDL.extract_info()` call
- **Issue**: Even though wrapped in `loop.run_in_executor()`, yt-dlp can take very long for certain videos
- **Blocking**: FastAPI endpoint waits for metadata validation before starting background task

## Why yt-dlp is slow
1. Large videos with complex metadata
2. YouTube rate limiting
3. Network connectivity issues  
4. Restricted access videos requiring additional validation
5. Some videos trigger anti-bot measures

## Impact
- Frontend proxy times out after 60 seconds
- Background Celery task never starts
- User sees timeout error instead of processing status
- No video processing occurs

## Solution Required
Move metadata validation to background task or make it non-blocking in the initial endpoint response.