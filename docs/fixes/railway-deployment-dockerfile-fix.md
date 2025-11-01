# Railway Deployment Dockerfile Fix

## Date
2025-10-31

## Status
✅ **RESOLVED** - Application successfully deployed and running on Railway

## Problem Summary
Railway deployment failing with multiple Dockerfile-related issues:

1. **Wrong Dockerfile Detected**: Railway was using the Python backend Dockerfile from project root instead of the Node.js Dockerfile in `domains/data-pipeline/`
2. **TypeScript Build Failure**: `tsc: not found` error during build phase
3. **Root Directory Configuration**: Railway wasn't respecting the `domains/data-pipeline` root directory setting
4. **Missing DATABASE_URL**: Environment variable not set in Railway
5. **Prisma OpenSSL Dependency**: `libssl.so.1.1: cannot open shared object file: No such file or directory`

## Root Cause Analysis

### Issue 1: Conflicting Dockerfiles
- Project had a Python Dockerfile at root: `/Dockerfile`
- Node.js Dockerfile at: `/domains/data-pipeline/Dockerfile`
- Railway prioritized root Dockerfile despite root directory configuration

**Error Log:**
```
ERROR: failed to build: failed to solve: failed to compute cache key:
failed to calculate checksum of ref: "/backend": not found
```

### Issue 2: Production Dependencies Only
Dockerfile was installing dependencies with `npm ci --only=production`, which excluded devDependencies including TypeScript:

```dockerfile
RUN npm ci --only=production  # ❌ Missing typescript package
```

**Error Log:**
```
> tsc
sh: 1: tsc: not found
ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127
```

### Issue 3: Railway Configuration Conflicts
- `railway.toml` file was conflicting with dashboard settings
- Root directory path had leading slash: `/domains/data-pipeline` instead of `domains/data-pipeline`

## Solution

### Fix 1: Rename Conflicting Dockerfile
```bash
mv Dockerfile Dockerfile.python-backend
```

This ensures Railway finds the correct Dockerfile in `domains/data-pipeline/` when root directory is set.

### Fix 2: Install All Dependencies for Build
Changed Dockerfile line 12:

**Before:**
```dockerfile
RUN npm ci --only=production
```

**After:**
```dockerfile
# Install ALL dependencies (including devDependencies for build)
RUN npm ci
```

This ensures TypeScript and other build tools are available during the build phase.

### Fix 3: Remove railway.toml and Use Dashboard Config
```bash
git rm domains/data-pipeline/railway.toml
```

Let Railway use dashboard configuration exclusively. In Railway dashboard:
- Root Directory: `domains/data-pipeline` (no leading slash)
- Builder: DOCKERFILE (auto-detected)

## Final Working Configuration

### Dockerfile (`domains/data-pipeline/Dockerfile`)
```dockerfile
# Node.js Data Pipeline Dockerfile for Railway
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

### Railway Dashboard Settings
- **Root Directory**: `domains/data-pipeline`
- **Builder**: DOCKERFILE
- **Environment Variables**:
  - `REDIS_URL`: `redis://default:***@redis-10019.c283.us-east-1-4.ec2.redns.redis-cloud.com:10019`
  - `DATABASE_URL`: `postgresql://postgres:***@tramway.proxy.rlwy.net:16396/railway`
  - `API_KEY`: `gayed-signals-dev-key-2024`

## Git Commits
1. `de56ac5` - feat: Create Dockerfile for data-pipeline Railway deployment
2. `2b8549e` - feat: Configure Railway to use Dockerfile for data-pipeline deployment
3. `d8281f2` - chore: rename root Dockerfile to avoid Railway conflict
4. `33ec42c` - chore: remove railway.toml to use dashboard config
5. `1b262be` - fix: install all npm dependencies for TypeScript build in Dockerfile

## Verification
After these fixes, Railway deployment should:
1. ✅ Use correct Node.js Dockerfile
2. ✅ Build TypeScript successfully
3. ✅ Generate Prisma Client
4. ✅ Start with health checks passing

### Fix 4: Add Missing DATABASE_URL Environment Variable
Railway environment was missing the PostgreSQL connection string. Added via Railway MCP:

```bash
railway variables set DATABASE_URL="postgresql://postgres:***@tramway.proxy.rlwy.net:16396/railway"
```

This triggered an automatic restart of the service with the new variable.

### Fix 5: Install OpenSSL for Prisma
Prisma requires OpenSSL library which is not included in `node:20-slim` image.

**Error:**
```
PrismaClientInitializationError: Unable to require(`/app/node_modules/.prisma/client/libquery_engine-debian-openssl-1.1.x.so.node`).
Prisma cannot find the required `libssl` system library in your system.
Details: libssl.so.1.1: cannot open shared object file: No such file or directory
```

**Solution:**
Updated Dockerfile to install OpenSSL before any Prisma operations:

```dockerfile
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# ... rest of Dockerfile
```

This was the **final fix** - after this change, the application deployed successfully!

## Final Deployment Status

### ✅ Successful Deployment
- **URL**: https://gayed-backend-production.up.railway.app
- **Health Endpoint**: https://gayed-backend-production.up.railway.app/health
- **Build Time**: ~2 minutes
- **Container**: Node.js 20-slim with OpenSSL
- **Services Connected**:
  - ✅ PostgreSQL (Railway Database)
  - ✅ Redis Cloud (External)
  - ✅ API Routes Active

### Environment Variables Set
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis Cloud connection string
- `API_KEY`: gayed-signals-dev-key-2024
- `PORT`: Automatically set by Railway

## Lessons Learned
1. **Multiple Dockerfiles**: When you have multiple services with different Dockerfiles, rename non-active ones or use clear directory separation
2. **Production Builds**: Build phase needs devDependencies (TypeScript, build tools), runtime can use production-only
3. **Railway Configuration**: Dashboard settings override CLI/file-based config - keep it simple and use one source of truth
4. **Root Directory Paths**: Use relative paths without leading slashes for Railway root directory setting
5. **Prisma + Slim Images**: Always install OpenSSL when using Prisma with slim Node.js images (`node:20-slim`)
6. **Environment Variables**: Railway requires manual configuration of DATABASE_URL - it's not auto-injected like some other platforms
7. **Sequential Debugging**: Each error revealed the next issue - systematic resolution was key to success
