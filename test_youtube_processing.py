#!/usr/bin/env python3
"""
YouTube Video Processing Test Script

This script tests the complete YouTube video processing pipeline:
1. Download audio from YouTube video using yt-dlp
2. Transcribe audio using OpenAI Whisper
3. Generate summary using OpenAI GPT

Usage:
    python test_youtube_processing.py
    
Then enter a YouTube URL when prompted.

Requirements:
    pip install yt-dlp openai python-dotenv
"""

import os
import sys
import logging
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import json
import time

# Import required libraries with error handling
try:
    import yt_dlp
    print("✅ yt-dlp imported successfully")
except ImportError as e:
    print(f"❌ ERROR: yt-dlp not found. Install with: pip install yt-dlp")
    sys.exit(1)

try:
    from openai import OpenAI
    print("✅ OpenAI library imported successfully")
except ImportError as e:
    print(f"❌ ERROR: OpenAI library not found. Install with: pip install openai")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    print("✅ python-dotenv imported successfully")
except ImportError as e:
    print("⚠️  WARNING: python-dotenv not found. Install with: pip install python-dotenv")
    print("    You'll need to set OPENAI_API_KEY environment variable manually")

# Setup comprehensive logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.FileHandler('youtube_test.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class YouTubeProcessor:
    """Complete YouTube video processing pipeline with extensive debugging"""
    
    def __init__(self):
        """Initialize the processor with OpenAI client and configuration"""
        logger.info("🚀 Initializing YouTube Processor...")
        
        # Load environment variables
        try:
            load_dotenv()
            logger.info("✅ Environment variables loaded from .env file")
        except Exception as e:
            logger.warning(f"⚠️  Could not load .env file: {e}")
        
        # Initialize OpenAI client
        self.setup_openai_client()
        
        # Setup temporary directory for audio files
        self.temp_dir = tempfile.mkdtemp(prefix="youtube_test_")
        logger.info(f"📁 Temporary directory created: {self.temp_dir}")
        
        # yt-dlp configuration for audio extraction with anti-blocking measures
        self.ytdl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(self.temp_dir, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': False,  # Set to False for debugging
            'no_warnings': False,
            'extract_flat': False,
            # Anti-blocking measures
            'extractor_retries': 3,
            'fragment_retries': 3,
            'retry_sleep_functions': {'http': lambda n: 2**n, 'fragment': lambda n: 2**n},
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
            # Try different extraction methods
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['webpage', 'configs'],
                    'innertube_host': ['studio.youtube.com', 'youtubei.googleapis.com'],
                }
            }
        }
        logger.info("🔧 yt-dlp configuration initialized")
    
    def setup_openai_client(self):
        """Setup OpenAI client with comprehensive error handling"""
        try:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                logger.error("❌ OPENAI_API_KEY not found in environment variables")
                logger.error("   Please set your OpenAI API key in .env file or environment")
                sys.exit(1)
            
            # Mask API key for logging (show only first 10 and last 4 characters)
            masked_key = f"{api_key[:10]}...{api_key[-4:]}"
            logger.info(f"🔑 OpenAI API key found: {masked_key}")
            
            self.openai_client = OpenAI(api_key=api_key)
            logger.info("✅ OpenAI client initialized successfully")
            
            # Test the client with a simple request
            try:
                models = self.openai_client.models.list()
                logger.info(f"✅ OpenAI API connection verified. Available models: {len(models.data)}")
            except Exception as e:
                logger.error(f"❌ OpenAI API connection test failed: {e}")
                raise
                
        except Exception as e:
            logger.error(f"❌ Failed to setup OpenAI client: {e}")
            raise
    
    def validate_youtube_url(self, url):
        """Validate if the provided URL is a valid YouTube URL"""
        logger.info(f"🔍 Validating YouTube URL: {url}")
        
        youtube_domains = ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com']
        
        # Basic URL validation
        if not url.startswith(('http://', 'https://')):
            logger.error("❌ URL must start with http:// or https://")
            return False
        
        # Check if it's a YouTube domain
        is_youtube = any(domain in url for domain in youtube_domains)
        if not is_youtube:
            logger.error("❌ URL is not from a supported YouTube domain")
            logger.error(f"   Supported domains: {', '.join(youtube_domains)}")
            return False
        
        logger.info("✅ URL validation passed")
        return True
    
    def download_audio(self, url):
        """Download audio from YouTube video using yt-dlp"""
        logger.info(f"📥 Starting audio download for: {url}")
        
        try:
            # First, extract video info without downloading
            logger.info("🔍 Extracting video information...")
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Log video details
                title = info.get('title', 'Unknown Title')
                duration = info.get('duration', 0)
                uploader = info.get('uploader', 'Unknown')
                view_count = info.get('view_count', 0)
                
                logger.info(f"📺 Video Title: {title}")
                logger.info(f"⏱️  Duration: {duration} seconds ({duration/60:.1f} minutes)")
                logger.info(f"👤 Uploader: {uploader}")
                logger.info(f"👁️  Views: {view_count:,}")
                
                # Check duration (warn if too long)
                if duration > 3600:  # 1 hour
                    logger.warning(f"⚠️  Video is {duration/3600:.1f} hours long. This may take a while to process...")
                elif duration > 1800:  # 30 minutes
                    logger.warning(f"⚠️  Video is {duration/60:.1f} minutes long. Processing may take some time...")
            
            # Now download the audio
            logger.info("📥 Downloading audio...")
            with yt_dlp.YoutubeDL(self.ytdl_opts) as ydl:
                ydl.download([url])
            
            # Find the downloaded audio file
            audio_files = list(Path(self.temp_dir).glob("*.mp3"))
            if not audio_files:
                # Try other audio formats
                audio_files = list(Path(self.temp_dir).glob("*.m4a"))
                if not audio_files:
                    audio_files = list(Path(self.temp_dir).glob("*.wav"))
            
            if not audio_files:
                raise Exception("No audio file found after download")
            
            audio_file = audio_files[0]
            file_size = audio_file.stat().st_size
            logger.info(f"✅ Audio downloaded successfully: {audio_file.name}")
            logger.info(f"📁 File size: {file_size / (1024*1024):.1f} MB")
            logger.info(f"📍 File path: {audio_file}")
            
            return str(audio_file)
            
        except Exception as e:
            logger.error(f"❌ Audio download failed: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            raise
    
    def transcribe_audio(self, audio_file_path):
        """Transcribe audio using OpenAI Whisper"""
        logger.info(f"🎤 Starting transcription for: {os.path.basename(audio_file_path)}")
        
        try:
            # Check file exists and size
            if not os.path.exists(audio_file_path):
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
            file_size = os.path.getsize(audio_file_path)
            logger.info(f"📁 Audio file size: {file_size / (1024*1024):.1f} MB")
            
            # OpenAI has a 25MB limit for audio files
            if file_size > 25 * 1024 * 1024:  # 25MB
                logger.warning(f"⚠️  Audio file is {file_size / (1024*1024):.1f} MB (>25MB limit)")
                logger.warning("   Consider splitting the audio or using a shorter video")
            
            # Transcribe using OpenAI Whisper
            logger.info("🔄 Sending audio to OpenAI Whisper...")
            start_time = time.time()
            
            with open(audio_file_path, 'rb') as audio_file:
                transcript = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            transcription_time = time.time() - start_time
            logger.info(f"✅ Transcription completed in {transcription_time:.1f} seconds")
            
            # Log transcription details
            word_count = len(transcript.split())
            char_count = len(transcript)
            logger.info(f"📝 Transcription length: {char_count} characters, {word_count} words")
            logger.info(f"📊 First 100 characters: {transcript[:100]}...")
            
            return transcript
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            
            # Specific error handling
            if "File size too large" in str(e):
                logger.error("   💡 Try using a shorter video or compress the audio")
            elif "Invalid file format" in str(e):
                logger.error("   💡 Try converting the audio to MP3 format")
            
            raise
    
    def generate_summary(self, transcript):
        """Generate summary using OpenAI GPT"""
        logger.info("🤖 Starting summary generation...")
        
        try:
            # Log transcript details
            word_count = len(transcript.split())
            char_count = len(transcript)
            logger.info(f"📝 Input transcript: {char_count} characters, {word_count} words")
            
            # Create a comprehensive prompt
            prompt = f"""Please provide a comprehensive summary of the following video transcript. 
            
Structure your summary as follows:
1. **Main Topic**: What is the video primarily about?
2. **Key Points**: List the 3-5 most important points discussed
3. **Details**: Provide important details, facts, or insights mentioned
4. **Conclusion**: What's the main takeaway or conclusion?

Transcript:
{transcript}

Summary:"""
            
            logger.info("🔄 Sending request to OpenAI GPT...")
            start_time = time.time()
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates comprehensive, well-structured summaries of video content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            summary_time = time.time() - start_time
            logger.info(f"✅ Summary generated in {summary_time:.1f} seconds")
            
            summary = response.choices[0].message.content
            
            # Log summary details
            summary_word_count = len(summary.split())
            summary_char_count = len(summary)
            logger.info(f"📋 Summary length: {summary_char_count} characters, {summary_word_count} words")
            logger.info(f"💰 Tokens used: {response.usage.total_tokens}")
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Summary generation failed: {e}")
            logger.error(f"   Error type: {type(e).__name__}")
            
            # Specific error handling
            if "context_length_exceeded" in str(e):
                logger.error("   💡 Transcript too long. Try a shorter video or split the transcript")
            elif "rate_limit" in str(e):
                logger.error("   💡 Rate limit exceeded. Wait a moment and try again")
            
            raise
    
    def cleanup(self):
        """Clean up temporary files"""
        logger.info("🧹 Cleaning up temporary files...")
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"✅ Temporary directory removed: {self.temp_dir}")
        except Exception as e:
            logger.warning(f"⚠️  Could not remove temporary directory: {e}")
    
    def process_video(self, url):
        """Complete video processing pipeline"""
        logger.info("=" * 80)
        logger.info("🚀 STARTING YOUTUBE VIDEO PROCESSING PIPELINE")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        try:
            # Step 1: Validate URL
            logger.info("📋 STEP 1: URL Validation")
            if not self.validate_youtube_url(url):
                raise ValueError("Invalid YouTube URL")
            
            # Step 2: Download audio
            logger.info("📋 STEP 2: Audio Download")
            audio_file = self.download_audio(url)
            
            # Step 3: Transcribe audio
            logger.info("📋 STEP 3: Audio Transcription")
            transcript = self.transcribe_audio(audio_file)
            
            # Step 4: Generate summary
            logger.info("📋 STEP 4: Summary Generation")
            summary = self.generate_summary(transcript)
            
            total_time = time.time() - start_time
            
            # Final results
            logger.info("=" * 80)
            logger.info("🎉 PROCESSING COMPLETED SUCCESSFULLY!")
            logger.info(f"⏱️  Total processing time: {total_time:.1f} seconds ({total_time/60:.1f} minutes)")
            logger.info("=" * 80)
            
            return {
                'success': True,
                'url': url,
                'transcript': transcript,
                'summary': summary,
                'processing_time': total_time,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error("=" * 80)
            logger.error("❌ PROCESSING FAILED!")
            logger.error(f"💥 Error: {e}")
            logger.error(f"⏱️  Time elapsed before failure: {total_time:.1f} seconds")
            logger.error("=" * 80)
            
            return {
                'success': False,
                'url': url,
                'error': str(e),
                'error_type': type(e).__name__,
                'processing_time': total_time,
                'timestamp': datetime.now().isoformat()
            }
        
        finally:
            # Always cleanup
            self.cleanup()


def save_results(results, output_file="youtube_test_results.json"):
    """Save results to a JSON file"""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        logger.info(f"💾 Results saved to: {output_file}")
    except Exception as e:
        logger.error(f"❌ Could not save results: {e}")


def suggest_test_videos():
    """Suggest some reliable test videos"""
    suggestions = [
        {
            'url': 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
            'title': 'Me at the zoo (First YouTube video)',
            'duration': '19 seconds',
            'reason': 'Very short, reliable for testing'
        },
        {
            'url': 'https://www.youtube.com/watch?v=9bZkp7q19f0',
            'title': 'PSY - GANGNAM STYLE',
            'duration': '4 minutes',
            'reason': 'Popular, usually works well'
        },
        {
            'url': 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
            'title': 'Luis Fonsi - Despacito',
            'duration': '4 minutes',
            'reason': 'Another popular, stable video'
        }
    ]
    
    print("\n💡 Suggested test videos (these usually work well):")
    print("-" * 60)
    for i, video in enumerate(suggestions, 1):
        print(f"{i}. {video['title']} ({video['duration']})")
        print(f"   URL: {video['url']}")
        print(f"   Why: {video['reason']}")
        print()

def main():
    """Main function to run the YouTube processing test"""
    print("🔬 YouTube Video Processing Test Script")
    print("=" * 50)
    print()
    
    # Get YouTube URL from user
    while True:
        print("Options:")
        print("1. Enter your own YouTube URL")
        print("2. See suggested test videos")
        print("3. Quit")
        
        choice = input("\nChoose an option (1-3): ").strip()
        
        if choice == '3' or choice.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            sys.exit(0)
        elif choice == '2':
            suggest_test_videos()
            continue
        elif choice == '1':
            url = input("🎬 Enter YouTube URL: ").strip()
            if url:
                break
            else:
                print("❌ Please enter a valid URL")
        else:
            print("❌ Please choose 1, 2, or 3")
    
    print()
    print("🚀 Starting processing...")
    print("📊 Check youtube_test.log for detailed progress")
    print()
    
    # Initialize processor and run
    processor = YouTubeProcessor()
    results = processor.process_video(url)
    
    # Display results
    print("\n" + "=" * 80)
    print("📋 FINAL RESULTS")
    print("=" * 80)
    
    if results['success']:
        print("✅ SUCCESS: Video processed successfully!")
        print(f"⏱️  Processing time: {results['processing_time']:.1f} seconds")
        print()
        print("📝 TRANSCRIPT (first 300 characters):")
        print("-" * 50)
        print(results['transcript'][:300] + "..." if len(results['transcript']) > 300 else results['transcript'])
        print()
        print("📋 SUMMARY:")
        print("-" * 50)
        print(results['summary'])
        print()
        
        # Save full results
        save_results(results)
        
    else:
        print("❌ FAILED: Video processing failed!")
        print(f"💥 Error: {results['error']}")
        print(f"🔍 Error type: {results['error_type']}")
        print(f"⏱️  Time before failure: {results['processing_time']:.1f} seconds")
        print()
        print("💡 Check the log file for detailed error information")
        
        # Save error results
        save_results(results, "youtube_test_error.json")
    
    print("=" * 80)
    print("📁 Log file: youtube_test.log")
    print("💾 Results file: youtube_test_results.json" if results['success'] else "youtube_test_error.json")
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Processing interrupted by user")
        logger.info("Processing interrupted by user (Ctrl+C)")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        logger.error(f"Unexpected error in main: {e}")
        sys.exit(1)