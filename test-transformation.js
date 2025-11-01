// Test Railway data transformation
const railwayResponse = {
  "success": true,
  "data": [
    {
      "id": 1,
      "signalName": "utilities_spy",
      "signalType": "timing",
      "calculationDate": "2025-11-01T16:44:19.529Z",
      "calculationTimestamp": "2025-11-01T16:44:19.529Z",
      "signalValue": 0.9946827135655487,
      "signalStrength": 0.5,
      "confidenceScore": 0.05317286434451285,
      "dataQualityScore": 0.9,
      "signalStatus": "risk_on",
      "statusChanged": false
    },
    {
      "id": 2,
      "signalName": "lumber_gold",
      "signalType": "timing",
      "calculationDate": "2025-11-01T16:44:19.529Z",
      "calculationTimestamp": "2025-11-01T16:44:19.529Z",
      "signalValue": 0.7869825119273628,
      "signalStrength": 1,
      "confidenceScore": 1,
      "dataQualityScore": 0.9,
      "signalStatus": "risk_off",
      "statusChanged": false
    }
  ],
  "metadata": {
    "count": 5,
    "timing": {
      "cached": false
    }
  }
};

// Transformation functions from signals-client.ts
function formatSignalName(name) {
  const nameMap = {
    'utilities_spy': 'Utilities/SPY Ratio',
    'lumber_gold': 'Lumber/Gold Ratio',
    'treasury_curve': 'Treasury Curve Slope',
    'vix_defensive': 'VIX Defensive Signal',
    'sp500_ma': 'S&P 500 Moving Average',
  };
  return nameMap[name] || name.replace(/_/g, ' ').toUpperCase();
}

function generateSignalDescription(signal) {
  const status = signal.signalStatus.replace('_', '-');
  return `${formatSignalName(signal.signalName)} is showing ${status} with ${(signal.confidenceScore * 100).toFixed(0)}% confidence (quality: ${(signal.dataQualityScore * 100).toFixed(0)}%)`;
}

function transformRailwaySignal(railwaySignal) {
  const statusMap = {
    'risk_on': 'Risk-On',
    'risk_off': 'Risk-Off',
    'neutral': 'Neutral',
  };

  let strength = 'Moderate';
  if (railwaySignal.signalStrength < 0.4) strength = 'Weak';
  else if (railwaySignal.signalStrength > 0.7) strength = 'Strong';

  return {
    id: railwaySignal.id?.toString() || railwaySignal.signalName,
    name: formatSignalName(railwaySignal.signalName),
    type: railwaySignal.signalName,
    signal: statusMap[railwaySignal.signalStatus] || 'Neutral',
    strength,
    confidence: railwaySignal.confidenceScore,
    value: railwaySignal.signalValue,
    description: generateSignalDescription(railwaySignal),
    timestamp: railwaySignal.calculationTimestamp || railwaySignal.calculationDate,
  };
}

// Test transformation
console.log('=== RAILWAY RESPONSE ===');
console.log(JSON.stringify(railwayResponse.data[0], null, 2));

console.log('\n=== TRANSFORMED SIGNAL ===');
const transformed = transformRailwaySignal(railwayResponse.data[0]);
console.log(JSON.stringify(transformed, null, 2));

console.log('\n=== ALL TRANSFORMED SIGNALS ===');
const allTransformed = railwayResponse.data.map(transformRailwaySignal);
allTransformed.forEach(signal => {
  console.log(`${signal.name}: ${signal.signal} (${signal.strength}) - ${signal.confidence.toFixed(2)} confidence`);
});

// Test consensus calculation
const riskOnCount = allTransformed.filter(s => s.signal === 'Risk-On').length;
const riskOffCount = allTransformed.filter(s => s.signal === 'Risk-Off').length;
const totalSignals = allTransformed.length;

let consensus = 'Mixed';
if (riskOnCount > totalSignals / 2) consensus = 'Risk-On';
else if (riskOffCount > totalSignals / 2) consensus = 'Risk-Off';

const confidence = Math.max(riskOnCount, riskOffCount) / totalSignals;

console.log('\n=== CONSENSUS ===');
console.log(`Consensus: ${consensus}`);
console.log(`Confidence: ${(confidence * 100).toFixed(0)}%`);
console.log(`Risk-On: ${riskOnCount}, Risk-Off: ${riskOffCount}, Total: ${totalSignals}`);
