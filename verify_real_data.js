#!/usr/bin/env node

/**
 * FRED API Data Verification Script
 * 
 * This script verifies that the labor and housing API endpoints
 * are returning REAL FRED data instead of mock data.
 * 
 * It compares the API responses with the verification data files
 * to ensure data authenticity.
 */

const fs = require('fs');
const path = require('path');

async function verifyRealData() {
  console.log('🔍 FRED API Data Verification Starting...\n');
  
  // Test the API endpoints
  const baseUrl = 'http://localhost:3000'; // Adjust if needed
  
  try {
    // Test Labor API
    console.log('👥 Testing Labor API...');
    const laborResponse = await fetch(`${baseUrl}/api/labor?period=12m&fast=false`);
    
    if (!laborResponse.ok) {
      console.log('❌ Labor API not responding:', laborResponse.status);
      return false;
    }
    
    const laborData = await laborResponse.json();
    console.log('📊 Labor API Response Structure:');
    console.log('  - Keys:', Object.keys(laborData));
    console.log('  - Time Series Length:', laborData.timeSeries?.length || 0);
    console.log('  - Data Source:', laborData.metadata?.dataSource || 'unknown');
    console.log('  - Sample Data Point:', laborData.timeSeries?.[0] || null);
    
    // Test Housing API
    console.log('\n🏠 Testing Housing API...');
    const housingResponse = await fetch(`${baseUrl}/api/housing?period=12m&fast=false`);
    
    if (!housingResponse.ok) {
      console.log('❌ Housing API not responding:', housingResponse.status);
      return false;
    }
    
    const housingData = await housingResponse.json();
    console.log('📊 Housing API Response Structure:');
    console.log('  - Keys:', Object.keys(housingData));
    console.log('  - Time Series Length:', housingData.timeSeries?.length || 0);
    console.log('  - Data Source:', housingData.metadata?.dataSource || 'unknown');
    console.log('  - Sample Data Point:', housingData.timeSeries?.[0] || null);
    
    // Load verification data files
    console.log('\n📋 Loading Verification Data...');
    const verificationPath = path.join(__dirname, 'verification-data', 'FRED');
    
    const unrateData = loadCSV(path.join(verificationPath, 'UNRATE.csv'));
    const icsaData = loadCSV(path.join(verificationPath, 'ICSA.csv'));
    const csushpiData = loadCSV(path.join(verificationPath, 'CSUSHPINSA.csv'));
    
    console.log('📈 Verification Data Loaded:');
    console.log('  - UNRATE (Unemployment):', unrateData.length, 'points');
    console.log('  - ICSA (Initial Claims):', icsaData.length, 'points');
    console.log('  - CSUSHPINSA (House Prices):', csushpiData.length, 'points');
    
    // Verify Labor Data Authenticity
    console.log('\n🔍 Verifying Labor Data Authenticity...');
    const laborVerification = verifyLaborData(laborData, unrateData, icsaData);
    
    // Verify Housing Data Authenticity
    console.log('\n🔍 Verifying Housing Data Authenticity...');
    const housingVerification = verifyHousingData(housingData, csushpiData);
    
    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('==========================================');
    console.log('Labor API Data Source:', laborData.metadata?.dataSource || 'unknown');
    console.log('Housing API Data Source:', housingData.metadata?.dataSource || 'unknown');
    console.log('Labor Data Authentic:', laborVerification.isAuthentic ? '✅ YES' : '❌ NO');
    console.log('Housing Data Authentic:', housingVerification.isAuthentic ? '✅ YES' : '❌ NO');
    
    if (laborVerification.issues.length > 0) {
      console.log('\n⚠️ Labor Data Issues:');
      laborVerification.issues.forEach(issue => console.log('  -', issue));
    }
    
    if (housingVerification.issues.length > 0) {
      console.log('\n⚠️ Housing Data Issues:');
      housingVerification.issues.forEach(issue => console.log('  -', issue));
    }
    
    const overallSuccess = laborVerification.isAuthentic && housingVerification.isAuthentic;
    console.log('\n🎯 OVERALL RESULT:', overallSuccess ? '✅ REAL DATA VERIFIED' : '❌ FAKE DATA DETECTED');
    
    return overallSuccess;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

function loadCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });
  } catch (error) {
    console.warn(`⚠️ Could not load ${filePath}:`, error.message);
    return [];
  }
}

