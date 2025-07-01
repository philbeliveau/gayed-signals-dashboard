#!/usr/bin/env node
/**
 * Configuration Validator - Ensures all services are correctly configured
 */

const fs = require('fs');

// Load environment variables  
require('dotenv').config({ path: '.env.local' });

// Use built-in fetch (Node.js 18+) or create simple alternative
const fetch = globalThis.fetch || (async (url, options = {}) => {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    if (options.timeout) {
      req.setTimeout(options.timeout, () => req.destroy(new Error('timeout')));
    }
    req.end();
  });
});

const REQUIRED_SERVICES = {
  'Frontend (Next.js)': {
    port: 3000,
    url: 'http://localhost:3000',
    healthEndpoint: '/api/health'
  },
  'Video Insights API': {
    port: process.env.FASTAPI_BASE_URL?.match(/:(\d+)/)?.[1] || '8002',
    url: process.env.FASTAPI_BASE_URL || 'http://localhost:8002',
    healthEndpoint: '/health'
  },
  'Economic Data API': {
    port: process.env.PYTHON_BACKEND_URL?.match(/:(\d+)/)?.[1] || '8000',
    url: process.env.PYTHON_BACKEND_URL || 'http://localhost:8000',
    healthEndpoint: '/api/v1/economic/housing/summary'
  },
  'PostgreSQL': {
    port: '5433',
    url: 'localhost:5433',
    healthEndpoint: null // Can't check via HTTP
  }
};

async function validateService(name, config) {
  console.log(`\n🔍 Validating ${name}:`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Port: ${config.port}`);
  
  if (!config.healthEndpoint) {
    console.log(`   ⚠️  Cannot validate via HTTP (database service)`);
    return { name, status: 'skip', reason: 'No HTTP endpoint' };
  }
  
  try {
    const response = await fetch(`${config.url}${config.healthEndpoint}`, {
      timeout: 5000,
      headers: { 'Authorization': 'dev-token' } // For authenticated endpoints
    });
    
    if (response.ok) {
      const data = await response.text();
      console.log(`   ✅ HEALTHY - Response: ${response.status}`);
      return { name, status: 'healthy', port: config.port };
    } else {
      console.log(`   ❌ UNHEALTHY - Status: ${response.status}`);
      return { name, status: 'unhealthy', port: config.port, statusCode: response.status };
    }
  } catch (error) {
    console.log(`   💥 ERROR - ${error.message}`);
    return { name, status: 'error', port: config.port, error: error.message };
  }
}

async function checkEnvironmentFile() {
  console.log(`📋 Checking .env.local configuration:`);
  
  const requiredVars = [
    'FASTAPI_BASE_URL',
    'PYTHON_BACKEND_URL', 
    'TIINGO_API_KEY',
    'FRED_API_KEY'
  ];
  
  const missing = [];
  const placeholder = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
      console.log(`   ❌ ${varName}: MISSING`);
    } else if (value.includes('your_') || value.includes('placeholder')) {
      placeholder.push(varName);
      console.log(`   ⚠️  ${varName}: PLACEHOLDER VALUE`);
    } else {
      console.log(`   ✅ ${varName}: SET`);
    }
  }
  
  return { missing, placeholder };
}

async function validatePortConfiguration() {
  console.log(`\n🔌 Port Configuration Analysis:`);
  
  const frontendUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8002';
  const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
  
  console.log(`   Frontend → Backend: ${frontendUrl}`);
  console.log(`   Backend Service: ${backendUrl}`);
  
  const frontendPort = frontendUrl.match(/:(\d+)/)?.[1];
  const backendPort = backendUrl.match(/:(\d+)/)?.[1];
  
  if (frontendPort === backendPort) {
    console.log(`   ⚠️  WARNING: Frontend and backend pointing to same port (${frontendPort})`);
    return false;
  } else {
    console.log(`   ✅ Different ports configured correctly`);
    return true;
  }
}

async function main() {
  console.log(`🛡️  CONFIGURATION VALIDATOR\n`);
  console.log(`=`.repeat(50));
  
  // Check environment file
  const envCheck = await checkEnvironmentFile();
  
  // Check port configuration
  const portsOk = await validatePortConfiguration();
  
  // Validate all services
  const results = [];
  for (const [name, config] of Object.entries(REQUIRED_SERVICES)) {
    const result = await validateService(name, config);
    results.push(result);
  }
  
  // Summary
  console.log(`\n📊 VALIDATION SUMMARY:`);
  console.log(`=`.repeat(50));
  
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.filter(r => r.status !== 'skip').length;
  
  console.log(`Services: ${healthy}/${total} healthy`);
  console.log(`Environment: ${envCheck.missing.length} missing, ${envCheck.placeholder.length} placeholders`);
  console.log(`Port Config: ${portsOk ? 'OK' : 'NEEDS ATTENTION'}`);
  
  if (healthy === total && envCheck.missing.length === 0 && portsOk) {
    console.log(`\n🎉 ALL SYSTEMS OPERATIONAL!`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  CONFIGURATION ISSUES DETECTED`);
    
    if (envCheck.missing.length > 0) {
      console.log(`Missing environment variables: ${envCheck.missing.join(', ')}`);
    }
    
    if (envCheck.placeholder.length > 0) {
      console.log(`Placeholder values: ${envCheck.placeholder.join(', ')}`);
    }
    
    const failed = results.filter(r => r.status === 'error' || r.status === 'unhealthy');
    if (failed.length > 0) {
      console.log(`Failed services: ${failed.map(f => f.name).join(', ')}`);
    }
    
    process.exit(1);
  }
}

main().catch(console.error);