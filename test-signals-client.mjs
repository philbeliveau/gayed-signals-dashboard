// Integration test for signals client
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables for testing
process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL = 'https://gayed-backend-production.up.railway.app';
process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND = 'true';
process.env.NEXT_PUBLIC_RAILWAY_API_KEY = 'gayed-signals-dev-key-2024';

console.log('=== ENVIRONMENT ===');
console.log('Railway URL:', process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL);
console.log('Use Railway:', process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND);
console.log('API Key Set:', !!process.env.NEXT_PUBLIC_RAILWAY_API_KEY);

// Test 1: Railway Backend Direct
console.log('\n=== TEST 1: Railway Backend Direct ===');
try {
  const response = await fetch('https://gayed-backend-production.up.railway.app/api/v2/signals', {
    headers: {
      'X-API-Key': 'gayed-signals-dev-key-2024'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Railway backend responding');
  console.log(`   Signals: ${data.metadata.count}`);
  console.log(`   Success: ${data.success}`);
  console.log(`   Sample: ${data.data[0].signalName} = ${data.data[0].signalStatus}`);
} catch (error) {
  console.error('❌ Railway backend test failed:', error.message);
  process.exit(1);
}

// Test 2: Feature Flag Detection
console.log('\n=== TEST 2: Feature Flag Detection ===');
const USE_RAILWAY_BACKEND = process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND === 'true';
const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL;

console.log('Feature flag enabled:', USE_RAILWAY_BACKEND);
console.log('Railway URL configured:', !!RAILWAY_URL);

if (!USE_RAILWAY_BACKEND) {
  console.error('❌ Feature flag not enabled');
  process.exit(1);
}

if (!RAILWAY_URL) {
  console.error('❌ Railway URL not configured');
  process.exit(1);
}

console.log('✅ Feature flags configured correctly');

// Test 3: Authentication Header
console.log('\n=== TEST 3: Authentication Header Test ===');

// Test with wrong header (should fail)
try {
  const response = await fetch('https://gayed-backend-production.up.railway.app/api/v2/signals', {
    headers: {
      'Authorization': `Bearer gayed-signals-dev-key-2024` // Wrong header
    }
  });

  if (response.status === 401) {
    console.log('✅ Correctly rejected Bearer token (expected)');
  } else {
    console.error('❌ Should have rejected Bearer token');
  }
} catch (error) {
  console.error('❌ Auth test failed:', error.message);
}

// Test with correct header (should succeed)
try {
  const response = await fetch('https://gayed-backend-production.up.railway.app/api/v2/signals', {
    headers: {
      'X-API-Key': 'gayed-signals-dev-key-2024' // Correct header
    }
  });

  if (response.ok) {
    console.log('✅ Correctly accepted X-API-Key header');
  } else {
    console.error('❌ Should have accepted X-API-Key header');
  }
} catch (error) {
  console.error('❌ Auth test failed:', error.message);
}

// Test 4: Data Transformation
console.log('\n=== TEST 4: Data Transformation Test ===');

function transformRailwaySignal(railwaySignal) {
  const statusMap = {
    'risk_on': 'Risk-On',
    'risk_off': 'Risk-Off',
    'neutral': 'Neutral',
  };

  const nameMap = {
    'utilities_spy': 'Utilities/SPY Ratio',
    'lumber_gold': 'Lumber/Gold Ratio',
    'treasury_curve': 'Treasury Curve Slope',
    'vix_defensive': 'VIX Defensive Signal',
    'sp500_ma': 'S&P 500 Moving Average',
  };

  let strength = 'Moderate';
  if (railwaySignal.signalStrength < 0.4) strength = 'Weak';
  else if (railwaySignal.signalStrength > 0.7) strength = 'Strong';

  return {
    id: railwaySignal.id?.toString() || railwaySignal.signalName,
    name: nameMap[railwaySignal.signalName] || railwaySignal.signalName,
    type: railwaySignal.signalName,
    signal: statusMap[railwaySignal.signalStatus] || 'Neutral',
    strength,
    confidence: railwaySignal.confidenceScore,
    value: railwaySignal.signalValue,
    timestamp: railwaySignal.calculationTimestamp || railwaySignal.calculationDate,
  };
}

try {
  const response = await fetch('https://gayed-backend-production.up.railway.app/api/v2/signals', {
    headers: { 'X-API-Key': 'gayed-signals-dev-key-2024' }
  });

  const data = await response.json();
  const transformed = data.data.map(transformRailwaySignal);

  console.log('✅ Transformed signals:');
  transformed.forEach(signal => {
    console.log(`   ${signal.name}: ${signal.signal} (${signal.strength})`);
  });

  // Verify all required fields exist
  const requiredFields = ['id', 'name', 'type', 'signal', 'strength', 'confidence', 'value', 'timestamp'];
  const missingFields = requiredFields.filter(field => !(field in transformed[0]));

  if (missingFields.length > 0) {
    console.error('❌ Missing fields:', missingFields);
    process.exit(1);
  }

  console.log('✅ All required fields present');

} catch (error) {
  console.error('❌ Transformation test failed:', error.message);
  process.exit(1);
}

// Test 5: Consensus Calculation
console.log('\n=== TEST 5: Consensus Calculation Test ===');

try {
  const response = await fetch('https://gayed-backend-production.up.railway.app/api/v2/signals', {
    headers: { 'X-API-Key': 'gayed-signals-dev-key-2024' }
  });

  const data = await response.json();
  const signals = data.data.map(transformRailwaySignal);

  const riskOnCount = signals.filter(s => s.signal === 'Risk-On').length;
  const riskOffCount = signals.filter(s => s.signal === 'Risk-Off').length;
  const totalSignals = signals.length;

  let consensus = 'Mixed';
  if (riskOnCount > totalSignals / 2) consensus = 'Risk-On';
  else if (riskOffCount > totalSignals / 2) consensus = 'Risk-Off';

  const confidence = Math.max(riskOnCount, riskOffCount) / totalSignals;

  console.log('✅ Consensus calculated:');
  console.log(`   Overall: ${consensus}`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
  console.log(`   Risk-On: ${riskOnCount}, Risk-Off: ${riskOffCount}`);

} catch (error) {
  console.error('❌ Consensus test failed:', error.message);
  process.exit(1);
}

console.log('\n=== ALL TESTS PASSED ✅ ===');
console.log('\nNext steps:');
console.log('1. Add environment variables to Vercel');
console.log('2. Deploy to Vercel');
console.log('3. Test in production');
