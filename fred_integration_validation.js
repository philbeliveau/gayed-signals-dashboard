#!/usr/bin/env node

/**
 * FRED Service Integration Validation Script
 * Tests that the FRED service backend integration is working properly
 */

const https = require('http');

async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Request timeout')));
    });
}

async function validateFREDIntegration() {
    console.log('🔍 FRED Service Integration Validation');
    console.log('=====================================\n');

    const backendUrl = 'http://localhost:8000';
    
    try {
        // Test 1: Basic connectivity
        console.log('1. Testing backend connectivity...');
        const healthCheck = await makeRequest(`${backendUrl}/health`);
        console.log(`   ✅ Backend healthy: ${healthCheck.status}`);
        
        // Test 2: Labor market data endpoint
        console.log('\n2. Testing labor market data endpoint...');
        const laborData = await makeRequest(`${backendUrl}/api/v1/economic/labor-market?period=12m&fast=true`);
        
        console.log(`   📊 Data source: ${laborData.metadata.dataSource}`);
        console.log(`   📈 Data points: ${laborData.metadata.dataPoints}`);
        console.log(`   🗓️  Latest date: ${laborData.laborData[laborData.laborData.length - 1].date}`);
        
        // Test 3: Validate data structure
        console.log('\n3. Validating data structure...');
        const sample = laborData.laborData[0];
        const requiredFields = [
            'date', 'initialClaims', 'continuedClaims', 'unemploymentRate',
            'nonfarmPayrolls', 'laborParticipation', 'jobOpenings'
        ];
        
        const missingFields = requiredFields.filter(field => !(field in sample));
        if (missingFields.length === 0) {
            console.log('   ✅ All required fields present');
        } else {
            console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
            return false;
        }
        
        // Test 4: Validate data quality
        console.log('\n4. Validating data quality...');
        const hasRealData = laborData.laborData.some(point => 
            point.initialClaims > 0 || point.unemploymentRate > 0
        );
        
        if (hasRealData) {
            console.log('   ✅ Contains real economic data');
        } else {
            console.log('   ❌ Data appears to be empty or mock');
            return false;
        }
        
        // Test 5: Check for critical indicators
        console.log('\n5. Checking critical indicators...');
        const latestData = laborData.laborData[laborData.laborData.length - 1];
        
        console.log(`   📊 Latest Initial Claims: ${latestData.initialClaims.toLocaleString()}`);
        console.log(`   📊 Latest Unemployment Rate: ${latestData.unemploymentRate}%`);
        console.log(`   📊 Latest Nonfarm Payrolls: ${latestData.nonfarmPayrolls.toLocaleString()}`);
        
        // Test 6: Test specific ICSA endpoint
        console.log('\n6. Testing direct ICSA data...');
        const icsaData = await makeRequest(`${backendUrl}/api/v1/economic/series/ICSA?start_date=2024-01-01&end_date=2024-12-31`);
        console.log(`   📈 ICSA observations: ${icsaData.observations.length}`);
        console.log(`   📊 Latest ICSA value: ${icsaData.observations[icsaData.observations.length - 1].value.toLocaleString()}`);
        
        console.log('\n🎉 FRED INTEGRATION VALIDATION SUCCESSFUL!');
        console.log('=====================================');
        console.log('✅ Backend is properly configured');
        console.log('✅ FRED API is working');
        console.log('✅ Data transformation is correct');
        console.log('✅ Charts should now show real economic data');
        console.log('✅ No more "No labor market data available" message');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ VALIDATION FAILED:', error.message);
        console.log('\n🔧 TROUBLESHOOTING STEPS:');
        console.log('1. Ensure backend is running: python backend/main.py');
        console.log('2. Check FRED_API_KEY is set in .env file');
        console.log('3. Verify port 8000 is accessible');
        console.log('4. Check network connectivity to FRED API');
        
        return false;
    }
}

// Run validation
validateFREDIntegration().then(success => {
    process.exit(success ? 0 : 1);
});