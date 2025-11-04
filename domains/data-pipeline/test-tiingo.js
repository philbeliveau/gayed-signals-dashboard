const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load .env file from apps/web/.env.local (git-ignored)
const envPath = path.join(__dirname, '../../apps/web/.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn('⚠️ apps/web/.env.local not found. Please copy .env.example to .env.local');
}

// Read API key from environment variable
const API_KEY = process.env.TIINGO_API_KEY;
const symbols = ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', '^VIX'];

// Validate API key is configured
if (!API_KEY) {
  console.error('❌ TIINGO_API_KEY environment variable is not set');
  console.error('   Please ensure apps/web/.env.local contains TIINGO_API_KEY');
  console.error('   Copy apps/web/.env.example to apps/web/.env.local and add your API key');
  process.exit(1);
}

async function testTiingo(symbol) {
  try {
    console.log(`\nTesting ${symbol}...`);
    const response = await axios.get(
      `https://api.tiingo.com/tiingo/daily/${symbol}/prices`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${API_KEY}`
        },
        params: {
          resampleFreq: 'daily',
          columns: 'open,high,low,close,volume',
          startDate: '2024-11-01'
        }
      }
    );
    
    const dataPoints = response.data.length;
    console.log(`✅ ${symbol}: ${dataPoints} data points received`);
    if (dataPoints > 0) {
      console.log(`   Latest: ${response.data[0].date} - Close: $${response.data[0].close}`);
    }
    return true;
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
    return false;
  }
}

(async () => {
  console.log('Testing Tiingo API with all required symbols...\n');
  console.log('Symbols needed for 5 Gayed signals:', symbols.join(', '));
  
  for (const symbol of symbols) {
    await testTiingo(symbol);
    await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
  }
})();
