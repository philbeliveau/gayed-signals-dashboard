/**
 * SAFLA Integration Example
 * 
 * Demonstrates how to use the SAFLA (Safety-First Lightweight Architecture) 
 * validator with the SignalOrchestrator for production-grade financial calculations.
 */

import { SignalOrchestrator } from '../lib/signals';
import { SAFLAValidator, ValidationConfig } from '../lib/safety/safla-validator';
import { MarketData } from '../lib/types';

// Sample market data for demonstration
const sampleMarketData: Record<string, MarketData[]> = {
  'SPY': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'SPY',
    close: 400 + Math.sin(i / 20) * 50 + (Math.random() - 0.5) * 10
  })),
  'XLU': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'XLU',
    close: 60 + Math.sin((i + 10) / 25) * 15 + (Math.random() - 0.5) * 5
  })),
  'WOOD': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'WOOD',
    close: 80 + Math.sin((i + 20) / 15) * 25 + (Math.random() - 0.5) * 8
  })),
  'GLD': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'GLD',
    close: 160 + Math.sin((i + 30) / 30) * 20 + (Math.random() - 0.5) * 6
  })),
  'IEF': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'IEF',
    close: 100 + Math.sin((i + 40) / 35) * 10 + (Math.random() - 0.5) * 3
  })),
  'TLT': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: 'TLT',
    close: 120 + Math.sin((i + 50) / 40) * 20 + (Math.random() - 0.5) * 4
  })),
  '^VIX': Array.from({ length: 300 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    symbol: '^VIX',
    close: 15 + Math.abs(Math.sin(i / 10)) * 20 + (Math.random() - 0.5) * 5
  }))
};

/**
 * Example 1: Basic SAFLA Validation
 */
async function basicSaflaExample() {
  console.log('\n=== Example 1: Basic SAFLA Validation ===');
  
  try {
    // Quick safety check
    const quickCheck = SignalOrchestrator.quickSafetyCheck(sampleMarketData);
    console.log('Quick Safety Check:', quickCheck);

    // Full SAFLA validation with signals
    const result = await SignalOrchestrator.calculateSignalsWithSafety(sampleMarketData);
    
    console.log('Safety Status:', result.safetyReport.overallStatus);
    console.log('Risk Score:', result.safetyReport.riskScore);
    console.log('Used Safe Defaults:', result.usedSafeDefaults);
    console.log('Valid Signals:', result.signals.filter(s => s !== null).length);
    console.log('Consensus:', result.consensus.consensus, 'with confidence', result.consensus.confidence);
    
    if (result.safetyReport.recommendations.length > 0) {
      console.log('Recommendations:', result.safetyReport.recommendations);
    }
    
  } catch (error) {
    console.error('Basic SAFLA Example Error:', error);
  }
}

/**
 * Example 2: Production-Grade Orchestration
 */
async function productionOrchestrationExample() {
  console.log('\n=== Example 2: Production-Grade Orchestration ===');
  
  const productionConfig: Partial<ValidationConfig> = {
    minDataPoints: 50, // Lower requirement for demo
    maxDataAge: 48, // 48 hours tolerance
    maxDailyChangePercent: 20, // 20% max daily change
    minConfidenceThreshold: 0.1,
    maxConsecutiveFailures: 2,
    cooldownPeriod: 1 // 1 minute cooldown
  };

  try {
    const result = await SignalOrchestrator.orchestrateSignalsProduction(sampleMarketData, {
      safetyConfig: productionConfig,
      enableFallbacks: true,
      logLevel: 'info',
      maxRetries: 1
    });

    console.log('Production Results:', {
      signalCount: result.signals.filter(s => s !== null).length,
      consensusType: result.consensus.consensus,
      consensusConfidence: result.consensus.confidence,
      processingTime: result.metadata.processingTime + 'ms',
      usedSafeDefaults: result.metadata.usedSafeDefaults,
      dataQuality: result.metadata.dataQuality
    });

    console.log('Safety Report Summary:', {
      overallStatus: result.metadata.safetyReport.overallStatus,
      riskScore: result.metadata.safetyReport.riskScore,
      validationCount: result.metadata.safetyReport.validationResults.length,
      circuitBreakerStatus: result.metadata.safetyReport.circuitBreakerStatus
    });

  } catch (error) {
    console.error('Production Orchestration Error:', error);
  }
}

/**
 * Example 3: Handling Bad Data
 */
