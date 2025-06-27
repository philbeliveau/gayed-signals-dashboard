/**
 * Example usage of the SignalOrchestrator
 * 
 * This file demonstrates how to use the comprehensive signal orchestrator
 * to calculate all 5 Gayed signals and generate consensus signals.
 */

import { SignalOrchestrator } from '../lib/signals/index.js';
import { MarketData } from '../lib/types.js';

/**
 * Example: Calculate all signals with mock market data
 */
async function exampleSignalCalculation() {
  console.log('=== Gayed Signals Dashboard Example ===\n');

  // 1. Get required symbols
  const requiredSymbols = SignalOrchestrator.getRequiredSymbols();
  console.log('Required symbols:', requiredSymbols);
  console.log(''); 

  // 2. Create mock market data (in real usage, this would come from Yahoo Finance API)
  const marketData: Record<string, MarketData[]> = {};
  
  // Generate mock data for each symbol (300 days of history)
  requiredSymbols.forEach(symbol => {
    const basePrice = getBasePrice(symbol);
    marketData[symbol] = generateMockData(symbol, basePrice, 300);
  });

  console.log('Mock market data generated for all symbols\n');

  // 3. Validate market data
  const validation = SignalOrchestrator.validateMarketData(marketData);
  console.log('Data validation result:');
  console.log('- Valid:', validation.isValid);
  console.log('- Missing symbols:', validation.missingSymbols);
  console.log('- Warnings:', validation.warnings.length);
  
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => console.log('  *', warning));
  }
  console.log('');

  // 4. Calculate all individual signals
  console.log('Calculating individual signals...');
  const signals = SignalOrchestrator.calculateAllSignals(marketData);
  
  console.log('\n=== Individual Signal Results ===');
  signals.forEach((signal, index) => {
    const signalTypes = ['Utilities/SPY', 'Lumber/Gold', 'Treasury Curve', 'VIX Defensive', 'S&P 500 MA'];
    console.log(`\n${signalTypes[index]} Signal:`);
    
    if (signal) {
      console.log(`  Signal: ${signal.signal}`);
      console.log(`  Strength: ${signal.strength}`);
      console.log(`  Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`  Raw Value: ${signal.rawValue.toFixed(4)}`);
      console.log(`  Date: ${signal.date}`);
    } else {
      console.log('  Status: Failed to calculate (insufficient data)');
    }
  });

  // 5. Calculate consensus signal
  console.log('\n=== Calculating Consensus Signal ===');
  const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
  
  console.log('\nConsensus Result:');
  console.log(`  Overall Signal: ${consensus.consensus}`);
  console.log(`  Confidence: ${(consensus.confidence * 100).toFixed(1)}%`);
  console.log(`  Risk-On Count: ${consensus.riskOnCount}`);
  console.log(`  Risk-Off Count: ${consensus.riskOffCount}`);
  console.log(`  Valid Signals: ${consensus.signals.length}/5`);
  console.log(`  Date: ${consensus.date}`);

  // 6. Detailed signal breakdown
  console.log('\n=== Signal Breakdown for Consensus ===');
  consensus.signals.forEach(signal => {
    console.log(`${signal.type}: ${signal.signal} (${signal.strength}, ${(signal.confidence * 100).toFixed(1)}%)`);
  });

  // 7. Market regime interpretation
  console.log('\n=== Market Regime Interpretation ===');
  interpretMarketRegime(consensus);
  
  console.log('\n=== Example Complete ===');
}

/**
 * Get base price for mock data generation
 */
function getBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    'SPY': 400,
    'XLU': 70,
    'WOOD': 25,
    'GLD': 180,
    'IEF': 110,
    'TLT': 120,
    '^VIX': 15
  };
  return basePrices[symbol] || 100;
}

/**
 * Generate mock market data
 */
function generateMockData(symbol: string, basePrice: number, days: number): MarketData[] {
  const data: MarketData[] = [];
  const startDate = new Date('2023-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Generate realistic price movement
    const trend = Math.sin(i / 30) * 0.1; // Long-term trend
    const volatility = (Math.random() - 0.5) * 0.04; // Daily volatility
    const priceChange = trend + volatility;
    
    const close = basePrice * (1 + priceChange + (i / days) * 0.05); // Small upward bias
    
    data.push({
      date: date.toISOString().split('T')[0],
      symbol,
      close: Math.max(close, basePrice * 0.5), // Prevent negative prices
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return data;
}

/**
 * Interpret market regime based on consensus signal
 */
function interpretMarketRegime(consensus: any) {
  const { consensus: signal, confidence, riskOnCount, riskOffCount } = consensus;
  
  if (signal === 'Risk-On') {
    if (confidence > 0.7) {
      console.log('📈 STRONG RISK-ON ENVIRONMENT');
      console.log('   Recommendation: Overweight equities, underweight bonds');
      console.log('   Market appears to be in a strong uptrend with multiple confirming signals');
    } else {
      console.log('📊 MODERATE RISK-ON ENVIRONMENT');
      console.log('   Recommendation: Neutral to slightly overweight equities');
      console.log('   Some mixed signals present, maintain balanced approach');
    }
  } else if (signal === 'Risk-Off') {
    if (confidence > 0.7) {
      console.log('📉 STRONG RISK-OFF ENVIRONMENT');
      console.log('   Recommendation: Underweight equities, overweight defensive assets');
      console.log('   Multiple signals suggesting defensive positioning appropriate');
    } else {
      console.log('⚠️  MODERATE RISK-OFF ENVIRONMENT');
      console.log('   Recommendation: Cautious positioning, reduce risk exposure');
      console.log('   Some mixed signals, but defensive bias warranted');
    }
  } else {
    console.log('🔄 MIXED SIGNAL ENVIRONMENT');
    console.log('   Recommendation: Maintain neutral positioning');
    console.log('   Conflicting signals suggest waiting for clearer direction');
    console.log(`   Signals: ${riskOnCount} Risk-On vs ${riskOffCount} Risk-Off`);
  }
}

/**
 * Example with specific market scenario
 */
async function exampleSpecificScenario() {
  console.log('\n=== Specific Market Scenario Example ===');
  console.log('Simulating a risk-off market environment...\n');

  // Create scenario where most signals point to Risk-Off
  const riskOffScenario: Record<string, MarketData[]> = {};
  const symbols = SignalOrchestrator.getRequiredSymbols();
  
  symbols.forEach(symbol => {
    const basePrice = getBasePrice(symbol);
    const data: MarketData[] = [];
    const startDate = new Date('2023-01-01');
    
    for (let i = 0; i < 100; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      let priceMultiplier = 1;
      
      // Create risk-off scenario patterns
      if (symbol === 'XLU') {
        // Utilities outperforming (risk-off)
        priceMultiplier = 1 + (i / 100) * 0.05;
      } else if (symbol === 'SPY') {
        // SPY underperforming utilities
        priceMultiplier = 1 + (i / 100) * 0.02;
      } else if (symbol === 'WOOD') {
        // Lumber underperforming gold (risk-off)
        priceMultiplier = 1 - (i / 100) * 0.03;
      } else if (symbol === 'GLD') {
        // Gold outperforming lumber
        priceMultiplier = 1 + (i / 100) * 0.04;
      } else if (symbol === '^VIX') {
        // Low VIX suggesting defensive positioning
        priceMultiplier = 0.8; // VIX at 12 (low)
      } else if (symbol === 'TLT') {
        // Long bonds outperforming (risk-off)
        priceMultiplier = 1 + (i / 100) * 0.06;
      } else if (symbol === 'IEF') {
        // Medium bonds underperforming long bonds
        priceMultiplier = 1 + (i / 100) * 0.03;
      }
      
      const close = basePrice * priceMultiplier;
      
      data.push({
        date: date.toISOString().split('T')[0],
        symbol,
        close,
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
    }
    
    riskOffScenario[symbol] = data;
  });

  // Calculate signals for risk-off scenario
  const signals = SignalOrchestrator.calculateAllSignals(riskOffScenario);
  const consensus = SignalOrchestrator.calculateConsensusSignal(signals);
  
  console.log('Risk-Off Scenario Results:');
  console.log(`  Consensus: ${consensus.consensus}`);
  console.log(`  Confidence: ${(consensus.confidence * 100).toFixed(1)}%`);
  console.log(`  Risk-On Signals: ${consensus.riskOnCount}`);
  console.log(`  Risk-Off Signals: ${consensus.riskOffCount}`);
  
  interpretMarketRegime(consensus);
}

// Run examples
async function runExamples() {
  try {
    await exampleSignalCalculation();
    await exampleSpecificScenario();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in other files
export { exampleSignalCalculation, exampleSpecificScenario };

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
}