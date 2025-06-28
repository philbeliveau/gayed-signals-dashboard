#!/bin/bash

# Gayed Signal Dashboard - Python Backtrader Service Setup
echo "🐍 Setting up Python Backtrader Analysis Service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "📋 Python version: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
cd /Users/philippebeliveau/Desktop/Notebook/Trading-system/gayed-signals-dashboard/python-services/backtrader-analysis
python3 -m venv venv

# Activate virtual environment
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "🔄 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Verify installation
echo "✅ Verifying installation..."
python -c "import backtrader; import matplotlib; import pandas; import flask; print('All dependencies installed successfully!')"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p static/charts logs

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the Backtrader service:"
echo "  cd python-services/backtrader-analysis"
echo "  source venv/bin/activate"
echo "  python start_service.py"
echo ""
echo "The service will run on http://localhost:5000"
echo "Your dashboard will connect to it automatically!"