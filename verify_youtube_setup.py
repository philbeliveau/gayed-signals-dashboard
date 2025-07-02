#!/usr/bin/env python3
"""
YouTube Processing Setup Verification Script

This script verifies that all dependencies and configurations are properly set up
for YouTube video processing.

Usage:
    python3 verify_youtube_setup.py
"""

import sys
import os
from pathlib import Path

def check_python_version():
    """Check Python version"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.8+")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n📦 Checking dependencies...")
    
    dependencies = {
        'yt_dlp': 'yt-dlp',
        'openai': 'openai',
        'dotenv': 'python-dotenv'
    }
    
    all_good = True
    
    for module, package in dependencies.items():
        try:
            if module == 'dotenv':
                from dotenv import load_dotenv
                print(f"✅ {package} - OK")
            elif module == 'yt_dlp':
                import yt_dlp
                print(f"✅ {package} - OK (version: {yt_dlp.version.__version__})")
            elif module == 'openai':
                import openai
                print(f"✅ {package} - OK (version: {openai.__version__})")
        except ImportError:
            print(f"❌ {package} - NOT FOUND")
            print(f"   Install with: pip3 install {package}")
            all_good = False
    
    return all_good

def check_ffmpeg():
    """Check if ffmpeg is available"""
    print("\n🎵 Checking ffmpeg...")
    
    import subprocess
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✅ ffmpeg - OK ({version_line})")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    print("❌ ffmpeg - NOT FOUND")
    print("   ffmpeg is required for audio extraction from videos")
    print("   Install instructions:")
    print("   - macOS: brew install ffmpeg")
    print("   - Ubuntu/Debian: sudo apt install ffmpeg")
    print("   - Windows: Download from https://ffmpeg.org/")
    return False

def check_openai_config():
    """Check OpenAI API configuration"""
    print("\n🔑 Checking OpenAI configuration...")
    
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except:
        pass
    
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        print("   Please set your OpenAI API key in .env file or environment variables")
        return False
    
    if not api_key.startswith('sk-'):
        print("❌ OPENAI_API_KEY doesn't look like a valid OpenAI API key")
        print("   OpenAI API keys should start with 'sk-'")
        return False
    
    # Mask the key for security
    masked_key = f"{api_key[:10]}...{api_key[-4:]}"
    print(f"✅ OPENAI_API_KEY found: {masked_key}")
    
    # Test the API connection
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Quick test - list models (this doesn't cost anything)
        models = client.models.list()
        print(f"✅ OpenAI API connection successful ({len(models.data)} models available)")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API connection failed: {e}")
        return False

def check_file_permissions():
    """Check if we can create temporary files"""
    print("\n📁 Checking file permissions...")
    
    import tempfile
    try:
        with tempfile.NamedTemporaryFile(delete=True) as temp_file:
            temp_file.write(b"test")
            print("✅ Temporary file creation - OK")
            return True
    except Exception as e:
        print(f"❌ Cannot create temporary files: {e}")
        return False

def main():
    """Main verification function"""
    print("🔬 YouTube Processing Setup Verification")
    print("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("FFmpeg", check_ffmpeg),
        ("OpenAI Config", check_openai_config),
        ("File Permissions", check_file_permissions)
    ]
    
    results = {}
    all_passed = True
    
    for check_name, check_func in checks:
        try:
            results[check_name] = check_func()
            if not results[check_name]:
                all_passed = False
        except Exception as e:
            print(f"❌ Error during {check_name} check: {e}")
            results[check_name] = False
            all_passed = False
    
    print("\n" + "=" * 50)
    print("📋 VERIFICATION SUMMARY")
    print("=" * 50)
    
    for check_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check_name}")
    
    print("\n" + "=" * 50)
    
    if all_passed:
        print("🎉 ALL CHECKS PASSED!")
        print("✅ Your system is ready for YouTube video processing")
        print("\n🚀 You can now run:")
        print("   python3 test_youtube_processing.py")
    else:
        print("⚠️  SOME CHECKS FAILED")
        print("❌ Please fix the issues above before running the YouTube processor")
        print("\n📖 Setup instructions:")
        print("   1. Install missing dependencies: pip3 install -r requirements_youtube_test.txt")
        print("   2. Install ffmpeg (see instructions above)")
        print("   3. Set your OpenAI API key in .env file")
    
    print("=" * 50)
    return all_passed

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Verification interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)