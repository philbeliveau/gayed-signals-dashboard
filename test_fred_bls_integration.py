#!/usr/bin/env python3
"""
Real Data Pipeline Validation Script

This script tests the end-to-end integration of FRED and BLS APIs
to ensure the backend is properly serving real economic data.
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.fred_service import fred_service
from services.bls_service import bls_service


async def test_fred_service():
    """Test FRED service functionality."""
    print("🔍 Testing FRED Service...")
    
    try:
        async with fred_service as fred:
            # Test service health
            health = await fred.health_check()
            print(f"  ✅ FRED Health: {health['status']}")
            print(f"  🔑 API Key Configured: {health['api_key_configured']}")
            
            if health['api_connectivity']:
                print("  ✅ FRED API Connectivity: Working")
                
                # Test labor market data fetch
                print("  📊 Testing labor market data fetch...")
                labor_data = await fred.fetch_labor_market_data(
                    start_date="2024-01-01",
                    end_date="2024-12-31",
                    limit=5
                )
                
                if labor_data:
                    print(f"  ✅ Retrieved {len(labor_data)} FRED labor series")
                    for series_name, data in labor_data.items():
                        print(f"    - {series_name}: {len(data)} data points")
                else:
                    print("  ⚠️ No FRED labor data retrieved")
                
                return True
            else:
                print(f"  ❌ FRED API Connectivity Failed: {health.get('api_error', 'Unknown')}")
                return False
                
    except Exception as e:
        print(f"  ❌ FRED Service Error: {e}")
        return False


async def test_bls_service():
    """Test BLS service functionality."""
    print("\n🔍 Testing BLS Service...")
    
    try:
        async with bls_service as bls:
            # Test service health
            health = await bls.health_check()
            print(f"  ✅ BLS Health: {health['status']}")
            print(f"  🔑 API Key Configured: {health['api_key_configured']}")
            print(f"  📊 Rate Limit Type: {health['rate_limit_type']}")
            
            if health['api_connectivity']:
                print("  ✅ BLS API Connectivity: Working")
                
                # Test employment data fetch
                print("  📊 Testing employment data fetch...")
                employment_data = await bls.fetch_employment_data(
                    start_year=2023,
                    end_year=2024,
                    include_industry_detail=False
                )
                
                if employment_data:
                    print(f"  ✅ Retrieved {len(employment_data)} BLS employment series")
                    for series_name, data in employment_data.items():
                        print(f"    - {series_name}: {len(data.data)} data points")
                else:
                    print("  ⚠️ No BLS employment data retrieved")
                
                # Test JOLTS data fetch
                print("  📊 Testing JOLTS data fetch...")
                jolts_data = await bls.fetch_jolts_data(
                    start_year=2023,
                    end_year=2024
                )
                
                if jolts_data:
                    print(f"  ✅ Retrieved {len(jolts_data)} BLS JOLTS series")
                    for series_name, data in jolts_data.items():
                        print(f"    - {series_name}: {len(data.data)} data points")
                else:
                    print("  ⚠️ No BLS JOLTS data retrieved")
                
                return True
            else:
                print(f"  ❌ BLS API Connectivity Failed: {health.get('api_error', 'Unknown')}")
                return False
                
    except Exception as e:
        print(f"  ❌ BLS Service Error: {e}")
        return False


async def test_data_integration():
    """Test integration of FRED and BLS data."""
    print("\n🔍 Testing FRED+BLS Data Integration...")
    
    try:
        fred_success = False
        bls_success = False
        
        # Test FRED data
        async with fred_service as fred:
            if fred.is_enabled:
                fred_labor_data = await fred.fetch_labor_market_data(
                    start_date="2024-06-01",
                    end_date="2024-12-31",
                    limit=10
                )
                fred_success = bool(fred_labor_data)
                print(f"  📊 FRED Data Available: {fred_success}")
        
        # Test BLS data
        async with bls_service as bls:
            if bls.is_enabled:
                bls_employment_data = await bls.fetch_employment_data(
                    start_year=2024,
                    end_year=2024
                )
                bls_success = bool(bls_employment_data)
                print(f"  📊 BLS Data Available: {bls_success}")
        
        if fred_success and bls_success:
            print("  ✅ Full FRED+BLS Integration: Working")
            return True
        elif fred_success or bls_success:
            print("  ⚠️ Partial Integration: Only one service working")
            return True
        else:
            print("  ❌ Integration Failed: Neither service working")
            return False
            
    except Exception as e:
        print(f"  ❌ Integration Test Error: {e}")
        return False


def test_environment_variables():
    """Test that required environment variables are set."""
    print("🔍 Testing Environment Variables...")
    
    required_vars = {
        'FRED_API_KEY': os.getenv('FRED_API_KEY'),
        'BUREAU_OF_STATISTIC_KEY': os.getenv('BUREAU_OF_STATISTIC_KEY'),
        'FASTAPI_BASE_URL': os.getenv('FASTAPI_BASE_URL')
    }
    
    all_good = True
    for var_name, var_value in required_vars.items():
        if var_value:
            masked_value = f"{var_value[:8]}..." if len(var_value) > 8 else "***"
            print(f"  ✅ {var_name}: {masked_value}")
        else:
            print(f"  ⚠️ {var_name}: Not set")
            if var_name in ['FRED_API_KEY', 'BUREAU_OF_STATISTIC_KEY']:
                all_good = False
    
    return all_good


async def main():
    """Run all validation tests."""
    print("🚀 FRED+BLS API Integration Validation")
    print("=" * 50)
    
    # Test environment variables
    env_ok = test_environment_variables()
    print()
    
    # Test FRED service
    fred_ok = await test_fred_service()
    
    # Test BLS service
    bls_ok = await test_bls_service()
    
    # Test integration
    integration_ok = await test_data_integration()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 VALIDATION SUMMARY")
    print("=" * 50)
    
    results = {
        "Environment Variables": "✅ OK" if env_ok else "⚠️ Issues",
        "FRED Service": "✅ OK" if fred_ok else "❌ Failed",
        "BLS Service": "✅ OK" if bls_ok else "❌ Failed",
        "Data Integration": "✅ OK" if integration_ok else "❌ Failed"
    }
    
    for test_name, status in results.items():
        print(f"  {test_name}: {status}")
    
    overall_success = all([env_ok, fred_ok or bls_ok, integration_ok])
    
    if overall_success:
        print("\n🎉 VALIDATION PASSED: Real data pipeline is working!")
        print("   Your labor market dashboard should now display real FRED+BLS data.")
    else:
        print("\n⚠️ VALIDATION ISSUES: Some components need attention.")
        if not fred_ok and not bls_ok:
            print("   Both FRED and BLS services failed. Check API keys and network connectivity.")
        elif not fred_ok:
            print("   FRED service failed. Check FRED_API_KEY and network connectivity.")
        elif not bls_ok:
            print("   BLS service failed. Check BUREAU_OF_STATISTIC_KEY and network connectivity.")
        
        print("\n🔧 TROUBLESHOOTING TIPS:")
        print("   1. Ensure API keys are valid and properly set in .env file")
        print("   2. Check network connectivity to api.stlouisfed.org and api.bls.gov")
        print("   3. Verify that the backend FastAPI service is running on port 8000")
        print("   4. Check backend logs for detailed error messages")
    
    print("\n" + "=" * 50)
    return overall_success


if __name__ == "__main__":
    import asyncio
    import dotenv
    
    # Load environment variables
    dotenv.load_dotenv()
    
    # Run validation
    success = asyncio.run(main())
    sys.exit(0 if success else 1)