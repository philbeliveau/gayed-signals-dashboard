# Gayed Signals Backtrader Analysis Service
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies including ta-lib
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install ta-lib C library with ARM64 support
RUN cd /tmp && \
    wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --build=aarch64-unknown-linux-gnu --prefix=/usr && \
    make && \
    make install && \
    cd / && \
    rm -rf /tmp/ta-lib*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs static/charts

# Set environment variables
ENV FLASK_ENV=production
ENV FLASK_PORT=5000
ENV LOG_LEVEL=INFO
ENV PYTHONPATH=/app/src

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests, os; requests.get(f'http://localhost:{os.environ.get(\"PORT\", \"5000\")}/health', timeout=5)"

# Start the service - Railway will provide PORT env var
CMD ["sh", "-c", "python start_service.py --production --port ${PORT:-5000}"]