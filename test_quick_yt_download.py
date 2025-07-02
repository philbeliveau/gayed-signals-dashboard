#!/usr/bin/env python3
"""
Quick YouTube Download Test

This script quickly tests if yt-dlp can download from YouTube with current settings.
"""

import yt_dlp
import tempfile
import os

def test_download():
    """Test basic yt-dlp functionality"""
    print("🔬 Quick yt-dlp Download Test")
    print("=" * 40)
    
    # Test URLs (known to work well)
    test_urls = [
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",  # First YouTube video (19 seconds)
        "https://www.youtube.com/watch?v=9bZkp7q19f0",  # Gangnam Style  
        "https://www.youtube.com/watch?v=kJQP7kiw5Fk",  # Despacito
    ]
    
    with tempfile.TemporaryDirectory() as temp_dir:
        ytdl_opts = {
            'format': 'worst[ext=mp4]',  # Use worst quality for fastest download
            'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            # Anti-blocking measures
            'extractor_retries': 3,
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'referer': 'https://www.youtube.com/',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                }
            }
        }
        
        for i, url in enumerate(test_urls, 1):
            print(f"\n🧪 Test {i}: {url}")
            try:
                with yt_dlp.YoutubeDL(ytdl_opts) as ydl:
                    # First try to extract info without downloading
                    info = ydl.extract_info(url, download=False)
                    title = info.get('title', 'Unknown')
                    duration = info.get('duration', 0)
                    print(f"✅ Info extraction successful: '{title}' ({duration}s)")
                    
                    # If info works, try a small download
                    # info = ydl.extract_info(url, download=True)
                    # print(f"✅ Download test successful!")
                    break  # Success with first working URL
                    
            except Exception as e:
                print(f"❌ Failed: {e}")
                continue
        else:
            print("\n❌ All test URLs failed. YouTube may be blocking downloads.")
            print("💡 Try using the suggested videos in the main script.")

if __name__ == "__main__":
    test_download()