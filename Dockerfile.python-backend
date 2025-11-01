# Multi-stage Docker build for FastAPI backend
FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD ["python", "main.py"]