const axios = require('axios');

const API_KEY = '36181da7f5290c0544e9cc0b3b5f19249eb69a61';
const symbols = ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', '^VIX'];

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
