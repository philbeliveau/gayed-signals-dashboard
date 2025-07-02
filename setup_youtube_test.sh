#!/bin/bash

# YouTube Video Processing Test Setup Script

echo "🔬 Setting up YouTube Video Processing Test Environment"
echo "=" * 60

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python 3 is not installed or not in PATH"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ ERROR: pip3 is not installed or not in PATH"
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"

# Install requirements
echo ""
echo "📦 Installing Python dependencies..."
pip3 install -r requirements_youtube_test.txt

# Check if ffmpeg is available
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg found: $(ffmpeg -version | head -n1)"
else
    echo "⚠️  WARNING: ffmpeg not found. This is required for audio extraction."
    echo "   Install instructions:"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   - Windows: Download from https://ffmpeg.org/"
fi

# Check environment variables
echo ""
echo "🔑 Checking environment configuration..."

if [ -f .env ]; then
    echo "✅ .env file found"
    
    if grep -q "OPENAI_API_KEY=sk-" .env; then
        echo "✅ OpenAI API key appears to be configured"
    else
        echo "⚠️  WARNING: OpenAI API key may not be properly configured"
        echo "   Make sure OPENAI_API_KEY is set in your .env file"
    fi
else
    echo "⚠️  WARNING: .env file not found"
    echo "   Create a .env file with your OPENAI_API_KEY"
fi

echo ""
echo "🚀 Setup complete! You can now run:"
echo "   python3 test_youtube_processing.py"
echo ""
echo "📋 Test with these sample YouTube URLs:"
echo "   - Short video (good for testing): https://www.youtube.com/watch?v=dQw4w9WgXcQ"
echo "   - Educational content: https://www.youtube.com/watch?v=_uQrJ0TkZlc"
echo ""