# YouTube Video Processing Test

This test suite allows you to validate YouTube video processing using yt-dlp, OpenAI Whisper, and GPT for summarization.

## 🚀 Quick Start

1. **Run the verification script** to ensure everything is set up:
   ```bash
   python3 verify_youtube_setup.py
   ```

2. **Run the YouTube processor** once verification passes:
   ```bash
   python3 test_youtube_processing.py
   ```

3. **Enter a YouTube URL** when prompted and watch the magic happen!

## 📁 Files Created

### Core Scripts
- `test_youtube_processing.py` - Main YouTube processing test script
- `verify_youtube_setup.py` - Setup verification and troubleshooting
- `requirements_youtube_test.txt` - Python dependencies
- `setup_youtube_test.sh` - Automated setup script (optional)

### What It Does

The main script performs a complete video processing pipeline:

1. **📥 Download Audio**: Uses yt-dlp to extract audio from YouTube videos
2. **🎤 Transcribe**: Uses OpenAI Whisper to convert audio to text  
3. **🤖 Summarize**: Uses OpenAI GPT to create structured summaries
4. **💾 Save Results**: Outputs transcript, summary, and metadata to JSON files

## ⚙️ Configuration

### Required Environment Variables
```bash
# In your .env file
OPENAI_API_KEY=sk-proj-your-api-key-here
```

### Dependencies
- Python 3.8+
- yt-dlp (YouTube video/audio downloader)
- openai (OpenAI API client)
- python-dotenv (environment variable management)
- ffmpeg (audio processing - installed via brew)

## 🧪 Sample Test URLs

### Short Videos (Good for Testing)
- **Rick Roll**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (3:33)
- **Test Video**: `https://www.youtube.com/watch?v=_uQrJ0TkZlc` (Variable length)

### Educational Content
- Search for TED Talks, Khan Academy, or other educational channels
- Aim for videos under 10 minutes for faster processing

## 📊 Output Files

After successful processing, you'll get:

- `youtube_test.log` - Detailed processing logs
- `youtube_test_results.json` - Complete results including transcript and summary
- `youtube_test_error.json` - Error details if processing fails

## 🔧 Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY not found"
```bash
# Add to your .env file:
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> .env
```

#### 2. "ffmpeg not found"
```bash
# macOS:
brew install ffmpeg

# Ubuntu/Debian:
sudo apt install ffmpeg
```

#### 3. "yt-dlp not found"
```bash
pip3 install yt-dlp
```

#### 4. "Video too long" or "File size too large"
- Try shorter videos (under 10 minutes)
- OpenAI Whisper has a 25MB audio file limit

#### 5. Rate Limiting
- OpenAI API has rate limits
- Wait a few minutes between requests for free tier

### Debug Mode

For detailed debugging, check the log file:
```bash
tail -f youtube_test.log
```

## 💰 OpenAI API Costs

### Estimated Costs (as of 2024)
- **Whisper**: ~$0.006 per minute of audio
- **GPT-3.5-turbo**: ~$0.001-0.002 per request (for summaries)

### Example: 5-minute video
- Audio transcription: ~$0.03
- Summary generation: ~$0.002
- **Total**: ~$0.032

## 🔒 Security Notes

- Never commit your OpenAI API key to version control
- Use `.env` file for environment variables
- The script masks API keys in logs for security

## 📈 Performance

### Typical Processing Times
- **5-minute video**: 2-4 minutes total
- **10-minute video**: 4-8 minutes total

### Breakdown
- Download: 10-30 seconds
- Transcription: 1-3 minutes per 5 minutes of audio
- Summarization: 10-30 seconds

## 🎯 Success Criteria

The test is successful when:
- ✅ Audio downloads without errors
- ✅ Transcription completes with readable text
- ✅ Summary is generated with proper structure
- ✅ All files are saved without errors

## 🔄 Integration with Dashboard

This test script validates the same pipeline used in your main dashboard:
- Same OpenAI API integration
- Same audio processing workflow
- Same error handling patterns

Once this test passes, your main dashboard video processing should work correctly.

## 📞 Support

If you encounter issues:
1. Run `python3 verify_youtube_setup.py` first
2. Check the log file for detailed error messages
3. Ensure your OpenAI API key has sufficient credits
4. Try with a shorter test video first

## 🎬 Example Usage

```bash
$ python3 test_youtube_processing.py

🔬 YouTube Video Processing Test Script
==================================================

🎬 Enter YouTube URL (or 'quit' to exit): https://www.youtube.com/watch?v=dQw4w9WgXcQ

🚀 Starting processing...
📊 Check youtube_test.log for detailed progress

================================================================================
📋 FINAL RESULTS
================================================================================
✅ SUCCESS: Video processed successfully!
⏱️  Processing time: 127.3 seconds

📝 TRANSCRIPT (first 300 characters):
--------------------------------------------------
We're no strangers to love
You know the rules and so do I...

📋 SUMMARY:
--------------------------------------------------
**Main Topic**: The video is the famous "Never Gonna Give You Up" music video by Rick Astley.

**Key Points**:
1. Classic 1980s pop song with memorable lyrics
2. Known for the "Rickroll" internet phenomenon
3. Features Rick Astley's distinctive vocals and style

**Conclusion**: This is one of the most recognizable songs in internet culture.
================================================================================
```

Happy testing! 🎉