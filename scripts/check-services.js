#!/usr/bin/env node
/**
 * Service Discovery Script - Automatically detect and validate backend services
 */

const fetch = require('node-fetch');

const POTENTIAL_PORTS = [8000, 8001, 8002, 8003];
const SERVICE_ENDPOINTS = {
  'video-insights': '/health',
  'economic-data': '/api/v1/economic/housing/summary'
};

async function checkService(port, endpoint) {
  try {
    const response = await fetch(`http://localhost:${port}${endpoint}`, {
      timeout: 3000
    });
    
    if (response.ok) {
      const data = await response.json();
      return { port, status: 'healthy', data };
    }
  } catch (error) {
    return { port, status: 'error', error: error.message };
  }
  return { port, status: 'unavailable' };
}

async function discoverServices() {
  console.log('🔍 Discovering backend services...\n');
  
  for (const port of POTENTIAL_PORTS) {
    console.log(`Checking port ${port}:`);
    
    for (const [serviceName, endpoint] of Object.entries(SERVICE_ENDPOINTS)) {
      const result = await checkService(port, endpoint);
      
      if (result.status === 'healthy') {
        console.log(`  ✅ ${serviceName}: FOUND`);
        if (serviceName === 'video-insights') {
          console.log(`\n🎯 Video Insights Service Found!`);
          console.log(`   Update .env.local:`);
          console.log(`   FASTAPI_BASE_URL=http://localhost:${port}\n`);
        }
      } else {
        console.log(`  ❌ ${serviceName}: ${result.status}`);
      }
    }
    console.log('');
  }
}

// Run discovery
discoverServices().catch(console.error);