function verifyLaborData(apiData, unrateVerification, icsaVerification) {
  const issues = [];
  
  // Check if data source indicates real data
  const dataSource = apiData.metadata?.dataSource;
  if (dataSource === 'mock_fallback' || dataSource?.includes('mock')) {
    issues.push('API is returning mock/fallback data');
  }
  
  // Check data structure
  const timeSeries = apiData.timeSeries || [];
  if (timeSeries.length === 0) {
    issues.push('No time series data returned');
    return { isAuthentic: false, issues };
  }
  
  // Check for realistic labor data patterns
  const samplePoint = timeSeries[0];
  if (samplePoint) {
    // Unemployment rate should be reasonable (0-20%)
    if (samplePoint.unemploymentRate !== undefined) {
      if (samplePoint.unemploymentRate < 0 || samplePoint.unemploymentRate > 20) {
        issues.push(`Unrealistic unemployment rate: ${samplePoint.unemploymentRate}`);
      }
    }
    
    // Initial claims should be in reasonable range
    if (samplePoint.initialClaims !== undefined) {
      if (samplePoint.initialClaims < 100000 || samplePoint.initialClaims > 10000000) {
        issues.push(`Unrealistic initial claims: ${samplePoint.initialClaims}`);
      }
    }
  }
  
  // Cross-reference with verification data if available
  if (unrateVerification.length > 0) {
    const recentUnrate = unrateVerification[unrateVerification.length - 1];
    const apiUnrate = timeSeries.find(p => p.unemploymentRate !== undefined);
    
    if (apiUnrate && recentUnrate) {
      const verificationRate = parseFloat(recentUnrate.UNRATE);
      const apiRate = apiUnrate.unemploymentRate;
      
      // Allow for reasonable variance (unemployment shouldn't change drastically)
      if (Math.abs(verificationRate - apiRate) > 5) {
        issues.push(`Unemployment rate mismatch: API=${apiRate}, Expected~${verificationRate}`);
      }
    }
  }
  
  return {
    isAuthentic: issues.length === 0 && dataSource !== 'mock_fallback',
    issues
  };
}

function verifyHousingData(apiData, csushpiVerification) {
  const issues = [];
  
  // Check if data source indicates real data
  const dataSource = apiData.metadata?.dataSource;
  if (dataSource === 'mock_fallback' || dataSource?.includes('mock')) {
    issues.push('API is returning mock/fallback data');
  }
  
  // Check data structure
  const timeSeries = apiData.timeSeries || [];
  if (timeSeries.length === 0) {
    issues.push('No time series data returned');
    return { isAuthentic: false, issues };
  }
  
  // Check for realistic housing data patterns
  const samplePoint = timeSeries[0];
  if (samplePoint) {
    // Case-Shiller index should be reasonable (typically 50-500)
    if (samplePoint.caseSillerIndex !== undefined) {
      if (samplePoint.caseSillerIndex < 10 || samplePoint.caseSillerIndex > 1000) {
        issues.push(`Unrealistic Case-Shiller index: ${samplePoint.caseSillerIndex}`);
      }
    }
    
    // Housing starts should be in reasonable range
    if (samplePoint.housingStarts !== undefined) {
      if (samplePoint.housingStarts < 500000 || samplePoint.housingStarts > 3000000) {
        issues.push(`Unrealistic housing starts: ${samplePoint.housingStarts}`);
      }
    }
  }
  
  // Cross-reference with verification data if available
  if (csushpiVerification.length > 0) {
    const recentCaseShiller = csushpiVerification[csushpiVerification.length - 1];
    const apiCaseShiller = timeSeries.find(p => p.caseSillerIndex !== undefined);
    
    if (apiCaseShiller && recentCaseShiller) {
      const verificationIndex = parseFloat(recentCaseShiller.CSUSHPINSA);
      const apiIndex = apiCaseShiller.caseSillerIndex;
      
      // Allow for reasonable variance (house prices change over time)
      if (Math.abs(verificationIndex - apiIndex) > 100) {
        issues.push(`Case-Shiller index mismatch: API=${apiIndex}, Expected~${verificationIndex}`);
      }
    }
  }
  
  return {
    isAuthentic: issues.length === 0 && dataSource !== 'mock_fallback',
    issues
  };
}

// Run verification if called directly
if (require.main === module) {
  verifyRealData().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyRealData };