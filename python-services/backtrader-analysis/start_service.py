#!/usr/bin/env python3
"""
Startup script for Gayed Signals Backtrader Analysis Service

This script provides a simple way to start the Python microservice
with proper error handling and environment setup.
"""

import sys
import os
import argparse
import logging
from pathlib import Path

# Add src to Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

def setup_environment():
    """Setup environment variables and paths"""
    
    # Set default environment variables
    os.environ.setdefault('FLASK_ENV', 'development')
    os.environ.setdefault('FLASK_PORT', '5000')
    os.environ.setdefault('LOG_LEVEL', 'INFO')
    
    # Create necessary directories
    base_dir = Path(__file__).parent
    
    directories = [
        base_dir / 'logs',
        base_dir / 'static' / 'charts',
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def check_dependencies():
    """Check if required dependencies are installed"""
    
    required_packages = [
        'flask',
        'backtrader', 
        'pandas',
        'numpy',
        'matplotlib',
        'plotly',
        'structlog'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} (missing)")
    
    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("Please install them using: pip install -r requirements.txt")
        return False
    
    print("All required packages are installed!")
    return True

def start_development_server(port=5000, debug=True):
    """Start the Flask development server"""
    
    try:
        from api.app import app
        
        print(f"\n🚀 Starting Gayed Signals Backtrader Analysis Service")
        print(f"   Port: {port}")
        print(f"   Debug: {debug}")
        print(f"   Health Check: http://localhost:{port}/health")
        print(f"   API Documentation: http://localhost:{port}/indicators")
        print("\n   Available endpoints:")
        print(f"   - POST http://localhost:{port}/analyze")
        print(f"   - POST http://localhost:{port}/analyze/quick") 
        print(f"   - GET  http://localhost:{port}/health")
        print(f"   - GET  http://localhost:{port}/indicators")
        print(f"   - GET  http://localhost:{port}/config")
        print("\n   Press Ctrl+C to stop the server\n")
        
        app.run(
            host='0.0.0.0',
            port=port,
            debug=debug,
            threaded=True
        )
        
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Failed to start server: {str(e)}")
        sys.exit(1)

def start_production_server(port=5000, workers=4):
    """Start the production server using gunicorn"""
    
    try:
        import gunicorn.app.wsgiapp as wsgi
        
        print(f"\n🚀 Starting Gayed Signals Analysis Service (Production)")
        print(f"   Port: {port}")
        print(f"   Workers: {workers}")
        
        # Gunicorn configuration
        sys.argv = [
            'gunicorn',
            '--bind', f'0.0.0.0:{port}',
            '--workers', str(workers),
            '--worker-class', 'sync',
            '--timeout', '300',  # 5 minutes for long analysis
            '--keep-alive', '2',
            '--max-requests', '1000',
            '--max-requests-jitter', '100',
            '--preload',
            'src.api.app:app'
        ]
        
        wsgi.run()
        
    except ImportError:
        print("❌ Gunicorn not installed. Install it with: pip install gunicorn")
        print("Falling back to development server...")
        start_development_server(port=port, debug=False)
    except Exception as e:
        print(f"❌ Failed to start production server: {str(e)}")
        sys.exit(1)

def run_health_check(port=5000):
    """Run a quick health check against the service"""
    
    try:
        import requests
        
        url = f"http://localhost:{port}/health"
        print(f"🔍 Checking service health at {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Service is healthy!")
            print(f"   Status: {data.get('status')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Indicators: {', '.join(data.get('indicators_available', []))}")
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            
    except ImportError:
        print("❌ Requests package not installed. Install it with: pip install requests")
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")

def main():
    """Main entry point"""
    
    parser = argparse.ArgumentParser(
        description='Gayed Signals Backtrader Analysis Service',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start_service.py                    # Start development server
  python start_service.py --port 8000       # Start on port 8000
  python start_service.py --production       # Start production server
  python start_service.py --check            # Run health check
  python start_service.py --setup-only       # Setup environment only
        """
    )
    
    parser.add_argument('--port', type=int, default=5000,
                       help='Port to run the server on (default: 5000)')
    parser.add_argument('--production', action='store_true',
                       help='Start production server with gunicorn')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of worker processes for production (default: 4)')
    parser.add_argument('--check', action='store_true',
                       help='Run health check against running service')
    parser.add_argument('--setup-only', action='store_true',
                       help='Setup environment and check dependencies only')
    parser.add_argument('--skip-deps', action='store_true',
                       help='Skip dependency check')
    
    args = parser.parse_args()
    
    print("🔧 Setting up environment...")
    setup_environment()
    
    if not args.skip_deps:
        print("\n📦 Checking dependencies...")
        if not check_dependencies():
            sys.exit(1)
    
    if args.setup_only:
        print("\n✅ Environment setup complete!")
        return
    
    if args.check:
        print("\n🔍 Running health check...")
        run_health_check(args.port)
        return
    
    # Start the appropriate server
    if args.production:
        start_production_server(args.port, args.workers)
    else:
        start_development_server(args.port, debug=True)

if __name__ == '__main__':
    main()