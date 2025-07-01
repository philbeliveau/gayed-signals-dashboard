# Security Setup Guide

## Overview
This document provides instructions for securely configuring API keys and credentials for the Gayed Signals Dashboard.

## ⚠️ CRITICAL SECURITY NOTICE
**NEVER commit real API keys to version control.** All .env files in this project have been sanitized and contain only placeholder values.

## Required Environment Variables

### Financial Data API Keys
These API keys are required for real market data fetching:

- **TIINGO_API_KEY**: Primary financial data source
  - Get yours at: https://www.tiingo.com/
  - Free tier available with 500 API calls/hour
  
- **ALPHA_VANTAGE_KEY**: Backup financial data source
  - Get yours at: https://www.alphavantage.co/
  - Free tier: 5 calls/minute, 500 calls/day
  
- **FRED_API_KEY**: Federal Reserve Economic Data
  - Get yours at: https://fred.stlouisfed.org/docs/api/api_key.html
  - Free API with 120 calls/hour limit

- **BUREAU_OF_STATISTIC_KEY**: Bureau of Labor Statistics
  - Get yours at: https://www.bls.gov/developers/api_signature_v2.html
  - Free tier available

### AI Processing API Keys
For video transcription and analysis features:

- **OPENAI_API_KEY**: OpenAI GPT models
  - Get yours at: https://platform.openai.com/api-keys
  - Pay-per-use pricing
  
- **ANTHROPIC_API_KEY**: Claude AI models  
  - Get yours at: https://console.anthropic.com/
  - Pay-per-use pricing

## Setup Instructions

### 1. Environment File Configuration
Copy the template values and replace with your actual API keys:

```bash
# Root directory
cp .env.template .env
# Edit .env and replace placeholder values

# Backend service
cd backend/
# Edit .env and replace placeholder values

# Python backtrader service  
cd python-services/backtrader-analysis/
# Edit .env and replace placeholder values
```

### 2. Secure Environment Variable Pattern
Always use this pattern in your code:

```python
# Python
import os
API_KEY = os.getenv("API_KEY_NAME")
if not API_KEY:
    raise ValueError("API_KEY_NAME environment variable is required")
```

```typescript
// TypeScript/JavaScript
const apiKey = process.env.API_KEY_NAME;
if (!apiKey) {
  throw new Error("API_KEY_NAME environment variable is required");
}
```

### 3. Docker Environment Variables
For Docker deployments, create a `.env` file in the root directory or use Docker secrets:

```bash
docker run -e TIINGO_API_KEY=your_key_here your_image
```

## Security Best Practices

### 1. Environment Files
- ✅ Use `.env` files for local development
- ✅ Add `.env*` to `.gitignore` (already configured)
- ❌ NEVER commit `.env` files to version control
- ❌ NEVER use hardcoded API keys in source code

### 2. Production Deployment
- Use environment variables or secrets management
- Rotate API keys regularly
- Monitor API key usage for suspicious activity
- Use least-privilege access principles

### 3. Development Guidelines
- Test with mock data when API keys are not available
- Implement graceful fallbacks for missing credentials
- Log security warnings when credentials are missing
- Validate environment variables at application startup

## Compromised API Keys
If you suspect an API key has been compromised:

1. **Immediately revoke** the API key in the provider's dashboard
2. **Generate a new** API key
3. **Update** all deployments with the new key
4. **Monitor** for any unauthorized usage
5. **Review** access logs for suspicious activity

## Environment File Locations

The following files require API key configuration:
- `/.env` (root environment file)
- `/.env.local` (Next.js local environment)
- `/backend/.env` (FastAPI backend)
- `/python-services/backtrader-analysis/.env` (Python service)

## Verification

To verify your setup is secure:

1. Check that no real API keys exist in source code:
   ```bash
   grep -r "sk-" . --exclude-dir=node_modules
   grep -r "[a-zA-Z0-9]{32,}" . --exclude-dir=node_modules
   ```

2. Ensure .env files are ignored:
   ```bash
   git status --ignored
   ```

3. Test applications start with missing environment variables

## Support

If you encounter issues with API key configuration:
1. Check the provider's documentation for correct key format
2. Verify environment variables are loaded correctly
3. Review application logs for specific error messages
4. Test with minimal API calls first

---
**Last Updated**: Security audit completed on 2025-07-01
**Status**: All hardcoded credentials removed, environment variable patterns implemented