async function badDataExample() {
  console.log('\n=== Example 3: Handling Bad Data ===');
  
  // Create problematic data
  const badData: Record<string, MarketData[]> = {
    'SPY': [
      { date: '2023-01-01', symbol: 'SPY', close: NaN }, // Invalid price
      { date: '2023-01-02', symbol: 'SPY', close: -100 }, // Negative price
      { date: '2023-01-03', symbol: 'SPY', close: 5000 }, // Unrealistic price
      ...Array.from({ length: 10 }, (_, i) => ({
        date: `2023-01-${4 + i}`,
        symbol: 'SPY',
        close: 400 + i
      }))
    ],
    '^VIX': [
      { date: '2023-01-01', symbol: '^VIX', close: 80 } // Extreme VIX
    ]
  };

  try {
    const result = await SignalOrchestrator.calculateSignalsWithSafety(badData, undefined, true);
    
    console.log('Bad Data Handling Results:', {
      usedSafeDefaults: result.usedSafeDefaults,
      safetyStatus: result.safetyReport.overallStatus,
      riskScore: result.safetyReport.riskScore,
      errorCount: result.safetyReport.validationResults.filter(r => r.severity === 'error').length,
      criticalCount: result.safetyReport.validationResults.filter(r => r.severity === 'critical').length
    });

    // Show some specific validation issues
    const criticalIssues = result.safetyReport.validationResults
      .filter(r => r.severity === 'critical' || r.severity === 'error')
      .slice(0, 3);
    
    console.log('Sample Critical Issues:');
    criticalIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.category}: ${issue.message}`);
    });

  } catch (error) {
    console.error('Bad Data Example Error:', error);
  }
}

/**
 * Example 4: Custom SAFLA Configuration
 */
async function customConfigExample() {
  console.log('\n=== Example 4: Custom SAFLA Configuration ===');
  
  // Strict configuration for high-stakes trading
  const strictConfig: Partial<ValidationConfig> = {
    minDataPoints: 250,
    maxDataAge: 6, // 6 hours max
    maxMissingDataPercent: 2, // Only 2% missing data allowed
    maxDailyChangePercent: 15, // Stricter daily change limit
    minConfidenceThreshold: 0.3, // Higher confidence requirement
    maxSignalDeviation: 3.0, // Tighter signal bounds
    maxConsecutiveFailures: 1, // Immediate circuit breaker
    cooldownPeriod: 10, // 10 minute cooldown
    maxValidationsPerMinute: 50,
    maxValidationsPerHour: 500
  };

  try {
    const validator = SAFLAValidator.getInstance(strictConfig);
    
    // Test data integrity validation
    const dataIntegrityResults = validator.validateDataIntegrity(sampleMarketData);
    console.log('Data Integrity (Strict):', {
      totalChecks: dataIntegrityResults.length,
      warnings: dataIntegrityResults.filter(r => r.severity === 'warning').length,
      errors: dataIntegrityResults.filter(r => r.severity === 'error').length
    });

    // Test with strict config
    const result = await SignalOrchestrator.calculateSignalsWithSafety(
      sampleMarketData, 
      strictConfig, 
      true
    );
    
    console.log('Strict Validation Results:', {
      overallStatus: result.safetyReport.overallStatus,
      riskScore: result.safetyReport.riskScore,
      recommendations: result.safetyReport.recommendations.length,
      usedSafeDefaults: result.usedSafeDefaults
    });

  } catch (error) {
    console.error('Custom Config Example Error:', error);
  }
}

/**
 * Example 5: Circuit Breaker and Rate Limiting
 */
async function circuitBreakerExample() {
  console.log('\n=== Example 5: Circuit Breaker and Rate Limiting ===');
  
  const sensitiveConfig: Partial<ValidationConfig> = {
    maxConsecutiveFailures: 2,
    cooldownPeriod: 0.1, // 6 seconds for demo
    maxValidationsPerMinute: 3 // Very low for demo
  };

  // Create data that will cause failures
  const failureData: Record<string, MarketData[]> = {
    'SPY': [{ date: '2023-01-01', symbol: 'SPY', close: NaN }]
  };

  try {
    console.log('Testing circuit breaker with repeated failures...');
    
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`Attempt ${i}:`);
        await SignalOrchestrator.calculateSignalsWithSafety(failureData, sensitiveConfig, false);
      } catch (error) {
        console.log(`  Failed: ${error instanceof Error ? error.name : 'Unknown error'}`);
        
        // Add delay between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error('Circuit Breaker Example Error:', error);
  }
}

/**
 * Example 6: Audit Trail and Monitoring
 */
async function auditTrailExample() {
  console.log('\n=== Example 6: Audit Trail and Monitoring ===');
  
  try {
    const result = await SignalOrchestrator.calculateSignalsWithSafety(sampleMarketData);
    
    console.log('Audit Trail Entries:');
    result.safetyReport.auditTrail.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.timestamp}: ${entry.operation} - ${entry.result}`);
    });

    // Demonstrate validation result details
    console.log('\nDetailed Validation Results:');
    const importantResults = result.safetyReport.validationResults
      .filter(r => r.severity !== 'info')
      .slice(0, 5);
    
    importantResults.forEach((result, index) => {
      console.log(`  ${index + 1}. [${result.severity.toUpperCase()}] ${result.category}:`);
      console.log(`     ${result.message}`);
      if (result.correctionSuggestion) {
        console.log(`     Suggestion: ${result.correctionSuggestion}`);
      }
    });

  } catch (error) {
    console.error('Audit Trail Example Error:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('SAFLA (Safety-First Lightweight Architecture) Integration Examples');
  console.log('================================================================');
  
  await basicSaflaExample();
  await productionOrchestrationExample();
  await badDataExample();
  await customConfigExample();
  await circuitBreakerExample();
  await auditTrailExample();
  
  console.log('\n=== Examples Complete ===');
}

// Export for use in other files
export {
  basicSaflaExample,
  productionOrchestrationExample,
  badDataExample,
  customConfigExample,
  circuitBreakerExample,
  auditTrailExample,
  runAllExamples,
  sampleMarketData
};

// Run examples if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}